/**
 * config.js
 * Central place for constants used across the app.
 * Nothing in this file touches the DOM or the network.
 */

// Namespaced localStorage keys — namespacing avoids collisions with any other
// site data that might ever share a browser profile.
export const STORAGE_KEYS = {
  API_KEY: 'medcheck:apiKey',
  MODEL: 'medcheck:model',
  LANG: 'medcheck:lang',
  RESPONSE_LANG: 'medcheck:responseLang',
  THEME: 'medcheck:theme',
  PROFILE: 'medcheck:profile',
  HISTORY: 'medcheck:history',
};

// Default Gemini model. Exposed as an editable setting in the UI (not
// hardcoded into logic) since model names change over time — if Google
// renames or retires this one, the user can swap it without touching code.
export const DEFAULT_MODEL = 'gemini-3.6-flash';

// Gemini REST endpoint. {model} is substituted at call time. Encoded
// defensively since `model` comes from a free-text Settings field — an
// unencoded value with a `/`, `?`, or `#` could otherwise reshape the
// request path in confusing ways.
export const GEMINI_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

// Hard client-side ceiling matching Gemini's own inline-request limit, so we
// fail fast with a clear message instead of sending a doomed request.
export const MAX_INLINE_FILE_BYTES = 18 * 1024 * 1024; // 18MB safety margin under Google's 20MB cap

// With multi-file upload, several files ride in ONE request as separate
// inline_data parts — Gemini's ~20MB cap applies to the whole request body,
// not per file, so the combined size of every staged file must also stay
// under that ceiling even though each individual file already does.
export const MAX_TOTAL_INLINE_BYTES = 18 * 1024 * 1024; // 18MB safety margin, combined across all staged files

// Sane UX ceiling on how many photos/files can be staged for one analysis —
// keeps the request payload (and Gemini's per-call reasoning) reasonable.
export const MAX_FILES_PER_ANALYSIS = 6;

// Analysis modes — used as the single source of truth for tab ids,
// accepted file types, and which prompt builder to call.
export const MODES = {
  FOOD_SCAN: 'food-scan',
  FOOD_MANUAL: 'food-manual',
  PRESCRIPTION: 'prescription',
  LAB_REPORT: 'lab-report',
};

// Accepted file types per mode (used for <input accept> and validation).
export const ACCEPTED_TYPES = {
  [MODES.FOOD_SCAN]: ['image/jpeg', 'image/png', 'image/webp'],
  [MODES.PRESCRIPTION]: ['image/jpeg', 'image/png', 'image/webp'],
  [MODES.LAB_REPORT]: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

// Cap on how many entries we keep in local history so localStorage
// (5-10MB per origin) never gets anywhere close to full from text alone.
export const MAX_HISTORY_ENTRIES = 100;

export const APP_VERSION = '1.0.0';
