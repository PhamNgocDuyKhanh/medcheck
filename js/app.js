/**
 * app.js
 * Entry point. Wires every module together and holds the one piece of real
 * "business logic" — handleAnalyze() — which reads local state, builds a
 * prompt, calls Gemini, and hands the result back to ui.js to render.
 *
 * Loaded as <script type="module"> — no build step, no bundler, just the
 * browser's native ES module resolution.
 */

import { MODES } from './config.js';
import * as storage from './storage.js';
import * as i18n from './i18n.js';
import * as theme from './theme.js';
import * as ui from './ui.js';
import { analyzeWithGemini } from './gemini-api.js';

function refreshStaticText() {
  i18n.applyTranslations(document);
  ui.updateThemeButtonLabel(theme.getCurrentTheme());
  ui.updateLangButtonLabel(i18n.getCurrentLang());
}

function buildPromptParams(mode, payload, profile) {
  if (mode === MODES.FOOD_MANUAL) {
    return { food: payload.food, amount: payload.amount, unit: payload.unit, ldl: profile.ldl, profile };
  }
  if (mode === MODES.FOOD_SCAN) {
    return { ldl: profile.ldl, profile };
  }
  return { profile }; // prescription, lab-report
}

function mapErrorToMessage(err) {
  switch (err.code) {
    case 'NO_KEY':
      return i18n.t('errNoApiKey');
    case 'ALL_MODELS_EXHAUSTED':
      // Every model in the fallback chain (config.js FALLBACK_MODELS) hit a
      // 429/503-class error even after retrying with backoff - this is a
      // capacity/quota issue, not a bad request, so give a distinct message
      // instead of the generic one.
      return i18n.t('errAllModelsExhausted');
    case 'NETWORK':
    case 'API_ERROR':
    case 'BAD_RESPONSE':
      return i18n.t('errApiWithMessage', { message: err.message });
    default:
      return i18n.t('errApiGeneric');
  }
}

// Turns a gemini-api.js onStatusUpdate event into a live status-badge
// update (see ui.setAnalyzeStatus) so retries and model fallbacks are shown
// as calm, informative states rather than looking like a stuck spinner or
// a hard error mid-scan.
function handleAnalyzeStatusUpdate(status) {
  if (status.type === 'retry') {
    ui.setAnalyzeStatus({
      state: 'retrying',
      text: i18n.t('statusRetrying', { attempt: status.attempt, max: status.maxRetries }),
    });
  } else if (status.type === 'fallback') {
    ui.setAnalyzeStatus({ state: 'fallback', text: i18n.t('statusFallback', { model: status.model }) });
  }
}

async function handleAnalyze(mode, payload) {
  const apiKey = storage.getApiKey();
  if (!apiKey) {
    ui.showError(i18n.t('errNoApiKey'));
    ui.openSettingsModal();
    return;
  }

  const model = storage.getModel();
  const profile = storage.getProfile();
  const storedResponseLang = storage.getResponseLang();
  const responseLang = storedResponseLang === 'auto' ? i18n.getCurrentLang() : storedResponseLang;
  const promptText = i18n.buildPrompt(mode, buildPromptParams(mode, payload, profile), responseLang);

  ui.showLoading(mode);
  try {
    const result = await analyzeWithGemini({
      apiKey,
      model,
      promptText,
      media: payload.media || null,
      onStatusUpdate: handleAnalyzeStatusUpdate,
    });

    ui.hideLoading();
    ui.setAnalyzeStatus({ state: 'success', text: i18n.t('statusSuccess') });
    ui.renderResult(result);

    storage.addHistoryEntry({
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
      type: mode,
      timestamp: Date.now(),
      verdict: result.verdict,
      verdictLabel: result.verdictLabel,
      summary: result.summary,
    });

    ui.resetCaptureZoneIfApplicable(mode);
  } catch (err) {
    ui.hideLoading();
    ui.setAnalyzeStatus({ state: 'failed', text: i18n.t('statusFailed') });
    ui.showError(mapErrorToMessage(err));
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Relative path so this also works if the app is served from a GitHub
  // Pages project subpath (e.g. username.github.io/medcheck/).
  const swUrl = new URL('service-worker.js', document.baseURI);
  navigator.serviceWorker.register(swUrl).catch((err) => {
    console.warn('[app] service worker registration failed', err);
  });
}

function bindLifecycleCleanup() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') ui.stopAllCameras();
  });
}

function init() {
  i18n.initI18n();
  theme.initTheme();
  refreshStaticText();
  ui.initStaticIcons();

  ui.initTabs();
  ui.initHomeButton();
  ui.initNumberSteppers();
  ui.initCaptureZones(handleAnalyze);
  ui.initManualForm(handleAnalyze);

  ui.bindHeaderButtons({
    onToggleLang: () => {
      i18n.setCurrentLang(i18n.getCurrentLang() === 'vi' ? 'en' : 'vi');
      refreshStaticText();
    },
    onToggleTheme: () => {
      theme.toggleTheme();
      ui.updateThemeButtonLabel(theme.getCurrentTheme());
    },
  });

  ui.initModals({
    onSaveProfile: (profile) => {
      storage.setProfile(profile);
      ui.showToast(i18n.t('profileSavedToast'));
    },
    onSaveSettings: ({ apiKey, model, responseLang }) => {
      storage.setApiKey(apiKey);
      storage.setModel(model);
      storage.setResponseLang(responseLang);
      ui.showToast(i18n.t('settingsSavedToast'));
    },
    onClearKey: () => storage.clearApiKey(),
    onDeleteHistoryEntry: (id) => storage.deleteHistoryEntry(id),
    onClearHistory: () => storage.clearHistory(),
  });

  registerServiceWorker();
  bindLifecycleCleanup();
}

document.addEventListener('DOMContentLoaded', init);
