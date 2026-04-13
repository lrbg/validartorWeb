import { useState } from 'react';
import { api } from '../utils/api.js';
import ResultsTable from './ResultsTable.jsx';

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
  { value: 'id',              label: 'id',              critical: true },
  { value: 'name',            label: 'name',            critical: true },
  { value: 'class',           label: 'class',           critical: false },
  { value: 'placeholder',     label: 'placeholder',     critical: false },
  { value: 'aria-label',      label: 'aria-label',      critical: false },
  { value: 'aria-describedby',label: 'aria-describedby',critical: false },
  { value: 'role',            label: 'role',            critical: false },
  { value: 'data-testid',     label: 'data-testid',     critical: false },
  { value: 'href',            label: 'href',            critical: false },
  { value: 'alt',             label: 'alt',             critical: false },
];

const DEFAULT_ELEMENTS   = ['input', 'button', 'select', 'textarea'];
const DEFAULT_ATTRIBUTES = ['id', 'name'];

export default function ValidatorPanel({ onReportSaved }) {
  const [url, setUrl]             = useState('');
  const [pageName, setPageName]   = useState('');
  const [elements, setElements]   = useState(DEFAULT_ELEMENTS);
  const [attributes, setAttributes] = useState(DEFAULT_ATTRIBUTES);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [result, setResult]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [filter, setFilter]       = useState('all'); // all | issues | ok

  function toggle(list, setList, value) {
    setList(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  async function handleValidate(e) {
    e.preventDefault();
    if (!url || !pageName || elements.length === 0 || attributes.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const data = await api.validate({ url, pageName, elementTypes: elements, checkAttributes: attributes });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await api.saveReport({
        pageName: result.pageName,
        url: result.url,
        elements: result.elements,
        summary: result.summary,
        checkAttributes: attributes,
        elementTypes: elements,
      });
      setSaved(true);
      onReportSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const displayElements = result?.elements?.filter(el => {
    if (filter === 'issues') return el.hasIssues;
    if (filter === 'ok')     return !el.hasIssues;
    return true;
  }) ?? [];

  return (
    <div className="validator-panel">
      {/* ── Config Form ───────────────────────────────────── */}
      <form className="card config-form" onSubmit={handleValidate}>
        <h2 className="card-title">Configuración de Validación</h2>

        <div className="form-row">
          <div className="field flex-2">
            <label>URL del sitio</label>
            <input
              type="url"
              placeholder="https://ejemplo.com/login"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="field flex-1">
            <label>Nombre de página</label>
            <input
              type="text"
              placeholder="ej. home, login, checkout"
              value={pageName}
              onChange={e => setPageName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              required
            />
          </div>
        </div>

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

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Validando…' : '🚀 Validar página'}
          </button>
        </div>
      </form>

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Results ───────────────────────────────────────── */}
      {result && (
        <div className="results-section">
          {/* Summary bar */}
          <div className="summary-bar">
            <div className="summary-info">
              <span className="page-badge">{result.pageName}</span>
              <span className="url-text">{result.url}</span>
            </div>
            <div className="summary-stats">
              <div className="stat stat-total">
                <span className="stat-value">{result.summary.total}</span>
                <span className="stat-label">elementos</span>
              </div>
              <div className="stat stat-error">
                <span className="stat-value">{result.summary.errors}</span>
                <span className="stat-label">errores</span>
              </div>
              <div className="stat stat-warning">
                <span className="stat-value">{result.summary.warnings}</span>
                <span className="stat-label">advertencias</span>
              </div>
              <div className="stat stat-ok">
                <span className="stat-value">{result.summary.total - result.summary.withIssues}</span>
                <span className="stat-label">ok</span>
              </div>
            </div>
            <div className="summary-actions">
              {!saved ? (
                <button className="btn btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Guardando…' : '💾 Guardar reporte'}
                </button>
              ) : (
                <span className="saved-badge">✅ Guardado</span>
              )}
            </div>
          </div>

          {/* Tag breakdown */}
          <div className="tag-breakdown">
            {Object.entries(result.summary.byTag).map(([tag, count]) => (
              <div key={tag} className="tag-pill">
                <code>&lt;{tag}&gt;</code> <strong>{count}</strong>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="results-toolbar">
            <div className="filter-group">
              {[
                { v: 'all',    label: `Todos (${result.elements.length})` },
                { v: 'issues', label: `Con problemas (${result.summary.withIssues})` },
                { v: 'ok',     label: `Sin problemas (${result.elements.length - result.summary.withIssues})` },
              ].map(f => (
                <button
                  key={f.v}
                  className={`filter-btn ${filter === f.v ? 'active' : ''}`}
                  onClick={() => setFilter(f.v)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ResultsTable elements={displayElements} checkAttributes={attributes} />
        </div>
      )}
    </div>
  );
}
