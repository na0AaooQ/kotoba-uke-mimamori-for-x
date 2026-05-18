'use strict';

function initializeKotobaUkeMimamoriContentScript() {
  // 投稿本文など、センシティブな内容はログに出さない。
  console.info('[kotoba-uke-mimamori] content script initialized');
  startDomMonitoring();
}

function startDomMonitoring() {
  // XのDOM監視・投稿本文抽出・ワンクッション適用は今後ここから開始する。
}

initializeKotobaUkeMimamoriContentScript();

if (typeof module !== 'undefined') {
  module.exports = {
    initializeKotobaUkeMimamoriContentScript,
    startDomMonitoring
  };
}
