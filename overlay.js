'use strict';

const GENERIC_REASON_MESSAGE_KEY = 'reasonGeneric';
const SAFE_REASON_MESSAGE_KEYS = new Set([GENERIC_REASON_MESSAGE_KEY]);

function createCushionElement(result = {}, handlers = {}) {
  const safeHandlers = handlers && typeof handlers === 'object' ? handlers : {};

  const container = document.createElement('section');
  container.className = 'kum-cushion';
  container.setAttribute('role', 'group');

  const title = document.createElement('p');
  title.className = 'kum-cushion__title';
  title.textContent = getLocalizedMessage('cushionTitle');

  const body = document.createElement('p');
  body.className = 'kum-cushion__body';
  body.textContent = getLocalizedMessage('cushionBody');

  const reason = document.createElement('p');
  reason.className = 'kum-cushion__reason';
  reason.textContent = getLocalizedMessage(resolveReasonMessageKey(result));

  const actions = document.createElement('div');
  actions.className = 'kum-cushion__actions';

  const showButton = createButton('buttonShowContent', safeHandlers.onShow);
  const hideButton = createButton('buttonHideForNow', safeHandlers.onHide);

  actions.append(showButton, hideButton);
  container.append(title, body, reason, actions);

  return container;
}

function createButton(messageKey, onClick) {
  const button = document.createElement('button');
  button.className = 'kum-cushion__button';
  button.type = 'button';
  button.textContent = getLocalizedMessage(messageKey);

  if (typeof onClick === 'function') {
    button.addEventListener('click', onClick);
  }

  return button;
}

function resolveReasonMessageKey(result) {
  if (SAFE_REASON_MESSAGE_KEYS.has(result?.reasonMessageKey)) {
    return result.reasonMessageKey;
  }

  return GENERIC_REASON_MESSAGE_KEY;
}

function getLocalizedMessage(key) {
  const i18n = globalThis.kotobaUkeMimamoriI18n;

  if (typeof i18n?.getMessage === 'function') {
    return i18n.getMessage(key);
  }

  return key;
}

const kotobaUkeMimamoriOverlay = Object.freeze({
  createCushionElement
});

globalThis.kotobaUkeMimamoriOverlay = kotobaUkeMimamoriOverlay;

if (typeof module !== 'undefined') {
  module.exports = {
    createCushionElement,
    GENERIC_REASON_MESSAGE_KEY
  };
}
