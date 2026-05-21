'use strict';

const assert = require('node:assert/strict');
const { applyLocalizedMessages, initializeOptionsPage, saveEnabledSetting } = require('../options');

const MESSAGES = Object.freeze({
  optionsTitle: 'ことばうけみまもりの設定',
  optionsDescription: 'Xで届く言葉に、読む前のワンクッションを置くための設定です。',
  optionEnableExtension: 'ことばうけみまもりを有効にする',
  optionPrivacyNote: '投稿本文や判定結果は外部送信されません。',
  optionStorageNote: '設定はこのブラウザ内に保存されます。',
  optionSaved: '設定を保存しました。',
  optionSaveError: '設定の保存に失敗しました。'
});

async function runTests() {
  testApplyLocalizedMessages();
  await testInitializeOptionsPageLoadsInitialOffState();
  await testSaveEnabledSettingStoresEnabledOnly();
  await testSaveEnabledSettingShowsErrorMessage();

  console.log('All options tests passed.');
}

function testApplyLocalizedMessages() {
  withI18n(() => {
    const titleElement = createElement('h1');
    titleElement.setAttribute('data-i18n', 'optionsTitle');
    const descriptionElement = createElement('p');
    descriptionElement.setAttribute('data-i18n', 'optionsDescription');
    const fakeDocument = createFakeDocument({
      localizedElements: [titleElement, descriptionElement]
    });

    applyLocalizedMessages(fakeDocument);

    assert.equal(fakeDocument.title, MESSAGES.optionsTitle);
    assert.equal(titleElement.textContent, MESSAGES.optionsTitle);
    assert.equal(descriptionElement.textContent, MESSAGES.optionsDescription);
  });
}

async function testInitializeOptionsPageLoadsInitialOffState() {
  await withI18n(async () => {
    const fakeDocument = createFakeDocument();

    const result = await initializeOptionsPage(fakeDocument, {
      loadSettings: async () => ({ enabled: false }),
      saveSettings: async (settings) => settings
    });

    assert.equal(result, true);
    assert.equal(fakeDocument.enabledCheckbox.checked, false);
  });
}

async function testSaveEnabledSettingStoresEnabledOnly() {
  await withI18n(async () => {
    const savedSettings = [];
    const fakeDocument = createFakeDocument();
    fakeDocument.enabledCheckbox.checked = true;

    const result = await saveEnabledSetting(
      {
        enabledCheckbox: fakeDocument.enabledCheckbox,
        statusMessage: fakeDocument.statusMessage
      },
      {
        saveSettings: async (settings) => {
          savedSettings.push(settings);

          return { enabled: settings.enabled };
        }
      }
    );

    assert.deepEqual(result, { enabled: true });
    assert.deepEqual(savedSettings, [{ enabled: true }]);
    assert.equal(fakeDocument.statusMessage.textContent, MESSAGES.optionSaved);
    assert.equal(fakeDocument.statusMessage.dataset.state, 'saved');
  });
}

async function testSaveEnabledSettingShowsErrorMessage() {
  await withI18n(async () => {
    const fakeDocument = createFakeDocument();

    const result = await saveEnabledSetting(
      {
        enabledCheckbox: fakeDocument.enabledCheckbox,
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
  const statusMessage = createElement('p');

  return {
    enabledCheckbox,
    statusMessage,
    title: '',
    getElementById(id) {
      if (id === 'option-enabled') {
        return enabledCheckbox;
      }

      if (id === 'options-status') {
        return statusMessage;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-i18n]') {
        return localizedElements;
      }

      return [];
    }
  };
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
