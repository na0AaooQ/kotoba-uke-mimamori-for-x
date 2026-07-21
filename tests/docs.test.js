'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DOCS_BASE_URL = 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x';
const SERVICE_PDF_PATH = 'assets/pdf/kotoba-uke-mimamori-introduction.pdf';
const STORE_LISTING_DRAFT_PATH = 'store-listing-draft.md';
const MANUAL_MODAL_SCRIPT_PATH = 'assets/js/manual-image-modal.js';
const THEME_SWITCHER_SCRIPT_PATH = 'assets/js/theme-switcher.js';
const CUSHION_GUIDANCE_DESIGN_PATH = 'design/cushion-guidance.md';
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
const JAPANESE_PAGE_PATHS = Object.freeze([
  'about.html',
  'privacy.html',
  'disclaimer.html',
  'manual.html'
]);
const ENGLISH_PAGE_PATHS = Object.freeze([
  'en/about.html',
  'en/privacy.html',
  'en/disclaimer.html',
  'en/manual.html'
]);
const JAPANESE_DOCS_NAV_LINKS = Object.freeze([
  '<a href="./about.html" target="_blank" rel="noopener noreferrer">本拡張機能について</a>',
  '<a href="./privacy.html" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>',
  '<a href="./disclaimer.html" target="_blank" rel="noopener noreferrer">免責事項</a>',
  '<a href="./manual.html" target="_blank" rel="noopener noreferrer">拡張機能の使い方</a>',
  '<a href="./protect-your-heart.html" target="_blank" rel="noopener noreferrer">ことばうけみまもりで心を守る使い方</a>'
]);
const ENGLISH_DOCS_NAV_LINKS = Object.freeze([
  '<a href="./about.html" target="_blank" rel="noopener noreferrer">About this extension</a>',
  '<a href="./privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>',
  '<a href="./disclaimer.html" target="_blank" rel="noopener noreferrer">Disclaimer</a>',
  '<a href="./manual.html" target="_blank" rel="noopener noreferrer">How to Use</a>',
  '<a href="./protect-your-heart.html" target="_blank" rel="noopener noreferrer">How to Protect Your Peace of Mind</a>'
]);
const PROTECT_YOUR_HEART_SECTION_IDS = Object.freeze([
  'when-cushion-appears',
  'deciding-whether-to-view',
  'choices-available-now',
  'repeated-contact',
  'x-safety-features',
  'hesitating-about-muting-or-blocking',
  'fear-or-immediate-danger',
  'extension-role',
  'x-help-and-related-pages'
]);
const X_HELP_URLS = Object.freeze([
  'https://help.x.com/ja/using-x/x-mute',
  'https://help.x.com/ja/using-x/blocking-and-unblocking-accounts',
  'https://help.x.com/ja/using-x/direct-messages',
  'https://help.x.com/ja/safety-and-security/report-a-post',
  'https://help.x.com/ja/rules-and-policies/x-report-violation',
  'https://help.x.com/ja/rules-and-policies/abusive-behavior',
  'https://help.x.com/ja/rules-and-policies/hateful-conduct-policy'
]);
const ENGLISH_X_HELP_URLS = Object.freeze([
  'https://help.x.com/en/using-x/x-mute',
  'https://help.x.com/using-twitter/blocking-and-unblocking-accounts',
  'https://help.x.com/en/using-x/direct-messages',
  'https://help.x.com/en/safety-and-security/report-a-post',
  'https://help.x.com/en/rules-and-policies/x-report-violation',
  'https://help.x.com/en/rules-and-policies/abusive-behavior',
  'https://help.x.com/en/rules-and-policies/hateful-conduct-policy'
]);

function runTests() {
  for (const page of PAGE_PAIRS) {
    testJapanesePageMetadataAndLanguageSwitcher(page);
    testEnglishPageMetadataAndLanguageSwitcher(page);
  }

  testDocsThemeSwitcher();
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
  testUiLanguageDocumentation();
  testCushionGuidanceDocumentation();
  testRuleBasedExplanation();
  testNotPurposeStatements();
  testDocsDoNotExposeInternalRuleIds();
  testProtectYourHeartGuide();
  testEnglishProtectYourHeartGuide();
  testDocumentLastUpdatedDates();
  testProtectYourHeartEntryLinks();

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

function testDocsThemeSwitcher() {
  for (const page of PAGE_PAIRS) {
    assertThemeToggle(readDoc(page.jaPath), `./${THEME_SWITCHER_SCRIPT_PATH}`, {
      ariaLabel: 'ダークモードに切り替える',
      label: '🌙 ダークモード'
    });
    assertThemeToggle(readDoc(page.enPath), `../${THEME_SWITCHER_SCRIPT_PATH}`, {
      ariaLabel: 'Switch to dark mode',
      label: '🌙 Dark mode'
    });
  }

  const sharedStyles = readDoc('assets/css/style.css');
  assert.ok(sharedStyles.includes(":root[data-theme='dark']"));
  assert.ok(sharedStyles.includes('@media (prefers-color-scheme: dark)'));
  assert.ok(sharedStyles.includes('.theme-switcher'));
  assert.ok(sharedStyles.includes('.quick-guide'));

  const jaPrivacy = readDoc('privacy.html');
  const enPrivacy = readDoc('en/privacy.html');
  assert.ok(jaPrivacy.includes('localStorage'));
  assert.ok(jaPrivacy.includes('Cookieやアクセス解析も使用しません'));
  assert.ok(jaPrivacy.includes('閲覧履歴、閲覧URL'));
  assert.ok(enPrivacy.includes('localStorage'));
  assert.match(enPrivacy, /do not use\s+cookies or analytics/u);
  assert.match(enPrivacy, /browsing history,\s+pages or URLs viewed/u);
}

function assertThemeToggle(html, scriptPath, labels) {
  assert.ok(html.includes(`src="${scriptPath}"`));
  assert.ok(html.includes('class="page-preferences"'));
  assert.ok(html.includes('class="theme-switcher"'));
  assert.ok(html.includes('class="theme-switcher__button"'));
  assert.ok(html.includes('data-theme-toggle'));
  assert.ok(html.includes(`aria-label="${labels.ariaLabel}"`));
  assert.ok(html.includes(`>${labels.label}</button>`));
  assert.equal(html.includes('data-theme-select'), false);
  assert.ok(html.indexOf('class="theme-switcher"') < html.indexOf('class="language-switcher"'));
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

  assert.ok(jaDisclaimer.includes('最終更新日：<time datetime="2026-06-16">2026年6月16日</time>'));
  assert.equal(jaDisclaimer.includes('最終更新：2026年6月'), false);
  assert.ok(jaDisclaimer.includes('ブラウザ内の固定的なルールベース'));
  assert.ok(jaDisclaimer.includes('正確性、完全性、有用性を保証するものではありません'));
  assert.ok(jaDisclaimer.includes('法令上責任を免れない場合を除きます'));
  assert.ok(jaDisclaimer.includes('X Corp.または関連会社が提供、承認、保証するものではありません'));

  assert.ok(
    enDisclaimer.includes('Last updated: <time datetime="2026-06-16">June 16, 2026</time>')
  );
  assert.equal(enDisclaimer.includes('Last updated: June 2026'), false);
  assert.ok(enDisclaimer.includes('fixed rule-based checks'));
  assert.ok(enDisclaimer.includes('does not guarantee the accuracy, completeness, or usefulness'));
  assert.ok(enDisclaimer.includes('except where liability cannot be'));
  assert.ok(enDisclaimer.includes('not provided, approved, or'));
}

function testDocsNavigation() {
  for (const page of PAGE_PAIRS) {
    assertOrderedIncludes(readDoc(page.jaPath), JAPANESE_DOCS_NAV_LINKS);
    assertOrderedIncludes(readDoc(page.enPath), ENGLISH_DOCS_NAV_LINKS);
  }

  assertOrderedIncludes(readDoc('protect-your-heart.html'), JAPANESE_DOCS_NAV_LINKS);
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
  assert.ok(draft.includes('uiLanguage'));

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

function testUiLanguageDocumentation() {
  const jaManual = readDoc('manual.html');
  const enManual = readDoc('en/manual.html');
  const jaPrivacy = readDoc('privacy.html');
  const enPrivacy = readDoc('en/privacy.html');

  assertIncludesAll(jaManual, [
    '「自動」「日本語」「English」から表示言語を選べます。',
    'ChromeのUI言語が日本語系の場合は日本語、それ以外は英語',
    '現在、表示言語設定が適用されるのはpopupとオプション画面です。',
    '<code>uiLanguage</code>'
  ]);
  assertIncludesAll(enManual, [
    'You can choose Auto, 日本語, or English',
    'Chrome&apos;s UI language is Japanese',
    'popup and options',
    'page only',
    '<code>uiLanguage</code>'
  ]);
  assertIncludesAll(jaPrivacy, [
    '<code>enabled</code>、ワンクッションの表示されやすさを示す <code>cushionSensitivity</code>、表示言語を示す <code>uiLanguage</code>',
    '<code>auto</code>、<code>ja</code>、<code>en</code>',
    '外部へ送信しません。'
  ]);
  assertIncludesAll(enPrivacy, [
    '<code>enabled</code>,',
    '<code>cushionSensitivity</code>',
    '<code>uiLanguage</code>',
    '<code>auto</code>',
    'not sent\n            externally'
  ]);
  assert.equal(jaPrivacy.includes('enabled と、ワンクッションの表示されやすさを示す'), false);
  assert.equal(
    enPrivacy.includes('The only saved settings are the extension ON/OFF setting and'),
    false
  );
}

function testCushionGuidanceDocumentation() {
  const jaManual = readDoc('manual.html');
  const enManual = readDoc('en/manual.html');
  const readme = readRepositoryFile('README.md');
  const agents = readRepositoryFile('AGENTS.md');
  const design = readRepositoryFile(CUSHION_GUIDANCE_DESIGN_PATH);

  assertIncludesAll(jaManual, [
    '表現の強さの目安',
    '検知された表現の傾向',
    '固定ルールによる補助的な情報',
    '身の安全に関わる可能性のある表現',
    '圧を感じる可能性のある表現',
    '判定結果はAIが文章の意味を理解して危険性を判断した結果ではありません',
    '投稿者の人格や悪意',
    '同じ本文に対する表現の強さの意味',
    'X（Twitter）の投稿本文を変更・削除するものではありません。'
  ]);
  assert.ok(
    jaManual.includes(
      '<a href="./protect-your-heart.html" target="_blank" rel="noopener noreferrer">'
    )
  );
  assert.equal(jaManual.includes('生の内部scoreは表示しません。'), false);

  assertIncludesAll(enManual, [
    'Expression intensity guide',
    'Detected language patterns',
    'based on fixed rules',
    'Language that may relate to personal safety',
    'Language that may feel pressuring',
    'not based on AI understanding the meaning of the post',
    'poster&apos;s personality or intent',
    'changing the cushion display sensitivity setting in Kotoba Uke Mimamori',
    'does not change or delete post text on X (Twitter).',
    '<h2 id="protect-your-heart-title">Protecting Your Peace of Mind</h2>',
    '<a href="./protect-your-heart.html" target="_blank" rel="noopener noreferrer">How to Protect Your Peace of Mind with Kotoba Uke Mimamori</a>'
  ]);
  assert.equal(enManual.includes('The underlying score is not shown.'), false);

  assertIncludesAll(readme, [
    '表現の強さの目安',
    '検知された表現の傾向',
    '生の数値 score を表示しません',
    '感度設定が変えるのは、ワンクッションを表示するかどうか',
    '[design/cushion-guidance.md](design/cushion-guidance.md)'
  ]);
  assert.equal(readme.includes('以下のような短い理由文だけを表示します。'), false);

  assertIncludesAll(agents, [
    '生の `score`',
    '生の内部カテゴリIDをユーザーへ表示しない。',
    'ホワイトリスト方式',
    '未知のキーは表示しない。',
    '「今は見ない」後',
    '危険度ゲージ',
    '引用する側の投稿と引用元投稿は独立した対象として扱い'
  ]);

  assertIncludesAll(design, [
    '## 生の数値 score を表示しない理由',
    '## 表現の強さの目安',
    '## 検知された表現の傾向',
    '## 感度設定と強さの目安の関係',
    '## AI判定ではないこと',
    '## 保存・外部送信をしない理由',
    '## 検討した代替案と見送り理由'
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
    'protect-your-heart.html',
    'en/protect-your-heart.html',
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

function testProtectYourHeartGuide() {
  const html = readDoc('protect-your-heart.html');

  assert.match(html, /<html lang="ja">/);
  assert.ok(
    html.includes('<title>ことばうけみまもりで心を守る使い方 | ことばうけみまもり</title>')
  );
  assert.ok(html.includes('<h1>ことばうけみまもりで心を守る使い方</h1>'));
  assert.ok(html.includes('「今は見ない」「届いた言葉から少し距離を置く」という選択について'));
  assert.ok(html.includes('最終更新日：<time datetime="2026-07-16">2026年7月16日</time>'));
  assert.ok(html.includes('X公式ヘルプ確認日：<time datetime="2026-07-15">2026年7月15日</time>'));
  assert.equal((html.match(/<h1>/gu) ?? []).length, 1);
  assert.ok(html.includes('class="toc" aria-labelledby="protect-your-heart-toc-title"'));
  assert.ok(html.includes('<h2 id="protect-your-heart-toc-title">目次</h2>'));
  assert.ok(html.includes('<h2>おわりに</h2>'));
  assert.ok(html.includes('<script src="./assets/js/theme-switcher.js"></script>'));
  assert.ok(html.includes('<link rel="stylesheet" href="./assets/css/style.css">'));
  assertThemeToggle(html, `./${THEME_SWITCHER_SCRIPT_PATH}`, {
    ariaLabel: 'ダークモードに切り替える',
    label: '🌙 ダークモード'
  });
  assertIncludesMetadata(
    html,
    `${DOCS_BASE_URL}/protect-your-heart.html`,
    `${DOCS_BASE_URL}/protect-your-heart.html`,
    `${DOCS_BASE_URL}/en/protect-your-heart.html`
  );
  assertLanguageSwitcher(html, './en/protect-your-heart.html', '日本語', 'English');

  const quickGuide = getQuickGuide(html);
  assert.ok(quickGuide.includes('クイックガイド：ワンクッションが表示されたときにできること'));
  assert.equal(countOccurrences(quickGuide, '<li>'), 10);
  assert.ok(html.indexOf('class="quick-guide"') > html.indexOf('参考としてご覧ください。'));
  assert.ok(html.indexOf('class="quick-guide"') < html.indexOf('class="toc"'));

  for (const id of PROTECT_YOUR_HEART_SECTION_IDS) {
    assert.ok(html.includes(`href="#${id}"`));
    assert.ok(html.includes(`<section id="${id}">`));
  }

  for (const url of X_HELP_URLS) {
    assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`));
  }

  assertOrderedIncludes(html, [
    '<a href="./about.html" target="_blank" rel="noopener noreferrer">ことばうけみまもりについて</a>',
    '<a href="./manual.html" target="_blank" rel="noopener noreferrer">拡張機能の使い方</a>',
    '<a href="./privacy.html" target="_blank" rel="noopener noreferrer">プライバシーポリシーについて</a>',
    '<a href="./disclaimer.html" target="_blank" rel="noopener noreferrer">免責事項</a>'
  ]);

  assert.ok(
    html.includes(
      'href="https://words-watching-app.na0aaooq.com/consultation.html" target="_blank" rel="noopener noreferrer"'
    )
  );
}

function testEnglishProtectYourHeartGuide() {
  const html = readDoc('en/protect-your-heart.html');

  assert.match(html, /<html lang="en">/);
  assert.ok(
    html.includes('<title>How to Protect Your Peace of Mind with Kotoba Uke Mimamori</title>')
  );
  assert.ok(html.includes('<h1>How to Protect Your Peace of Mind with Kotoba Uke Mimamori</h1>'));
  assert.ok(
    html.includes(
      'Choosing Not to Read Something Right Away, and Taking Some Distance from the Words You Receive'
    )
  );
  assert.ok(html.includes('Last updated: <time datetime="2026-07-16">July 16, 2026</time>'));
  assert.ok(
    html.includes('X Help Center checked on: <time datetime="2026-07-16">July 16, 2026</time>')
  );
  assert.equal((html.match(/<h1>/gu) ?? []).length, 1);
  assert.ok(html.includes('class="toc" aria-labelledby="protect-your-heart-toc-title"'));
  assert.ok(html.includes('<h2 id="protect-your-heart-toc-title">Table of Contents</h2>'));
  assert.ok(html.includes('<h2>Closing</h2>'));
  assert.ok(html.includes('<script src="../assets/js/theme-switcher.js"></script>'));
  assert.ok(html.includes('<link rel="stylesheet" href="../assets/css/style.css">'));
  assertThemeToggle(html, `../${THEME_SWITCHER_SCRIPT_PATH}`, {
    ariaLabel: 'Switch to dark mode',
    label: '🌙 Dark mode'
  });
  assertIncludesMetadata(
    html,
    `${DOCS_BASE_URL}/en/protect-your-heart.html`,
    `${DOCS_BASE_URL}/protect-your-heart.html`,
    `${DOCS_BASE_URL}/en/protect-your-heart.html`
  );
  assertLanguageSwitcher(html, '../protect-your-heart.html', 'English', '日本語');

  const quickGuide = getQuickGuide(html);
  assert.ok(quickGuide.includes('Quick Guide: What You Can Do When a Pause Appears'));
  assert.equal(countOccurrences(quickGuide, '<li>'), 10);

  for (const id of PROTECT_YOUR_HEART_SECTION_IDS) {
    assert.ok(html.includes(`href="#${id}"`));
    assert.ok(html.includes(`<section id="${id}">`));
  }

  for (const url of ENGLISH_X_HELP_URLS) {
    assert.ok(html.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`));
  }

  assertOrderedIncludes(html, [
    '<a href="./about.html" target="_blank" rel="noopener noreferrer">About &apos;Kotoba Uke Mimamori&apos;</a>',
    '<a href="./manual.html" target="_blank" rel="noopener noreferrer">How to Use the Extension</a>',
    '<a href="./privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>',
    '<a href="./disclaimer.html" target="_blank" rel="noopener noreferrer">Disclaimer</a>'
  ]);
  assert.ok(
    html.includes(
      'href="https://words-watching-app.na0aaooq.com/en/consultation.html" target="_blank" rel="noopener noreferrer"'
    )
  );
  assertOrderedIncludes(html, ENGLISH_DOCS_NAV_LINKS);
  assertGitHubRepositoryLink(html, 'View source code on GitHub');
}

function testDocumentLastUpdatedDates() {
  for (const pagePath of JAPANESE_PAGE_PATHS) {
    const html = readDoc(pagePath);
    const date =
      pagePath !== 'disclaimer.html'
        ? '最終更新日：<time datetime="2026-07-21">2026年7月21日</time>'
        : '最終更新日：<time datetime="2026-06-16">2026年6月16日</time>';

    assert.equal(countOccurrences(html, date), 1);
    assert.ok(html.indexOf(date) < html.indexOf('<main class="content-card">'));
  }

  for (const pagePath of ENGLISH_PAGE_PATHS) {
    const html = readDoc(pagePath);
    const date =
      pagePath !== 'en/disclaimer.html'
        ? 'Last updated: <time datetime="2026-07-21">July 21, 2026</time>'
        : 'Last updated: <time datetime="2026-06-16">June 16, 2026</time>';

    assert.equal(countOccurrences(html, date), 1);
    assert.ok(html.indexOf(date) < html.indexOf('<main class="content-card">'));
  }
}

function testProtectYourHeartEntryLinks() {
  for (const pagePath of JAPANESE_PAGE_PATHS) {
    const html = readDoc(pagePath);

    assert.ok(
      html.includes(
        '<a href="./protect-your-heart.html" target="_blank" rel="noopener noreferrer">ことばうけみまもりで心を守る使い方</a>'
      )
    );
  }

  for (const pagePath of ENGLISH_PAGE_PATHS) {
    assert.ok(
      readDoc(pagePath).includes(
        '<a href="./protect-your-heart.html" target="_blank" rel="noopener noreferrer">How to Protect Your Peace of Mind</a>'
      )
    );
  }
}

function getQuickGuide(html) {
  const quickGuide = /<section class="quick-guide"[\s\S]*?<\/section>/u.exec(html);

  assert.ok(quickGuide);
  return quickGuide[0];
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

function assertIncludesAll(value, snippets) {
  for (const snippet of snippets) {
    assert.ok(value.includes(snippet));
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

function countOccurrences(value, needle) {
  return value.split(needle).length - 1;
}

function readDoc(relativePath) {
  const filePath = path.join(__dirname, '..', 'docs', relativePath);

  assert.equal(fs.existsSync(filePath), true);

  return fs.readFileSync(filePath, 'utf8');
}

function readRepositoryFile(relativePath) {
  const filePath = path.join(__dirname, '..', relativePath);

  assert.equal(fs.existsSync(filePath), true);

  return fs.readFileSync(filePath, 'utf8');
}

runTests();
