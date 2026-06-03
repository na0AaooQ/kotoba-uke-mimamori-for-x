'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DOCS_BASE_URL = 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x';
const SERVICE_PDF_PATH = 'assets/pdf/kotoba-uke-mimamori-introduction.pdf';
const STORE_LISTING_DRAFT_PATH = 'store-listing-draft.md';
const JA_MANUAL_IMAGES = Object.freeze([
  './assets/img/manual/001_manual-load-extension.jpeg',
  './assets/img/manual/002_manual-load-extension.png',
  './assets/img/manual/003_manual-load-extension.png',
  './assets/img/manual/004_manual-load-extension.png',
  './assets/img/manual/005_manual-popup-ja-off.jpeg',
  './assets/img/manual/006_manual-popup-ja-off.jpeg',
  './assets/img/manual/007_manual-popup-ja-on.jpeg',
  './assets/img/manual/008_manual-popup-ja-on-more.png',
  './assets/img/manual/009_manual-cushion-ja.png',
  './assets/img/manual/010_manual-collapsed-ja.png',
  './assets/img/manual/011_manual-show-content-ja.png',
  './assets/img/manual/017_manual-cushion-ja-bigsize.png',
  './assets/img/manual/018_manual-cushion-ja-bigsize.png'
]);
const EN_MANUAL_IMAGES = Object.freeze([
  '../assets/img/manual/012_manual-popup-en-off.jpeg',
  '../assets/img/manual/013_manual-popup-en-on.jpeg',
  '../assets/img/manual/014_manual-cushion-en.png',
  '../assets/img/manual/015_manual-collapsed-en.png',
  '../assets/img/manual/016_manual-show-content-en.png'
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
  'assets/img/manual/018_manual-cushion-ja-bigsize.png'
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
  testStoreListingDraft();
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

function testStoreListingDraft() {
  const draft = readDoc(STORE_LISTING_DRAFT_PATH);

  assert.ok(draft.includes('ことばうけみまもり｜Xことばに心のワンクッション BETA'));
  assert.ok(draft.includes('Kotoba Uke Mimamori BETA'));
  assert.ok(draft.includes('THIS EXTENSION IS FOR BETA TESTING'));
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function readDoc(relativePath) {
  const filePath = path.join(__dirname, '..', 'docs', relativePath);

  assert.equal(fs.existsSync(filePath), true);

  return fs.readFileSync(filePath, 'utf8');
}

runTests();
