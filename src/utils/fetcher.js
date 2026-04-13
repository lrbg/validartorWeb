// Fetches any external URL via CORS proxy and parses its HTML client-side.

const PROXY = 'https://api.allorigins.win/get?url=';

export async function fetchPage(url) {
  const proxyUrl = PROXY + encodeURIComponent(url);
  let res;
  try {
    res = await fetch(proxyUrl, { signal: AbortSignal.timeout(25000) });
  } catch (err) {
    throw new Error(`No se pudo alcanzar el proxy. Verifica tu conexión. (${err.message})`);
  }
  if (!res.ok) throw new Error(`El proxy respondió con error HTTP ${res.status}`);

  const { contents, status } = await res.json();
  if (status?.http_code && status.http_code >= 400) {
    throw new Error(`La página devolvió HTTP ${status.http_code}`);
  }
  if (!contents) throw new Error('El proxy no devolvió contenido HTML');
  return contents;
}

// ── Client-side attribute parser ─────────────────────────────────────────────

const FORM_TAGS = new Set(['input', 'select', 'textarea', 'button']);

function getXPath(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1) {
    const tag = node.tagName.toLowerCase();
    const siblings = node.parentElement
      ? Array.from(node.parentElement.children).filter(c => c.tagName === node.tagName)
      : [];
    if (siblings.length > 1) {
      parts.unshift(`${tag}[${siblings.indexOf(node) + 1}]`);
    } else {
      parts.unshift(tag);
    }
    node = node.parentElement;
  }
  return '/' + parts.join('/');
}

export function parseAttributes(html, elementTypes, checkAttributes) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // First pass: count id/name occurrences across selected element types
  const idCount = {};
  const nameCount = {};
  elementTypes.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => {
      const id   = el.getAttribute('id');
      const name = el.getAttribute('name');
      if (id)   idCount[id]     = (idCount[id]   || 0) + 1;
      if (name) nameCount[name] = (nameCount[name]|| 0) + 1;
    });
  });

  // Second pass: build detailed element list
  const elements = [];
  elementTypes.forEach(tag => {
    let idx = 0;
    doc.querySelectorAll(tag).forEach(el => {
      const entry = { tag, index: idx++, issues: [] };

      checkAttributes.forEach(attr => {
        const value = el.getAttribute(attr) || null;
        entry[attr] = value;

        if (attr === 'id') {
          if (!value) {
            entry.issues.push({ type: 'missing', attr: 'id', severity: 'error',
              message: `<${tag}> sin atributo id` });
          } else if (idCount[value] > 1) {
            entry.issues.push({ type: 'duplicate', attr: 'id', value, count: idCount[value],
              severity: 'error', message: `id="${value}" duplicado (${idCount[value]} veces)` });
          }
        }

        if (attr === 'name') {
          const inputType = el.getAttribute('type');
          const isGrouped = inputType === 'radio' || inputType === 'checkbox';
          if (!value && FORM_TAGS.has(tag)) {
            entry.issues.push({ type: 'missing', attr: 'name', severity: 'warning',
              message: `<${tag}> sin atributo name` });
          } else if (value && nameCount[value] > 1 && !isGrouped) {
            entry.issues.push({ type: 'duplicate', attr: 'name', value, count: nameCount[value],
              severity: 'warning', message: `name="${value}" duplicado (${nameCount[value]} veces)` });
          }
        }
      });

      entry.type     = el.getAttribute('type') || null;
      entry.xpath    = getXPath(el);
      entry.outerHTML= el.outerHTML.substring(0, 200);
      entry.hasIssues= entry.issues.length > 0;

      if (['button', 'a', 'label', 'h1', 'h2', 'h3'].includes(tag)) {
        entry.text = (el.textContent || '').trim().substring(0, 80);
      }

      elements.push(entry);
    });
  });

  return elements;
}
