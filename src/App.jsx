import { useState, useEffect } from 'react';
import ValidatorPanel  from './components/ValidatorPanel.jsx';
import ReportsPanel    from './components/ReportsPanel.jsx';
import HistoryPanel    from './components/HistoryPanel.jsx';
import BookmarkletPanel from './components/BookmarkletPanel.jsx';
import { readHashPayload } from './utils/inject.js';

const TABS = [
  { id: 'validator',   label: '🔍 Validador' },
  { id: 'bookmarklet', label: '🔖 Bookmarklet' },
  { id: 'reports',     label: '📋 Reportes' },
  { id: 'history',     label: '🕐 Historial' },
];

export default function App() {
  const [tab,          setTab]          = useState('validator');
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [injectedData, setInjectedData] = useState(null);

  // Detect bookmarklet payload in URL hash on first load
  useEffect(() => {
    const payload = readHashPayload();
    if (payload) {
      setInjectedData(payload);
      setTab('validator');
    }
  }, []);

  const onReportSaved = () => setRefreshKey(k => k + 1);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon">🔬</span>
          <div>
            <h1>Validator Web</h1>
            <p>Validación de atributos HTML por página</p>
          </div>
        </div>
        <nav className="tab-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'bookmarklet' && <span className="tab-badge">nuevo</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {tab === 'validator'   && (
          <ValidatorPanel
            onReportSaved={onReportSaved}
            injectedData={injectedData}
            onInjectedClear={() => setInjectedData(null)}
          />
        )}
        {tab === 'bookmarklet' && <BookmarkletPanel />}
        {tab === 'reports'     && <ReportsPanel key={refreshKey} />}
        {tab === 'history'     && <HistoryPanel key={refreshKey} />}
      </main>
    </div>
  );
}
