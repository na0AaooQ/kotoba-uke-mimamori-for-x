'use strict';

const assert = require('node:assert/strict');
const { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } = require('../settings');

async function runTests() {
  testDefaultSettingsAreOff();
  testNormalizeSettingsAcceptsBooleanOnly();
  await testLoadSettingsFallsBackWithoutChromeStorage();
  await testLoadSettingsNormalizesStoredValues();
  await testSaveSettingsStoresEnabledOnly();
  await testSaveSettingsFallsBackWithoutChromeStorage();

  console.log('All settings tests passed.');
}

function testDefaultSettingsAreOff() {
  assert.equal(DEFAULT_SETTINGS.enabled, false);
}

function testNormalizeSettingsAcceptsBooleanOnly() {
  assert.deepEqual(normalizeSettings({ enabled: true }), { enabled: true });
  assert.deepEqual(normalizeSettings({ enabled: false }), { enabled: false });
  assert.deepEqual(normalizeSettings({ enabled: 'true' }), { enabled: false });
  assert.deepEqual(normalizeSettings({ enabled: 1 }), { enabled: false });
  assert.deepEqual(normalizeSettings({}), { enabled: false });
  assert.deepEqual(normalizeSettings(null), { enabled: false });
}

async function testLoadSettingsFallsBackWithoutChromeStorage() {
  await withChrome(undefined, async () => {
    assert.deepEqual(await loadSettings(), { enabled: false });
  });
}

async function testLoadSettingsNormalizesStoredValues() {
  await withChrome(createChromeStorageMock({ enabled: true }), async () => {
    assert.deepEqual(await loadSettings(), { enabled: true });
  });

  await withChrome(createChromeStorageMock({ enabled: 'yes' }), async () => {
    assert.deepEqual(await loadSettings(), { enabled: false });
  });
}

async function testSaveSettingsStoresEnabledOnly() {
  const storedValues = [];
  const chromeMock = createChromeStorageMock({}, storedValues);

  await withChrome(chromeMock, async () => {
    const result = await saveSettings({
      enabled: true,
      postText: '保存してはいけない投稿本文',
      score: 100,
      matchedRules: ['internal.rule'],
      categories: ['internal_category'],
      reasons: ['内部理由']
    });

    assert.deepEqual(result, { enabled: true });
    assert.deepEqual(storedValues, [{ enabled: true }]);
  });
}

async function testSaveSettingsFallsBackWithoutChromeStorage() {
  await withChrome(undefined, async () => {
    assert.deepEqual(await saveSettings({ enabled: true }), { enabled: true });
  });
}

function createChromeStorageMock(initialValues = {}, storedValues = []) {
  return {
    storage: {
      local: {
        get(defaults, callback) {
          callback({
            ...defaults,
            ...initialValues
          });
        },
        set(values, callback) {
          storedValues.push(values);
          callback();
        }
      }
    }
  };
}

async function withChrome(chromeValue, callback) {
  const hadChrome = Object.hasOwn(globalThis, 'chrome');
  const previousChrome = globalThis.chrome;

  globalThis.chrome = chromeValue;

  try {
    await callback();
  } finally {
    if (hadChrome) {
      globalThis.chrome = previousChrome;
    } else {
      delete globalThis.chrome;
    }
  }
}

runTests();
