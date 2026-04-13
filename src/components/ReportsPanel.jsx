import { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import ResultsTable from './ResultsTable.jsx';

export default function ReportsPanel() {
  const [pages, setPages]           = useState([]);
  const [selectedPage, setSelected] = useState(null);
  const [reports, setReports]       = useState([]);
  const [openReport, setOpenReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    api.getPages().then(setPages).catch(console.error);
  }, []);

  async function selectPage(name) {
    setSelected(name);
    setOpenReport(null);
    setReportData(null);
    const list = await api.getReports(name);
    setReports(list);
  }

  async function openReportDetail(report) {
    setOpenReport(report);
    setLoading(true);
    try {
      const data = await api.getReport(selectedPage, report.id);
      setReportData(data);
    } finally {
      setLoading(false);
    }
  }

  async function deleteReport(e, report) {
    e.stopPropagation();
    if (!confirm('¿Eliminar este reporte?')) return;
    await api.deleteReport(selectedPage, report.id);
    const list = await api.getReports(selectedPage);
    setReports(list);
    if (openReport?.id === report.id) {
      setOpenReport(null);
      setReportData(null);
    }
  }

  return (
    <div className="reports-panel">
      {/* Sidebar: pages */}
      <aside className="pages-sidebar">
        <h3 className="sidebar-title">Páginas</h3>
        {pages.length === 0 ? (
          <p className="empty-sidebar">Sin reportes guardados aún.</p>
        ) : (
          <ul className="page-list">
            {pages.map(p => (
              <li
                key={p.name}
                className={`page-item ${selectedPage === p.name ? 'active' : ''}`}
                onClick={() => selectPage(p.name)}
              >
                <span className="page-name">{p.name}</span>
                <span className="page-count">{p.count}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main: report list + detail */}
      <div className="reports-main">
        {!selectedPage ? (
          <div className="empty-state large">
            <span className="empty-icon">📋</span>
            <p>Selecciona una página para ver sus reportes</p>
          </div>
        ) : (
          <>
            <div className="reports-list-section">
              <h3 className="section-heading">
                Reportes de <span className="page-badge">{selectedPage}</span>
                <span className="count-label">({reports.length} registros)</span>
              </h3>

              {reports.length === 0 ? (
                <div className="empty-state">No hay reportes para esta página.</div>
              ) : (
                <div className="report-cards">
                  {reports.map(r => (
                    <div
                      key={r.id}
                      className={`report-card ${openReport?.id === r.id ? 'active' : ''}`}
                      onClick={() => openReportDetail(r)}
                    >
                      <div className="report-card-header">
                        <span className="report-date">{formatDate(r.timestamp)}</span>
                        <button className="btn-delete" onClick={e => deleteReport(e, r)} title="Eliminar">🗑</button>
                      </div>
                      <div className="report-card-url">{r.url}</div>
                      <div className="report-card-stats">
                        <span className="mini-stat">{r.summary.total} elem.</span>
                        {r.summary.errors > 0 && (
                          <span className="mini-stat stat-e">{r.summary.errors} err.</span>
                        )}
                        {r.summary.warnings > 0 && (
                          <span className="mini-stat stat-w">{r.summary.warnings} adv.</span>
                        )}
                        {r.summary.errors === 0 && r.summary.warnings === 0 && (
                          <span className="mini-stat stat-ok">✓ ok</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail */}
            {loading && <div className="loading-bar">Cargando reporte…</div>}

            {reportData && !loading && (
              <div className="report-detail-section">
                <div className="detail-header">
                  <div>
                    <h3>Detalle del reporte</h3>
                    <div className="detail-meta">
                      {formatDate(reportData.timestamp)} · {reportData.url}
                    </div>
                  </div>
                  <SummaryCards summary={reportData.summary} />
                </div>

                <ResultsTable
                  elements={reportData.elements}
                  checkAttributes={reportData.checkAttributes || ['id', 'name']}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCards({ summary }) {
  return (
    <div className="summary-cards-row">
      <div className="s-card s-total"><div className="s-val">{summary.total}</div><div className="s-lbl">elementos</div></div>
      <div className="s-card s-error"><div className="s-val">{summary.errors}</div><div className="s-lbl">errores</div></div>
      <div className="s-card s-warn"><div className="s-val">{summary.warnings}</div><div className="s-lbl">advertencias</div></div>
      <div className="s-card s-ok"><div className="s-val">{summary.total - summary.withIssues}</div><div className="s-lbl">ok</div></div>
    </div>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
