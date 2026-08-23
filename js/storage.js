/**
 * storage.js
 * The ONLY module that touches localStorage directly. Every read/write is
 * wrapped in try/catch since localStorage can throw (private browsing mode,
 * quota exceeded, disabled by browser settings, etc.) — a storage failure
 * should never crash the app, just degrade gracefully.
 */

import { STORAGE_KEYS, DEFAULT_MODEL, MAX_HISTORY_ENTRIES } from './config.js';

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn('[storage] read failed for', key, err);
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn('[storage] write failed for', key, err);
    return false;
  }
}

function safeRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('[storage] remove failed for', key, err);
  }
}

/* ---------- API key (never logged, never sent anywhere but Google) ---------- */

export function getApiKey() {
  return safeGet(STORAGE_KEYS.API_KEY) || '';
}

export function setApiKey(key) {
  return safeSet(STORAGE_KEYS.API_KEY, key.trim());
}

export function clearApiKey() {
  safeRemove(STORAGE_KEYS.API_KEY);
}

export function hasApiKey() {
  return getApiKey().length > 0;
}

/* ---------- Model name (editable setting, not hardcoded logic) ---------- */

export function getModel() {
  return safeGet(STORAGE_KEYS.MODEL) || DEFAULT_MODEL;
}

export function setModel(model) {
  return safeSet(STORAGE_KEYS.MODEL, model.trim() || DEFAULT_MODEL);
}

/* ---------- AI response language ----------
   Independent from the UI display language (STORAGE_KEYS.LANG) — a user
   may want to browse the app in English but have Gemini's analysis come
   back in Vietnamese, or vice versa. 'auto' (the default) means "whatever
   the interface language currently is", preserving the original behavior
   for anyone who never touches this new setting. */

export function getResponseLang() {
  const stored = safeGet(STORAGE_KEYS.RESPONSE_LANG);
  return stored === 'vi' || stored === 'en' ? stored : 'auto';
}

export function setResponseLang(lang) {
  const value = lang === 'vi' || lang === 'en' ? lang : 'auto';
  return safeSet(STORAGE_KEYS.RESPONSE_LANG, value);
}

/* ---------- Language ---------- */

export function getLang() {
  return safeGet(STORAGE_KEYS.LANG) || 'vi';
}

export function setLang(lang) {
  return safeSet(STORAGE_KEYS.LANG, lang);
}

/* ---------- Theme ---------- */

export function getTheme() {
  return safeGet(STORAGE_KEYS.THEME); // null means "no preference saved yet"
}

export function setTheme(theme) {
  return safeSet(STORAGE_KEYS.THEME, theme);
}

/* ---------- Medical profile ---------- */

const DEFAULT_PROFILE = {
  ldl: '',
  hdl: '',
  triglycerides: '',
  allergies: '',
  conditions: '',
  medications: '',
  dietPattern: 'none',
};

export function getProfile() {
  const raw = safeGet(STORAGE_KEYS.PROFILE);
  if (!raw) return { ...DEFAULT_PROFILE };
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[storage] corrupt profile, resetting', err);
    return { ...DEFAULT_PROFILE };
  }
}

export function setProfile(profile) {
  return safeSet(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

/* ---------- Scan / document history (text-only by design — no images/PDFs
   are ever persisted, to keep the footprint small and PHI exposure low) ---------- */

export function getHistory() {
  const raw = safeGet(STORAGE_KEYS.HISTORY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[storage] corrupt history, resetting', err);
    return [];
  }
}

export function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift(entry); // newest first
  const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
  safeSet(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
  return trimmed;
}

export function deleteHistoryEntry(id) {
  const history = getHistory().filter((entry) => entry.id !== id);
  safeSet(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  return history;
}

export function clearHistory() {
  safeRemove(STORAGE_KEYS.HISTORY);
}
