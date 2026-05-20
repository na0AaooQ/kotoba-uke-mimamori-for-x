'use strict';

const assert = require('node:assert/strict');
const {
  ATTRIBUTES,
  SELECTORS,
  maybeRenderCushionOverlay,
  processCandidatePost
} = require('../content');

function runTests() {
  testMarksCushionCandidate();
  testMarksRiskCheckedWithoutCushion();
  testSkipsEmptyPostText();
  testSkipsAlreadyProcessedPost();
  testDoesNotRenderOverlayWhenDevFlagIsOff();
  testRendersOverlayOnceWhenDevFlagIsOn();

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

function testDoesNotRenderOverlayWhenDevFlagIsOff() {
  let createCount = 0;
  const postNode = createPostNode(['お前なんか存在価値がない']);

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: true
        };
      }
    },
    () => {
      withOverlay(
        {
          createCushionElement() {
            createCount += 1;

            return createElement('section');
          }
        },
        () => {
          const result = processCandidatePost(postNode);

          assert.deepEqual(result, {
            processed: true,
            riskChecked: true,
            shouldCushion: true
          });
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), 'true');
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), null);
          assert.equal(postNode.children.length, 0);
          assert.equal(createCount, 0);
        }
      );
    }
  );
}

function testRendersOverlayOnceWhenDevFlagIsOn() {
  let createCount = 0;
  const postNode = createPostNode(['お前なんか存在価値がない']);
  postNode.setAttribute(ATTRIBUTES.cushionCandidate, 'true');

  withOverlay(
    {
      createCushionElement() {
        createCount += 1;

        return createElement('section');
      }
    },
    () => {
      const firstResult = maybeRenderCushionOverlay(postNode, {
        enableCushionOverlayDev: true
      });
      const secondResult = maybeRenderCushionOverlay(postNode, {
        enableCushionOverlayDev: true
      });

      assert.equal(firstResult, true);
      assert.equal(secondResult, false);
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
      assert.equal(postNode.children.length, 1);
      assert.equal(createCount, 1);
    }
  );
}

function createPostNode(texts) {
  const attributes = new Map();
  const postNode = createElement('article');

  postNode.getAttribute = (name) => attributes.get(name) ?? null;
  postNode.querySelectorAll = (selector) => {
    if (selector !== SELECTORS.text) {
      return [];
    }

    return texts.map((textContent) => ({ textContent }));
  };
  postNode.setAttribute = (name, value) => {
    attributes.set(name, String(value));
  };

  return postNode;
}

function createElement(tagName) {
  const attributes = new Map();

  return {
    children: [],
    nodeType: 1,
    parentNode: null,
    tagName: String(tagName).toUpperCase(),
    get firstChild() {
      return this.children[0] ?? null;
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    insertBefore(childNode, referenceNode) {
      childNode.parentNode = this;

      if (!referenceNode) {
        this.children.push(childNode);
        return childNode;
      }

      const referenceIndex = this.children.indexOf(referenceNode);

      if (referenceIndex === -1) {
        this.children.push(childNode);
        return childNode;
      }

      this.children.splice(referenceIndex, 0, childNode);
      return childNode;
    },
    remove() {
      if (!this.parentNode) {
        return;
      }

      const index = this.parentNode.children.indexOf(this);

      if (index !== -1) {
        this.parentNode.children.splice(index, 1);
      }

      this.parentNode = null;
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

function withOverlay(overlay, callback) {
  const previousOverlay = globalThis.kotobaUkeMimamoriOverlay;
  globalThis.kotobaUkeMimamoriOverlay = overlay;

  try {
    callback();
  } finally {
    if (previousOverlay === undefined) {
      delete globalThis.kotobaUkeMimamoriOverlay;
    } else {
      globalThis.kotobaUkeMimamoriOverlay = previousOverlay;
    }
  }
}

runTests();
