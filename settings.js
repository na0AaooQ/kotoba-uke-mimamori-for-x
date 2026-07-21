'use strict';

const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  cushionSensitivity: 'standard',
  uiLanguage: 'auto'
});

const CUSHION_SENSITIVITY_VALUES = Object.freeze(['low', 'standard', 'high']);
const SETTINGS_UI_LANGUAGE_VALUES = Object.freeze(['auto', 'ja', 'en']);

function normalizeSettings(rawSettings = {}) {
  const settings = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};

  return {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_SETTINGS.enabled,
    cushionSensitivity: CUSHION_SENSITIVITY_VALUES.includes(settings.cushionSensitivity)
      ? settings.cushionSensitivity
      : DEFAULT_SETTINGS.cushionSensitivity,
    uiLanguage: SETTINGS_UI_LANGUAGE_VALUES.includes(settings.uiLanguage)
      ? settings.uiLanguage
      : DEFAULT_SETTINGS.uiLanguage
  };
}

async function loadSettings() {
  const storageLocal = getChromeStorageLocal();

  if (!storageLocal || typeof storageLocal.get !== 'function') {
    return normalizeSettings();
  }

  try {
    const rawSettings = await storageLocal.get(DEFAULT_SETTINGS);

    return normalizeSettings(rawSettings);
  } catch (_error) {
    return normalizeSettings();
  }
}

async function saveSettings(settings) {
  const normalizedSettings = normalizeSettings(settings);
  const storageLocal = getChromeStorageLocal();

  if (!storageLocal || typeof storageLocal.set !== 'function') {
    return normalizedSettings;
  }

  await storageLocal.set(normalizedSettings);

  return normalizedSettings;
}

function getChromeStorageLocal() {
  return globalThis.chrome?.storage?.local ?? null;
}

const kotobaUkeMimamoriSettings = Object.freeze({
  DEFAULT_SETTINGS,
  loadSettings,
  normalizeSettings,
  saveSettings
});

globalThis.kotobaUkeMimamoriSettings = kotobaUkeMimamoriSettings;

if (typeof module !== 'undefined') {
  module.exports = {
    DEFAULT_SETTINGS,
    loadSettings,
    normalizeSettings,
    saveSettings
  };
}
