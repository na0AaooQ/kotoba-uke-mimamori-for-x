'use strict';

const OPTION_ELEMENTS = Object.freeze({
  enabledCheckbox: 'option-enabled',
  statusMessage: 'options-status'
});

function initializeOptionsPage(
  currentDocument = globalThis.document,
  settingsApi = getSettingsApi()
) {
  if (!currentDocument) {
    return Promise.resolve(false);
  }

  applyLocalizedMessages(currentDocument);

  const elements = getOptionElements(currentDocument);

  if (!elements.enabledCheckbox || !elements.statusMessage) {
    return Promise.resolve(false);
  }

  return settingsApi
    .loadSettings()
    .then((settings) => {
      elements.enabledCheckbox.checked = Boolean(settings.enabled);
      elements.enabledCheckbox.addEventListener('change', () => {
        saveEnabledSetting(elements, settingsApi);
      });

      return true;
    })
    .catch(() => {
      setStatusMessage(elements.statusMessage, 'optionSaveError', true);

      return false;
    });
}

function applyLocalizedMessages(currentDocument = globalThis.document) {
  if (!currentDocument || typeof currentDocument.querySelectorAll !== 'function') {
    return;
  }

  if ('title' in currentDocument) {
    currentDocument.title = getLocalizedMessage('optionsTitle');
  }

  for (const element of currentDocument.querySelectorAll('[data-i18n]')) {
    const messageKey = element.getAttribute('data-i18n');

    if (messageKey) {
      element.textContent = getLocalizedMessage(messageKey);
    }
  }
}

function getOptionElements(currentDocument) {
  return {
    enabledCheckbox: currentDocument.getElementById(OPTION_ELEMENTS.enabledCheckbox),
    statusMessage: currentDocument.getElementById(OPTION_ELEMENTS.statusMessage)
  };
}

async function saveEnabledSetting(elements, settingsApi = getSettingsApi()) {
  try {
    const settings = await settingsApi.saveSettings({
      enabled: Boolean(elements.enabledCheckbox.checked)
    });

    elements.enabledCheckbox.checked = settings.enabled;
    setStatusMessage(elements.statusMessage, 'optionSaved', false);

    return settings;
  } catch (_error) {
    setStatusMessage(elements.statusMessage, 'optionSaveError', true);

    return null;
  }
}

function setStatusMessage(statusMessage, messageKey, isError) {
  statusMessage.textContent = getLocalizedMessage(messageKey);
  statusMessage.dataset.state = isError ? 'error' : 'saved';
}

function getSettingsApi() {
  const settingsApi = globalThis.kotobaUkeMimamoriSettings;

  if (
    settingsApi &&
    typeof settingsApi.loadSettings === 'function' &&
    typeof settingsApi.saveSettings === 'function'
  ) {
    return settingsApi;
  }

  return {
    loadSettings: async () => ({ enabled: false }),
    saveSettings: async (settings) => ({ enabled: Boolean(settings?.enabled) })
  };
}

function getLocalizedMessage(key) {
  const i18n = globalThis.kotobaUkeMimamoriI18n;

  if (typeof i18n?.getMessage === 'function') {
    return i18n.getMessage(key);
  }

  return key;
}

if (globalThis.document) {
  if (globalThis.document.readyState === 'loading') {
    globalThis.document.addEventListener('DOMContentLoaded', () => {
      initializeOptionsPage();
    });
  } else {
    initializeOptionsPage();
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    applyLocalizedMessages,
    getOptionElements,
    initializeOptionsPage,
    saveEnabledSetting,
    setStatusMessage
  };
}
