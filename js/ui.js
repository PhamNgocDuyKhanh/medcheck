/**
 * ui.js
 * Owns all DOM rendering and DOM-driven state (tabs, capture zones, modals,
 * result cards, toasts). It calls into camera.js for media primitives and
 * storage.js to populate forms, but NEVER calls gemini-api.js directly —
 * network orchestration lives in app.js, keeping the "only one file talks
 * to the network" guarantee easy to verify by reading gemini-api.js alone.
 */

import { MODES, ACCEPTED_TYPES, MAX_FILES_PER_ANALYSIS, MAX_TOTAL_INLINE_BYTES } from './config.js';
import { t } from './i18n.js';
import * as storage from './storage.js';
import * as camera from './camera.js';
import { iconSvg, hydrateIcons } from './icons.js';

/* ------------------------------ helpers ------------------------------ */

const $ = (id) => document.getElementById(id);

const CAPTURE_MODES = [MODES.FOOD_SCAN, MODES.PRESCRIPTION, MODES.LAB_REPORT];

// Per-mode transient state — never persisted, resets on reload. `media` is
// always an array now (0..MAX_FILES_PER_ANALYSIS items) so a capture zone can
// hold several uploaded files (or one camera shot) at once.
const captureState = {};
CAPTURE_MODES.forEach((mode) => {
  captureState[mode] = { stream: null, media: [] };
});

let toastTimer = null;

/* ------------------------------- icons -------------------------------- */

export function initStaticIcons() {
  hydrateIcons(document);
}

/* ------------------------------- tabs -------------------------------- */

export function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchTab(mode);
    });
  });
}

export function initHomeButton() {
  const btn = $('btn-home');
  if (!btn) return;
  btn.addEventListener('click', () => {
    switchTab(MODES.FOOD_SCAN);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/**
 * Replaces every input[type="number"]'s native up/down spin arrows with one
 * consistent custom control (see .number-stepper in style.css). Generic and
 * declarative on purpose: it queries the DOM directly rather than requiring
 * a list of field ids kept in sync elsewhere, so adding a new number input
 * anywhere in the app (now or later) gets the same treatment automatically.
 * Safe to call more than once — already-wrapped inputs are skipped.
 */
export function initNumberSteppers(root = document) {
  root.querySelectorAll('input[type="number"]').forEach((input) => {
    if (input.closest('.number-stepper')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'number-stepper';
    input.replaceWith(wrapper);
    wrapper.appendChild(input);

    const controls = document.createElement('div');
    controls.className = 'number-stepper-controls';
    controls.innerHTML = `
      <button type="button" class="number-stepper-btn" data-step="up" aria-label="${t('stepperIncrease')}">${iconSvg('chevronUp', { size: 14, strokeWidth: 2.2 })}</button>
      <button type="button" class="number-stepper-btn" data-step="down" aria-label="${t('stepperDecrease')}">${iconSvg('chevronDown', { size: 14, strokeWidth: 2.2 })}</button>
    `;
    wrapper.appendChild(controls);

    const step = () => parseFloat(input.step) || 1;
    const decimalsFor = (n) => (String(n).split('.')[1] || '').length;

    const nudge = (direction) => {
      const delta = direction === 'up' ? step() : -step();
      const current = parseFloat(input.value) || 0;
      let next = current + delta;
      if (input.min !== '') next = Math.max(next, parseFloat(input.min));
      if (input.max !== '') next = Math.min(next, parseFloat(input.max));
      const decimals = decimalsFor(step());
      input.value = decimals ? next.toFixed(decimals) : String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    controls.querySelector('[data-step="up"]').addEventListener('click', () => nudge('up'));
    controls.querySelector('[data-step="down"]').addEventListener('click', () => nudge('down'));
  });
}

export function switchTab(mode) {
  // Release any camera still running on the tab we're leaving.
  CAPTURE_MODES.forEach((m) => {
    if (m !== mode && captureState[m].stream) {
      stopCameraFor(m);
    }
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.querySelectorAll('.tab-content').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `content-${mode}`);
  });
  clearResult();
  clearError();
}

/* --------------------------- capture zones ---------------------------- */
/*
 * Generates identical camera/upload/preview markup for every capture-based
 * mode from a single template, so adding a 5th scan mode later needs zero
 * new HTML — just one more <div class="capture-zone" data-mode="..."> in
 * index.html.
 */

function captureZoneTemplate() {
  return `
    <div class="capture-controls" data-role="controls">
      <button type="button" class="btn-action btn-outline" data-action="open-camera">${iconSvg('camera', { size: 18 })}<span data-i18n="btnOpenCamera">${t('btnOpenCamera')}</span></button>
      <button type="button" class="btn-action btn-outline" data-action="upload-file">${iconSvg('upload', { size: 18 })}<span data-i18n="btnUploadFile">${t('btnUploadFile')}</span></button>
      <input type="file" class="visually-hidden" data-role="file-input" tabindex="-1" aria-hidden="true" multiple>
    </div>
    <div class="camera-area" data-role="camera-area" hidden>
      <video data-role="video" autoplay playsinline muted></video>
      <button type="button" class="btn-action btn-success" data-action="capture">${iconSvg('zap', { size: 18 })}<span data-i18n="btnCapture">${t('btnCapture')}</span></button>
    </div>
    <div class="preview-wrap" data-role="preview-wrap" hidden>
      <div class="preview-grid" data-role="preview-grid"></div>
      <div class="preview-actions">
        <button type="button" class="btn-action btn-outline" data-action="add-more">${iconSvg('upload', { size: 18 })}<span data-i18n="btnAddMore">${t('btnAddMore')}</span></button>
        <button type="button" class="btn-action btn-outline" data-action="retake">${iconSvg('refresh', { size: 18 })}<span data-i18n="btnRetake">${t('btnRetake')}</span></button>
        <button type="button" class="btn-action" data-action="analyze">${iconSvg('search', { size: 18 })}<span data-i18n="btnAnalyze">${t('btnAnalyze')}</span></button>
      </div>
    </div>
  `;
}

export function initCaptureZones(onAnalyzeRequested) {
  document.querySelectorAll('.capture-zone').forEach((zone) => {
    const mode = zone.dataset.mode;
    zone.innerHTML = captureZoneTemplate();

    const fileInput = zone.querySelector('[data-role="file-input"]');
    fileInput.accept = ACCEPTED_TYPES[mode].join(',');

    zone.querySelector('[data-action="open-camera"]').addEventListener('click', () => openCameraFor(mode, zone));
    zone.querySelector('[data-action="upload-file"]').addEventListener('click', () => fileInput.click());
    zone.querySelector('[data-action="add-more"]').addEventListener('click', () => fileInput.click());
    zone.querySelector('[data-action="capture"]').addEventListener('click', () => captureFor(mode, zone));
    zone.querySelector('[data-action="retake"]').addEventListener('click', () => resetCaptureZone(mode));
    zone.querySelector('[data-action="analyze"]').addEventListener('click', () => {
      const media = captureState[mode].media;
      if (!media.length) {
        showError(t('errNoMedia'));
        return;
      }
      onAnalyzeRequested(mode, { media });
    });
    zone.querySelector('[data-role="preview-grid"]').addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-remove-index]');
      if (!removeBtn) return;
      const index = Number(removeBtn.dataset.removeIndex);
      captureState[mode].media.splice(index, 1);
      if (captureState[mode].media.length) {
        renderPreviewGrid(mode, zone);
      } else {
        resetCaptureZone(mode);
      }
    });
    fileInput.addEventListener('change', () => handleFilesSelected(mode, zone, fileInput));
  });
}

async function handleFilesSelected(mode, zone, fileInput) {
  const incoming = Array.from(fileInput.files);
  fileInput.value = ''; // allow re-selecting the same file(s) later
  if (!incoming.length) return;

  const existing = captureState[mode].media;
  const skippedType = [];
  const skippedSize = [];
  const validFiles = [];

  for (const file of incoming) {
    try {
      camera.validateFile(file, ACCEPTED_TYPES[mode]);
      validFiles.push(file);
    } catch (err) {
      (err.code === 'FILE_TOO_LARGE' ? skippedSize : skippedType).push(file.name);
    }
  }

  // Enforce the per-analysis file-count ceiling across existing + incoming.
  const roomForCount = Math.max(MAX_FILES_PER_ANALYSIS - existing.length, 0);
  const droppedForCount = Math.max(validFiles.length - roomForCount, 0);
  const withinCount = validFiles.slice(0, roomForCount);

  // Enforce the combined byte-size ceiling across existing + incoming.
  let runningTotal = existing.reduce((sum, m) => sum + (m.byteLength || 0), 0);
  const finalFiles = [];
  let droppedForSize = 0;
  for (const file of withinCount) {
    if (runningTotal + file.size > MAX_TOTAL_INLINE_BYTES) {
      droppedForSize++;
      continue;
    }
    runningTotal += file.size;
    finalFiles.push(file);
  }

  for (const file of finalFiles) {
    try {
      const { base64, mimeType } = await camera.readFileAsBase64(file);
      existing.push({ base64, mimeType, name: file.name, byteLength: file.size });
    } catch {
      skippedType.push(file.name);
    }
  }

  if (existing.length) {
    renderPreviewGrid(mode, zone);
    setZoneVisibility(zone, { controls: false, cameraArea: false, preview: true });
  }

  const maxMb = Math.round(MAX_TOTAL_INLINE_BYTES / (1024 * 1024));
  const messages = [];
  if (skippedType.length) messages.push(t('errFilesSkippedType', { names: skippedType.join(', ') }));
  if (skippedSize.length) messages.push(t('errFilesSkippedSize', { names: skippedSize.join(', '), max: maxMb }));
  if (droppedForCount) messages.push(t('errTooManyFiles', { max: MAX_FILES_PER_ANALYSIS, count: droppedForCount }));
  if (droppedForSize) messages.push(t('errTotalTooLarge', { max: maxMb, count: droppedForSize }));
  if (messages.length) showError(messages.join('\n'));
  else clearError();
}

async function openCameraFor(mode, zone) {
  clearError();
  try {
    const video = zone.querySelector('[data-role="video"]');
    const stream = await camera.startCamera(video);
    captureState[mode].stream = stream;
    setZoneVisibility(zone, { controls: false, cameraArea: true, preview: false });
  } catch (err) {
    showError(t('errCameraDenied'));
  }
}

function captureFor(mode, zone) {
  const video = zone.querySelector('[data-role="video"]');
  const { base64, mimeType } = camera.captureFrame(video);
  stopCameraFor(mode);
  // A fresh camera shot replaces whatever was staged before — mixing a live
  // capture with previously uploaded files would be confusing to reason
  // about ("which photo is this analysis actually about?").
  captureState[mode].media = [{ base64, mimeType }];
  renderPreviewGrid(mode, zone);
  setZoneVisibility(zone, { controls: false, cameraArea: false, preview: true });
}

function stopCameraFor(mode) {
  camera.stopCamera(captureState[mode].stream);
  captureState[mode].stream = null;
}

// Called when the tab is hidden/backgrounded (see initHomeButton's sibling
// wiring in app.js) so a live camera isn't left running — and the OS
// camera-in-use indicator lit — longer than the user is actually looking
// at the preview. Browsers already tear the stream down on full page
// unload; this covers the "switched apps mid-capture" case too.
export function stopAllCameras() {
  CAPTURE_MODES.forEach((mode) => {
    if (captureState[mode].stream) stopCameraFor(mode);
  });
}

function renderPreviewGrid(mode, zone) {
  const grid = zone.querySelector('[data-role="preview-grid"]');
  grid.innerHTML = captureState[mode].media
    .map((item, index) => {
      const removeBtn = `<button type="button" class="preview-item-remove" data-remove-index="${index}" aria-label="${t('btnClear')}">${iconSvg('xMark', { size: 14 })}</button>`;
      if (item.mimeType === 'application/pdf') {
        const name = item.name || 'document.pdf';
        return `
          <div class="preview-item preview-item--file">
            ${iconSvg('fileText', { size: 22 })}
            <span class="preview-item-name">${escapeHtml(name)}</span>
            ${removeBtn}
          </div>`;
      }
      return `
        <div class="preview-item preview-item--image">
          <img src="data:${item.mimeType};base64,${item.base64}" alt="">
          ${removeBtn}
        </div>`;
    })
    .join('');
}

function setZoneVisibility(zone, { controls, cameraArea, preview }) {
  zone.querySelector('[data-role="controls"]').hidden = !controls;
  zone.querySelector('[data-role="camera-area"]').hidden = !cameraArea;
  zone.querySelector('[data-role="preview-wrap"]').hidden = !preview;
}

export function resetCaptureZone(mode) {
  stopCameraFor(mode);
  captureState[mode].media = [];
  const zone = document.querySelector(`.capture-zone[data-mode="${mode}"]`);
  if (zone) setZoneVisibility(zone, { controls: true, cameraArea: false, preview: false });
}

export function resetCaptureZoneIfApplicable(mode) {
  if (CAPTURE_MODES.includes(mode)) resetCaptureZone(mode);
}

/* ---------------------------- manual form ------------------------------ */

export function initManualForm(onAnalyzeRequested) {
  $('btn-analyze-manual').addEventListener('click', () => {
    const food = $('food-name').value.trim();
    const amount = $('food-amount').value;
    const unit = $('food-unit').value;
    if (!food) {
      showError(t('errEmptyFoodName'));
      return;
    }
    onAnalyzeRequested(MODES.FOOD_MANUAL, { food, amount, unit });
  });
}

/* ------------------------------- loading -------------------------------- */

const LOADING_KEY_BY_MODE = {
  [MODES.FOOD_SCAN]: 'loadingFood',
  [MODES.FOOD_MANUAL]: 'loadingFood',
  [MODES.PRESCRIPTION]: 'loadingPrescription',
  [MODES.LAB_REPORT]: 'loadingLab',
};

export function showLoading(mode) {
  clearError();
  clearResult();
  const el = $('loading');
  $('loading-text').textContent = t(LOADING_KEY_BY_MODE[mode] || 'loadingGeneric');
  hydrateIcons(el);
  el.hidden = false;
}

export function hideLoading() {
  $('loading').hidden = true;
}

/* -------------------------------- result --------------------------------- */

const FLAG_ICON = { normal: 'check', caution: 'alertTriangle', danger: 'xMark' };

export function renderResult(result) {
  const box = $('result-box');
  const verdict = ['green', 'yellow', 'red'].includes(result.verdict) ? result.verdict : 'yellow';
  const fallbackLabel = { green: t('verdictSafe'), yellow: t('verdictCaution'), red: t('verdictDanger') }[verdict];

  const detailsRows = (result.details || [])
    .map((d) => {
      const flag = FLAG_ICON[d.flag] ? d.flag : 'normal';
      const valueText = d.value || '';
      // A short value like "210 kcal" or "22.2 UI/L" reads well at the big
      // metric size; a full descriptive phrase like a lab reference range
      // or "500mg, 2x/day — for pain relief" does not, so it steps down to
      // a smaller size instead of rendering as an oversized, wrapped block.
      const valueClass = valueText.length > 18 ? 'detail-value detail-value--long' : 'detail-value';
      return `
        <div class="detail-row detail-row--${flag}">
          <span class="detail-flag-icon">${iconSvg(FLAG_ICON[flag], { size: 15, strokeWidth: 2.3 })}</span>
          <span class="detail-label">${escapeHtml(d.label || '')}</span>
          <span class="${valueClass}">${escapeHtml(valueText)}</span>
        </div>`;
    })
    .join('');

  box.innerHTML = `
    <div class="verdict-stamp verdict-stamp--${verdict}">${escapeHtml(result.verdictLabel || fallbackLabel)}</div>
    <p class="verdict-summary">${escapeHtml(result.summary || '')}</p>
    ${detailsRows ? `<div class="details-table"><h3 class="result-heading">${t('resultDetailsHeading')}</h3>${detailsRows}</div>` : ''}
    ${result.recommendation ? `<div class="recommendation-block"><h3 class="result-heading">${t('resultRecommendationHeading')}</h3><p>${escapeHtml(result.recommendation)}</p></div>` : ''}
    ${result.disclaimer ? `<div class="disclaimer-block"><h3 class="result-heading">${t('resultDisclaimerHeading')}</h3><p>${escapeHtml(result.disclaimer)}</p></div>` : ''}
  `;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function clearResult() {
  const box = $('result-box');
  box.hidden = true;
  box.innerHTML = '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* -------------------------------- errors --------------------------------- */

export function showError(message) {
  const el = $('error-banner');
  el.textContent = message;
  el.hidden = false;
}

export function clearError() {
  $('error-banner').hidden = true;
}

/* -------------------------------- toast ---------------------------------- */

export function showToast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('visible');
    el.hidden = true;
  }, 2400);
}

/* -------------------------------- header ---------------------------------- */

export function updateThemeButtonLabel(theme) {
  const btn = $('btn-theme');
  const nextIcon = theme === 'dark' ? 'sun' : 'moon';
  const label = theme === 'dark' ? t('themeLight') : t('themeDark');
  btn.innerHTML = iconSvg(nextIcon, { size: 18 });
  btn.setAttribute('aria-label', label);
  btn.setAttribute('title', label);
}

export function updateLangButtonLabel(lang) {
  $('btn-lang').textContent = lang === 'vi' ? 'EN' : 'VI';
}

export function bindHeaderButtons({ onToggleLang, onToggleTheme }) {
  $('btn-lang').addEventListener('click', onToggleLang);
  $('btn-theme').addEventListener('click', onToggleTheme);
  $('btn-nav-profile').addEventListener('click', openProfileModal);
  $('btn-nav-history').addEventListener('click', openHistoryModal);
  $('btn-nav-settings').addEventListener('click', openSettingsModal);
}

/* -------------------------------- modals ----------------------------------- */

function openModal(id) {
  $(id).showModal();
}
function closeModal(id) {
  $(id).close();
}

export function openProfileModal() {
  populateProfileForm(storage.getProfile());
  openModal('modal-profile');
}
export function openSettingsModal() {
  populateSettingsForm({ apiKey: storage.getApiKey(), model: storage.getModel(), responseLang: storage.getResponseLang() });
  openModal('modal-settings');
}
export function openHistoryModal() {
  renderHistoryList(storage.getHistory());
  openModal('modal-history');
}

function populateProfileForm(profile) {
  $('profile-ldl').value = profile.ldl || '';
  $('profile-hdl').value = profile.hdl || '';
  $('profile-tg').value = profile.triglycerides || '';
  $('profile-allergies').value = profile.allergies || '';
  $('profile-conditions').value = profile.conditions || '';
  $('profile-medications').value = profile.medications || '';
  $('profile-diet').value = profile.dietPattern || 'none';
}

function readProfileForm() {
  return {
    ldl: $('profile-ldl').value.trim(),
    hdl: $('profile-hdl').value.trim(),
    triglycerides: $('profile-tg').value.trim(),
    allergies: $('profile-allergies').value.trim(),
    conditions: $('profile-conditions').value.trim(),
    medications: $('profile-medications').value.trim(),
    dietPattern: $('profile-diet').value,
  };
}

function populateSettingsForm({ apiKey, model, responseLang }) {
  $('settings-api-key').value = apiKey || '';
  $('settings-model').value = model || '';
  $('settings-response-lang').value = responseLang || 'auto';
}

function readSettingsForm() {
  return {
    apiKey: $('settings-api-key').value.trim(),
    model: $('settings-model').value.trim(),
    responseLang: $('settings-response-lang').value,
  };
}

const HISTORY_LABEL_KEY = {
  [MODES.FOOD_SCAN]: 'historyEntryFood',
  [MODES.FOOD_MANUAL]: 'historyEntryManual',
  [MODES.PRESCRIPTION]: 'historyEntryPrescription',
  [MODES.LAB_REPORT]: 'historyEntryLab',
};

function renderHistoryList(entries) {
  const list = $('history-list');
  if (!entries.length) {
    list.innerHTML = `<p class="history-empty">${t('historyEmpty')}</p>`;
    return;
  }
  list.innerHTML = entries
    .map((entry) => {
      const date = new Date(entry.timestamp).toLocaleString();
      const verdict = ['green', 'yellow', 'red'].includes(entry.verdict) ? entry.verdict : 'yellow';
      return `
        <div class="history-item">
          <div class="history-item-main">
            <div>
              <div class="history-item-top">
                <span class="history-item-title">${t(HISTORY_LABEL_KEY[entry.type] || 'historyEntryFood')}</span>
                <span class="verdict-pill verdict-pill--${verdict}">${escapeHtml(entry.verdictLabel || '')}</span>
              </div>
              <div class="history-item-summary">${escapeHtml(entry.summary || '')}</div>
              <div class="history-item-date">${date}</div>
            </div>
          </div>
          <button type="button" class="btn-icon-sm" data-history-id="${entry.id}" aria-label="${t('btnDelete')}">${iconSvg('trash', { size: 16 })}</button>
        </div>`;
    })
    .join('');
}

export function initModals({ onSaveProfile, onSaveSettings, onClearKey, onDeleteHistoryEntry, onClearHistory }) {
  $('btn-close-profile').addEventListener('click', () => closeModal('modal-profile'));
  $('btn-save-profile').addEventListener('click', () => {
    onSaveProfile(readProfileForm());
    closeModal('modal-profile');
  });

  $('btn-close-settings').addEventListener('click', () => closeModal('modal-settings'));
  $('btn-save-settings').addEventListener('click', () => {
    onSaveSettings(readSettingsForm());
    closeModal('modal-settings');
  });
  $('btn-clear-key').addEventListener('click', () => {
    onClearKey();
    $('settings-api-key').value = '';
  });

  $('btn-close-history').addEventListener('click', () => closeModal('modal-history'));
  $('btn-clear-history').addEventListener('click', () => {
    if (confirm(t('historyClearConfirm'))) {
      onClearHistory();
      renderHistoryList([]);
    }
  });
  $('history-list').addEventListener('click', (evt) => {
    const btn = evt.target.closest('[data-history-id]');
    if (!btn) return;
    const updated = onDeleteHistoryEntry(btn.dataset.historyId);
    renderHistoryList(updated);
  });
}
