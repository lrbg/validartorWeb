import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';

export default function HistoryPanel() {
  const [pages, setPages]         = useState([]);
  const [page, setPage]           = useState('');
  const [reports, setReports]     = useState([]);
  const [leftId, setLeftId]       = useState('');
  const [rightId, setRightId]     = useState('');
  const [leftData, setLeftData]   = useState(null);
  const [rightData, setRightData] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [diff, setDiff]           = useState(null);

  useEffect(() => {
    api.getPages().then(setPages).catch(console.error);
  }, []);

  async function handlePageChange(name) {
    setPage(name);
    setLeftId(''); setRightId('');
    setLeftData(null); setRightData(null);
    setDiff(null);
    if (name) {
      const list = await api.getReports(name);
      setReports(list);
    }
  }

  async function loadAndDiff(newLeftId, newRightId) {
    if (!newLeftId || !newRightId || newLeftId === newRightId) {
      setDiff(null);
      return;
    }
    setLoading(true);
    try {
      const [l, r] = await Promise.all([
        api.getReport(page, newLeftId),
        api.getReport(page, newRightId),
      ]);
      setLeftData(l);
      setRightData(r);
      setDiff(computeDiff(l, r));
    } finally {
      setLoading(false);
    }
  }

  function onLeftChange(id) {
    setLeftId(id);
    loadAndDiff(id, rightId);
  }

  function onRightChange(id) {
    setRightId(id);
    loadAndDiff(leftId, id);
  }

  return (
    <div className="history-panel">
      <div className="card history-config">
        <h2 className="card-title">Comparar validaciones</h2>
        <p className="card-desc">
          Selecciona una página y dos reportes para ver qué cambió entre validaciones.
        </p>

        <div className="history-form">
          <div className="field">
            <label>Página</label>
            <select value={page} onChange={e => handlePageChange(e.target.value)}>
              <option value="">— selecciona página —</option>
              {pages.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          {reports.length > 0 && (
            <>
              <div className="field">
                <label>Reporte base (anterior)</label>
                <select value={leftId} onChange={e => onLeftChange(e.target.value)}>
                  <option value="">— selecciona —</option>
                  {reports.map(r => (
                    <option key={r.id} value={r.id}>{formatDate(r.timestamp)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Reporte nuevo (actual)</label>
                <select value={rightId} onChange={e => onRightChange(e.target.value)}>
                  <option value="">— selecciona —</option>
                  {reports.map(r => (
                    <option key={r.id} value={r.id}>{formatDate(r.timestamp)}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {loading && <div className="loading-bar">Calculando diferencias…</div>}

      {diff && !loading && (
        <div className="diff-view">
          {/* Summary bar */}
          <div className="diff-summary">
            <DiffStat label="Nuevos" count={diff.added.length} color="added" />
            <DiffStat label="Eliminados" count={diff.removed.length} color="removed" />
            <DiffStat label="Modificados" count={diff.changed.length} color="changed" />
            <DiffStat label="Sin cambios" count={diff.unchanged.length} color="unchanged" />
            <DiffStat label="Errores resueltos" count={diff.errorsFixed} color="fixed" />
            <DiffStat label="Errores nuevos" count={diff.errorsAdded} color="new-error" />
          </div>

          {/* Timeline */}
          <div className="timeline-header">
            <div className="timeline-side left">
              <span className="tl-label">BASE</span>
              <span className="tl-date">{formatDate(leftData.timestamp)}</span>
              <div className="tl-stats">
                <span>{leftData.summary.total} elem.</span>
                <span className="stat-e">{leftData.summary.errors} err.</span>
              </div>
            </div>
            <div className="timeline-arrow">→</div>
            <div className="timeline-side right">
              <span className="tl-label">NUEVO</span>
              <span className="tl-date">{formatDate(rightData.timestamp)}</span>
              <div className="tl-stats">
                <span>{rightData.summary.total} elem.</span>
                <span className="stat-e">{rightData.summary.errors} err.</span>
              </div>
            </div>
          </div>

          {/* Diff sections */}
          {diff.added.length > 0 && (
            <DiffSection title="✅ Elementos nuevos" items={diff.added} color="added"
              renderItem={el => <DiffRow el={el} side="right" />} />
          )}
          {diff.removed.length > 0 && (
            <DiffSection title="🗑 Elementos eliminados" items={diff.removed} color="removed"
              renderItem={el => <DiffRow el={el} side="left" />} />
          )}
          {diff.changed.length > 0 && (
            <DiffSection title="✏️ Elementos con cambios" items={diff.changed} color="changed"
              renderItem={pair => <ChangedRow pair={pair} />} />
          )}
          {diff.issueChanges.length > 0 && (
            <DiffSection title="⚠️ Cambios en problemas" items={diff.issueChanges} color="changed"
              renderItem={pair => <IssueChangeRow pair={pair} />} />
          )}
        </div>
      )}

      {!page && (
        <div className="empty-state large">
          <span className="empty-icon">🕐</span>
          <p>Selecciona una página para ver el historial</p>
        </div>
      )}
    </div>
  );
}

// ── Diff computation ─────────────────────────────────────────────────────────

function elKey(el) {
  return `${el.tag}|${el.id || ''}|${el.name || ''}|${el.xpath}`;
}

function computeDiff(left, right) {
  const leftMap  = new Map(left.elements.map(e  => [elKey(e), e]));
  const rightMap = new Map(right.elements.map(e => [elKey(e), e]));

  const added     = [];
  const removed   = [];
  const changed   = [];
  const unchanged = [];
  const issueChanges = [];

  // What's in right but not left → added
  for (const [k, el] of rightMap) {
    if (!leftMap.has(k)) added.push(el);
  }

  // What's in left but not right → removed
  for (const [k, el] of leftMap) {
    if (!rightMap.has(k)) removed.push(el);
  }

  // What's in both → check changes
  for (const [k, lEl] of leftMap) {
    if (!rightMap.has(k)) continue;
    const rEl = rightMap.get(k);

    // Attribute value changes
    const attrChanged = [];
    const allAttrs = new Set([...Object.keys(lEl), ...Object.keys(rEl)])
      .difference ? [...new Set([...Object.keys(lEl), ...Object.keys(rEl)])]
      : [...new Set([...Object.keys(lEl), ...Object.keys(rEl)])];

    for (const attr of allAttrs) {
      if (['issues', 'hasIssues', 'index', 'outerHTML', 'xpath'].includes(attr)) continue;
      if (lEl[attr] !== rEl[attr]) {
        attrChanged.push({ attr, before: lEl[attr], after: rEl[attr] });
      }
    }

    // Issue changes
    const lIssueKeys = lEl.issues.map(i => `${i.type}:${i.attr}:${i.value || ''}`);
    const rIssueKeys = rEl.issues.map(i => `${i.type}:${i.attr}:${i.value || ''}`);
    const issFixed = lEl.issues.filter(i => !rIssueKeys.includes(`${i.type}:${i.attr}:${i.value || ''}`));
    const issNew   = rEl.issues.filter(i => !lIssueKeys.includes(`${i.type}:${i.attr}:${i.value || ''}`));

    if (attrChanged.length > 0) {
      changed.push({ left: lEl, right: rEl, attrChanged });
    } else if (issFixed.length > 0 || issNew.length > 0) {
      issueChanges.push({ left: lEl, right: rEl, fixed: issFixed, new: issNew });
    } else {
      unchanged.push(lEl);
    }
  }

  const errorsFixed = issueChanges.reduce((a, p) => a + p.fixed.filter(i => i.severity === 'error').length, 0);
  const errorsAdded = issueChanges.reduce((a, p) => a + p.new.filter(i => i.severity === 'error').length, 0);

  return { added, removed, changed, unchanged, issueChanges, errorsFixed, errorsAdded };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DiffStat({ label, count, color }) {
  return (
    <div className={`diff-stat diff-stat-${color}`}>
      <span className="ds-count">{count}</span>
      <span className="ds-label">{label}</span>
    </div>
  );
}

function DiffSection({ title, items, color, renderItem }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`diff-section diff-section-${color}`}>
      <button className="diff-section-toggle" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className="ds-badge">{items.length}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="diff-section-body">
          {items.map((item, i) => <div key={i}>{renderItem(item)}</div>)}
        </div>
      )}
    </div>
  );
}

function DiffRow({ el }) {
  return (
    <div className="diff-row">
      <code className="tag-code">&lt;{el.tag}&gt;</code>
      <span className="dr-attr">id: <strong>{el.id || '—'}</strong></span>
      <span className="dr-attr">name: <strong>{el.name || '—'}</strong></span>
      <code className="xpath-mini">{el.xpath}</code>
    </div>
  );
}

function ChangedRow({ pair }) {
  return (
    <div className="changed-row">
      <div className="cr-header">
        <code className="tag-code">&lt;{pair.left.tag}&gt;</code>
        <code className="xpath-mini">{pair.left.xpath}</code>
      </div>
      <div className="cr-changes">
        {pair.attrChanged.map((c, i) => (
          <div key={i} className="attr-change">
            <span className="attr-name">{c.attr}:</span>
            <span className="before-val">{c.before || '(vacío)'}</span>
            <span className="arrow">→</span>
            <span className="after-val">{c.after || '(vacío)'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueChangeRow({ pair }) {
  return (
    <div className="issue-change-row">
      <div className="cr-header">
        <code className="tag-code">&lt;{pair.left.tag}&gt;</code>
        <code className="xpath-mini">{pair.left.xpath}</code>
      </div>
      {pair.fixed.length > 0 && (
        <div className="issue-change-block fixed">
          <span className="icb-label">✅ Resueltos:</span>
          {pair.fixed.map((iss, i) => <span key={i} className="iss-pill iss-fixed">{iss.message}</span>)}
        </div>
      )}
      {pair.new.length > 0 && (
        <div className="issue-change-block new">
          <span className="icb-label">🔴 Nuevos:</span>
          {pair.new.map((iss, i) => <span key={i} className="iss-pill iss-new">{iss.message}</span>)}
        </div>
      )}
    </div>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
