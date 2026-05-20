'use strict';

const LOG_PREFIX = '[kotoba-uke-mimamori]';
const OBSERVER_DEBOUNCE_MS = 250;

// ワンクッションUIの実画面挿入は開発確認用フラグ配下でのみ有効です。
// 通常状態では画面表示変更を行いません。
const FEATURE_FLAGS = Object.freeze({
  enableCushionOverlayDev: false
});

const ATTRIBUTES = Object.freeze({
  processed: 'data-kum-processed',
  riskChecked: 'data-kum-risk-checked',
  cushionCandidate: 'data-kum-cushion-candidate',
  cushionRendered: 'data-kum-cushion-rendered'
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

function processCandidatePost(postNode) {
  if (!isElement(postNode) || isProcessed(postNode)) {
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
  const shouldCushion = Boolean(riskResult?.shouldCushion);

  if (riskChecked) {
    markRiskChecked(postNode);
  }

  if (shouldCushion) {
    markCushionCandidate(postNode);
    maybeRenderCushionOverlay(postNode);
  }

  // 通常状態では内部属性は接続準備に留め、画面表示やぼかしには使わない。
  markProcessed(postNode);

  return {
    processed: true,
    riskChecked,
    shouldCushion
  };
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
        if (typeof cushionElement?.remove === 'function') {
          cushionElement.remove();
        }
      },
      onHide: keepCushionOverlayVisible
    }
  );

  if (!isElement(cushionElement) || typeof postNode.insertBefore !== 'function') {
    return false;
  }

  postNode.insertBefore(cushionElement, postNode.firstChild || null);
  markCushionRendered(postNode);

  return true;
}

function keepCushionOverlayVisible() {
  return undefined;
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
    FEATURE_FLAGS,
    SELECTORS,
    detectPostTextRisk,
    extractPostText,
    findCandidatePostNodes,
    initialize,
    initializeKotobaUkeMimamoriContentScript,
    isCushionCandidate,
    isCushionRendered,
    markCushionCandidate,
    markProcessed,
    markCushionRendered,
    markRiskChecked,
    maybeRenderCushionOverlay,
    observeTimeline,
    processCandidatePost,
    startDomMonitoring
  };
}
