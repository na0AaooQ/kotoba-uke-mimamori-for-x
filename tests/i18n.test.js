'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getMessage } = require('../i18n');

function runTests() {
  testFallbackWithoutChromeI18n();
  testChromeI18nMessage();
  testLocaleKeysMatch();

  console.log('All i18n tests passed.');
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
