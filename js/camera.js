/**
 * camera.js
 * All media capture: live camera stream, canvas snapshot, and file-input
 * reading. Everything here stays in memory (no localStorage writes) — this
 * module hands base64 bytes to the caller and is done.
 *
 * Deliberately has no i18n import: it throws Error objects with a `.code`
 * so ui.js (which owns translations) can decide how to phrase the message.
 */

import { MAX_INLINE_FILE_BYTES } from './config.js';

export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

export function stopCamera(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

/**
 * Draws the current video frame to an offscreen canvas and returns it as
 * base64 JPEG (no data: prefix — Gemini's inline_data wants raw base64).
 */
export function captureFrame(videoEl, quality = 0.9) {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return {
    base64: dataUrl.split(',')[1],
    mimeType: 'image/jpeg',
  };
}

function validationError(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

export function validateFile(file, acceptedTypes) {
  if (!acceptedTypes.includes(file.type)) {
    throw validationError('INVALID_TYPE');
  }
  if (file.size > MAX_INLINE_FILE_BYTES) {
    throw validationError('FILE_TOO_LARGE');
  }
}

/**
 * Reads a File/Blob into base64 + mimeType, entirely client-side via
 * FileReader. Works for images and PDFs alike.
 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const [, base64] = String(reader.result).split(',');
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = () => reject(reader.error || validationError('READ_FAILED'));
    reader.readAsDataURL(file);
  });
}
