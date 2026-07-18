'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getMessage } = require('../i18n');

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

function runTests() {
  testFallbackWithoutChromeI18n();
  testChromeI18nMessage();
  testChromeI18nInvalidatedContextFallsBack();
  testLocaleKeysMatch();
  testRequiredGuidanceMessagesExist();
  testRequiredEnglishMessagesExist();
  testEnglishMessagesAvoidStrongPhrases();

  console.log('All i18n tests passed.');
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
    'popupStatusLabel',
    'popupStatusOn',
    'popupStatusOff',
    'popupOpenOptions',
    'optionsTitle',
    'optionsDescription',
    'optionEnableExtension',
    'optionCushionSensitivity',
    'optionSensitivityLow',
    'optionSensitivityLowDescription',
    'optionSensitivityLowSummary',
    'optionSensitivityStandard',
    'optionSensitivityStandardDescription',
    'optionSensitivityStandardSummary',
    'optionSensitivityHigh',
    'optionSensitivityHighDescription',
    'optionSensitivityHighSummary',
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

runTests();
