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
  testReleaseCandidateVersionsAreConsistent();
  testLocalizedNameAndDescriptionAreConfigured();
  testPopupIsConfigured();
  testExtensionIconsAreConfigured();
  testActionDefaultIconsAreConfigured();
  testIconFilesExist();
  testOptionsPageIsConfigured();
  testClassicDistanceTermsServiceWorkerIsConfigured();
  testOnlyStoragePermissionIsRequested();
  testHostPermissionsAreNotRequested();
  testExternalConnectionsAreNotConfigured();
  testOnlyLocaleMessagesAreWebAccessibleFromX();
  testContentScriptLoadingOrderIsPreserved();
  testDistanceContentScriptFilesExist();
  testPackageIncludesRuntimeDependencies();
  testSettingsScriptLoadsBeforeContentScript();
  testCushionGuidanceScriptLoadsBeforeContentScript();
  testLocaleMessagesDoNotIncludeBetaNotice();

  console.log('All manifest tests passed.');
}

function testReleaseCandidateVersionsAreConsistent() {
  const manifest = readManifest();
  const packageJson = readJsonFile('package.json');
  const packageLock = readJsonFile('package-lock.json');

  assert.deepEqual(
    [manifest.version, packageJson.version, packageLock.version, packageLock.packages[''].version],
    ['2.0.0', '2.0.0', '2.0.0', '2.0.0']
  );
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

function testClassicDistanceTermsServiceWorkerIsConfigured() {
  const manifest = readManifest();

  assert.deepEqual(manifest.background, {
    service_worker: 'distance-terms-service-worker.js'
  });
  assert.equal(Object.hasOwn(manifest.background, 'type'), false);
  assert.equal(fs.existsSync(path.join(__dirname, '..', manifest.background.service_worker)), true);
}

function testOnlyStoragePermissionIsRequested() {
  const manifest = readManifest();

  assert.deepEqual(manifest.permissions, ['storage']);
}

function testHostPermissionsAreNotRequested() {
  const manifest = readManifest();

  assert.equal(Object.hasOwn(manifest, 'host_permissions'), false);
}

function testExternalConnectionsAreNotConfigured() {
  const manifest = readManifest();

  assert.equal(Object.hasOwn(manifest, 'externally_connectable'), false);
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
    'distance-terms-core.js',
    'distance-terms-reader.js',
    'distance-matcher.js',
    'overlay.js',
    'content.js'
  ]);
}

function testDistanceContentScriptFilesExist() {
  const manifest = readManifest();
  const scripts = manifest.content_scripts[0].js;

  for (const scriptPath of [
    'distance-terms-core.js',
    'distance-terms-reader.js',
    'distance-matcher.js'
  ]) {
    assert.equal(scripts.includes(scriptPath), true);
    assert.equal(fs.existsSync(path.join(__dirname, '..', scriptPath)), true);
  }

  assert.ok(scripts.indexOf('overlay.js') > scripts.indexOf('distance-matcher.js'));
  assert.equal(scripts.at(-1), 'content.js');
}

function testPackageIncludesRuntimeDependencies() {
  const manifest = readManifest();
  const packageItems = readPackageItems();
  const optionsScripts = readHtmlScriptSources('options.html');
  const serviceWorkerImports = readServiceWorkerImports(manifest.background.service_worker);
  const runtimeDependencies = new Set([
    ...manifest.content_scripts.flatMap((contentScript) => contentScript.js),
    manifest.background.service_worker,
    ...optionsScripts,
    ...serviceWorkerImports
  ]);

  for (const dependencyPath of runtimeDependencies) {
    assert.equal(
      packageItems.has(dependencyPath),
      true,
      `${dependencyPath} must be included in the Web Store package`
    );
    assert.equal(
      fs.existsSync(path.join(__dirname, '..', dependencyPath)),
      true,
      `${dependencyPath} must exist in the repository`
    );
  }
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
  return readJsonFile('manifest.json');
}

function readJsonFile(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'));
}

function readPackageItems() {
  const packageScript = fs.readFileSync(
    path.join(__dirname, '..', 'tools', 'make_webstore_package.sh'),
    'utf8'
  );
  const packageItemsBlock = /PACKAGE_ITEMS=\(\s*([\s\S]*?)\n\)/u.exec(packageScript);

  assert.ok(packageItemsBlock);
  return new Set(
    [...packageItemsBlock[1].matchAll(/^\s*"([^"]+)"\s*$/gmu)].map((match) => match[1])
  );
}

function readHtmlScriptSources(relativePath) {
  const html = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

  return [...html.matchAll(/<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gu)].map(
    (match) => match[1]
  );
}

function readServiceWorkerImports(relativePath) {
  const serviceWorker = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const imports = /importScripts\(([\s\S]*?)\);/u.exec(serviceWorker);

  assert.ok(imports);
  return [...imports[1].matchAll(/["']([^"']+)["']/gu)].map((match) => match[1]);
}

function readMessages(locale) {
  const messagesPath = path.join(__dirname, '..', '_locales', locale, 'messages.json');

  return JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
}

runTests();
