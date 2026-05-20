'use strict';

const assert = require('node:assert/strict');
const { ATTRIBUTES, SELECTORS, processCandidatePost } = require('../content');

function runTests() {
  testMarksCushionCandidate();
  testMarksRiskCheckedWithoutCushion();
  testSkipsEmptyPostText();
  testSkipsAlreadyProcessedPost();

  console.log('All content tests passed.');
}

function testMarksCushionCandidate() {
  const receivedTexts = [];
  const postNode = createPostNode(['  お前なんか存在価値がない  ']);

  withRiskDetector(
    {
      detectTextRisk(text) {
        receivedTexts.push(text);

        return {
          shouldCushion: true
        };
      }
    },
    () => {
      const result = processCandidatePost(postNode);

      assert.deepEqual(result, {
        processed: true,
        riskChecked: true,
        shouldCushion: true
      });
      assert.equal(postNode.getAttribute(ATTRIBUTES.processed), 'true');
      assert.equal(postNode.getAttribute(ATTRIBUTES.riskChecked), 'true');
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), 'true');
      assert.deepEqual(receivedTexts, ['お前なんか存在価値がない']);
    }
  );
}

function testMarksRiskCheckedWithoutCushion() {
  const postNode = createPostNode(['その意見には反対です']);

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: false
        };
      }
    },
    () => {
      const result = processCandidatePost(postNode);

      assert.deepEqual(result, {
        processed: true,
        riskChecked: true,
        shouldCushion: false
      });
      assert.equal(postNode.getAttribute(ATTRIBUTES.processed), 'true');
      assert.equal(postNode.getAttribute(ATTRIBUTES.riskChecked), 'true');
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
    }
  );
}

function testSkipsEmptyPostText() {
  let callCount = 0;
  const postNode = createPostNode(['   ', '\n']);

  withRiskDetector(
    {
      detectTextRisk() {
        callCount += 1;

        return {
          shouldCushion: true
        };
      }
    },
    () => {
      const result = processCandidatePost(postNode);

      assert.deepEqual(result, {
        processed: true,
        riskChecked: false,
        shouldCushion: false
      });
      assert.equal(postNode.getAttribute(ATTRIBUTES.processed), 'true');
      assert.equal(postNode.getAttribute(ATTRIBUTES.riskChecked), null);
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
      assert.equal(callCount, 0);
    }
  );
}

function testSkipsAlreadyProcessedPost() {
  let callCount = 0;
  const postNode = createPostNode(['お前なんか存在価値がない']);
  postNode.setAttribute(ATTRIBUTES.processed, 'true');

  withRiskDetector(
    {
      detectTextRisk() {
        callCount += 1;

        return {
          shouldCushion: true
        };
      }
    },
    () => {
      const result = processCandidatePost(postNode);

      assert.deepEqual(result, {
        processed: false,
        riskChecked: false,
        shouldCushion: false
      });
      assert.equal(postNode.getAttribute(ATTRIBUTES.riskChecked), null);
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
      assert.equal(callCount, 0);
    }
  );
}

function createPostNode(texts) {
  const attributes = new Map();

  return {
    nodeType: 1,
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    querySelectorAll(selector) {
      if (selector !== SELECTORS.text) {
        return [];
      }

      return texts.map((textContent) => ({ textContent }));
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    }
  };
}

function withRiskDetector(riskDetector, callback) {
  const previousRiskDetector = globalThis.kotobaUkeMimamoriRiskDetector;
  globalThis.kotobaUkeMimamoriRiskDetector = riskDetector;

  try {
    callback();
  } finally {
    if (previousRiskDetector === undefined) {
      delete globalThis.kotobaUkeMimamoriRiskDetector;
    } else {
      globalThis.kotobaUkeMimamoriRiskDetector = previousRiskDetector;
    }
  }
}

runTests();
