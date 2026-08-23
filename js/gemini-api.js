/**
 * gemini-api.js
 * The ONLY module in the entire app that makes a network request. It calls
 * Google's Gemini endpoint directly from the browser using the user's own
 * key — there is no backend, no proxy, and no other server in the path.
 *
 * Request shape verified directly against Google's current REST docs
 * (generateContent, inline_data, generationConfig.responseMimeType).
 */

import { GEMINI_ENDPOINT } from './config.js';

function apiError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function stripCodeFence(text) {
  return text.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
}

/**
 * @param {Object} args
 * @param {string} args.apiKey
 * @param {string} args.model
 * @param {string} args.promptText
 * @param {({base64: string, mimeType: string}[]|{base64: string, mimeType: string})=} args.media -
 *   optional image(s)/PDF(s). Accepts a single {base64, mimeType} object (legacy call shape)
 *   or an array of them for multi-file uploads — each becomes its own inline_data part in the
 *   same request, which is how Gemini expects multiple images/PDFs analyzed together.
 * @returns {Promise<Object>} the parsed JSON verdict object from Gemini
 */
export async function analyzeWithGemini({ apiKey, model, promptText, media }) {
  if (!apiKey) throw apiError('NO_KEY', 'Missing API key');

  const mediaList = Array.isArray(media) ? media : media ? [media] : [];

  const parts = [];
  for (const item of mediaList) {
    if (item?.base64) {
      parts.push({ inline_data: { mime_type: item.mimeType, data: item.base64 } });
    }
  }
  parts.push({ text: promptText });

  let response;
  try {
    response = await fetch(GEMINI_ENDPOINT(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
  } catch (networkErr) {
    throw apiError('NETWORK', networkErr.message);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw apiError('BAD_RESPONSE', 'Non-JSON response from Gemini');
  }

  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw apiError('API_ERROR', message);
  }

  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = body?.candidates?.[0]?.finishReason || 'EMPTY';
    throw apiError('EMPTY_RESPONSE', reason);
  }

  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(stripCodeFence(text));
    } catch {
      throw apiError('PARSE_ERROR', 'Could not parse Gemini response as JSON');
    }
  }
}
