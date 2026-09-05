# ADR-0002 「今は見ない」後のセルフケア・距離の取り方支援

- Status: Accepted
- Date: 2026-09-04
- Implementation status: Not implemented
- 実装状況: 未実装

`Accepted` は、このADRに記録した設計判断が採用されたことを意味します。v1.1.0へ実装済みであることは意味しません。以下のUI、状態遷移、文言は概念設計です。実装ファイル名、具体的なARIA属性、CSS、最終i18n文言は将来の実装・レビューで確定します。

## Context

現行の「今は見ない」は、投稿本文のぼかしを維持し、UIを簡潔な折りたたみ状態へ変更します。後から「内容を表示する」で読め、投稿本文・投稿DOMは削除しません。

今回の改善では、「今は見ない」を選んだユーザー様に対して、今はそのまま読まなくてもよいこと、あとで読むこともできること、そのまま画面を閉じてもよいこと、必要であればX公式のミュート・ブロック等で距離を取る方法もあることを、短く案内します。

## Decision

「今は見ない」というユーザー様の選択を尊重し、そのまま読まずに離れる自由を最初に伝えます。必要な場合にはXの既存機能で距離を取る選択肢があることを穏やかに案内しますが、特定の行動を推奨・自動化せず、情報量や警告表現を増やしすぎません。

読むことが正解ではなく、読まないことも正解になり得ます。あとで読む自由、何もしない自由、Xのミュート・ブロックを使わない自由を残し、行動を迫りません。

### 表示タイミング

- 「今は見ない」を押した後だけ表示する。
- 初期ワンクッションUIには追加しない。
- 初期UIの情報量を増やさない。
- 「内容を表示する」を選んだ場合、この支援表示を介在させない。
- 初期段階でミュート・ブロックを強調しない。

### UIの基本方針

- 投稿本文のぼかしと既存の「内容を表示する」導線を維持する。
- 投稿本文・投稿DOMを削除しない。
- 新規の大型modalを作らない。
- CTAを増やしすぎない。ミュートボタン、ブロックボタン、「画面を閉じる」buttonを追加しない。
- 自動ミュート、自動ブロックを行わない。
- 赤色warning、危険アイコン、警告ゲージ、点滅、強いanimationを追加しない。
- mobileでも自然に折り返せるようにし、固定改行に依存しすぎない。

### 情報提示の順序

次の順序で伝えます。

1. 今は読まない状態にしたこと。
2. あとから内容を表示できること。
3. このまま内容を見ずに画面を閉じることもできること。
4. 必要ならXのミュート・ブロック等で相手と距離を取る方法もあること。

「画面を閉じて離れる」をミュート・ブロックより先に伝えます。ユーザー様に「何か対処しなければならない」という圧を与えないためです。

### 日本語UI候補

```text
今は読まないようにしました。
読みたくなったら、あとから内容を表示できます。

このまま内容を見ずに、画面を閉じることもできます。
必要なら、Xのミュートやブロックなどを使って、
相手のアカウントと距離を取る方法もあります。

[内容を表示する]
```

上記は最終文言ではありません。実装時に日本語UIレビューと英語i18nレビューを行って確定します。英語は単純な直訳ではなく、非断定的で自然な表現にします。

### ミュート・ブロックの位置づけ

ミュート・ブロックは選択肢として紹介するだけです。

- 「ミュートしてください」と指示しない。
- 「ブロックすべき」と指示しない。
- muteとblockの優先順位を決めず、「まずミュート、次にブロック」の手順化をしない。
- 投稿者を危険人物とみなさず、悪意を推定せず、加害者認定しない。
- ユーザー様が使わない自由を残す。
- Extensionが実行せず、X公式機能を置き換えない。

## UI state and conceptual design

### 状態遷移

```text
                 ワンクッション表示
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       内容を表示する             今は見ない
              │                     │
              ▼                     ▼
       投稿本文を表示         ぼかしを維持
       cushion UI終了               │
                                    ▼
                         セルフケア支援表示
                                    │
                    ┌───────────────┴──────────────┐
                    │                              │
                    ▼                              ▼
             内容を表示する                 何も操作しない
                    │                              │
                    ▼                              ▼
             投稿本文を表示                 そのまま離れる
                                            画面を閉じる
                                            必要ならX公式機能を利用

内容を表示する → OK
今は見ない → OK
その後何もしない → OK
画面を閉じる → OK
必要なら距離を取る → OK
強制される分岐はない

Conceptual design / Not implemented / Implementation details may change
```

### 現段階のUIイメージ

```text
┌────────────────────────────────────────────┐
│ 今は読まないようにしました。                │
│ 読みたくなったら、あとから内容を表示できます。│
│                                            │
│ このまま内容を見ずに、画面を閉じることも     │
│ できます。                                 │
│                                            │
│ 必要なら、Xのミュートやブロックなどを使って、 │
│ 相手のアカウントと距離を取る方法もあります。 │
│                                            │
│ [内容を表示する]                           │
└────────────────────────────────────────────┘

Conceptual UI / Not implemented
```

投稿本文はぼかしたままにします。mute/block実行buttonや「画面を閉じる」buttonは追加せず、閉じることは情報として伝えるだけにします。red warning、danger icon、modalは使いません。

### 固定ルール・ADR-0001との関係

将来、fixed-rule cushionとdistance-term-only cushionのどちらがワンクッションを表示した場合でも、この「今は見ない」後の支援を共通利用できる方向とします。

ただし、支援UIはどの判定経路で表示されたかを、ユーザー様への評価情報として追加しません。fixed score、matched rule、distance matched term、term ID、tendency、reasonを支援UIへ混ぜません。

## Information boundary

### 小さいUIへ載せない情報

次の情報は、この小さな折りたたみ後UIへ詰め込みません。

- 通報を強く促す案内
- 証拠保存の詳細、スクリーンショット保存手順
- 法律評価、違法・犯罪等の断定、警察相談の一律な推奨
- 医療・心理相談の一律な推奨、多数の相談窓口
- 投稿者危険度、score、matchedRules、categories、reasons、緊急度判定
- 「今すぐ対応してください」等の強い表現

「今は見ない」を選んだ直後に情報や選択肢を詰め込みすぎると、不安・判断負荷を増やし、本来の「距離を置く」選択をかえって難しくする可能性があります。

### protect-your-heartとの役割分担

既存の [design/protect-your-heart-guide.md](../protect-your-heart-guide.md)、`docs/protect-your-heart.html`、`docs/en/protect-your-heart.html` は、より広い一般情報ページに関する設計です。既存設計では、ミュート・ブロック・DM設定・報告等を一本道の手順として強制せず、ユーザー様が自分の状況に合わせて選べる選択肢として扱っています。

ADR-0002は、Extension内の「今は見ない」直後に表示する短いUIの設計境界を記録します。protect-your-heart-guideは、より広い一般情報ページの設計意図を記録します。内容を大量に重複させず、必要に応じて相互参照し、この思想と整合させます。

```text
┌───────────────────────────────┐
│ Extension cushion UI          │
│                               │
│ 短いセルフケア支援            │
│ ・今は読まなくてよい          │
│ ・あとから読める              │
│ ・そのまま離れてよい          │
│ ・必要ならX機能で距離を取れる │
└───────────────┬───────────────┘
                │ more general information
                ▼
┌───────────────────────────────┐
│ protect-your-heart page       │
│                               │
│ より広い一般情報・選択肢      │
│ 個別判断を代行しない          │
└───────────────────────────────┘

Conceptual design / Not implemented
```

## Privacy and accessibility

### Privacy

この改善のために新しいtrackingを追加しません。

- 「今は見ない」を押した履歴や回数を外部送信・保存しない。
- どの投稿で押したかを保存しない。
- mute/blockしたかを追跡しない。
- 投稿本文、URL、X user情報を保存しない。
- analytics、telemetry、external APIを追加しない。

### Accessibility and UX

- 色だけで意味を伝えない。
- keyboard操作とfocus表示を維持する。
- screen readerで自然な読み順にする。
- mobileで「内容を表示する」が見切れないようにする。
- 過度に長い文章にせず、CTAを大量に並べない。

具体的なARIA属性、CSS、padding、height、spacingは実装詳細であり、Open Questionsに残します。

## Alternatives considered

### 現行の最小折りたたみだけを維持する案

最もシンプルです。しかし「そのまま離れてもよい」「必要なら距離を取れる」という支援が不足します。短い追加情報を採用します。

### 初期ワンクッションからmute/blockを表示する案

初期情報量が増え、読む前から行動圧を与える可能性があります。採用しません。

### mute/block/report等の実行buttonを追加する案

行動自動化・誘導に近づき、ユーザー様の選択余地を狭めます。採用しません。

### 法的・相談・証拠保存情報を一度に表示する案

判断負荷が大きくなります。採用しません。

### 「今は見ない」後にスクリーンショット等を自動保存・生成する案

ぼかし状態との関係、originality/authenticityの誤認、legal evidenceであるかの誤解、実装複雑性、センシティブデータ保存の拡大といった問題があります。本機能の中核では採用しません。

### 本文を一時的に再表示してスクリーンショットを生成する案

「今は見ない」というユーザー様の選択と矛盾し、本文へ再接触する可能性があります。採用しません。

## Consequences

### 得られること

- 「今は見ない」という選択をより支えられる。
- そのまま離れる自由を明示できる。
- 必要な場合のみ、X公式機能を知るきっかけになる。
- 自動化せず、ユーザー様の選択権を維持できる。

### 受け入れるコスト

- 折りたたみ後UIの文章量が少し増える。
- mobileでのレイアウト確認が必要になる。
- 最終i18n文言レビューが必要になる。

## Out of scope

- automatic mute、automatic block、automatic report、automatic X operation
- post delete
- author evaluation、account danger score
- evidence authenticity guarantee、legal evidence creation、legal judgment
- medical judgment、psychological diagnosis、emergency severity judgment
- automatic support-desk selection
- screenshot auto-save
- post body history、URL history

## Open Questions

以下はAcceptedな設計判断ではなく、Open Questions / implementation detailです。

- 最終日本語文言
- 最終英語文言
- padding / height / spacing等の具体UI
- mobileレイアウト詳細
- ARIA具体実装
- `overlay.js` 等での具体関数構成
- 完全なテストケース一覧
- 小さな折りたたみUI自体にprotect-your-heartページへのリンクを追加するか

現時点では、折りたたみUIを短く保つため、protect-your-heartへのリンクを追加しない方向が第一候補です。ただし、これはAccepted事項として固定せず、Open Questionとして扱います。

## 2026-09-06 詳細設計でのOpen Questions解決記録

この節は、2026-09-04にAcceptedとした設計判断の履歴を変更せず、後続の詳細設計で解決・具体化した事項を記録するものである。上記のOpen Questionsは、Accepted時点で未確定だった履歴として残す。本節の記録によっても、Status、Date、Implementation status、実装状況は変更しない。以下は実装済みの記録ではなく、以後の実装・レビューで従う詳細設計である。

### 最終UI文言

State 2の日本語UI文言は、次で確定した。

```text
今は読まないようにしました。
読みたくなったら、あとから内容を表示できます。

このまま内容を見ずに、この投稿から離れることもできます。

必要なら、Xのミュートやブロックなどを使って、そのアカウントと距離を取る方法もあります。

心を守る使い方を見る

[内容を表示する]
```

- 旧候補の「画面を閉じる」は「この投稿から離れる」へ変更する。「画面」では対象が曖昧になり得るため、利用者が現在見ている投稿からそのまま離れてよいことを明確にする。
- 旧候補の「相手のアカウント」は「そのアカウント」へ変更する。投稿者が利用者と直接やり取りしている「相手」とは限らないためである。
- 「内容を表示する」は既存buttonを維持する。
- 「心を守る使い方を見る」はbuttonではなく、穏やかな補助text linkとする。

State 2の英語UI文言は、単純な日本語直訳ではなく、非断定的で自然な次の表現で確定した。

```text
You chose not to read this for now.
You can show the content later if you want to read it.

You can also leave this post without viewing the content.

If needed, you can use features on X, such as mute or block, to give yourself some distance from that account.

Learn more about protecting your peace of mind

[Show content]
```

- `leave this post` は、投稿をそのままにして、その投稿から離れる／先へ進む趣旨とする。
- `protecting your peace of mind` は、既存英語版protect-your-heartページの表現と整合させる。
- 既存英語UIの `You chose not to read this for now.`、`You can show the content later if you want to read it.`、`Show content` は可能な限り維持・再利用する。

### State 2の状態遷移とDOM境界

「今は見ない」選択後をState 2として扱う。

- State 1は初期ワンクッションUIとする。
- State 1で「内容を表示する」を選んだ場合は、投稿本文を表示してcushion UIを終了する。State 2は経由しない。
- State 1で「今は見ない」を選んだ場合は、投稿本文のblurを維持し、同じcushion section内部の内容をState 2へ差し替える。
- State 2では、今は読まない状態にしたこと、あとから内容を表示できること、内容を見ずにこの投稿から離れてよいこと、必要ならXのmute/block等でそのアカウントと距離を取れること、protect-your-heartへの補助text link、および「内容を表示する」buttonを表示する。

State 2への移行時には、State 1固有の初期cushion title、初期説明、reason、expression strength、tendency、pre-reading guidance、guidance noteおよび「今は見ない」buttonを除去する。利用者はすでに「今は見ない」を選んでいるため、読前の評価情報を残すと認知負荷や判断圧を増やす可能性があるためである。

新しいmodal、別overlay、別cushionは作らない。投稿本文・投稿DOMも削除しない。protect-your-heartを別タブで開いた場合も、X側ではState 2と投稿本文のblurを維持する。今回のためにState 2の永続化、履歴、Storage保存は追加しない。

### protect-your-heart補助リンク

State 2にはprotect-your-heartページへの補助リンクを1つ追加する。表示順は、説明文、補助リンク、「内容を表示する」buttonの順とする。リンクとbuttonを横並びの同格CTAにせず、リンクはbuttonではない穏やかな補助text linkとする。

| 解決済み事項 | 設計 |
| --- | --- |
| 日本語label | 心を守る使い方を見る |
| 英語label | Learn more about protecting your peace of mind |
| 開き方 | 新しいタブ。native `a` elementによるブラウザ標準navigationを利用する。 |
| 日本語URL | `https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/protect-your-heart.html` |
| 英語URL | `https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/en/protect-your-heart.html` |

リンク先は、cushion UIで実際に使用されているresolved languageと一致させる。`uiLanguage=auto`の場合も、`auto`という設定値ではなく、すでに解決された実際の表示言語である`ja`または`en`を使用する。URLは利用者入力や動的文字列連結から生成せず、アプリ側の固定された信頼済みURL allowlistとして扱う。

`ja`／`en`以外、または安全にresolved languageを保証できない異常・縮退状態ではURLを推測しない。これには、locale messageの読み込み失敗等によりresolved language自体が`ja`または`en`として取得できていても、実際にState 2へ表示されるUI文言がChrome側のfallback locale等へ切り替わり、実表示言語とresolved languageの一致を安全に保証できない状態を含む。その場合はprotect-your-heartリンクだけを表示せず、State 2本文と「内容を表示する」は引き続き利用可能とし、localization failureによってExtension本体を停止させない。具体的に実装上どのfailureを識別するかは、実装時に定める。

protect-your-heartページは補助情報へのリンク先であり、Extension本体のruntime依存先ではない。State 2生成時のfetch、URL存在確認、health check、ページ応答待ち、取得成功を条件としたState 2表示、ページ障害検知のための追加通信、analytics、telemetryは行わない。ページが一時的に停止・障害状態でも、初期ワンクッション、「今は見ない」、State 2表示、blur維持、「内容を表示する」、投稿本文revealは正常に利用できる設計とする。リンククリック後のnavigationはブラウザ標準動作へ任せる。これは障害分離だけでなく、不要な外部通信を発生させないPrivacy上の目的を持つ。

### レイアウトと改行

State 2は大きなカード群や複数boxへ分割せず、情報を自然な文章グループとして表示する。概念上のグループは次の3つとする。

- A: 「今は読まないようにしました。」および「読みたくなったら、あとから内容を表示できます。」
- B: 「このまま内容を見ずに、この投稿から離れることもできます。」
- C: 「必要なら、Xのミュートやブロックなどを使って、そのアカウントと距離を取る方法もあります。」

外側paddingは`12px 14px`を第一候補とし、font-sizeは既存の`14px`、line-heightは既存の`1.6`を基本維持する。A内部は近接させ、A→B、B→Cなど意味グループ間は`8〜10px`程度を目安とする。補助リンクの前後にも自然な余白を設け、「内容を表示する」buttonの既存サイズ感を基本維持する。

fixed width、fixed heightは使用しない。mobile専用で文字を小さくせず、PC/mobileで情報順も変更しない。内容量に応じてcushionが自然に縦へ伸び、light/darkとも既存の穏やかなデザインを維持する。red warning、danger icon、warning gauge、blinking、強いanimationは追加しない。

文章は段落単位で構造化し、文中の表示位置を固定する目的の`br`などの固定改行は入れない。Xの表示幅や投稿種別、PC/mobile、日本語と英語の文章長、browser zoomや文字拡大へ対応するため、行折り返しはブラウザに任せる。`8px`か`10px`かなど数px単位の最終spacingは、実ブラウザ確認後に必要最小限の微調整を許容する。

### Accessibility

以下をState 2の確定方針とする。

- State 2切替時、削除される「今は見ない」buttonにfocusを残さない。
- State 2へ切り替えた後は、State 2のcushion側へprogrammatic focusを移す方向とする。cushion自体を通常Tab順へ追加することは避ける。
- State 2の「今は読まないようにしました。」（英語では対応する確定文言）をcushionのaccessible nameへ関連付ける方向とする。
- DOM順、visual order、screen readerの読み順を一致させる。
- protect-your-heartはnative `a` element、「内容を表示する」はnative `button type="button"`とする。Tab順はprotect-your-heart linkから「内容を表示する」buttonとする。
- positive `tabindex`は使用しない。link/button双方に分かりやすい`focus-visible`表示を持たせ、色だけで意味を伝えない。
- `role="alert"`と`aria-live="assertive"`は使用せず、原則として強いlive regionを追加しない。
- 別タブで開くことが支援技術利用者にも分かるようにする。

「別タブで開く」を伝える具体的なHTML/ARIA構造と、State 2から「内容を表示する」を押してcushionが削除された直後の最終focus挙動は、実装・実ブラウザ確認時に最終確定する。後者では、X本体へ安易に`tabindex`等を追加して操作モデルへ干渉せず、必要な場合のみ最小限の調整を行う。

### 実装責務と将来の共通利用

実装時の主実装は`overlay.js`とする。`overlay.js`はState 2 DOM、State 2表示切替、protect-your-heart link、URL選択、focus、ARIA、State 2 CSSおよびnative link/button UIを担当する。既存の`renderDismissedCushionElement()`をState 2 renderer / orchestratorとして再利用・拡張し、既存の`createButton()`も再利用する方向とする。今回の規模だけを理由に`after-not-now.js`等のmoduleを新設せず、独立したルールを持つ場合だけ、たとえば`createProtectYourHeartLink(...)`や`resolveProtectYourHeartUrl(...)`のようなhelperを設ける。単純なparagraph生成を1文ごとに過剰にhelper分割しない。

`content.js`は投稿本文のblur/reveal責務を現状維持し、protect-your-heart専用click handlerを新設しない。既に解決済みのresolvedLanguageをlocalization情報としてoverlayへ渡せるよう、実装時に必要最小限の変更だけを行う。`i18n.js`は既存の`resolveUiLanguage`等を再利用し、protect-your-heart専用の新しい言語判定ロジックを原則作らない。新しい日英文言の正本はそれぞれ`_locales/ja/messages.json`と`_locales/en/messages.json`とする。リンクには`window.open()`を使用せず、native `a` elementを用いる。CSSも現行の`CUSHION_STYLES`方式を維持し、今回だけを理由に新しいCSS fileへ分割しない。

`risk-detector.js`、`cushion-guidance.js`、`settings.js`、Storage設計、fixed-rule判定、sensitivityおよび原則`manifest.json`は変更対象としない。

将来、ADR-0001の「距離を置きたい言葉」によるdistance-term-only cushionが追加された場合も、今回のState 2支援を共通利用できる構造を維持する。ただし、State 2は判定根拠の説明ではなく「今は見ない」という選択後の支援に限定する。fixed/distanceの表示経路、fixed score、matched rule、distance matched term、term ID、tendency、reason、category、matched count等は表示しない。

### Privacy

今回の改善により、「今は見ない」履歴、click count、投稿単位の履歴、URL、投稿本文、X user情報、mute/block使用状況のtracking、analytics、telemetry、external API、protect-your-heartページへの自動アクセスは追加しない。投稿本文や内部判定情報をState 2へ表示せず、投稿者・アカウントを危険人物として評価しない。mute/blockは選択肢として穏やかに案内するだけで、推奨・自動化しない。

### 実装時の検証方針

実装時は、自動テスト、既存回帰、実ブラウザ確認の3層で検証する。`tests/overlay.test.js`を中心に、同じcushionがState 2へ切り替わり新規modalや別cushionを生成しないこと、`onHide`が意図どおり呼ばれること、State 1のtitle/body/reason/strength/tendency/guidance note/「今は見ない」buttonが残らないことを確認する。

State 2については、日本語・英語の確定文言、DOM順、「内容を表示する」buttonを確認する。protect-your-heartについては、native `a`、日本語／英語の固定URL、`target="_blank"`、`rel="noopener noreferrer"`、正しい日英label、buttonより前のDOM順、不明または安全に保証できない言語でのlink省略、locale messageの読み込み失敗等により実表示言語との一致を安全に保証できない場合にもリンクだけが省略され、State 2本文とshow buttonが利用でき、Extension本体が正常動作を継続することを確認する。

AccessibilityではState 2側へfocusを移しshow buttonへ直接focusしないこと、accessible nameとの関連、link→buttonのDOM/Tab順、native `a`/`button`、`role="alert"`と`aria-live="assertive"`を使わないこと、`focus-visible` styleを確認する。Security / information boundaryでは、投稿本文、score、matchedRules、categories、reasons、internal guidance keyをState 2へ表示しないことを確認する。`content.js`ではresolvedLanguageの`ja`／`en`をlocalization経由で安全に利用でき、従来の`getMessage()`が壊れず、localization failureでもExtension本体を壊さないことを確認する。State 2生成時にfetch・URL疎通確認をせず、外部ページ応答をState 2表示条件にしないことも確認する。

既存回帰では、初期ワンクッション、初期「内容を表示する」、fixed-rule guidance、「今は見ない」後のblur維持、State 2からのreveal、投稿本文・投稿DOMを削除しないこと、JA/EN、Extension OFF、sensitivity、Storageを確認する。最低限`npm run check`および`git diff --check`を実行する。

実ブラウザでは、青木が日本語／英語UI、初期cushion、「今は見ない」からState 2への切替、blur維持、文言の自然さ、情報量と視線の流れ、補助リンクとshow buttonの優先度、正しい言語ページが別タブで開くこと、Xへ戻った後のState 2維持、show content、keyboard操作、focus移動、PC幅、mobile相当幅、light/dark、browser zoom／文字拡大、横スクロール・見切れ・fixed height由来の欠け、console errorを確認する。あわせて、初期cushion表示に目立つ遅延がないこと、State 2切替の自然さ、操作時の引っ掛かり、通常タイムラインのスクロール、複数投稿表示時の体感性能、補助リンクがX本体の操作感へ悪影響を与えないことを確認する。必要が確認された場合だけspacing数pxやfocus等を最小限調整する。

### Open Questionsの解決状況

2026-09-04時点のOpen Questionsに対する現在の整理は次のとおりである。

| 区分 | 内容 |
| --- | --- |
| 解決済み | 最終日本語文言、最終英語文言、padding / height / spacing等の基本方針、mobileレイアウト基本方針、`overlay.js`等の関数責務・構成方針、テストケース基本方針、protect-your-heartリンクを追加すること。 |
| 大枠解決・実装詳細のみ残る | Accessibility方針とARIAの方向性は確定した。別タブで開くことの具体的な伝達方法、show content後のfocus挙動は実装時・実ブラウザ確認時に確定し、必要な場合だけ最小調整する。 |
| 実ブラウザ微調整として残る | `8px`／`10px`等の数px単位のspacing、実際のX DOM上でのfocus感、表示幅・mobile・文字拡大での微調整、画面表示・操作感・体感速度。 |

残る事項は設計思想そのものを再検討するBlocking Issueではなく、実装・実ブラウザ確認フェーズの詳細である。コード実装、およびコード実装に伴うcommit、push、Pull Request、merge、releaseは、このADR更新のレビュー・承認後の別工程で扱う。
