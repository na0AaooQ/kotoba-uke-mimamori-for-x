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

MVPでは、`score >= 80` の場合のみワンクッション表示の対象にします。

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

オプション画面の最小土台を追加し、ユーザーが拡張機能の有効 / 無効を切り替えられる設定保存の準備を行いました。設定保存には `chrome.storage.local` を使用し、保存対象は有効 / 無効などの設定値に限定します。投稿本文や判定結果は保存しません。

現時点では、通常判定の本番適用は今後接続予定です。初期設定は `enabled: false` で、ユーザーが明示的にONにする前提の土台にしています。

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

`content.js` は、X上の投稿DOM候補を検出し、投稿本文らしきテキストを抽出する最小処理を追加済みです。また、`risk-detector.js` とのドライラン接続により、投稿本文をログに出さず、保存・外部送信も行わず、判定対象件数とワンクッション候補件数のみで処理状況を確認します。`shouldCushion=true` の投稿候補には、次工程で `overlay.js` を安全に接続するための内部マーキングを行います。

`overlay.js` は、ワンクッションUI生成のための土台です。開発用フラグ配下で、`shouldCushion=true` の内部マーキング済み投稿にワンクッションUIを試験挿入できます。開発用フラグ配下のワンクッションUIは、X投稿カード内に自然に収まるよう、目にやさしい見た目と投稿本文付近への挿入位置に調整しています。また、開発用フラグ配下で、ライトモード・ダークモードにおけるワンクッションUIの視認性、ぼかし強度、ボタンフォーカス表示を確認・調整しています。通常状態ではフラグOFFのため、画面表示変更は行いません。また、外部通信、投稿本文の保存、投稿DOMの削除は行いません。

## 開発確認手順

以下の確認は、開発中に安全にワンクッションUIの接続状態を確認するためのものです。

確認後は必ず `content.js` の開発用フラグを `false` に戻し、Chrome拡張を再読み込みしてください。通常状態では画面表示変更を行いません。テスト文言は開発確認専用であり、通常判定ルールには含めません。投稿本文・ユーザー情報・URL・内部判定詳細をログやUIに出さないでください。

### B. DOM手動属性付与によるワンクッションUI確認

この確認方法は、実在の投稿本文を使わずに、開発用フラグON時のUI挿入位置・重複挿入防止・表示崩れを確認するためのものです。

確認時のみ、`content.js` の開発用フラグ `enableCushionOverlayDev` を一時的に `true` にします。`enableDevTestCushionText` は `false` のままで構いません。

```js
const FEATURE_FLAGS = Object.freeze({
  enableCushionOverlayDev: true,
  enableDevTestCushionText: false
});
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
  enableCushionOverlayDev: true,
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
│  ├─ 有効 / 無効設定の保存
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
