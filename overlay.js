'use strict';

const REASON_MESSAGE_KEYS = new Map([
  ['存在否定に近い表現の可能性があります', 'reasonExistenceDenial'],
  ['人格否定に近い表現の可能性があります', 'reasonPersonalityAttack'],
  ['属性への攻撃に近い表現の可能性があります', 'reasonDiscriminatoryAttack'],
  ['強い侮辱表現に近い内容の可能性があります', 'reasonSevereInsult'],
  ['追い詰めるような表現を含む可能性があります', 'reasonPersistentAttack'],
  ['身の安全に不安を感じる可能性のある表現を検知しました', 'reasonThreatOrHarm'],
  ['個人情報や安全に関わる可能性のある表現を検知しました', 'reasonDoxxingOrPrivacyRisk']
]);

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
  const reasons = Array.isArray(result.reasons) ? result.reasons : [];
  const firstReason = reasons.find((reason) => typeof reason === 'string' && reason.trim());

  return REASON_MESSAGE_KEYS.get(firstReason) || 'reasonPotentialBurden';
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
    createCushionElement
  };
}
