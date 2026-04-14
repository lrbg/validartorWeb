import { useState } from 'react';
import { buildBookmarklet } from '../utils/inject.js';

const ELEMENT_OPTIONS = [
  { value: 'input',    label: 'input',    icon: '🔤' },
  { value: 'button',   label: 'button',   icon: '🔘' },
  { value: 'select',   label: 'select',   icon: '📋' },
  { value: 'textarea', label: 'textarea', icon: '📝' },
  { value: 'a',        label: 'a (link)', icon: '🔗' },
  { value: 'label',    label: 'label',    icon: '🏷️' },
  { value: 'form',     label: 'form',     icon: '📄' },
  { value: 'img',      label: 'img',      icon: '🖼️' },
];

const ATTRIBUTE_OPTIONS = [
  { value: 'id',               label: 'id',               critical: true },
  { value: 'name',             label: 'name',             critical: true },
  { value: 'class',            label: 'class',            critical: false },
  { value: 'placeholder',      label: 'placeholder',      critical: false },
  { value: 'aria-label',       label: 'aria-label',       critical: false },
  { value: 'aria-describedby', label: 'aria-describedby', critical: false },
  { value: 'role',             label: 'role',             critical: false },
  { value: 'data-testid',      label: 'data-testid',      critical: false },
  { value: 'href',             label: 'href',             critical: false },
  { value: 'alt',              label: 'alt',              critical: false },
];

const DEFAULT_ELEMENTS   = ['input', 'button', 'select', 'textarea'];
const DEFAULT_ATTRIBUTES = ['id', 'name'];
const VALIDATOR_URL      = 'https://lrbg.github.io/validartorWeb/';

export default function BookmarkletPanel() {
  const [elements,   setElements]   = useState(DEFAULT_ELEMENTS);
  const [attributes, setAttributes] = useState(DEFAULT_ATTRIBUTES);
  const [copied,     setCopied]     = useState(false);

  function toggle(list, setList, value) {
    setList(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  const bookmarkletHref = buildBookmarklet({
    validatorUrl: VALIDATOR_URL,
    elementTypes: elements,
    checkAttributes: attributes,
  });

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(bookmarkletHref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select the textarea
      document.getElementById('bm-code-area')?.select();
    }
  }

  return (
    <div className="bookmarklet-panel">

      {/* ── How it works ──────────────────────────────────── */}
      <div className="card bm-intro">
        <h2 className="card-title">🔖 Bookmarklet — páginas con login</h2>
        <p className="card-desc">
          El bookmarklet corre <strong>directamente en tu navegador</strong> sobre cualquier página
          en la que ya estés autenticado. No necesita proxy ni servidor — lee el DOM real con tu
          sesión activa y manda los resultados aquí.
        </p>

        <div className="how-steps">
          <div className="how-step">
            <span className="step-num">1</span>
            <div>
              <strong>Configura</strong> qué elementos y atributos quieres validar (abajo).
            </div>
          </div>
          <div className="how-step">
            <span className="step-num">2</span>
            <div>
              <strong>Arrastra</strong> el botón azul a tu barra de favoritos del navegador.
            </div>
          </div>
          <div className="how-step">
            <span className="step-num">3</span>
            <div>
              <strong>Navega</strong> a cualquier página de tu sitio (con o sin login).
            </div>
          </div>
          <div className="how-step">
            <span className="step-num">4</span>
            <div>
              <strong>Haz click</strong> en el favorito — los resultados aparecerán aquí automáticamente.
            </div>
          </div>
        </div>
      </div>

      {/* ── Config ────────────────────────────────────────── */}
      <div className="card bm-config">
        <h3 className="card-title">Personaliza el bookmarklet</h3>

        <div className="config-sections">
          <div className="config-section">
            <label className="section-label">Elementos a validar</label>
            <div className="chip-group">
              {ELEMENT_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  className={`chip ${elements.includes(opt.value) ? 'chip-active' : ''}`}
                  onClick={() => toggle(elements, setElements, opt.value)}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="config-section">
            <label className="section-label">Atributos a verificar</label>
            <div className="chip-group">
              {ATTRIBUTE_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  className={`chip ${attributes.includes(opt.value) ? 'chip-active' : ''} ${opt.critical ? 'chip-critical' : ''}`}
                  onClick={() => toggle(attributes, setAttributes, opt.value)}
                >
                  {opt.value}
                  {opt.critical && <span className="chip-badge">clave</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Drag target ───────────────────────────────────── */}
      <div className="card bm-drag-card">
        <p className="drag-instruction">
          👇 <strong>Arrastra este botón</strong> a tu barra de favoritos del navegador:
        </p>

        <div className="drag-area">
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <a
            href={bookmarkletHref}
            className="bookmarklet-btn"
            onClick={e => { e.preventDefault(); alert('Para instalar: arrastra este botón a tu barra de favoritos. No hagas click.'); }}
            title="Arrastra este enlace a tu barra de favoritos"
          >
            🔍 Validar atributos
          </a>

          <button className="btn btn-copy" onClick={copyCode}>
            {copied ? '✅ Copiado' : '📋 Copiar código'}
          </button>
        </div>

        <div className="bm-code-wrapper">
          <label className="section-label">Código del bookmarklet (alternativa: pega en DevTools console)</label>
          <textarea
            id="bm-code-area"
            className="bm-code-area"
            readOnly
            value={bookmarkletHref}
            rows={4}
          />
        </div>
      </div>

      {/* ── Browser instructions ──────────────────────────── */}
      <div className="card bm-instructions">
        <h3 className="card-title">Instrucciones por navegador</h3>
        <div className="browser-grid">
          <BrowserCard
            icon="🌐"
            name="Chrome / Edge"
            steps={[
              'Activa la barra de favoritos: Ctrl+Shift+B (Mac: ⌘+Shift+B)',
              'Arrastra el botón azul a la barra',
              'Listo — click en el favorito desde cualquier página',
            ]}
          />
          <BrowserCard
            icon="🦊"
            name="Firefox"
            steps={[
              'Activa la barra: Ver → Barras de herramientas → Barra personal',
              'Arrastra el botón azul a la barra',
              'Listo — click desde cualquier página',
            ]}
          />
          <BrowserCard
            icon="🧭"
            name="Safari"
            steps={[
              'Activa la barra: Ver → Mostrar barra de favoritos',
              'Arrastra el botón azul a la barra',
              'Si Safari bloquea: usa "Copiar código" y pega en consola (F12)',
            ]}
          />
          <BrowserCard
            icon="💻"
            name="Sin barra de favoritos"
            steps={[
              'Copia el código con el botón "Copiar código"',
              'Abre DevTools en tu sitio (F12 → Console)',
              'Pega el código y presiona Enter',
            ]}
          />
        </div>
      </div>

    </div>
  );
}

function BrowserCard({ icon, name, steps }) {
  return (
    <div className="browser-card">
      <div className="bc-header">
        <span className="bc-icon">{icon}</span>
        <strong>{name}</strong>
      </div>
      <ol className="bc-steps">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}
