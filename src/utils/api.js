const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  validate: (body) =>
    request('/validate', { method: 'POST', body: JSON.stringify(body) }),

  saveReport: (body) =>
    request('/reports', { method: 'POST', body: JSON.stringify(body) }),

  getPages: () => request('/pages'),

  getReports: (pageName) => request(`/reports/${encodeURIComponent(pageName)}`),

  getReport: (pageName, reportId) =>
    request(`/reports/${encodeURIComponent(pageName)}/${reportId}`),

  deleteReport: (pageName, reportId) =>
    request(`/reports/${encodeURIComponent(pageName)}/${reportId}`, { method: 'DELETE' }),
};
