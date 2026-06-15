'use strict';

/**
 * ことばうけみまもり｜Xことばに心のワンクッション
 *
 * 投稿テキストに対して、読む前のワンクッションが必要かどうかを
 * ローカルのルールベース + スコアリング方式で判定するモジュールです。
 *
 * このファイルでは以下を行いません。
 * - DOM操作
 * - UI表示
 * - ネットワーク通信
 * - 投稿本文の保存
 */

const RISK_LEVELS = Object.freeze({
  LOW: 'low',
  NOTICE: 'notice',
  MEDIUM: 'medium',
  HIGH: 'high'
});

const DEFAULT_CUSHION_THRESHOLD = 80;

const RISK_RULES = Object.freeze([
  {
    id: 'existence_denial.strong_phrase',
    category: 'existence_denial',
    score: 80,
    reason: '存在否定に近い表現の可能性があります',
    patterns: [
      /消えろ/u,
      /いなくなれ/u,
      /存在価値がない/u,
      /生きてる価値がない/u,
      /いない方がいい/u,
      /この世に必要ない/u,
      /二度と出てくるな/u,
      /お前なんかいらない/u,
      /おまえなんかいらない/u
    ]
  },
  {
    id: 'personality_attack.strong_phrase',
    category: 'personality_attack',
    score: 70,
    reason: '人格否定に近い表現の可能性があります',
    patterns: [
      /最低な人間/u,
      /人間として終わってる/u,
      /人として終わってる/u,
      /まともじゃない/u,
      /人としてどうかしてる/u,
      /お前みたいな人間/u,
      /おまえみたいな人間/u
    ]
  },
  {
    id: 'severe_insult.strong_word',
    category: 'severe_insult',
    score: 80,
    reason: '強い侮辱表現に近い内容の可能性があります',
    patterns: [
      /クズ/u,
      /ゴミ/u,
      /(?<![ァ-ヶー])カス(?![ァ-ヶー])/u,
      /無能/u,
      /欠陥品がよ/u,
      /バカ/u,
      /馬鹿/u,
      /役立たず/u,
      /気持ち悪い/u,
      /きしょい/u,
      /きっしょ/u,
      /うざい/u,
      /弱者男性/u,
      /弱者女性/u,
      /社会不適合者/u,
      /音の鳴るおもちゃ/u,
      /音の鳴るオモチャ/u,
      /音のなるおもちゃ/u,
      /音のなるオモチャ/u,
      /精神が未熟なんだろ/u,
      /親がいないせい/u,
      /バカ女/u,
      /バカ男/u
    ]
  },
  {
    id: 'discriminatory_attack.family_background_context',
    category: 'discriminatory_attack',
    score: 80,
    reason: '属性への攻撃に近い表現の可能性があります',
    patterns: [
      /片親(?:の)?くせに/u,
      /片親だから(?![、。\s]*(?:手続き|支援制度|制度|相談|助成|申請|生活|子育て|大変|苦労|困って))/u,
      /片親がよ/u,
      /片親かな/u,
      /片親なんだ/u
    ]
  },
  {
    id: 'discriminatory_attack.disability_context',
    category: 'discriminatory_attack',
    score: 80,
    reason: '属性への攻撃に近い表現の可能性があります',
    patterns: [
      /(?:知的|精神|身体|発達)?障害者(?:の)?くせに/u,
      /(?:知的|精神|身体|発達)?障害者だから(?![、。\s]*(?:支援制度|支援策|支援の案内|支援が必要|福祉|手帳|雇用|向け|制度|相談|申請|助成|配慮|就労|求人|サービス|ニュース|説明|利用方法))/u,
      /(?:知的|精神|身体|発達)?障害者がよ/u,
      /(?:知的|精神|身体|発達)?障害者かな/u,
      /(?:知的|精神|身体|発達)?障害者なんだ/u
    ]
  },
  {
    id: 'discriminatory_attack.attribute_attack',
    category: 'discriminatory_attack',
    score: 70,
    reason: '属性への攻撃に近い表現の可能性があります',
    patterns: [
      /.+だから.*(いらない|消えろ|出ていけ|劣っている)/u,
      /.+のくせに.*(偉そう|調子に乗る|黙れ)/u
    ]
  },
  {
    id: 'persistent_attack.pressure_phrase',
    category: 'persistent_attack',
    score: 20,
    reason: '追い詰めるような表現を含む可能性があります',
    patterns: [
      /逃げるな/u,
      /答えろ/u,
      /いつまで黙ってる/u,
      /まだ分からないの/u,
      /何回言えば分かる/u,
      /何度でも言う/u,
      /何度でも繰り返しますが/u,
      /秘密をばらす/u
    ]
  },
  {
    id: 'threat_or_harm.harm_phrase',
    category: 'threat_or_harm',
    score: 80,
    reason: '身の安全に不安を感じる可能性のある表現を検知しました',
    patterns: [
      /痛い目にあわせる/u,
      /ただじゃおかない/u,
      /覚えてろ/u,
      /家まで行く/u,
      /会いに行く/u,
      /住所.*知ってる/u,
      /死ね/u,
      /殺す/u,
      /しね/u,
      /ころす/u,
      /くたばれ/u,
      /氏ね/u,
      /ﾀﾋね/u,
      /吊れ/u
    ]
  },
  {
    id: 'doxxing_or_privacy_risk.privacy_phrase',
    category: 'doxxing_or_privacy_risk',
    score: 80,
    reason: '個人情報や安全に関わる可能性のある表現を検知しました',
    patterns: [
      /本名.*晒す/u,
      /住所.*晒す/u,
      /勤務先.*晒す/u,
      /電話番号.*晒す/u,
      /学校.*連絡する/u,
      /家族.*言う/u
    ]
  }
]);

const BOOST_RULES = Object.freeze([
  {
    id: 'direct_attack.second_person',
    score: 15,
    patterns: [/お前/u, /おまえ/u, /あなた/u, /君/u, /てめえ/u, /貴様/u]
  },
  {
    id: 'direct_attack.command',
    score: 10,
    patterns: [/黙れ/u, /消えろ/u, /出てくるな/u, /やめろ/u, /答えろ/u]
  },
  {
    id: 'short_attack.short_text',
    score: 15,
    condition: ({ normalizedText, matchedCategories }) => {
      return normalizedText.length <= 15 && matchedCategories.length > 0;
    }
  }
]);

const DEDUCTION_RULES = Object.freeze([
  {
    id: 'context.quoted_experience',
    score: -50,
    patterns: [
      /と言われた/u,
      /って言われた/u,
      /と言われて/u,
      /と言われることがある/u,
      /言われてつらかった/u,
      /言われて傷ついた/u
    ]
  },
  {
    id: 'context.warning_or_education',
    score: -30,
    patterns: [
      /と言うのはよくない/u,
      /という言葉はよくない/u,
      /こういう表現はやめよう/u,
      /人格否定はやめよう/u,
      /誹謗中傷はやめよう/u
    ]
  },
  {
    id: 'context.physical_waste_warning',
    score: -50,
    patterns: [
      /ゴミ.{0,30}(捨てない|捨てる|捨てて|ポイ捨て|拾って|拾う|用水路|田んぼ|水(?:も|を|が)?汚れ|汚して|詰まる|詰まらせ|ビニール|缶|ペットボトル)/u,
      /(用水路|田んぼ|ポイ捨て|ビニール|缶|ペットボトル|水(?:も|を|が)?汚れ|汚して|詰まる|詰まらせ|誰が拾|誰かの手間|草刈り|お米|苗).{0,30}ゴミ/u
    ]
  },
  {
    id: 'context.family_background_self_description',
    score: -50,
    patterns: [
      /(私は|わたしは|自分は|うちは|我が家は|うちの家庭は).{0,12}片親/u,
      /片親家庭.{0,20}(育ち|育て|子ども|子供|手続き|支援|制度|相談|助成|申請|生活)/u,
      /片親で.{0,20}(育ち|育て|子ども|子供|手続き|生活)/u
    ]
  },
  {
    id: 'context.disability_support_or_explanation',
    score: -50,
    patterns: [
      /(私は|わたしは|自分は|家族は).{0,12}(?:知的|精神|身体|発達)?障害者/u,
      /(?:知的|精神|身体|発達)?障害者.{0,20}(支援制度|支援策|支援の案内|支援が必要|福祉|手帳|雇用|向け|制度|相談|申請|助成|配慮|就労|求人|サービス|ニュース|説明|利用方法)/u,
      /(支援制度|支援策|支援の案内|福祉|手帳|雇用|制度|相談|申請|助成|配慮|就労|求人|サービス|ニュース|説明).{0,20}(?:知的|精神|身体|発達)?障害者/u
    ]
  },
  {
    id: 'context.healthy_criticism',
    score: -20,
    patterns: [
      /その意見には反対/u,
      /その考え方には反対/u,
      /その説明は不十分/u,
      /根拠を示して/u,
      /事実と違う/u,
      /その対応は不適切/u,
      /私は賛成できません/u
    ]
  },
  {
    id: 'context.target_is_content',
    score: -20,
    patterns: [/その意見/u, /その考え方/u, /その主張/u, /その発言/u, /その対応/u, /その説明/u]
  }
]);

function detectTextRisk(text, options = {}) {
  const threshold = normalizeThreshold(options.threshold);
  const normalizedText = normalizeText(text);

  const matchedRules = [];
  const matchedCategories = [];
  const reasons = [];

  let score = 0;

  if (!normalizedText) {
    return buildResult({
      score,
      threshold,
      matchedCategories,
      reasons,
      matchedRules
    });
  }

  for (const rule of RISK_RULES) {
    if (matchesAnyPattern(normalizedText, rule.patterns)) {
      score += rule.score;
      matchedRules.push(rule.id);
      addUnique(matchedCategories, rule.category);
      addUnique(reasons, rule.reason);
    }
  }

  for (const rule of BOOST_RULES) {
    const matchedByPattern = rule.patterns
      ? matchesAnyPattern(normalizedText, rule.patterns)
      : false;

    const matchedByCondition = rule.condition
      ? rule.condition({ normalizedText, matchedCategories })
      : false;

    if (matchedByPattern || matchedByCondition) {
      score += rule.score;
      matchedRules.push(rule.id);
    }
  }

  for (const rule of DEDUCTION_RULES) {
    if (matchesAnyPattern(normalizedText, rule.patterns)) {
      score += rule.score;
      matchedRules.push(rule.id);
    }
  }

  return buildResult({
    score,
    threshold,
    matchedCategories,
    reasons,
    matchedRules
  });
}

function buildResult({ score, threshold, matchedCategories, reasons, matchedRules }) {
  const normalizedScore = clampScore(score);
  const riskLevel = resolveRiskLevel(normalizedScore);
  const shouldCushion = normalizedScore >= threshold;

  return {
    riskLevel,
    score: normalizedScore,
    shouldCushion,
    categories: matchedCategories,
    reasons: reasons.slice(0, 2),
    matchedRules
  };
}

function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesAnyPattern(text, patterns = []) {
  return patterns.some((pattern) => pattern.test(text));
}

function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

function resolveRiskLevel(score) {
  if (score >= 80) {
    return RISK_LEVELS.HIGH;
  }

  if (score >= 50) {
    return RISK_LEVELS.MEDIUM;
  }

  if (score >= 30) {
    return RISK_LEVELS.NOTICE;
  }

  return RISK_LEVELS.LOW;
}

function normalizeThreshold(threshold) {
  if (typeof threshold !== 'number' || Number.isNaN(threshold)) {
    return DEFAULT_CUSHION_THRESHOLD;
  }

  return clampScore(threshold);
}

function addUnique(array, value) {
  if (!array.includes(value)) {
    array.push(value);
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.kotobaUkeMimamoriRiskDetector = Object.freeze({
    detectTextRisk,
    normalizeText,
    RISK_LEVELS,
    DEFAULT_CUSHION_THRESHOLD
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    detectTextRisk,
    normalizeText,
    RISK_LEVELS,
    DEFAULT_CUSHION_THRESHOLD
  };
}
