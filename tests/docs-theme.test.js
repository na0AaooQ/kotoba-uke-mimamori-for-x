'use strict';

const assert = require('node:assert/strict');
const theme = require('../docs/assets/js/theme-switcher.js');

function runTests() {
  testThemeNormalization();
  testThemeResolution();
  testStorageFailureFallback();
  testThemeToggleSynchronization();
  testSystemThemeToggleSynchronization();

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
  assert.equal(theme.getToggleTheme('light', true), 'dark');
  assert.equal(theme.getToggleTheme('dark', false), 'light');
  assert.equal(theme.getToggleTheme('system', false), 'dark');
  assert.equal(theme.getToggleTheme('system', true), 'light');
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

function testThemeToggleSynchronization() {
  const storage = createStorage('dark');
  const button = createButton();
  const colorSchemeQuery = createColorSchemeQuery(false);
  const document = {
    documentElement: { dataset: {}, lang: 'ja' },
    querySelector(selector) {
      assert.equal(selector, '[data-theme-toggle]');
      return button;
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

  assert.equal(document.documentElement.dataset.themePreference, 'dark');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(button.textContent, '☀️ ライトモード');
  assert.equal(button.getAttribute('aria-label'), 'ライトモードに切り替える');
  assert.equal(button.dataset.nextTheme, 'light');

  button.dispatch('click');
  assert.equal(storage.getItem(theme.STORAGE_KEY), 'light');
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(button.textContent, '🌙 ダークモード');
  assert.equal(button.getAttribute('aria-label'), 'ダークモードに切り替える');
  assert.equal(button.dataset.nextTheme, 'dark');
}

function testSystemThemeToggleSynchronization() {
  const storage = createStorage('system');
  const button = createButton();
  const colorSchemeQuery = createColorSchemeQuery(false);
  const document = {
    documentElement: { dataset: {}, lang: 'en' },
    querySelector() {
      return button;
    }
  };
  const root = {
    document,
    localStorage: storage,
    matchMedia() {
      return colorSchemeQuery;
    }
  };

  theme.initializeThemeSwitcher(root);

  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(button.textContent, '🌙 Dark mode');

  colorSchemeQuery.matches = true;
  colorSchemeQuery.dispatch('change');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(button.textContent, '☀️ Light mode');

  button.dispatch('click');
  assert.equal(storage.getItem(theme.STORAGE_KEY), 'light');
  assert.equal(document.documentElement.dataset.themePreference, 'light');
  assert.equal(document.documentElement.dataset.theme, 'light');

  colorSchemeQuery.matches = false;
  colorSchemeQuery.dispatch('change');
  assert.equal(document.documentElement.dataset.theme, 'light');
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

function createButton() {
  const listeners = new Map();
  const attributes = new Map();

  return {
    dataset: {},
    textContent: '',
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    dispatch(type) {
      listeners.get(type)?.();
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
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
