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

// Sequential fallback chain used by gemini-api.js when a request to the
// active model comes back 429 (rate limit / quota exhausted) or 503 (server
// overloaded / busy). The user's Settings model (DEFAULT_MODEL unless they
// changed it) is always attempted first; if it isn't already the head of
// this list, it's tried before the chain below, and this list itself is
// de-duplicated against it — so a Free Tier user always lands on the most
// capable model that still has quota available, without ever seeing a
// failed request as long as at least one model in the chain is healthy.
//
// Ordered for the Gemini Free Tier: newest/most-accurate multimodal Flash
// first, stepping down through faster/higher-quota and quota-efficient
// options, with Pro held in reserve for when only heavier reasoning is left.
export const FALLBACK_MODELS = [
  'gemini-3.6-flash', // 1. Primary — latest-gen Flash, best default accuracy/speed
  'gemini-2.5-flash', // 2. Fallback 1 — 2.5-gen multimodal Flash
  'gemini-2.0-flash', // 3. Fallback 2 — 2.0-gen Flash (ultra-fast, large free quota)
  'gemini-2.5-flash-lite', // 4. Fallback 3 — quota-efficient Lite model
  'gemini-2.5-pro', // 5. Final fallback — Pro model for advanced medical reasoning
];

// Exponential-backoff-with-jitter tuning for transient errors (429/503/5xx
// and network failures). Uses the "full jitter" strategy recommended by
// AWS's backoff-and-jitter guidance: delay = random(0, min(maxDelayMs,
// baseDelayMs * 2^attempt)). This is applied per-model — once a model
// exhausts its retries, gemini-api.js advances to the next model in
// FALLBACK_MODELS rather than continuing to hammer an overloaded/exhausted
// one. When Gemini's error body includes an explicit google.rpc.RetryInfo
// retryDelay (it does for most 429 quota errors), that server-provided
// delay is honored instead of the computed one — the API itself knows its
// quota reset window better than a client-side guess, which is the
// "best practice per model" the delay effectively adapts to.
export const RETRY_CONFIG = {
  maxRetries: 3, // retry attempts per model, beyond the first try
  baseDelayMs: 1000, // 1s
  maxDelayMs: 16000, // 16s cap so a single model never stalls the UI too long
};

// Safe ceiling for generationConfig.maxOutputTokens. Without an explicit cap
// Gemini defaults to a model-specific max that, combined with
// responseMimeType: 'application/json', can let a verbose structured verdict
// (details table + recommendation + disclaimer, especially for multi-file
// lab reports) run long enough to hit a truncation cutoff mid-object and
// break JSON.parse. 8192 comfortably covers the app's largest realistic
// response across every model in FALLBACK_MODELS.
export const MAX_OUTPUT_TOKENS = 8192;

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
