'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  applyExtensionVersion,
  applyLocalizedMessages,
  applyPopupSettings,
  getExtensionVersion,
  initializePopup,
  openDetailedSettings,
  savePopupSettings
} = require('../popup');

const MESSAGES = Object.freeze({
  popupTitle: 'ことばうけみまもり',
  popupTagline: 'Xことばに心のワンクッション',
  popupStatusLabel: '状態',
  popupStatusOn: 'ON',
  popupStatusOff: 'OFF',
  popupOpenOptions: '詳細設定を開く',
  optionEnableExtension: 'ことばうけみまもりを有効にする',
  optionDisplayLanguage: '表示言語',
  optionLanguageAuto: '自動',
  optionLanguageJapanese: '日本語',
  optionLanguageEnglish: 'English',
  optionCushionSensitivity: 'ワンクッションの表示されやすさ',
  optionSensitivityLow: '少なめ',
  optionSensitivityLowSummary: '少なめ: 強い表現を中心に表示します。',
  optionSensitivityStandard: '標準',
  optionSensitivityStandardSummary: '標準: 通常の設定です。',
  optionSensitivityHigh: '多め',
  optionSensitivityHighSummary: '多め: 少し軽めのリスク表現にも表示されやすくします。',
  optionPrivacyNote: '投稿本文や判定結果は外部送信されません。',
  optionReloadNote:
    'ON/OFFや表示されやすさの変更は、開いているXのページを再読み込みすると反映されます。',
  optionSaved: '設定を保存しました。',
  optionSaveError: '設定の保存に失敗しました。'
});

async function runTests() {
  testPopupHtmlContainsRequiredControlsOnly();
  await testApplyLocalizedMessages();
  testApplyExtensionVersion();
  testGetExtensionVersionFallsBackWhenUnavailable();
  await testInitializePopupLoadsCurrentState();
  await testSavePopupSettingsStoresAllowedSettingsOnly();
  await testSavePopupSettingsPersistsEnabledStateForTheNextPopup();
  await testLanguageChangeUpdatesPopupImmediatelyAndKeepsOtherSettings();
  await testSavePopupSettingsShowsErrorMessage();
  await testOpenDetailedSettingsUsesChromeRuntime();

  console.log('All popup tests passed.');
}

function testPopupHtmlContainsRequiredControlsOnly() {
  const popupHtml = fs.readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8');

  assert.match(popupHtml, /id="popup-enabled"/);
  assert.match(popupHtml, /id="popup-ui-language"/);
  assert.match(popupHtml, /for="popup-ui-language"/);
  assert.match(popupHtml, /value="auto"/);
  assert.match(popupHtml, /value="ja"/);
  assert.match(popupHtml, /value="en"/);
  assert.match(popupHtml, /id="popup-version"/);
  assert.match(popupHtml, /value="low"/);
  assert.match(popupHtml, /value="standard"/);
  assert.match(popupHtml, /value="high"/);
  assert.match(popupHtml, /id="popup-open-options"/);
  assert.match(popupHtml, /data-i18n="optionSensitivityLowSummary"/);
  assert.match(popupHtml, /data-i18n="optionSensitivityStandardSummary"/);
  assert.match(popupHtml, /data-i18n="optionSensitivityHighSummary"/);
  assert.match(popupHtml, /data-i18n="optionPrivacyNote"/);
  assert.match(popupHtml, /data-i18n="optionReloadNote"/);
  assert.doesNotMatch(popupHtml, /textarea|postText|matchedRules|categories|reasons/);
}

function testApplyExtensionVersion() {
  const fakeDocument = createFakeDocument();
  const version = applyExtensionVersion(fakeDocument, {
    getManifest: () => ({ version: '1.0.0' })
  });

  assert.equal(version, '1.0.0');
  assert.equal(fakeDocument.versionLabel.textContent, 'v1.0.0');
}

function testGetExtensionVersionFallsBackWhenUnavailable() {
  assert.equal(getExtensionVersion(undefined), '');
  assert.equal(
    getExtensionVersion({
      getManifest: () => {
        throw new Error('Extension context invalidated.');
      }
    }),
    ''
  );
}

async function testApplyLocalizedMessages() {
  await withI18n(() => {
    const titleElement = createLocalizedElement('h1', 'popupTitle');
    const taglineElement = createLocalizedElement('p', 'popupTagline');
    const lowSummaryElement = createLocalizedElement('li', 'optionSensitivityLowSummary');
    const standardSummaryElement = createLocalizedElement('li', 'optionSensitivityStandardSummary');
    const highSummaryElement = createLocalizedElement('li', 'optionSensitivityHighSummary');
    const optionsButton = createLocalizedElement('button', 'popupOpenOptions');
    const fakeDocument = createFakeDocument({
      localizedElements: [
        titleElement,
        taglineElement,
        lowSummaryElement,
        standardSummaryElement,
        highSummaryElement,
        optionsButton
      ]
    });

    applyLocalizedMessages(fakeDocument);

    assert.equal(fakeDocument.title, MESSAGES.popupTitle);
    assert.equal(titleElement.textContent, MESSAGES.popupTitle);
    assert.equal(taglineElement.textContent, MESSAGES.popupTagline);
    assert.equal(lowSummaryElement.textContent, MESSAGES.optionSensitivityLowSummary);
    assert.equal(standardSummaryElement.textContent, MESSAGES.optionSensitivityStandardSummary);
    assert.equal(highSummaryElement.textContent, MESSAGES.optionSensitivityHighSummary);
    assert.equal(optionsButton.textContent, MESSAGES.popupOpenOptions);
  });
}

async function testInitializePopupLoadsCurrentState() {
  await withI18n(async () => {
    const fakeDocument = createFakeDocument();

    const result = await initializePopup(fakeDocument, {
      loadSettings: async () => ({ enabled: true, cushionSensitivity: 'high', uiLanguage: 'auto' }),
      saveSettings: async (settings) => settings
    });

    assert.equal(result, true);
    assert.equal(fakeDocument.enabledCheckbox.checked, true);
    assert.equal(fakeDocument.statusValue.textContent, MESSAGES.popupStatusOn);
    assert.equal(fakeDocument.statusValue.dataset.state, 'on');
    assert.equal(getSelectedSensitivity(fakeDocument.sensitivityInputs), 'high');
    assert.equal(fakeDocument.uiLanguageSelect.value, 'auto');
  });
}

async function testSavePopupSettingsStoresAllowedSettingsOnly() {
  await withI18n(async () => {
    const savedSettings = [];
    const fakeDocument = createFakeDocument();
    fakeDocument.enabledCheckbox.checked = true;
    setSelectedSensitivity(fakeDocument.sensitivityInputs, 'low');
    fakeDocument.uiLanguageSelect.value = 'en';

    const result = await savePopupSettings(getInteractiveElements(fakeDocument), {
      saveSettings: async (settings) => {
        savedSettings.push(settings);

        return settings;
      }
    });

    assert.deepEqual(savedSettings, [
      { enabled: true, cushionSensitivity: 'low', uiLanguage: 'en' }
    ]);
    assert.deepEqual(result, { enabled: true, cushionSensitivity: 'low', uiLanguage: 'en' });
    assert.equal(fakeDocument.statusValue.textContent, MESSAGES.popupStatusOn);
    assert.equal(fakeDocument.saveStatus.textContent, 'Settings saved.');
    assert.equal(fakeDocument.saveStatus.dataset.state, 'saved');
  });
}

async function testLanguageChangeUpdatesPopupImmediatelyAndKeepsOtherSettings() {
  await withI18n(async () => {
    const languageLabel = createLocalizedElement('label', 'optionDisplayLanguage');
    const autoOption = createLocalizedElement('option', 'optionLanguageAuto');
    const japaneseOption = createLocalizedElement('option', 'optionLanguageJapanese');
    const englishOption = createLocalizedElement('option', 'optionLanguageEnglish');
    const fakeDocument = createFakeDocument({
      localizedElements: [languageLabel, autoOption, japaneseOption, englishOption]
    });
    const elements = getInteractiveElements(fakeDocument);

    await applyPopupSettings(
      fakeDocument,
      elements,
      { enabled: true, cushionSensitivity: 'high', uiLanguage: 'en' },
      {}
    );

    assert.equal(fakeDocument.documentElement.lang, 'en');
    assert.equal(fakeDocument.uiLanguageSelect.value, 'en');
    assert.equal(languageLabel.textContent, 'Display language');
    assert.equal(autoOption.textContent, 'Auto');
    assert.equal(japaneseOption.textContent, '日本語');
    assert.equal(englishOption.textContent, 'English');
    assert.equal(fakeDocument.enabledCheckbox.checked, true);
    assert.equal(getSelectedSensitivity(fakeDocument.sensitivityInputs), 'high');

    const savedSettings = [];
    const result = await savePopupSettings(
      elements,
      {
        saveSettings: async (settings) => {
          savedSettings.push(settings);
          return settings;
        }
      },
      fakeDocument,
      {}
    );

    assert.deepEqual(result, { enabled: true, cushionSensitivity: 'high', uiLanguage: 'en' });
    assert.deepEqual(savedSettings, [
      { enabled: true, cushionSensitivity: 'high', uiLanguage: 'en' }
    ]);
    fakeDocument.enabledCheckbox.checked = false;
    await savePopupSettings(
      elements,
      { saveSettings: async (settings) => settings },
      fakeDocument,
      {}
    );
    assert.equal(fakeDocument.uiLanguageSelect.value, 'en');
    setSelectedSensitivity(fakeDocument.sensitivityInputs, 'low');
    await savePopupSettings(
      elements,
      { saveSettings: async (settings) => settings },
      fakeDocument,
      {}
    );
    assert.equal(fakeDocument.uiLanguageSelect.value, 'en');
  });
}

async function testSavePopupSettingsPersistsEnabledStateForTheNextPopup() {
  await withI18n(async () => {
    const storedSettings = {
      enabled: false,
      cushionSensitivity: 'standard',
      uiLanguage: 'auto'
    };
    const settingsApi = {
      loadSettings: async () => ({ ...storedSettings }),
      saveSettings: async (settings) => {
        Object.assign(storedSettings, settings);

        return { ...storedSettings };
      }
    };
    const firstPopupDocument = createFakeDocument();
    const firstPopupElements = getInteractiveElements(firstPopupDocument);

    firstPopupDocument.enabledCheckbox.checked = true;
    await savePopupSettings(firstPopupElements, settingsApi, firstPopupDocument, {});

    const reopenedPopupDocument = createFakeDocument();
    await initializePopup(reopenedPopupDocument, settingsApi, {});

    assert.equal(reopenedPopupDocument.enabledCheckbox.checked, true);
    assert.equal(reopenedPopupDocument.statusValue.textContent, MESSAGES.popupStatusOn);
    assert.equal(getSelectedSensitivity(reopenedPopupDocument.sensitivityInputs), 'standard');
    assert.equal(reopenedPopupDocument.uiLanguageSelect.value, 'auto');
  });
}

async function testSavePopupSettingsShowsErrorMessage() {
  await withI18n(async () => {
    const fakeDocument = createFakeDocument();

    const result = await savePopupSettings(
      getInteractiveElements(fakeDocument),
      {
        saveSettings: async () => {
          throw new Error('Storage unavailable');
        }
      },
      fakeDocument,
      {}
    );

    assert.equal(result, null);
    assert.equal(fakeDocument.saveStatus.textContent, MESSAGES.optionSaveError);
    assert.equal(fakeDocument.saveStatus.dataset.state, 'error');
  });
}

async function testOpenDetailedSettingsUsesChromeRuntime() {
  let openCount = 0;

  const result = await openDetailedSettings({
    openOptionsPage: async () => {
      openCount += 1;
    }
  });

  assert.equal(result, true);
  assert.equal(openCount, 1);
}

function createFakeDocument({ localizedElements = [] } = {}) {
  const enabledCheckbox = createElement('input');
  const uiLanguageSelect = createElement('select');
  uiLanguageSelect.value = 'auto';
  const sensitivityInputs = ['low', 'standard', 'high'].map((value) => {
    const input = createElement('input');
    input.value = value;

    return input;
  });
  const statusValue = createElement('strong');
  const versionLabel = createElement('span');
  const saveStatus = createElement('p');
  const openOptionsButton = createElement('button');

  return {
    enabledCheckbox,
    uiLanguageSelect,
    sensitivityInputs,
    statusValue,
    versionLabel,
    saveStatus,
    openOptionsButton,
    documentElement: { lang: 'ja' },
    title: '',
    getElementById(id) {
      if (id === 'popup-enabled') {
        return enabledCheckbox;
      }

      if (id === 'popup-ui-language') {
        return uiLanguageSelect;
      }

      if (id === 'popup-status-value') {
        return statusValue;
      }

      if (id === 'popup-version') {
        return versionLabel;
      }

      if (id === 'popup-save-status') {
        return saveStatus;
      }

      if (id === 'popup-open-options') {
        return openOptionsButton;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'input[name="popup-cushion-sensitivity"]') {
        return sensitivityInputs;
      }

      if (selector === '[data-i18n]') {
        return localizedElements;
      }

      return [];
    }
  };
}

function getInteractiveElements(fakeDocument) {
  return {
    enabledCheckbox: fakeDocument.enabledCheckbox,
    uiLanguageSelect: fakeDocument.uiLanguageSelect,
    sensitivityInputs: fakeDocument.sensitivityInputs,
    statusValue: fakeDocument.statusValue,
    versionLabel: fakeDocument.versionLabel,
    saveStatus: fakeDocument.saveStatus,
    openOptionsButton: fakeDocument.openOptionsButton
  };
}

function getSelectedSensitivity(sensitivityInputs) {
  return sensitivityInputs.find((input) => input.checked)?.value ?? null;
}

function setSelectedSensitivity(sensitivityInputs, selectedValue) {
  for (const sensitivityInput of sensitivityInputs) {
    sensitivityInput.checked = sensitivityInput.value === selectedValue;
  }
}

function createLocalizedElement(tagName, messageKey) {
  const element = createElement(tagName);
  element.setAttribute('data-i18n', messageKey);

  return element;
}

function createElement(tagName) {
  const attributes = new Map();

  return {
    checked: false,
    dataset: {},
    tagName: String(tagName).toUpperCase(),
    textContent: '',
    addEventListener() {},
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    }
  };
}

async function withI18n(callback) {
  const previousI18n = globalThis.kotobaUkeMimamoriI18n;

  globalThis.kotobaUkeMimamoriI18n = {
    getMessage(key) {
      return MESSAGES[key] || key;
    },
    resolveUiLanguage(uiLanguage) {
      return uiLanguage === 'en' ? 'en' : 'ja';
    },
    loadLocaleMessages: async (resolvedLanguage) =>
      resolvedLanguage === 'en' ? createEnglishMessages() : toLocaleMessages(MESSAGES),
    getLocaleMessage(localeMessages, key) {
      return localeMessages?.[key]?.message || '';
    }
  };

  try {
    await callback();
  } finally {
    if (previousI18n === undefined) {
      delete globalThis.kotobaUkeMimamoriI18n;
    } else {
      globalThis.kotobaUkeMimamoriI18n = previousI18n;
    }
  }
}

function createEnglishMessages() {
  return toLocaleMessages({
    ...MESSAGES,
    popupTitle: 'Kotoba Uke Mimamori',
    popupTagline: 'A gentle cushion for words on X',
    popupStatusLabel: 'Status',
    popupOpenOptions: 'Open detailed settings',
    optionEnableExtension: 'Enable Kotoba Uke Mimamori',
    optionDisplayLanguage: 'Display language',
    optionLanguageAuto: 'Auto',
    optionSensitivityLow: 'Low',
    optionSensitivityLowSummary: 'Low: Shows cushions mainly for stronger expressions.',
    optionSensitivityStandard: 'Standard',
    optionSensitivityStandardSummary: 'Standard: The usual setting.',
    optionSensitivityHigh: 'High',
    optionSensitivityHighSummary:
      'High: Shows cushions more easily, including for slightly lighter risk expressions.',
    optionPrivacyNote: 'Post text and detection results are not sent to external servers.',
    optionReloadNote:
      'ON/OFF and display sensitivity changes will take effect after reloading the open X page.',
    optionSaved: 'Settings saved.',
    optionSaveError: 'Could not save settings.'
  });
}

function toLocaleMessages(messages) {
  return Object.fromEntries(Object.entries(messages).map(([key, message]) => [key, { message }]));
}

runTests();
