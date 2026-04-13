import { useState } from 'react';

export default function ResultsTable({ elements, checkAttributes }) {
  const [expandedRow, setExpandedRow] = useState(null);

  if (!elements.length) {
    return <div className="empty-state">No hay elementos que mostrar con el filtro actual.</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Elemento</th>
            <th>Tipo</th>
            {checkAttributes.map(attr => (
              <th key={attr}>{attr}</th>
            ))}
            <th>Problemas</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {elements.map((el, i) => {
            const isExpanded = expandedRow === i;
            return (
              <>
                <tr
                  key={i}
                  className={`result-row ${el.hasIssues ? 'row-has-issues' : 'row-ok'}`}
                  onClick={() => setExpandedRow(isExpanded ? null : i)}
                >
                  <td className="col-index">{i + 1}</td>
                  <td className="col-tag">
                    <code className="tag-code">&lt;{el.tag}&gt;</code>
                  </td>
                  <td className="col-type">
                    {el.type ? <code className="type-badge">{el.type}</code> : <span className="na">—</span>}
                  </td>
                  {checkAttributes.map(attr => (
                    <td key={attr} className="col-attr">
                      <AttrCell
                        value={el[attr]}
                        issues={el.issues.filter(iss => iss.attr === attr)}
                      />
                    </td>
                  ))}
                  <td className="col-issues">
                    <IssuesBadge issues={el.issues} />
                  </td>
                  <td className="col-expand">
                    <button className="expand-btn" title="Ver detalles">
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`exp-${i}`} className="expanded-row">
                    <td colSpan={4 + checkAttributes.length}>
                      <ExpandedDetail el={el} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttrCell({ value, issues }) {
  if (!value) {
    const hasError = issues.some(i => i.severity === 'error');
    const hasWarn  = issues.some(i => i.severity === 'warning');
    return (
      <span className={`attr-missing ${hasError ? 'missing-error' : hasWarn ? 'missing-warn' : ''}`}>
        ausente
      </span>
    );
  }

  const isDuplicate = issues.some(i => i.type === 'duplicate');
  return (
    <span className={`attr-value ${isDuplicate ? 'attr-duplicate' : 'attr-ok'}`} title={value}>
      {value.length > 24 ? value.substring(0, 22) + '…' : value}
      {isDuplicate && <span className="dup-badge">dup</span>}
    </span>
  );
}

function IssuesBadge({ issues }) {
  if (!issues.length) return <span className="badge badge-ok">✓ ok</span>;

  const errors   = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  return (
    <span className="issues-badges">
      {errors   > 0 && <span className="badge badge-error">{errors} error{errors > 1 ? 'es' : ''}</span>}
      {warnings > 0 && <span className="badge badge-warn">{warnings} advert.</span>}
    </span>
  );
}

function ExpandedDetail({ el }) {
  return (
    <div className="expanded-detail">
      {el.issues.length > 0 && (
        <div className="detail-section">
          <strong>Problemas encontrados:</strong>
          <ul className="issues-list">
            {el.issues.map((iss, i) => (
              <li key={i} className={`issue-item issue-${iss.severity}`}>
                <span className="issue-icon">{iss.severity === 'error' ? '🔴' : '🟡'}</span>
                {iss.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {el.text && (
        <div className="detail-section">
          <strong>Texto:</strong> <span className="detail-text">"{el.text}"</span>
        </div>
      )}

      <div className="detail-section">
        <strong>XPath:</strong>
        <code className="xpath-code">{el.xpath}</code>
      </div>

      {el.outerHTML && (
        <div className="detail-section">
          <strong>HTML:</strong>
          <pre className="html-preview">{el.outerHTML}</pre>
        </div>
      )}
    </div>
  );
}
