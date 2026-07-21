'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  applyExtensionVersion,
  applyLocalizedMessages,
  applyOptionsSettings,
  getExtensionVersion,
  initializeOptionsPage,
  saveOptionSettings
} = require('../options');

const MESSAGES = Object.freeze({
  optionsTitle: 'ことばうけみまもりの設定',
  optionsDescription: 'Xで届く言葉に、読む前のワンクッションを置くための設定です。',
  optionEnableExtension: 'ことばうけみまもりを有効にする',
  optionDisplayLanguage: '表示言語',
  optionLanguageAuto: '自動',
  optionLanguageJapanese: '日本語',
  optionLanguageEnglish: 'English',
  optionCushionSensitivity: 'ワンクッションの表示されやすさ',
  optionSensitivityLow: '少なめ',
  optionSensitivityLowDescription: '強い表現を中心に表示します。',
  optionSensitivityStandard: '標準',
  optionSensitivityStandardDescription: '通常の設定です。',
  optionSensitivityHigh: '多め',
  optionSensitivityHighDescription: '少し軽めのリスク表現にも表示されやすくします。',
  optionPrivacyNote: '投稿本文や判定結果は外部送信されません。',
  optionStorageNote: '設定はこのブラウザ内に保存されます。',
  optionReloadNote:
    'ON/OFFや表示されやすさの変更は、開いているXのページを再読み込みすると反映されます。',
  optionSaved: '設定を保存しました。',
  optionSaveError: '設定の保存に失敗しました。'
});

async function runTests() {
  testOptionsHtmlContainsVersionLabel();
  testApplyLocalizedMessages();
  testApplyExtensionVersion();
  testGetExtensionVersionFallsBackWhenUnavailable();
  await testInitializeOptionsPageLoadsSafeInitialState();
  await testSaveOptionSettingsStoresThreeSensitivityValues();
  await testLanguageChangeUpdatesOptionsImmediatelyAndKeepsOtherSettings();
  await testSaveOptionSettingsShowsErrorMessage();

  console.log('All options tests passed.');
}

function testOptionsHtmlContainsVersionLabel() {
  const optionsHtml = fs.readFileSync(path.join(__dirname, '..', 'options.html'), 'utf8');

  assert.match(optionsHtml, /id="options-version"/);
  assert.match(optionsHtml, /id="option-ui-language"/);
  assert.match(optionsHtml, /for="option-ui-language"/);
  assert.match(optionsHtml, /value="auto"/);
  assert.match(optionsHtml, /value="ja"/);
  assert.match(optionsHtml, /value="en"/);
}

function testApplyLocalizedMessages() {
  withI18n(() => {
    const titleElement = createElement('h1');
    titleElement.setAttribute('data-i18n', 'optionsTitle');
    const descriptionElement = createElement('p');
    descriptionElement.setAttribute('data-i18n', 'optionsDescription');
    const sensitivityTitleElement = createElement('legend');
    sensitivityTitleElement.setAttribute('data-i18n', 'optionCushionSensitivity');
    const sensitivityHighElement = createElement('span');
    sensitivityHighElement.setAttribute('data-i18n', 'optionSensitivityHighDescription');
    const reloadNoteElement = createElement('p');
    reloadNoteElement.setAttribute('data-i18n', 'optionReloadNote');
    const fakeDocument = createFakeDocument({
      localizedElements: [
        titleElement,
        descriptionElement,
        sensitivityTitleElement,
        sensitivityHighElement,
        reloadNoteElement
      ]
    });

    applyLocalizedMessages(fakeDocument);

    assert.equal(fakeDocument.title, MESSAGES.optionsTitle);
    assert.equal(titleElement.textContent, MESSAGES.optionsTitle);
    assert.equal(descriptionElement.textContent, MESSAGES.optionsDescription);
    assert.equal(sensitivityTitleElement.textContent, MESSAGES.optionCushionSensitivity);
    assert.equal(sensitivityHighElement.textContent, MESSAGES.optionSensitivityHighDescription);
    assert.equal(reloadNoteElement.textContent, MESSAGES.optionReloadNote);
  });
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

async function testInitializeOptionsPageLoadsSafeInitialState() {
  await withI18n(async () => {
    const fakeDocument = createFakeDocument();

    const result = await initializeOptionsPage(fakeDocument, {
      loadSettings: async () => ({
        enabled: false,
        cushionSensitivity: 'standard',
        uiLanguage: 'auto'
      }),
      saveSettings: async (settings) => settings
    });

    assert.equal(result, true);
    assert.equal(fakeDocument.enabledCheckbox.checked, false);
    assert.equal(getSelectedSensitivity(fakeDocument.sensitivityInputs), 'standard');
    assert.equal(fakeDocument.uiLanguageSelect.value, 'auto');
  });
}

async function testSaveOptionSettingsStoresThreeSensitivityValues() {
  await withI18n(async () => {
    for (const cushionSensitivity of ['low', 'standard', 'high']) {
      const savedSettings = [];
      const fakeDocument = createFakeDocument();
      fakeDocument.enabledCheckbox.checked = true;
      setSelectedSensitivity(fakeDocument.sensitivityInputs, cushionSensitivity);
      fakeDocument.uiLanguageSelect.value = 'ja';

      const result = await saveOptionSettings(
        {
          enabledCheckbox: fakeDocument.enabledCheckbox,
          uiLanguageSelect: fakeDocument.uiLanguageSelect,
          sensitivityInputs: fakeDocument.sensitivityInputs,
          statusMessage: fakeDocument.statusMessage
        },
        {
          saveSettings: async (settings) => {
            savedSettings.push(settings);

            return settings;
          }
        }
      );

      assert.deepEqual(result, { enabled: true, cushionSensitivity, uiLanguage: 'ja' });
      assert.deepEqual(savedSettings, [{ enabled: true, cushionSensitivity, uiLanguage: 'ja' }]);
      assert.equal(getSelectedSensitivity(fakeDocument.sensitivityInputs), cushionSensitivity);
      assert.equal(fakeDocument.statusMessage.textContent, MESSAGES.optionSaved);
      assert.equal(fakeDocument.statusMessage.dataset.state, 'saved');
    }
  });
}

async function testLanguageChangeUpdatesOptionsImmediatelyAndKeepsOtherSettings() {
  await withI18n(async () => {
    const languageLabel = createLocalizedElement('label', 'optionDisplayLanguage');
    const autoOption = createLocalizedElement('option', 'optionLanguageAuto');
    const japaneseOption = createLocalizedElement('option', 'optionLanguageJapanese');
    const englishOption = createLocalizedElement('option', 'optionLanguageEnglish');
    const fakeDocument = createFakeDocument({
      localizedElements: [languageLabel, autoOption, japaneseOption, englishOption]
    });
    const elements = getInteractiveElements(fakeDocument);

    await applyOptionsSettings(
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
    const result = await saveOptionSettings(
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
    await saveOptionSettings(
      elements,
      { saveSettings: async (settings) => settings },
      fakeDocument,
      {}
    );
    assert.equal(fakeDocument.uiLanguageSelect.value, 'en');
    setSelectedSensitivity(fakeDocument.sensitivityInputs, 'low');
    await saveOptionSettings(
      elements,
      { saveSettings: async (settings) => settings },
      fakeDocument,
      {}
    );
    assert.equal(fakeDocument.uiLanguageSelect.value, 'en');
  });
}

async function testSaveOptionSettingsShowsErrorMessage() {
  await withI18n(async () => {
    const fakeDocument = createFakeDocument();

    const result = await saveOptionSettings(
      {
        enabledCheckbox: fakeDocument.enabledCheckbox,
        sensitivityInputs: fakeDocument.sensitivityInputs,
        statusMessage: fakeDocument.statusMessage
      },
      {
        saveSettings: async () => {
          throw new Error('Storage unavailable');
        }
      }
    );

    assert.equal(result, null);
    assert.equal(fakeDocument.statusMessage.textContent, MESSAGES.optionSaveError);
    assert.equal(fakeDocument.statusMessage.dataset.state, 'error');
  });
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
  const versionLabel = createElement('span');
  const statusMessage = createElement('p');

  return {
    enabledCheckbox,
    uiLanguageSelect,
    sensitivityInputs,
    versionLabel,
    statusMessage,
    documentElement: { lang: 'ja' },
    title: '',
    getElementById(id) {
      if (id === 'option-enabled') {
        return enabledCheckbox;
      }

      if (id === 'option-ui-language') {
        return uiLanguageSelect;
      }

      if (id === 'options-status') {
        return statusMessage;
      }

      if (id === 'options-version') {
        return versionLabel;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'input[name="option-cushion-sensitivity"]') {
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
    statusMessage: fakeDocument.statusMessage
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

function createLocalizedElement(tagName, messageKey) {
  const element = createElement(tagName);
  element.setAttribute('data-i18n', messageKey);

  return element;
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
    optionsTitle: 'Kotoba Uke Mimamori Settings',
    optionsDescription:
      'Settings for adding a gentle cushion before reading words that arrive on X.',
    optionEnableExtension: 'Enable Kotoba Uke Mimamori',
    optionDisplayLanguage: 'Display language',
    optionLanguageAuto: 'Auto',
    optionCushionSensitivity: 'Cushion display sensitivity',
    optionSensitivityLow: 'Low',
    optionSensitivityLowDescription: 'Shows cushions mainly for stronger expressions.',
    optionSensitivityStandard: 'Standard',
    optionSensitivityStandardDescription: 'The usual setting.',
    optionSensitivityHigh: 'High',
    optionSensitivityHighDescription:
      'Shows cushions more easily, including for slightly lighter risk expressions.',
    optionPrivacyNote: 'Post text and detection results are not sent to external servers.',
    optionStorageNote: 'Settings are stored in this browser.',
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
