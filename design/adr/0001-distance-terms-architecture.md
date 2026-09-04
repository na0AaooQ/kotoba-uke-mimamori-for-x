# ADR-0001 「距離を置きたい言葉」機能のアーキテクチャ

- Status: Accepted
- Date: 2026-09-04
- Implementation status: Not implemented
- 実装状況: 未実装

`Accepted` は、このADRに記録した設計判断を採用したことを意味します。Chrome拡張機能へ実装済みであることは意味しません。以下の構成図、UI図、操作名はすべて現段階の概念設計であり、実装ファイル名、モジュール分割、具体的なAPIは将来の実装・レビューで確定します。

## Context

この機能の中心的な目的は、ユーザー様ご自身が自分の心の状態に合わせて「今は距離を置きたい言葉」を決め、不意に読んでしまう前にワンクッションを置けるセルフケア機能を提供することです。

これはXのミュートを置き換えるものではありません。Xの既存機能だけでは残る誹謗中傷、心に負荷がかかる可能性のある言葉の「不意打ち」を減らす、補完的な守りです。ユーザー様が「読む / 今は読まない」を選べる既存思想を維持します。

### 守る境界

この機能は、登録された文字列について、次の判断や操作を行いません。

- 文字列の善悪を判定しない。
- 危険語として認定しない。
- 投稿者やアカウントの人格・危険性を評価しない。
- 投稿内容の真偽を判定しない。
- ユーザー様の精神状態を推定しない。
- 自動ブロック、自動ミュート、自動報告を行わない。
- X公式機能を置き換えない。

### 固定ルールとの違い

固定ルールは、開発者側が定義した最小限のルールベース保護です。一方、「距離を置きたい言葉」はユーザー様ご本人が追加する、個人的なセルフケア用の追加保護です。

両者を意味的にも実装的にも混同しません。特に、ユーザー様が登録した文字列を固定ルールのscoreへ加算したり、固定ルールによる投稿者評価のように扱ったりしません。

## Decision

「距離を置きたい言葉」用の設定を `chrome.storage.local` の独立したトップレベルキー `distanceTermsSettings` に保存し、将来の書き込みはManifest V3のExtension Service WorkerをSingle Writerとする概念設計を採用します。既存の `enabled`、`cushionSensitivity`、`uiLanguage` は今回の対象外とし、保存方式を変更しません。

距離ワードの一致は、専用normalizerを使うpureなliteral substring matchingとします。ユーザー様の登録語が一致した場合は、中立的なワンクッションを表示します。固定ルールが先にワンクッションを表示する場合、距離ワード判定は実行しません。

### 登録対象とMVPの範囲

言葉、フレーズ、ハッシュタグを、同じ「ユーザー様が登録した文字列」として扱います。

例:

- `社不`
- `インターネットキャバクラ`
- `#話題`
- `English phrases`
- その他のUnicode文字列

v1では種類ごとの `type` を保存しません。MVPでは、正規表現、wildcard、AND、OR、除外条件、synonym expansion、意味検索、AI、言語別意味解析を扱いません。

### 件数・文字数・有効状態

- 1件あたり2〜50文字とする。
- 最大30件とする。
- 最大件数に達しても、古い登録を自動削除しない。新しく登録するユーザー様が不要な登録を削除する。
- 各itemに個別ON/OFFを持たせる。
- 「登録した言葉によるワンクッション」用のmaster ON/OFFを持たせる。
- master OFFでも登録文字列と個別ON/OFFを削除しない。master ONへ戻すと以前の個別状態を復元する。
- 新規itemの初期 `enabled` は `true` とする。
- 一括ON、一括OFF、expiry、自動期限切れはMVPの対象外とする。

文字数はユーザー様が認識する文字単位に近いgrapheme clusterを想定します。具体的なJavaScript実装方法は未決であり、Open Questionsに残します。

### Storageデータモデル

既存の3設定 `enabled`、`cushionSensitivity`、`uiLanguage` はそのまま維持します。距離ワード用設定は次の概念構造を採用します。

```text
distanceTermsSettings
├─ schemaVersion: 1
├─ masterEnabled: true
└─ items
   ├─ {
   │    id: "stable-unique-id",
   │    term: "ユーザー様が登録した元表記",
   │    enabled: true
   │  }
   └─ ...
```

- `schemaVersion` は拡張機能versionと独立させる。
- `masterEnabled` の初期値は `true` とする。
- itemにはstable unique IDを持たせる。
- `term` には前後空白を除いた元表記を保存する。
- `enabled` はbooleanとし、配列順は登録順とする。
- `normalizedTerm`、`type`、`category`、`score`、`reason`、`matchedCount`、`lastMatchedAt`、`createdAt`等の日時はv1で保存しない。
- `distanceTermsSettings` が未登録である状態は、正常な「未設定」とする。
- 読み込みだけで空データを自動的に書き込まない。

### normalizerと照合

距離ワード専用normalizerを、既存固定ルールのnormalizerから分離します。既存固定ルールでは空白collapse等を行う可能性がある一方、距離ワードではユーザー様が登録した文字列の空白や記号を意味のあるデータとして保持するためです。

- literal substring matchingを行う。
- 登録側と投稿本文側で、同じ距離ワード専用normalizerを使用する。
- Unicode NFKCを用いる。
- ASCII英字は大文字小文字を同一視する。
- 内部空白と記号を保持する。
- `#topic` と `topic` は別の文字列として扱う。
- 独自のひらがな/カタカナ変換、異体字変換、synonym変換、意味解析、投稿言語推定は行わない。

ここでいう「multilingual」は、言語別AI判定を行う意味ではありません。日本語・英語・その他のUnicode文字列を、同じliteral substring方式で扱うという意味です。UI言語と投稿言語は独立します。たとえば、`uiLanguage=ja` では英語投稿に一致しても日本語UIを表示し、`uiLanguage=en` では日本語投稿に一致しても英語UIを表示します。

### `normalizedTerm` を保存しない理由

登録時には一時的にnormalizerを使用し、validationとduplicate検出を行います。ただし正規化後の文字列は永続保存しません。

1. データ最小化のため。センシティブになり得る登録文字列の派生値を余分に保存しない。
2. 元表記を唯一の保存上の正本にするため。全角などのユーザー様の表記を画面表示で保持できる。
3. normalizer変更時のmigrationを減らすため。保存済みの `normalizedTerm` 全件をmigrationする必要をなくす。
4. `term` と `normalizedTerm` の不整合を防ぐため。派生値をSource of Truthにしない。

実行時は、保存済みの `term` を一時的にnormalizationして `preparedTerms` を作り、投稿の `postText` も同じnormalizerで `normalizedPost` にします。どちらも一時値であり、永続保存しません。

### 入力validation

Optionsではユーザー様向けのUX validationを行い、Service Workerではセキュリティとデータ整合性のために独立して再validationします。

- 前後空白をtrimし、空文字を拒否する。
- 2〜50文字を許可する。
- 正規化後に完全重複する文字列を拒否する。
- 改行、タブ、問題のあるcontrol/invisible characterを拒否する。
- 通常のUnicode文字、記号、emojiは原則許可する。
- 内部の通常スペースと連続スペースは保持する。
- 包含関係のある語は登録可能とする。例: `テスト` と `Xワンクッションテスト文字列`。
- validation失敗時は入力値を消さず、既存保存データを変更しない。
- 保存成功確認後に一覧へ反映する。

ユーザー様向け文言は、たとえば「この言葉はすでに登録されています。」「登録できるのは最大30件です。新しく追加する場合は、不要な登録を削除してください。」「改行やタブを含めず、1行で入力してください。」「登録できない文字が含まれています。見える文字を使って入力してください。」「距離を置きたい言葉を追加しました。」「登録できませんでした。入力内容はそのまま残しています。もう一度お試しください。」という方向性とします。最終i18n文言は実装時レビューで確定します。

## Architecture and flow

### 概念アーキテクチャ

```text
┌────────────────────────────────────────────────────────────────┐
│ Chrome Extension                                               │
│                                                                │
│  Options UI                                                    │
│  ・登録/削除・個別ON/OFF・Master ON/OFF・UX validation          │
│  ├─ mutation intent ──────────────▶ Extension Service Worker  │
│  └─ direct read ──────────────────▶ chrome.storage.local      │
│                                                                │
│  Extension Service Worker / Single Writer                      │
│  ・validation・serialized mutation・whole-object write         │
│  ├─ latest read before mutation ──▶ chrome.storage.local      │
│  └─ whole-object write ───────────▶ chrome.storage.local      │
│     distanceTermsSettings sole writer                          │
│                                                                │
│  X posts ──▶ Content Script                                    │
│              ├─ direct read ─────────▶ chrome.storage.local   │
│              └─ fixed-rule detector                            │
│                    │ fixed ruleで未確定の場合のみ              │
│                    ▼                                           │
│                 distance matcher ─────────────▶ cushion UI     │
│                                                                │
│  chrome.storage.local                                          │
│  ・existing settings ・distanceTermsSettings                    │
└────────────────────────────────────────────────────────────────┘

外部サーバーは使用しない。
Conceptual design / Not implemented / Implementation details may change
```

Mutationは `Options → Service Worker → chrome.storage.local` とし、`distanceTermsSettings` のwriteはService Workerだけに限定します。readは `Options → chrome.storage.local`、`Content Script → chrome.storage.local`、およびService Workerがmutation直前に行うlatest storage readです。投稿本文、登録語、一致結果、scoreを外部サーバーへ送信しません。

### 書き込みとSingle Writer

将来実装するSingle Writerの対象は、新しい `distanceTermsSettings` だけです。既存3設定をこの仕組みへ移行しません。既存仕様の回帰リスクを抑えるためです。

Optionsは完成済みsettings objectを直接 `storage.set` せず、Service Workerへmutation intentだけを送ります。想定する概念上のoperationは次のとおりです。

- `addTerm(term)`
- `setItemEnabled(id, true/false)`
- `setMasterEnabled(true/false)`
- `deleteItem(id)`

状態を反転させるtoggle operationは採用しません。desired stateを明示する冪等operationとします。

1 mutationの概念フローは次のとおりです。

1. messageを受信する。
2. messageをvalidationする。
3. mutation queueで直列化する。
4. `chrome.storage.local` から最新の `distanceTermsSettings` をreadする。
5. schemaとデータをvalidationする。
6. mutationを適用する。
7. mutation後データを再validationする。
8. `chrome.storage.local.set({ distanceTermsSettings: wholeObject })` を1回行う。
9. write完了をawaitする。
10. 成功responseを返す。

whole objectを1トップレベルキーにまとめ、1 mutationで1回だけ `storage.set` します。queueやglobal memoryはSource of Truthではなく、Source of Truthは常に `chrome.storage.local` です。Service Workerの停止・再起動を前提にし、mutation開始時に毎回最新storageをreadします。IDはService Worker側で生成し、Options側が生成したIDは信用しません。

Service Workerがwrite前に終了した場合は永続変更なしとして再試行できます。write失敗は失敗として扱い、既存状態を空にはしません。write成功後にresponseがOptionsへ届く前に終了した場合も、冪等operationにより再試行が安全に収束できるようにします。

### 読み込みの責務

Service Workerをすべてのread/writeの万能Gatewayにはしません。

- Optionsは `chrome.storage.local` を直接readする。
- Content Scriptは `chrome.storage.local` を直接readする。
- Service Workerはmutation直前に最新値をreadする。
- すべてのreadで共通validationを行う。

readをService Workerへ集中させる必要はなく、停止中にもreadの可用性を高く保てます。Lost Updateはwrite時の問題であり、clientがsnapshot全体を書き戻さなければdirect read自体は問題になりにくいためです。Optionsはmutation成功後、Service Workerからsettings objectを受け取って画面更新するのではなく、storageから最新snapshotを再readして表示します。

### 概念上の責務分担

| 領域 | 責務 |
| --- | --- |
| Common domain logic | normalization、schema validation、item validation、有効item抽出、将来migrationのpure conversion |
| Common read layer | storage read、domain validator利用、`missing` / `ok` / `partially_invalid` / `invalid` / `unsupported_schema` / `read_failed`等の状態分類。writeや自動repairはしない。 |
| Options | UI、UX validation、一覧、個別ON/OFF、master ON/OFF、削除確認、mutation intent送信、response codeのi18n表示への変換、成功後storage再read。`distanceTermsSettings` を直接writeしない。 |
| Service Worker | sole writer、message/sender validation、mutation queue、latest storage read、データvalidation、mutation、ID生成、final validation、whole-object write、response。 |
| Content Script | direct read、共通validation、snapshot準備、`preparedTerms`作成、distance matcher利用。settings writeをしない。 |
| Fixed rule detector | 既存固定ルール判定のみ。distance termをscoreへ統合しない。 |

この責務は概念上のものであり、具体的なファイル名やmodule名は未決です。たとえば `distance-terms-core.js` のような名前は概念例に留めます。

### message securityとresponse contract

Options validationはUX、Service Worker validationはsecurity/data protectionです。Optionsから来るmessageを信用しません。

- messageがobjectか、operationがallowlistか、payload shapeとunknown fieldsを検証する。
- string、boolean、長さ、item ID、senderを検証する。
- booleanは `"false"`、`0`、`null` 等をtruthy/falsy変換せず、strict booleanとして確認する。
- operation文字列を動的に実行しない。

responseは次の概念形とします。

```text
成功:       { ok: true,  code: "OK" }
変更不要:   { ok: true,  code: "NO_CHANGE" }
失敗:       { ok: false, code: "FIXED_INTERNAL_CODE" }
```

responseにterm、normalized term、item object、storage全体、投稿本文、stack trace、exception全文、file/line、schema内部詳細を含めません。Optionsはcodeを直接ユーザー様へ表示せず、i18nされた安全な文言へ変換します。Options側でもresponse shapeを検証します。`chrome.runtime.sendMessage` 自体の通信失敗やresponseなしはService Worker responseではないため、Options側で `COMMUNICATION_FAILED` 相当へ分類します。error codeの最終一覧はOpen Questionです。

### matcherと固定ルールの実行順

distance matcherは副作用のないpure literal substring判定です。入力は `postText` と `preparedTerms`、出力はbooleanだけとします。matched term、item ID、match position、match count、score、reason、category、normalized post、post bodyは返しません。

ページ初期化時に有効termを一度だけnormalizerへ通し、メモリ上に `preparedTerms` を作ります。投稿ごとに `postText` を一度だけnormalizeし、登録順に照合します。`preparedTerms.some(...)` 相当で最初の一致時に `true` を返してshort-circuitし、全件不一致なら `false` を返します。最大30件の規模であるため、複雑な検索indexやDB機能は導入しません。

```text
Xの投稿本文
│
▼
固定ルール判定
│
├─ ワンクッション対象
│    └─ 既存UIを表示して終了
│       距離ワード判定は省略
│
└─ 対象外
     │
     ▼
  距離ワード機能有効？
     │
     ├─ No → 表示なし
     │
     └─ Yes
          │
          ▼
       literal substring matcher
          │
          ├─ preparedTerms.some(...) の最初の一致 → true → 中立的な距離ワードUI
          └─ 全件不一致                         → false → 表示なし

Conceptual design / Not implemented
```

fixed ruleを先に判定し、fixed ruleだけで表示が確定した場合はdistance termに触れません。distance termをfixed scoreへ加算せず、両方を別々のカードとして表示しません。fixed rule成立時は既存fixed UIを優先し、distance-only時は中立的UIを使用します。distance-only UIではexpression strength、tendency、score、一致した登録語を表示しません。

### Content Scriptの初期化と反映境界

```text
existing settings read
↓
enabled=false ?
├─ Yes → 現行どおり処理を開始しない
└─ No
    ↓
既存固定ルール機能を利用可能にする
↓
distanceTermsSettingsを別系統でread
├─ 正常 → validation → masterEnabled確認 → enabled item抽出
│          → transient normalize → preparedTerms生成
├─ missing / master OFF / enabled item 0 → preparedTermsは空
└─ read failure / whole invalid / unsupported → distance featureのみ利用不可
                                             → preparedTermsは空相当
```

そのページでは読み込んだ設定をsnapshotとして利用します。Optionsで設定を変更しても、開いているXタブへリアルタイム反映しません。Xページを再読み込み後に新しい設定を読み込みます。`chrome.storage.onChanged` によるリアルタイム反映はMVPの対象外です。

### Options UIの概念案

```text
┌────────────────────────────────────────────┐
│ 距離を置きたい言葉                         │
│                                            │
│ 自分が今は距離を置きたい言葉を登録できます。 │
│                                            │
│ 登録した言葉によるワンクッション     [ ON ] │
│ OFFにしても登録内容は削除されません。       │
│                                            │
│ ┌────────────────────────────┐ [追加]      │
│ │ 言葉・フレーズ・ハッシュタグ │            │
│ └────────────────────────────┘             │
│ 2〜50文字                                  │
│                                            │
│ 登録数 3 / 30                              │
│                                            │
│ [ON]  社不                     [削除]       │
│ [ON]  インターネットキャバクラ [削除]       │
│ [OFF] #話題                    [削除]       │
│                                            │
│                    使い方・マニュアルを見る ↗ │
└────────────────────────────────────────────┘

Conceptual UI / Not implemented / Implementation details may change
```

### distance-only投稿UIの概念案

```text
┌────────────────────────────────────────────┐
│ 読む前に、少しだけワンクッションを置きました │
│                                            │
│ 登録した「距離を置きたい言葉」が含まれている │
│ ため、ワンクッションを置いています。         │
│                                            │
│ [内容を表示する]       [今は見ない]          │
└────────────────────────────────────────────┘

Conceptual UI / Not implemented
```

投稿本文はぼかしたままとし、一致した登録語、score、表現の強さ、tendency、投稿者への評価を表示しません。上記の日本語文言は現時点のUI候補であり、最終文言はi18n/UIレビュー時に確定します。

## Privacy, security, and failure handling

### Security invariant

ユーザー様が登録した文字列は、保存・判定・画面表示の全工程で「データ」としてのみ扱います。HTML、JavaScript、正規表現、CSSセレクタ、コマンド等の実行可能な構文として解釈しません。保存データも読み込み時に再validationします。

- `innerHTML` にtermを入れず、表示は `textContent` 等の安全な方法を用いる。
- user termから `RegExp` を生成しない。
- `eval` と `new Function` を使用しない。
- `querySelector` 用文字列へtermを連結せず、CSS selectorとして解釈しない。
- shell/OS commandへ渡さない。
- message payloadとstorageを信用しない。
- syntax-looking stringも、その他のvalidationに通れば単なるデータとして保存できる。

### Graceful degradation

最重要不変条件は、`distanceTermsSettings` に問題が起きても、既存固定ルールによるワンクッションを停止させないことです。

| 状態 | 距離ワード機能 | 固定ルール | 保存データへの扱い |
| --- | --- | --- | --- |
| `missing` | 0件として扱う | 継続 | 自動writeしない |
| all valid | 有効 | 継続 | 通常利用 |
| some invalid items | valid itemsだけ利用 | 継続 | raw dataを変更せず、不正itemを自動削除しない |
| whole object invalid | 停止 | 継続 | 自動resetしない |
| unsupported future schema | 停止 | 継続 | corruption扱いせず、downgrade/resetしない |
| temporary read failure | 一時利用不可 | 継続 | corruptionと断定せず、retry/read againを優先 |
| migration failure | 停止 | 継続 | old dataを保持 |

部分不正では、Optionsに「一部の登録設定を読み込めませんでした。読み込めた設定だけでワンクッションを続けています。保存されているデータは変更していません。」相当の穏やかな案内を検討します。

### Recovery

自動修復・自動削除は行いません。

- 部分不正では、valid itemsを継続利用し、ユーザー様が明示的に「問題のある登録を削除する」操作を選べる方向とする。invalid termそのものを無理にUI表示する必要はない。
- 全体破損では、`distanceTermsSettings` だけを初期化する明示的recoveryを検討し、strong confirmationを求める。既存の `enabled`、`cushionSensitivity`、`uiLanguage` には触れない。
- unknown schemaはreset対象にしない。
- temporary read failureではresetを案内せず、retryを優先する。
- uninstall/reinstallで `chrome.storage.local` のデータが失われる可能性はあるが、通常の復旧手順にはせず、最後の手段とする。

## Alternatives considered

### 採用: `chrome.storage.local` + Service Worker Single Writer

最大30件程度のユーザー設定には、既存の拡張機能設定基盤を使いつつ、writeだけをSingle Writerに寄せる構成が必要十分です。RDBのACID概念は、更新の直列化、最新値からのmutation、失敗時に既存状態を消さないという考え方の参考にしますが、RDBそのものを導入することとは分けます。「小さなDB」を自作せず、必要十分な整合性だけを実現します。

### IndexedDB

transaction機能を含め十分利用可能です。しかし最大30件程度の設定に対しては、レイヤー追加と実装複雑性が大きいため採用しません。

### SQLite / SQLite WASM / OPFS等

ACID思想は参考になりますが、小規模設定に対して構成、依存、保守が過剰です。採用しません。

### ローカルテキストファイル

Chrome Extension設定のSource of Truthとして扱いにくく、atomic update、access、recoveryも不自然です。採用しません。

### Optionsからのdirect whole-object write

stale snapshotによるLost Updateの余地があります。そのため、`distanceTermsSettings` だけをSingle Writerへ寄せます。

## Consequences

### 得られること

- 既存fixed ruleとdistance termの故障境界を分けられる。
- privacyとdata minimizationを維持できる。
- Single WriterによりLost Updateを抑制できる。
- 最大30件の規模に対して構成をシンプルに保てる。
- `normalizedTerm` を保存しないため、将来のnormalization変更に耐えやすい。

### 受け入れるコスト

- Service Workerという1コンポーネントが増える。
- OptionsとService Worker間のmessage protocolが必要になる。
- direct readとSingle Writerという責務分離を保守する必要がある。
- 設定変更はXページ再読み込み後に反映され、real-timeではない。

## Out of scope

- AI、外部API、外部サーバー送信
- 意味解析、言語自動判定、regex、wildcard、AND / OR、synonym expansion
- backup、restore、import/export、expiry
- real-time settings reflection
- automatic X mute、automatic X block、automatic report
- term危険度評価、fixed scoreへのterm加算
- SQLite、IndexedDB
- existing 3 settingsのSingle Writer移行

## Open Questions

以下はAcceptedな設計判断ではなく、実装時に検討・レビューする事項です。

- grapheme clusterの具体的な計数方法
- ZWJ emojiを壊さず、不要な不可視文字のみを拒否する具体方式
- stable unique IDの具体形式と生成API
- Service Worker sender validationの具体実装
- mutation queueの具体的なJavaScript実装
- migration関数/APIの具体構成
- error codeの最終一覧
- 30件表示時の具体的な折りたたみUI
- 実装ファイル名とmodule名
- 詳細なテストケース
