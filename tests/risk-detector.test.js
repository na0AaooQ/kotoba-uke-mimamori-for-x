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
  testHiraganaShineFalsePositivesShouldNotCushionAtStandardSensitivity();
  testHiraganaShineHarmPhrasesShouldStillCushionAtStandardSensitivity();
  testScoreIsClampedAtOneHundred();
  testKatakanaWordsContainingCasShouldNotBeDetectedAsSevereInsult();
  testFamilyBackgroundSelfDescriptionShouldNotCushion();
  testFamilyBackgroundInsultContextShouldCushion();
  testDisabilitySupportContextShouldNotCushion();
  testDisabilityInsultContextShouldCushion();
  testPhysicalWasteWarningShouldNotCushionAtStandardSensitivity();
  testGomiInsultsShouldStillCushionAtStandardSensitivity();
  testSevereInsultStrongWordsShouldCushionAtStandardSensitivity();
  testCasInsultsShouldStillCushionAtStandardSensitivity();
  testThresholdBehavior();
  testSensitivityThresholdBoundaries();
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
    '「お前は無能」と言われた',
    '「バカ」と言われてつらかった',
    '「クズ」と言われてつらかった',
    'こういう言葉を使うのはよくない',
    '誹謗中傷として「バカ」と言われることがある'
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

function testHiraganaShineFalsePositivesShouldNotCushionAtStandardSensitivity() {
  const cases = [
    '分かりやすいしね♪',
    '散歩行かなくていいしね😂',
    '今日は快晴で良い天気ですしね。',
    'いしね',
    'ですしね'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      false,
      `通常文脈の「〜いしね」「〜ですしね」は標準感度でワンクッション対象外にする: ${text}`
    );

    assert.ok(
      !result.matchedRules.includes('threat_or_harm.harm_phrase'),
      `通常文脈の「〜いしね」「〜ですしね」を harm_phrase に誤一致させない: ${text}`
    );
  }
}

function testHiraganaShineHarmPhrasesShouldStillCushionAtStandardSensitivity() {
  const cases = ['しね', 'しねよ', 'ほんとにしねばいいのに', '死ね', '氏ね', 'ﾀﾋね'];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      true,
      `害を示す「しね」相当表現は標準感度でワンクッション対象にする: ${text}`
    );

    assert.ok(
      result.categories.includes('threat_or_harm'),
      `threat_or_harm カテゴリを含める: ${text}`
    );

    assert.ok(
      result.matchedRules.includes('threat_or_harm.harm_phrase'),
      `害を示す「しね」相当表現を harm_phrase に一致させる: ${text}`
    );
  }
}

function testScoreIsClampedAtOneHundred() {
  const result = detectTextRisk('お前は無能。消えろ。住所を晒す。何度でも言う、答えろ。');

  assert.equal(result.score, 100, '複数の加点要素が重なる場合も最終 score は100にクランプする');
  assert.ok(result.score <= 100, '最終 score は100を超えない');
  assert.equal(result.shouldCushion, true, 'score が100にクランプされた高リスク表現は対象にする');
}

function testKatakanaWordsContainingCasShouldNotBeDetectedAsSevereInsult() {
  const cases = [
    'フォーカス',
    'Webサイト一部フォーカス',
    'カスハラ',
    'カスタマーハラスメント',
    'カスタマイズ',
    'スカスカ',
    'カステラ',
    'カスタマイズが盛り盛り',
    'ポストで紹介しきれない機能、カスタマイズが盛り盛りです。マーケティング的には特定ニーズに特化した方が良いんでしょうけどね',
    'MiruMado 一部を見る窓 Webサイト一部フォーカス'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      false,
      `カタカナ語の一部としての「カス」は標準感度でワンクッション対象外にする: ${text}`
    );

    assert.ok(
      !result.matchedRules.includes('severe_insult.strong_word'),
      `カタカナ語の一部としての「カス」は強い侮辱表現ルールに一致させない: ${text}`
    );
  }
}

function testFamilyBackgroundSelfDescriptionShouldNotCushion() {
  const cases = [
    '片親',
    '私は片親です',
    '片親家庭で育ちました',
    '片親で子どもを育てています',
    '自分は片親だから、手続きが大変だった',
    '片親家庭で育ったので、支援制度の手続きを調べています'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      false,
      `家庭環境の自己説明・制度文脈は標準感度で対象外にする: ${text}`
    );

    assert.ok(
      !result.matchedRules.includes('severe_insult.strong_word'),
      `家庭環境を表す語単体は強い侮辱表現ルールに一致させない: ${text}`
    );
  }
}

function testFamilyBackgroundInsultContextShouldCushion() {
  const cases = [
    '片親のくせに',
    '片親だから',
    '片親がよ',
    '片親かな',
    '片親なんだ',
    'どうせ片親のくせにうぜぇな',
    '片親だから支援を受けるな',
    'あえんさんとしびしゅうは片親だから'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      true,
      `家庭環境を攻撃材料にする文脈は標準感度で対象にする: ${text}`
    );

    assert.ok(
      result.matchedRules.includes('discriminatory_attack.family_background_context'),
      `家庭環境への攻撃文脈ルールに一致させる: ${text}`
    );

    assert.ok(
      result.categories.includes('discriminatory_attack'),
      `discriminatory_attack カテゴリを含める: ${text}`
    );
  }
}

function testDisabilitySupportContextShouldNotCushion() {
  const cases = [
    '障害者',
    '障害者支援',
    '障害者福祉',
    '障害者手帳',
    '障害者雇用',
    '障害者向けの制度',
    '障害者だから、支援制度の案内を確認した',
    '知的障害者向けの相談窓口を紹介します'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      false,
      `障害に関する支援・制度・説明文脈は標準感度で対象外にする: ${text}`
    );
  }
}

function testDisabilityInsultContextShouldCushion() {
  const cases = [
    '障害者のくせに',
    '障害者だから',
    '障害者がよ',
    '障害者かな',
    '障害者なんだ',
    '障害者だから支援を受けるな',
    '知的障害者のくせに'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      true,
      `障害に関する語を侮辱に使う文脈は標準感度で対象にする: ${text}`
    );

    assert.ok(
      result.matchedRules.includes('discriminatory_attack.disability_context'),
      `障害に関する侮辱文脈ルールに一致させる: ${text}`
    );

    assert.ok(
      result.categories.includes('discriminatory_attack'),
      `discriminatory_attack カテゴリを含める: ${text}`
    );
  }
}

function testPhysicalWasteWarningShouldNotCushionAtStandardSensitivity() {
  const cases = [
    {
      label: '対象ポスト1全文',
      text: `皆さんにお願いがあります。

田んぼの用水路にゴミを捨てないで下さい。

ビニール、缶、ペットボトル…。

用水路が詰まるし、水も汚れる。

そして、そのゴミは誰が拾ってると思いますか？

オラです❗️❗️❗️

美味しいお米を食べたいなら、どうかゴミは捨てないで下さい🙏

今日は朝から田んぼの草刈り。

雨が降ってきたので途中で終了。

苗を植えてから約3週間。

だいぶ伸びたっしょ？🌾

順調です😊

帰りに一本松の地蔵へ。

じいちゃんが建てた鳥居と地蔵なんだけど…

地蔵の絵、ほとんど消えてらわw

今度やっぴ画伯が描いておくか。

それともオラのスマイル写真でも貼っとくか🤣
それで充分だろ。

賽銭をあげようと財布を見たら94円しか入ってなかった。

たぶん財布に穴空いてる。

94円を置いて、

「じいちゃん、稼がせてくれよ🙏」

とお願いしてきた。

さて、少し休んだら次はトラックの仕事。

疲れたな…。

コツコツ頑張るべ🌾🚚`
    },
    {
      label: '対象ポスト2全文',
      text: `用水路のゴミって、ただのポイ捨てじゃない。

田んぼの水を汚して、詰まらせて、最後は誰かの手間になる。

その「誰か」が、朝から草刈りして、そのあとトラック仕事に行く人だったりする。

お米って、苗を植えたら勝手に育つわけじゃない。

そんな現場にゴミを捨てるのは、本当にやめてほしい。

おじいちゃん、94円でもきっと助けてくれるよ🤣`
    },
    {
      label: '短めの注意喚起文1',
      text: '田んぼの用水路にゴミを捨てないで下さい。'
    },
    {
      label: '短めの注意喚起文2',
      text: '用水路のゴミって、ただのポイ捨てじゃない。'
    },
    {
      label: '廃棄物例を含む文',
      text: 'ビニール、缶、ペットボトルなどのゴミを捨てないでください。'
    }
  ];

  for (const { label, text } of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      false,
      `物理的なゴミ・ポイ捨て注意喚起文脈は標準感度で対象外にする: ${label}`
    );

    assert.ok(
      result.matchedRules.includes('context.physical_waste_warning'),
      `物理的なゴミ・ポイ捨て注意喚起文脈の控除ルールを適用する: ${label}`
    );
  }
}

function testGomiInsultsShouldStillCushionAtStandardSensitivity() {
  const cases = [
    'ゴミ',
    'お前はゴミ',
    '人間のゴミ',
    'こいつはゴミだ',
    'ゴミが',
    'ゴミみたいな人間',
    'あいつはゴミ',
    'こんなやつはゴミだ',
    '人のことを考えないゴミ',
    'こいつゴミすぎる'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      true,
      `人への侮辱としての「ゴミ」は標準感度でもワンクッション対象にする: ${text}`
    );

    assert.ok(
      result.matchedRules.includes('severe_insult.strong_word'),
      `人への侮辱としての「ゴミ」は強い侮辱表現ルールに一致させる: ${text}`
    );

    assert.ok(
      !result.matchedRules.includes('context.physical_waste_warning'),
      `人への侮辱としての「ゴミ」には物理的なゴミ文脈の控除を適用しない: ${text}`
    );
  }
}

function testSevereInsultStrongWordsShouldCushionAtStandardSensitivity() {
  const cases = [
    'バカ女',
    'バカ男',
    '欠陥品がよ',
    '親がいないせい',
    'クズ',
    'ゴミ',
    'カス',
    '無能',
    '馬鹿',
    'バカ'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      true,
      `標準感度でも強い侮辱表現はワンクッション対象にする: ${text}`
    );

    assert.ok(
      result.matchedRules.includes('severe_insult.strong_word'),
      `強い侮辱表現ルールに一致させる: ${text}`
    );

    assert.ok(
      result.categories.includes('severe_insult'),
      `severe_insult カテゴリを含める: ${text}`
    );
  }
}

function testCasInsultsShouldStillCushionAtStandardSensitivity() {
  const cases = [
    'カス',
    'カスだ',
    'カスだな',
    'カスが',
    'カスばっか',
    'カス共',
    'カス女',
    'ほんとカス',
    'お前はカス',
    'ほんと女って言い逃げブロックするカスばっかだよな',
    '自分がしたことも忘れて被害者面？女仕事も大概にしろよカス'
  ];

  for (const text of cases) {
    const result = detectTextRisk(text, { threshold: DEFAULT_CUSHION_THRESHOLD });

    assert.equal(
      result.shouldCushion,
      true,
      `侮辱表現としての「カス」は標準感度でもワンクッション対象にする: ${text}`
    );

    assert.ok(
      result.matchedRules.includes('severe_insult.strong_word'),
      `侮辱表現としての「カス」は強い侮辱表現ルールに一致させる: ${text}`
    );
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

function testSensitivityThresholdBoundaries() {
  const mediumRiskText = '最低な人間です。もう少し説明してください。';
  const lowSensitivityResult = detectTextRisk(mediumRiskText, { threshold: 100 });
  const standardSensitivityResult = detectTextRisk(mediumRiskText, { threshold: 80 });
  const highSensitivityResult = detectTextRisk(mediumRiskText, { threshold: 60 });

  assert.deepEqual(
    [lowSensitivityResult.score, standardSensitivityResult.score, highSensitivityResult.score],
    [70, 70, 70],
    '感度のしきい値を変えても同じ本文の score は変えない'
  );
  assert.equal(standardSensitivityResult.riskLevel, RISK_LEVELS.MEDIUM);
  assert.equal(lowSensitivityResult.shouldCushion, false);
  assert.equal(standardSensitivityResult.shouldCushion, false);
  assert.equal(highSensitivityResult.shouldCushion, true);
  assert.equal(highSensitivityResult.riskLevel, RISK_LEVELS.MEDIUM);

  for (const healthyText of ['その意見には反対です', '根拠を示してほしいです']) {
    assert.equal(
      detectTextRisk(healthyText, { threshold: 60 }).shouldCushion,
      false,
      `多め設定でも健全な批判・説明要求は対象外にする: ${healthyText}`
    );
  }
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
