import { useState } from 'react';
import ValidatorPanel from './components/ValidatorPanel.jsx';
import ReportsPanel from './components/ReportsPanel.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';

const TABS = [
  { id: 'validator', label: '🔍 Validador' },
  { id: 'reports', label: '📋 Reportes' },
  { id: 'history', label: '🕐 Historial' },
];

export default function App() {
  const [tab, setTab] = useState('validator');
  const [refreshKey, setRefreshKey] = useState(0);

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
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {tab === 'validator' && <ValidatorPanel onReportSaved={onReportSaved} />}
        {tab === 'reports'   && <ReportsPanel key={refreshKey} />}
        {tab === 'history'   && <HistoryPanel key={refreshKey} />}
      </main>
    </div>
  );
}
