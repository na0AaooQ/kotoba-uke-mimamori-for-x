# ADR-0001 「距離を置きたい言葉」機能のアーキテクチャ

- Status: Accepted
- Date: 2026-09-04
- Implementation-ready design date: 2026-09-08
- Implementation status: Not implemented
- 実装状況: 未実装

`Accepted` は、このADRに記録した設計判断を採用したことを意味します。Chrome拡張機能へ実装済みであることは意味しません。2026-09-04はAccepted時点の概念設計、2026-09-08は実装前詳細設計レビューの確定日です。Accepted時点の設計判断・検討履歴は本ADR内に保持しますが、概念例と2026-09-08の詳細設計が異なる場合は、後者を今後の実装仕様として扱います。

Implementation statusは引き続き `Not implemented`（未実装）です。今回の文書更新は実装完了を意味しません。具体的な実装ファイル名やmodule分割など、本ADRで明示的に未決とした事項は将来の実装レビューで確定します。

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

第一版では種類ごとの `type` を保存しません。MVPでは、正規表現、wildcard、AND、OR、除外条件、synonym expansion、意味検索、AI、言語別意味解析を扱いません。

### 件数・文字数・有効状態（Accepted時点の概念）

- 1件あたり2〜50文字とする。
- 最大30件とする。
- 最大件数に達しても、古い登録を自動削除しない。新しく登録するユーザー様が不要な登録を削除する。
- 各itemに個別ON/OFFを持たせる。
- 「登録した言葉によるワンクッション」用のmaster ON/OFFを持たせる。
- master OFFでも登録文字列と個別ON/OFFを削除しない。master ONへ戻すと以前の個別状態を復元する。
- 新規itemの初期 `enabled` は `true` とする。
- 一括ON、一括OFF、expiry、自動期限切れはMVPの対象外とする。

Accepted時点では、文字数をユーザー様が認識する文字単位に近いgrapheme clusterとし、具体的なJavaScript実装方法をOpen Questionとしていました。2026-09-08の詳細設計で、`Intl.Segmenter`、2〜50 extended grapheme clusters、最大512 Unicode code pointsという境界を確定しました。

### Storageデータモデル（Accepted時点の概念と詳細設計による更新）

既存の3設定 `enabled`、`cushionSensitivity`、`uiLanguage` はそのまま維持します。距離ワード用設定は次の概念構造を採用します。

```text
distanceTermsSettings
├─ schemaVersion: 1
├─ masterEnabled: true
└─ items
   ├─ {
   │    id: "stable-unique-id",
   │    term: "NFKC + trim後の文字列",
   │    enabled: true
   │  }
   └─ ...

Accepted-time conceptual data model / 2026-09-04
The storage-term detail is refined by the 2026-09-08 design below.
Not implemented
```

- `schemaVersion` は拡張機能versionと独立させる。
- `masterEnabled` の初期値は `true` とする。
- itemにはstable unique IDを持たせる。
- Accepted時点では、`term` に前後空白を除いた元表記を保存し、全角等の表記も保持する概念例としていた。
- 2026-09-08の詳細設計でこの点を更新し、正式な実装仕様では `term` に **NFKC + trim後の文字列** を保存する。ASCII英字の大文字・小文字は保存時には保持する。
- `enabled` はbooleanとし、配列順は登録順とする。
- `normalizedTerm`、`type`、`category`、`score`、`reason`、`matchedCount`、`lastMatchedAt`、`createdAt`等の日時は第一版で保存しない。
- `distanceTermsSettings` が未登録である状態は、正常な「未設定」とする。
- 読み込みだけで空データを自動的に書き込まない。

### normalizerと照合

距離ワード専用normalizerを、既存固定ルールのnormalizerから分離します。既存固定ルールでは空白collapse等を行う可能性がある一方、距離ワードではユーザー様が登録した文字列の空白や記号を意味のあるデータとして保持するためです。

- literal substring matchingを行う。
- 登録側と投稿本文側でNFKCとASCII case-foldの比較原則を共有する。ただし登録側だけがtrimとvalidationを行い、投稿本文側はraw `textContent` をtrim・空白collapseせず処理する。
- Unicode NFKCを用いる。
- ASCII英字は大文字小文字を同一視する。
- 内部空白と記号を保持する。
- `#topic` と `topic` は別の文字列として扱う。
- 独自のひらがな/カタカナ変換、異体字変換、synonym変換、意味解析、投稿言語推定は行わない。

ここでいう「multilingual」は、言語別AI判定を行う意味ではありません。日本語・英語・その他のUnicode文字列を、同じliteral substring方式で扱うという意味です。UI言語と投稿言語は独立します。たとえば、`uiLanguage=ja` では英語投稿に一致しても日本語UIを表示し、`uiLanguage=en` では日本語投稿に一致しても英語UIを表示します。

### `normalizedTerm` を保存しない理由

登録時にはNFKC + trim後の文字列を `term` として保存し、validationとduplicate検出を行います。ただし、ASCII case-fold等を適用したduplicate / matcher用の派生値を、別の `normalizedTerm` fieldとして永続保存しません。

1. データ最小化のため。センシティブになり得る登録文字列の派生値を余分に保存しない。
2. NFKC + trim後の `term` をStorage上の唯一のSource of Truthとするため。
3. matcher用のcomparison keyはruntimeで生成でき、永続データとして増やす必要がないため。
4. `term` と永続化した派生値の不整合を防ぐため。
5. normalization変更時に、余分な永続派生値のmigrationを発生させないため。

Accepted時点では「全角等の元表記を保持する」ことを理由に含めていたが、これは2026-09-08の詳細設計で上記の方針へ更新した。たとえば `ＡＢＣ` は `ABC` として保存し、`Hello` と `HELLO` はそれぞれ入力時のASCII caseを保持して保存する。duplicate比較とmatchingでは、ASCII `A-Z` だけをcase-insensitiveとして扱う。`normalizedTerm` は引き続き永続保存しない。

実行時は、保存済みの `term` からASCII case-fold済みの `preparedTerms` を作り、投稿のraw `textContent` からNFKC + ASCII case-fold済みの比較用本文を作ります。どちらも一時値であり、永続保存しません。登録経路と投稿本文経路の正確な差は、後述の実装前詳細設計を正本とします。

### 入力validation（Accepted時点の概念）

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

この節はAccepted時点の要求水準を示す概念記録です。grapheme count、code-point safety limit、禁止文字境界、処理順、duplicate namespace、確定した利用者向け文言は、後述の「実装前詳細設計（2026-09-08）」を正式仕様とします。Accepted時点の文言候補のうち「登録できない文字が含まれています。見える文字を使って入力してください。」は、正当なZWJ / ZWNJ等を否定するように読めるため採用しません。

## Architecture and flow

### 概念アーキテクチャ（Accepted時点）

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
Accepted-time conceptual design / 2026-09-04
Superseded for implementation details by the 2026-09-08 design below.
Not implemented
```

Mutationは `Options → Service Worker → chrome.storage.local` とし、`distanceTermsSettings` のwriteはService Workerだけに限定します。readは `Options → chrome.storage.local`、`Content Script → chrome.storage.local`、およびService Workerがmutation直前に行うlatest storage readです。投稿本文、登録語、一致結果、scoreを外部サーバーへ送信しません。

### 書き込みとSingle Writer

将来実装するSingle Writerの対象は、新しい `distanceTermsSettings` だけです。既存3設定をこの仕組みへ移行しません。既存仕様の回帰リスクを抑えるためです。

Optionsは完成済みsettings objectを直接 `storage.set` せず、Service Workerへmutation intentだけを送ります。Accepted時点で想定した通常operationは次のとおりです。2026-09-08の詳細設計では、これらにRecovery用の `deleteInvalidItems` と `resetInvalidSettings` を加えた6 operationを正式仕様とします。

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

Service Workerがwrite前に終了した場合は永続変更なしです。write失敗は失敗として扱い、既存状態を空にはしません。Accepted時点では、write成功後にresponseがOptionsへ届かなかった場合も冪等operationの再試行で収束させる方向を想定していました。2026-09-08の詳細設計では、response消失時の**blind retryを禁止**し、OptionsがStorageを再readしてdesired stateを確認する方式へ更新します。

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
| Common read layer | storage read、domain validator利用、`missing` / `valid` / `partially_invalid` / `whole_invalid` / `unsupported_schema` / `read_error`の状態分類。writeや自動repairはしない。 |
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

responseにterm、normalized term、item object、storage全体、投稿本文、stack trace、exception全文、file/line、schema内部詳細を含めません。Optionsはcodeを直接ユーザー様へ表示せず、i18nされた安全な文言へ変換します。Options側でもresponse shapeを検証します。`chrome.runtime.sendMessage` 自体の通信失敗やresponseなしはService Worker responseではないため、Options側で `COMMUNICATION_FAILED` 相当へ分類します。Accepted時点では未決だったerror code一覧は、2026-09-08の詳細設計で確定しました。

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

Accepted-time conceptual flow / 2026-09-04
Superseded for implementation details by the 2026-09-08 design below.
Not implemented
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

Accepted-time conceptual initialization flow / 2026-09-04
Superseded for implementation details by the 2026-09-08 design below.
Not implemented
```

そのページでは読み込んだ設定をsnapshotとして利用します。Optionsで設定を変更しても、開いているXタブへリアルタイム反映しません。Xページを再読み込み後に新しい設定を読み込みます。`chrome.storage.onChanged` によるリアルタイム反映はMVPの対象外です。

### Options UIの概念案（Accepted時点）

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

Accepted-time conceptual UI / 2026-09-04
Superseded for implementation details by the 2026-09-08 design below.
Not implemented
```

### distance-only投稿UIの概念案（Accepted時点）

```text
┌────────────────────────────────────────────┐
│ 読む前に、少しだけワンクッションを置きました │
│                                            │
│ 登録した「距離を置きたい言葉」が含まれている │
│ ため、ワンクッションを置いています。         │
│                                            │
│ [内容を表示する]       [今は見ない]          │
└────────────────────────────────────────────┘

Accepted-time conceptual UI / 2026-09-04
Superseded for implementation details by the 2026-09-08 design below.
Not implemented
```

投稿本文はぼかしたままとし、一致した登録語、score、表現の強さ、tendency、投稿者への評価を表示しません。上記はAccepted時点のUI候補です。日本語・英語の確定文言は、後述の「実装前詳細設計（2026-09-08）」を正式仕様とします。

## 実装前詳細設計（2026-09-08）

この章は、今後のv2.0.0実装で参照する正式な実装基準です。2026-09-04にAcceptedとなった基本判断と検討履歴を維持し、その実装境界を確定します。Accepted時点の概念例と本章が異なる場合は、本章を優先します。

本章の追加後もImplementation statusは `Not implemented`（未実装）です。図はpixel-perfectな画面指定ではなく、情報階層、責務、データフロー、操作境界を示します。

### 1. 登録termの文字列仕様

登録入力は、必ず次の順で処理します。

```text
入力
↓
NFKC
↓
trim
↓
forbidden-character validation
↓
extended grapheme cluster count
↓
Unicode code point safety limit
↓
duplicate check
```

- 利用者向けの最小長は2 extended grapheme clusters、最大長は50 extended grapheme clustersとする。
- JavaScript実装では `Intl.Segmenter` の `granularity: "grapheme"` を使用する。
- 内部安全上限は、NFKC + trim後で最大512 Unicode code pointsとする。513 code points以上はrejectする。
- 前後空白はtrimする。
- 内部空白、連続空白、記号は保持する。
- 禁止文字を自動削除・自動置換して登録可能なtermへ変換しない。禁止文字が1つでもあれば登録自体をrejectする。

保存する `term` はNFKC + trim後の文字列です。ASCII英字のcaseは保存時には変換しません。

| 入力 | 保存する `term` |
| --- | --- |
| `ＡＢＣ` | `ABC` |
| `Hello` | `Hello` |
| `HELLO` | `HELLO` |

`normalizedTerm` は永続保存しません。保存済み `term` を唯一のSource of Truthとし、duplicateやmatchingに使うcomparison keyはruntimeで生成します。

### 2. 禁止文字と許可文字

第一版では、少なくとも次を拒否します。

- C0 controls（U+0000〜U+001FおよびU+007F）
- C1 controls（U+0080〜U+009F）
- 内部LF
- 内部CR
- 内部TAB
- U+2028 LINE SEPARATOR
- U+2029 PARAGRAPH SEPARATOR
- U+061C ALM
- U+200E LRM
- U+200F RLM
- U+202A LRE
- U+202B RLE
- U+202C PDF
- U+202D LRO
- U+202E RLO
- U+2066 LRI
- U+2067 RLI
- U+2068 FSI
- U+2069 PDI
- U+200B ZERO WIDTH SPACE
- U+2060 WORD JOINER
- U+FEFF BOM / ZWNBSP
- U+00AD SOFT HYPHEN
- U+034F COMBINING GRAPHEME JOINER

第一版では、次を許可します。

- U+200C ZWNJ
- U+200D ZWJ
- combining marks
- variation selectors
- 通常のArabic / Hebrew等のRTL文字

「見えない文字をすべて拒否する」という設計にはしません。ZWJ / ZWNJ等の正当な文字形成用途を維持します。

利用者向け文言は、内部Unicode名称を過剰に露出しない次の表現とします。

日本語:

> 登録できない文字が含まれています。画面上に表示されない一部の文字は登録できません。入力内容を確認してください。

英語:

> This entry contains a character that cannot be registered. Some characters that are not visible on screen cannot be registered. Please review your entry.

### 3. duplicate仕様

duplicate comparison keyは次のとおりです。

```text
NFKC + trim + ASCII case-fold
```

- ASCII case-foldはASCII `A-Z` だけをcase-insensitiveにする。
- enabled / disabledを問わず、全itemを同じduplicate namespaceとして扱う。
- `Hello`、`hello`、`Ｈｅｌｌｏ` は重複としてrejectする。
- 包含関係はduplicateではない。`テスト` と `Xワンクッションテスト文字列` は共存できる。
- `partially_invalid` でも、invalid itemの `term` 部分を安全に読み取れる場合は、そのcanonical duplicate keyをduplicate checkへ含める。
- `term` 自体を安全に解釈できないinvalid itemについては、値を推測しない。

### 4. 投稿本文matcherの文字列経路

distance matcherは、fixed rule用の `normalizeExtractedText()` 等で空白collapse済みの本文を流用しません。投稿本文は専用の別経路で処理します。

```text
post DOM
│
├─ fixed-rule path
│    raw extracted text
│    ↓
│    existing normalizeExtractedText()
│    ↓
│    whitespace collapse等の既存処理
│    ↓
│    existing fixed-rule detector
│
└─ distance-term path
     raw textContent
     ↓
     NFKC
     ↓
     ASCII case-fold
     ↓
     literal substring match

Implementation-ready Content Script string routes / 2026-09-08

重要:
distance matcherへfixed-rule用のnormalize済み本文を渡してはならない。
```

distance-term pathでは、次を行いません。

- trim
- whitespace collapse
- 改行置換
- punctuation削除
- Unicode全体のlowercase
- diacritic削除
- tokenize
- invisible-character除去
- 意味解析

登録termが `今日は  雨` のように内部spaceを2個含む場合、投稿 `今日は  雨です` にはmatchしますが、spaceが1個の `今日は 雨です` にはmatchしません。意図的なZWSP等による回避も、第一版では広義matchへ変換せず、literal substringの境界を維持します。

### 5. Storage state classification

`distanceTermsSettings` のread結果を、正式に次の6状態へ分類します。

| 状態 | 判定と距離ワード機能 | fixed rule | 保存データへの扱い |
| --- | --- | --- | --- |
| `missing` | 正常な未設定。0件として扱う | 継続 | readだけでauto-writeしない |
| `valid` | 通常利用 | 継続 | 通常mutationが可能 |
| `partially_invalid` | safely validなitemだけdistance protectionへ利用 | 継続 | invalid itemを自動修正・自動削除しない |
| `whole_invalid` | distance protection停止、normal editing停止 | 継続 | explicit recoveryだけを許可 |
| `unsupported_schema` | distance protection停止 | 継続 | データを保持し、corruption扱い、reset、downgradeをしない |
| `read_error` | distance protectionを一時利用不可とする | 継続 | corruption扱いせず、retryを優先する |

raw `items.length` が31件以上の場合は、どの30件を利用するか推測せず、`whole_invalid` とします。

### 6. Never repair on readとraw-preserving mutation

原則は **Never repair on read** です。read時に次を行いません。

- invalid itemの自動削除
- 型coercion
- missing `enabled` の補完
- IDの自動補完
- termの自動補正
- defaultの自動write
- read-time writeback

`partially_invalid` で通常mutationを許可する場合は、次の順で処理します。

```text
latest raw objectをread
↓
対象となる安全で一意なvalid itemだけを変更
↓
既存invalid raw部分をそのまま保持
↓
whole-object storage.set
```

Storage APIとしてはwhole-object writeであっても、意味論上はraw-preserving targeted mutationです。最大30件判定はraw `items.length` を基準にします。たとえばvalid 28件、invalid 2件でraw `items.length = 30` なら、新規addは禁止します。

### 7. Recovery

Recoveryの共通原則は「削除できると確信できる範囲だけ削除する。解釈できない未来データや一時障害では、何も壊さない」です。

#### `partially_invalid`

Optionsではvalid itemsの通常UIを引き続き利用可能とし、次の案内を表示します。invalid term自体は表示しません。

```text
┌──────────────────────────────────────────────────────────┐
│ 一部の登録設定を読み込めませんでした                     │
│                                                          │
│ 読み込めた設定だけでワンクッションを続けています。       │
│ 保存されているデータは自動では変更していません。         │
│                                                          │
│ 問題のある登録：2件                                      │
│                                                          │
│ [ 問題のある登録を削除する ]                             │
└──────────────────────────────────────────────────────────┘

valid itemsの通常UIは引き続き利用可能。
Implementation-ready partially_invalid Recovery UI / 2026-09-08
```

`deleteInvalidItems` はitem-by-itemではなく、現在invalidと判定できるitemだけを一括削除するoperationです。

- Service Workerがoperation実行時にStorageを再readする。
- Optionsから送られたindexや古いinvalid件数を信用しない。
- 現在invalidと判定されたitemだけを削除する。
- valid itemは保持する。

confirm dialogの確定文言:

```text
問題のある登録を削除しますか？

正常に読み込めなかった登録を削除します。

削除した登録は元に戻せません。

正常に読み込めている登録は削除されません。

[キャンセル] [問題のある登録を削除する]
```

#### `whole_invalid`

normal editing UIを表示せず、解釈可能なitemを推測しません。

```text
┌──────────────────────────────────────────────────────────┐
│ 「距離を置きたい言葉」の設定を読み込めませんでした       │
│                                                          │
│ 保存されている設定を安全に読み取れないため、             │
│ 登録した言葉によるワンクッションを一時停止しています。   │
│                                                          │
│ 既存の固定ルールによるワンクッションは                   │
│ 引き続き動作します。                                     │
│                                                          │
│ [ 「距離を置きたい言葉」の設定を初期化する ]             │
└──────────────────────────────────────────────────────────┘

Implementation-ready whole_invalid Recovery UI / 2026-09-08
```

strong confirmation dialogの確定文言:

```text
「距離を置きたい言葉」の設定を初期化しますか？

登録した言葉と、その個別ON/OFF設定をすべて削除し、初期状態に戻します。

この操作は元に戻せません。

「ことばうけみまもり」のその他の設定は変更されません。

[キャンセル] [設定を初期化する]
```

reset成功後は次のvalid stateとします。

```text
schemaVersion: 1
masterEnabled: true
items: []
```

既存の `enabled`、`cushionSensitivity`、`uiLanguage` には触れません。

#### `unsupported_schema`

resetを提供しません。

```text
この設定形式は現在のバージョンでは読み込めません

「距離を置きたい言葉」の設定は変更せず、そのまま保持しています。

登録した言葉によるワンクッションは一時停止しています。
```

#### `read_error`

resetを提供しません。

```text
設定を読み込めませんでした

一時的に設定を読み込めない可能性があります。保存されている設定は変更していません。

[もう一度読み込む]
```

`read_error` が繰り返されても、自動的に `whole_invalid` へ格上げしません。

### 8. Service Worker mutation protocol

message envelopeは次の概念構造とします。

```text
type: distanceTermsMutation
protocolVersion: 1
operation: ...
payload: ...
```

`protocolVersion` とStorageの `schemaVersion` は別物です。top-levelと `payload` の双方でstrict allowlistを使用し、unknown fieldをrejectします。

第一版のoperationは次の6つです。

| operation | payload |
| --- | --- |
| `addTerm` | `term` |
| `setItemEnabled` | `id`、`enabled` |
| `setMasterEnabled` | `enabled` |
| `deleteItem` | `id` |
| `deleteInvalidItems` | payloadなし |
| `resetInvalidSettings` | explicit confirmation marker/valueを含むstrictなpayload |

toggle operationは作らず、desired state operationだけを使用します。`resetInvalidSettings` の具体的marker名は実装レビューで決めてよいものの、曖昧なreset requestを許可しません。

### 9. sender validation

`distanceTermsSettings` mutationはOptionsページだけから許可します。少なくとも次を検証します。

- `sender.id === chrome.runtime.id`
- `sender.url` が当該extensionの `options.html` である
- `sender.origin` が利用可能なら当該extension originである

message payload内のsender申告値を信用せず、`sender.tab` の有無だけを判定根拠にしません。Content Script、Popup、別extension、external messageからのmutationを許可しません。`onMessageExternal`、`externally_connectable`、新規permissionを追加しません。

### 10. UUID

- IDはService Workerが `crypto.randomUUID()` でUUID v4として生成する。
- OptionsはIDを生成せず、Optionsが提供する新規IDを信用しない。
- 生成したUUIDが既存の全item IDと衝突した場合は再生成する。

### 11. FIFO mutation queue

Service Worker memory内でFIFO Promise queue相当を利用し、mutationを直列化します。ただし、queueやglobal stateをSource of Truthにしません。各mutationはqueue開始後に必ず最新の `chrome.storage.local` をreadします。Service Workerが停止・再起動しても、Storageの最新状態から継続できる設計とします。

### 12. mutation integrity flow

正式な概念flowは次のとおりです。

```text
Options mutation intent
↓
strict request validation
↓
sender validation
↓
FIFO mutation queue
↓
latest chrome.storage.local read
↓
state classification
↓
operation validation
↓
raw-preserving targeted mutation
↓
integrity / post-condition validation
↓
exactly one whole-object storage.set
↓
await write completion
↓
fixed-code response

Implementation-ready Storage mutation flow / 2026-09-08
```

`partially_invalid` で通常mutationを行った後にStorage全体が `valid` であることまでは要求しません。代わりに次を確認します。

- mutationが新しいinvalidityを導入していない。
- 既存invalid raw dataを意図せず変更していない。
- 対象operationのpost-conditionが成立している。

Recovery operation成功後は `valid` 状態を要求します。

### 13. response contract

成功response:

```text
{ ok: true, code: "OK" }
{ ok: true, code: "NO_CHANGE" }
```

失敗response:

```text
{ ok: false, code: "FIXED_CODE" }
```

固定codeは次を第一版のallowlistとします。

- `OK`
- `NO_CHANGE`
- `INVALID_REQUEST`
- `INVALID_TERM_LENGTH`
- `FORBIDDEN_CHARACTER`
- `DUPLICATE_TERM`
- `LIMIT_REACHED`
- `ITEM_NOT_FOUND`
- `ITEM_NOT_EDITABLE`
- `RECOVERY_NOT_ALLOWED`
- `SETTINGS_INVALID`
- `UNSUPPORTED_SCHEMA`
- `STORAGE_READ_FAILED`
- `STORAGE_WRITE_FAILED`
- `INTEGRITY_CHECK_FAILED`
- `UNAUTHORIZED_SENDER`
- `INTERNAL_ERROR`

`sendMessage` 自体の失敗、またはresponseを得られない場合は、Options側で `COMMUNICATION_FAILED` 相当として扱います。

responseには、term、normalized term、item、Storage全体、投稿本文、exception全文、stack、filename、schema内部詳細を含めません。

### 14. response消失とretry

write成功後にresponseだけが失われる場合を考慮します。Optionsはblind retryを行わず、Storageを再readしてdesired stateを確認します。

| operation | 収束済みと扱うdesired state |
| --- | --- |
| `addTerm` | 同じcanonical termが存在する |
| `setItemEnabled` | 対象itemがdesired `enabled` 値である |
| `setMasterEnabled` | `masterEnabled` がdesired値である |
| `deleteItem` | 対象itemが存在しない |
| `deleteInvalidItems` | invalid itemが残っていない |

desired stateが成立していなければ、自動再送せず利用者様へ再操作を案内します。

`resetInvalidSettings` は破壊的操作のため、通信結果不明時のblind auto retryを絶対に行いません。Storage再read後の最新状態を表示し、必要なら改めてstrong confirmationを求めます。第一版ではpersistent request ID ledgerを導入しません。

### 15. Options UI

Options内に独立した「距離を置きたい言葉」セクションを追加します。

```text
┌──────────────────────────────────────────────────────────┐
│ 距離を置きたい言葉                                       │
│                                                          │
│ 今は距離を置きたい言葉や短いフレーズ、ハッシュタグを     │
│ 登録できます。登録した言葉を含む投稿には、読む前に       │
│ ワンクッションを表示します。                             │
│                                                          │
│ 登録した言葉はこのブラウザ内に保存され、外部送信され     │
│ ません。                                                 │
│                                                          │
│ 操作方法を見る ↗                                         │
│                                                          │
│ ──────────────────────────────────────────────────────── │
│                                                          │
│ 登録した言葉によるワンクッション                 [ ON ]   │
│ この機能をOFFにしても、登録した言葉と個別の              │
│ ON/OFF設定は保持されます。                               │
│                                                          │
│ 距離を置きたい言葉を追加                                 │
│ ┌────────────────────────────────────┐                   │
│ │ 言葉・短いフレーズ・ハッシュタグ   │ [追加する]        │
│ └────────────────────────────────────┘                   │
│                                                          │
│ 登録数：3 / 30                                           │
│                                                          │
│ 登録した言葉                                             │
│                                                          │
│ [ ON ]  仕事                               [削除]         │
│ [OFF ]  #話題                              [削除]         │
│ [ ON ]  English phrase                     [削除]         │
└──────────────────────────────────────────────────────────┘

Implementation-ready Options UI design / 2026-09-08
```

最大30件でも折りたたまず、配列順を登録順として全件を通常一覧に表示します。第一版ではpagination、list検索、list filter、折りたたみ、sort UI、drag reorderを導入しません。

### 16. MasterとitemのON/OFF

Masterはdistance protection全体のeffective conditionであり、設定UI全体をlockするものではありません。Master OFF中もadd、delete、individual ON/OFFを操作できます。

有効条件は次のとおりです。

```text
masterEnabled === true
AND
item.enabled === true
```

Master OFF時に `item.enabled` を書き換えず、Masterを再度ONにしたとき以前の個別状態を復元します。

### 17. 登録済みtermの変更

第一版では登録済みtermを直接編集しません。変更する場合は `delete → new add` とします。新しく追加したtermは別登録となり、Service Workerが新しいUUIDを生成します。

### 18. Add UX

add自体にconfirm dialogは設けません。

validation failure時:

- input値を保持する。
- inputへfocusする。
- errorをinputと関連付ける。
- Storageを変更しない。

success時:

- Storageを再readする。
- inputをclearする。
- inputへfocusする。
- polite statusで成功を通知する。

主な日本語validation文言:

- `2〜50文字で入力してください。`
- `入力内容が長すぎます。より短い文字列で入力してください。`
- `改行やタブを含めず、1行で入力してください。`
- `登録できない文字が含まれています。画面上に表示されない一部の文字は登録できません。入力内容を確認してください。`
- `この言葉はすでに登録されています。`
- `登録できるのは最大30件です。新しく追加する場合は、不要になった登録を削除してください。`

### 19. Delete UX

通常削除にはconfirmation dialogを必須とし、対象termは安全なtextとして表示します。

```text
登録した言葉を削除しますか？

「仕事」を削除します。

登録から削除した言葉は元に戻せません。

必要に応じて、再登録していただく必要があります。

[キャンセル] [削除する]
```

- native `<dialog>` を第一候補とし、実装時に既存構成と整合させる。
- 初期focusは「キャンセル」とする。
- Tab順は「キャンセル」→「削除」とする。
- Escapeはキャンセルとして扱う。
- キャンセル後は操作元の削除buttonへfocusを戻す。
- 削除成功後は新規登録inputへfocusする。
- 削除失敗時はdialogを閉じず、optimistic deleteを行わず、action button付近にfocusを残す。

### 20. KeyboardとAccessibility

focus移動の原則は次のとおりです。

| 結果 | focus先 |
| --- | --- |
| 成功 | 次の自然な操作場所 |
| 入力エラー | 修正するcontrol |
| 保存エラー | 操作したcontrol |
| dialog内エラー | dialog内 |

実装では次を満たします。

- native input、native button、native checkboxベースswitchを優先する。
- natural DOM Tab orderを使用する。
- `tabindex > 0` を使用しない。
- `tabindex="-1"` はprogrammatic focus用途に限定する。
- `:focus-visible` をlight / dark双方で明確にする。
- statusは `aria-live="polite"`、`role="status"` 等を適切に使用する。
- persistent warningを無闇に `role="alert"` にしない。
- dialogはmodal focusを維持する。
- mutation実行中はduplicate actionを防止する。
- mutation中にdialogを勝手に閉じて結果を失わない。
- IME composition中のEnterではaddしない。
- composition終了後のEnterでは通常addを可能にする。

### 21. 操作マニュアルへのリンク

マニュアルリンクは、セクションの機能説明・privacy案内の直後、Master ON/OFFより前に配置します。リンク先は現在のresolved Options UI languageで決め、投稿言語やX言語では決めません。

| Options UI language | 表示 | URL |
| --- | --- | --- |
| 日本語 | `操作方法を見る` | `https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/manual.html` |
| English | `View the user manual` | `https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/en/manual.html` |

リンク仕様:

- native `<a>`
- `target="_blank"`
- `rel="noopener noreferrer"`
- 視覚的な `↗`
- screen reader向けの新規タブ説明
  - 日本語: `新しいタブで開きます`
  - 英語: `Opens in a new tab`
- keyboard focus可能
- light / dark双方で明確な `:focus-visible`

v2.0.0機能実装時には日英manual本文も新機能の操作内容へ更新しますが、今回のADR-only PRではmanualを変更しません。

### 22. light / dark

- Optionsは現行の `prefers-color-scheme` を利用する方式を維持する。
- XのthemeをOptionsへ持ち込まない。
- 新しいtheme settingを追加しない。
- OptionsとManualのlight / dark状態を連携しない。
- theme query parameterやStorage共有を追加しない。
- OptionsはOptions自身のtheme処理、ManualはManual自身の既存theme処理を使用する。
- distance-only cushionは既存overlayのtheme機構を共有し、distance専用themeを作らない。

実装時のブラウザ確認対象:

- OS light + X light
- OS light + X dark
- OS dark + X dark
- OS dark + X light

OS dark + X lightで既存overlayのtheme不整合が確認されても、ADR-0001実装へscopeを広げず別課題として扱います。

### 23. distance-term-only State 1

fixed-rule State 1と共通タイトル、共通buttonsを利用し、本文だけをdistance-only用の中立的な理由説明とします。

日本語の確定文言:

```text
読む前に、少しだけワンクッションを置きました

この投稿には、あなたが登録した「距離を置きたい言葉」に一致する文字列が含まれているため、ワンクッションを表示しています。

[内容を表示する] [今は見ない]
```

英語の確定文言:

```text
A gentle cushion before reading

This cushion is shown because this post contains text matching something you registered under “Words you'd like some distance from.”

[Show content] [Not now]
```

UIの情報階層は次のとおりです。

```text
┌──────────────────────────────────────────────────────────┐
│ 読む前に、少しだけワンクッションを置きました             │
│                                                          │
│ この投稿には、あなたが登録した「距離を置きたい言葉」に   │
│ 一致する文字列が含まれているため、ワンクッションを       │
│ 表示しています。                                         │
│                                                          │
│ [ 内容を表示する ]                    [ 今は見ない ]      │
└──────────────────────────────────────────────────────────┘

投稿本文はblur維持。

表示しない:
・matched term
・matched count
・ID
・score
・reason
・category
・guidance
・expression strength
・tendency
・fixed / distance内部種別

Not now
→ ADR-0002 shared State 2

Implementation-ready distance-term-only State 1 / 2026-09-08
```

distance-only理由説明では、登録term自体を評価しないため、「危険」「強い」「不適切」「心に負荷がかかる可能性」「リスク」という評価語を使用しません。

### 24. ADR-0002 State 2との接続

distance-only State 1で「今は見ない」または `Not now` を選択した場合、既存ADR-0002のState 2をそのまま共通利用します。ADR-0002 State 2は今回再設計しません。State 2へmatched term、matched ID、matched count、fixed / distance由来、score、reasonを追加しません。

### 25. migration

v2.0.0は `distanceTermsSettings` の `schemaVersion: 1` 初回導入です。そのため、v2.0.0では `distanceTermsSettings` のmigration処理を実装しません。`missing` を正常な初期状態として扱います。

将来 `distanceTermsSettings.schemaVersion` の変更が必要になった時点で、migrationを別途設計・実装します。Accepted時点に記録したmigration failureは将来のschema変更を想定した検討履歴であり、v2.0.0初回実装時のruntime stateではありません。

### 26. versionとrelease境界

- ADR-0001実装時の次期Chrome extension versionは `2.0.0` とする。
- 現在mainの `1.1.0` は今回のADR-only PRでは変更しない。
- `manifest.json`、`package.json` 等のversionは、将来のADR-0001実装PRで `2.0.0` に揃える。
- Chrome Web Store releaseは、機能実装およびversion更新とは別工程とする。

### 27. 実装時の最新版アーキテクチャ

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Chrome Extension                                                           │
│                                                                            │
│ [Options UI]                                                               │
│   existing settings UI                                                     │
│     └─ existing direct write ───────────────▶ [Storage: existing 3 keys]   │
│   distance terms UI                                                        │
│     ├─ direct read ─────────────────────────▶ [Storage: distance settings] │
│     └─ mutation intent ─▶ [Service Worker]                                 │
│                            ├─ strict request validation                     │
│                            ├─ sender validation                             │
│                            ├─ FIFO mutation queue                           │
│                            ├─ latest Storage read                           │
│                            ├─ state classification                          │
│                            ├─ operation validation                          │
│                            ├─ raw-preserving targeted mutation              │
│                            ├─ integrity / post-condition check              │
│                            └─ exactly one whole-object write               │
│                                 └──────────▶ [Storage: distance settings]   │
│                                  distanceTermsSettings sole writer          │
│                                                                            │
│ [chrome.storage.local]                                                     │
│   existing 3 keys                         distanceTermsSettings             │
│   ├─ enabled                              ├─ schemaVersion: 1              │
│   ├─ cushionSensitivity                   ├─ masterEnabled                 │
│   └─ uiLanguage                           └─ items                         │
│                                               └─ { id, term, enabled }     │
│                                                                            │
│   existing 3 keys: existing write pathを維持                               │
│   distanceTermsSettings read: Options / Content Script / Service Worker    │
│   distanceTermsSettings write: Service Workerだけ                          │
│                                                                            │
│ [X Content Script] ── page-load direct read ─▶ distanceTermsSettings       │
│   ├─ fixed-rule path                                                       │
│   │    ├─ existing normalizeExtractedText()                                │
│   │    └─ fixed rule成立 ──▶ existing State 1 ──▶ stop                     │
│   └─ fixed cushion未確定の場合だけdistance matcher                        │
│        ├─ raw textContent専用経路                                          │
│        ├─ NFKC + ASCII case-fold                                           │
│        ├─ literal substring matcher → boolean only                         │
│        └─ match                                                            │
│             └─ distance-only State 1                                       │
│                  ├─ Show content / 内容を表示する                          │
│                  └─ Not now / 今は見ない ──▶ ADR-0002 shared State 2       │
│                                                                            │
│ 外部server / API / analytics / telemetry: なし                             │
└────────────────────────────────────────────────────────────────────────────┘

Implementation-ready architecture / 2026-09-08
Not implemented
```

既存3設定のwrite pathは変更しません。`distanceTermsSettings` だけをService Worker Single Writerの対象とします。OptionsとContent Scriptは `distanceTermsSettings` を直接readできますが、直接writeしません。Content Scriptはページ初期化時のsnapshotを利用し、第一版では `chrome.storage.onChanged` によるreal-time反映を行いません。

fixed ruleでcushion表示が確定した場合はdistance matcherを実行しません。distance termをfixed scoreへ加算せず、matcherの結果はbooleanだけとします。distance featureのread、validation、matching、UI等に障害が起きても、既存fixed ruleを停止させません。

### 28. テスト設計

実装時の基本順序は次のとおりです。

```text
pure domain
→ Storage
→ Service Worker
→ Options
→ Content / Overlay
→ real browser
```

必須テスト対象を次のとおり定めます。

#### 文字列

- NFKC
- ASCII case-fold
- 1 grapheme reject
- 2 grapheme accept
- 50 grapheme accept
- 51 grapheme reject
- emoji
- combining sequence
- ZWJ emoji
- 512 code points
- 513 code points
- forbidden characters
- allowed ZWJ / ZWNJ
- Arabic / Hebrew
- 禁止文字を自動削除しない

#### duplicate

- exact
- NFKC equivalent
- ASCII case difference
- enabled / disabled
- `partially_invalid` 内の安全に読めるterm
- containment allowed

#### Storage

- `missing`
- `valid`
- `partially_invalid`
- `whole_invalid`
- `unsupported_schema`
- `read_error`
- auto-repairなし
- auto-writebackなし
- raw `items.length >= 31` は `whole_invalid`

#### Recovery

- `deleteInvalidItems`
- valid items保持
- latest read
- `whole_invalid` で `deleteInvalidItems` 拒否
- `unsupported_schema` でRecovery拒否
- `resetInvalidSettings`
- 既存3設定非変更
- read errorではretry only

#### Service Worker

- strict request validation
- unknown field rejection
- sender validation
- 6 operationsすべて
- `NO_CHANGE`
- UUID generation
- UUID collision regeneration
- FIFO queue
- latest Storage read
- Lost Update防止
- integrity failure
- storage read / write failure
- response data minimization

#### communication

- response loss
- Storage re-read
- blind retryなし
- destructive resetのblind retryなし

#### Options

- 0 items
- 1 item
- multiple items
- 30 items
- 30件でも折りたたみなし
- Master ON / OFF
- Master OFF中のadd / delete / item toggle
- item ON / OFF
- validation
- status
- focus
- dialog
- Escape
- keyboard
- focus-visible
- IME composition

#### Content

- page-load snapshot
- reload後に設定反映
- fixed rule priority
- fixed rule成立時のdistance matcher skip
- distance-only match
- no match
- distance feature failure時のfixed rule継続
- raw `textContent` route
- fixed-rule whitespace collapse済み本文をdistance matcherへ流用しない

#### Overlay

- distance-only State 1
- matched term等を表示しない
- Show content
- Not now
- ADR-0002 State 2回帰

#### i18n

- Japanese
- English
- internal response codeをそのままUI表示しない

#### manual link

- Japanese UI → Japanese manual
- English UI → English manual
- `target="_blank"`
- `rel="noopener noreferrer"`
- `↗`
- screen reader向け新規タブ説明
- keyboard
- focus-visible
- Manual本文がv2.0.0仕様と整合

#### theme

- Options light / dark
- X light / dark
- OS light + X light
- OS light + X dark
- OS dark + X dark
- OS dark + X light

#### privacy / security

- termの外部送信なし
- post bodyの外部送信なし
- match resultの外部送信なし
- analyticsなし
- telemetryなし
- consoleへtermを不用意に出さない
- responseへtermを返さない
- 新規不要permissionなし
- `host_permissions` 追加なし

#### package / distribution

- Manifest V3維持
- Service Workerが将来のmanifestへ正しく追加される
- 配布ZIPへ必要ファイルが入る
- syntax check対象
- test runner対象
- version `2.0.0` の整合

### 29. 将来の実装完了条件

ADR-0001の実装完了には、少なくとも次をすべて満たす必要があります。

- 既存自動テストがすべて成功する。
- ADR-0001の新規自動テストがすべて成功する。
- `npm run check` が成功する。
- `git diff --check` が成功する。
- fixed ruleに回帰がない。
- ADR-0002 State 1 / State 2に回帰がない。
- distance feature障害時もfixed ruleが継続する。
- Storage / Recovery / Single Writerの重要境界テストが成功する。
- UUID collision testが成功する。
- Lost Update防止を確認する。
- response loss時にblind retryしないことを確認する。
- 日本語Optionsを実ブラウザで確認する。
- 英語Optionsを実ブラウザで確認する。
- X上のdistance-only UIを実ブラウザで確認する。
- light / darkを確認する。
- keyboard-only操作を確認する。
- focusを確認する。
- browser zoom / 文字拡大を確認する。
- IMEを確認する。
- 日本語manualリンクを確認する。
- 英語manualリンクを確認する。
- manual本文をv2.0.0仕様へ更新する。
- 新規外部通信がない。
- analytics / telemetryがない。
- 不要permissionの追加がない。
- README / AGENTS.md / privacy / manual等を実装内容へ整合させる。
- `manifest.json`、`package.json` 等の次期release versionを `2.0.0` へ統一する。
- mainマージ後にADR-0001のImplementation statusを更新する。
- Chrome Web Store releaseは別工程として実施する。

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
| `valid` | 有効 | 継続 | 通常利用 |
| `partially_invalid` | safely validなitemだけ利用 | 継続 | raw dataを変更せず、invalid itemを自動削除しない |
| `whole_invalid` | 停止 | 継続 | normal editingを停止し、明示的resetだけを許可 |
| `unsupported_schema` | 停止 | 継続 | corruption扱いせず、downgrade/resetしない |
| `read_error` | 一時利用不可 | 継続 | corruptionと断定せず、retry/read againを優先 |

Accepted時点に検討した `migration failure` は将来のschema変更時のfailure modeとして履歴に残します。ただし、schemaVersion 1を初回導入するv2.0.0ではmigrationを実装しないため、v2.0.0初回実装時のruntime stateではありません。

### Recovery

自動修復・自動削除は行いません。詳細な表示、confirm dialog、operation境界は、2026-09-08の実装前詳細設計で確定しています。

- `partially_invalid` ではvalid itemsを継続利用し、明示的な `deleteInvalidItems` だけで現在invalidと判定したitemを一括削除する。invalid term自体は表示しない。
- `whole_invalid` ではnormal editingを停止し、strong confirmationを伴う `resetInvalidSettings` だけを提供する。既存の `enabled`、`cushionSensitivity`、`uiLanguage` には触れない。
- `unsupported_schema` はreset対象にしない。
- `read_error` ではresetを案内せず、retryを優先する。
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

## Open Questions at Accepted time (2026-09-04)

以下は、2026-09-04のAccepted時点で実装時の検討・レビュー事項として残していた記録です。

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

## Resolution status as of 2026-09-08

| Accepted時点のOpen Question | 2026-09-08時点の解決状況 |
| --- | --- |
| grapheme clusterの具体的な計数方法 | Resolved。`Intl.Segmenter`、`granularity: "grapheme"` を使用し、2〜50 extended grapheme clustersとする。 |
| ZWJ emojiを壊さず、不要な不可視文字のみを拒否する具体方式 | Resolved。禁止文字と許可文字の境界を確定し、ZWJ / ZWNJ、combining marks、variation selectors、通常のRTL文字を許可する。 |
| stable unique IDの具体形式と生成API | Resolved。Service Workerが `crypto.randomUUID()` でUUID v4を生成し、全itemとの衝突時は再生成する。 |
| Service Worker sender validationの具体実装 | Resolved。`sender.id`、`sender.url`、利用可能な場合の`sender.origin`を検証し、Optionsページだけを許可する。 |
| mutation queueの具体的なJavaScript実装 | 方針Resolved。Service Worker memory内のFIFO Promise queue相当とし、各mutationはqueue開始後にlatest Storageをreadする。具体的な関数名等は実装レビューで決める。 |
| migration関数/APIの具体構成 | v2.0.0についてResolved。schemaVersion 1の初回導入でmigrationは実装しない。将来schema変更時に別設計とする。 |
| error codeの最終一覧 | Resolved。response contract節の固定code allowlistを使用する。 |
| 30件表示時の具体的な折りたたみUI | Resolved。折りたたみなしで最大30件を登録順にすべて通常表示する。 |
| 実装ファイル名とmodule名 | Open。責務境界は確定したが、具体的なファイル名とmodule分割は実装レビューで決める。 |
| 詳細なテストケース | Resolved。テスト設計節にカテゴリと重要境界値を確定した。 |

`resetInvalidSettings` のexplicit confirmation markerの具体的なfield名も、strict payloadと曖昧なreset拒否という不変条件を守る範囲で実装レビュー時に決めます。
