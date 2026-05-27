'use strict';

const POPUP_ELEMENTS = Object.freeze({
  enabledCheckbox: 'popup-enabled',
  sensitivityInputSelector: 'input[name="popup-cushion-sensitivity"]',
  statusValue: 'popup-status-value',
  saveStatus: 'popup-save-status',
  openOptionsButton: 'popup-open-options'
});

const DEFAULT_CUSHION_SENSITIVITY = 'standard';

function initializePopup(
  currentDocument = globalThis.document,
  settingsApi = getSettingsApi(),
  runtimeApi = globalThis.chrome?.runtime
) {
  if (!currentDocument) {
    return Promise.resolve(false);
  }

  applyLocalizedMessages(currentDocument);

  const elements = getPopupElements(currentDocument);

  if (
    !elements.enabledCheckbox ||
    elements.sensitivityInputs.length === 0 ||
    !elements.statusValue ||
    !elements.saveStatus ||
    !elements.openOptionsButton
  ) {
    return Promise.resolve(false);
  }

  return settingsApi
    .loadSettings()
    .then((settings) => {
      applySettingsToElements(elements, settings);
      elements.enabledCheckbox.addEventListener('change', () => {
        savePopupSettings(elements, settingsApi);
      });
      for (const sensitivityInput of elements.sensitivityInputs) {
        sensitivityInput.addEventListener('change', () => {
          savePopupSettings(elements, settingsApi);
        });
      }
      elements.openOptionsButton.addEventListener('click', () => {
        openDetailedSettings(runtimeApi);
      });

      return true;
    })
    .catch(() => {
      setSaveStatus(elements.saveStatus, 'optionSaveError', true);

      return false;
    });
}

function applyLocalizedMessages(currentDocument = globalThis.document) {
  if (!currentDocument || typeof currentDocument.querySelectorAll !== 'function') {
    return;
  }

  if ('title' in currentDocument) {
    currentDocument.title = getLocalizedMessage('popupTitle');
  }

  for (const element of currentDocument.querySelectorAll('[data-i18n]')) {
    const messageKey = element.getAttribute('data-i18n');

    if (messageKey) {
      element.textContent = getLocalizedMessage(messageKey);
    }
  }
}

function getPopupElements(currentDocument) {
  return {
    enabledCheckbox: currentDocument.getElementById(POPUP_ELEMENTS.enabledCheckbox),
    sensitivityInputs: Array.from(
      currentDocument.querySelectorAll(POPUP_ELEMENTS.sensitivityInputSelector)
    ),
    statusValue: currentDocument.getElementById(POPUP_ELEMENTS.statusValue),
    saveStatus: currentDocument.getElementById(POPUP_ELEMENTS.saveStatus),
    openOptionsButton: currentDocument.getElementById(POPUP_ELEMENTS.openOptionsButton)
  };
}

function applySettingsToElements(elements, settings) {
  const isEnabled = Boolean(settings?.enabled);
  const cushionSensitivity = getCushionSensitivity(settings);

  elements.enabledCheckbox.checked = isEnabled;
  elements.statusValue.textContent = getLocalizedMessage(
    isEnabled ? 'popupStatusOn' : 'popupStatusOff'
  );
  elements.statusValue.dataset.state = isEnabled ? 'on' : 'off';

  for (const sensitivityInput of elements.sensitivityInputs) {
    sensitivityInput.checked = sensitivityInput.value === cushionSensitivity;
  }
}

async function savePopupSettings(elements, settingsApi = getSettingsApi()) {
  try {
    const settings = await settingsApi.saveSettings({
      enabled: Boolean(elements.enabledCheckbox.checked),
      cushionSensitivity: getSelectedCushionSensitivity(elements.sensitivityInputs)
    });

    applySettingsToElements(elements, settings);
    setSaveStatus(elements.saveStatus, 'optionSaved', false);

    return settings;
  } catch (_error) {
    setSaveStatus(elements.saveStatus, 'optionSaveError', true);

    return null;
  }
}

async function openDetailedSettings(runtimeApi = globalThis.chrome?.runtime) {
  if (typeof runtimeApi?.openOptionsPage !== 'function') {
    return false;
  }

  try {
    await runtimeApi.openOptionsPage();

    return true;
  } catch (_error) {
    return false;
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

function setSaveStatus(saveStatus, messageKey, isError) {
  saveStatus.textContent = getLocalizedMessage(messageKey);
  saveStatus.dataset.state = isError ? 'error' : 'saved';
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
      initializePopup();
    });
  } else {
    initializePopup();
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    applyLocalizedMessages,
    applySettingsToElements,
    getPopupElements,
    initializePopup,
    openDetailedSettings,
    savePopupSettings,
    setSaveStatus
  };
}
