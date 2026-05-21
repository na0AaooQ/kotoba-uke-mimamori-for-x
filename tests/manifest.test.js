'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function runTests() {
  testOptionsPageIsConfigured();
  testOnlyStoragePermissionIsRequested();
  testSettingsScriptLoadsBeforeContentScript();

  console.log('All manifest tests passed.');
}

function testOptionsPageIsConfigured() {
  const manifest = readManifest();

  assert.equal(manifest.options_page, 'options.html');
}

function testOnlyStoragePermissionIsRequested() {
  const manifest = readManifest();

  assert.deepEqual(manifest.permissions, ['storage']);
}

function testSettingsScriptLoadsBeforeContentScript() {
  const manifest = readManifest();
  const scripts = manifest.content_scripts[0].js;

  assert.ok(scripts.indexOf('settings.js') !== -1);
  assert.ok(scripts.indexOf('content.js') !== -1);
  assert.ok(scripts.indexOf('settings.js') < scripts.indexOf('content.js'));
}

function readManifest() {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');

  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

runTests();
