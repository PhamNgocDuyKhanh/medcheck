/**
 * icons.js
 * A small, hand-built line-icon set (24x24 viewBox, stroke-based, currentColor)
 * so the app never depends on emoji rendering — which varies wildly across
 * OS/browser and reads as unpolished in a health-focused tool. Single source
 * of truth: every icon in the app comes from here, referenced by name via a
 * `data-icon="name"` attribute and hydrated by hydrateIcons().
 */

const ICONS = {
  camera: `<path d="M9 3h6l1.2 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2.8L9 3z"/><circle cx="12" cy="13" r="3.2"/>`,

  edit: `<path d="M4 20l0.9-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20z"/><path d="M14.3 6.5l3.2 3.2"/>`,

  pill: `<g transform="rotate(-35 12 12)"><rect x="3" y="9" width="18" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g>`,

  flask: `<path d="M10 3h4"/><path d="M10.3 3v6.3L4.9 17.8a1.4 1.4 0 0 0 1.2 2.2h11.8a1.4 1.4 0 0 0 1.2-2.2L13.7 9.3V3"/><line x1="7.7" y1="15" x2="16.3" y2="15"/>`,

  fileText: `<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/><line x1="8.5" y1="12.5" x2="15.5" y2="12.5"/><line x1="8.5" y1="16" x2="15.5" y2="16"/>`,

  user: `<circle cx="12" cy="8.2" r="3.3"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>`,

  history: `<circle cx="12" cy="12" r="8.3"/><path d="M12 7.2V12l3.2 2"/>`,

  settings: `<line x1="4" y1="6.5" x2="20" y2="6.5"/><circle cx="9" cy="6.5" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2"/><line x1="4" y1="17.5" x2="20" y2="17.5"/><circle cx="11" cy="17.5" r="2"/>`,

  sun: `<circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.1" y1="5.1" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.9" y2="18.9"/><line x1="5.1" y1="18.9" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="18.9" y2="5.1"/>`,

  moon: `<path fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 0 9.3 11.5A8 8 0 0 1 12 2.5z" fill="currentColor" stroke="none"/>`,

  upload: `<path d="M12 15.5V4.5"/><path d="M7.3 9L12 4.3 16.7 9"/><path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/>`,

  zap: `<path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10.5H13z" fill="currentColor" stroke="none"/>`,

  refresh: `<path d="M4.5 12a7.5 7.5 0 0 1 13.4-4.6"/><path d="M19.5 12a7.5 7.5 0 0 1-13.4 4.6"/><path d="M18 3.5v4.3h-4.3"/><path d="M6 20.5v-4.3h4.3"/>`,

  search: `<circle cx="10.3" cy="10.3" r="6.3"/><line x1="15" y1="15" x2="20.5" y2="20.5"/>`,

  check: `<path d="M4.5 12.5l4.5 4.5 10.5-11"/>`,

  alertTriangle: `<path d="M12 3.5 22 20H2z"/><line x1="12" y1="9.5" x2="12" y2="13.7"/><circle cx="12" cy="16.6" r="0.95" fill="currentColor" stroke="none"/>`,

  xMark: `<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>`,

  trash: `<path d="M5 7h14"/><path d="M9.5 7V5.2a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M7.2 7l0.9 12.2A2 2 0 0 0 10.1 21h3.8a2 2 0 0 0 2-1.8L16.8 7"/><line x1="10.2" y1="11" x2="10.2" y2="16.5"/><line x1="13.8" y1="11" x2="13.8" y2="16.5"/>`,

  spinner: `<circle cx="12" cy="12" r="9" opacity="0.2"/><path d="M21 12a9 9 0 0 0-9-9"/>`,

  close: `<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>`,

  chevronUp: `<path d="M5.5 15.5 12 9l6.5 6.5"/>`,

  chevronDown: `<path d="M5.5 8.5 12 15l6.5-6.5"/>`,
};

export function iconSvg(name, { size = 20, strokeWidth = 1.8, extraClass = '' } = {}) {
  const inner = ICONS[name];
  if (!inner) return '';
  const spin = name === 'spinner' ? ' icon--spin' : '';
  return `<svg class="icon${spin}${extraClass ? ' ' + extraClass : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
}

/**
 * Finds every element with a data-icon attribute and fills it with the
 * matching SVG. Safe to call repeatedly (e.g. after re-rendering a section).
 */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    const name = el.getAttribute('data-icon');
    const size = el.getAttribute('data-icon-size');
    el.innerHTML = iconSvg(name, size ? { size: Number(size) } : {});
  });
}
