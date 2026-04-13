// Unified API — fully client-side (no server required).
// Uses CORS proxy + DOMParser for validation, localStorage for persistence.

import { fetchPage, parseAttributes } from './fetcher.js';
import * as storage from './storage.js';

export const api = {
  async validate({ url, pageName, elementTypes, checkAttributes }) {
    const html = await fetchPage(url);
    const elements = parseAttributes(html, elementTypes, checkAttributes);

    const byTag = {};
    elementTypes.forEach(tag => { byTag[tag] = elements.filter(e => e.tag === tag).length; });

    const summary = {
      total:      elements.length,
      withIssues: elements.filter(e => e.hasIssues).length,
      errors:     elements.reduce((a, e) => a + e.issues.filter(i => i.severity === 'error').length, 0),
      warnings:   elements.reduce((a, e) => a + e.issues.filter(i => i.severity === 'warning').length, 0),
      byTag,
    };

    return { success: true, url, pageName, elements, summary };
  },

  saveReport({ pageName, url, elements, summary, checkAttributes, elementTypes }) {
    const report = {
      id: crypto.randomUUID(),
      pageName, url,
      timestamp: new Date().toISOString(),
      elements, summary, checkAttributes, elementTypes,
    };
    storage.saveReport(report);
    return Promise.resolve({ success: true, report });
  },

  getPages:     ()                  => Promise.resolve(storage.getPages()),
  getReports:   (pageName)          => Promise.resolve(storage.getReports(pageName)),
  getReport:    (pageName, id)      => Promise.resolve(storage.getReport(pageName, id)),
  deleteReport: (pageName, id)      => { storage.deleteReport(pageName, id); return Promise.resolve({ success: true }); },
};
