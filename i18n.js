'use strict';

const I18N_UI_LANGUAGE_VALUES = Object.freeze(['auto', 'ja', 'en']);
const I18N_RESOLVED_LANGUAGE_VALUES = Object.freeze(['ja', 'en']);

function getMessage(key, substitutions) {
  const messageKey = String(key ?? '');

  if (!messageKey) {
    return '';
  }

  const chromeI18n = globalThis.chrome?.i18n;

  if (typeof chromeI18n?.getMessage === 'function') {
    try {
      return chromeI18n.getMessage(messageKey, substitutions) || messageKey;
    } catch (_error) {
      return messageKey;
    }
  }

  return messageKey;
}

function normalizeUiLanguage(uiLanguage) {
  return I18N_UI_LANGUAGE_VALUES.includes(uiLanguage) ? uiLanguage : 'auto';
}

function resolveUiLanguage(uiLanguage, chromeI18n = globalThis.chrome?.i18n) {
  const normalizedLanguage = normalizeUiLanguage(uiLanguage);

  if (normalizedLanguage === 'ja' || normalizedLanguage === 'en') {
    return normalizedLanguage;
  }

  return isJapaneseLocale(getChromeUiLanguage(chromeI18n)) ? 'ja' : 'en';
}

function getChromeUiLanguage(chromeI18n = globalThis.chrome?.i18n) {
  if (typeof chromeI18n?.getUILanguage === 'function') {
    try {
      const locale = chromeI18n.getUILanguage();

      if (locale) {
        return String(locale);
      }
    } catch (_error) {
      // Fall through to Chrome's locale message when the API is unavailable.
    }
  }

  if (typeof chromeI18n?.getMessage === 'function') {
    try {
      return String(chromeI18n.getMessage('@@ui_locale') || '');
    } catch (_error) {
      return '';
    }
  }

  return '';
}

function isJapaneseLocale(locale) {
  const normalizedLocale = String(locale ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-');

  return normalizedLocale === 'ja' || normalizedLocale.startsWith('ja-');
}

async function loadLocaleMessages(
  resolvedLanguage,
  runtimeApi = globalThis.chrome?.runtime,
  fetchApi = globalThis.fetch
) {
  const locale = I18N_RESOLVED_LANGUAGE_VALUES.includes(resolvedLanguage) ? resolvedLanguage : 'en';

  if (typeof runtimeApi?.getURL !== 'function' || typeof fetchApi !== 'function') {
    return {};
  }

  try {
    const response = await fetchApi(runtimeApi.getURL(`_locales/${locale}/messages.json`));

    if (!response || response.ok === false || typeof response.json !== 'function') {
      return {};
    }

    const messages = await response.json();

    return messages && typeof messages === 'object' ? messages : {};
  } catch (_error) {
    return {};
  }
}

function getLocaleMessage(localeMessages, key, substitutions) {
  const messageKey = String(key ?? '');
  const message = localeMessages?.[messageKey]?.message;

  if (typeof message !== 'string') {
    return '';
  }

  if (!Array.isArray(substitutions)) {
    return message;
  }

  return substitutions.reduce(
    (localizedMessage, substitution, index) =>
      localizedMessage.replaceAll(`$${index + 1}`, String(substitution)),
    message
  );
}

const kotobaUkeMimamoriI18n = Object.freeze({
  getMessage,
  getChromeUiLanguage,
  getLocaleMessage,
  isJapaneseLocale,
  loadLocaleMessages,
  normalizeUiLanguage,
  resolveUiLanguage
});

globalThis.kotobaUkeMimamoriI18n = kotobaUkeMimamoriI18n;

if (typeof module !== 'undefined') {
  module.exports = {
    getMessage,
    getChromeUiLanguage,
    getLocaleMessage,
    isJapaneseLocale,
    loadLocaleMessages,
    normalizeUiLanguage,
    resolveUiLanguage
  };
}
