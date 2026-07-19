'use strict';

const assert = require('node:assert/strict');
const { buildCushionGuidance } = require('../cushion-guidance');
const { detectTextRisk } = require('../risk-detector');

function runTests() {
  testSensitivityDoesNotChangeScoreOrGuidanceStrength();
  testDirectedStrongLanguageGuidance();
  testPersonalSafetyGuidance();
  testCircumstancesOrBackgroundGuidance();
  testMultipleTendenciesUseDisplayPriority();

  console.log('All cushion-guidance integration tests passed.');
}

function testSensitivityDoesNotChangeScoreOrGuidanceStrength() {
  const text = '最低な人間です。もう少し説明してください。';
  const results = [100, 80, 60].map((threshold) => detectTextRisk(text, { threshold }));

  assert.deepEqual(
    results.map((result) => result.score),
    [70, 70, 70],
    '感度のしきい値を変えても同じ本文の score は変えない'
  );
  assert.deepEqual(
    results.map((result) => result.shouldCushion),
    [false, false, true],
    '感度はワンクッション表示の判定だけを変える'
  );
  assert.deepEqual(
    results.map((result) => buildCushionGuidance(result).strengthKey),
    ['somewhatStrong', 'somewhatStrong', 'somewhatStrong'],
    '同じ score から生成する表現の強さは感度によって変えない'
  );
}

function testDirectedStrongLanguageGuidance() {
  assertRiskToGuidance({
    text: 'お前なんか存在価値がない',
    expectedScore: 100,
    expectedCategories: ['existence_denial'],
    expectedGuidance: {
      strengthKey: 'veryStrong',
      tendencyKeys: ['directedStrongLanguage']
    }
  });
}

function testPersonalSafetyGuidance() {
  assertRiskToGuidance({
    text: '痛い目にあわせる',
    expectedScore: 95,
    expectedCategories: ['threat_or_harm'],
    expectedGuidance: {
      strengthKey: 'veryStrong',
      tendencyKeys: ['personalSafety']
    }
  });
}

function testCircumstancesOrBackgroundGuidance() {
  assertRiskToGuidance({
    text: '片親のくせに',
    expectedScore: 95,
    expectedCategories: ['discriminatory_attack'],
    expectedGuidance: {
      strengthKey: 'veryStrong',
      tendencyKeys: ['circumstancesOrBackground']
    }
  });
}

function testMultipleTendenciesUseDisplayPriority() {
  assertRiskToGuidance({
    text: 'お前は無能。家まで行く。本名を晒す。',
    expectedScore: 100,
    expectedCategories: ['severe_insult', 'threat_or_harm', 'doxxing_or_privacy_risk'],
    expectedGuidance: {
      strengthKey: 'veryStrong',
      tendencyKeys: ['personalSafety', 'privacy']
    }
  });
}

function assertRiskToGuidance({ text, expectedScore, expectedCategories, expectedGuidance }) {
  const riskResult = detectTextRisk(text);

  assert.equal(riskResult.shouldCushion, true, `代表的な高リスク表現を対象にする: ${text}`);
  assert.equal(riskResult.score, expectedScore, `実際の score を期待どおりに返す: ${text}`);
  assert.deepEqual(
    riskResult.categories,
    expectedCategories,
    `実際の内部カテゴリを期待どおりに返す: ${text}`
  );
  assert.deepEqual(
    buildCushionGuidance(riskResult),
    expectedGuidance,
    `安全な guidance へ期待どおりに変換する: ${text}`
  );
}

runTests();
