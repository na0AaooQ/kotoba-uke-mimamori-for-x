'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_ICON_PATHS = Object.freeze({
  16: 'icons/icon16.png',
  32: 'icons/icon32.png',
  48: 'icons/icon48.png',
  128: 'icons/icon128.png'
});
const STORE_ASSET_ICON_PATHS = Object.freeze([
  'icons/icon256.png',
  'icons/icon512.png',
  'icons/icon1024.png'
]);

function runTests() {
  testManifestVersionIsOfficialReleaseVersion();
  testLocalizedNameAndDescriptionAreConfigured();
  testPopupIsConfigured();
  testExtensionIconsAreConfigured();
  testActionDefaultIconsAreConfigured();
  testIconFilesExist();
  testOptionsPageIsConfigured();
  testOnlyStoragePermissionIsRequested();
  testHostPermissionsAreNotRequested();
  testOnlyLocaleMessagesAreWebAccessibleFromX();
  testContentScriptLoadingOrderIsPreserved();
  testSettingsScriptLoadsBeforeContentScript();
  testCushionGuidanceScriptLoadsBeforeContentScript();
  testLocaleMessagesDoNotIncludeBetaNotice();

  console.log('All manifest tests passed.');
}

function testManifestVersionIsOfficialReleaseVersion() {
  const manifest = readManifest();

  assert.equal(manifest.version, '1.0.0');
}

function testLocalizedNameAndDescriptionAreConfigured() {
  const manifest = readManifest();

  assert.equal(manifest.name, '__MSG_extensionName__');
  assert.equal(manifest.description, '__MSG_extensionDescription__');
}

function testPopupIsConfigured() {
  const manifest = readManifest();

  assert.equal(manifest.action.default_popup, 'popup.html');
}

function testExtensionIconsAreConfigured() {
  const manifest = readManifest();

  assert.deepEqual(manifest.icons, MANIFEST_ICON_PATHS);
}

function testActionDefaultIconsAreConfigured() {
  const manifest = readManifest();

  assert.deepEqual(manifest.action.default_icon, MANIFEST_ICON_PATHS);
}

function testIconFilesExist() {
  const iconPaths = [...Object.values(MANIFEST_ICON_PATHS), ...STORE_ASSET_ICON_PATHS];

  for (const iconPath of iconPaths) {
    assert.equal(fs.existsSync(path.join(__dirname, '..', iconPath)), true);
  }
}

function testOptionsPageIsConfigured() {
  const manifest = readManifest();

  assert.equal(manifest.options_page, 'options.html');
}

function testOnlyStoragePermissionIsRequested() {
  const manifest = readManifest();

  assert.deepEqual(manifest.permissions, ['storage']);
}

function testHostPermissionsAreNotRequested() {
  const manifest = readManifest();

  assert.equal(Object.hasOwn(manifest, 'host_permissions'), false);
}

function testOnlyLocaleMessagesAreWebAccessibleFromX() {
  const manifest = readManifest();

  assert.deepEqual(manifest.web_accessible_resources, [
    {
      resources: ['_locales/ja/messages.json', '_locales/en/messages.json'],
      matches: ['https://x.com/*', 'https://twitter.com/*']
    }
  ]);
  assert.equal(JSON.stringify(manifest.web_accessible_resources).includes('<all_urls>'), false);
  assert.equal(JSON.stringify(manifest.web_accessible_resources).includes('_locales/*'), false);
}

function testContentScriptLoadingOrderIsPreserved() {
  const manifest = readManifest();

  assert.deepEqual(manifest.content_scripts[0].js, [
    'settings.js',
    'risk-detector.js',
    'cushion-guidance.js',
    'i18n.js',
    'overlay.js',
    'content.js'
  ]);
}

function testSettingsScriptLoadsBeforeContentScript() {
  const manifest = readManifest();
  const scripts = manifest.content_scripts[0].js;

  assert.ok(scripts.indexOf('settings.js') !== -1);
  assert.ok(scripts.indexOf('content.js') !== -1);
  assert.ok(scripts.indexOf('settings.js') < scripts.indexOf('content.js'));
}

function testCushionGuidanceScriptLoadsBeforeContentScript() {
  const manifest = readManifest();
  const scripts = manifest.content_scripts[0].js;

  assert.ok(scripts.indexOf('cushion-guidance.js') !== -1);
  assert.ok(scripts.indexOf('cushion-guidance.js') < scripts.indexOf('content.js'));
}

function testLocaleMessagesDoNotIncludeBetaNotice() {
  const japaneseMessages = readMessages('ja');
  const englishMessages = readMessages('en');

  assert.ok(
    !japaneseMessages.extensionName.message.includes('BETA') &&
      !japaneseMessages.extensionName.message.includes('ベータ')
  );
  assert.ok(
    !englishMessages.extensionName.message.includes('BETA') &&
      !englishMessages.extensionName.message.toLowerCase().includes('beta')
  );
  assert.ok(
    !japaneseMessages.extensionDescription.message.includes('THIS EXTENSION IS FOR BETA TESTING')
  );
  assert.ok(
    !englishMessages.extensionDescription.message.includes('THIS EXTENSION IS FOR BETA TESTING')
  );
}

function readManifest() {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');

  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function readMessages(locale) {
  const messagesPath = path.join(__dirname, '..', '_locales', locale, 'messages.json');

  return JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
}

runTests();
