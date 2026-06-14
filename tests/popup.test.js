'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  applyExtensionVersion,
  applyLocalizedMessages,
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
  await testOpenDetailedSettingsUsesChromeRuntime();

  console.log('All popup tests passed.');
}

function testPopupHtmlContainsRequiredControlsOnly() {
  const popupHtml = fs.readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8');

  assert.match(popupHtml, /id="popup-enabled"/);
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
      loadSettings: async () => ({ enabled: true, cushionSensitivity: 'high' }),
      saveSettings: async (settings) => settings
    });

    assert.equal(result, true);
    assert.equal(fakeDocument.enabledCheckbox.checked, true);
    assert.equal(fakeDocument.statusValue.textContent, MESSAGES.popupStatusOn);
    assert.equal(fakeDocument.statusValue.dataset.state, 'on');
    assert.equal(getSelectedSensitivity(fakeDocument.sensitivityInputs), 'high');
  });
}

async function testSavePopupSettingsStoresAllowedSettingsOnly() {
  await withI18n(async () => {
    const savedSettings = [];
    const fakeDocument = createFakeDocument();
    fakeDocument.enabledCheckbox.checked = true;
    setSelectedSensitivity(fakeDocument.sensitivityInputs, 'low');

    const result = await savePopupSettings(getInteractiveElements(fakeDocument), {
      saveSettings: async (settings) => {
        savedSettings.push(settings);

        return settings;
      }
    });

    assert.deepEqual(savedSettings, [{ enabled: true, cushionSensitivity: 'low' }]);
    assert.deepEqual(result, { enabled: true, cushionSensitivity: 'low' });
    assert.equal(fakeDocument.statusValue.textContent, MESSAGES.popupStatusOn);
    assert.equal(fakeDocument.saveStatus.textContent, MESSAGES.optionSaved);
    assert.equal(fakeDocument.saveStatus.dataset.state, 'saved');
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
    sensitivityInputs,
    statusValue,
    versionLabel,
    saveStatus,
    openOptionsButton,
    title: '',
    getElementById(id) {
      if (id === 'popup-enabled') {
        return enabledCheckbox;
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

runTests();
