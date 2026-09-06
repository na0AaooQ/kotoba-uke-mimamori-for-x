'use strict';

const GENERIC_REASON_MESSAGE_KEY = 'reasonGeneric';
const CUSHION_STYLE_ELEMENT_ID = 'kum-cushion-styles';
const SAFE_REASON_MESSAGE_KEYS = new Set([GENERIC_REASON_MESSAGE_KEY]);
const SAFE_STRENGTH_MESSAGE_KEYS = Object.freeze({
  somewhatStrong: 'cushionGuidanceStrengthSomewhatStrong',
  strong: 'cushionGuidanceStrengthStrong',
  veryStrong: 'cushionGuidanceStrengthVeryStrong'
});
const SAFE_TENDENCY_MESSAGE_KEYS = Object.freeze({
  personalSafety: 'cushionGuidanceTendencyPersonalSafety',
  privacy: 'cushionGuidanceTendencyPrivacy',
  circumstancesOrBackground: 'cushionGuidanceTendencyCircumstancesOrBackground',
  directedStrongLanguage: 'cushionGuidanceTendencyDirectedStrongLanguage',
  possiblyPressuringLanguage: 'cushionGuidanceTendencyPossiblyPressuringLanguage'
});
const MAX_TENDENCY_MESSAGES = 2;
const PROTECT_YOUR_HEART_URLS = Object.freeze({
  ja: 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/protect-your-heart.html',
  en: 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/en/protect-your-heart.html'
});
let state2AccessibleNameIdSequence = 0;
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

.kum-cushion--dismissed {
  padding: 12px 14px;
}

.kum-cushion__title,
.kum-cushion__body,
.kum-cushion__reason,
.kum-cushion__state-2-group {
  padding: 0;
}

.kum-cushion__title,
.kum-cushion__state-2-status {
  color: #7c4a03;
  font-weight: 700;
}

.kum-cushion__title {
  margin: 0 0 6px;
}

.kum-cushion__body,
.kum-cushion__reason {
  margin: 4px 0 0;
}

.kum-cushion__guidance {
  margin-top: 10px;
}

.kum-cushion__guidance-strength,
.kum-cushion__guidance-tendency-label,
.kum-cushion__guidance-note {
  margin: 0;
}

.kum-cushion__guidance-tendency {
  margin-top: 6px;
}

.kum-cushion__guidance-label {
  font-weight: 600;
}

.kum-cushion__guidance-value::before {
  content: ': ';
}

.kum-cushion__guidance-list {
  margin: 2px 0 0;
  padding-left: 1.2em;
}

.kum-cushion__guidance-note {
  margin-top: 6px;
  color: #71717a;
  font-size: 13px;
}

.kum-cushion__state-2-group {
  margin: 0;
}

.kum-cushion__state-2-status,
.kum-cushion__state-2-later {
  display: block;
}

.kum-cushion__state-2-group + .kum-cushion__state-2-group {
  margin-top: 8px;
}

.kum-cushion__protect-link {
  display: inline-block;
  margin-top: 8px;
  color: #7c4a03;
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.kum-cushion__protect-link:hover {
  text-decoration-thickness: 2px;
}

.kum-cushion__protect-link:focus-visible {
  border-radius: 3px;
  outline: 2px solid rgba(245, 158, 11, 0.85);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
}

.kum-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.kum-cushion__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.kum-cushion--dismissed .kum-cushion__actions {
  margin-top: 8px;
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
  outline: 2px solid rgba(245, 158, 11, 0.85);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
}

.kum-content-blur {
  filter: blur(5px);
  transition: filter 160ms ease;
}

@media (prefers-color-scheme: dark) {
  .kum-cushion {
    border-color: rgba(251, 191, 36, 0.38);
    background: rgba(43, 35, 27, 0.96);
    color: #f8efd7;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.28);
  }

  .kum-cushion__title,
  .kum-cushion__state-2-status {
    color: #fde68a;
  }

  .kum-cushion__protect-link {
    color: #fde68a;
  }

  .kum-cushion__protect-link:focus-visible {
    outline-color: rgba(252, 211, 77, 0.95);
    box-shadow: 0 0 0 4px rgba(252, 211, 77, 0.2);
  }

  .kum-cushion__guidance-note {
    color: #d6c9a8;
  }

  .kum-cushion__button {
    border-color: rgba(251, 191, 36, 0.52);
    background: rgba(76, 54, 34, 0.94);
    color: #fde68a;
  }

  .kum-cushion__button:hover {
    background: rgba(92, 64, 38, 0.96);
  }

  .kum-cushion__button:focus-visible {
    outline-color: rgba(252, 211, 77, 0.95);
    box-shadow: 0 0 0 4px rgba(252, 211, 77, 0.2);
  }
}

body[data-color-scheme="dark"] .kum-cushion {
  border-color: rgba(251, 191, 36, 0.38);
  background: rgba(43, 35, 27, 0.96);
  color: #f8efd7;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.28);
}

body[data-color-scheme="dark"] .kum-cushion__title,
body[data-color-scheme="dark"] .kum-cushion__state-2-status {
  color: #fde68a;
}

body[data-color-scheme="dark"] .kum-cushion__protect-link {
  color: #fde68a;
}

body[data-color-scheme="dark"] .kum-cushion__protect-link:focus-visible {
  outline-color: rgba(252, 211, 77, 0.95);
  box-shadow: 0 0 0 4px rgba(252, 211, 77, 0.2);
}

body[data-color-scheme="dark"] .kum-cushion__guidance-note {
  color: #d6c9a8;
}

body[data-color-scheme="dark"] .kum-cushion__button {
  border-color: rgba(251, 191, 36, 0.52);
  background: rgba(76, 54, 34, 0.94);
  color: #fde68a;
}

body[data-color-scheme="dark"] .kum-cushion__button:hover {
  background: rgba(92, 64, 38, 0.96);
}

body[data-color-scheme="dark"] .kum-cushion__button:focus-visible {
  outline-color: rgba(252, 211, 77, 0.95);
  box-shadow: 0 0 0 4px rgba(252, 211, 77, 0.2);
}
`;

function createCushionElement(result = {}, handlers = {}, localization = null) {
  ensureCushionStyles();

  const safeHandlers = handlers && typeof handlers === 'object' ? handlers : {};

  const container = document.createElement('section');
  container.className = 'kum-cushion';
  container.setAttribute('role', 'group');

  const title = document.createElement('p');
  title.className = 'kum-cushion__title';
  title.textContent = getLocalizedMessage('cushionTitle', localization);

  const body = document.createElement('p');
  body.className = 'kum-cushion__body';
  body.textContent = getLocalizedMessage('cushionBody', localization);

  const reason = document.createElement('p');
  reason.className = 'kum-cushion__reason';
  reason.textContent = getLocalizedMessage(resolveReasonMessageKey(result), localization);

  const guidance = createCushionGuidanceElement(result?.guidance, localization);

  const actions = document.createElement('div');
  actions.className = 'kum-cushion__actions';

  const showButton = createButton('buttonShowContent', safeHandlers.onShow, localization);
  let hasEnteredState2 = false;
  const hideButton = createButton(
    'buttonHideForNow',
    () => {
      if (hasEnteredState2) {
        return;
      }

      hasEnteredState2 = true;
      renderDismissedCushionElement(container, safeHandlers, localization);
    },
    localization
  );

  actions.append(showButton, hideButton);
  container.append(title, body, reason);

  if (guidance) {
    container.append(guidance);
  }

  container.append(actions);

  return container;
}

function createCushionGuidanceElement(guidance, localization) {
  const displayData = resolveGuidanceDisplayData(guidance);

  if (!displayData) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'kum-cushion__guidance';

  if (displayData.strengthMessageKey) {
    const strength = document.createElement('p');
    strength.className = 'kum-cushion__guidance-strength';

    const label = document.createElement('span');
    label.className = 'kum-cushion__guidance-label';
    label.textContent = getLocalizedMessage('cushionGuidanceStrengthLabel', localization);

    const value = document.createElement('span');
    value.className = 'kum-cushion__guidance-value';
    value.textContent = getLocalizedMessage(displayData.strengthMessageKey, localization);

    strength.append(label, value);
    container.append(strength);
  }

  if (displayData.tendencyMessageKeys.length > 0) {
    const tendency = document.createElement('div');
    tendency.className = 'kum-cushion__guidance-tendency';

    const label = document.createElement('p');
    label.className = 'kum-cushion__guidance-tendency-label kum-cushion__guidance-label';
    label.textContent = getLocalizedMessage('cushionGuidanceTendencyLabel', localization);

    const list = document.createElement('ul');
    list.className = 'kum-cushion__guidance-list';

    for (const messageKey of displayData.tendencyMessageKeys) {
      const item = document.createElement('li');
      item.className = 'kum-cushion__guidance-item';
      item.textContent = getLocalizedMessage(messageKey, localization);
      list.append(item);
    }

    tendency.append(label, list);
    container.append(tendency);
  }

  const note = document.createElement('p');
  note.className = 'kum-cushion__guidance-note';
  note.textContent = getLocalizedMessage('cushionGuidanceNote', localization);
  container.append(note);

  return container;
}

function resolveGuidanceDisplayData(guidance) {
  if (!guidance || typeof guidance !== 'object' || Array.isArray(guidance)) {
    return null;
  }

  const strengthMessageKey = resolveSafeMessageKey(
    SAFE_STRENGTH_MESSAGE_KEYS,
    guidance.strengthKey
  );
  const tendencyMessageKeys = resolveSafeTendencyMessageKeys(guidance.tendencyKeys);

  if (!strengthMessageKey && tendencyMessageKeys.length === 0) {
    return null;
  }

  return { strengthMessageKey, tendencyMessageKeys };
}

function resolveSafeTendencyMessageKeys(tendencyKeys) {
  if (!Array.isArray(tendencyKeys)) {
    return [];
  }

  const messageKeys = [];
  const seenMessageKeys = new Set();

  for (const tendencyKey of tendencyKeys) {
    const messageKey = resolveSafeMessageKey(SAFE_TENDENCY_MESSAGE_KEYS, tendencyKey);

    if (!messageKey || seenMessageKeys.has(messageKey)) {
      continue;
    }

    seenMessageKeys.add(messageKey);
    messageKeys.push(messageKey);

    if (messageKeys.length === MAX_TENDENCY_MESSAGES) {
      break;
    }
  }

  return messageKeys;
}

function resolveSafeMessageKey(messageKeys, key) {
  if (typeof key !== 'string' || !Object.hasOwn(messageKeys, key)) {
    return null;
  }

  return messageKeys[key];
}

function renderDismissedCushionElement(container, handlers, localization) {
  container.className = 'kum-cushion kum-cushion--dismissed';
  container.textContent = '';
  container.setAttribute('tabindex', '-1');

  const summary = document.createElement('p');
  summary.className = 'kum-cushion__state-2-group kum-cushion__state-2-summary';

  const status = document.createElement('span');
  const accessibleNameId = createState2AccessibleNameId();
  status.className = 'kum-cushion__state-2-status';
  status.setAttribute('id', accessibleNameId);
  status.textContent = getLocalizedMessage('cushionDismissedMessage', localization);

  const later = document.createElement('span');
  later.className = 'kum-cushion__state-2-later';
  later.textContent = getLocalizedMessage('cushionDismissedBody', localization);

  summary.append(status, later);
  container.setAttribute('aria-labelledby', accessibleNameId);

  const leavePost = document.createElement('p');
  leavePost.className = 'kum-cushion__state-2-group kum-cushion__state-2-leave';
  leavePost.textContent = getLocalizedMessage('cushionDismissedLeavePost', localization);

  const distance = document.createElement('p');
  distance.className = 'kum-cushion__state-2-group kum-cushion__state-2-distance';
  distance.textContent = getLocalizedMessage('cushionDismissedDistanceOptions', localization);

  const actions = document.createElement('div');
  actions.className = 'kum-cushion__actions';

  const showButton = createButton('buttonShowContent', handlers.onShow, localization);
  const protectYourHeartLink = createProtectYourHeartLink(localization);

  actions.append(showButton);
  container.append(summary, leavePost, distance);

  if (protectYourHeartLink) {
    container.append(protectYourHeartLink);
  }

  container.append(actions);

  if (typeof container.focus === 'function') {
    container.focus();
  }

  if (typeof handlers.onHide === 'function') {
    handlers.onHide();
  }
}

function createProtectYourHeartLink(localization) {
  const url = resolveProtectYourHeartUrl(localization);

  if (!url) {
    return null;
  }

  const link = document.createElement('a');
  link.className = 'kum-cushion__protect-link';
  link.setAttribute('href', url);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');

  const label = document.createElement('span');
  label.className = 'kum-cushion__protect-link-label';
  label.textContent = getLocalizedMessage('cushionProtectYourHeartLink', localization);

  const indicator = document.createElement('span');
  indicator.className = 'kum-cushion__new-tab-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  indicator.textContent = ' ↗';

  const newTabDescription = document.createElement('span');
  newTabDescription.className = 'kum-visually-hidden';
  newTabDescription.textContent = ` (${getLocalizedMessage('linkOpensInNewTab', localization)})`;

  link.append(label, indicator, newTabDescription);

  return link;
}

function resolveProtectYourHeartUrl(localization) {
  if (localization?.isResolvedLanguageReliable !== true) {
    return null;
  }

  const resolvedLanguage = localization.resolvedLanguage;

  if (!Object.hasOwn(PROTECT_YOUR_HEART_URLS, resolvedLanguage)) {
    return null;
  }

  return PROTECT_YOUR_HEART_URLS[resolvedLanguage];
}

function createState2AccessibleNameId() {
  state2AccessibleNameIdSequence += 1;

  return `kum-cushion-state-2-status-${state2AccessibleNameIdSequence}`;
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

function createButton(messageKey, onClick, localization) {
  const button = document.createElement('button');
  button.className = 'kum-cushion__button';
  button.type = 'button';
  button.textContent = getLocalizedMessage(messageKey, localization);

  if (typeof onClick === 'function') {
    button.addEventListener('click', (event) => {
      if (typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }

      if (typeof event?.stopPropagation === 'function') {
        event.stopPropagation();
      }

      onClick(event);
    });
  }

  return button;
}

function resolveReasonMessageKey(result) {
  if (SAFE_REASON_MESSAGE_KEYS.has(result?.reasonMessageKey)) {
    return result.reasonMessageKey;
  }

  return GENERIC_REASON_MESSAGE_KEY;
}

function getLocalizedMessage(key, localization) {
  if (typeof localization?.getMessage === 'function') {
    try {
      const localizedMessage = localization.getMessage(key);

      if (localizedMessage) {
        return localizedMessage;
      }
    } catch (_error) {
      // Fall through to Chrome's active extension locale.
    }
  }

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
