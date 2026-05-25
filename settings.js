'use strict';

const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  cushionSensitivity: 'standard'
});

const CUSHION_SENSITIVITY_VALUES = Object.freeze(['low', 'standard', 'high']);

function normalizeSettings(rawSettings = {}) {
  const settings = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};

  return {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_SETTINGS.enabled,
    cushionSensitivity: CUSHION_SENSITIVITY_VALUES.includes(settings.cushionSensitivity)
      ? settings.cushionSensitivity
      : DEFAULT_SETTINGS.cushionSensitivity
  };
}

async function loadSettings() {
  const storageLocal = getChromeStorageLocal();

  if (!storageLocal || typeof storageLocal.get !== 'function') {
    return normalizeSettings();
  }

  try {
    const rawSettings = await getStorageValues(storageLocal, DEFAULT_SETTINGS);

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

  await setStorageValues(storageLocal, normalizedSettings);

  return normalizedSettings;
}

function getChromeStorageLocal() {
  return globalThis.chrome?.storage?.local ?? null;
}

function getStorageValues(storageLocal, defaults) {
  return new Promise((resolve, reject) => {
    const finish = createStorageCallback(resolve, reject);

    try {
      const result = storageLocal.get(defaults, finish);

      if (isPromiseLike(result)) {
        result.then(finish, reject);
      } else if (result !== undefined) {
        finish(result);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function setStorageValues(storageLocal, settings) {
  return new Promise((resolve, reject) => {
    const finish = createStorageCallback(() => resolve(), reject);

    try {
      const result = storageLocal.set(settings, finish);

      if (isPromiseLike(result)) {
        result.then(finish, reject);
      } else if (result !== undefined) {
        finish();
      }
    } catch (error) {
      reject(error);
    }
  });
}

function createStorageCallback(resolve, reject) {
  let isSettled = false;

  return (value) => {
    if (isSettled) {
      return;
    }

    isSettled = true;

    const lastError = globalThis.chrome?.runtime?.lastError;

    if (lastError) {
      reject(new Error(lastError.message || 'Chrome storage operation failed.'));
      return;
    }

    resolve(value);
  };
}

function isPromiseLike(value) {
  return Boolean(value && typeof value.then === 'function');
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
