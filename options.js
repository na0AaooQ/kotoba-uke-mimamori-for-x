'use strict';

const OPTION_ELEMENTS = Object.freeze({
  enabledCheckbox: 'option-enabled',
  uiLanguageSelect: 'option-ui-language',
  sensitivityInputSelector: 'input[name="option-cushion-sensitivity"]',
  versionLabel: 'options-version',
  statusMessage: 'options-status'
});

const DEFAULT_CUSHION_SENSITIVITY = 'standard';
const DEFAULT_UI_LANGUAGE = 'auto';

function initializeOptionsPage(
  currentDocument = globalThis.document,
  settingsApi = getSettingsApi(),
  runtimeApi = globalThis.chrome?.runtime
) {
  if (!currentDocument) {
    return Promise.resolve(false);
  }

  applyExtensionVersion(currentDocument, runtimeApi);

  const elements = getOptionElements(currentDocument);

  if (
    !elements.enabledCheckbox ||
    !elements.uiLanguageSelect ||
    elements.sensitivityInputs.length === 0 ||
    !elements.statusMessage
  ) {
    return Promise.resolve(false);
  }

  return settingsApi
    .loadSettings()
    .then(async (settings) => {
      await applyOptionsSettings(currentDocument, elements, settings, runtimeApi);
      elements.enabledCheckbox.addEventListener('change', () => {
        saveOptionSettings(elements, settingsApi, currentDocument, runtimeApi);
      });
      elements.uiLanguageSelect.addEventListener('change', () => {
        saveOptionSettings(elements, settingsApi, currentDocument, runtimeApi);
      });
      for (const sensitivityInput of elements.sensitivityInputs) {
        sensitivityInput.addEventListener('change', () => {
          saveOptionSettings(elements, settingsApi, currentDocument, runtimeApi);
        });
      }

      return true;
    })
    .catch(() => {
      applyLocalizedMessages(currentDocument);
      setStatusMessage(elements.statusMessage, 'optionSaveError', true);

      return false;
    });
}

async function applyOptionsSettings(currentDocument, elements, settings, runtimeApi) {
  const { localeMessages, resolvedLanguage } = await getLocaleMessagesForSettings(
    settings,
    runtimeApi
  );

  applyLocalizedMessages(currentDocument, localeMessages);
  applyDocumentLanguage(currentDocument, resolvedLanguage);
  applySettingsToElements(elements, settings);

  return { localeMessages, resolvedLanguage };
}

function applyLocalizedMessages(currentDocument = globalThis.document, localeMessages) {
  if (!currentDocument || typeof currentDocument.querySelectorAll !== 'function') {
    return;
  }

  if ('title' in currentDocument) {
    currentDocument.title = getLocalizedMessage('optionsTitle', localeMessages);
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

function getOptionElements(currentDocument) {
  return {
    enabledCheckbox: currentDocument.getElementById(OPTION_ELEMENTS.enabledCheckbox),
    uiLanguageSelect: currentDocument.getElementById(OPTION_ELEMENTS.uiLanguageSelect),
    sensitivityInputs: Array.from(
      currentDocument.querySelectorAll(OPTION_ELEMENTS.sensitivityInputSelector)
    ),
    versionLabel: currentDocument.getElementById(OPTION_ELEMENTS.versionLabel),
    statusMessage: currentDocument.getElementById(OPTION_ELEMENTS.statusMessage)
  };
}

function applyExtensionVersion(
  currentDocument = globalThis.document,
  runtimeApi = globalThis.chrome?.runtime
) {
  const versionLabel = currentDocument?.getElementById?.(OPTION_ELEMENTS.versionLabel);

  if (!versionLabel) {
    return '';
  }

  const version = getExtensionVersion(runtimeApi);

  versionLabel.textContent = version ? `v${version}` : '';

  return version;
}

function applySettingsToElements(elements, settings) {
  const cushionSensitivity = getCushionSensitivity(settings);

  elements.enabledCheckbox.checked = Boolean(settings?.enabled);
  elements.uiLanguageSelect.value = getUiLanguage(settings);

  for (const sensitivityInput of elements.sensitivityInputs) {
    sensitivityInput.checked = sensitivityInput.value === cushionSensitivity;
  }
}

async function saveOptionSettings(
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
    const { localeMessages } = await applyOptionsSettings(
      currentDocument,
      elements,
      settings,
      runtimeApi
    );

    setStatusMessage(elements.statusMessage, 'optionSaved', false, localeMessages);

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

function setStatusMessage(statusMessage, messageKey, isError, localeMessages) {
  statusMessage.textContent = getLocalizedMessage(messageKey, localeMessages);
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
      initializeOptionsPage();
    });
  } else {
    initializeOptionsPage();
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    applyDocumentLanguage,
    applyExtensionVersion,
    applyLocalizedMessages,
    applyOptionsSettings,
    applySettingsToElements,
    getExtensionVersion,
    getOptionElements,
    getSelectedUiLanguage,
    initializeOptionsPage,
    saveOptionSettings,
    setStatusMessage
  };
}
