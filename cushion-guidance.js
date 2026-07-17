'use strict';

/**
 * ことばうけみまもり｜Xことばに心のワンクッション
 *
 * 内部の判定結果を、ワンクッションで表示できる最小限の情報へ変換するモジュールです。
 * このファイルでは判定、UI表示、保存、通信を行いません。
 */

const MAX_TENDENCY_KEYS = 2;

const TENDENCY_MAPPINGS = Object.freeze([
  Object.freeze({
    key: 'personalSafety',
    categories: Object.freeze(['threat_or_harm'])
  }),
  Object.freeze({
    key: 'privacy',
    categories: Object.freeze(['doxxing_or_privacy_risk'])
  }),
  Object.freeze({
    key: 'circumstancesOrBackground',
    categories: Object.freeze(['discriminatory_attack'])
  }),
  Object.freeze({
    key: 'directedStrongLanguage',
    categories: Object.freeze(['existence_denial', 'personality_attack', 'severe_insult'])
  }),
  Object.freeze({
    key: 'possiblyPressuringLanguage',
    categories: Object.freeze(['persistent_attack'])
  })
]);

function buildCushionGuidance(riskResult) {
  const strengthKey = resolveStrengthKey(riskResult?.score);
  const guidance = {};

  if (strengthKey) {
    guidance.strengthKey = strengthKey;
  }

  guidance.tendencyKeys = buildTendencyKeys(riskResult?.categories);

  return guidance;
}

function resolveStrengthKey(score) {
  const normalizedScore = normalizeScore(score);

  if (normalizedScore === null || normalizedScore < 60) {
    return undefined;
  }

  if (normalizedScore >= 90) {
    return 'veryStrong';
  }

  if (normalizedScore >= 80) {
    return 'strong';
  }

  return 'somewhatStrong';
}

function normalizeScore(score) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return null;
  }

  return Math.max(0, Math.min(100, score));
}

function buildTendencyKeys(categories) {
  if (!Array.isArray(categories)) {
    return [];
  }

  const categorySet = new Set(categories);

  return TENDENCY_MAPPINGS.filter(({ categories: mappedCategories }) => {
    return mappedCategories.some((category) => categorySet.has(category));
  })
    .map(({ key }) => key)
    .slice(0, MAX_TENDENCY_KEYS);
}

if (typeof globalThis !== 'undefined') {
  globalThis.kotobaUkeMimamoriCushionGuidance = Object.freeze({
    buildCushionGuidance
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildCushionGuidance
  };
}
