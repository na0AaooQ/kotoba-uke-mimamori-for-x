'use strict';

const assert = require('node:assert/strict');
const { DEFAULT_SETTINGS, loadSettings, normalizeSettings, saveSettings } = require('../settings');

async function runTests() {
  testDefaultSettingsAreSafe();
  testNormalizeSettingsAcceptsSupportedValuesOnly();
  await testLoadSettingsFallsBackWithoutChromeStorage();
  await testLoadSettingsNormalizesStoredValues();
  await testSaveSettingsStoresAllowedSettingsOnly();
  await testSaveSettingsPersistsValuesForTheNextLoad();
  await testSaveSettingsNormalizesInvalidSensitivity();
  await testSaveSettingsFallsBackWithoutChromeStorage();

  console.log('All settings tests passed.');
}

function testDefaultSettingsAreSafe() {
  assert.equal(DEFAULT_SETTINGS.enabled, false);
  assert.equal(DEFAULT_SETTINGS.cushionSensitivity, 'standard');
  assert.equal(DEFAULT_SETTINGS.uiLanguage, 'auto');
}

function testNormalizeSettingsAcceptsSupportedValuesOnly() {
  assert.deepEqual(
    normalizeSettings({ enabled: true, cushionSensitivity: 'low', uiLanguage: 'auto' }),
    {
      enabled: true,
      cushionSensitivity: 'low',
      uiLanguage: 'auto'
    }
  );
  assert.deepEqual(
    normalizeSettings({ enabled: false, cushionSensitivity: 'standard', uiLanguage: 'ja' }),
    {
      enabled: false,
      cushionSensitivity: 'standard',
      uiLanguage: 'ja'
    }
  );
  assert.deepEqual(
    normalizeSettings({ enabled: true, cushionSensitivity: 'high', uiLanguage: 'en' }),
    {
      enabled: true,
      cushionSensitivity: 'high',
      uiLanguage: 'en'
    }
  );
  assert.deepEqual(
    normalizeSettings({ enabled: 'true', cushionSensitivity: 'unknown', uiLanguage: 'unknown' }),
    {
      enabled: false,
      cushionSensitivity: 'standard',
      uiLanguage: 'auto'
    }
  );
  assert.deepEqual(normalizeSettings({ enabled: 1, uiLanguage: '' }), {
    enabled: false,
    cushionSensitivity: 'standard',
    uiLanguage: 'auto'
  });
  assert.deepEqual(normalizeSettings({ uiLanguage: null }), {
    enabled: false,
    cushionSensitivity: 'standard',
    uiLanguage: 'auto'
  });
  assert.deepEqual(normalizeSettings({ uiLanguage: [] }), {
    enabled: false,
    cushionSensitivity: 'standard',
    uiLanguage: 'auto'
  });
  assert.deepEqual(normalizeSettings(null), {
    enabled: false,
    cushionSensitivity: 'standard',
    uiLanguage: 'auto'
  });
}

async function testLoadSettingsFallsBackWithoutChromeStorage() {
  await withChrome(undefined, async () => {
    assert.deepEqual(await loadSettings(), {
      enabled: false,
      cushionSensitivity: 'standard',
      uiLanguage: 'auto'
    });
  });
}

async function testLoadSettingsNormalizesStoredValues() {
  await withChrome(
    createChromeStorageMock({ enabled: true, cushionSensitivity: 'high' }),
    async () => {
      assert.deepEqual(await loadSettings(), {
        enabled: true,
        cushionSensitivity: 'high',
        uiLanguage: 'auto'
      });
    }
  );

  await withChrome(
    createChromeStorageMock({ enabled: 'yes', cushionSensitivity: 'custom' }),
    async () => {
      assert.deepEqual(await loadSettings(), {
        enabled: false,
        cushionSensitivity: 'standard',
        uiLanguage: 'auto'
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
      uiLanguage: 'en',
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
      cushionSensitivity: 'high',
      uiLanguage: 'en'
    });
    assert.deepEqual(storedValues, [
      {
        enabled: true,
        cushionSensitivity: 'high',
        uiLanguage: 'en'
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
      cushionSensitivity: 'custom',
      uiLanguage: 'unexpected'
    });

    assert.deepEqual(result, {
      enabled: true,
      cushionSensitivity: 'standard',
      uiLanguage: 'auto'
    });
    assert.deepEqual(storedValues, [
      {
        enabled: true,
        cushionSensitivity: 'standard',
        uiLanguage: 'auto'
      }
    ]);
  });
}

async function testSaveSettingsPersistsValuesForTheNextLoad() {
  const chromeMock = createChromeStorageMock({
    enabled: false,
    cushionSensitivity: 'standard'
  });

  await withChrome(chromeMock, async () => {
    await saveSettings({ enabled: true, cushionSensitivity: 'high', uiLanguage: 'en' });

    assert.deepEqual(await loadSettings(), {
      enabled: true,
      cushionSensitivity: 'high',
      uiLanguage: 'en'
    });
  });
}

async function testSaveSettingsFallsBackWithoutChromeStorage() {
  await withChrome(undefined, async () => {
    assert.deepEqual(
      await saveSettings({ enabled: true, cushionSensitivity: 'low', uiLanguage: 'ja' }),
      {
        enabled: true,
        cushionSensitivity: 'low',
        uiLanguage: 'ja'
      }
    );
  });
}

function createChromeStorageMock(initialValues = {}, storedValues = []) {
  const values = { ...initialValues };

  return {
    storage: {
      local: {
        get(defaults) {
          return Promise.resolve({
            ...defaults,
            ...values
          });
        },
        set(nextValues) {
          storedValues.push(nextValues);
          Object.assign(values, nextValues);

          return Promise.resolve();
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
