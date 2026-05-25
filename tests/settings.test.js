'use strict';

const assert = require('node:assert/strict');
const { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } = require('../settings');

async function runTests() {
  testDefaultSettingsAreSafe();
  testNormalizeSettingsAcceptsSupportedValuesOnly();
  await testLoadSettingsFallsBackWithoutChromeStorage();
  await testLoadSettingsNormalizesStoredValues();
  await testSaveSettingsStoresAllowedSettingsOnly();
  await testSaveSettingsNormalizesInvalidSensitivity();
  await testSaveSettingsFallsBackWithoutChromeStorage();

  console.log('All settings tests passed.');
}

function testDefaultSettingsAreSafe() {
  assert.equal(DEFAULT_SETTINGS.enabled, false);
  assert.equal(DEFAULT_SETTINGS.cushionSensitivity, 'standard');
}

function testNormalizeSettingsAcceptsSupportedValuesOnly() {
  assert.deepEqual(normalizeSettings({ enabled: true, cushionSensitivity: 'low' }), {
    enabled: true,
    cushionSensitivity: 'low'
  });
  assert.deepEqual(normalizeSettings({ enabled: false, cushionSensitivity: 'standard' }), {
    enabled: false,
    cushionSensitivity: 'standard'
  });
  assert.deepEqual(normalizeSettings({ enabled: true, cushionSensitivity: 'high' }), {
    enabled: true,
    cushionSensitivity: 'high'
  });
  assert.deepEqual(normalizeSettings({ enabled: 'true', cushionSensitivity: 'unknown' }), {
    enabled: false,
    cushionSensitivity: 'standard'
  });
  assert.deepEqual(normalizeSettings({ enabled: 1 }), {
    enabled: false,
    cushionSensitivity: 'standard'
  });
  assert.deepEqual(normalizeSettings({}), {
    enabled: false,
    cushionSensitivity: 'standard'
  });
  assert.deepEqual(normalizeSettings(null), {
    enabled: false,
    cushionSensitivity: 'standard'
  });
}

async function testLoadSettingsFallsBackWithoutChromeStorage() {
  await withChrome(undefined, async () => {
    assert.deepEqual(await loadSettings(), {
      enabled: false,
      cushionSensitivity: 'standard'
    });
  });
}

async function testLoadSettingsNormalizesStoredValues() {
  await withChrome(
    createChromeStorageMock({ enabled: true, cushionSensitivity: 'high' }),
    async () => {
      assert.deepEqual(await loadSettings(), {
        enabled: true,
        cushionSensitivity: 'high'
      });
    }
  );

  await withChrome(
    createChromeStorageMock({ enabled: 'yes', cushionSensitivity: 'custom' }),
    async () => {
      assert.deepEqual(await loadSettings(), {
        enabled: false,
        cushionSensitivity: 'standard'
      });
    }
  );
}

async function testSaveSettingsStoresAllowedSettingsOnly() {
  const storedValues = [];
  const chromeMock = createChromeStorageMock({}, storedValues);

  await withChrome(chromeMock, async () => {
    const result = await saveSettings({
      enabled: true,
      cushionSensitivity: 'high',
      postText: '保存してはいけない投稿本文',
      result: { shouldCushion: true },
      url: 'https://x.com/example/status/1',
      userName: '保存してはいけないユーザー名',
      history: ['保存してはいけない閲覧履歴'],
      score: 100,
      matchedRules: ['internal.rule'],
      categories: ['internal_category'],
      reasons: ['内部理由']
    });

    assert.deepEqual(result, {
      enabled: true,
      cushionSensitivity: 'high'
    });
    assert.deepEqual(storedValues, [
      {
        enabled: true,
        cushionSensitivity: 'high'
      }
    ]);
  });
}

async function testSaveSettingsNormalizesInvalidSensitivity() {
  const storedValues = [];
  const chromeMock = createChromeStorageMock({}, storedValues);

  await withChrome(chromeMock, async () => {
    const result = await saveSettings({
      enabled: true,
      cushionSensitivity: 'custom'
    });

    assert.deepEqual(result, {
      enabled: true,
      cushionSensitivity: 'standard'
    });
    assert.deepEqual(storedValues, [
      {
        enabled: true,
        cushionSensitivity: 'standard'
      }
    ]);
  });
}

async function testSaveSettingsFallsBackWithoutChromeStorage() {
  await withChrome(undefined, async () => {
    assert.deepEqual(await saveSettings({ enabled: true, cushionSensitivity: 'low' }), {
      enabled: true,
      cushionSensitivity: 'low'
    });
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
