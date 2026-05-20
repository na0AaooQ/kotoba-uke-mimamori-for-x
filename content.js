'use strict';

const LOG_PREFIX = '[kotoba-uke-mimamori]';
const OBSERVER_DEBOUNCE_MS = 250;

// ワンクッションUIの実画面挿入は開発確認用フラグ配下でのみ有効です。
// 通常状態では画面表示変更を行いません。
const FEATURE_FLAGS = Object.freeze({
  // 開発確認時のみ、候補化済み投稿へのワンクッションUI挿入を許可します。
  enableCushionOverlayDev: false,
  // 開発確認時のみ、安全な固定テスト文言をワンクッション候補として扱います。
  enableDevTestCushionText: false
});

const DEV_TEST_CUSHION_TEXT = '【テスト用】「ことばうけみまもり」のテストメッセージです。';

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

function initialize() {
  if (initialized) {
    return;
  }

  initialized = true;
  // 投稿本文など、センシティブな内容はログに出さない。
  console.info(`${LOG_PREFIX} content script initialized`);
  observeTimeline();
}

function observeTimeline() {
  const root = getDocumentRoot();

  if (!root) {
    console.info(`${LOG_PREFIX} timeline root unavailable`);
    return;
  }

  scanCandidatePosts(root);

  if (timelineObserver || typeof globalThis.MutationObserver !== 'function') {
    return;
  }

  timelineObserver = new globalThis.MutationObserver(() => {
    scheduleCandidatePostScan(root);
  });

  timelineObserver.observe(root, {
    attributeFilter: [ATTRIBUTES.cushionCandidate],
    attributes: true,
    childList: true,
    subtree: true
  });

  console.info(`${LOG_PREFIX} timeline observer started`);
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

  const textNodes = Array.from(postNode.querySelectorAll(SELECTORS.text));

  return textNodes
    .map((textNode) => normalizeExtractedText(textNode.textContent))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function processCandidatePost(postNode, featureFlags = FEATURE_FLAGS) {
  if (!isElement(postNode) || isProcessed(postNode)) {
    maybeRenderCushionOverlay(postNode, featureFlags);

    return SKIPPED_PROCESS_RESULT;
  }

  const postText = extractPostText(postNode);

  if (!postText) {
    markProcessed(postNode);

    return {
      processed: true,
      riskChecked: false,
      shouldCushion: false
    };
  }

  const riskResult = detectPostTextRisk(postText);
  const riskChecked = Boolean(riskResult);
  const shouldCushion = Boolean(
    riskResult?.shouldCushion || shouldForceCushionForDevTest(postText, featureFlags)
  );

  if (riskChecked) {
    markRiskChecked(postNode);
  }

  if (shouldCushion) {
    markCushionCandidate(postNode);
    maybeRenderCushionOverlay(postNode, featureFlags);
  }

  // 通常状態では内部属性は接続準備に留め、画面表示やぼかしには使わない。
  markProcessed(postNode);

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

function maybeRenderCushionOverlay(postNode, featureFlags = FEATURE_FLAGS) {
  if (!featureFlags.enableCushionOverlayDev) {
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

  if (typeof postNode.querySelector === 'function') {
    return postNode.querySelector(SELECTORS.text);
  }

  if (typeof postNode.querySelectorAll === 'function') {
    return postNode.querySelectorAll(SELECTORS.text)[0] || null;
  }

  return null;
}

function isContentRevealed(postNode) {
  const textNode = findFirstPostTextNode(postNode);

  return isElement(textNode) && textNode.getAttribute(ATTRIBUTES.contentRevealed) === 'true';
}

function initializeKotobaUkeMimamoriContentScript() {
  initialize();
}

function startDomMonitoring() {
  observeTimeline();
}

function scanCandidatePosts(root) {
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
      const processResult = processCandidatePost(postNode);

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

function scheduleCandidatePostScan(root) {
  if (scanTimerId !== null) {
    return;
  }

  scanTimerId = globalThis.setTimeout(() => {
    scanTimerId = null;
    scanCandidatePosts(root);
  }, OBSERVER_DEBOUNCE_MS);
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

function detectPostTextRisk(postText) {
  const riskDetector = getRiskDetector();

  if (!riskDetector) {
    return null;
  }

  return riskDetector.detectTextRisk(postText);
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
    DEV_TEST_CUSHION_TEXT,
    FEATURE_FLAGS,
    applyContentBlur,
    SELECTORS,
    detectPostTextRisk,
    extractPostText,
    findCandidatePostNodes,
    findFirstPostTextNode,
    initialize,
    initializeKotobaUkeMimamoriContentScript,
    insertCushionElement,
    isCushionCandidate,
    isCushionRendered,
    isContentRevealed,
    markCushionCandidate,
    markProcessed,
    markCushionRendered,
    markRiskChecked,
    maybeRenderCushionOverlay,
    observeTimeline,
    processCandidatePost,
    removeContentBlur,
    revealPostContent,
    shouldForceCushionForDevTest,
    startDomMonitoring
  };
}
