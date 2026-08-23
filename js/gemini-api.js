/**
 * gemini-api.js
 * The ONLY module in the entire app that makes a network request. It calls
 * Google's Gemini endpoint directly from the browser using the user's own
 * key — there is no backend, no proxy, and no other server in the path.
 *
 * Request shape verified directly against Google's current REST docs
 * (generateContent, inline_data, generationConfig.responseMimeType,
 * generationConfig.maxOutputTokens).
 *
 * Resilience strategy (added on top of the original single-shot call):
 *   1. Exponential backoff with full jitter on transient errors (429 rate
 *      limit / quota exhausted, 503 server busy, other 5xx, and network
 *      failures) — see RETRY_CONFIG in config.js.
 *   2. Sequential model fallback across FALLBACK_MODELS — once a model
 *      exhausts its retries on a 429/503-class error, the next model in the
 *      chain is tried automatically so the user sees a normal result
 *      instead of an error, as long as ANY model in the chain still has
 *      capacity.
 * Non-retryable errors (bad API key, invalid request, safety block, parse
 * failure) fail fast on the first attempt — no amount of retrying or model
 * swapping fixes those, so we don't waste the user's time.
 */

import { GEMINI_ENDPOINT, FALLBACK_MODELS, RETRY_CONFIG, MAX_OUTPUT_TOKENS } from './config.js';

function apiError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

function stripCodeFence(text) {
  return text.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Google's 429/503 error bodies often include a structured
 * google.rpc.RetryInfo detail telling the client exactly how long to wait
 * before the quota/capacity window resets, e.g.:
 *   { error: { details: [{ "@type": ".../google.rpc.RetryInfo", retryDelay: "19s" }] } }
 * When present, this is a better signal than a client-guessed backoff, so we
 * prefer it over the computed delay.
 */
function parseServerRetryDelayMs(errorBody) {
  const details = errorBody?.error?.details;
  if (!Array.isArray(details)) return null;
  const info = details.find((d) => typeof d?.['@type'] === 'string' && d['@type'].includes('RetryInfo'));
  const raw = info?.retryDelay;
  if (typeof raw !== 'string') return null;
  const seconds = parseFloat(raw);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

/**
 * Exponential backoff with "full jitter" (as recommended in AWS's
 * backoff-and-jitter architecture guidance):
 *   delay = random(0, min(maxDelayMs, baseDelayMs * 2^attempt))
 * Full jitter spreads out retries from many concurrent clients better than a
 * fixed or half-jitter schedule, reducing the odds of a synchronized
 * "retry storm" against an already-struggling model endpoint.
 */
function computeBackoffDelayMs(attempt) {
  const capped = Math.min(RETRY_CONFIG.maxDelayMs, RETRY_CONFIG.baseDelayMs * 2 ** attempt);
  return Math.random() * capped;
}

// Preferred model first, then the fallback chain, de-duplicated so a
// preferred model that's already in FALLBACK_MODELS isn't tried twice.
// Exported so ui.js can render the exact same chain in Settings (chip
// visualization) that this module will actually execute at request time —
// one dedup implementation, never two lists that can drift apart.
export function buildModelChain(preferredModel) {
  const chain = [preferredModel, ...FALLBACK_MODELS].filter(Boolean);
  return [...new Set(chain)];
}

async function callGeminiOnce({ apiKey, model, parts }) {
  let response;
  try {
    response = await fetch(GEMINI_ENDPOINT(model), {
      method: 'POST',
      // Enforce standard CORS behavior on mobile browsers like Safari Mobile
      mode: 'cors',
      // Prevent Safari from appending or expecting Google login cookies/OAuth tokens
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        // Trim hidden spaces/newlines often introduced during mobile copy-paste
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          // Prevents long structured verdicts (details table + recommendation
          // + disclaimer) from being cut off mid-JSON on verbose responses.
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      }),
    });
  } catch (networkErr) {
    // fetch() rejects on DNS/offline/CORS-preflight failures, not HTTP status
    // codes — these are inherently transient and worth retrying/falling back.
    throw apiError('NETWORK', networkErr.message, { retryable: true });
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw apiError('BAD_RESPONSE', 'Non-JSON response from Gemini', {
      status: response.status,
      retryable: RETRYABLE_STATUS.has(response.status),
    });
  }

  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw apiError('API_ERROR', message, {
      status: response.status,
      retryable: RETRYABLE_STATUS.has(response.status),
      serverDelayMs: parseServerRetryDelayMs(body),
    });
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = body?.candidates?.[0]?.finishReason || 'EMPTY';
    // Safety blocks / empty candidates aren't fixed by retrying the same
    // request or swapping models, so treat as non-retryable.
    throw apiError('EMPTY_RESPONSE', reason, { retryable: false });
  }

  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(stripCodeFence(text));
    } catch {
      throw apiError('PARSE_ERROR', 'Could not parse Gemini response as JSON', { retryable: false });
    }
  }
}

/**
 * @param {Object} args
 * @param {string} args.apiKey
 * @param {string} args.model - preferred/primary model (usually the user's Settings value)
 * @param {string} args.promptText
 * @param {({base64: string, mimeType: string}[]|{base64: string, mimeType: string})=} args.media -
 *   optional image(s)/PDF(s). Accepts a single {base64, mimeType} object (legacy call shape)
 *   or an array of them for multi-file uploads — each becomes its own inline_data part in the
 *   same request, which is how Gemini expects multiple images/PDFs analyzed together.
 * @param {(status: {type: 'retry'|'fallback', model: string, attempt?: number, maxRetries?: number, modelIndex?: number, totalModels?: number})=>void=} args.onStatusUpdate -
 *   optional callback fired right before a retry or a fallback-model attempt, so the caller can
 *   update loading UI (e.g. "Server busy, retrying...") without surfacing a hard error to the user.
 * @returns {Promise<Object>} the parsed JSON verdict object from Gemini
 */
export async function analyzeWithGemini({ apiKey, model, promptText, media, onStatusUpdate }) {
  if (!apiKey) throw apiError('NO_KEY', 'Missing API key');

  const mediaList = Array.isArray(media) ? media : media ? [media] : [];

  const parts = [];
  for (const item of mediaList) {
    if (item?.base64) {
      parts.push({ inline_data: { mime_type: item.mimeType, data: item.base64 } });
    }
  }
  parts.push({ text: promptText });

  const modelChain = buildModelChain(model);
  let lastError = null;

  for (let modelIndex = 0; modelIndex < modelChain.length; modelIndex++) {
    const currentModel = modelChain[modelIndex];

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      if (modelIndex > 0 && attempt === 0) {
        onStatusUpdate?.({ type: 'fallback', model: currentModel, modelIndex, totalModels: modelChain.length });
      } else if (attempt > 0) {
        onStatusUpdate?.({ type: 'retry', model: currentModel, attempt, maxRetries: RETRY_CONFIG.maxRetries });
      }

      try {
        // eslint-disable-next-line no-await-in-loop
        return await callGeminiOnce({ apiKey, model: currentModel, parts });
      } catch (err) {
        lastError = err;

        if (!err.retryable) {
          // Bad key, malformed request, safety block, parse failure - retrying
          // or switching models will not change the outcome, so fail fast.
          throw err;
        }

        const isLastAttemptForModel = attempt === RETRY_CONFIG.maxRetries;
        if (isLastAttemptForModel) {
          // Exhausted retries for this model on a 429/503-class error - move
          // on to the next model in the fallback chain instead of continuing
          // to retry an already-confirmed-overloaded/exhausted one.
          break;
        }

        const delayMs = err.serverDelayMs ?? computeBackoffDelayMs(attempt);
        // eslint-disable-next-line no-await-in-loop
        await sleep(Math.min(delayMs, RETRY_CONFIG.maxDelayMs));
      }
    }
  }

  // Every model in the chain was exhausted - surface the last (most recent)
  // error, but tag it distinctly so the UI can show a clear "all models are
  // busy, try again shortly" message rather than a generic API error.
  throw apiError('ALL_MODELS_EXHAUSTED', lastError?.message || 'All models failed', {
    status: lastError?.status,
    cause: lastError,
  });
}
