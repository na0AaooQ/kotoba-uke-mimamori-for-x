'use strict';

const assert = require('node:assert/strict');
const { buildCushionGuidance } = require('../cushion-guidance');

function runTests() {
  testStrengthKeyBoundaries();
  testInvalidScoresAreHandledSafely();
  testInternalCategoriesMapToDisplayKeys();
  testDirectedStrongLanguageCategoriesAreCombined();
  testTendencyKeysAreDeduplicated();
  testTendencyKeysAreLimitedToTwoByDisplayPriority();
  testUnknownCategoriesAreIgnored();
  testOnlyDisplayGuidanceIsReturned();

  console.log('All cushion-guidance tests passed.');
}

function testStrengthKeyBoundaries() {
  const cases = [
    { score: 0, expected: undefined },
    { score: 59, expected: undefined },
    { score: 60, expected: 'somewhatStrong' },
    { score: 79, expected: 'somewhatStrong' },
    { score: 80, expected: 'strong' },
    { score: 89, expected: 'strong' },
    { score: 90, expected: 'veryStrong' },
    { score: 100, expected: 'veryStrong' }
  ];

  for (const { score, expected } of cases) {
    const guidance = buildCushionGuidance({ score });

    assert.equal(
      guidance.strengthKey,
      expected,
      `score ${score} should use the expected strength key`
    );

    if (expected === undefined) {
      assert.deepEqual(guidance, { tendencyKeys: [] });
    }
  }
}

function testInvalidScoresAreHandledSafely() {
  for (const score of [undefined, null, Number.NaN, '80', -1]) {
    const guidance = buildCushionGuidance({ score });

    assert.equal(
      guidance.strengthKey,
      undefined,
      `invalid score ${String(score)} should not add a key`
    );
  }

  assert.equal(buildCushionGuidance({ score: 101 }).strengthKey, 'veryStrong');
}

function testInternalCategoriesMapToDisplayKeys() {
  const cases = [
    { category: 'threat_or_harm', expected: 'personalSafety' },
    { category: 'doxxing_or_privacy_risk', expected: 'privacy' },
    { category: 'discriminatory_attack', expected: 'circumstancesOrBackground' },
    { category: 'existence_denial', expected: 'directedStrongLanguage' },
    { category: 'personality_attack', expected: 'directedStrongLanguage' },
    { category: 'severe_insult', expected: 'directedStrongLanguage' },
    { category: 'persistent_attack', expected: 'possiblyPressuringLanguage' }
  ];

  for (const { category, expected } of cases) {
    assert.deepEqual(buildCushionGuidance({ categories: [category] }).tendencyKeys, [expected]);
  }
}

function testDirectedStrongLanguageCategoriesAreCombined() {
  const guidance = buildCushionGuidance({
    categories: ['existence_denial', 'personality_attack', 'severe_insult']
  });

  assert.deepEqual(guidance.tendencyKeys, ['directedStrongLanguage']);
}

function testTendencyKeysAreDeduplicated() {
  const guidance = buildCushionGuidance({
    categories: [
      'persistent_attack',
      'persistent_attack',
      'existence_denial',
      'personality_attack',
      'existence_denial'
    ]
  });

  assert.deepEqual(guidance.tendencyKeys, ['directedStrongLanguage', 'possiblyPressuringLanguage']);
}

function testTendencyKeysAreLimitedToTwoByDisplayPriority() {
  const guidance = buildCushionGuidance({
    categories: ['persistent_attack', 'severe_insult', 'doxxing_or_privacy_risk', 'threat_or_harm']
  });

  assert.deepEqual(guidance.tendencyKeys, ['personalSafety', 'privacy']);
}

function testUnknownCategoriesAreIgnored() {
  assert.deepEqual(buildCushionGuidance({ categories: ['unknown_category'] }).tendencyKeys, []);

  assert.deepEqual(
    buildCushionGuidance({ categories: ['unknown_category', 'persistent_attack'] }).tendencyKeys,
    ['possiblyPressuringLanguage']
  );

  assert.deepEqual(buildCushionGuidance({ categories: 'persistent_attack' }).tendencyKeys, []);
}

function testOnlyDisplayGuidanceIsReturned() {
  const guidance = buildCushionGuidance({
    score: 80,
    categories: ['existence_denial'],
    reasons: ['internal reason'],
    matchedRules: ['internal.rule'],
    riskLevel: 'high',
    shouldCushion: true,
    text: 'sensitive text',
    url: 'https://x.com/example/status/1',
    user: { id: 'example' }
  });

  assert.deepEqual(guidance, {
    strengthKey: 'strong',
    tendencyKeys: ['directedStrongLanguage']
  });
  assert.deepEqual(Object.keys(guidance).sort(), ['strengthKey', 'tendencyKeys']);
}

runTests();
