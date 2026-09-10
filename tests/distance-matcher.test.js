'use strict';

const assert = require('node:assert/strict');
const { createDistanceMatcher } = require('../distance-matcher');

function runTests() {
  testPublicBrowserApiIsBooleanMatcherOnly();
  testMatchesWithNfkcAndAsciiCaseFold();
  testDoesNotCaseFoldNonAsciiText();
  testPreservesWhitespaceAndLineBreaks();
  testTreatsSymbolsHashtagsAndPunctuationLiterally();
  testDoesNotTrimTermsOrTokenizeText();
  testAlwaysReturnsBooleanOnly();

  console.log('All distance matcher tests passed.');
}

function testPublicBrowserApiIsBooleanMatcherOnly() {
  assert.deepEqual(Object.keys(globalThis.kotobaUkeMimamoriDistanceMatcher), [
    'createDistanceMatcher'
  ]);
  assert.equal(typeof createDistanceMatcher, 'function');
}

function testMatchesWithNfkcAndAsciiCaseFold() {
  const matches = createDistanceMatcher(['hello', 'ABC']);

  assert.equal(matches('Say HELLO here.'), true);
  assert.equal(matches('全角ＡＢＣを含みます'), true);
  assert.equal(createDistanceMatcher(['ＨＥＬＬＯ'])('hello'), true);
  assert.equal(matches('unrelated'), false);
}

function testDoesNotCaseFoldNonAsciiText() {
  assert.equal(createDistanceMatcher(['Ä'])('ä'), false);
  assert.equal(createDistanceMatcher(['Σ'])('σ'), false);
}

function testPreservesWhitespaceAndLineBreaks() {
  assert.equal(createDistanceMatcher(['A  B'])('prefix A  B suffix'), true);
  assert.equal(createDistanceMatcher(['A  B'])('prefix A B suffix'), false);
  assert.equal(createDistanceMatcher(['A B'])('A\nB'), false);
  assert.equal(createDistanceMatcher(['A\nB'])('A\nB'), true);
}

function testTreatsSymbolsHashtagsAndPunctuationLiterally() {
  assert.equal(createDistanceMatcher(['#topic'])('news #TOPIC today'), true);
  assert.equal(createDistanceMatcher(['#topic'])('news topic today'), false);
  assert.equal(createDistanceMatcher(['hello!'])('hello there'), false);
  assert.equal(createDistanceMatcher(['A+B'])('a+b'), true);
}

function testDoesNotTrimTermsOrTokenizeText() {
  assert.equal(createDistanceMatcher([' hello '])('hello'), false);
  assert.equal(createDistanceMatcher(['cat'])('concatenate'), true);
}

function testAlwaysReturnsBooleanOnly() {
  const matches = createDistanceMatcher(['hello']);

  for (const value of ['hello', 'goodbye', '', null, undefined, 42, {}]) {
    assert.equal(typeof matches(value), 'boolean');
  }

  assert.equal(matches('hello'), true);
  assert.equal(matches('goodbye'), false);
  assert.notEqual(typeof matches('hello'), 'object');
}

runTests();
