'use strict';

/**
 * risk-detector.js の簡易テスト。
 *
 * MVPでは「危険な表現を拾うこと」だけでなく、
 * 「健全な批判・引用・被害経験の共有を過検知しないこと」を重視します。
 *
 * 実行方法:
 *   node risk-detector.test.js
 */

const assert = require('node:assert/strict');
const {
  detectTextRisk,
  normalizeText,
  RISK_LEVELS,
  DEFAULT_CUSHION_THRESHOLD
} = require('../risk-detector');

function runTests() {
  testHealthyCriticismShouldNotCushion();
  testQuotedOrContextualTextShouldNotCushion();
  testHighRiskTextShouldCushion();
  testThresholdBehavior();
  testPressurePhraseActsAsSupportingSignal();
  testPressurePhraseRaisesRiskInPressuringContext();
  testNormalizeText();
  testEmptyText();

  console.log('All risk-detector tests passed.');
}

function testHealthyCriticismShouldNotCushion() {
  const cases = [
    'その意見には反対です',
    'その考え方には反対です',
    'その説明は不十分だと思います',
    '根拠を示してほしいです',
    '事実と違うと思います',
    'その対応は不適切だと思います',
    '私は賛成できません',
    'その発言は誤解を招くと思います',
    'もう少し丁寧に説明してほしいです'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text);

    assert.equal(result.shouldCushion, false, `健全な批判はワンクッション対象外にする: ${text}`);
  }
}

function testQuotedOrContextualTextShouldNotCushion() {
  const cases = [
    '「消えろ」と言われてつらかった',
    '「存在価値がない」と言われて傷ついた',
    '人に「存在価値がない」と言うのはよくない',
    'こういう表現はやめよう',
    '人格否定はやめよう',
    '誹謗中傷はやめよう',
    '「お前は無能」と言われた'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text);

    assert.equal(
      result.shouldCushion,
      false,
      `引用・注意喚起・被害経験の共有はワンクッション対象外にする: ${text}`
    );
  }
}

function testHighRiskTextShouldCushion() {
  const cases = [
    {
      text: 'お前なんか存在価値がない',
      category: 'existence_denial'
    },
    {
      text: '消えろ',
      category: 'existence_denial'
    },
    {
      text: '人として終わってる',
      category: 'personality_attack'
    },
    {
      text: 'お前みたいな人間はまともじゃない',
      category: 'personality_attack'
    },
    {
      text: 'お前は無能',
      category: 'severe_insult'
    },
    {
      text: '本名晒すぞ',
      category: 'doxxing_or_privacy_risk'
    },
    {
      text: '痛い目にあわせる',
      category: 'threat_or_harm'
    }
  ];

  for (const { text, category } of cases) {
    const result = detectTextRisk(text);

    assert.equal(result.shouldCushion, true, `高リスク表現はワンクッション対象にする: ${text}`);

    assert.equal(
      result.riskLevel,
      RISK_LEVELS.HIGH,
      `高リスク表現は riskLevel=high にする: ${text}`
    );

    assert.ok(result.categories.includes(category), `期待カテゴリ ${category} を含める: ${text}`);

    assert.ok(result.reasons.length > 0, `高リスク表現には理由を含める: ${text}`);
  }
}

function testThresholdBehavior() {
  const result = detectTextRisk('人として終わってる', {
    threshold: 90
  });

  assert.equal(
    result.riskLevel,
    RISK_LEVELS.HIGH,
    '内部リスクレベルはスコアに基づいて high のままにする'
  );

  assert.equal(
    result.shouldCushion,
    false,
    'threshold を上げた場合、score が threshold 未満ならワンクッションしない'
  );

  assert.equal(DEFAULT_CUSHION_THRESHOLD, 80, 'MVPのデフォルトしきい値は80にする');
}

function testPressurePhraseActsAsSupportingSignal() {
  const cases = [
    '何度でも繰り返しますが、テストメッセージになります。',
    '何度でも繰り返しますが、資料の提出期限は明日です。'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text);

    assert.ok(
      result.matchedRules.includes('persistent_attack.pressure_phrase'),
      `追加表現は圧のある文脈の補助シグナルとして検知する: ${text}`
    );

    assert.ok(
      result.categories.includes('persistent_attack'),
      `追加表現は persistent_attack カテゴリに含める: ${text}`
    );

    assert.equal(result.score, 20, `追加表現のみの加点は補助的な20点に留める: ${text}`);

    assert.equal(
      result.shouldCushion,
      false,
      `追加表現単体ではワンクッション対象にしない: ${text}`
    );
  }
}

function testPressurePhraseRaisesRiskInPressuringContext() {
  const phraseOnly = detectTextRisk('何度でも繰り返しますが、資料の提出期限は明日です。');
  const directedPressure = detectTextRisk(
    '何度でも繰り返しますが、あなたは何回言えば分かるんですか。'
  );

  assert.ok(
    directedPressure.score > phraseOnly.score,
    '相手へ直接向けた圧のある文脈では、追加表現単体よりリスクスコアを高める'
  );

  assert.ok(
    directedPressure.matchedRules.includes('persistent_attack.pressure_phrase'),
    '圧のある文脈でも persistent_attack の関連ルールを含める'
  );

  assert.ok(
    directedPressure.matchedRules.includes('direct_attack.second_person'),
    '相手へ直接向けた文脈は二人称による加点を含める'
  );

  assert.equal(
    directedPressure.shouldCushion,
    false,
    '補助シグナルと二人称のみでは過剰にワンクッション対象にしない'
  );

  const combinedHighRisk = detectTextRisk(
    '何度でも繰り返しますが、あなたは無能です。何回言えば分かるんですか。'
  );

  assert.ok(
    combinedHighRisk.score >= DEFAULT_CUSHION_THRESHOLD,
    '圧のある表現と強い侮辱が重なる場合は本番しきい値以上になる'
  );

  assert.ok(
    combinedHighRisk.matchedRules.includes('persistent_attack.pressure_phrase'),
    '高リスク文脈でも追加した補助シグナルを検知する'
  );

  assert.ok(
    combinedHighRisk.matchedRules.includes('severe_insult.strong_word'),
    '高リスク文脈では組み合わさった強い侮辱ルールも検知する'
  );

  assert.equal(
    combinedHighRisk.shouldCushion,
    true,
    '圧のある表現と高リスク表現が重なる場合はワンクッション対象にする'
  );
}

function testNormalizeText() {
  assert.equal(normalizeText('　消えろ　'), '消えろ', '全角スペースを含む前後空白を正規化する');

  assert.equal(
    normalizeText('存在価値がない\n\nと思う'),
    '存在価値がない と思う',
    '連続する空白や改行を半角スペースにまとめる'
  );
}

function testEmptyText() {
  const cases = ['', '   ', null, undefined];

  for (const text of cases) {
    const result = detectTextRisk(text);

    assert.equal(
      result.shouldCushion,
      false,
      `空文字やnull相当はワンクッション対象外にする: ${String(text)}`
    );

    assert.equal(result.score, 0, `空文字やnull相当は score=0 にする: ${String(text)}`);

    assert.deepEqual(
      result.categories,
      [],
      `空文字やnull相当はカテゴリなしにする: ${String(text)}`
    );
  }
}

runTests();
