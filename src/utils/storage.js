// localStorage-based persistence for reports.
// Schema: { [pageName]: Report[] }

const KEY = 'validatorweb_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function persist(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {
    // localStorage full — remove oldest report per page and retry
    const oldest = Object.entries(db)
      .flatMap(([page, reports]) => reports.map(r => ({ page, r })))
      .sort((a, b) => a.r.timestamp.localeCompare(b.r.timestamp))[0];
    if (oldest) {
      db[oldest.page] = db[oldest.page].filter(r => r.id !== oldest.r.id);
      if (!db[oldest.page].length) delete db[oldest.page];
      localStorage.setItem(KEY, JSON.stringify(db));
    }
  }
}

export function getPages() {
  const db = load();
  return Object.entries(db).map(([name, reports]) => ({ name, count: reports.length }));
}

export function getReports(pageName) {
  const db = load();
  // Return summaries only (no heavy elements array), newest first
  return (db[pageName] || [])
    .slice()
    .reverse()
    .map(({ elements, ...rest }) => rest); // strip elements for list view
}

export function getReport(pageName, reportId) {
  const db = load();
  return (db[pageName] || []).find(r => r.id === reportId) || null;
}

export function saveReport(report) {
  const db = load();
  if (!db[report.pageName]) db[report.pageName] = [];
  db[report.pageName].push(report);
  persist(db);
}

export function deleteReport(pageName, reportId) {
  const db = load();
  if (db[pageName]) {
    db[pageName] = db[pageName].filter(r => r.id !== reportId);
    if (!db[pageName].length) delete db[pageName];
    persist(db);
  }
}
