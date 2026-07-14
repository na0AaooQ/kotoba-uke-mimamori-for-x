'use strict';

const assert = require('node:assert/strict');
const theme = require('../docs/assets/js/theme-switcher.js');

function runTests() {
  testThemeNormalization();
  testThemeResolution();
  testStorageFailureFallback();
  testThemeSwitcherSynchronization();

  console.log('All docs theme tests passed.');
}

function testThemeNormalization() {
  assert.equal(theme.normalizeTheme('system'), 'system');
  assert.equal(theme.normalizeTheme('light'), 'light');
  assert.equal(theme.normalizeTheme('dark'), 'dark');
  assert.equal(theme.normalizeTheme('unexpected'), 'system');
  assert.equal(theme.normalizeTheme(null), 'system');
}

function testThemeResolution() {
  assert.equal(theme.resolveTheme('light', true), 'light');
  assert.equal(theme.resolveTheme('dark', false), 'dark');
  assert.equal(theme.resolveTheme('system', false), 'light');
  assert.equal(theme.resolveTheme('system', true), 'dark');
}

function testStorageFailureFallback() {
  const failingStorage = {
    getItem() {
      throw new Error('Storage is unavailable');
    },
    setItem() {
      throw new Error('Storage is unavailable');
    }
  };

  assert.equal(theme.readStoredTheme(failingStorage), 'system');
  assert.equal(theme.saveTheme(failingStorage, 'dark'), false);
  assert.equal(theme.saveTheme(null, 'light'), false);
}

function testThemeSwitcherSynchronization() {
  const storage = createStorage('dark');
  const select = createSelect();
  const colorSchemeQuery = createColorSchemeQuery(false);
  const document = {
    documentElement: { dataset: {} },
    querySelector(selector) {
      assert.equal(selector, '[data-theme-select]');
      return select;
    }
  };
  const root = {
    document,
    localStorage: storage,
    matchMedia(query) {
      assert.equal(query, '(prefers-color-scheme: dark)');
      return colorSchemeQuery;
    }
  };

  theme.initializeThemeSwitcher(root);

  assert.equal(select.value, 'dark');
  assert.equal(document.documentElement.dataset.themePreference, 'dark');
  assert.equal(document.documentElement.dataset.theme, 'dark');

  select.value = 'light';
  select.dispatch('change');
  assert.equal(storage.getItem(theme.STORAGE_KEY), 'light');
  assert.equal(document.documentElement.dataset.theme, 'light');

  select.value = 'system';
  select.dispatch('change');
  assert.equal(storage.getItem(theme.STORAGE_KEY), 'system');
  assert.equal(document.documentElement.dataset.theme, 'light');

  colorSchemeQuery.matches = true;
  colorSchemeQuery.dispatch('change');
  assert.equal(document.documentElement.dataset.theme, 'dark');

  select.value = 'dark';
  select.dispatch('change');
  colorSchemeQuery.matches = false;
  colorSchemeQuery.dispatch('change');
  assert.equal(document.documentElement.dataset.theme, 'dark');
}

function createStorage(initialTheme) {
  const values = new Map([[theme.STORAGE_KEY, initialTheme]]);

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

function createSelect() {
  const listeners = new Map();

  return {
    value: 'system',
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    dispatch(type) {
      listeners.get(type)?.();
    }
  };
}

function createColorSchemeQuery(initialMatches) {
  const listeners = new Map();

  return {
    matches: initialMatches,
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    dispatch(type) {
      listeners.get(type)?.();
    }
  };
}

runTests();
