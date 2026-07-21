# Chrome Web Store 掲載文案ドラフト

Google Chrome拡張機能「ことばうけみまもり｜Xことばに心のワンクッション」を、Chrome Web Storeへ正式版として提出するための掲載文案ドラフトです。

## 日本語

### 拡張機能名

ことばうけみまもり｜Xことばに心のワンクッション

### 短い説明

Xで届く強い言葉に、読む前のワンクッションを。投稿本文や判定結果は外部送信しません。

### 詳細説明

ことばうけみまもり｜Xことばに心のワンクッションは、X（旧Twitter）上で届く強い言葉や、心に負荷がかかる可能性のある投稿に対して、読む前にワンクッションを置くChrome拡張機能です。

いきなり読ませない。
でも、読む自由も残す。

心に負荷がかかる可能性のある投稿では、投稿本文をぼかし、次の選択肢を表示します。

- 内容を表示する
- 今は見ない

「内容を表示する」を選ぶと、ぼかしが解除され、投稿本文を確認できます。
「今は見ない」を選ぶと、本文ぼかしを維持したまま折りたたまれ、あとから読みたくなったときに内容を表示できます。

### 主な機能

- X上の投稿に、読む前のワンクッションを表示
- 引用ポスト内の引用元本文にも対応
- 投稿本文のみをぼかし表示
- 「内容を表示する / 今は見ない」を選択可能
- ポップアップからON/OFFを切り替え
- ポップアップと設定画面の表示言語を「自動 / 日本語 / English」から選択
- ワンクッションの表示されやすさを「少なめ / 標準 / 多め」から選択
- 設定はブラウザ内に保存

### プライバシー説明

- 投稿本文を外部サーバーへ送信しません
- 判定結果を外部サーバーへ送信しません
- 投稿本文や判定結果を保存しません
- 閲覧履歴、投稿URL、ユーザー名、アカウントIDを保存しません
- 保存するのは、ON/OFF、表示言語、表示されやすさの設定のみです

### 権限説明

この拡張機能は、設定を保存するために storage 権限を使用します。保存する設定は、拡張機能のON/OFF状態、popupと設定画面の表示言語、ワンクッションの表示されやすさのみです。投稿本文、判定結果、閲覧履歴、投稿URL、ユーザー名、アカウントIDは保存しません。

### 本拡張機能が行わないこと

- 投稿者を評価しません
- アカウントの危険度を判定しません
- 自動ブロックを行いません
- 自動通報を行いません
- 投稿を削除しません
- X公式機能を置き換えるものではありません

### 注意事項

判定はブラウザ内の固定的なルールベースで行います。
この判定は完全ではなく、必要な場面で表示されないことや、問題のない投稿に表示されることがあります。

本拡張機能は、投稿者を裁くためのものではありません。
読む側が、今読むか、今は読まないかを選べるようにするための補助ツールです。

### 審査向け補足説明

- この拡張機能は、X上の投稿本文に対して、ブラウザ内の固定的なルールベース判定を行います。
- 投稿本文や判定結果を外部サーバーへ送信しません。
- 外部AIサーバーによる判定は行いません。
- 投稿本文や判定結果を保存しません。
- 保存する設定値は `enabled`、`cushionSensitivity`、`uiLanguage` のみです。
- 投稿本文ノードにぼかしとワンクッションUIを追加します。
- 投稿本文や投稿DOMを削除しません。
- 自動ブロック、自動通報、アカウント危険度判定は行いません。
- 使用権限は `storage` のみです。
- `host_permissions` は使用していません。

## English

### Extension name

Kotoba Uke Mimamori

### Short description

Add a gentle cushion before reading emotionally heavy wording on X. Post text and detection results are not sent externally.

### Detailed description

Kotoba Uke Mimamori is a Chrome extension that adds a gentle cushion before reading posts on X that may include emotionally heavy wording.

It does not force you to read immediately.
It also leaves you the freedom to read.

When a post may include wording that feels emotionally heavy, the extension blurs the post text and shows two choices:

- Show content
- Not now

If you choose “Show content,” the blur is removed and you can read the post.
If you choose “Not now,” the post remains blurred and the cushion is collapsed. You can still show the content later if you want to read it.

### Main features

- Shows a gentle cushion before reading posts on X
- Also supports quoted post text inside quote posts
- Blurs only the post text
- Lets you choose “Show content” or “Not now”
- Lets you turn the extension ON/OFF from the popup
- Lets you choose cushion sensitivity: Low, Standard, or High
- Saves settings locally in your browser

### Privacy

- Post text is not sent to external servers
- Detection results are not sent to external servers
- Post text and detection results are not saved
- Browsing history, post URLs, usernames, and account IDs are not saved
- Only the ON/OFF setting and cushion sensitivity setting are saved

### Permission explanation

This extension uses the storage permission to save settings. The saved settings are only the ON/OFF state and cushion sensitivity. Post text, detection results, browsing history, post URLs, usernames, and account IDs are not saved.

### What this extension does not do

- It does not evaluate posters
- It does not judge account risk
- It does not automatically block users or posts
- It does not automatically report users or posts
- It does not delete posts
- It does not replace X’s official features

### Notes

Detection is performed using fixed rule-based checks inside your browser.
This detection is not perfect. A cushion may appear for posts that are not harmful, and some posts may not show a cushion even when they feel difficult to read.

This extension is not for judging posters.
It is a helper tool that gives the reader a choice to read now or not read for now.

### Review notes

- This extension performs fixed rule-based checks inside the browser for post text on X.
- Post text and detection results are not sent to external servers.
- It does not use external AI servers for detection.
- Post text and detection results are not saved.
- The only saved settings are `enabled`, `cushionSensitivity`, and `uiLanguage`.
- The extension adds a blur effect and a gentle cushion UI to the post text node.
- It does not delete post text or remove post DOM.
- It does not automatically block, report, or judge account risk.
- The only permission used is `storage`.
- `host_permissions` are not used.

## スクリーンショット候補

Chrome Web Store掲載では、公開前の手動読み込み手順画像は基本的に使わない方針です。一般ユーザー向けの導入手順ではなく、開発版・確認版の手順に見えやすいためです。

候補画像:

- `docs/assets/img/manual/017_manual-cushion-ja-bigsize.png`
  - ワンクッションUIの価値が伝わる画像
- `docs/assets/img/manual/010_manual-collapsed-ja.png`
  - 「今は見ない」後もあとから表示できることが伝わる画像
- `docs/assets/img/manual/007_manual-popup-ja-on.jpeg`
  - popupでON/OFF・感度設定できることが自然に伝わる画像
- `docs/assets/img/manual/008_manual-popup-ja-on-more.png`
  - 「表示されやすさ」を選べることが伝わる画像
- `docs/assets/img/manual/014_manual-cushion-en.png`
  - 英語UI対応を見せる画像
