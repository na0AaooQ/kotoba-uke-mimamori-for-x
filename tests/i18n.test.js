'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { getLocaleMessage, getMessage, loadLocaleMessages, resolveUiLanguage } = require('../i18n');

const REQUIRED_GUIDANCE_KEYS = Object.freeze([
  'cushionGuidanceStrengthLabel',
  'cushionGuidanceTendencyLabel',
  'cushionGuidanceNote',
  'cushionGuidanceStrengthSomewhatStrong',
  'cushionGuidanceStrengthStrong',
  'cushionGuidanceStrengthVeryStrong',
  'cushionGuidanceTendencyPersonalSafety',
  'cushionGuidanceTendencyPrivacy',
  'cushionGuidanceTendencyCircumstancesOrBackground',
  'cushionGuidanceTendencyDirectedStrongLanguage',
  'cushionGuidanceTendencyPossiblyPressuringLanguage'
]);

async function runTests() {
  testFallbackWithoutChromeI18n();
  testChromeI18nMessage();
  testChromeI18nInvalidatedContextFallsBack();
  testResolveUiLanguageFromChromeLocale();
  testResolveUiLanguageUsesExplicitSelection();
  testInvalidUiLanguageFallsBackToAuto();
  testSettingsAndI18nCanLoadInOneGlobalScope();
  await testLocaleMessagesLoadFromExtensionPackage();
  await testLocaleMessageLoadingFailureIsSafe();
  testLocaleKeysMatch();
  testPopupCompactSensitivitySummaryMessages();
  testRequiredGuidanceMessagesExist();
  testRequiredEnglishMessagesExist();
  testEnglishMessagesAvoidStrongPhrases();

  console.log('All i18n tests passed.');
}

function testSettingsAndI18nCanLoadInOneGlobalScope() {
  const context = vm.createContext({});
  context.globalThis = context;

  for (const fileName of ['settings.js', 'i18n.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');

    vm.runInContext(source, context, { filename: fileName });
  }

  assert.equal(typeof context.kotobaUkeMimamoriSettings?.saveSettings, 'function');
  assert.equal(typeof context.kotobaUkeMimamoriI18n?.resolveUiLanguage, 'function');
}

function testResolveUiLanguageFromChromeLocale() {
  for (const locale of ['ja', 'ja-JP', 'ja_JP', 'JA_jp']) {
    assert.equal(resolveUiLanguage('auto', { getUILanguage: () => locale }), 'ja');
  }

  for (const locale of ['en', 'en-US', 'ko-KR', '']) {
    assert.equal(resolveUiLanguage('auto', { getUILanguage: () => locale }), 'en');
  }

  assert.equal(
    resolveUiLanguage('auto', {
      getMessage: (key) => (key === '@@ui_locale' ? 'ja_JP' : '')
    }),
    'ja'
  );
}

function testResolveUiLanguageUsesExplicitSelection() {
  assert.equal(resolveUiLanguage('ja', { getUILanguage: () => 'en-US' }), 'ja');
  assert.equal(resolveUiLanguage('en', { getUILanguage: () => 'ja-JP' }), 'en');
}

function testInvalidUiLanguageFallsBackToAuto() {
  assert.equal(resolveUiLanguage('unknown', { getUILanguage: () => 'ja-JP' }), 'ja');
  assert.equal(resolveUiLanguage('', { getUILanguage: () => 'en-US' }), 'en');
  assert.equal(resolveUiLanguage(null, { getUILanguage: () => 'en-US' }), 'en');
}

async function testLocaleMessagesLoadFromExtensionPackage() {
  const requestedUrls = [];
  const localeMessages = await loadLocaleMessages(
    'ja',
    { getURL: (pathValue) => `chrome-extension://test/${pathValue}` },
    async (url) => {
      requestedUrls.push(url);

      return {
        ok: true,
        json: async () => ({ optionDisplayLanguage: { message: '表示言語' } })
      };
    }
  );

  assert.deepEqual(requestedUrls, ['chrome-extension://test/_locales/ja/messages.json']);
  assert.equal(getLocaleMessage(localeMessages, 'optionDisplayLanguage'), '表示言語');
  assert.equal(getLocaleMessage(localeMessages, 'missing'), '');
}

async function testLocaleMessageLoadingFailureIsSafe() {
  const runtimeApi = { getURL: (pathValue) => `chrome-extension://test/${pathValue}` };

  assert.deepEqual(
    await loadLocaleMessages('en', runtimeApi, async () => {
      throw new Error('Locale unavailable');
    }),
    {}
  );
  assert.deepEqual(await loadLocaleMessages('en', runtimeApi, async () => ({ ok: false })), {});
  assert.deepEqual(await loadLocaleMessages('en', null, null), {});
}

function testChromeI18nInvalidatedContextFallsBack() {
  withChrome(
    {
      i18n: {
        getMessage: () => {
          throw new Error('Extension context invalidated.');
        }
      }
    },
    () => {
      assert.equal(getMessage('knownKey'), 'knownKey');
    }
  );
}

function testFallbackWithoutChromeI18n() {
  withChrome(undefined, () => {
    assert.equal(getMessage('unknownKey'), 'unknownKey');
  });
}

function testChromeI18nMessage() {
  withChrome(
    {
      i18n: {
        getMessage: (key) => {
          if (key === 'knownKey') {
            return 'Known message';
          }

          return '';
        }
      }
    },
    () => {
      assert.equal(getMessage('knownKey'), 'Known message');
      assert.equal(getMessage('missingKey'), 'missingKey');
    }
  );
}

function testLocaleKeysMatch() {
  const jaMessages = readLocaleMessages('ja');
  const enMessages = readLocaleMessages('en');

  assert.deepEqual(Object.keys(jaMessages).sort(), Object.keys(enMessages).sort());
}

function testRequiredEnglishMessagesExist() {
  const enMessages = readLocaleMessages('en');
  const requiredKeys = [
    'extensionName',
    'extensionDescription',
    'cushionTitle',
    'cushionBody',
    'cushionDismissedMessage',
    'cushionDismissedBody',
    'buttonShowContent',
    'buttonHideForNow',
    'popupTitle',
    'popupTagline',
    'popupOpenOptions',
    'optionsTitle',
    'optionsDescription',
    'optionEnableExtension',
    'optionDisplayLanguage',
    'optionLanguageAuto',
    'optionLanguageJapanese',
    'optionLanguageEnglish',
    'optionCushionSensitivity',
    'optionSensitivityLow',
    'optionSensitivityLowDescription',
    'optionSensitivityStandard',
    'optionSensitivityStandardDescription',
    'optionSensitivityHigh',
    'optionSensitivityHighDescription',
    'popupSensitivityCompactSummary',
    'optionPrivacyNote',
    'optionStorageNote',
    'optionReloadNote',
    'optionSaved',
    'optionSaveError'
  ];

  for (const key of requiredKeys) {
    assert.equal(typeof enMessages[key]?.message, 'string');
    assert.notEqual(enMessages[key].message.trim(), '');
  }
}

function testPopupCompactSensitivitySummaryMessages() {
  const jaMessages = readLocaleMessages('ja');
  const enMessages = readLocaleMessages('en');

  assert.equal(
    jaMessages.popupSensitivityCompactSummary.message,
    '少なめ＝強い表現中心 ／ 標準＝通常 ／ 多め＝より表示されやすい'
  );
  assert.equal(
    enMessages.popupSensitivityCompactSummary.message,
    'Low = stronger expressions / Standard = usual / High = more sensitive'
  );
}

function testRequiredGuidanceMessagesExist() {
  for (const locale of ['ja', 'en']) {
    const messages = readLocaleMessages(locale);

    for (const key of REQUIRED_GUIDANCE_KEYS) {
      assert.equal(typeof messages[key]?.message, 'string');
      assert.notEqual(messages[key].message.trim(), '');
    }
  }
}

function testEnglishMessagesAvoidStrongPhrases() {
  const enMessages = readLocaleMessages('en');
  const messageText = Object.values(enMessages)
    .map((entry) => entry.message)
    .join('\n')
    .toLowerCase();
  const forbiddenPhrases = [
    'we detect harmful posts',
    'we block abusive content',
    'we identify dangerous accounts',
    'dangerous post detected',
    'toxic content detected',
    'this extension prevents harassment',
    'this extension is better than x mute features',
    'potentially harmful words'
  ];

  for (const phrase of forbiddenPhrases) {
    assert.equal(messageText.includes(phrase), false);
  }
}

function readLocaleMessages(locale) {
  const filePath = path.join(__dirname, '..', '_locales', locale, 'messages.json');

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function withChrome(chromeValue, callback) {
  const hadChrome = Object.hasOwn(globalThis, 'chrome');
  const previousChrome = globalThis.chrome;

  globalThis.chrome = chromeValue;

  try {
    callback();
  } finally {
    if (hadChrome) {
      globalThis.chrome = previousChrome;
    } else {
      delete globalThis.chrome;
    }
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
