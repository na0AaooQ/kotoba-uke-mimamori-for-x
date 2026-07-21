'use strict';

const POPUP_ELEMENTS = Object.freeze({
  enabledCheckbox: 'popup-enabled',
  uiLanguageSelect: 'popup-ui-language',
  sensitivityInputSelector: 'input[name="popup-cushion-sensitivity"]',
  statusValue: 'popup-status-value',
  versionLabel: 'popup-version',
  saveStatus: 'popup-save-status',
  openOptionsButton: 'popup-open-options'
});

const DEFAULT_CUSHION_SENSITIVITY = 'standard';
const DEFAULT_UI_LANGUAGE = 'auto';

function initializePopup(
  currentDocument = globalThis.document,
  settingsApi = getSettingsApi(),
  runtimeApi = globalThis.chrome?.runtime
) {
  if (!currentDocument) {
    return Promise.resolve(false);
  }

  applyExtensionVersion(currentDocument, runtimeApi);

  const elements = getPopupElements(currentDocument);

  if (
    !elements.enabledCheckbox ||
    !elements.uiLanguageSelect ||
    elements.sensitivityInputs.length === 0 ||
    !elements.statusValue ||
    !elements.saveStatus ||
    !elements.openOptionsButton
  ) {
    return Promise.resolve(false);
  }

  return settingsApi
    .loadSettings()
    .then(async (settings) => {
      await applyPopupSettings(currentDocument, elements, settings, runtimeApi);
      elements.enabledCheckbox.addEventListener('change', () => {
        savePopupSettings(elements, settingsApi, currentDocument, runtimeApi);
      });
      elements.uiLanguageSelect.addEventListener('change', () => {
        savePopupSettings(elements, settingsApi, currentDocument, runtimeApi);
      });
      for (const sensitivityInput of elements.sensitivityInputs) {
        sensitivityInput.addEventListener('change', () => {
          savePopupSettings(elements, settingsApi, currentDocument, runtimeApi);
        });
      }
      elements.openOptionsButton.addEventListener('click', () => {
        openDetailedSettings(runtimeApi);
      });

      return true;
    })
    .catch(() => {
      applyLocalizedMessages(currentDocument);
      setSaveStatus(elements.saveStatus, 'optionSaveError', true);

      return false;
    });
}

async function applyPopupSettings(currentDocument, elements, settings, runtimeApi) {
  const { localeMessages, resolvedLanguage } = await getLocaleMessagesForSettings(
    settings,
    runtimeApi
  );

  applyLocalizedMessages(currentDocument, localeMessages);
  applyDocumentLanguage(currentDocument, resolvedLanguage);
  applySettingsToElements(elements, settings, localeMessages);

  return { localeMessages, resolvedLanguage };
}

function applyLocalizedMessages(currentDocument = globalThis.document, localeMessages) {
  if (!currentDocument || typeof currentDocument.querySelectorAll !== 'function') {
    return;
  }

  if ('title' in currentDocument) {
    currentDocument.title = getLocalizedMessage('popupTitle', localeMessages);
  }

  for (const element of currentDocument.querySelectorAll('[data-i18n]')) {
    const messageKey = element.getAttribute('data-i18n');

    if (messageKey) {
      element.textContent = getLocalizedMessage(messageKey, localeMessages);
    }
  }
}

function applyDocumentLanguage(currentDocument, resolvedLanguage) {
  if (currentDocument?.documentElement) {
    currentDocument.documentElement.lang = resolvedLanguage;
  }
}

function getPopupElements(currentDocument) {
  return {
    enabledCheckbox: currentDocument.getElementById(POPUP_ELEMENTS.enabledCheckbox),
    uiLanguageSelect: currentDocument.getElementById(POPUP_ELEMENTS.uiLanguageSelect),
    sensitivityInputs: Array.from(
      currentDocument.querySelectorAll(POPUP_ELEMENTS.sensitivityInputSelector)
    ),
    statusValue: currentDocument.getElementById(POPUP_ELEMENTS.statusValue),
    versionLabel: currentDocument.getElementById(POPUP_ELEMENTS.versionLabel),
    saveStatus: currentDocument.getElementById(POPUP_ELEMENTS.saveStatus),
    openOptionsButton: currentDocument.getElementById(POPUP_ELEMENTS.openOptionsButton)
  };
}

function applyExtensionVersion(
  currentDocument = globalThis.document,
  runtimeApi = globalThis.chrome?.runtime
) {
  const versionLabel = currentDocument?.getElementById?.(POPUP_ELEMENTS.versionLabel);

  if (!versionLabel) {
    return '';
  }

  const version = getExtensionVersion(runtimeApi);

  versionLabel.textContent = version ? `v${version}` : '';

  return version;
}

function applySettingsToElements(elements, settings, localeMessages) {
  const isEnabled = Boolean(settings?.enabled);
  const cushionSensitivity = getCushionSensitivity(settings);

  elements.enabledCheckbox.checked = isEnabled;
  elements.uiLanguageSelect.value = getUiLanguage(settings);
  elements.statusValue.textContent = getLocalizedMessage(
    isEnabled ? 'popupStatusOn' : 'popupStatusOff',
    localeMessages
  );
  elements.statusValue.dataset.state = isEnabled ? 'on' : 'off';

  for (const sensitivityInput of elements.sensitivityInputs) {
    sensitivityInput.checked = sensitivityInput.value === cushionSensitivity;
  }
}

async function savePopupSettings(
  elements,
  settingsApi = getSettingsApi(),
  currentDocument = globalThis.document,
  runtimeApi = globalThis.chrome?.runtime
) {
  try {
    const settings = await settingsApi.saveSettings({
      enabled: Boolean(elements.enabledCheckbox.checked),
      cushionSensitivity: getSelectedCushionSensitivity(elements.sensitivityInputs),
      uiLanguage: getSelectedUiLanguage(elements.uiLanguageSelect)
    });
    const { localeMessages } = await applyPopupSettings(
      currentDocument,
      elements,
      settings,
      runtimeApi
    );

    setSaveStatus(elements.saveStatus, 'optionSaved', false, localeMessages);

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

function getSelectedUiLanguage(uiLanguageSelect) {
  return getUiLanguage({ uiLanguage: uiLanguageSelect?.value });
}

function getUiLanguage(settings) {
  const uiLanguage = settings?.uiLanguage;

  if (uiLanguage === 'ja' || uiLanguage === 'en') {
    return uiLanguage;
  }

  return DEFAULT_UI_LANGUAGE;
}

async function getLocaleMessagesForSettings(settings, runtimeApi) {
  const i18n = getI18nApi();
  const resolvedLanguage =
    typeof i18n.resolveUiLanguage === 'function'
      ? i18n.resolveUiLanguage(getUiLanguage(settings))
      : 'en';
  const localeMessages =
    typeof i18n.loadLocaleMessages === 'function'
      ? await i18n.loadLocaleMessages(resolvedLanguage, runtimeApi)
      : {};

  return { localeMessages, resolvedLanguage };
}

function setSaveStatus(saveStatus, messageKey, isError, localeMessages) {
  saveStatus.textContent = getLocalizedMessage(messageKey, localeMessages);
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
      cushionSensitivity: DEFAULT_CUSHION_SENSITIVITY,
      uiLanguage: DEFAULT_UI_LANGUAGE
    }),
    saveSettings: async (settings) => ({
      enabled: Boolean(settings?.enabled),
      cushionSensitivity: getCushionSensitivity(settings),
      uiLanguage: getUiLanguage(settings)
    })
  };
}

function getI18nApi() {
  return globalThis.kotobaUkeMimamoriI18n ?? {};
}

function getLocalizedMessage(key, localeMessages) {
  const i18n = getI18nApi();
  const localeMessage =
    typeof i18n.getLocaleMessage === 'function' ? i18n.getLocaleMessage(localeMessages, key) : '';

  if (localeMessage) {
    return localeMessage;
  }

  if (typeof i18n.getMessage === 'function') {
    return i18n.getMessage(key);
  }

  return key;
}

function getExtensionVersion(runtimeApi = globalThis.chrome?.runtime) {
  if (typeof runtimeApi?.getManifest !== 'function') {
    return '';
  }

  try {
    return String(runtimeApi.getManifest()?.version ?? '');
  } catch (_error) {
    return '';
  }
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
    applyDocumentLanguage,
    applyExtensionVersion,
    applyLocalizedMessages,
    applyPopupSettings,
    applySettingsToElements,
    getExtensionVersion,
    getPopupElements,
    getSelectedUiLanguage,
    initializePopup,
    openDetailedSettings,
    savePopupSettings,
    setSaveStatus
  };
}
