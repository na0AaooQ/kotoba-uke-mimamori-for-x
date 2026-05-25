'use strict';

const OPTION_ELEMENTS = Object.freeze({
  enabledCheckbox: 'option-enabled',
  sensitivityInputSelector: 'input[name="option-cushion-sensitivity"]',
  statusMessage: 'options-status'
});

const DEFAULT_CUSHION_SENSITIVITY = 'standard';

function initializeOptionsPage(
  currentDocument = globalThis.document,
  settingsApi = getSettingsApi()
) {
  if (!currentDocument) {
    return Promise.resolve(false);
  }

  applyLocalizedMessages(currentDocument);

  const elements = getOptionElements(currentDocument);

  if (
    !elements.enabledCheckbox ||
    elements.sensitivityInputs.length === 0 ||
    !elements.statusMessage
  ) {
    return Promise.resolve(false);
  }

  return settingsApi
    .loadSettings()
    .then((settings) => {
      applySettingsToElements(elements, settings);
      elements.enabledCheckbox.addEventListener('change', () => {
        saveOptionSettings(elements, settingsApi);
      });
      for (const sensitivityInput of elements.sensitivityInputs) {
        sensitivityInput.addEventListener('change', () => {
          saveOptionSettings(elements, settingsApi);
        });
      }

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
    sensitivityInputs: Array.from(
      currentDocument.querySelectorAll(OPTION_ELEMENTS.sensitivityInputSelector)
    ),
    statusMessage: currentDocument.getElementById(OPTION_ELEMENTS.statusMessage)
  };
}

function applySettingsToElements(elements, settings) {
  const cushionSensitivity = getCushionSensitivity(settings);

  elements.enabledCheckbox.checked = Boolean(settings?.enabled);

  for (const sensitivityInput of elements.sensitivityInputs) {
    sensitivityInput.checked = sensitivityInput.value === cushionSensitivity;
  }
}

async function saveOptionSettings(elements, settingsApi = getSettingsApi()) {
  try {
    const settings = await settingsApi.saveSettings({
      enabled: Boolean(elements.enabledCheckbox.checked),
      cushionSensitivity: getSelectedCushionSensitivity(elements.sensitivityInputs)
    });

    applySettingsToElements(elements, settings);
    setStatusMessage(elements.statusMessage, 'optionSaved', false);

    return settings;
  } catch (_error) {
    setStatusMessage(elements.statusMessage, 'optionSaveError', true);

    return null;
  }
}

function getSelectedCushionSensitivity(sensitivityInputs) {
  const selectedInput = sensitivityInputs.find((sensitivityInput) => sensitivityInput.checked);

  return selectedInput?.value ?? DEFAULT_CUSHION_SENSITIVITY;
}

function getCushionSensitivity(settings) {
  const cushionSensitivity = settings?.cushionSensitivity;

  if (cushionSensitivity === 'low' || cushionSensitivity === 'high') {
    return cushionSensitivity;
  }

  return DEFAULT_CUSHION_SENSITIVITY;
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
    loadSettings: async () => ({
      enabled: false,
      cushionSensitivity: DEFAULT_CUSHION_SENSITIVITY
    }),
    saveSettings: async (settings) => ({
      enabled: Boolean(settings?.enabled),
      cushionSensitivity: getCushionSensitivity(settings)
    })
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
    applySettingsToElements,
    getSelectedCushionSensitivity,
    getOptionElements,
    initializeOptionsPage,
    saveOptionSettings,
    setStatusMessage
  };
}
