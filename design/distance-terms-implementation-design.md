# 「距離を置きたい言葉」実装設計

- Initial implementation target: v2.0.0
- Design finalized: 2026-09-08
- Implementation status: Not implemented
- 実装状況: 未実装
- Related ADR: [ADR-0001 「距離を置きたい言葉」機能のアーキテクチャ](adr/0001-distance-terms-architecture.md)
- Related state design: [ADR-0002 「今は見ない」後のセルフケア・距離の取り方支援](adr/0002-after-not-now-support.md)

## 1. 文書の目的と正本関係

この文書は、ADR-0001で確定した設計判断をv2.0.0へ実装するための、具体的なmodule、API、UI、Storage、message、test、file scopeの契約を記録します。この文書が存在することは、機能が実装済みであることを意味しません。

正本の優先関係は次のとおりです。

```text
ADR-0001の安全上・意味上の不変条件
                    ↓
本Implementation Designの具体的実装契約
                    ↓
実装上の都合
```

- 実装はADR-0001の安全上・意味上の不変条件に **MUST** で従います。
- 実装都合でADR-0001の原則を変更してはなりません。
- ADR-0001の原則変更が必要になった場合は、コードだけを変更せずADRレビューへ戻ります。
- module名、公開API、return schema、file scope、test responsibility等の具体事項は本書を正本とします。
- 本書とADR-0001が矛盾する場合はADR-0001を優先し、本書または実装を修正します。
- ADR-0002 State 2の意味・文言・focus・支援導線はADR-0002と既存実装を正本とし、本機能用の第二実装を作りません。

本書の `MUST`、`MUST NOT`、`SHOULD`、`MAY` は、それぞれ必須、禁止、強い推奨、許容を表します。

## 2. 実装原則と非対象

### 2.1 機能の意味

この機能は、ユーザー様ご自身が登録した「今は距離を置きたい言葉」と投稿本文が一致したとき、読む前のワンクッションを表示するセルフケア機能です。

次を **MUST NOT** とします。

- 登録語の善悪を判定する。
- 登録語を危険語として認定する。
- 投稿者やアカウントを評価する。
- 投稿内容の真偽を判定する。
- ユーザー様の精神状態を推定する。
- 自動block、mute、reportを行う。
- X公式機能を置き換える。
- distance termをfixed ruleのscore、reason、category、guidanceへ統合する。

### 2.2 privacy / security

- 投稿本文、登録語、match結果、matched term、ID、位置、件数、score等を外部送信してはなりません。
- analytics、telemetry、外部API、外部serverを追加してはなりません。
- 不要なpermission、`host_permissions`、`externally_connectable`、`onMessageExternal`を追加してはなりません。
- `distanceTermsSettings` は独立したtop-level keyとして `chrome.storage.local` に保存します。
- `distanceTermsSettings` のwriteはService Workerだけが行います。

### 2.3 既存機能との境界

- 既存の `enabled`、`cushionSensitivity`、`uiLanguage` のread / write pathを変更しません。
- `settings.js` へ `distanceTermsSettings` を統合しません。
- Popupへdistance terms管理UIを追加しません。
- `enabled === false` はfixed / distance共通の最上位gateです。
- `risk-detector.js` のfixed detection rule、score、thresholdを変更しません。
- fixed ruleをdistance matchingより先に実行します。
- distance機能の障害によってfixed ruleを停止させません。

### 2.4 第一版の非対象

regex、wildcard、AND / OR、除外条件、synonym expansion、意味検索、AI、言語別意味解析、import / export、backup / restore、expiry、並べ替え、list検索、pagination、real-time settings reflection、automatic X action、IndexedDB、SQLiteは対象外です。

## 3. module方式と新規6 module

v2.0.0では現行の `globalThis` + CommonJS互換方式を維持します。

- browserでは既存moduleと同様に `globalThis` へ必要なAPIを公開します。
- Node testsでは同じtestable APIを `module.exports` します。
- v2.0.0ではclassic Manifest V3 Service Workerを使用し、`importScripts()` で `distance-terms-core.js`、`distance-terms-reader.js`、`distance-terms-mutations.js` をこの順に読み込みます。
- v2.0.0ではESM migration、bundler導入、TypeScript化、`src/` 等への大規模restructureを行いません。
- module systemの刷新は、本機能実装とは別工程です。

正式な新規moduleは次の6つです。

| file | 責務 |
| --- | --- |
| `distance-terms-core.js` | canonicalization、validation、classification、domain constantsの正本 |
| `distance-terms-mutations.js` | 6×6 operation matrixと安全な状態変更をpureに計画 |
| `distance-terms-reader.js` | `chrome.storage.local` のread adapterとconsumer別projection。write APIなし |
| `distance-matcher.js` | raw post textとのboolean literal substring matching |
| `distance-terms-options.js` | Options distance sectionのcontroller |
| `distance-terms-service-worker.js` | Single Writer、strict request / sender validation、FIFO、UUID、write orchestration |

大原則は次のとおりです。

> readerは読むだけ。判断の正本はcore。書くのはService Workerだけ。

### 3.1 最終実装依存図

```text
                             OPTIONS PAGE
                                  │
                                  ▼
                         existing options.js
                                  │
                                  ▼
                    distance-terms-options.js
                    /          |            \
                   /           |             \
                  ▼            ▼              ▼
      distance-terms-core   reader      distance-terms-mutations
                               │
                               ▼
                      distance-terms-core
                                  │
                     mutation intent only
                                  ▼
                         runtime.sendMessage
                                  │
                                  ▼
                  distance-terms-service-worker
                       │          │          │
                       │          │          └─ FIFO queue
                       │          └─ crypto.randomUUID()
                       ▼
               distance-terms-reader
                       │
                       ▼
               distance-terms-core
                       │
                       ▼
             distance-terms-mutations
                       │
                 mutation plan
                       │
                       ▼
              chrome.storage.local.set
                  exactly once


                               X PAGE
                                  │
                                  ▼
                              content.js
                                  │
                       raw textContent snapshot
                         /                \
                        /                  \
                       ▼                    ▼
              existing fixed path       distance path
                       │                    │
            normalizeExtractedText          │
                       │                    ├─ reader
                       ▼                    │    └─ core
                risk-detector               │
                       │                    └─ distance-matcher
                       │                           │
              cushion=true?                       ▼
                 │      │                       boolean
                yes     no                         │
                 │       └────────────────────────►│
                 │                                 │
                 ▼                                 ▼
        fixed cushion candidate          distance WeakSet
                 │                                 │
                 ▼                                 ▼
     overlay.createCushionElement   overlay.createDistanceCushionElement
                 │                                 │
                 └───────────────┬─────────────────┘
                                 ▼
                         shared State 1 actions
                           /             \
                          ▼               ▼
                    Show content        Not now
                          │               │
                          ▼               ▼
                    same reveal     ONE ADR-0002
                                        State 2
```

## 4. 文字列・Storage domain contract

### 4.1 Storage schema

```text
distanceTermsSettings
├─ schemaVersion: 1
├─ masterEnabled: boolean
└─ items: array（0〜30件、登録順）
   └─ {
        id: UUID v4,
        term: NFKC + trim後のcanonical term,
        enabled: boolean
      }
```

rootの許可fieldは `schemaVersion`、`masterEnabled`、`items` だけ、itemの許可fieldは `id`、`term`、`enabled` だけです。unknown fieldは対応schema内ではinvalidです。`normalizedTerm`、`type`、`category`、`score`、`reason`、`matchedCount`、`lastMatchedAt`、`createdAt` は保存しません。

初期状態は次のとおりです。

```text
{
  schemaVersion: 1,
  masterEnabled: true,
  items: []
}
```

keyが存在しない `missing` は、この初期状態と同じ意味を持つ正常な0件状態ですが、readだけで自動writeしません。

### 4.2 登録pipeline

登録入力はOptionsとService Workerで次の順序を維持します。duplicateの最終判断はlatest Storageを持つService Worker側です。

```text
raw input
→ NFKC
→ trim
→ forbidden-character validation
→ extended grapheme cluster count
→ Unicode code-point safety limit
→ duplicate check
```

- 2〜50 extended grapheme clusters。`Intl.Segmenter` の `granularity: "grapheme"` を使用します。
- NFKC + trim後で最大512 Unicode code points。513以上はrejectします。
- 保存するtermはNFKC + trim後のcanonical termです。
- ASCII caseは保存・表示時に保持します。例: `ＡＢＣ` は `ABC`、`Hello` は `Hello` として保存します。
- outer whitespaceはtrimし、internal whitespaceと連続spaceは保持します。
- trim後に禁止文字が残る場合はrejectし、削除・置換によるsanitizeで別termとして受理しません。
- outer LF / CR / TAB / U+FEFF等がJavaScript `trim()` で除かれ、残ったcandidateがvalidなら登録可能です。
- internal LF / CR / TAB等が残る場合はrejectします。

### 4.3 禁止・許可文字

少なくとも次をrejectします。

- C0 controls（U+0000〜U+001FおよびU+007F）
- C1 controls（U+0080〜U+009F）
- U+2028、U+2029
- U+061C ALM
- U+200E LRM、U+200F RLM
- U+202A LRE、U+202B RLE、U+202C PDF、U+202D LRO、U+202E RLO
- U+2066 LRI、U+2067 RLI、U+2068 FSI、U+2069 PDI
- U+200B ZERO WIDTH SPACE
- U+2060 WORD JOINER
- U+FEFF BOM / ZWNBSP
- U+00AD SOFT HYPHEN
- U+034F COMBINING GRAPHEME JOINER

次は許可します。

- U+200C ZWNJ
- U+200D ZWJ
- combining marks
- variation selectors
- 通常のArabic / Hebrew等のRTL文字
- その他の通常のUnicode文字、記号、emoji

### 4.4 duplicate namespace

duplicate keyは `canonical NFKC term + ASCII case-fold` です。case-fold対象はASCII `A-Z` だけで、非ASCIIへglobal `toLowerCase()` を適用しません。

- enabled / disabledを問わず全itemが同一namespaceを占有します。
- safe-readable invalid termもnamespaceを占有します。
- `Hello`、`hello`、`Ｈｅｌｌｏ` はduplicateです。
- `テスト` と `Xワンクッションテスト文字列`、`#topic` と `topic` は別termとして共存できます。
- `normalizedTerm` はStorageへ保存しません。

### 4.5 UUID

IDはcanonical hyphenated UUID v4で、version nibble `4`、RFC 4122 variant `8` / `9` / `a` / `b` を必須とします。hex caseは比較時に同一視しますが、readだけで保存表記を書き換えません。

### 4.6 Storage 6状態

classification順は、Storage read成否 → key存在 → root object → `schemaVersion` → future schema → version 1 root → item → cross-item conflictです。先に確定したtop-level stateより後を推測しません。

| state | 正式条件 | 基本扱い |
| --- | --- | --- |
| `missing` | read成功、keyなし | 正常な0件。read-time writeなし |
| `valid` | version 1 rootがvalid、raw件数0〜30、全item valid、conflictなし | 通常利用 |
| `partially_invalid` | version 1 rootがvalid、raw件数0〜30、1件以上がitem validationまたはconflictで利用不能 | usable itemだけ利用、invalid raw data保持 |
| `whole_invalid` | root不正、schemaVersion不正、version 1 unknown root field、master型不正、items非Array、31件以上等 | distance protectionとnormal editing停止。明示的reset以外を拒否 |
| `unsupported_schema` | rootが安全なobject、schemaVersionがintegerかつ1より大きい | version 1として深掘りせず保持。distance protectionとmutation停止 |
| `read_error` | Storage readがreject / throw、または正常result objectと確認不能 | corruption扱いせず保持。Retry以外を行わない |

rootがvalidなら全itemがinvalidでも `partially_invalid` です。item conflictではwinnerを選ばず、同一valid UUIDまたは同一safe-readable duplicate keyのconflict参加itemをすべて利用不能とします。

### 4.7 Never repair on read

read時にinvalid item削除、型coercion、missing field補完、ID補完、term補正、default write、writebackを行ってはなりません。

`partially_invalid` の通常mutationでは、latest raw objectから対象の安全で一意なitemだけを変更し、既存invalid raw entryと対象外valid entryのraw内容・相対順序を意味的に保持します。最大30件判定はusable件数ではなくraw `items.length` を使用します。

## 5. `distance-terms-core.js`

coreはControllerではなくpure domain coreです。Chrome API、DOM、Storage I/O、UI、network、UUID generationを持ちません。

### 5.1 公開API

```text
globalThis.kotobaUkeMimamoriDistanceTermsCore = {
  CONSTANTS,
  validateDistanceTermInput,
  createDistanceTermDuplicateKey,
  isValidDistanceTermId,
  createInitialDistanceTermsSettings,
  classifyDistanceTermsSnapshot
}
```

Node testsでは同じAPIを `module.exports` します。

### 5.2 `CONSTANTS`

```text
STORAGE_KEY = "distanceTermsSettings"
SCHEMA_VERSION = 1
MIN_GRAPHEMES = 2
MAX_GRAPHEMES = 50
MAX_CODE_POINTS = 512
MAX_ITEMS = 30
MESSAGE_TYPE = "distanceTermsMutation"
PROTOCOL_VERSION = 1
RESET_CONFIRMATION_VALUE = "RESET_DISTANCE_TERMS_SETTINGS"
```

`STATES`、`OPERATIONS`、`RESPONSE_CODES` も同じ定数objectで共有します。transport値を置いてもcore自身はmessagingを行いません。

### 5.3 `validateDistanceTermInput(rawTerm)`

成功:

```text
{
  ok: true,
  term: "<canonical term>",
  duplicateKey: "<ASCII-case-folded key>"
}
```

失敗:

```text
{
  ok: false,
  code: "INVALID_TERM_LENGTH" | "FORBIDDEN_CHARACTER",
  reason:
    "GRAPHEME_RANGE"
    | "CODE_POINT_LIMIT"
    | "LINE_BREAK_OR_TAB"
    | "FORBIDDEN_CHARACTER"
}
```

`reason` はOptionsがexact copyを選ぶための内部値であり、Service Worker responseへ載せません。duplicateはStorage contextが必要なため、この関数では判定しません。

### 5.4 その他のpure API

- `createDistanceTermDuplicateKey(canonicalTerm) -> string` はASCII `A-Z` だけをfoldします。
- `isValidDistanceTermId(id) -> boolean` はUUID v4とvariantを検証します。
- `createInitialDistanceTermsSettings(masterEnabled = true) -> settings` は正式なversion 1初期objectを毎回新規生成します。

### 5.5 `classifyDistanceTermsSnapshot(snapshot)`

inputはI/O結果のpure表現です。

```text
{ readStatus: "ok", exists: true, value: rawValue }
{ readStatus: "ok", exists: false }
{ readStatus: "error" }
```

rich internal resultの代表schema:

```text
{
  state: "partially_invalid",
  schemaVersion: 1,
  masterEnabled: true,
  rawItemCount: 5,
  usableItems: [
    {
      index: 0,
      id: "<UUID>",
      idKey: "<case-normalized UUID>",
      term: "仕事",
      termKey: "仕事",
      enabled: true
    }
  ],
  invalidItems: [
    {
      index: 1,
      reasonCodes: ["INVALID_ID"]
    }
  ],
  invalidCount: 1,
  idKeyCounts: [{ key: "<id key>", count: 1 }],
  termKeyCounts: [{ key: "仕事", count: 1 }]
}
```

- classificationはmutation判断とOptionsのresponse-loss reconciliationに必要なrich internal resultです。通常のOptions view / Content viewへそのまま渡さず、Optionsでは7.5の専用snapshotを通じて一時的なcontrol-plane情報としてだけ使用します。
- `invalidItems` にraw term、raw object、X post、URLを含めません。
- root result、array、usable / invalid itemは可能な範囲でfreezeします。
- raw Storage valueはclassificationへ埋め込まず、Mutation snapshotで別に扱います。

## 6. `distance-terms-mutations.js`

mutationsはpure mutation plannerです。Chrome API、DOM、UI、i18n、network、`crypto.randomUUID()`、consoleを持ちません。依存方向は `mutations → core` のみで、逆依存を禁止します。

### 6.1 公開API

```text
globalThis.kotobaUkeMimamoriDistanceTermsMutations = {
  planDistanceTermsMutation,
  isDistanceTermsDesiredStateSatisfied
}
```

### 6.2 `planDistanceTermsMutation(...)`

```text
planDistanceTermsMutation({
  rawValue,
  classification,
  operation,
  payload,
  generatedId
})
```

`rawValue` と `classification` は同じlatest read由来でなければなりません。`generatedId` は `addTerm` だけで使用し、他operationで指定された場合は `INVALID_REQUEST` とします。

write計画:

```text
{
  ok: true,
  code: "OK",
  shouldWrite: true,
  nextValue: { schemaVersion: 1, masterEnabled: true, items: [...] }
}
```

no-op:

```text
{
  ok: true,
  code: "NO_CHANGE",
  shouldWrite: false
}
```

拒否:

```text
{
  ok: false,
  code: "<fixed response code>",
  shouldWrite: false
}
```

`nextValue` はService Worker内部専用で、runtime responseへ載せません。

### 6.3 6状態 × 6 operation matrix

| operation | `missing` | `valid` | `partially_invalid` | `whole_invalid` | `unsupported_schema` | `read_error` |
| --- | --- | --- | --- | --- | --- | --- |
| `addTerm` | version 1初期Storageへ追加 | 条件を満たせば許可 | raw件数、term、duplicate、integrity条件を満たす場合だけ許可 | `SETTINGS_INVALID` | `UNSUPPORTED_SCHEMA` | `STORAGE_READ_FAILED` |
| `setMasterEnabled` | desired `true` は `NO_CHANGE`、`false` は初期Storageを作成 | 許可。成立済みは `NO_CHANGE` | invalid raw itemsを保持して許可。成立済みは `NO_CHANGE` | `SETTINGS_INVALID` | `UNSUPPORTED_SCHEMA` | `STORAGE_READ_FAILED` |
| `setItemEnabled` | `ITEM_NOT_FOUND` | 一意なusable itemだけ許可。成立済みは `NO_CHANGE` | 一意なusable itemだけ許可。invalid / ambiguous targetは `ITEM_NOT_EDITABLE` | `SETTINGS_INVALID` | `UNSUPPORTED_SCHEMA` | `STORAGE_READ_FAILED` |
| `deleteItem` | `NO_CHANGE` | 一意なusable itemを削除。不存在は `NO_CHANGE` | 一意なusable itemだけ削除。invalid / ambiguous targetは `ITEM_NOT_EDITABLE`、不存在は `NO_CHANGE` | `SETTINGS_INVALID` | `UNSUPPORTED_SCHEMA` | `STORAGE_READ_FAILED` |
| `deleteInvalidItems` | `NO_CHANGE` | `NO_CHANGE` | 許可 | `RECOVERY_NOT_ALLOWED` | `UNSUPPORTED_SCHEMA` | `STORAGE_READ_FAILED` |
| `resetInvalidSettings` | `RECOVERY_NOT_ALLOWED` | `RECOVERY_NOT_ALLOWED` | `RECOVERY_NOT_ALLOWED` | 正しいconfirmationがある場合だけ許可 | `UNSUPPORTED_SCHEMA` | `STORAGE_READ_FAILED` |

追加条件:

- `addTerm` はraw件数30で `LIMIT_REACHED`、invalidを含むduplicate namespaceとの競合で `DUPLICATE_TERM` とします。
- `setItemEnabled` / `deleteItem` はsafe-readable ID namespace上のambiguous targetを編集しません。
- `deleteInvalidItems` はoperation時のlatest classificationで現在invalidなentryだけを削除します。
- `resetInvalidSettings` は `whole_invalid` かつ正しい `confirmation` の場合だけ初期状態へ戻します。

### 6.4 post-condition

plannerは `nextValue` をcoreで再classificationし、write前にoperation固有post-conditionを検証します。

| operation | 必須post-condition |
| --- | --- |
| add | item数+1、targetがunique usable、`enabled === true`、新invalidityなし |
| master | desired `masterEnabled`、item数・invalid count維持 |
| item enable | unique usable targetがdesired値、item数・invalid count維持 |
| delete item | target absent、item数-1、新invalidityなし |
| delete invalid | stateが `valid`、元usable itemのraw内容と相対順序を維持 |
| reset | exact initial valueかつstateが `valid` |

満たさない場合は `INTEGRITY_CHECK_FAILED`、`shouldWrite: false` とします。

### 6.5 `isDistanceTermsDesiredStateSatisfied(...)`

```text
isDistanceTermsDesiredStateSatisfied({
  classification,
  operation,
  payload
}) -> boolean
```

response loss後の収束確認専用です。

| operation | `true` の条件 |
| --- | --- |
| `addTerm` | stateがvalid / partial、同termKeyのusable itemがちょうど1件、`enabled === true`、termKey countも1 |
| `setMasterEnabled` | current valueがdesired。missing + desired trueも成立済み |
| `setItemEnabled` | unique usable targetがdesired値 |
| `deleteItem` | safe-readable ID namespace上にもtargetが存在しない |
| `deleteInvalidItems` | stateが `valid` |
| `resetInvalidSettings` | exact initial structure、state valid、master true、items 0 |

この結果は「今回のrequestが成功した証明」ではなく、desired stateへ安全に収束しているためblind retryしない、という判定です。

## 7. `distance-terms-reader.js`

readerは `chrome.storage.local.get()` だけを使用し、`set()` またはrepair APIを持ってはなりません。Storageのschema判断を再実装せず、すべてcoreへ渡します。

### 7.1 公開API

```text
globalThis.kotobaUkeMimamoriDistanceTermsReader = {
  readDistanceTermsOptionsView,
  readDistanceTermsContentView,
  readDistanceTermsMutationSnapshot,
  readDistanceTermsOptionsReconciliationSnapshot
}
```

内部の共通readは、Storage resultが安全なobjectであり、`Object.hasOwn(result, STORAGE_KEY)` がfalseの場合だけ `missing` とします。`null` 等の異常resolve値をmissingと推測せず `read_error` とします。

### 7.2 Options view

`missing`:

```text
{
  state: "missing",
  masterEnabled: true,
  items: [],
  invalidCount: 0,
  rawItemCount: 0
}
```

`valid` / `partially_invalid`:

```text
{
  state: "valid" | "partially_invalid",
  masterEnabled: true,
  items: [
    { id: "<UUID>", term: "仕事", enabled: true }
  ],
  invalidCount: 0,
  rawItemCount: 1
}
```

`items` はusable itemだけです。invalid raw term、raw object、index、reason、duplicate key、conflict detailは返しません。登録数表示は `rawItemCount / 30` とします。

`whole_invalid`、`unsupported_schema`、`read_error` は次のdiscriminated viewだけを返し、`masterEnabled` や `items` を推測して付けません。

```text
{ state: "whole_invalid" }
{ state: "unsupported_schema" }
{ state: "read_error" }
```

### 7.3 Content view

```text
{ terms: ["仕事", "#topic"] }
```

返すのは、stateがvalid / partial、`masterEnabled === true`、item `enabled === true` のusable canonical termだけです。missing、Master OFF、enabled itemなし、whole invalid、unsupported、read errorはすべて `{ terms: [] }` へ縮退します。state、ID、invalid countはContentへ返しません。

### 7.4 Mutation snapshot

```text
{
  rawValue,
  classification
}
```

Service Workerだけが使用し、Optionsからは使用しません。`rawValue` と `classification` は必ず同一Storage read由来です。missing / read errorでは `rawValue` は `undefined` です。reader生成projectionは可能な範囲でfreezeしますが、raw valueをdeep-freezeせず、mutationsがraw value自体を書き換えず新しい `nextValue` を作ります。

### 7.5 Options reconciliation snapshot

```text
readDistanceTermsOptionsReconciliationSnapshot() -> {
  view,
  classification
}
```

Optionsのresponse-loss reconciliation専用APIです。通常loadには `readDistanceTermsOptionsView()` を使用します。

- privateの共通readを1回だけ実行し、`view` と `classification` を同じ `chrome.storage.local.get()` のsnapshotから生成します。別々のreadを組み合わせてはなりません。
- `view` は7.2のOptions viewと同じ共有projectionを使用します。
- `classification` はcoreの `classifyDistanceTermsSnapshot()` が生成した既存contractを改変せず、`isDistanceTermsDesiredStateSatisfied(...)` の判定にだけ使用します。
- resultに `rawValue`、raw `distanceTermsSettings`、Storage result objectを含めません。
- classificationはUI表示、DOM / dataset、Storage、runtime message、consoleへ出さず、long-lived controller stateとして保持しません。
- result root、`view`、`view.items`、itemを可能な範囲でfreezeし、classificationはcoreのfreeze contractを維持します。

## 8. `distance-matcher.js`

### 8.1 公開API

```text
globalThis.kotobaUkeMimamoriDistanceMatcher = {
  createDistanceMatcher
}

createDistanceMatcher(terms) -> matches
matches(rawPostText) -> boolean
```

matcher生成時にtermをNFKC + ASCII case-foldしたcomparison keyとしてclosureへ保持し、投稿ごとにraw `textContent` をNFKC + ASCII case-foldして `includes()` 相当のliteral substring matchingを登録順に行います。

matcherはtrim、whitespace collapse、改行置換、punctuation削除、Unicode全体のlowercase、diacritic削除、tokenize、不可視文字除去、意味解析を行いません。

戻り値は常にbooleanだけです。matched term、ID、count、position、range、duplicate key、indexを返しません。

## 9. `distance-terms-service-worker.js`

Service WorkerはSingle Writer / mutation orchestrationを担当します。DOM、Options UI、X post、i18n、Overlay、fixed ruleを知りません。Service Workerの外部公開契約は `chrome.runtime.onMessage` のrequest / responseだけです。Node testsではorchestration helperをtest可能な範囲で `module.exports` できますが、productionの第二mutation入口を作ってはなりません。

### 9.1 request envelopeとstrict schema

```text
{
  type: "distanceTermsMutation",
  protocolVersion: 1,
  operation: "...",
  payload: ...
}
```

top-level fieldは `type`、`protocolVersion`、`operation`、必要なoperationだけ `payload` を許可します。top-level / payloadともunknown fieldを `INVALID_REQUEST` でrejectします。`requestId`、message本文内の `sender` / `source` / `origin` / `url` / `page` は許可しません。

| operation | strict payload |
| --- | --- |
| `addTerm` | `{ term: string }` |
| `setMasterEnabled` | `{ enabled: boolean }` |
| `setItemEnabled` | `{ id: string, enabled: boolean }` |
| `deleteItem` | `{ id: string }` |
| `deleteInvalidItems` | payload field自体なし |
| `resetInvalidSettings` | `{ confirmation: "RESET_DISTANCE_TERMS_SETTINGS" }` |

`deleteInvalidItems` の `payload: {}` もinvalidです。booleanはstrict booleanだけを受け付け、`"false"`、`0`、`1`、`null` をcoerceしません。

request validatorはtransport shapeだけを検証します。termのgrapheme / forbidden / duplicate / limit、targetのeditability、Storage stateはcore / mutationsが判断します。

### 9.2 sender validation

strict request validationの後、queue投入前に次を検証します。

```text
sender.id === chrome.runtime.id
AND
sender.url === chrome.runtime.getURL("options.html")
AND
(
  sender.origin is absent
  OR
  sender.origin === new URL(chrome.runtime.getURL("options.html")).origin
)
```

`sender.tab` の有無はauthorization条件に使いません。Content Script、Popup、別extension、external messageは `UNAUTHORIZED_SENDER` です。message本文のsender claimは信用しません。

validation順は次のとおりです。

```text
strict request structure validation
→ sender validation
→ FIFO queue
```

### 9.3 FIFOとlatest read

memory上に1本のPromise queue tail相当を持ち、valid requestを受信順に直列化します。

```text
request A
    ↓
request B
    ↓
request C
```

- Aが失敗してもqueue tailをrejectedのままにせず、B / Cを継続します。
- queueへ入れる前にStorageを読んではなりません。
- request BはAのwrite完了後、自分のturnへ到達してからlatest Storageをreadします。
- queueはmemory-onlyで、settings、history、request resultのSource of Truthではありません。
- Service Worker再起動後も、各mutationをlatest `chrome.storage.local` から開始します。

### 9.4 UUID

`addTerm` だけService Workerが `crypto.randomUUID()` でUUID v4を生成します。

- coreでvalid UUID v4であることを検証します。
- usable / invalidを問わず、既存の安全に読めるvalid UUIDすべてとcase-insensitiveにcollision確認します。
- collisionまたはinvalid UUIDなら再生成します。
- 最大10回でunique valid UUIDを得られなければ `INTERNAL_ERROR` とします。
- Optionsが生成または指定した新規IDを信用しません。

### 9.5 1 operationのflow

```text
runtime.onMessage
       │
       ▼
strict request validation
       │
       ▼
sender validation
       │
       ▼
FIFO mutation queue
       │
       ▼
latest Storage read
       │
       ▼
distance-terms-reader
       │
       ▼
distance-terms-core
       │
       ├──── state / usable / conflicts
       │
       ▼
UUID generation (addTerm only)
       │
       ▼
distance-terms-mutations
       │
       ├──── reject / NO_CHANGE
       └──── nextValue
                   │
                   ▼
          core post-condition validation
                   │
                   ▼
         exactly one storage.local.set
                   │
                   ▼
             await completion
                   │
                   ▼
        fixed-code-only response
```

### 9.6 write contract

- writeが必要なrequestごとに `chrome.storage.local.set({ distanceTermsSettings: nextValue })` をexactly once実行します。
- rootの一部を複数回に分けてwriteしません。
- `NO_CHANGE`、request / sender / domain rejection、integrity failureではwriteを0回とします。
- post-conditionはwrite予定値に対するpre-write integrity validationです。
- Service Workerによる毎回のpost-write rereadは必須にしません。
- `storage.local.set()` の完了をawaitしてから `OK` を返します。
- read / write failureを自動retryしません。

### 9.7 response schema

```text
{ ok: true, code: "OK" }
{ ok: true, code: "NO_CHANGE" }
{ ok: false, code: "<FIXED_CODE>" }
```

固定code allowlist:

```text
OK
NO_CHANGE
INVALID_REQUEST
INVALID_TERM_LENGTH
FORBIDDEN_CHARACTER
DUPLICATE_TERM
LIMIT_REACHED
ITEM_NOT_FOUND
ITEM_NOT_EDITABLE
RECOVERY_NOT_ALLOWED
SETTINGS_INVALID
UNSUPPORTED_SCHEMA
STORAGE_READ_FAILED
STORAGE_WRITE_FAILED
INTEGRITY_CHECK_FAILED
UNAUTHORIZED_SENDER
INTERNAL_ERROR
```

Options側の `sendMessage` failure / responseなしは `COMMUNICATION_FAILED` として扱いますが、これはService Worker runtime response codeではありません。

responseへterm、ID、item、raw Storage、classification、state detail、exception、message、stack、file、line、schema detail、post body、localized UI textを含めません。予期しない例外も `{ ok: false, code: "INTERNAL_ERROR" }` だけとし、consoleへtermやraw dataを出しません。

## 10. `distance-terms-options.js`

Options moduleはdistance sectionだけを管理するUI controllerです。既存3設定のcontrollerと障害境界を分けます。

### 10.1 公開API

```text
globalThis.kotobaUkeMimamoriDistanceTermsOptions = {
  initializeDistanceTermsOptions,
  updateDistanceTermsOptionsLocalization
}

initializeDistanceTermsOptions({
  document,
  runtimeApi,
  localization
})

updateDistanceTermsOptionsLocalization(localization)
```

`localization` は既存 `options.js` が解決した `resolvedLanguage` と `getMessage(key, substitutions)` 相当を受け取ります。distance moduleが独自にUI languageをresolveしません。初期化関数の戻り値を他module間のデータ契約に使用せず、保存済みstateはreaderのlatest Options viewだけを正本とします。

Options moduleは `reader`、`core`、`mutations` に依存します。coreはdraftのclient validation、mutationsはresponse-loss時のdesired-state確認に使用します。

```text
options.js
   │
   ▼
distance-terms-options.js
   │
   ├── distance-terms-reader.js
   │        └── distance-terms-core.js
   │
   ├── distance-terms-core.js
   │        └── client-side term validation
   │
   └── distance-terms-mutations.js
            └── response-loss desired-state check
```

### 10.2 controller state

巨大な単一enumではなく、3つの直交状態を組み合わせます。

```text
activity
  = loading
  | idle
  | mutating
  | reconciling

view
  = null
  | missing
  | valid
  | partially_invalid
  | whole_invalid
  | unsupported_schema
  | read_error

dialog
  = none
  | delete_item
  | delete_invalid_items
  | reset_invalid_settings
```

controller memoryは `draftTerm`、`pendingAction`、`transientStatus`、`localization` とfocus token等の一時UI情報だけです。`view` は最後にreaderから正常に得たOptions viewのsnapshotであり、mutation開始時にoptimistic updateしません。

### 10.3 Options state machine

```text
                           page load
                               │
                               ▼
                            loading
                               │
                     reader Options view
                               │
       ┌───────────────┬───────┼──────────────┬──────────────┐
       ▼               ▼       ▼              ▼              ▼
    normal          partial   whole       unsupported      read_error
 missing/valid        │        │                              │
       │              │        │                              │
       │         normal UI +   │                        Retry read
       │          warning      │                              │
       │              │        │                              └──► loading
       │              │        │
       └──────┬───────┘        └── Reset confirmation
              │
       user mutation
              │
              ▼
          client validate
              │
       ┌──────┴──────┐
       │             │
    invalid          valid
       │             │
       ▼             ▼
      idle        mutating
                     │
              sendMessage result
                     │
           ┌─────────┴─────────┐
           │                   │
       response          response loss
           │                   │
           ▼                   ▼
       reconciling         reconciling
           │                   │
           └─────────┬─────────┘
                     ▼
                 latest read
                     │
                     ▼
             latest Options view
                     │
              ┌──────┴───────┐
              │              │
       normal response   response loss
                             │
                             ▼
                 desired-state check
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
                satisfied        not satisfied
                    │                 │
                    └────────┬────────┘
                             ▼
                            idle
                    no automatic retry
```

### 10.4 load / mutation / reconciliation

- page loadでは既存3設定とdistance controllerを独立初期化します。distanceがloading / failureでも既存3設定を利用可能にします。
- 初期load成功時にfocusを強制移動しません。
- mutationは `current view → send intent → latest read → new view` の順で確定します。
- `OK`、`NO_CHANGE`、domain error、communication failureの後も原則latest Storageを再readします。
- Optionsはruntime responseが `ok` とallowlisted fixed `code` だけからなる正しいshapeかを検証し、未知field・未知code・不正な組み合わせを信用しません。
- 1 Options pageからdistance mutationを同時に複数送信しません。
- client validationで判定できるlength / forbidden / line break / tabはsend前に止められますが、duplicateやlimit等のlatest Storage依存判断はService Workerを正本とします。
- Service WorkerへはOptionsが作ったcanonical値ではなくraw `draftTerm` を送り、同じcoreで再validationします。

### 10.5 Add / switch / delete

Add:

- validation failureではsendせず、draftを保持し、inputへfocusし、field errorを関連付けます。
- confirmed successとlatest read後にだけdraftとvalidation errorをclearし、add inputへfocusします。
- server-side failureではdraftを保持し、一覧はlatest viewへ更新し、inputへfocusします。

Master / individual switch:

- desired booleanを `pendingAction` に保持します。
- optimistic checkbox stateを保存済みstateとして扱いません。
- success / failureともlatest viewから再描画します。
- 操作したcontrolへfocusを戻します。対象が消えた場合はfocus fallbackを使用します。
- Master OFF中もadd、delete、individual ON/OFFを操作でき、item状態を変更しません。

Delete:

- normal deleteはnative `<dialog>` によるconfirmation必須です。
- dialog memoryは `itemId`、`displayTerm`、`originFocusToken` だけです。
- mutation中にdialogを閉じず、Cancel / Delete双方をdisabledにし、Escape closeを防ぎます。
- success後はdialogを閉じ、add inputへfocusします。
- failure時にtargetがlatest viewへ残る場合はdialogを維持し、actionへfocusします。
- targetが消えた等、dialogの意味が最新stateと合わない場合は閉じてlatest UIへ遷移します。

### 10.6 Recovery / response loss

`partially_invalid`:

- warningとusable itemsのnormal UIを併存させます。
- invalid term / raw object / reasonは表示しません。
- `deleteInvalidItems` はconfirmation後に送ります。
- successしてstateがvalidならdialogを閉じ、warningを消し、add inputへfocusします。

`whole_invalid`:

- normal managementを表示せずreset Recovery UIだけを表示します。
- `resetInvalidSettings` はstrong confirmationと `confirmation: "RESET_DISTANCE_TERMS_SETTINGS"` を必須とします。
- exact initial state確認後にnormal UIへ戻り、add inputへfocusします。

`unsupported_schema`:

- 保存データを変更せず、normal UI、Retry、reset、mutationを提供しません。

`read_error`:

- 正常値を推測せずRetryだけを提供します。
- read errorが繰り返されても `whole_invalid` へ格上げせず、保存値を変更しません。
- Retry失敗ではRetry buttonへfocusします。
- Retry成功ではdistance section headingまたは遷移先state headingへprogrammatic focusします。

communication failure:

```text
sendMessage responseなし
→ activity = reconciling
→ readDistanceTermsOptionsReconciliationSnapshot()
→ same-read由来の { view, classification }
→ classificationをisDistanceTermsDesiredStateSatisfied(...)へ渡す
→ same-read由来のviewを描画
→ automatic retryなし
```

reconciliationではOptions view APIとMutation snapshot APIを別々に呼ばず、1回のStorage readから得た専用snapshotを使用します。classificationはdesired-state判定後に保持せず、描画には同じsnapshotの `view` だけを使用します。

- desired state成立時はblind retryせず、通常の成功後と同じfocus規則を使います。
- desired state不成立でも自動再送せず、利用者様が必要なら再操作します。
- `deleteInvalidItems` / resetを再実行する場合はlatest stateに対してfresh confirmationを取り直します。
- response loss後にdesired stateを確認できた場合も、「今回のrequestが成功した」と技術的に証明したとは扱いません。

## 11. Options DOM / accessibility contract

### 11.1 概念DOM

```text
<section aria-labelledby="distance-terms-title">
  ├─ heading
  ├─ description
  ├─ privacy note
  ├─ manual link
  │
  ├─ storage-state-area
  │    ├─ partial warning
  │    ├─ whole-invalid recovery
  │    ├─ unsupported notice
  │    └─ read-error + retry
  │
  ├─ normal-management-area
  │    ├─ master checkbox
  │    ├─ add form
  │    ├─ registered count
  │    └─ registered items
  │
  └─ transient-status
</section>

<dialog id="delete-item-dialog">...</dialog>
<dialog id="delete-invalid-items-dialog">...</dialog>
<dialog id="reset-invalid-settings-dialog">...</dialog>
```

`missing`、`valid`、`partially_invalid` だけnormal managementを表示し、partialはwarningを併記します。`whole_invalid`、`unsupported_schema`、`read_error` ではnormal managementを隠します。

heading → description → privacy → manual link → Masterの順を維持します。manual linkはnative `<a>`、`target="_blank"`、`rel="noopener noreferrer"`、視覚的な `↗`、screen-reader向け新規タブ説明を使用します。

### 11.2 DOM / state対応図

```text
distance section
├─ storage-state-area
│  ├─ partially_invalid → warning + partial recovery
│  ├─ whole_invalid → whole recovery
│  ├─ unsupported_schema → notice only
│  │    └─ no Retry / reset / normal management / mutation
│  └─ read_error → Retry only (not corruption)
│       └─ no reset / normal management / mutation
├─ normal-management-area (missing / valid / partially_invalid)
│  ├─ master
│  ├─ add form
│  │    └─ validation message
│  └─ item list
│       └─ delete dialog
└─ transient-status

partial recovery ─────────────► bulk-delete dialog
whole recovery ───────────────► reset dialog

all dialogs
  Cancel initial focus
  mutation starts
      ↓
  dialog stays open + actions disabled
      ↓
  latest read
      ↓
  ┌──────── state still compatible ────────┐
  │                                        │
success                                 failure
close + next focus                 remain + dialog error

state changed incompatibly
      ↓
close dialog
      ↓
render latest state
      ↓
focus latest state UI
```

### 11.3 native controls

- Master / item ON/OFFはnative `<input type="checkbox">` を基礎とし、Tab、Space、`checked` semanticsを維持します。`role="switch"` の後付けを必須にしません。
- Addはnative `<form>`、text input、`<button type="submit">` とします。
- `event.isComposing === true` またはcomposition中のEnterではsubmitしません。
- validationはinput直下のmessageと `aria-describedby` / `aria-invalid` で関連付けます。
- 30件時はAdd buttonをdisabledにし、最大件数説明を表示します。通常時のinputは内容確認・copyのためdisabledにしません。
- 登録数はusable件数でなく `rawItemCount / 30` です。
- 一覧は登録順の全件表示です。pagination、filter、sort、drag reorderは行いません。
- UUIDをvisible text、accessible name、DOM idへ出しません。可能ならevent handler closureで保持し、datasetへ置きません。
- item OFFはcheckbox、状態label、border / background等を組み合わせ、opacityまたは色だけに依存しません。

### 11.4 dialog / focus token

3つの破壊的dialogは同じinfrastructureを使いますが、accessible name / description / actionを固定するため3つのnative `<dialog>` を明示的に持ちます。

- `aria-labelledby` と必要に応じた `aria-describedby` を使用します。
- dialog errorは永続descriptionへ混ぜず、dialog内の `role="status"` / `aria-live="polite"` 領域へ出します。
- 初期focusは3種類ともCancelです。自然なTab順はCancel → Delete / Resetです。
- EscapeはCancel扱いとし、通常時はorigin controlへfocusを戻します。
- mutation開始後はdialogを維持し、Cancelを含むactionをdisabledにします。

再render後のfocus復元はDOM Node referenceだけに頼らず、controller-memory-only tokenを使います。

```text
{ kind: "master" }
{ kind: "add-input" }
{ kind: "item-switch", id: "<UUID>" }
{ kind: "item-delete", id: "<UUID>" }
{ kind: "retry" }
```

tokenのUUIDをStorageやDOMへ新たに保存しません。対象がlatest viewに存在しなければ、item control → add input、normal UI不存在 → latest state heading / actionへfallbackし、存在しないDOMを再現しません。

### 11.5 disabled / busy / status

`activity === mutating` または `reconciling` 中は、Master、Add input / button、item checkbox、Delete、Recovery button、dialog Cancel / destructive actionを一時disableします。

Manual link、既存3設定、page navigationはdisableしません。distance sectionだけに `aria-busy="true"` を設定し、完了後にfalseまたは属性削除します。

transient statusは1か所のpolite live regionです。

```text
<p role="status" aria-live="polite" aria-atomic="true"></p>
```

次の明示的なmutation開始まで保持し、timerで自動消去しません。field validation、transient operation status、persistent Storage warning、dialog errorは別領域です。persistent warningを `role="alert"` にしません。

## 12. 確定済みi18n copy

本節は日英文言のexact copy contractです。runtime値の件数や対象termだけを安全なtextとして置換します。用途ごとに日本語・英語を必ずペアで実装します。

### 12.1 通常Options

| 用途 | 日本語 | English |
| --- | --- | --- |
| Section | 距離を置きたい言葉 | Words you'd like some distance from |
| Description | 今は距離を置きたい言葉や短いフレーズ、ハッシュタグを登録できます。登録した言葉を含む投稿には、読む前にワンクッションを表示します。 | You can register words, short phrases, or hashtags you'd like some distance from for now. When a post contains registered text, a gentle cushion appears before you read it. |
| Privacy | 登録した言葉はこのブラウザ内に保存され、外部送信されません。 | Registered text is stored in this browser and is not sent externally. |
| Master | 登録した言葉によるワンクッション | Cushions for registered words |
| Master note | この機能をOFFにしても、登録した言葉と個別のON/OFF設定は保持されます。 | Turning this feature off does not delete registered words or their individual ON/OFF settings. |
| Add heading | 距離を置きたい言葉を追加 | Add a word, phrase, or hashtag |
| Placeholder | 言葉・短いフレーズ・ハッシュタグ | Word, short phrase, or hashtag |
| Add button | 追加する | Add |
| Count example | 登録数：8 / 30 | Registered: 8 / 30 |
| List | 登録した言葉 | Registered words |
| Delete | 削除 | Delete |
| Empty | まだ登録されている言葉はありません。今は距離を置きたい言葉があれば、上の入力欄から追加できます。 | No words are registered yet. If there's something you'd like some distance from for now, you can add it above. |
| Max | 登録できるのは最大30件です。新しく追加する場合は、不要になった登録を削除してください。 | You can register up to 30 entries. To add another, delete an entry you no longer need. |

### 12.2 validation / status

| 用途 | 日本語 | English |
| --- | --- | --- |
| Length | 2〜50文字で入力してください。 | Enter between 2 and 50 characters. |
| Internal safety length | 入力内容が長すぎます。より短い文字列で入力してください。 | This entry is too long. Please enter a shorter one. |
| Line break / tab | 改行やタブを含めず、1行で入力してください。 | Enter the text on one line without line breaks or tabs. |
| Forbidden | 登録できない文字が含まれています。画面上に表示されない一部の文字は登録できません。入力内容を確認してください。 | This entry contains characters that cannot be registered. Some non-visible characters cannot be registered. Please check your input. |
| Duplicate | この言葉はすでに登録されています。 | This word is already registered. |
| Add success | 距離を置きたい言葉を追加しました。 | Added to your registered words. |
| Add failure | 登録できませんでした。入力内容はそのまま残しています。もう一度お試しください。 | Could not add this entry. Your input has been kept. Please try again. |
| Setting change failure | 設定を変更できませんでした。もう一度お試しください。 | Could not change this setting. Please try again. |
| Delete success | 登録した言葉を削除しました。 | Registered word deleted. |
| Delete failure | 削除できませんでした。もう一度お試しください。 | Could not delete this entry. Please try again. |

### 12.3 通常削除dialog

日本語:

```text
登録した言葉を削除しますか？

「仕事」を削除します。

登録から削除した言葉は元に戻せません。

必要に応じて、再登録していただく必要があります。

[キャンセル] [削除する]
```

English:

```text
Delete this registered word?

Delete “Work”.

Once deleted, this entry cannot be restored.

If you need it again, you'll need to register it again.

[Cancel] [Delete]
```

### 12.4 `partially_invalid`

State UI:

| 日本語 | English |
| --- | --- |
| 一部の登録設定を読み込めませんでした<br><br>読み込めた設定だけでワンクッションを続けています。保存されているデータは自動では変更していません。<br><br>問題のある登録：2件<br><br>[問題のある登録を削除する] | Some registered settings could not be read<br><br>Cushions will continue using the settings that could be read. Saved data has not been changed automatically.<br><br>Problem entries: 2<br><br>[Delete problem entries] |

Recovery success:

| 日本語 | English |
| --- | --- |
| 問題のある登録を削除しました。 | Problem entries deleted. |

confirmation:

| 日本語 | English |
| --- | --- |
| 問題のある登録を削除しますか？<br><br>正常に読み込めなかった登録を削除します。<br><br>削除した登録は元に戻せません。<br><br>正常に読み込めている登録は削除されません。<br><br>[キャンセル] [問題のある登録を削除する] | Delete problem entries?<br><br>Entries that could not be read correctly will be deleted.<br><br>Deleted entries cannot be restored.<br><br>Entries that were read correctly will not be deleted.<br><br>[Cancel] [Delete problem entries] |

### 12.5 `whole_invalid`

State UI:

| 日本語 | English |
| --- | --- |
| 「距離を置きたい言葉」の設定を読み込めませんでした<br><br>保存されている設定を安全に読み取れないため、登録した言葉によるワンクッションを一時停止しています。<br><br>既存の固定ルールによるワンクッションは引き続き動作します。<br><br>[「距離を置きたい言葉」の設定を初期化する] | Could not read “Words you'd like some distance from” settings<br><br>Cushions based on registered words are temporarily paused because the saved settings could not be read safely.<br><br>Cushions based on the existing fixed rules will continue to work.<br><br>[Reset these settings] |

Reset success:

| 日本語 | English |
| --- | --- |
| 「距離を置きたい言葉」の設定を初期化しました。 | “Words you'd like some distance from” settings have been reset. |

confirmation:

| 日本語 | English |
| --- | --- |
| 「距離を置きたい言葉」の設定を初期化しますか？<br><br>登録した言葉と、その個別ON/OFF設定をすべて削除し、初期状態に戻します。<br><br>この操作は元に戻せません。<br><br>「ことばうけみまもり」のその他の設定は変更されません。<br><br>[キャンセル] [設定を初期化する] | Reset “Words you'd like some distance from” settings?<br><br>All registered words and their individual ON/OFF settings will be deleted, and this feature will return to its initial state.<br><br>This action cannot be undone.<br><br>Other Kotoba Uke Mimamori settings will not be changed.<br><br>[Cancel] [Reset settings] |

### 12.6 `unsupported_schema` / `read_error`

| state | 日本語 | English |
| --- | --- | --- |
| `unsupported_schema` | この設定形式は現在のバージョンでは読み込めません<br><br>「距離を置きたい言葉」の設定は変更せず、そのまま保持しています。<br><br>登録した言葉によるワンクッションは一時停止しています。 | This settings format cannot be read by the current version<br><br>Your “Words you'd like some distance from” settings have been left unchanged.<br><br>Cushions based on registered words are temporarily paused. |
| `read_error` | 設定を読み込めませんでした<br><br>一時的に設定を読み込めない可能性があります。保存されている設定は変更していません。<br><br>[もう一度読み込む] | Could not load settings<br><br>This may be a temporary issue. Your saved settings have not been changed.<br><br>[Try again] |

### 12.7 manual link

| 用途 | 日本語 | English |
| --- | --- | --- |
| Link | 操作方法を見る | View the user manual |
| 新規タブ説明 | 新しいタブで開きます | Opens in a new tab |

URLはresolved Options UI languageで選びます。

| language | URL |
| --- | --- |
| Japanese | `https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/manual.html` |
| English | `https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/en/manual.html` |

### 12.8 distance-only State 1

| 用途 | 日本語 | English |
| --- | --- | --- |
| Title | 読む前に、少しだけワンクッションを置きました | A gentle cushion before reading |
| Body | この投稿には、あなたが登録した「距離を置きたい言葉」に一致する文字列が含まれているため、ワンクッションを表示しています。 | This cushion is shown because this post contains text matching something you registered under “Words you'd like some distance from.” |
| Buttons | 内容を表示する<br>今は見ない | Show content<br>Not now |

titleは既存 `cushionTitle`、buttonsは既存 `buttonShowContent` / `buttonHideForNow` を共有し、新規required keyは本文の `distanceCushionBody` だけです。

### 12.9 Recovery / destructive action結果不明時

desired stateを確認できないRecovery / destructive actionのgeneric fallback:

| 日本語 | English |
| --- | --- |
| 操作を完了したことを確認できませんでした。保存されている最新の設定を読み直しました。現在の状態を確認して、必要に応じてもう一度お試しください。 | We couldn't confirm that the action was completed. The latest saved settings have been reloaded. Check the current state and try again if needed. |

- desired stateを確認できた場合はgeneric fallbackを使わず、該当する確定済みsuccess copyを使用します。
- Addには専用のAdd failure copyを使用し、このgeneric copyを流用しません。
- latest stateがdialogと整合する場合だけdialogを開いたまま表示し、actionへfocusします。
- latest stateが変わった場合は古いdialogを閉じ、latest state UIへfocusします。

## 13. Content Script統合

### 13.1 page snapshotと初期化

`enabled === false` ならdistance設定を問わず終了します。enabled時は既存localizationを準備した後、`readDistanceTermsContentView()` をページ初期化時に1回だけ呼び、`createDistanceMatcher(terms)` を1回だけ実行します。

```text
initialize()
   │
   ▼
既存3設定をload
   │
   ▼
enabled ?
 ┌─┴────────┐
 │ false    │ true
 ▼          ▼
終了      localization準備
             │
             ▼
      distance Content view read
             │
       ┌─────┴─────┐
       │ success   │ failure/exception
       ▼           ▼
    terms取得      terms=[]
       │           │
       └─────┬─────┘
             ▼
      distance matcher生成
             │
       ┌─────┴─────┐
       │ success   │ failure
       ▼           ▼
     matcher     no-op matcher
       │           │
       └─────┬─────┘
             ▼
       Timeline監視開始
```

- read failure / throw時は `{ terms: [] }` 相当へ縮退し、initialize全体をrejectしません。
- matcher生成失敗時は `NO_DISTANCE_MATCHER = () => false` 相当を使います。
- matcherは関数chainへ明示的に依存注入し、hidden mutable globalへ置きません。
- `chrome.storage.onChanged` を追加せず、Options変更はX page reload後に反映します。

### 13.2 raw / fixed分岐とfixed-first

`processPostTextTarget()` の先頭で `textNode.textContent` を一度だけraw snapshotとして取得し、同じsnapshotから別経路へ分岐します。

```text
const rawPostText = textNode.textContent
       │
       ├─ fixed path
       │    └─ normalizeExtractedText(rawPostText)
       │
       └─ distance path
            └─ distanceMatcher(rawPostText)
```

distance matcherへfixed用の空白collapse済みtextを渡してはなりません。

処理順:

```text
rawPostText
     │
     ▼
fixed用normalize
     │
     ▼
fixed risk detector
     │
     ├─ shouldCushion === true
     │       └─ fixed candidate
     │          ★ distance matcherを呼ばない
     │
     └─ shouldCushion !== true / detector unavailable
                │
                ▼
         distance matcher(rawPostText)
                │
          ┌─────┴─────┐
          ▼           ▼
        false        true
        no-op      distance candidate
```

既存dev forced cushionもdistanceより先のexisting pathです。fixed / forced cushionが成立したtargetではmatcher function自体を呼びません。fixed detector unavailableはdistanceを停止させず、独立した経路としてdistance matchingを行えます。

### 13.3 target単位・failure isolation

- 現行の `findPostTextTargets()` が返すtext target単位を維持します。
- quote側と引用元、複数targetの本文を連結しません。
- 同じarticle内でもtarget Aがfixed、target Bがdistanceになれます。
- matcher callだけをtarget単位の `try/catch` で囲み、例外をfalseへ縮退します。
- 例外時にterm、raw post、exception内容をlogしません。
- 1 targetのdistance障害で他target / postのscanを止めません。
- 既存 `data-kum-processed` とgeneric `data-kum-cushion-candidate` を利用し、distance専用processed / source / matched data attributeを追加しません。
- 既存 `data-kum-risk-checked` はfixed-rule check semanticsを維持し、distance-onlyを表す属性へ転用しません。productionに新しいdistance-specific DOM metadataを追加しません。

### 13.4 WeakSetとOverlay選択

```text
const distanceCushionTargets = new WeakSet()
```

distance一致時はtarget nodeをaddするだけで、term、ID、count、position、rangeを保持しません。fixed guidanceの既存WeakMapとdistance WeakSetを分離します。

Overlay選択:

```text
distanceCushionTargets.has(targetNode)
  ? overlay.createDistanceCushionElement(handlers, localization)
  : overlay.createCushionElement(result, handlers, localization)
```

distance Overlay生成 / DOM insertに成功した後だけWeakSet entryを削除します。失敗時にfixed Overlayへfallbackしません。productionのprocess resultへ `source: "distance"` 等を追加しません。

### 13.5 Content API依存図

```text
                         page initialize
                               │
                               ▼
                    existing settings load
                               │
                         enabled=true?
                               │
                               ▼
                        localization
                               │
                               ▼
             readDistanceTermsContentView()
                               │
                         { terms: [...] }
                               │
                               ▼
                  createDistanceMatcher()
                               │
                               ▼
                    immutable page matcher
                               │
                               ▼
                         timeline scan
                               │
                               ▼
                       text target unit
                               │
                      raw textContent
                         /          \
                        /            \
                       ▼              ▼
               fixed-rule path    distance raw path
                       │              │
             normalizeExtractedText   │
                       │              │
                       ▼              │
                risk-detector         │
                       │              │
           ┌───────────┴─────────┐    │
           │ cushion=true        │    │
           ▼                     │    │
      fixed candidate            │    │
           │                     │    │
           │  SHORT CIRCUIT      │    │
           └───────────────X─────┘    │
                                     ▼
                              distanceMatcher
                                  try/catch
                                     │
                              ┌──────┴──────┐
                              ▼             ▼
                            false          true
                            no-op    WeakSet.add(target)
                                           │
                                           ▼
                                generic cushion candidate
                                           │
                            ┌──────────────┴─────────────┐
                            ▼                            ▼
                    fixed candidate              distance WeakSet
                            │                            │
                            ▼                            ▼
             overlay.createCushionElement   overlay.createDistanceCushionElement
                            │                            │
                            └──────────────┬─────────────┘
                                           ▼
                                      blur content
                                           │
                                  ┌────────┴────────┐
                                  ▼                 ▼
                           Show content          Not now
                                  │                 │
                                  ▼                 ▼
                           existing reveal   common ADR-0002 State 2
```

## 14. Overlay統合

### 14.1 public / private API

public:

```text
createCushionElement(result, handlers, localization)
createDistanceCushionElement(handlers, localization)
```

distance constructorへ `result` を渡しません。reason、guidance、strength、tendency、score、matched term、ID、countをAPIレベルで渡せない構造にします。

private shared:

```text
createBaseCushionElement()
appendState1Actions(container, handlers, localization)
createButton(...)
renderDismissedCushionElement(...)
```

`renderDismissedCushionElement()` は唯一のADR-0002 State 2実装で、public APIにせず、`source` 引数も追加しません。

### 14.2 State 1 / State 2

distance State 1はtitle、distance body、共通actionsだけです。fixed `cushionBody`、reason、guidance、strength、tendency、matched dataを生成しません。

- Show contentはfixed / distance / State 2すべて同じ `handlers.onShow` と既存reveal pathを使用します。
- Not nowは共通 `appendState1Actions()` 内の `hasEnteredState2` guardを通り、唯一の `renderDismissedCushionElement()` へ進みます。
- State 2へ正常に切り替えた後だけ共通 `handlers.onHide` を呼びます。
- State 2はfixed / distanceのsourceを知りません。
- State 2からState 1へ戻る操作を作りません。
- State 1挿入時にprogrammatic focusを移しません。
- Not nowを利用者様が選んだ後だけ、既存どおり `tabindex="-1"`、unique ID、`aria-labelledby` を持つState 2 containerへfocusします。
- State 2へfocusした後の自然なTab順はprotect-your-heart link → Show contentの既存順を維持します。
- protect-your-heart linkのresolved-language reliability、`target="_blank"`、`rel="noopener noreferrer"`、`↗`、新規タブ説明を変更しません。

### 14.3 Overlay共有図

```text
                            overlay.js
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
   createCushionElement()           createDistanceCushionElement()
       fixed State 1                   distance State 1
               │                                 │
   title/body/reason/guidance              title/body only
               │                                 │
               └──────────────┬──────────────────┘
                              ▼
                   appendState1Actions()
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
            Show content                 Not now
                 │                         │
                 ▼                         ▼
          handlers.onShow       renderDismissedCushionElement()
                 │                         │
                 ▼                         ▼
       existing reveal path     ONE shared ADR-0002 State 2
                                           │
                                           ▼
                                    handlers.onHide
                                           │
                                           ▼
                              keep content hidden / blurred
```

distance source用data attribute、`kum-cushion--distance` 等の専用class、専用色、専用card、専用focus colorを追加しません。既存Overlay styleを共有します。distance Overlayがthrowまたは不正elementを返してもfixed Overlayへfallbackしません。

## 15. i18n / theme / version / manifest / packaging

### 15.1 i18n

- 新しいuser-facing copyは `_locales/ja/messages.json` と `_locales/en/messages.json` に必ず対で追加します。
- `distanceCushionBody` をrequired keyへ追加します。title / buttonsは既存keyを共有します。
- response codeをそのまま表示せずOptionsでlocalized safe copyへ変換します。
- Contentは既存localizerを共有し、distance専用resolver / locale loadを追加しません。
- Optionsの `uiLanguage` 変更はcopyと現在のdialogを更新しますが、Storage / mutation stateを変更しません。

### 15.2 theme

- Optionsは現行の `prefers-color-scheme` に従い、X themeを参照しません。
- Overlayは既存のOS / X theme処理を共有します。
- distance専用theme setting、theme query、Options / Manualのtheme共有を追加しません。
- Optionsのsection、warning / recovery card、row、disabled、dialog / backdrop、validation、`:focus-visible` をlight / dark双方で確認します。
- OS dark + X explicit lightの既存theme問題が見つかっても、本機能実装へ便乗せず別課題とします。

### 15.3 v2.0.0

実装PRでは `manifest.json`、`package.json`、`package-lock.json` のversionを `2.0.0` に揃えます。本書を作成する文書作業ではversionを変更しません。

v2.0.0は `distanceTermsSettings.schemaVersion: 1` の初回導入であり、migration処理を実装しません。future schema migrationは別設計です。Chrome Web Store releaseは機能実装・version更新とは別工程です。

### 15.4 manifest load order

Content Script:

```text
settings.js
risk-detector.js
cushion-guidance.js
i18n.js
distance-terms-core.js
distance-terms-reader.js
distance-matcher.js
overlay.js
content.js
```

Options:

```text
i18n.js
settings.js
distance-terms-core.js
distance-terms-mutations.js
distance-terms-reader.js
distance-terms-options.js
options.js
```

Service Worker:

```text
distance-terms-service-worker.js
  └─ importScripts(
       distance-terms-core.js,
       distance-terms-reader.js,
       distance-terms-mutations.js
     )
```

Manifest V3 classic Service Workerを追加し、permissionは既存の `storage` だけを維持します。`host_permissions` を追加しません。

### 15.5 package

`tools/make_webstore_package.sh` の明示的なpackage itemへ新規6 production moduleをすべて追加します。`package.json` のtest / syntax check明示列挙へ新規production / test fileを追加します。ZIP内容に6 module、Service Worker、既存必須assetが含まれることをtestと実物で確認します。

## 16. テスト責務

### 16.1 基本方針

```text
Pure Domain
    ↓
Storage Reader
    ↓
Mutation Planning
    ↓
Service Worker
    ↓
Options
    ↓
Matcher
    ↓
Content integration
    ↓
Overlay
    ↓
Manifest / Packaging / Docs
    ↓
Real browser
```

同じboundary caseを全layerで重複試験しません。たとえば51 graphemes拒否の詳細はcore test、Service Worker testはdomain errorを正しいfixed codeへ変換するorchestrationを担当します。既存fixed rule / ADR-0002 testを置換または弱めません。

### 16.2 新規6 test files

| test | 主責務 |
| --- | --- |
| `tests/distance-terms-core.test.js` | canonicalization、Unicode境界、Storage schema、6 states、duplicate / conflict |
| `tests/distance-terms-mutations.test.js` | 6 states × 6 operations、raw preservation、`NO_CHANGE`、post-condition、desired-state確認 |
| `tests/distance-terms-reader.test.js` | Storage read、missing / read_error、4公開API、Options reconciliation same-read、data minimization |
| `tests/distance-matcher.test.js` | raw本文normalization、ASCII fold、literal substring、boolean-only |
| `tests/distance-terms-service-worker.test.js` | message / sender / FIFO / latest read / UUID / write / error response |
| `tests/distance-terms-options.test.js` | UI state machine、dialog、focus、IME、Recovery、response loss |

### 16.3 core test

少なくとも次を担当します。

```text
term input
├─ NFKC / trim
├─ 2 / 50 grapheme accept
├─ 1 / 51 reject
├─ emoji / ZWJ / composed characters
├─ 512 code points accept / 513 reject
├─ internal whitespace preservation
├─ outer LF/CR/TAB removal by trim
├─ internal LF/CR/TAB rejection
├─ forbidden controls / bidi / invisible chars
├─ ZWNJ / ZWJ / combining / variation selector allow
├─ Arabic / Hebrew allow
└─ ASCII-case duplicate key

Storage
├─ missing / valid / partial / whole / unsupported / read_error
├─ root null / primitive / array
├─ schemaVersion missing / invalid / future
├─ unknown root fields
├─ strict masterEnabled
├─ items non-array / 30 / 31
├─ malformed items / unknown item fields
├─ UUID v4 / variant
├─ noncanonical stored term
├─ readable-invalid term namespace
├─ duplicate IDs / duplicate terms
└─ all-invalid root remains partial
```

classifierの境界はこのsuiteを正本とします。

### 16.4 mutations test

36 matrix cellすべてについてallowed、conditional allowed、`NO_CHANGE`、error codeをtable-drivenで確認します。

- partial通常mutationでinvalid raw entriesが意味的に不変。
- `deleteInvalidItems` でcurrent invalidだけ削除し、usable itemsのraw内容、ID、term、enabled、相対順序を維持。
- resetが `distanceTermsSettings` だけをexact initial stateへ変更。
- operation固有post-condition failureがwrite不能な `INTEGRITY_CHECK_FAILED`。
- desired-state helperがaddのinvalid-only / conflictをfalse、master / item desired value、delete namespace absence、recovery valid、reset exact initial stateを正しく判定。

### 16.5 reader / matcher test

reader:

- `storage.local.get() → core → consumer projection` のadapter責務。
- 異常resolve値をmissingでなくread errorへ分類。
- Options viewにinvalid raw dataを含めない。
- Content viewを `{ terms: [...] }` だけに限定。
- Mutation snapshotのraw / classificationが同一read由来。
- Options reconciliation snapshotが1回のStorage readから `{ view, classification }` だけを返す。
- Options reconciliation snapshotに `rawValue` とinvalid raw dataを含めず、`view` が通常Options viewと同じprojectionを使用する。
- Options reconciliation snapshotのclassificationがcore由来のrich contractとfreezeを維持する。

matcher:

- raw post text → NFKC → ASCII case-fold → literal substring。
- `"hello"` が `"HELLO"` にmatch。
- 非ASCIIの独自lowercaseを行わない。
- `"A  B"` と `"A B"` を同一視しない。
- 改行、space、symbol、hashtagをliteralに扱う。
- 戻り値が常にbooleanだけ。

### 16.6 Service Worker test

domain境界を再試験せず、次のorchestrationを担当します。

- strict top-level / payload fields、protocolVersion、operation。
- `deleteInvalidItems` のpayloadなし、reset confirmation exact value。
- `sender.id`、exact Options URL、origin if present、`sender.tab` 非依存、unauthorized sender。
- request validation → sender validation → queueの順序。
- FIFO、queue failure isolation。
- Bのlatest readがAのwrite完了後に行われること。
- UUID v4、collision regenerate、最大10回。
- write必要時にexactly one whole-object write。
- `NO_CHANGE` / rejectionでwrite 0回。
- read / write / integrity failure。
- fixed-code-only responseとdata minimization。

### 16.7 Options test

少なくとも次を担当します。

- initial loading、6 Storage views、0 / 1 / many / 30件。
- Master OFF中もmanagement可能、individual OFF表現、raw count表示。
- client validation、IME composition、Enter submit。
- pending disabled、`aria-busy`、status live region。
- focus token / fallback、language update、manual link。
- Delete / Delete invalid / Resetの3 dialog。
- Cancel初期focus、Escape、origin focus復帰。
- mutation中dialog維持、Cancelもdisabled。
- success / failure / incompatible state change後のfocus。
- Recovery generic fallback。
- communication failure → latest read → desired-state check → blind retryなし。

### 16.8 既存testsへの追加責務

| test | v2.0.0追加責務 |
| --- | --- |
| `tests/content.test.js` | fixed-first、matcher short circuit、raw経路、WeakSet、quote / multi-target、failure isolation |
| `tests/overlay.test.js` | distance State 1、共通State 2、focus / a11y、no guidance / no matched data |
| `tests/i18n.test.js` | 新規required keysの日英存在 |
| `tests/manifest.test.js` | Service Worker、load order、permissions、ZIP inclusion |
| `tests/settings.test.js` | 既存3設定write pathがdistanceを扱わない回帰保証 |
| `tests/options.test.js` | 既存3設定UIがdistance追加後も従来どおり動作 |
| `tests/popup.test.js` | 原則変更不要。既存3設定のみの回帰 |
| `tests/docs.test.js` | manual / privacy内容、link、日英整合 |
| `tests/docs-theme.test.js` | manual既存theme機能の回帰 |

Content integrationの必須回帰:

```text
fixed=true + matcher stub throws
→ fixed UI正常
→ matcher call count 0

fixed=false + distance=true
→ distance State 1

fixed=false + distance=false
→ no cushion

fixed detector unavailable + distance=true
→ distance State 1

distance matcher throws
→ no distance cushion
→ scan継続

quote target A=fixed
quote target B=distance
→ 独立処理

"word  word"
→ distance matcherへraw二重space
→ fixed側にはcollapsed text
```

Overlayの必須回帰:

```text
distance State 1
  common title       ✓
  distance body      ✓
  Show / Not now     ✓
  fixed body         ✗
  reason/guidance    ✗
  strength/tendency  ✗
  matched term/ID    ✗

Not now後
  distance body      ✗
  fixed detail       ✗
  ONE ADR-0002 State 2 ✓
```

State 2のfocus、unique ID、`aria-labelledby`、protect link reliability、二重遷移guard、fixed既存testsを維持します。

## 17. 実装file scope

### 17.1 新規production files

```text
distance-terms-core.js
distance-terms-mutations.js
distance-terms-reader.js
distance-matcher.js
distance-terms-options.js
distance-terms-service-worker.js
```

### 17.2 実装PRで必須変更する既存production files

| file | 主変更 |
| --- | --- |
| `manifest.json` | v2.0.0、Service Worker、新Content Script load order |
| `package.json` | v2.0.0、新test / syntax対象 |
| `package-lock.json` | package version同期 |
| `options.html` | distance section、3 dialogs、既存palette準拠style |
| `options.js` | distance controller初期化、localizer連携 |
| `content.js` | page snapshot、matcher、fixed-first統合 |
| `overlay.js` | `createDistanceCushionElement()`、共通State 1 actions |
| `_locales/ja/messages.json` | Options / State 1 / Recovery等の日本語copy |
| `_locales/en/messages.json` | 対応する英語copy |
| `tools/make_webstore_package.sh` | 新規6 moduleのZIP包含 |

### 17.3 実装PRで必須のdocumentation scope

```text
README.md
AGENTS.md
docs/manual.html
docs/en/manual.html
docs/privacy.html
docs/en/privacy.html
```

Manualには、機能の意味、追加方法、2〜50文字、最大30件、Master / item ON/OFF、削除、X reload後反映、fixed ruleとの関係、一致語自体をX上へ表示しないこと、local保存、外部送信なし、Recovery stateの意味を日英で案内します。

### 17.4 原則変更しないfiles

```text
settings.js
popup.html
popup.css
popup.js
risk-detector.js
cushion-guidance.js
i18n.js
```

- `settings.js` へdistance settingsを追加しません。
- Popupへdistance管理UIを追加しません。
- fixed rulesを変更しません。
- ADR-0002 State 2を別moduleへ移設・再設計しません。
- i18n language resolution方式を変更しません。
- 不可避な理由が見つかった場合は、勝手にscopeを広げずレビューへ戻ります。

## 18. Phase 1〜6

```text
Phase 1
Pure Domain
├─ distance-terms-core.js
├─ distance-terms-mutations.js
└─ tests

Phase 2
Storage / Single Writer
├─ distance-terms-reader.js
├─ distance-terms-service-worker.js
├─ manifest Service Worker
└─ tests

Phase 3
Options
├─ distance-terms-options.js
├─ options.html
├─ options.js
├─ locales
└─ tests

Phase 4
Content / Matcher / Overlay
├─ distance-matcher.js
├─ content.js
├─ overlay.js
└─ integration / regression tests

Phase 5
Version / Packaging / Docs
├─ 2.0.0
├─ package scripts
├─ ZIP script
├─ README / AGENTS
├─ manual
└─ privacy

Phase 6
Full verification
├─ npm run check
├─ ZIP contents
├─ Chrome unpacked extension
├─ JA / EN
├─ light / dark
├─ keyboard / focus / IME
├─ 0 / 30 / recovery
├─ fixed / distance / both / none
└─ privacy / network確認
```

各phaseで前段のcontractをtestで固定してから次へ進みます。UIを先に作ってStorage contractを後付けしません。

## 19. 実ブラウザ確認

自動testに加え、unpacked extensionで次を確認します。

Options:

- 日本語 / English。
- 0件、1件、30件。
- Master ON / OFF、individual ON / OFF。
- Add、Delete、partial recovery、whole-invalid reset、read-error相当。
- keyboard only、IME、focus return、dialog Escape。
- narrow width、zoom、light / dark、dialog backdrop、focus-visible。

X:

- fixed-only、distance-only、両方該当、neither。
- quote / multiple targets。
- Show content。
- Not now → 同一ADR-0002 State 2。
- Options変更がX reload後に反映。
- 次の4 theme組み合わせ。

```text
OS light + X light
OS light + X dark
OS dark  + X dark
OS dark  + X light
```

DevTools等で、投稿本文・登録語・matched term・結果を外部送信していないこと、analytics / telemetryがないこと、不要permissionと `host_permissions` がないことも確認します。

## 20. 明示的禁止事項

### 20.1 実装上の禁止

- ADR-0001を実装都合で変更する。
- distance featureの障害でfixed ruleを停止する。
- fixed / distanceのState 1を意味的に混ぜる。
- ADR-0002 State 2を複製する。
- matched term、ID、count、position、score、reason等をContent result、DOM、Overlay、runtime responseへ追加する。
- Options / Contentから `distanceTermsSettings` をwriteする。
- read時にrepair、補完、coercion、writebackする。
- response loss時にblind retryする。
- future schemaまたはread errorにresetを提供する。
- invalid dataからwinnerを推測する。
- existing 3 settingsをSingle Writerへ移行する。
- ESM、bundler、TypeScript、大規模restructureを同時導入する。
- permission、host permission、external connection、analytics、telemetry、external APIを追加する。

### 20.2 今回の文書作業の禁止

本書とADR-0001の文書化作業では、次を行いません。

- v2.0.0機能実装またはJavaScript変更。
- test追加・変更。
- `manifest.json`、version、`package.json`、`package-lock.json` の変更。
- README、AGENTS、manual、privacyの変更。
- GitHub Pages、Chrome Web Store、release、deploy作業。
- commit、push、Pull Request作成、merge。

この文書作業の完了時点でも、Implementation statusは `Not implemented` / `未実装` のままです。
