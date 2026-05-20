'use strict';

const GENERIC_REASON_MESSAGE_KEY = 'reasonGeneric';
const CUSHION_STYLE_ELEMENT_ID = 'kum-cushion-styles';
const SAFE_REASON_MESSAGE_KEYS = new Set([GENERIC_REASON_MESSAGE_KEY]);
const CUSHION_STYLES = `
.kum-cushion {
  box-sizing: border-box;
  width: auto;
  max-width: 100%;
  margin: 8px 0 10px;
  padding: 12px 14px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 8px;
  background: rgba(255, 247, 237, 0.96);
  color: #3f3f46;
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  box-shadow: 0 2px 10px rgba(120, 53, 15, 0.08);
}

.kum-cushion__title,
.kum-cushion__body,
.kum-cushion__reason {
  padding: 0;
}

.kum-cushion__title {
  margin: 0 0 6px;
  color: #7c4a03;
  font-weight: 700;
}

.kum-cushion__body,
.kum-cushion__reason {
  margin: 4px 0 0;
}

.kum-cushion__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.kum-cushion__button {
  appearance: none;
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 999px;
  padding: 6px 12px;
  background: #ffffff;
  color: #7c4a03;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
}

.kum-cushion__button:hover {
  background: #fffbeb;
}

.kum-cushion__button:focus-visible {
  outline: 2px solid rgba(245, 158, 11, 0.55);
  outline-offset: 2px;
}

.kum-content-blur {
  filter: blur(5px);
  transition: filter 160ms ease;
}

@media (prefers-color-scheme: dark) {
  .kum-cushion {
    border-color: rgba(251, 191, 36, 0.32);
    background: rgba(67, 56, 38, 0.96);
    color: #fef3c7;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.24);
  }

  .kum-cushion__title {
    color: #fde68a;
  }

  .kum-cushion__button {
    border-color: rgba(251, 191, 36, 0.42);
    background: rgba(30, 41, 59, 0.9);
    color: #fde68a;
  }

  .kum-cushion__button:hover {
    background: rgba(51, 65, 85, 0.92);
  }
}
`;

function createCushionElement(result = {}, handlers = {}) {
  ensureCushionStyles();

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

function ensureCushionStyles() {
  const currentDocument = globalThis.document;

  if (!currentDocument || typeof currentDocument.createElement !== 'function') {
    return false;
  }

  if (
    typeof currentDocument.getElementById === 'function' &&
    currentDocument.getElementById(CUSHION_STYLE_ELEMENT_ID)
  ) {
    return false;
  }

  const styleElement = currentDocument.createElement('style');
  styleElement.textContent = CUSHION_STYLES;

  if (typeof styleElement.setAttribute === 'function') {
    styleElement.setAttribute('id', CUSHION_STYLE_ELEMENT_ID);
  }

  const styleParent = currentDocument.head || currentDocument.documentElement;

  if (typeof styleParent?.append === 'function') {
    styleParent.append(styleElement);
    return true;
  }

  if (typeof styleParent?.appendChild === 'function') {
    styleParent.appendChild(styleElement);
    return true;
  }

  return false;
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
    CUSHION_STYLE_ELEMENT_ID,
    createCushionElement,
    ensureCushionStyles,
    GENERIC_REASON_MESSAGE_KEY
  };
}
