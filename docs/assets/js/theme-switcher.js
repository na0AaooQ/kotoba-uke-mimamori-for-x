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

  function getToggleTheme(preference, prefersDark) {
    return resolveTheme(preference, prefersDark) === 'dark' ? 'light' : 'dark';
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

  function getToggleLabels(document, nextTheme) {
    const isJapanese = document.documentElement.lang === 'ja';

    if (nextTheme === 'dark') {
      return isJapanese
        ? { ariaLabel: 'ダークモードに切り替える', text: '🌙 ダークモード' }
        : { ariaLabel: 'Switch to dark mode', text: '🌙 Dark mode' };
    }

    return isJapanese
      ? { ariaLabel: 'ライトモードに切り替える', text: '☀️ ライトモード' }
      : { ariaLabel: 'Switch to light mode', text: '☀️ Light mode' };
  }

  function updateThemeToggle(button, document, preference, prefersDark) {
    const nextTheme = getToggleTheme(preference, prefersDark);
    const labels = getToggleLabels(document, nextTheme);

    button.textContent = labels.text;
    button.setAttribute('aria-label', labels.ariaLabel);
    button.dataset.nextTheme = nextTheme;
  }

  function initializeThemeSwitcher(context = root) {
    const document = context.document;

    if (!document) {
      return;
    }

    const colorSchemeQuery = getColorSchemeQuery(context);
    const storage = getStorage(context);
    let preference = readStoredTheme(storage);
    const initialPrefersDark = colorSchemeQuery?.matches === true;

    applyTheme(document, preference, initialPrefersDark);

    const button = document.querySelector('[data-theme-toggle]');

    if (!button) {
      return;
    }

    const updateTheme = () => {
      const prefersDark = colorSchemeQuery?.matches === true;

      applyTheme(document, preference, prefersDark);
      updateThemeToggle(button, document, preference, prefersDark);
    };

    updateTheme();

    const synchronizeSystemTheme = () => {
      if (preference === SYSTEM_THEME) {
        updateTheme();
      }
    };

    button.addEventListener('click', () => {
      preference = getToggleTheme(preference, colorSchemeQuery?.matches === true);
      saveTheme(storage, preference);
      updateTheme();
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
    getToggleTheme,
    initializeThemeSwitcher,
    normalizeTheme,
    readStoredTheme,
    resolveTheme,
    saveTheme,
    updateThemeToggle
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
