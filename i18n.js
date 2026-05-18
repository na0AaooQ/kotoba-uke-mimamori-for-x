'use strict';

function getMessage(key, substitutions) {
  const messageKey = String(key ?? '');

  if (!messageKey) {
    return '';
  }

  const chromeI18n = globalThis.chrome?.i18n;

  if (typeof chromeI18n?.getMessage === 'function') {
    return chromeI18n.getMessage(messageKey, substitutions) || messageKey;
  }

  return messageKey;
}

const kotobaUkeMimamoriI18n = Object.freeze({
  getMessage
});

globalThis.kotobaUkeMimamoriI18n = kotobaUkeMimamoriI18n;

if (typeof module !== 'undefined') {
  module.exports = {
    getMessage
  };
}
