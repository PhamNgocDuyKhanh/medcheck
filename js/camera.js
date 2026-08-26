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
    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
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
 * Draws the video frame to an offscreen canvas, resizes it if it exceeds max dimensions,
 * and returns raw base64 JPEG data.
 */
export function captureFrame(videoEl, maxWidth = 1600, maxHeight = 1600, quality = 0.8) {
  let width = videoEl.videoWidth;
  let height = videoEl.videoHeight;

  // Scale down dimensions proportionally if too large
  if (width > maxWidth || height > maxHeight) {
    if (width > height) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    } else {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, width, height);
  
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
 * Reads a File/Blob, compresses images client-side via canvas, and returns base64 + mimeType.
 * Passes PDFs through without modification.
 */
export async function readFileAsBase64(file) {
  // If it's a PDF or non-image, read it directly without compression
  if (!file.type.startsWith('image/')) {
    return readRawFileAsBase64(file);
  }

  try {
    const compressedBlob = await compressImageFile(file, 1600, 1600, 0.8);
    return readRawFileAsBase64(compressedBlob);
  } catch (err) {
    console.warn('Image compression failed, falling back to raw file:', err);
    return readRawFileAsBase64(file);
  }
}

/**
 * Internal helper to compress image Files using an offscreen canvas.
 */
function compressImageFile(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas blob creation failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Internal helper for reading standard blobs/files into base64.
 */
function readRawFileAsBase64(file) {
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
