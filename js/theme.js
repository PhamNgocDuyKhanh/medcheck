/**
 * theme.js
 * Dark/light theme, persisted via storage.js. Falls back to the OS-level
 * preference on first visit instead of hardcoding a default.
 */

import { getTheme as readStoredTheme, setTheme as persistTheme } from './storage.js';

function systemPrefersLight() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
}

const THEME_COLOR = { dark: '#0f172a', light: '#f8fafc' };

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme] || THEME_COLOR.dark);
}

export function initTheme() {
  const stored = readStoredTheme();
  const theme = stored || (systemPrefersLight() ? 'light' : 'dark');
  applyTheme(theme);
  return theme;
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

export function toggleTheme() {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  persistTheme(next);
  return next;
}
