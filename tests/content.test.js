'use strict';

const assert = require('node:assert/strict');
const {
  ATTRIBUTES,
  CLASSES,
  DEV_TEST_CUSHION_TEXT,
  FEATURE_FLAGS,
  SELECTORS,
  isCushionFeatureEnabled,
  loadContentSettings,
  maybeRenderCushionOverlay,
  processCandidatePost,
  scanCandidatePosts
} = require('../content');

const ENABLED_SETTINGS = Object.freeze({
  enabled: true
});

const DISABLED_SETTINGS = Object.freeze({
  enabled: false
});

async function runTests() {
  testCushionFeatureEnabledBySettingsOrDevFlag();
  await testLoadContentSettingsFallsBackToDisabled();
  testDoesNotProcessCandidateWhenEnabledFalse();
  testDoesNotScanCandidatePostsWhenEnabledFalse();
  testMarksCushionCandidate();
  testMarksRiskCheckedWithoutCushion();
  testSkipsEmptyPostText();
  testSkipsAlreadyProcessedPost();
  testDoesNotRenderOverlayWhenFeatureDisabled();
  testRendersOverlayOnceWhenDevFlagIsOn();
  testRendersOverlayNearPostTextWhenAvailable();
  testDoesNotBlurContentWhenDevFlagIsOff();
  testAppliesContentBlurWhenDevFlagIsOn();
  testAppliesContentBlurWhenEnabledIsOn();
  testShowButtonRevealsContentAndRemovesOverlay();
  testHideButtonKeepsContentBlurAndOverlay();
  testDefaultFeatureFlagsAreOff();
  testDoesNotForceDevTestCushionWhenDevTextFlagIsOff();
  testDoesNotForceDevTestCushionWhenOverlayDevFlagIsOff();
  testForcesDevTestCushionOnlyWhenBothFlagsAreOn();
  testDevTestCushionTextIsNotIncludedInOverlay();
  testRendersManuallyMarkedProcessedCandidateWhenDevFlagIsOn();

  console.log('All content tests passed.');
}

function testCushionFeatureEnabledBySettingsOrDevFlag() {
  assert.equal(isCushionFeatureEnabled(DISABLED_SETTINGS), false);
  assert.equal(isCushionFeatureEnabled(ENABLED_SETTINGS), true);
  assert.equal(
    isCushionFeatureEnabled(DISABLED_SETTINGS, {
      enableCushionOverlayDev: true
    }),
    true
  );
}

async function testLoadContentSettingsFallsBackToDisabled() {
  assert.deepEqual(await loadContentSettings(null), DISABLED_SETTINGS);

  assert.deepEqual(
    await loadContentSettings({
      loadSettings() {
        throw new Error('Storage unavailable');
      }
    }),
    DISABLED_SETTINGS
  );
}

function testDoesNotProcessCandidateWhenEnabledFalse() {
  let riskDetectorCallCount = 0;
  let createCount = 0;
  const { bodyNode, postNode, textNode } = createPostNodeWithNestedText('お前なんか存在価値がない');

  withRiskDetector(
    {
      detectTextRisk() {
        riskDetectorCallCount += 1;

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
          const result = processCandidatePost(postNode, FEATURE_FLAGS, DISABLED_SETTINGS);

          assert.deepEqual(result, {
            processed: false,
            riskChecked: false,
            shouldCushion: false
          });
          assert.equal(postNode.getAttribute(ATTRIBUTES.processed), null);
          assert.equal(postNode.getAttribute(ATTRIBUTES.riskChecked), null);
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), null);
          assert.equal(textNode.className.includes(CLASSES.contentBlur), false);
          assert.equal(textNode.getAttribute(ATTRIBUTES.contentBlurred), null);
          assert.equal(bodyNode.children.length, 1);
          assert.equal(riskDetectorCallCount, 0);
          assert.equal(createCount, 0);
        }
      );
    }
  );
}

function testDoesNotScanCandidatePostsWhenEnabledFalse() {
  let riskDetectorCallCount = 0;
  const postNode = createPostNode(['お前なんか存在価値がない']);
  const rootNode = createElement('main');

  rootNode.querySelectorAll = () => [postNode];

  withRiskDetector(
    {
      detectTextRisk() {
        riskDetectorCallCount += 1;

        return {
          shouldCushion: true
        };
      }
    },
    () => {
      scanCandidatePosts(rootNode, DISABLED_SETTINGS);

      assert.equal(postNode.getAttribute(ATTRIBUTES.processed), null);
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
      assert.equal(riskDetectorCallCount, 0);
    }
  );
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
      const result = processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);

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
      const result = processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);

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
      const result = processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);

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
      const result = processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);

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

function testDoesNotRenderOverlayWhenFeatureDisabled() {
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
          const result = processCandidatePost(postNode, FEATURE_FLAGS, DISABLED_SETTINGS);

          assert.deepEqual(result, {
            processed: false,
            riskChecked: false,
            shouldCushion: false
          });
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), null);
          assert.equal(postNode.children.length, 0);
          assert.equal(createCount, 0);
        }
      );
    }
  );
}

function testAppliesContentBlurWhenEnabledIsOn() {
  let createCount = 0;
  const { postNode, textNode } = createPostNodeWithNestedText('お前なんか存在価値がない');

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
          const result = processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);

          assert.deepEqual(result, {
            processed: true,
            riskChecked: true,
            shouldCushion: true
          });
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), 'true');
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
          assert.equal(textNode.className.includes(CLASSES.contentBlur), true);
          assert.equal(textNode.getAttribute(ATTRIBUTES.contentBlurred), 'true');
          assert.equal(createCount, 1);
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

function testRendersOverlayNearPostTextWhenAvailable() {
  let createCount = 0;
  const { bodyNode, postNode, textNode } = createPostNodeWithNestedText();

  postNode.setAttribute(ATTRIBUTES.cushionCandidate, 'true');

  withOverlay(
    {
      createCushionElement() {
        createCount += 1;

        return createElement('section');
      }
    },
    () => {
      const result = maybeRenderCushionOverlay(postNode, {
        enableCushionOverlayDev: true
      });

      assert.equal(result, true);
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
      assert.equal(postNode.parentNode, null);
      assert.equal(bodyNode.children[0].tagName, 'SECTION');
      assert.equal(bodyNode.children[1], textNode);
      assert.equal(createCount, 1);
    }
  );
}

function testDoesNotBlurContentWhenDevFlagIsOff() {
  let createCount = 0;
  const { postNode, textNode } = createPostNodeWithNestedText();

  postNode.setAttribute(ATTRIBUTES.cushionCandidate, 'true');

  withOverlay(
    {
      createCushionElement() {
        createCount += 1;

        return createElement('section');
      }
    },
    () => {
      const result = maybeRenderCushionOverlay(postNode);

      assert.equal(result, false);
      assert.equal(textNode.className.includes(CLASSES.contentBlur), false);
      assert.equal(textNode.getAttribute(ATTRIBUTES.contentBlurred), null);
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), null);
      assert.equal(createCount, 0);
    }
  );
}

function testAppliesContentBlurWhenDevFlagIsOn() {
  let createCount = 0;
  const { postNode, textNode } = createPostNodeWithNestedText();

  postNode.setAttribute(ATTRIBUTES.cushionCandidate, 'true');

  withOverlay(
    {
      createCushionElement() {
        createCount += 1;

        return createElement('section');
      }
    },
    () => {
      const result = maybeRenderCushionOverlay(postNode, {
        enableCushionOverlayDev: true
      });

      assert.equal(result, true);
      assert.equal(textNode.className.includes(CLASSES.contentBlur), true);
      assert.equal(textNode.getAttribute(ATTRIBUTES.contentBlurred), 'true');
      assert.equal(textNode.getAttribute(ATTRIBUTES.contentRevealed), null);
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
      assert.equal(createCount, 1);
    }
  );
}

function testShowButtonRevealsContentAndRemovesOverlay() {
  let onShow = null;
  const { bodyNode, postNode, textNode } = createPostNodeWithNestedText();

  postNode.setAttribute(ATTRIBUTES.cushionCandidate, 'true');

  withOverlay(
    {
      createCushionElement(_result, handlers) {
        onShow = handlers.onShow;

        return createElement('section');
      }
    },
    () => {
      maybeRenderCushionOverlay(postNode, {
        enableCushionOverlayDev: true
      });

      assert.equal(textNode.className.includes(CLASSES.contentBlur), true);
      assert.equal(bodyNode.children.length, 2);

      onShow();

      assert.equal(textNode.className.includes(CLASSES.contentBlur), false);
      assert.equal(textNode.getAttribute(ATTRIBUTES.contentBlurred), null);
      assert.equal(textNode.getAttribute(ATTRIBUTES.contentRevealed), 'true');
      assert.equal(bodyNode.children.length, 1);
      assert.equal(bodyNode.children[0], textNode);
      assert.equal(postNode.parentNode, null);
    }
  );
}

function testHideButtonKeepsContentBlurAndOverlay() {
  let onHide = null;
  const { bodyNode, postNode, textNode } = createPostNodeWithNestedText();

  postNode.setAttribute(ATTRIBUTES.cushionCandidate, 'true');

  withOverlay(
    {
      createCushionElement(_result, handlers) {
        onHide = handlers.onHide;

        return createElement('section');
      }
    },
    () => {
      maybeRenderCushionOverlay(postNode, {
        enableCushionOverlayDev: true
      });

      onHide();

      assert.equal(textNode.className.includes(CLASSES.contentBlur), true);
      assert.equal(textNode.getAttribute(ATTRIBUTES.contentBlurred), 'true');
      assert.equal(textNode.getAttribute(ATTRIBUTES.contentRevealed), null);
      assert.equal(bodyNode.children.length, 2);
      assert.equal(bodyNode.children[1], textNode);
      assert.equal(postNode.parentNode, null);
    }
  );
}

function testDefaultFeatureFlagsAreOff() {
  assert.equal(FEATURE_FLAGS.enableCushionOverlayDev, false);
  assert.equal(FEATURE_FLAGS.enableDevTestCushionText, false);
}

function testDoesNotForceDevTestCushionWhenDevTextFlagIsOff() {
  let createCount = 0;
  const postNode = createPostNode([DEV_TEST_CUSHION_TEXT]);

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: false
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
          const result = processCandidatePost(postNode, {
            enableCushionOverlayDev: true,
            enableDevTestCushionText: false
          });

          assert.deepEqual(result, {
            processed: true,
            riskChecked: true,
            shouldCushion: false
          });
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), null);
          assert.equal(postNode.children.length, 0);
          assert.equal(createCount, 0);
        }
      );
    }
  );
}

function testDoesNotForceDevTestCushionWhenOverlayDevFlagIsOff() {
  let createCount = 0;
  const postNode = createPostNode([DEV_TEST_CUSHION_TEXT]);

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: false
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
          const result = processCandidatePost(postNode, {
            enableCushionOverlayDev: false,
            enableDevTestCushionText: true
          });

          assert.deepEqual(result, {
            processed: false,
            riskChecked: false,
            shouldCushion: false
          });
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), null);
          assert.equal(postNode.children.length, 0);
          assert.equal(createCount, 0);
        }
      );
    }
  );
}

function testForcesDevTestCushionOnlyWhenBothFlagsAreOn() {
  let createCount = 0;
  const postNode = createPostNode([DEV_TEST_CUSHION_TEXT]);

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: false
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
          const result = processCandidatePost(postNode, {
            enableCushionOverlayDev: true,
            enableDevTestCushionText: true
          });

          assert.deepEqual(result, {
            processed: true,
            riskChecked: true,
            shouldCushion: true
          });
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), 'true');
          assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
          assert.equal(postNode.children.length, 1);
          assert.equal(createCount, 1);
        }
      );
    }
  );
}

function testDevTestCushionTextIsNotIncludedInOverlay() {
  let overlayResult = null;
  const postNode = createPostNode([DEV_TEST_CUSHION_TEXT]);

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: false
        };
      }
    },
    () => {
      withOverlay(
        {
          createCushionElement(result) {
            overlayResult = result;

            const element = createElement('section');
            element.textContent = result.reasonMessageKey;

            return element;
          }
        },
        () => {
          processCandidatePost(postNode, {
            enableCushionOverlayDev: true,
            enableDevTestCushionText: true
          });

          assert.deepEqual(overlayResult, {
            reasonMessageKey: 'reasonGeneric'
          });
          assert.equal(postNode.children[0].textContent.includes(DEV_TEST_CUSHION_TEXT), false);
        }
      );
    }
  );
}

function testRendersManuallyMarkedProcessedCandidateWhenDevFlagIsOn() {
  let createCount = 0;
  const postNode = createPostNode(['通常の確認用テキスト']);

  postNode.setAttribute(ATTRIBUTES.processed, 'true');
  postNode.setAttribute(ATTRIBUTES.cushionCandidate, 'true');

  withOverlay(
    {
      createCushionElement() {
        createCount += 1;

        return createElement('section');
      }
    },
    () => {
      const result = processCandidatePost(postNode, {
        enableCushionOverlayDev: true
      });

      assert.deepEqual(result, {
        processed: false,
        riskChecked: false,
        shouldCushion: false
      });
      assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
      assert.equal(postNode.children.length, 1);
      assert.equal(createCount, 1);
    }
  );
}

function createPostNodeWithNestedText(textContent = '') {
  const postNode = createElement('article');
  const bodyNode = createElement('div');
  const textNode = createElement('div');

  textNode.textContent = textContent;
  postNode.insertBefore(bodyNode, null);
  bodyNode.insertBefore(textNode, null);

  postNode.querySelector = (selector) => {
    if (selector !== SELECTORS.text) {
      return null;
    }

    return textNode;
  };
  postNode.querySelectorAll = (selector) => {
    if (selector !== SELECTORS.text) {
      return [];
    }

    return [textNode];
  };

  return {
    bodyNode,
    postNode,
    textNode
  };
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
    className: '',
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
    removeAttribute(name) {
      attributes.delete(name);
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

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
