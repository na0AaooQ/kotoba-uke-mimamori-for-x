'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  applyExtensionVersion,
  applyLocalizedMessages,
  getExtensionVersion,
  initializeOptionsPage,
  saveOptionSettings
} = require('../options');

const MESSAGES = Object.freeze({
  optionsTitle: 'ことばうけみまもりの設定',
  optionsDescription: 'Xで届く言葉に、読む前のワンクッションを置くための設定です。',
  optionEnableExtension: 'ことばうけみまもりを有効にする',
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
  await testSaveOptionSettingsShowsErrorMessage();

  console.log('All options tests passed.');
}

function testOptionsHtmlContainsVersionLabel() {
  const optionsHtml = fs.readFileSync(path.join(__dirname, '..', 'options.html'), 'utf8');

  assert.match(optionsHtml, /id="options-version"/);
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
      loadSettings: async () => ({ enabled: false, cushionSensitivity: 'standard' }),
      saveSettings: async (settings) => settings
    });

    assert.equal(result, true);
    assert.equal(fakeDocument.enabledCheckbox.checked, false);
    assert.equal(getSelectedSensitivity(fakeDocument.sensitivityInputs), 'standard');
  });
}

async function testSaveOptionSettingsStoresThreeSensitivityValues() {
  await withI18n(async () => {
    for (const cushionSensitivity of ['low', 'standard', 'high']) {
      const savedSettings = [];
      const fakeDocument = createFakeDocument();
      fakeDocument.enabledCheckbox.checked = true;
      setSelectedSensitivity(fakeDocument.sensitivityInputs, cushionSensitivity);

      const result = await saveOptionSettings(
        {
          enabledCheckbox: fakeDocument.enabledCheckbox,
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

      assert.deepEqual(result, { enabled: true, cushionSensitivity });
      assert.deepEqual(savedSettings, [{ enabled: true, cushionSensitivity }]);
      assert.equal(getSelectedSensitivity(fakeDocument.sensitivityInputs), cushionSensitivity);
      assert.equal(fakeDocument.statusMessage.textContent, MESSAGES.optionSaved);
      assert.equal(fakeDocument.statusMessage.dataset.state, 'saved');
    }
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
  const sensitivityInputs = ['low', 'standard', 'high'].map((value) => {
    const input = createElement('input');
    input.value = value;

    return input;
  });
  const versionLabel = createElement('span');
  const statusMessage = createElement('p');

  return {
    enabledCheckbox,
    sensitivityInputs,
    versionLabel,
    statusMessage,
    title: '',
    getElementById(id) {
      if (id === 'option-enabled') {
        return enabledCheckbox;
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
