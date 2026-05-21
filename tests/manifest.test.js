'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function runTests() {
  testOptionsPageIsConfigured();
  testOnlyStoragePermissionIsRequested();

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

function readManifest() {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');

  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

runTests();
