'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DOCS_BASE_URL = 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x';
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

function readDoc(relativePath) {
  const filePath = path.join(__dirname, '..', 'docs', relativePath);

  assert.equal(fs.existsSync(filePath), true);

  return fs.readFileSync(filePath, 'utf8');
}

runTests();
