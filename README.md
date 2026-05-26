# ことばうけみまもり｜Xことばに心のワンクッション
Google Chrome拡張機能「ことばうけみまもり｜Xことばに心のワンクッション」のソースコード管理リポジトリです。

- リポジトリURL: https://github.com/na0AaooQ/kotoba-uke-mimamori-for-x/

## 概要

「ことばうけみまもり｜Xことばに心のワンクッション」は、X（旧Twitter）で届く言葉のなかで、受け手の心に大きな負荷を与える可能性のある投稿に、そっとワンクッションを置くための補助ツールです。
人格否定・存在否定・差別的表現・執拗な攻撃など、心に大きな負荷を与える可能性のある投稿を、すぐに読まなくてもよい形にし、ユーザーが「表示する / 今は見ない」を選べるようにすることを目指します。
本リポジトリは、現在設計・MVP開発準備段階です。

## コンセプト

X（旧Twitter）で届く言葉のなかで、人格否定・存在否定・差別的表現・執拗な攻撃など、受け手の心に大きな負荷を与える可能性のある投稿に、そっとワンクッションを置くための補助ツールです。
異なる意見や健全な批判を規制することを目的とせず、あなたが大切にしている「つながり」と「対話」を守りながら、心の負担を軽くする選択肢を提供します。

## 目的

SNSには、人と人をつなぎ、孤独を和らげ、励ましや対話を生む力があります。
一方で、人格否定・存在否定・差別的表現・執拗な攻撃などの投稿により、受け手の心に大きな負荷がかかることがあります。
この拡張機能は、X上で受け取る言葉に対して、読む前のワンクッションを置くことで、ユーザーが自分の心の状態に合わせて「読む / 今は読まない」を選べるようにすることを目的とします。

## MVP方針

MVPでは、高信頼性を優先します。

健全な批判・異論・反対意見を広く検知するのではなく、人格否定・存在否定・差別的表現・強い罵倒など、受け手の心に大きな負荷を与える可能性が高い表現に限定して、読む前のワンクッションを置きます。

初期判定は、AI判定ではなく、ローカル処理によるルールベース + スコアリング方式を想定します。

## MVPでやること

- X上の表示済みテキストを対象にする
- リプライ、通知、引用ポスト、検索結果、タイムライン上の投稿を候補にする
- 人格否定・存在否定・差別的表現・強い罵倒に近い投稿にワンクッションを置く
- 高リスク投稿をぼかす
- ユーザーが「表示する / 今は見ない」を選べるようにする
- 判定理由を短く表示する
- 投稿を勝手に削除・消去しない
- 原則ローカル処理で判定する
- 投稿本文や判定結果を外部送信しない

## MVPでやらないこと

- 自動ブロック
- 自動通報
- 投稿者を「加害者」と断定する表示
- アカウント危険度の共有
- 共有ブロックリストの作成
- DM本文の解析
- 法律判断の代替
- 医療・心理診断の代替
- ユーザーの精神状態の推定
- 健全な批判・異論・反対意見の規制

## 判定方針

MVPでは、以下のカテゴリを中心に判定します。

- 存在否定
- 人格否定
- 差別的表現・属性攻撃
  - 属性攻撃、人の属性(例: 職業・立場・地位・外見・出自・技能・年齢・性別・背景・資産・収入・国籍などの様々な属性)だけを見て、人を類型化して断定し、偏見や侮辱する攻撃のこと
- 強い罵倒・侮辱
- 執拗な攻撃
- 脅迫・危害示唆
- 個人情報晒し・晒し示唆

ただし、初期MVPでは過検知を避けるため、特に以下の4カテゴリを中心に扱います。

- 存在否定
- 人格否定
- 差別的表現・属性攻撃
  - 属性攻撃、人の属性(例: 職業・立場・地位・外見・出自・技能・年齢・性別・背景・資産・収入・国籍・趣味などの様々な属性)だけを見て、人を類型化して断定し、偏見や侮辱する攻撃のこと
- 強い罵倒・侮辱

### 対象にしたい例

- 相手の存在そのものを否定する表現
- 相手の人格や尊厳を否定する表現
- 属性・出自・性別・年齢・外見などを理由にした攻撃表現
- 強い侮辱語を使った直接的な攻撃表現

### 原則として対象外にしたい例

- 異なる意見
- 健全な批判
- 反対意見
- 説明や根拠を求める表現
- 注意喚起
- 被害経験の共有
- 引用文脈で使われた攻撃語

## スコアリング方針

内部的には、投稿本文に対して 0〜100 のリスクスコアを算出する想定です。

| スコア | 内部判定 | MVPでの扱い |
|---:|---|---|
| 0〜29 | 低リスク | 何もしない |
| 30〜59 | 注意 | 何もしない |
| 60〜79 | 中リスク | 原則として表示変更しない |
| 80〜100 | 高リスク | ぼかし + ワンクッション表示 |

標準設定では、`score >= 80` の場合のみワンクッション表示の対象にします。表示されやすさを「少なめ」または「多め」に変更した場合は、ユーザーが選択したしきい値で表示判定を行います。

ユーザー向けにはスコアを表示せず、以下のような短い理由文だけを表示します。

- 存在否定に近い表現の可能性があります
- 人格否定に近い表現の可能性があります
- 属性への攻撃に近い表現の可能性があります
- 強い侮辱表現に近い内容の可能性があります
- 追い詰めるような表現を含む可能性があります

## UI/UX方針

ワンクッション表示では、ユーザーを不安にさせすぎない表現を使います。

投稿者を断定的に裁くのではなく、読む側に選択肢を渡すことを重視します。

表示文言の例:

```text
読む前に、少しだけワンクッションを置きました

この投稿には、心に負荷がかかる可能性のある表現が含まれているかもしれません。
```

```text
理由: 人格否定に近い表現の可能性があります

[内容を表示する] [今は見ない]
```

## プライバシー方針

「ことばうけみまもり｜Xことばに心のワンクッション」のMVPでは、プライバシーを最優先に設計します。

- 投稿本文の判定は原則ローカルで行う
- 投稿本文を外部サーバーへ送信しない
- 判定結果を外部サーバーへ送信しない
- ユーザーの閲覧内容を収集しない
- ユーザーの精神状態を推定しない
- 保存が必要な機能を追加する場合は、ユーザーの明示的な操作を前提にする

## 設定保存方針

オプション画面で、ユーザーが拡張機能の有効 / 無効と、ワンクッションの表示されやすさを選択できます。設定保存には `chrome.storage.local` を使用し、保存対象は `enabled` と `cushionSensitivity` のみに限定します。投稿本文や判定結果は保存しません。

オプション画面の `enabled` と `cushionSensitivity` 設定を `content.js` の処理へ接続しています。初期値は `enabled: false` および `cushionSensitivity: 'standard'` で、ユーザーが明示的にONにした場合のみ、通常判定によるワンクッション処理が有効になります。

ON/OFFおよび表示されやすさの変更は、現時点では開いているXページを再読み込みすると反映されます。リアルタイム反映は今後検討予定です。投稿本文・判定結果・URL・ユーザー情報は保存しません。

## フィルター感度設定の設計メモ（実装前）

自己常時ON試用で得た「ワンクッションUIの表示されやすさを自分で変更したい」という改善候補について、MVPに追加する前に整理した設計メモです。本節の方針に基づき、オプション画面で `少なめ` / `標準` / `多め` を選択できるフィルター感度設定を実装しました。標準しきい値 `DEFAULT_CUSHION_THRESHOLD = 80`、初期設定 `enabled=false`、開発用フラグがいずれも `false` である状態は維持します。

### 3段階の表示設定

ユーザーには数値や内部スコアを見せず、オプション画面で `ワンクッションの表示されやすさ` を3段階から選んでもらう方針とします。「表示頻度」よりも、投稿量に左右されず機能の働き方を説明しやすい「表示されやすさ」を優先候補とします。

| 表示ラベル | 内部値 | しきい値 | 意味 |
|---|---|---:|---|
| 少なめ | `low` | `100` | より強い表現を中心に、ワンクッション表示を少なめにする |
| 標準 | `standard` | `80` | 現在のMVPと同等の表示判定とする |
| 多め | `high` | `60` | 少し軽めのリスク表現にもワンクッションを表示しやすくする |

`high` は心に負荷がかかる可能性のある表現へ反応する範囲を広げる設定であり、健全な批判・異論・反対意見を対象にする方針への変更ではありません。初期値は `standard` とし、未設定時にも従来の標準挙動が変わらないようにします。

### 保存する設定値案

保存キーは、何の感度かが読み取れる `cushionSensitivity` を採用しています。`sensitivity` よりも、将来ほかの設定が増えた際に意味が明確です。

```js
{
  enabled: boolean,
  cushionSensitivity: 'low' | 'standard' | 'high'
}
```

`chrome.storage.local` に保存する対象は、この2つのユーザー設定値だけに限定します。`cushionSensitivity` が未設定または不正値の場合は `standard` に正規化します。

### 実装の接続方針

`risk-detector.js`:

- `DEFAULT_CUSHION_THRESHOLD = 80` は設定未指定時および標準設定の既定値として維持する。
- 既存の `detectTextRisk(text, { threshold })` の受け取り口を利用し、感度設定の保存や読み込みは担当させない。
- 判定モジュールはDOMや `chrome.storage.local` に依存しない、純粋な判定処理に近い形を維持する。
- `high` で `score` が60〜79の場合、内部の `riskLevel` が `medium` のまま `shouldCushion=true` になり得るため、表示可否は `shouldCushion` を基準に扱い、テストで確認する。

`settings.js`:

- `DEFAULT_SETTINGS` に `cushionSensitivity: 'standard'` を追加する。
- `normalizeSettings()` は `low` / `standard` / `high` のみを許可し、それ以外を `standard` に戻す。
- 保存対象は `enabled` と `cushionSensitivity` のみに絞り、投稿本文や判定結果などを受け取っても保存対象に含めない。

`content.js`:

- `enabled=true` の通常判定開始時に、正規化済みの `settings.cushionSensitivity` を `100` / `80` / `60` のしきい値へ対応付ける。
- 対応付けた値を `detectTextRisk(postText, { threshold })` に渡す。
- `enabled=false` の場合は従来どおり通常判定処理を開始しない。
- 感度変更もON/OFF変更と同様、当面は開いているXページの再読み込み後に反映する。`chrome.storage.onChanged` は本設計の実装対象に含めない。

オプション画面:

- 数値入力ではなく、説明文を併記できるラジオボタンで実装する。
- 表示名は `ワンクッションの表示されやすさ` とし、`少なめ`、`標準`、`多め` の意味をやさしい文言で説明する。
- 初期表示は `標準` とし、保存時は既存の保存完了メッセージのトーンに合わせる。
- ユーザー向け文言は、`_locales/ja/messages.json` と `_locales/en/messages.json` を同時に更新して管理する。

```text
ワンクッションの表示されやすさ

( ) 少なめ  強い表現を中心に表示します。
(●) 標準    通常の設定です。
( ) 多め    少し軽めの表現にも表示されやすくします。
```

### privacy / manual ページへの影響

`docs/privacy.html` に、保存する設定値が `enabled` と `cushionSensitivity` であること、および投稿本文、判定結果、閲覧履歴、投稿URL、ユーザー名、アカウントID、`score`、`matchedRules`、`categories`、`reasons` を保存しないことを明記しています。投稿本文や判定結果を外部送信しない方針も維持します。文言は現在のMVPの説明であり、法務文言を最終確定するものではありません。

`docs/manual.html` には、オプション画面から表示されやすさを選べること、`少なめ` / `標準` / `多め` の意味、変更後は開いているXページを再読み込みすると反映されることを記載しています。

### テスト方針

感度設定の実装では、既存テストに以下の確認を追加しています。

| テストファイル | 確認内容 |
|---|---|
| `tests/settings.test.js` | 初期値が `standard` であること、許可値のみ保持すること、不正値を `standard` に戻すこと、保存キーを限定すること |
| `tests/risk-detector.test.js` | `threshold: 100` / `80` / `60` で `shouldCushion` の境界が意図どおりであり、`80` が現行標準のままであること |
| `tests/content.test.js` | 感度に対応するしきい値を判定処理へ渡すこと、`enabled=false` では処理しないこと、不正値でも標準相当になること |
| `tests/options.test.js` | 初期値 `standard` の表示、3つの選択値の保存、保存完了メッセージの表示を確認すること |

加えて、privacy / manual の説明と実際の保存値・反映方法が一致していること、外部通信・投稿本文・判定結果の保存が追加されていないことを実機QAで確認します。

### 次フェーズ候補: ユーザー追加ワード機能

ユーザー追加ワード機能は次フェーズ候補です。実装する場合は、投稿本文とは別に、ユーザーが登録したワードを `chrome.storage.local` に保存することになります。保存する内容がセンシティブになり得るため、privacy / manual / storage 方針、削除方法、上限、同期やエクスポートの扱いを整理してから慎重に検討します。

初期案としては正規表現ではなく、1行1語の部分一致から検討します。外部送信は行いません。MVP向けのフィルター感度設定では、ユーザー追加ワードの入力UI、保存処理、判定処理は実装しません。

## 多言語対応方針

本拡張機能は、初期設計段階から多言語対応を前提にします。

Chrome拡張機能の i18n 仕組みに合わせて、UI文言、manifest上の名称・説明文、オプション画面の文言、ワンクッションUIの文言などは、可能な限り `_locales` 配下の `messages.json` で管理します。

初期対応言語は以下を想定します。

- 日本語: `ja`
- 英語: `en`

MVPでは日本語を主言語としつつ、英語メッセージファイルも同時に用意し、将来的に他言語を追加しやすい構成にします。

### 多言語対応の対象

多言語対応の対象は、主に以下です。

- 拡張機能名
- 拡張機能の説明文
- ワンクッションUIの見出し
- ワンクッションUIの本文
- 判定理由文
- ボタン文言
- オプション画面の文言
- エラー・補助メッセージ
- Chrome Web Store 掲載説明文の原稿

### 多言語対応の基本方針

- UIに表示する固定文言は、原則としてコード内に直接書かない。
- UI文言は `chrome.i18n.getMessage()` などを通して取得する。
- `manifest.json` の `name` や `description` は `__MSG_xxx__` 形式を使う。
- `manifest.json` には `default_locale` を設定する。
- `_locales/ja/messages.json` と `_locales/en/messages.json` のキーは揃える。
- 新しいUI文言を追加した場合は、日本語・英語の両方の `messages.json` を更新する。
- 判定ロジックのカテゴリIDや内部IDは英語の安定したIDを使い、ユーザー向け表示文言は i18n で管理する。
- 文章の意味が変わる翻訳を避け、特に安全・倫理・プライバシーに関する文言は慎重に扱う。
- 投稿者を断定的に責める表現、法律判断・医療判断・心理診断に見える表現にならないよう、翻訳後の文言も確認する。

### 想定する i18n 構成

```text
_locales
├─ ja
│  └─ messages.json
└─ en
   └─ messages.json
```

### manifest の方針

`manifest.json` では、拡張機能名と説明文を i18n メッセージ参照にします。

```json
{
  "name": "__MSG_extensionName__",
  "description": "__MSG_extensionDescription__",
  "default_locale": "ja"
}
```

### メッセージキー例

`_locales/ja/messages.json` の例:

```json
{
  "extensionName": {
    "message": "ことばうけみまもり｜Xことばに心のワンクッション"
  },
  "extensionDescription": {
    "message": "Xで届く言葉に、読む前のワンクッションを置くためのChrome拡張機能です。"
  },
  "cushionTitle": {
    "message": "読む前に、少しだけワンクッションを置きました"
  },
  "cushionBody": {
    "message": "この投稿には、心に負荷がかかる可能性のある表現が含まれているかもしれません。"
  },
  "buttonShowContent": {
    "message": "内容を表示する"
  },
  "buttonHideForNow": {
    "message": "今は見ない"
  }
}
```

`_locales/en/messages.json` の例:

```json
{
  "extensionName": {
    "message": "Kotoba Uke Mimamori | A Gentle Pause for Words on X"
  },
  "extensionDescription": {
    "message": "A Chrome extension that adds a gentle pause before reading potentially harmful words on X."
  },
  "cushionTitle": {
    "message": "A gentle pause before reading"
  },
  "cushionBody": {
    "message": "This post may contain expressions that could place an emotional burden on the reader."
  },
  "buttonShowContent": {
    "message": "Show content"
  },
  "buttonHideForNow": {
    "message": "Not now"
  }
}
```

### ディレクトリ構成方針

多言語対応を前提に、Chrome拡張機能のユーザー向け文言は `_locales` 配下で管理します。

想定構成:

```text
kotoba-uke-mimamori-for-x
├─ manifest.json
├─ content.js
├─ overlay.js
├─ options.html
├─ options.js
├─ i18n.js
├─ risk-detector.js
├─ _locales
│  ├─ ja
│  │  └─ messages.json
│  └─ en
│     └─ messages.json
└─ tests
   └─ risk-detector.test.js
```

必要に応じて、i18n取得用のヘルパーファイル `i18n.js` を追加します。

`i18n.js` は以下を担当します。

- `chrome.i18n.getMessage()` のラップ
- テスト環境でのフォールバック
- メッセージキー未定義時の安全な表示
- UI文言取得処理の一元化

ユーザー向け文言を追加する場合は、コードへ直書きせず、原則として `_locales/ja/messages.json` と `_locales/en/messages.json` に追加します。

## Chrome拡張最小構成

Manifest V3 の `manifest.json` を追加し、`https://x.com/*` と `https://twitter.com/*` で content script を読み込める最小構成を用意しています。

`_locales/ja/messages.json` と `_locales/en/messages.json` を追加し、拡張機能名・説明文・ワンクッションUI文言・判定理由文を Chrome i18n 前提で管理します。`i18n.js` は `chrome.i18n.getMessage()` を安全にラップし、テスト環境でもキー名へフォールバックします。

`content.js` は、オプション画面で保存された `enabled` と `cushionSensitivity` 設定を読み込み、`enabled=true` の場合のみX上の投稿DOM候補を検出し、投稿本文らしきテキストを抽出します。`cushionSensitivity` を選択済みのしきい値へ変換して `risk-detector.js` に渡します。投稿本文をログに出さず、保存・外部送信も行わず、判定対象件数とワンクッション候補件数のみで処理状況を確認します。`shouldCushion=true` の投稿候補にはワンクッションUIとぼかし表示を適用します。`enabled=false` ではDOM監視・通常判定・候補属性付与・ワンクッションUI・ぼかし表示を行いません。

`overlay.js` は、ワンクッションUI生成のための土台です。`enabled=true` または開発用フラグ配下で、`shouldCushion=true` の内部マーキング済み投稿にワンクッションUIを挿入できます。ワンクッションUIは、X投稿カード内に自然に収まるよう、目にやさしい見た目と投稿本文付近への挿入位置に調整しています。また、ライトモード・ダークモードにおけるワンクッションUIの視認性、ぼかし強度、ボタンフォーカス表示を確認・調整しています。外部通信、投稿本文の保存、投稿DOMの削除は行いません。

## 開発確認手順

以下の確認は、開発中に安全にワンクッションUIの接続状態を確認するためのものです。

確認後は必ず `content.js` の開発用フラグを `false` に戻し、Chrome拡張を再読み込みしてください。通常状態では画面表示変更を行いません。テスト文言は開発確認専用であり、通常判定ルールには含めません。投稿本文・ユーザー情報・URL・内部判定詳細をログやUIに出さないでください。

### B. DOM手動属性付与によるワンクッションUI確認

この確認方法は、実在の投稿本文を使わずに、開発用フラグON時のUI挿入位置・重複挿入防止・表示崩れを確認するためのものです。

確認時のみ、`content.js` の開発用フラグ `enableCushionOverlayDev` を一時的に `true` にします。`enableDevTestCushionText` は `false` のままで構いません。

```js
const FEATURE_FLAGS = Object.freeze({
  // 開発確認時のみ、候補化済み投稿へのワンクッションUI挿入を許可します。
  enableCushionOverlayDev: true,
  // 開発確認時のみ、安全な固定テスト文言をワンクッション候補として扱います。
  enableDevTestCushionText: false
});
```

なお、安全な固定テスト文言とは、`content.js` 内で定義している、以下の文字列のことです。

```js
const DEV_TEST_CUSHION_TEXT = '【テスト用】「ことばうけみまもり」のテストメッセージです。';
```

Chrome拡張を再読み込みし、X上の確認対象画面を開きます。DevTools の Elements パネルで対象の投稿DOMを選択し、以下の属性を手動で付与します。

```text
data-kum-cushion-candidate="true"
```

`article[data-testid="tweet"]` または `article` の投稿DOMに属性を付けると、開発用フラグON時のみワンクッションUIが一度だけ挿入されます。挿入後は、対象DOMに以下の属性が付くことを確認します。

```text
data-kum-cushion-rendered="true"
```

確認項目:

- UIが投稿本文付近に自然な位置で挿入される
- UIが重複挿入されない
- UIが投稿カード内で大きく表示崩れしない
- 投稿本文ノードにのみ軽いぼかしが適用される
- 「内容を表示する」でぼかしが解除され、ワンクッションUIが閉じる
- 「今は見ない」でぼかしとワンクッションUIが維持される
- 投稿本文は削除されない
- 投稿DOMは削除されない
- score / matchedRules / categories / reasons はUIに表示されない
- 投稿本文はログに出ない
- 投稿本文・ユーザー情報・URL・内部判定詳細をログやUIに出さない
- 外部通信・保存処理が発生しない

確認後は、必ず `enableCushionOverlayDev` を `false` に戻し、Chrome拡張を再読み込みしてください。

### A. テスト文言による実フロー確認

この確認方法は、実在の攻撃的な文言を使わずに、投稿DOM検出からワンクッションUI試験挿入までの流れを確認するためのものです。

確認時のみ、`content.js` の以下の開発用フラグを一時的に `true` にします。

```js
const FEATURE_FLAGS = Object.freeze({
  // 開発確認時のみ、候補化済み投稿へのワンクッションUI挿入を許可します。
  enableCushionOverlayDev: true,
  // 開発確認時のみ、安全な固定テスト文言をワンクッション候補として扱います。
  enableDevTestCushionText: true
});
```

確認用文言:

```text
【テスト用】「ことばうけみまもり」のテストメッセージです。
```

Chrome拡張を再読み込みし、この文言を含むテスト投稿または確認用表示を使って確認します。この文言は開発確認専用であり、`risk-detector.js` の通常判定ルールには追加しません。

確認項目:

- 投稿DOM候補として検出される
- `data-kum-risk-checked="true"` が付与される
- `data-kum-cushion-candidate="true"` が付与される
- 開発用フラグON時のみワンクッションUIが挿入される
- `data-kum-cushion-rendered="true"` が付与される
- 投稿本文ノードに `data-kum-content-blurred="true"` が付与される
- 「内容を表示する」で `data-kum-content-revealed="true"` が付与される
- 「今は見ない」でぼかしとワンクッションUIが維持される
- 投稿本文はログに出ない
- 投稿本文はUIに出ない
- score / matchedRules / categories / reasons はログにもUIにも出ない
- 投稿本文や投稿DOMは削除されない
- 外部通信・保存処理は発生しない

確認後は、必ず `enableCushionOverlayDev` と `enableDevTestCushionText` をどちらも `false` に戻し、Chrome拡張を再読み込みしてください。

### C. enabled=true の通常判定フロー確認

この確認方法は、オプション画面で `enabled=true` にした場合のみ、通常判定処理が開始されることを確認するためのものです。設定変更後は、開いているXページを再読み込みすると反映されます。

安全な確認方針:

- `enabled=false` では、Xページ再読み込み後も `data-kum-*` 属性、ワンクッションUI、ぼかし表示が付かない
- `enabled=true` では、Xページ再読み込み後に通常判定処理が動作する
- `shouldCushion=false` の投稿にはワンクッションUIやぼかし表示が出ない
- `shouldCushion=true` の挙動は、開発用フラグ導線、テスト用DOM、またはテストコード上のモックで安全に確認する
- 実在ユーザーへ向けた攻撃的投稿を作成・投稿して確認しない
- 投稿本文・ユーザー情報・URL・内部判定詳細をログやUIに出さない

`shouldCushion=true` の実画面挙動を確認する場合は、以下のいずれかの安全な方法を使います。

- 開発用フラグ導線で、安全な固定テスト文言によるワンクッションUIとぼかし挙動を確認する
- テスト用DOMに対して `data-kum-cushion-candidate="true"` を付与し、UI挿入位置とぼかし対象を確認する
- テストコード上のモックで `shouldCushion=true` を再現し、投稿本文や内部判定詳細がUI・ログ・保存対象に含まれないことを確認する

### D. リアルタイム反映の設計メモ

現在の仕様:

- ON/OFFおよび表示されやすさの変更は、開いているXページを再読み込みすると反映される
- この仕様は安全で単純なため、現時点では維持する
- `chrome.storage.onChanged` によるリアルタイム反映は未実装

将来 `chrome.storage.onChanged` を実装する場合は、以下を先に検討します。

`enabled=false` から `enabled=true` へ切り替わった場合:

- DOM監視をその場で開始するか
- 既存表示中投稿を即時スキャンするか
- 次回DOM変化から処理するか
- 即時スキャンする場合でも、投稿本文・URL・ユーザー情報・内部判定詳細をログに出さない
- `shouldCushion=true` の投稿だけワンクッションUIとぼかしを適用する

`enabled=true` から `enabled=false` へ切り替わった場合:

- 新規スキャンを停止する
- 可能であれば MutationObserver を停止する
- 既存の `.kum-cushion` を削除する
- 既存の `.kum-content-blur` を解除する
- 投稿本文や投稿DOMは削除しない
- 投稿本文・URL・ユーザー情報・内部判定詳細はログに出さない
- `data-kum-*` 属性の削除方針は、表示復元に必要なものから慎重に検討する
- 既に「内容を表示する」済みの投稿をどう扱うかを事前に決める

既存DOM状態の扱い:

- ワンクッションUIを削除しても、投稿本文や投稿DOMは残す
- ぼかし解除は本文ノードに限定する
- `data-kum-content-revealed` など復元状態に関わる属性を削除するかは、別PRでテスト方針と合わせて決める
- OFFへ切り替えた時点で処理途中の投稿があっても、表示を壊さず安全側に倒す
- リアルタイム反映は、既存DOM状態・ぼかし状態・ワンクッションUI状態の扱いが複雑になるため、別PRで慎重に検討する

## 本番ON前QA実施手順

本番ON前QAは、設定・表示・ログ・保存・通信の順に確認します。実機確認が必要な場合は、Chrome拡張を再読み込みしてからXページを再読み込みします。

1. `npm run check` を実行し、テスト・lint・format check が通ることを確認する。
2. Chrome拡張を再読み込みする。
3. オプション画面で `enabled=false` であることを確認する。
4. Xページを再読み込みし、`enabled=false` で表示変更が発生しないことを確認する。
5. DevTools Elements で `.kum-cushion`、`.kum-content-blur`、`data-kum-*` 属性が付与されていないことを確認する。
6. DevTools Console で、投稿本文・URL・ユーザー情報・`score`・`matchedRules`・`categories`・`reasons` が出力されていないことを確認する。
7. オプション画面で `enabled=true` に変更し、Xページを再読み込みする。
8. 通常判定処理が動作し、`shouldCushion=false` の投稿にはUIやぼかしが出ないことを確認する。
9. `shouldCushion=true` の挙動は、開発用フラグ導線、テスト用DOM、またはテストコード上のモックで安全に確認する。
10. ライトモードで、ワンクッションUI・ぼかし・ボタン文字・フォーカスリング・Tab / Enter / Space 操作を確認する。
11. ダークモードで、ワンクッションUI・ぼかし・ボタン文字・フォーカスリング・Tab / Enter / Space 操作を確認する。
12. `chrome.storage.local` に保存されている値が `enabled` と `cushionSensitivity` のみであることを確認する。
13. DevTools Network で、ことばうけみまもり由来の外部通信が追加されていないことを確認する。
14. 最後に `enabled=false` へ戻してXページを再読み込みし、表示変更が発生しないことを再確認する。

### ログ確認

DevTools Console では、投稿本文、URL、ユーザー情報、`score`、`matchedRules`、`categories`、`reasons` が出力されていないことを確認します。ログを出す場合も、件数や固定メッセージのみに限定します。

### chrome.storage.local 確認

`chrome.storage.local` に保存されるのは `enabled` と `cushionSensitivity` のみであることを確認します。投稿本文、判定結果、URL、ユーザー情報、`score`、`matchedRules`、`categories`、`reasons` は保存しません。

確認時は、拡張機能の検証画面や DevTools で保存値を確認し、不要なキーが増えていないことを見ます。

### 外部通信確認

DevTools Network で、X閲覧中にことばうけみまもり由来の外部通信が追加されていないことを確認します。本MVPでは、投稿本文や判定結果を外部サーバーへ送信しません。

## 本番ON前QAチェックリスト

本番ON前には、少なくとも以下を確認します。

- [ ] `enabled=false` 初期状態で、X画面に表示変更が発生しない
- [ ] `enabled=false` で、`data-kum-*` 属性が付与されない
- [ ] `enabled=true` で、通常判定が動作する
- [ ] `shouldCushion=false` の投稿にはUIやぼかしが出ない
- [ ] `shouldCushion=true` の投稿のみワンクッションUIとぼかしが出る
- [ ] 「内容を表示する」でぼかしが解除される
- [ ] 「今は見ない」でぼかしとUIが維持される
- [ ] 投稿本文・ユーザー情報・URL・`score`・`matchedRules`・`categories`・`reasons` がログに出ない
- [ ] `chrome.storage.local` に `enabled` と `cushionSensitivity` 以外が保存されない
- [ ] 投稿本文・判定結果・URL・ユーザー情報が保存されない
- [ ] ことばうけみまもり由来の外部通信が発生しない
- [ ] ライトモードでUI・ぼかし・ボタン文字・フォーカスリングが読める
- [ ] ダークモードでUI・ぼかし・ボタン文字・フォーカスリングが読める
- [ ] Tab / Enter / Space でボタン操作できる
- [ ] XのDOM変更で投稿本文抽出・UI挿入位置が大きく崩れていない
- [ ] QA後に `enabled=false` へ戻し、Xページ再読み込み後に表示変更が発生しない

## X DOM継続確認チェックリスト

XのDOMは変更される可能性があるため、以下を継続確認します。

- [ ] 投稿DOM候補として `article` が取得できる
- [ ] 投稿本文として `[data-testid="tweetText"]` が取得できる
- [ ] 投稿本文ノードの直前にUIを挿入できる
- [ ] 投稿本文ノードにのみぼかしを適用できる
- [ ] ワンクッションUI挿入後も投稿本文や投稿DOMが削除されない
- [ ] 投稿本文ノードを取得できない場合は処理を安全にスキップできる
- [ ] 取得できない場合に投稿DOMや表示を壊さない

## 本番ON前QA実施記録

QA実施時は、必要に応じて以下をPR本文や確認メモに転記します。

- 実施日:
- 実施者:
- 対象ブランチ / PR:
- Chromeバージョン:
- X表示モード: ライト / ダーク
- `enabled=false` 確認結果:
- `enabled=true` 確認結果:
- ログ確認結果:
- `chrome.storage.local` 確認結果:
- Network確認結果:
- X DOM継続確認結果:
- 備考:

## 自己常時ON試用

自己常時ON試用は、本番公開やベータテストの前に、開発者本人のPC・ブラウザのみで `enabled=true` の状態を一定期間維持し、Xの通常利用に支障がないかを確認するためのものです。

通常のQAでは見えにくい、スクロール時の違和感、表示崩れ、過検知、心理的な負担、ライト/ダークモードでの見え方、Xの各画面での挙動を確認します。

自己常時ON試用中も、投稿本文、判定結果、URL、ユーザー情報、`score`、`matchedRules`、`categories`、`reasons` は保存しません。外部通信は追加せず、投稿本文や投稿DOMも削除しません。試用後は必ず `enabled=false` へ戻し、Xページ再読み込み後に表示変更が発生しないことを確認します。

### 自己常時ON試用手順

1. `npm run check` が成功していることを確認する。
2. Chrome拡張機能を再読み込みする。
3. オプション画面で `ことばうけみまもりを有効にする` をONにする。
4. 開いているXページを再読み込みする。
5. 通常どおりXを利用する。
6. タイムライン、通知、検索結果、プロフィール、ポスト詳細、引用ポスト、リプライ表示などを確認する。
7. 違和感や不具合があれば、自己常時ON試用記録に残す。
8. 試用を終えたら、オプション画面でOFFに戻す。
9. Xページを再読み込みし、表示変更が発生しないことを確認する。

### 自己常時ON試用中の確認観点

- [ ] Xの通常利用で重くならない
- [ ] スクロール時に表示がちらつかない
- [ ] 投稿本文以外を誤ってぼかしていない
- [ ] タイムラインで表示崩れがない
- [ ] 通知画面で表示崩れがない
- [ ] 検索結果で表示崩れがない
- [ ] プロフィール画面で表示崩れがない
- [ ] ポスト詳細画面で表示崩れがない
- [ ] リプライ表示で表示崩れがない
- [ ] 引用ポスト表示で表示崩れがない
- [ ] `shouldCushion=false` の投稿にワンクッションUIやぼかしが出すぎない
- [ ] ワンクッションUIが邪魔すぎない
- [ ] ぼかし表示が強すぎない / 弱すぎない
- [ ] 「内容を表示する」が直感的に使える
- [ ] 「今は見ない」が直感的に使える
- [ ] ライトモードでUIが読みやすい
- [ ] ダークモードでUIが読みやすい
- [ ] Tab / Enter / Space 操作に問題がない
- [ ] Consoleに投稿本文・URL・ユーザー情報・内部判定詳細が出ていない
- [ ] `chrome.storage.local` に `enabled` と `cushionSensitivity` 以外が保存されていない
- [ ] ことばうけみまもり由来の外部通信が増えていない
- [ ] 試用後に `enabled=false` へ戻し、表示変更なしを確認した

### 自己常時ON試用記録

- 試用開始日:
- 試用終了日:
- 実施者:
- 対象ブランチ / コミット:
- Chromeバージョン:
- X表示モード: ライト / ダーク
- 主に確認した画面:
  - タイムライン:
  - 通知:
  - 検索:
  - プロフィール:
  - ポスト詳細:
  - リプライ:
  - 引用ポスト:
- 通常利用の重さ:
- 表示崩れ:
- 過検知・誤検知:
- ワンクッションUIの違和感:
- ぼかし表示の違和感:
- 「内容を表示する」の使用感:
- 「今は見ない」の使用感:
- Consoleログ確認:
- `chrome.storage.local` 確認:
- Network確認:
- 最終 `enabled=false` 戻し確認:
- 発見した問題:
- 修正PRの要否:
- 備考:

## 開発者のローカルPCでの一時的な検証内容

### 検証内容:
- risk-detector.js のDEFAULT_CUSHION_THRESHOLD を一時的に 10 に下げ、開発用フラグOFF / enabled=true の状態で、通常判定フローによるワンクッションUI表示を確認。

### 目的:
- content.js の開発用フラグ(enableCushionOverlayDev, enableDevTestCushionText)に依存せず、一般ユーザー設定に近い状態でUI・ぼかし・解除導線・表示頻度・操作感を確認するため。

### 注意:
- 本番設定ではなく、一時検証後は `risk-detector.js` の `DEFAULT_CUSHION_THRESHOLD = 80` に戻しています。

## 追加した補助シグナルの確認

`persistent_attack.pressure_phrase` に含まれる「何度でも繰り返しますが」は、単体で強い攻撃と断定するものではなく、圧のある文脈と重なった場合の補助シグナルとして扱います。`DEFAULT_CUSHION_THRESHOLD = 80` を維持し、単体で過剰にワンクッション表示しないことと、高リスク表現との組み合わせでスコアが高まることをテストで確認します。

## ドキュメントページ

以下のユーザー向けドキュメントページを用意しています。

- `docs/about.html`
- `docs/privacy.html`
- `docs/manual.html`

`docs/about.html`、`docs/privacy.html`、`docs/manual.html` では、「いきなり読ませない。でも、読む自由も残す」という本ツールの位置づけを説明しています。外部送信を行わないこと、保存対象が `enabled` と `cushionSensitivity` のみであること、ON/OFFおよび表示されやすさの反映方法やワンクッションUIの動作も記載しています。

`docs/privacy.html` には、開発者情報とお問い合わせ先を追加し、センシティブな情報を公開の場や問い合わせ内容に記載しないよう案内しています。また、3ページの数字付き目次と見出し、共通レイアウトおよびフッター表記を整えています。

内容は今後、自己常時ON試用やベータテストで得た気づきを反映しながら更新していきます。

## 技術方針

初期MVPでは、以下の構成を想定します。

```
Chrome Extension
├─ manifest.json
├─ content.js
│  ├─ XのDOM監視
│  ├─ 投稿テキスト抽出
│  ├─ 判定処理呼び出し
│  └─ ワンクッションUI挿入
├─ risk-detector.js
│  ├─ ルールベース判定
│  ├─ スコアリング
│  └─ 判定理由生成
├─ i18n.js
│  ├─ chrome.i18n.getMessage() のラップ
│  ├─ テスト環境でのフォールバック
│  └─ UI文言取得処理の一元化
├─ _locales
│  ├─ ja
│  │  └─ messages.json
│  └─ en
│     └─ messages.json
├─ overlay.js
│  ├─ ワンクッションUI
│  ├─ 表示する / 今は見ない
│  └─ 表示状態の制御
├─ options.html
├─ options.js
│  ├─ 有効 / 無効設定の読み込み
│  ├─ 表示されやすさ設定の読み込み
│  ├─ 設定値の保存
│  └─ 保存状態メッセージ表示
├─ settings.js
│  ├─ DEFAULT_SETTINGS
│  ├─ chrome.storage.local への設定保存
│  └─ テスト環境向けの安全なフォールバック
├─ chrome.storage.local
└─ tests
   ├─ risk-detector.test.js
   ├─ i18n.test.js
   ├─ manifest.test.js
   ├─ settings.test.js
   ├─ options.test.js
   ├─ content.test.js
   └─ overlay.test.js
```

## 開発用コマンド

テスト実行:

```bash
npm test
```

構文チェック:

```bash
npm run check:syntax
```

静的解析:

```bash
npm run lint
```

フォーマット:

```bash
npm run format
```

フォーマットチェック:

```bash
npm run format:check
```

構文チェック、テスト、静的解析、フォーマットチェックをまとめて実行:

```bash
npm run check
```

## 開発ステータス

現在のステータス: Chrome拡張として読み込むための最小構成に加え、X上の投稿DOM候補検出、投稿本文抽出関数、`risk-detector.js` とのドライラン接続、件数のみの安全なログ出力、`shouldCushion=true` 候補への内部マーキング、開発用フラグ配下でのワンクッションUI試験挿入を追加済みです。本格的なワンクッション適用は今後実装予定です。

## 今後の予定

- X上のDOM抽出方式の継続確認
- 投稿本文抽出とDOM監視の調整
- 開発用フラグ配下での `overlay.js` 実画面接続確認
- ワンクッションUIの実画面への適用
- Chrome拡張機能としての手動読み込み確認

## 関連プロジェクト

- ことばみまもり｜SNS投稿前の炎上防止・文章リスク確認サービス
  - サービスURL: https://words-watching-app.na0aaooq.com/
  - リポジトリ: https://github.com/na0AaooQ/words-watching-app
- がぞうみまもり｜Xセンシティブ画像フィルター
  - サービスURL: https://chromewebstore.google.com/detail/hcegagndgkhkghagpahffblnljmfcpbj?utm_source=item-share-cb
  - リポジトリ: https://github.com/na0AaooQ/nsfw-guardian-image-hideorshow
- こめんとみまもり｜YouTube安心コメントフィルター
  - サービスURL: https://comment.kokoromimamori.na0aaooq.com/
  - リポジトリ: https://github.com/na0AaooQ/safe-comment-filter-app
    - ※プライベートリポジトリ
 
## 注意事項

本拡張機能は、SNS上の投稿に対して読む前のワンクッションを置くための補助ツールです。

法律判断、医療・心理診断、相談機関による支援の代替ではありません。

危険を感じる投稿、脅迫、個人情報の晒し、執拗な攻撃などを受けた場合は、投稿内容やURL、日時、スクリーンショットなどを保存し、必要に応じて公的機関や専門窓口へ相談してください。
