'use strict';

(function initializeDocsTheme(root) {
  const STORAGE_KEY = 'kotoba-uke-mimamori-docs-theme';
  const SYSTEM_THEME = 'system';
  const VALID_THEMES = new Set([SYSTEM_THEME, 'light', 'dark']);

  function normalizeTheme(value) {
    return VALID_THEMES.has(value) ? value : SYSTEM_THEME;
  }

  function resolveTheme(preference, prefersDark) {
    const theme = normalizeTheme(preference);

    if (theme === SYSTEM_THEME) {
      return prefersDark ? 'dark' : 'light';
    }

    return theme;
  }

  function readStoredTheme(storage) {
    try {
      return normalizeTheme(storage?.getItem(STORAGE_KEY));
    } catch {
      return SYSTEM_THEME;
    }
  }

  function saveTheme(storage, preference) {
    const theme = normalizeTheme(preference);

    if (!storage?.setItem) {
      return false;
    }

    try {
      storage.setItem(STORAGE_KEY, theme);
      return true;
    } catch {
      return false;
    }
  }

  function applyTheme(document, preference, prefersDark) {
    const theme = normalizeTheme(preference);
    const resolvedTheme = resolveTheme(theme, prefersDark);

    document.documentElement.dataset.themePreference = theme;
    document.documentElement.dataset.theme = resolvedTheme;

    return resolvedTheme;
  }

  function getStorage(context) {
    try {
      return context.localStorage;
    } catch {
      return null;
    }
  }

  function getColorSchemeQuery(context) {
    if (typeof context.matchMedia !== 'function') {
      return null;
    }

    return context.matchMedia('(prefers-color-scheme: dark)');
  }

  function initializeThemeSwitcher(context = root) {
    const document = context.document;

    if (!document) {
      return;
    }

    const colorSchemeQuery = getColorSchemeQuery(context);
    const storage = getStorage(context);
    const preference = readStoredTheme(storage);
    const prefersDark = colorSchemeQuery?.matches === true;

    applyTheme(document, preference, prefersDark);

    const select = document.querySelector('[data-theme-select]');

    if (!select) {
      return;
    }

    select.value = preference;

    const synchronizeSystemTheme = () => {
      const selectedTheme = normalizeTheme(select.value);

      if (selectedTheme === SYSTEM_THEME) {
        applyTheme(document, selectedTheme, colorSchemeQuery?.matches === true);
      }
    };

    select.addEventListener('change', () => {
      const selectedTheme = normalizeTheme(select.value);

      select.value = selectedTheme;
      applyTheme(document, selectedTheme, colorSchemeQuery?.matches === true);
      saveTheme(storage, selectedTheme);
    });

    if (colorSchemeQuery?.addEventListener) {
      colorSchemeQuery.addEventListener('change', synchronizeSystemTheme);
    } else if (colorSchemeQuery?.addListener) {
      colorSchemeQuery.addListener(synchronizeSystemTheme);
    }
  }

  const api = {
    STORAGE_KEY,
    applyTheme,
    initializeThemeSwitcher,
    normalizeTheme,
    readStoredTheme,
    resolveTheme,
    saveTheme
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (!root?.document) {
    return;
  }

  initializeThemeSwitcher(root);

  if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', () => initializeThemeSwitcher(root), {
      once: true
    });
  }
})(typeof globalThis === 'undefined' ? this : globalThis);
