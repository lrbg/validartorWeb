const express = require('express');
const cheerio = require('cheerio');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Helpers ──────────────────────────────────────────────────────────────────

function getXPath(el) {
  const parts = [];
  let node = el;
  while (node && node.type === 'tag') {
    const tag = node.name;
    if (node.parent) {
      const siblings = node.parent.children.filter(c => c.type === 'tag' && c.name === tag);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(node) + 1;
        parts.unshift(`${tag}[${idx}]`);
      } else {
        parts.unshift(tag);
      }
    } else {
      parts.unshift(tag);
    }
    node = node.parent;
  }
  return '/' + parts.join('/');
}

function getOuterHTML($, el) {
  try {
    const clone = $(el).clone().empty();
    return $.html(clone).substring(0, 200);
  } catch {
    return '';
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// POST /api/validate  – fetch a URL and extract element attributes
app.post('/api/validate', async (req, res) => {
  const { url, pageName, elementTypes = [], checkAttributes = [] } = req.body;

  if (!url || !pageName) {
    return res.status(400).json({ success: false, error: 'url and pageName are required' });
  }

  let html;
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      },
    });
    html = response.data;
  } catch (err) {
    return res.status(400).json({ success: false, error: `Cannot fetch URL: ${err.message}` });
  }

  const $ = cheerio.load(html);

  // ── First pass: count id/name occurrences ─────────────────────────────────
  const idCount = {};
  const nameCount = {};
  elementTypes.forEach(tag => {
    $(tag).each((_, el) => {
      const id = $(el).attr('id');
      const name = $(el).attr('name');
      if (id) idCount[id] = (idCount[id] || 0) + 1;
      if (name) nameCount[name] = (nameCount[name] || 0) + 1;
    });
  });

  // ── Second pass: collect details ──────────────────────────────────────────
  const elements = [];
  const FORM_TAGS = new Set(['input', 'select', 'textarea', 'button']);

  elementTypes.forEach(tag => {
    $(tag).each((index, el) => {
      const entry = { tag, index, issues: [] };

      checkAttributes.forEach(attr => {
        const value = $(el).attr(attr) || null;
        entry[attr] = value;

        if (attr === 'id') {
          if (!value) {
            entry.issues.push({ type: 'missing', attr: 'id', severity: 'error', message: `<${tag}> sin atributo id` });
          } else if (idCount[value] > 1) {
            entry.issues.push({
              type: 'duplicate', attr: 'id', value, count: idCount[value], severity: 'error',
              message: `id="${value}" duplicado (${idCount[value]} veces)`,
            });
          }
        }

        if (attr === 'name') {
          const inputType = $(el).attr('type');
          const isRadioOrCheckbox = inputType === 'radio' || inputType === 'checkbox';
          if (!value && FORM_TAGS.has(tag)) {
            entry.issues.push({ type: 'missing', attr: 'name', severity: 'warning', message: `<${tag}> sin atributo name` });
          } else if (value && nameCount[value] > 1 && !isRadioOrCheckbox) {
            entry.issues.push({
              type: 'duplicate', attr: 'name', value, count: nameCount[value], severity: 'warning',
              message: `name="${value}" duplicado (${nameCount[value]} veces)`,
            });
          }
        }
      });

      // Extra context
      entry.type = $(el).attr('type') || null;
      entry.xpath = getXPath(el);
      entry.outerHTML = getOuterHTML($, el);
      entry.hasIssues = entry.issues.length > 0;

      if (['button', 'a', 'label', 'h1', 'h2', 'h3'].includes(tag)) {
        entry.text = $(el).text().trim().substring(0, 80);
      }

      elements.push(entry);
    });
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const byTag = {};
  elementTypes.forEach(tag => {
    byTag[tag] = elements.filter(e => e.tag === tag).length;
  });

  const summary = {
    total: elements.length,
    withIssues: elements.filter(e => e.hasIssues).length,
    errors: elements.reduce((acc, e) => acc + e.issues.filter(i => i.severity === 'error').length, 0),
    warnings: elements.reduce((acc, e) => acc + e.issues.filter(i => i.severity === 'warning').length, 0),
    byTag,
  };

  res.json({ success: true, url, pageName, elements, summary });
});

// POST /api/reports  – persist a validated report
app.post('/api/reports', (req, res) => {
  const { pageName, url, elements, summary, checkAttributes, elementTypes } = req.body;
  if (!pageName) return res.status(400).json({ success: false, error: 'pageName required' });

  const report = {
    id: uuidv4(),
    pageName,
    url,
    timestamp: new Date().toISOString(),
    elements,
    summary,
    checkAttributes,
    elementTypes,
  };

  const pageDir = path.join(DATA_DIR, pageName);
  if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });

  fs.writeFileSync(path.join(pageDir, `${Date.now()}.json`), JSON.stringify(report, null, 2));
  res.json({ success: true, report });
});

// GET /api/pages  – list pages that have saved reports
app.get('/api/pages', (req, res) => {
  if (!fs.existsSync(DATA_DIR)) return res.json([]);
  const pages = fs
    .readdirSync(DATA_DIR)
    .filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory())
    .map(name => {
      const pageDir = path.join(DATA_DIR, name);
      const files = fs.readdirSync(pageDir).filter(f => f.endsWith('.json'));
      return { name, count: files.length };
    });
  res.json(pages);
});

// GET /api/reports/:pageName  – list report summaries for a page
app.get('/api/reports/:pageName', (req, res) => {
  const pageDir = path.join(DATA_DIR, req.params.pageName);
  if (!fs.existsSync(pageDir)) return res.json([]);

  const reports = fs
    .readdirSync(pageDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse()
    .map(f => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(pageDir, f)));
        return { id: d.id, timestamp: d.timestamp, summary: d.summary, url: d.url };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  res.json(reports);
});

// GET /api/reports/:pageName/:reportId  – full report detail
app.get('/api/reports/:pageName/:reportId', (req, res) => {
  const pageDir = path.join(DATA_DIR, req.params.pageName);
  if (!fs.existsSync(pageDir)) return res.status(404).json({ error: 'Page not found' });

  const files = fs.readdirSync(pageDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(pageDir, file)));
      if (d.id === req.params.reportId) return res.json(d);
    } catch {
      continue;
    }
  }
  res.status(404).json({ error: 'Report not found' });
});

// DELETE /api/reports/:pageName/:reportId
app.delete('/api/reports/:pageName/:reportId', (req, res) => {
  const pageDir = path.join(DATA_DIR, req.params.pageName);
  if (!fs.existsSync(pageDir)) return res.status(404).json({ error: 'Page not found' });

  const files = fs.readdirSync(pageDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(pageDir, file)));
      if (d.id === req.params.reportId) {
        fs.unlinkSync(path.join(pageDir, file));
        return res.json({ success: true });
      }
    } catch {
      continue;
    }
  }
  res.status(404).json({ error: 'Report not found' });
});

app.listen(PORT, () => {
  console.log(`✅  API server running → http://localhost:${PORT}`);
});
