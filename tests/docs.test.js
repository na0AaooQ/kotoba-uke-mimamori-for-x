'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DOCS_BASE_URL = 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x';
const SERVICE_PDF_PATH = 'assets/pdf/kotoba-uke-mimamori-introduction.pdf';
const STORE_LISTING_DRAFT_PATH = 'store-listing-draft.md';
const MANUAL_MODAL_SCRIPT_PATH = 'assets/js/manual-image-modal.js';
const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/ofmmdbihaocmkboehlejndjagahcfpfm?utm_source=item-share-cb';
const GITHUB_REPOSITORY_URL = 'https://github.com/na0AaooQ/kotoba-uke-mimamori-for-x';
const JA_MANUAL_IMAGES = Object.freeze([
  './assets/img/manual/005_manual-popup-ja-off.jpeg',
  './assets/img/manual/006_manual-popup-ja-off.jpeg',
  './assets/img/manual/007_manual-popup-ja-on.jpeg',
  './assets/img/manual/008_manual-popup-ja-on-more.png',
  './assets/img/manual/009_manual-cushion-ja.png',
  './assets/img/manual/010_manual-collapsed-ja.png',
  './assets/img/manual/011_manual-show-content-ja.png',
  './assets/img/manual/017_manual-cushion-ja-bigsize.png',
  './assets/img/manual/018_manual-cushion-ja-bigsize.png',
  './assets/img/manual/019_manual-add-extensions-ja.png',
  './assets/img/manual/020_manual-add-extensions-ja.png',
  './assets/img/manual/021_manual-add-extensions-ja.png',
  './assets/img/manual/022_manual-add-extensions-ja.png',
  './assets/img/manual/023_manual-add-extensions-ja.png',
  './assets/img/manual/024_manual-add-extensions-ja.png',
  './assets/img/manual/025_manual-add-extensions-ja.png',
  './assets/img/manual/026_manual-add-extensions-ja.png',
  './assets/img/manual/027_manual-add-extensions-ja.png',
  './assets/img/manual/028_manual-add-extensions-ja.png'
]);
const EN_MANUAL_IMAGES = Object.freeze([
  '../assets/img/manual/012_manual-popup-en-off.jpeg',
  '../assets/img/manual/013_manual-popup-en-on.jpeg',
  '../assets/img/manual/014_manual-cushion-en.png',
  '../assets/img/manual/015_manual-collapsed-en.png',
  '../assets/img/manual/016_manual-show-content-en.png',
  '../assets/img/manual/019_manual-add-extensions-ja.png',
  '../assets/img/manual/020_manual-add-extensions-ja.png',
  '../assets/img/manual/021_manual-add-extensions-ja.png',
  '../assets/img/manual/022_manual-add-extensions-ja.png',
  '../assets/img/manual/023_manual-add-extensions-ja.png',
  '../assets/img/manual/024_manual-add-extensions-ja.png',
  '../assets/img/manual/025_manual-add-extensions-ja.png',
  '../assets/img/manual/026_manual-add-extensions-ja.png',
  '../assets/img/manual/027_manual-add-extensions-ja.png',
  '../assets/img/manual/028_manual-add-extensions-ja.png'
]);
const MANUAL_ASSET_FILES = Object.freeze([
  'assets/img/manual/001_manual-load-extension.jpeg',
  'assets/img/manual/002_manual-load-extension.png',
  'assets/img/manual/003_manual-load-extension.png',
  'assets/img/manual/004_manual-load-extension.png',
  'assets/img/manual/005_manual-popup-ja-off.jpeg',
  'assets/img/manual/006_manual-popup-ja-off.jpeg',
  'assets/img/manual/007_manual-popup-ja-on.jpeg',
  'assets/img/manual/008_manual-popup-ja-on-more.png',
  'assets/img/manual/009_manual-cushion-ja.png',
  'assets/img/manual/010_manual-collapsed-ja.png',
  'assets/img/manual/011_manual-show-content-ja.png',
  'assets/img/manual/012_manual-popup-en-off.jpeg',
  'assets/img/manual/013_manual-popup-en-on.jpeg',
  'assets/img/manual/014_manual-cushion-en.png',
  'assets/img/manual/015_manual-collapsed-en.png',
  'assets/img/manual/016_manual-show-content-en.png',
  'assets/img/manual/017_manual-cushion-ja-bigsize.png',
  'assets/img/manual/018_manual-cushion-ja-bigsize.png',
  'assets/img/manual/019_manual-add-extensions-ja.png',
  'assets/img/manual/020_manual-add-extensions-ja.png',
  'assets/img/manual/021_manual-add-extensions-ja.png',
  'assets/img/manual/022_manual-add-extensions-ja.png',
  'assets/img/manual/023_manual-add-extensions-ja.png',
  'assets/img/manual/024_manual-add-extensions-ja.png',
  'assets/img/manual/025_manual-add-extensions-ja.png',
  'assets/img/manual/026_manual-add-extensions-ja.png',
  'assets/img/manual/027_manual-add-extensions-ja.png',
  'assets/img/manual/028_manual-add-extensions-ja.png'
]);
const STORE_LISTING_SCREENSHOT_CANDIDATES = Object.freeze([
  'docs/assets/img/manual/017_manual-cushion-ja-bigsize.png',
  'docs/assets/img/manual/010_manual-collapsed-ja.png',
  'docs/assets/img/manual/007_manual-popup-ja-on.jpeg',
  'docs/assets/img/manual/008_manual-popup-ja-on-more.png',
  'docs/assets/img/manual/014_manual-cushion-en.png'
]);
const PAGE_PAIRS = Object.freeze([
  {
    name: 'about',
    jaPath: 'about.html',
    enPath: 'en/about.html',
    jaToEn: './en/about.html',
    enToJa: '../about.html'
  },
  {
    name: 'privacy',
    jaPath: 'privacy.html',
    enPath: 'en/privacy.html',
    jaToEn: './en/privacy.html',
    enToJa: '../privacy.html'
  },
  {
    name: 'manual',
    jaPath: 'manual.html',
    enPath: 'en/manual.html',
    jaToEn: './en/manual.html',
    enToJa: '../manual.html'
  },
  {
    name: 'disclaimer',
    jaPath: 'disclaimer.html',
    enPath: 'en/disclaimer.html',
    jaToEn: './en/disclaimer.html',
    enToJa: '../disclaimer.html'
  }
]);

function runTests() {
  for (const page of PAGE_PAIRS) {
    testJapanesePageMetadataAndLanguageSwitcher(page);
    testEnglishPageMetadataAndLanguageSwitcher(page);
  }

  testServicePdfLinks();
  testManualImagesAndAltText();
  testManualAssetsExist();
  testManualImageModal();
  testChromeWebStoreManual();
  testDisclaimers();
  testDocsNavigation();
  testGitHubRepositoryLinks();
  testStoreListingDraft();
  testManualSensitivityDescriptions();
  testRuleBasedExplanation();
  testNotPurposeStatements();
  testDocsDoNotExposeInternalRuleIds();

  console.log('All docs tests passed.');
}

function testJapanesePageMetadataAndLanguageSwitcher(page) {
  const html = readDoc(page.jaPath);
  const canonicalUrl = `${DOCS_BASE_URL}/${page.jaPath}`;
  const englishUrl = `${DOCS_BASE_URL}/${page.enPath}`;

  assert.match(html, /<html lang="ja">/);
  assertIncludesMetadata(html, canonicalUrl, canonicalUrl, englishUrl);
  assertLanguageSwitcher(html, page.jaToEn, '日本語', 'English');
}

function testEnglishPageMetadataAndLanguageSwitcher(page) {
  const html = readDoc(page.enPath);
  const japaneseUrl = `${DOCS_BASE_URL}/${page.jaPath}`;
  const canonicalUrl = `${DOCS_BASE_URL}/${page.enPath}`;

  assert.match(html, /<html lang="en">/);
  assertIncludesMetadata(html, canonicalUrl, japaneseUrl, canonicalUrl);
  assertLanguageSwitcher(html, page.enToJa, 'English', '日本語');
}

function assertIncludesMetadata(html, canonicalUrl, japaneseUrl, englishUrl) {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta\s+name="description"/);
  assert.ok(html.includes(`rel="canonical"`));
  assert.ok(html.includes(`href="${canonicalUrl}"`));
  assert.ok(html.includes(`hreflang="ja"`));
  assert.ok(html.includes(`href="${japaneseUrl}"`));
  assert.ok(html.includes(`hreflang="en"`));
  assert.ok(html.includes(`href="${englishUrl}"`));
}

function assertLanguageSwitcher(html, targetPath, selectedLabel, alternateLabel) {
  assert.ok(html.includes('class="language-switcher"'));
  assert.ok(html.includes('for="language-select"'));
  assert.ok(html.includes('id="language-select"'));
  assert.ok(html.includes('aria-label='));
  assert.ok(html.includes('onchange="if (this.value) window.location.href = this.value;"'));
  assert.ok(html.includes(`value="${targetPath}"`));
  assert.ok(html.includes(`selected>${selectedLabel}</option>`));
  assert.ok(html.includes(alternateLabel));
}

function testServicePdfLinks() {
  const jaAbout = readDoc('about.html');
  const jaPrivacy = readDoc('privacy.html');
  const enAbout = readDoc('en/about.html');
  const enPrivacy = readDoc('en/privacy.html');

  assertPdfLink(jaAbout, `./${SERVICE_PDF_PATH}`, 'サービス説明資料PDFを見る');
  assertPdfLink(jaPrivacy, `./${SERVICE_PDF_PATH}`, 'サービス説明資料PDFを見る');
  assertPdfLink(enAbout, `../${SERVICE_PDF_PATH}`, 'View the service introduction PDF');
  assertPdfLink(enPrivacy, `../${SERVICE_PDF_PATH}`, 'View the service introduction PDF');
}

function testGitHubRepositoryLinks() {
  for (const page of PAGE_PAIRS) {
    assertGitHubRepositoryLink(
      readDoc(page.jaPath),
      'ことばうけみまもりのGitHubリポジトリを表示する'
    );
    assertGitHubRepositoryLink(readDoc(page.enPath), 'View source code on GitHub');
  }

  const sharedStyles = readDoc('assets/css/style.css');
  assert.ok(sharedStyles.includes('.github-repository-link'));
}

function assertGitHubRepositoryLink(html, label) {
  assert.ok(html.includes('class="github-repository-link"'));
  assert.ok(
    html.includes(
      `<a href="${GITHUB_REPOSITORY_URL}" target="_blank" rel="noopener noreferrer">${label}</a>`
    )
  );
}

function testManualImagesAndAltText() {
  const jaManual = readDoc('manual.html');
  const enManual = readDoc('en/manual.html');

  for (const imageSrc of JA_MANUAL_IMAGES) {
    assertImageWithAlt(jaManual, imageSrc);
  }

  for (const imageSrc of EN_MANUAL_IMAGES) {
    assertImageWithAlt(enManual, imageSrc);
  }
}

function testManualAssetsExist() {
  const pdfPath = path.join(__dirname, '..', 'docs', SERVICE_PDF_PATH);
  assert.equal(fs.existsSync(pdfPath), true);

  for (const assetPath of MANUAL_ASSET_FILES) {
    const filePath = path.join(__dirname, '..', 'docs', assetPath);
    assert.equal(fs.existsSync(filePath), true);
  }
}

function testManualImageModal() {
  const jaManual = readDoc('manual.html');
  const enManual = readDoc('en/manual.html');
  const modalScript = readDoc(MANUAL_MODAL_SCRIPT_PATH);
  const sharedStyles = readDoc('assets/css/style.css');

  assert.ok(jaManual.includes(`<script src="./${MANUAL_MODAL_SCRIPT_PATH}"></script>`));
  assert.ok(enManual.includes(`<script src="../${MANUAL_MODAL_SCRIPT_PATH}"></script>`));

  assert.ok(modalScript.includes("document.querySelectorAll('.manual-figure img')"));
  assert.ok(modalScript.includes("document.createElement('dialog')"));
  assert.ok(modalScript.includes('dialog.showModal()'));
  assert.ok(modalScript.includes('dialog.close()'));
  assert.ok(modalScript.includes("closeButton.textContent = '×'"));
  assert.ok(modalScript.includes("dialog.addEventListener('click', closeModal)"));
  assert.ok(modalScript.includes("dialog.addEventListener('cancel'"));
  assert.ok(modalScript.includes("event.key !== 'Enter'"));
  assert.ok(modalScript.includes("event.key !== ' '"));
  assert.ok(modalScript.includes("event.key === 'Escape'"));

  assert.ok(sharedStyles.includes('.image-modal'));
  assert.ok(sharedStyles.includes('.image-modal::backdrop'));
  assert.ok(sharedStyles.includes('.image-modal__close'));
  assert.ok(sharedStyles.includes('.image-modal__image'));
}

function testChromeWebStoreManual() {
  const jaManual = readDoc('manual.html');
  const enManual = readDoc('en/manual.html');

  assert.ok(jaManual.includes(CHROME_WEB_STORE_URL));
  assert.ok(jaManual.includes('1. Chrome ウェブストアから拡張機能を追加する'));
  assert.ok(jaManual.includes('「Chrome に追加」'));
  assert.ok(jaManual.includes('「インストールに進む」'));
  assert.ok(jaManual.includes('「拡張機能を追加」'));
  assert.equal(jaManual.includes('公開前の手動確認版'), false);
  assert.equal(jaManual.includes('パッケージ化されていない拡張機能'), false);

  assert.ok(enManual.includes(CHROME_WEB_STORE_URL));
  assert.ok(enManual.includes('1. Add the extension from the Chrome Web Store'));
  assert.ok(enManual.includes('&quot;Add to Chrome&quot;'));
  assert.ok(enManual.includes('&quot;Continue to install&quot;'));
  assert.ok(enManual.includes('&quot;Add extension&quot;'));
  assert.equal(/pre-release/iu.test(enManual), false);
  assert.equal(/Load unpacked/iu.test(enManual), false);
  assert.equal(/Developer mode/iu.test(enManual), false);

  const jaStoreFigures = [
    ['./assets/img/manual/019_manual-add-extensions-ja.png', '「Chrome に追加」をクリックします。'],
    [
      './assets/img/manual/020_manual-add-extensions-ja.png',
      '「インストールに進む」をクリックします。'
    ],
    [
      './assets/img/manual/021_manual-add-extensions-ja.png',
      '「拡張機能を追加」をクリックします。'
    ],
    [
      './assets/img/manual/022_manual-add-extensions-ja.png',
      'ことばうけみまもりが追加されたことを確認します。'
    ],
    [
      './assets/img/manual/025_manual-add-extensions-ja.png',
      'ことばうけみまもりをピン留めします。'
    ],
    [
      './assets/img/manual/023_manual-add-extensions-ja.png',
      '初期状態のOFFと表示されやすさの設定を確認します。'
    ],
    [
      './assets/img/manual/024_manual-add-extensions-ja.png',
      '拡張機能をONにし、必要な表示されやすさを選びます。'
    ],
    [
      './assets/img/manual/026_manual-add-extensions-ja.png',
      '読むか、今は見ないかを選べることを確認します。'
    ],
    [
      './assets/img/manual/027_manual-add-extensions-ja.png',
      '「今は見ない」を選んだ後も、あとから内容を表示できます。'
    ],
    [
      './assets/img/manual/028_manual-add-extensions-ja.png',
      '「内容を表示する」をクリックすると、投稿本文を確認できます。'
    ]
  ];
  const enStoreFigures = [
    ['../assets/img/manual/019_manual-add-extensions-ja.png', 'Click &quot;Add to Chrome&quot;.'],
    [
      '../assets/img/manual/020_manual-add-extensions-ja.png',
      'click &quot;Continue to install&quot;.'
    ],
    ['../assets/img/manual/021_manual-add-extensions-ja.png', 'click &quot;Add extension&quot;.'],
    [
      '../assets/img/manual/022_manual-add-extensions-ja.png',
      'Confirm that the extension was added to Chrome.'
    ],
    [
      '../assets/img/manual/025_manual-add-extensions-ja.png',
      'pin Kotoba Uke Mimamori to the toolbar.'
    ],
    [
      '../assets/img/manual/023_manual-add-extensions-ja.png',
      'review the initial OFF state and sensitivity options.'
    ],
    [
      '../assets/img/manual/024_manual-add-extensions-ja.png',
      'Turn the extension ON and choose the sensitivity you prefer.'
    ],
    [
      '../assets/img/manual/026_manual-add-extensions-ja.png',
      'choose whether to read the post or not read it now.'
    ],
    [
      '../assets/img/manual/027_manual-add-extensions-ja.png',
      'you can still show the content later.'
    ],
    [
      '../assets/img/manual/028_manual-add-extensions-ja.png',
      'Choose &quot;Show content&quot; to view the post text.'
    ]
  ];

  assertStoreFigureOrderAndCaptions(jaManual, jaStoreFigures);
  assertStoreFigureOrderAndCaptions(enManual, enStoreFigures);
}

function testDisclaimers() {
  const jaDisclaimer = readDoc('disclaimer.html');
  const enDisclaimer = readDoc('en/disclaimer.html');

  assert.ok(jaDisclaimer.includes('最終更新：2026年6月'));
  assert.ok(jaDisclaimer.includes('ブラウザ内の固定的なルールベース'));
  assert.ok(jaDisclaimer.includes('正確性、完全性、有用性を保証するものではありません'));
  assert.ok(jaDisclaimer.includes('法令上責任を免れない場合を除きます'));
  assert.ok(jaDisclaimer.includes('X Corp.または関連会社が提供、承認、保証するものではありません'));

  assert.ok(enDisclaimer.includes('Last updated: June 2026'));
  assert.ok(enDisclaimer.includes('fixed rule-based checks'));
  assert.ok(enDisclaimer.includes('does not guarantee the accuracy, completeness, or usefulness'));
  assert.ok(enDisclaimer.includes('except where liability cannot be'));
  assert.ok(enDisclaimer.includes('not provided, approved, or'));
}

function testDocsNavigation() {
  const japaneseLinks = [
    '<a href="./about.html">本拡張機能について</a>',
    '<a href="./privacy.html">プライバシーポリシー</a>',
    '<a href="./disclaimer.html">免責事項</a>',
    '<a href="./manual.html">拡張機能の使い方</a>'
  ];
  const englishLinks = [
    '<a href="./about.html">About this extension</a>',
    '<a href="./privacy.html">Privacy Policy</a>',
    '<a href="./disclaimer.html">Disclaimer</a>',
    '<a href="./manual.html">How to Use</a>'
  ];

  for (const page of PAGE_PAIRS) {
    assertOrderedIncludes(readDoc(page.jaPath), japaneseLinks);
    assertOrderedIncludes(readDoc(page.enPath), englishLinks);
  }
}

function testStoreListingDraft() {
  const draft = readDoc(STORE_LISTING_DRAFT_PATH);

  assert.ok(draft.includes('ことばうけみまもり｜Xことばに心のワンクッション'));
  assert.ok(draft.includes('Kotoba Uke Mimamori'));
  assert.ok(!draft.includes('THIS EXTENSION IS FOR BETA TESTING'));
  assert.ok(!draft.includes('BETA'));
  assert.ok(draft.includes('権限説明'));
  assert.ok(draft.includes('Permission explanation'));
  assert.ok(draft.includes('審査向け補足説明'));
  assert.ok(draft.includes('Review notes'));
  assert.ok(draft.includes('スクリーンショット候補'));
  assert.ok(draft.includes('storage'));
  assert.ok(draft.includes('enabled'));
  assert.ok(draft.includes('cushionSensitivity'));

  for (const screenshotPath of STORE_LISTING_SCREENSHOT_CANDIDATES) {
    assert.ok(draft.includes(screenshotPath));
  }
}

function testManualSensitivityDescriptions() {
  const jaManual = readDoc('manual.html');
  const enManual = readDoc('en/manual.html');

  assertOrderedIncludes(jaManual, [
    '「少なめ」「標準」「多め」からワンクッションの表示されやすさを選べます。',
    'class="manual-sensitivity-list"',
    '少なめ: 強い表現を中心に表示します。',
    '標準: 通常の設定です。',
    '多め: 少し軽めのリスク表現にも表示されやすくします。'
  ]);

  assertOrderedIncludes(enManual, [
    'You can choose the cushion display sensitivity from Low, Standard, or High.',
    'class="manual-sensitivity-list"',
    'Low: Shows cushions mainly for stronger expressions.',
    'Standard: The usual setting.',
    'High: Shows cushions more easily, including for slightly lighter risk expressions.'
  ]);
}

function testRuleBasedExplanation() {
  const jaAbout = readDoc('about.html');
  const enAbout = readDoc('en/about.html');

  assert.ok(jaAbout.includes('ブラウザ内に入っている固定的なルールベース'));
  assert.ok(jaAbout.includes('外部AIサーバーへ送って解析するものではありません'));
  assert.ok(jaAbout.includes('判定は完全ではありません'));
  assert.ok(jaAbout.includes('投稿本文や判定結果を収集して、ルール改善に使うことはありません'));

  assert.ok(enAbout.includes('fixed rule-based checks inside your browser'));
  assert.ok(enAbout.includes('external AI server'));
  assert.ok(enAbout.includes('This detection is not perfect'));
  assert.ok(enAbout.includes('Post text and detection results are not collected'));
}

function testNotPurposeStatements() {
  const jaDocs = `${readDoc('about.html')}\n${readDoc('privacy.html')}`;
  const enDocs = `${readDoc('en/about.html')}\n${readDoc('en/privacy.html')}`;

  assert.ok(jaDocs.includes('投稿者を評価'));
  assert.ok(jaDocs.includes('自動でブロックや通報を行うこと'));
  assert.ok(jaDocs.includes('アカウント単位で危険度を判定すること'));

  assert.ok(enDocs.includes('Judge the poster'));
  assert.ok(enDocs.includes('Automatically block or report'));
  assert.ok(enDocs.includes('Rate accounts'));
}

function testDocsDoNotExposeInternalRuleIds() {
  const allDocs = [
    ...PAGE_PAIRS.flatMap((page) => [page.jaPath, page.enPath]),
    STORE_LISTING_DRAFT_PATH
  ]
    .map(readDoc)
    .join('\n');
  const forbiddenInternalSnippets = [
    'existence_denial.strong_phrase',
    'personality_attack.strong_phrase',
    'severe_insult.strong_word',
    'direct_attack.second_person',
    'direct_attack.command',
    'threat_or_harm.harm_phrase',
    'doxxing_or_privacy_risk.privacy_phrase',
    'patterns: ['
  ];

  for (const snippet of forbiddenInternalSnippets) {
    assert.equal(allDocs.includes(snippet), false);
  }
}

function assertImageWithAlt(html, src) {
  const escapedSrc = escapeRegExp(src);
  const imagePattern = new RegExp(`<img\\s+[^>]*src="${escapedSrc}"[^>]*alt="[^"]+"`, 'u');

  assert.match(html, imagePattern);
}

function assertPdfLink(html, href, text) {
  const escapedHref = escapeRegExp(href);
  const escapedText = escapeRegExp(text);
  const linkPattern = new RegExp(
    `<a\\s+href="${escapedHref}"\\s+target="_blank"\\s+rel="noopener"\\s+class="header-link">${escapedText}</a>`,
    'u'
  );

  assert.match(html, linkPattern);
}

function assertOrderedIncludes(html, snippets) {
  let previousIndex = -1;

  for (const snippet of snippets) {
    const currentIndex = html.indexOf(snippet, previousIndex + 1);

    assert.ok(currentIndex > previousIndex);
    previousIndex = currentIndex;
  }
}

function assertStoreFigureOrderAndCaptions(html, figures) {
  let previousIndex = -1;

  for (const [src, captionSnippet] of figures) {
    const figurePattern = new RegExp(
      `<figure class="manual-figure">\\s*<img\\s+[^>]*src="${escapeRegExp(src)}"[^>]*>\\s*<figcaption>[^<]*${escapeRegExp(captionSnippet)}[^<]*</figcaption>`,
      'u'
    );
    const figureMatch = figurePattern.exec(html);

    assert.ok(figureMatch);
    assert.ok(figureMatch.index > previousIndex);
    previousIndex = figureMatch.index;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function readDoc(relativePath) {
  const filePath = path.join(__dirname, '..', 'docs', relativePath);

  assert.equal(fs.existsSync(filePath), true);

  return fs.readFileSync(filePath, 'utf8');
}

runTests();
