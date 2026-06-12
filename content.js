'use strict';

const LOG_PREFIX = '[kotoba-uke-mimamori]';
const OBSERVER_DEBOUNCE_MS = 250;

// 開発用フラグは、通常ユーザー向け設定とは分離して扱います。
const FEATURE_FLAGS = Object.freeze({
  // 開発確認時のみ、候補化済み投稿へのワンクッションUI挿入を許可します。
  enableCushionOverlayDev: false,
  // 開発確認時のみ、安全な固定テスト文言をワンクッション候補として扱います。
  enableDevTestCushionText: false
});

const DEV_TEST_CUSHION_TEXT = '【テスト用】「ことばうけみまもり」のテストメッセージです。';

const CUSHION_THRESHOLDS = Object.freeze({
  low: 100,
  standard: 80,
  high: 60
});

const FALLBACK_SETTINGS = Object.freeze({
  enabled: false,
  cushionSensitivity: 'standard'
});

const ATTRIBUTES = Object.freeze({
  processed: 'data-kum-processed',
  riskChecked: 'data-kum-risk-checked',
  cushionCandidate: 'data-kum-cushion-candidate',
  cushionRendered: 'data-kum-cushion-rendered',
  contentBlurred: 'data-kum-content-blurred',
  contentRevealed: 'data-kum-content-revealed'
});

const CLASSES = Object.freeze({
  contentBlur: 'kum-content-blur'
});

const SELECTORS = Object.freeze({
  post: 'article[data-testid="tweet"], article',
  text: '[data-testid="tweetText"]'
});

const SKIPPED_PROCESS_RESULT = Object.freeze({
  processed: false,
  riskChecked: false,
  shouldCushion: false
});

let initialized = false;
let timelineObserver = null;
let scanTimerId = null;
let isScanning = false;
let hasLoggedInitialScan = false;

async function initialize(settingsApi = getSettingsApi(), featureFlags = FEATURE_FLAGS) {
  if (initialized) {
    return false;
  }

  initialized = true;
  // 投稿本文など、センシティブな内容はログに出さない。
  console.info(`${LOG_PREFIX} content script initialized`);

  const settings = await loadContentSettings(settingsApi);

  if (!isCushionFeatureEnabled(settings, featureFlags)) {
    console.info(`${LOG_PREFIX} feature disabled`);
    return false;
  }

  observeTimeline(settings, featureFlags);
  return true;
}

function observeTimeline(settings = getDefaultSettings(), featureFlags = FEATURE_FLAGS) {
  if (!isCushionFeatureEnabled(settings, featureFlags)) {
    return false;
  }

  const root = getDocumentRoot();

  if (!root) {
    console.info(`${LOG_PREFIX} timeline root unavailable`);
    return false;
  }

  scanCandidatePosts(root, settings, featureFlags);

  if (timelineObserver || typeof globalThis.MutationObserver !== 'function') {
    return true;
  }

  timelineObserver = new globalThis.MutationObserver(() => {
    scheduleCandidatePostScan(root, settings, featureFlags);
  });

  timelineObserver.observe(root, {
    attributeFilter: [ATTRIBUTES.cushionCandidate],
    attributes: true,
    childList: true,
    subtree: true
  });

  console.info(`${LOG_PREFIX} timeline observer started`);
  return true;
}

function findCandidatePostNodes(root) {
  if (!root) {
    return [];
  }

  const candidatePostNodes = [];

  if (matchesSelector(root, SELECTORS.post)) {
    candidatePostNodes.push(root);
  }

  if (typeof root.querySelectorAll !== 'function') {
    return candidatePostNodes;
  }

  for (const postNode of root.querySelectorAll(SELECTORS.post)) {
    candidatePostNodes.push(postNode);
  }

  return Array.from(new Set(candidatePostNodes));
}

function extractPostText(postNode) {
  if (!postNode || typeof postNode.querySelectorAll !== 'function') {
    return '';
  }

  const textNodes = findPostTextNodes(postNode);

  return textNodes
    .map((textNode) => normalizeExtractedText(textNode.textContent))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function processCandidatePost(
  postNode,
  featureFlags = FEATURE_FLAGS,
  settings = getDefaultSettings()
) {
  if (!isCushionFeatureEnabled(settings, featureFlags)) {
    return SKIPPED_PROCESS_RESULT;
  }

  if (!isElement(postNode)) {
    return SKIPPED_PROCESS_RESULT;
  }

  if (isProcessed(postNode)) {
    maybeRenderCushionOverlay(postNode, featureFlags, settings);

    return SKIPPED_PROCESS_RESULT;
  }

  const textTargets = findPostTextTargets(postNode);

  if (textTargets.length === 0) {
    markProcessed(postNode);

    return {
      processed: true,
      riskChecked: false,
      shouldCushion: false
    };
  }

  if (!textTargets.some((textTarget) => normalizeExtractedText(textTarget.textNode?.textContent))) {
    markProcessed(postNode);

    return {
      processed: true,
      riskChecked: false,
      shouldCushion: false
    };
  }

  let processed = false;
  let riskChecked = false;
  let shouldCushion = false;

  for (const textTarget of textTargets) {
    const processResult = processPostTextTarget(textTarget, featureFlags, settings);

    processed ||= processResult.processed;
    riskChecked ||= processResult.riskChecked;
    shouldCushion ||= processResult.shouldCushion;
  }

  return {
    processed,
    riskChecked,
    shouldCushion
  };
}

function processPostTextTarget(
  textTarget,
  featureFlags = FEATURE_FLAGS,
  settings = getDefaultSettings()
) {
  const { targetNode, textNode } = textTarget;

  if (!isElement(targetNode) || isProcessed(targetNode)) {
    maybeRenderCushionOverlay(targetNode, featureFlags, settings);

    return SKIPPED_PROCESS_RESULT;
  }

  const postText = normalizeExtractedText(textNode?.textContent);

  if (!postText) {
    markProcessed(targetNode);

    return {
      processed: true,
      riskChecked: false,
      shouldCushion: false
    };
  }

  const riskResult = detectPostTextRisk(postText, settings);
  const riskChecked = Boolean(riskResult);
  const shouldCushion = Boolean(
    riskResult?.shouldCushion || shouldForceCushionForDevTest(postText, featureFlags)
  );

  if (riskChecked) {
    markRiskChecked(targetNode);
  }

  if (shouldCushion) {
    markCushionCandidate(targetNode);
    maybeRenderCushionOverlay(targetNode, featureFlags, settings);
  }

  markProcessed(targetNode);

  return {
    processed: true,
    riskChecked,
    shouldCushion
  };
}

function shouldForceCushionForDevTest(postText, featureFlags = FEATURE_FLAGS) {
  return Boolean(
    featureFlags.enableCushionOverlayDev &&
      featureFlags.enableDevTestCushionText &&
      typeof postText === 'string' &&
      postText.includes(DEV_TEST_CUSHION_TEXT)
  );
}

function markProcessed(postNode) {
  if (!isElement(postNode)) {
    return;
  }

  postNode.setAttribute(ATTRIBUTES.processed, 'true');
}

function markRiskChecked(postNode) {
  if (!isElement(postNode)) {
    return;
  }

  postNode.setAttribute(ATTRIBUTES.riskChecked, 'true');
}

function markCushionCandidate(postNode) {
  if (!isElement(postNode)) {
    return;
  }

  postNode.setAttribute(ATTRIBUTES.cushionCandidate, 'true');
}

function markCushionRendered(postNode) {
  if (!isElement(postNode)) {
    return;
  }

  postNode.setAttribute(ATTRIBUTES.cushionRendered, 'true');
}

function maybeRenderCushionOverlay(
  postNode,
  featureFlags = FEATURE_FLAGS,
  settings = getDefaultSettings()
) {
  if (!isCushionFeatureEnabled(settings, featureFlags)) {
    return false;
  }

  if (!isCushionCandidate(postNode) || isCushionRendered(postNode)) {
    return false;
  }

  const overlay = getCushionOverlay();

  if (!overlay) {
    return false;
  }

  let cushionElement = null;
  cushionElement = overlay.createCushionElement(
    {
      reasonMessageKey: 'reasonGeneric'
    },
    {
      onShow: () => {
        revealPostContent(postNode, cushionElement);
      },
      onHide: () => {
        keepPostContentHidden(postNode);
      }
    }
  );

  if (!isElement(cushionElement)) {
    return false;
  }

  if (!insertCushionElement(postNode, cushionElement)) {
    return false;
  }

  applyContentBlur(postNode);
  markCushionRendered(postNode);

  return true;
}

function applyContentBlur(postNode) {
  const textNode = findFirstPostTextNode(postNode);

  if (!isElement(textNode) || isContentRevealed(postNode)) {
    return false;
  }

  if (typeof textNode.classList?.add === 'function') {
    textNode.classList.add(CLASSES.contentBlur);
  } else {
    appendClassName(textNode, CLASSES.contentBlur);
  }

  textNode.setAttribute(ATTRIBUTES.contentBlurred, 'true');

  return true;
}

function revealPostContent(postNode, cushionElement) {
  const textNode = findFirstPostTextNode(postNode);

  if (isElement(textNode)) {
    removeContentBlur(textNode);
    if (typeof textNode.removeAttribute === 'function') {
      textNode.removeAttribute(ATTRIBUTES.contentBlurred);
    }
    textNode.setAttribute(ATTRIBUTES.contentRevealed, 'true');
  }

  if (typeof cushionElement?.remove === 'function') {
    cushionElement.remove();
  }

  return undefined;
}

function keepPostContentHidden() {
  return undefined;
}

function removeContentBlur(textNode) {
  if (!isElement(textNode)) {
    return false;
  }

  if (typeof textNode.classList?.remove === 'function') {
    textNode.classList.remove(CLASSES.contentBlur);
  } else {
    removeClassName(textNode, CLASSES.contentBlur);
  }

  return true;
}

function insertCushionElement(postNode, cushionElement) {
  const textNode = findFirstPostTextNode(postNode);

  if (isElement(textNode) && typeof textNode.parentNode?.insertBefore === 'function') {
    textNode.parentNode.insertBefore(cushionElement, textNode);
    return true;
  }

  if (typeof postNode.insertBefore === 'function') {
    postNode.insertBefore(cushionElement, postNode.firstChild || null);
    return true;
  }

  return false;
}

function findFirstPostTextNode(postNode) {
  if (!isElement(postNode)) {
    return null;
  }

  if (matchesSelector(postNode, SELECTORS.text)) {
    return postNode;
  }

  if (typeof postNode.querySelector === 'function') {
    return postNode.querySelector(SELECTORS.text);
  }

  if (typeof postNode.querySelectorAll === 'function') {
    return postNode.querySelectorAll(SELECTORS.text)[0] || null;
  }

  return null;
}

function findPostTextNodes(postNode) {
  if (!isElement(postNode)) {
    return [];
  }

  if (matchesSelector(postNode, SELECTORS.text)) {
    return [postNode];
  }

  if (typeof postNode.querySelectorAll !== 'function') {
    return [];
  }

  return Array.from(postNode.querySelectorAll(SELECTORS.text));
}

function findPostTextTargets(postNode) {
  const textNodes = findPostTextNodes(postNode);

  if (textNodes.length <= 1) {
    return textNodes.map((textNode) => ({
      targetNode: postNode,
      textNode
    }));
  }

  return textNodes.map((textNode) => ({
    targetNode: textNode,
    textNode
  }));
}

function isContentRevealed(postNode) {
  const textNode = findFirstPostTextNode(postNode);

  return isElement(textNode) && textNode.getAttribute(ATTRIBUTES.contentRevealed) === 'true';
}

function initializeKotobaUkeMimamoriContentScript() {
  return initialize();
}

function startDomMonitoring(settings = getDefaultSettings(), featureFlags = FEATURE_FLAGS) {
  return observeTimeline(settings, featureFlags);
}

function scanCandidatePosts(root, settings = getDefaultSettings(), featureFlags = FEATURE_FLAGS) {
  if (!isCushionFeatureEnabled(settings, featureFlags)) {
    return;
  }

  if (isScanning) {
    return;
  }

  isScanning = true;

  try {
    const candidatePostNodes = findCandidatePostNodes(root);
    let processedCount = 0;
    let riskCheckedCount = 0;
    let cushionCandidateCount = 0;

    for (const postNode of candidatePostNodes) {
      const processResult = processCandidatePost(postNode, featureFlags, settings);

      if (processResult.processed) {
        processedCount += 1;
      }

      if (processResult.riskChecked) {
        riskCheckedCount += 1;
      }

      if (processResult.shouldCushion) {
        cushionCandidateCount += 1;
      }
    }

    if (!hasLoggedInitialScan || processedCount > 0) {
      console.info(`${LOG_PREFIX} candidate posts scanned: ${candidatePostNodes.length}`);
      console.info(`${LOG_PREFIX} new candidate posts processed: ${processedCount}`);
      console.info(`${LOG_PREFIX} risk checked posts: ${riskCheckedCount}`);
      console.info(`${LOG_PREFIX} cushion candidates: ${cushionCandidateCount}`);
      hasLoggedInitialScan = true;
    }
  } finally {
    isScanning = false;
  }
}

function scheduleCandidatePostScan(
  root,
  settings = getDefaultSettings(),
  featureFlags = FEATURE_FLAGS
) {
  if (scanTimerId !== null) {
    return;
  }

  scanTimerId = globalThis.setTimeout(() => {
    scanTimerId = null;
    scanCandidatePosts(root, settings, featureFlags);
  }, OBSERVER_DEBOUNCE_MS);
}

async function loadContentSettings(settingsApi = getSettingsApi()) {
  if (!settingsApi || typeof settingsApi.loadSettings !== 'function') {
    return normalizeContentSettings();
  }

  try {
    return normalizeContentSettings(await settingsApi.loadSettings(), settingsApi);
  } catch (_error) {
    return normalizeContentSettings(undefined, settingsApi);
  }
}

function normalizeContentSettings(settings, settingsApi = getSettingsApi()) {
  const defaultSettings = getDefaultSettings(settingsApi);
  const normalizedSettings =
    settingsApi && typeof settingsApi.normalizeSettings === 'function'
      ? settingsApi.normalizeSettings(settings)
      : settings;

  return {
    enabled:
      normalizedSettings && typeof normalizedSettings.enabled === 'boolean'
        ? normalizedSettings.enabled
        : defaultSettings.enabled,
    cushionSensitivity: normalizeCushionSensitivity(normalizedSettings?.cushionSensitivity)
  };
}

function isCushionFeatureEnabled(settings = getDefaultSettings(), featureFlags = FEATURE_FLAGS) {
  return Boolean(settings?.enabled || featureFlags.enableCushionOverlayDev);
}

function getDefaultSettings(settingsApi = getSettingsApi()) {
  return settingsApi?.DEFAULT_SETTINGS ?? FALLBACK_SETTINGS;
}

function getSettingsApi() {
  const settingsApi = globalThis.kotobaUkeMimamoriSettings;

  if (!settingsApi || typeof settingsApi !== 'object') {
    return null;
  }

  return settingsApi;
}

function getDocumentRoot() {
  const currentDocument = globalThis.document;

  if (!currentDocument) {
    return null;
  }

  return currentDocument.body || currentDocument.documentElement;
}

function isElement(node) {
  return Boolean(node && node.nodeType === 1);
}

function appendClassName(node, className) {
  const currentClassName = typeof node.className === 'string' ? node.className : '';
  const classNames = new Set(currentClassName.split(/\s+/u).filter(Boolean));
  classNames.add(className);
  node.className = Array.from(classNames).join(' ');
}

function removeClassName(node, className) {
  const currentClassName = typeof node.className === 'string' ? node.className : '';
  node.className = currentClassName
    .split(/\s+/u)
    .filter((currentName) => currentName && currentName !== className)
    .join(' ');
}

function isProcessed(postNode) {
  return postNode.getAttribute(ATTRIBUTES.processed) === 'true';
}

function isCushionCandidate(postNode) {
  return isElement(postNode) && postNode.getAttribute(ATTRIBUTES.cushionCandidate) === 'true';
}

function isCushionRendered(postNode) {
  return isElement(postNode) && postNode.getAttribute(ATTRIBUTES.cushionRendered) === 'true';
}

function matchesSelector(node, selector) {
  return isElement(node) && typeof node.matches === 'function' && node.matches(selector);
}

function detectPostTextRisk(postText, settings = getDefaultSettings()) {
  const riskDetector = getRiskDetector();

  if (!riskDetector) {
    return null;
  }

  return riskDetector.detectTextRisk(postText, {
    threshold: getCushionThreshold(settings?.cushionSensitivity)
  });
}

function getCushionThreshold(cushionSensitivity) {
  return CUSHION_THRESHOLDS[normalizeCushionSensitivity(cushionSensitivity)];
}

function normalizeCushionSensitivity(cushionSensitivity) {
  if (Object.hasOwn(CUSHION_THRESHOLDS, cushionSensitivity)) {
    return cushionSensitivity;
  }

  return FALLBACK_SETTINGS.cushionSensitivity;
}

function getRiskDetector() {
  const riskDetector = globalThis.kotobaUkeMimamoriRiskDetector;

  if (!riskDetector || typeof riskDetector.detectTextRisk !== 'function') {
    return null;
  }

  return riskDetector;
}

function getCushionOverlay() {
  const overlay = globalThis.kotobaUkeMimamoriOverlay;

  if (!overlay || typeof overlay.createCushionElement !== 'function') {
    return null;
  }

  return overlay;
}

function normalizeExtractedText(text) {
  if (typeof text !== 'string') {
    return '';
  }

  return text.replace(/\s+/gu, ' ').trim();
}

if (globalThis.document) {
  initializeKotobaUkeMimamoriContentScript();
}

if (typeof module !== 'undefined') {
  module.exports = {
    ATTRIBUTES,
    CLASSES,
    CUSHION_THRESHOLDS,
    DEV_TEST_CUSHION_TEXT,
    FEATURE_FLAGS,
    FALLBACK_SETTINGS,
    applyContentBlur,
    SELECTORS,
    detectPostTextRisk,
    extractPostText,
    findCandidatePostNodes,
    findFirstPostTextNode,
    initialize,
    initializeKotobaUkeMimamoriContentScript,
    insertCushionElement,
    isCushionFeatureEnabled,
    isCushionCandidate,
    isCushionRendered,
    isContentRevealed,
    getCushionThreshold,
    loadContentSettings,
    markCushionCandidate,
    markProcessed,
    markCushionRendered,
    markRiskChecked,
    maybeRenderCushionOverlay,
    normalizeContentSettings,
    observeTimeline,
    processCandidatePost,
    removeContentBlur,
    revealPostContent,
    scanCandidatePosts,
    shouldForceCushionForDevTest,
    startDomMonitoring
  };
}
