'use strict';

const assert = require('node:assert/strict');
const { buildCushionGuidance } = require('../cushion-guidance');
const i18nApi = require('../i18n');
const settingsApi = require('../settings');

delete globalThis.kotobaUkeMimamoriCushionGuidance;

const {
  ATTRIBUTES,
  CLASSES,
  CUSHION_THRESHOLDS,
  DEV_TEST_CUSHION_TEXT,
  FEATURE_FLAGS,
  FALLBACK_SETTINGS,
  SELECTORS,
  createContentLocalizer,
  getCushionThreshold,
  initialize,
  isCushionFeatureEnabled,
  loadContentSettings,
  maybeRenderCushionOverlay,
  normalizeContentSettings,
  prepareContentLocalization,
  processCandidatePost,
  scanCandidatePosts
} = require('../content');

const ENABLED_SETTINGS = Object.freeze({
  enabled: true,
  cushionSensitivity: 'standard',
  uiLanguage: 'auto'
});

const DISABLED_SETTINGS = Object.freeze({
  enabled: false,
  cushionSensitivity: 'standard',
  uiLanguage: 'auto'
});

async function runTests() {
  testCushionFeatureEnabledBySettingsOrDevFlag();
  await testLoadContentSettingsFallsBackToDisabled();
  testContentSettingsKeepSupportedUiLanguages();
  await testPreparesSelectedLocaleAndFallsBackSafely();
  testCushionThresholdMapping();
  testPassesSelectedThresholdToRiskDetector();
  testDoesNotProcessCandidateWhenEnabledFalse();
  testDoesNotScanCandidatePostsWhenEnabledFalse();
  testMarksCushionCandidate();
  testPassesCushionGuidanceToOverlay();
  testMarksRiskCheckedWithoutCushion();
  testRendersWithoutCushionGuidanceApi();
  testSkipsEmptyPostText();
  testSkipsAlreadyProcessedPost();
  testDoesNotRenderOverlayWhenFeatureDisabled();
  testRendersOverlayOnceWhenDevFlagIsOn();
  testRendersOverlayNearPostTextWhenAvailable();
  testDoesNotBlurContentWhenDevFlagIsOff();
  testAppliesContentBlurWhenDevFlagIsOn();
  testAppliesContentBlurWhenEnabledIsOn();
  testProcessesQuotedPostSourceTextSeparately();
  testPassesCushionGuidanceToQuotedSourceOnly();
  testPassesIndependentCushionGuidanceToQuotedPostTexts();
  testPassesSameLocalizationToQuotedPostTexts();
  testDoesNotInsertDuplicateCushionForQuotedSource();
  testShowButtonRevealsQuotedSourceOnly();
  testShowButtonRevealsOnlyItsOwnQuotedPostText();
  testShowButtonRevealsContentAndRemovesOverlay();
  testHideButtonKeepsContentBlurAndOverlay();
  testDefaultFeatureFlagsAreOff();
  testDoesNotForceDevTestCushionWhenDevTextFlagIsOff();
  testDoesNotForceDevTestCushionWhenOverlayDevFlagIsOff();
  testForcesDevTestCushionOnlyWhenBothFlagsAreOn();
  testDevTestCushionTextIsNotIncludedInOverlay();
  testDoesNotPassGuidanceForForcedDevTestCushion();
  testRetainsCushionGuidanceWhenCushionElementCreationFails();
  testRetainsAndCleansUpCushionGuidanceAroundOverlayInsertion();
  testRendersManuallyMarkedProcessedCandidateWhenDevFlagIsOn();
  await testInitializePreparesAndSharesLocalizationOnce();

  console.log('All content tests passed.');
}

function testCushionFeatureEnabledBySettingsOrDevFlag() {
  assert.deepEqual(FALLBACK_SETTINGS, DISABLED_SETTINGS);
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

  assert.deepEqual(
    await loadContentSettings({
      loadSettings() {
        return { enabled: true, cushionSensitivity: 'unsupported', uiLanguage: 'unsupported' };
      }
    }),
    ENABLED_SETTINGS
  );
}

function testContentSettingsKeepSupportedUiLanguages() {
  for (const uiLanguage of ['auto', 'ja', 'en']) {
    assert.deepEqual(
      normalizeContentSettings(
        {
          enabled: true,
          cushionSensitivity: 'high',
          uiLanguage
        },
        settingsApi
      ),
      {
        enabled: true,
        cushionSensitivity: 'high',
        uiLanguage
      }
    );
  }

  for (const uiLanguage of [undefined, null, '', 'unsupported']) {
    assert.equal(
      normalizeContentSettings(
        {
          enabled: true,
          cushionSensitivity: 'standard',
          uiLanguage
        },
        settingsApi
      ).uiLanguage,
      'auto'
    );
  }
}

async function testPreparesSelectedLocaleAndFallsBackSafely() {
  const resolvedLanguages = [];
  const loadedLanguages = [];
  const fakeI18nApi = {
    getLocaleMessage: i18nApi.getLocaleMessage,
    getMessage: (key) => `chrome:${key}`,
    loadLocaleMessages: async (resolvedLanguage) => {
      loadedLanguages.push(resolvedLanguage);

      return createState2LocaleMessages(resolvedLanguage);
    },
    resolveUiLanguage(uiLanguage) {
      const resolvedLanguage = i18nApi.resolveUiLanguage(uiLanguage, {
        getUILanguage: () => 'ja-JP'
      });

      resolvedLanguages.push(resolvedLanguage);
      return resolvedLanguage;
    }
  };

  for (const [uiLanguage, expectedLanguage] of [
    ['auto', 'ja'],
    ['ja', 'ja'],
    ['en', 'en']
  ]) {
    const localization = await prepareContentLocalization(
      { ...ENABLED_SETTINGS, uiLanguage },
      fakeI18nApi
    );

    assert.equal(localization.getMessage('cushionTitle'), `${expectedLanguage}:title`);
    assert.equal(localization.getMessage('missingKey'), 'chrome:missingKey');
    assert.equal(localization.resolvedLanguage, expectedLanguage);
    assert.equal(localization.isResolvedLanguageReliable, true);
  }

  assert.deepEqual(resolvedLanguages, ['ja', 'ja', 'en']);
  assert.deepEqual(loadedLanguages, ['ja', 'ja', 'en']);

  const failedLocalization = await prepareContentLocalization(ENABLED_SETTINGS, {
    getLocaleMessage: i18nApi.getLocaleMessage,
    getMessage: (key) => `fallback:${key}`,
    loadLocaleMessages: async () => {
      throw new Error('Locale unavailable');
    },
    resolveUiLanguage: () => 'ja'
  });

  assert.equal(failedLocalization.getMessage('cushionTitle'), 'fallback:cushionTitle');
  assert.equal(failedLocalization.resolvedLanguage, 'ja');
  assert.equal(failedLocalization.isResolvedLanguageReliable, false);

  const incompleteLocalization = await prepareContentLocalization(ENABLED_SETTINGS, {
    getLocaleMessage: i18nApi.getLocaleMessage,
    getMessage: (key) => `fallback:${key}`,
    loadLocaleMessages: async () => ({
      cushionDismissedMessage: { message: '今は読まないようにしました。' }
    }),
    resolveUiLanguage: () => 'ja'
  });

  assert.equal(incompleteLocalization.resolvedLanguage, 'ja');
  assert.equal(incompleteLocalization.isResolvedLanguageReliable, false);
  assert.equal(
    incompleteLocalization.getMessage('cushionDismissedMessage'),
    '今は読まないようにしました。'
  );
  assert.equal(
    incompleteLocalization.getMessage('cushionDismissedLeavePost'),
    'fallback:cushionDismissedLeavePost'
  );

  const unresolvedLocalization = await prepareContentLocalization(ENABLED_SETTINGS, {
    getLocaleMessage: i18nApi.getLocaleMessage,
    getMessage: (key) => `fallback:${key}`,
    loadLocaleMessages: async () => createState2LocaleMessages('en'),
    resolveUiLanguage() {
      throw new Error('Language resolution unavailable');
    }
  });

  assert.equal(unresolvedLocalization.resolvedLanguage, null);
  assert.equal(unresolvedLocalization.isResolvedLanguageReliable, false);
  assert.equal(createContentLocalizer({}, null), null);
}

function testCushionThresholdMapping() {
  assert.deepEqual(CUSHION_THRESHOLDS, {
    low: 100,
    standard: 80,
    high: 60
  });
  assert.equal(getCushionThreshold('low'), 100);
  assert.equal(getCushionThreshold('standard'), 80);
  assert.equal(getCushionThreshold('high'), 60);
  assert.equal(getCushionThreshold('unsupported'), 80);
}

function testPassesSelectedThresholdToRiskDetector() {
  for (const [cushionSensitivity, threshold] of Object.entries(CUSHION_THRESHOLDS)) {
    let receivedOptions = null;
    const postNode = createPostNode(['確認用テキスト']);

    withRiskDetector(
      {
        detectTextRisk(_text, options) {
          receivedOptions = options;

          return {
            shouldCushion: false
          };
        }
      },
      () => {
        processCandidatePost(postNode, FEATURE_FLAGS, {
          enabled: true,
          cushionSensitivity
        });
      }
    );

    assert.deepEqual(receivedOptions, { threshold });
  }
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

function testPassesCushionGuidanceToOverlay() {
  let overlayResult = null;
  const riskResult = {
    shouldCushion: true,
    score: 85,
    categories: ['personality_attack'],
    reasons: ['internal reason'],
    matchedRules: ['internal.rule']
  };
  const { postNode } = createPostNodeWithNestedText('お前なんか存在価値がない');

  withRiskDetector(
    {
      detectTextRisk() {
        return riskResult;
      }
    },
    () => {
      withCushionGuidance({ buildCushionGuidance }, () => {
        withOverlay(
          {
            createCushionElement(result) {
              overlayResult = result;

              return createElement('section');
            }
          },
          () => {
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
          }
        );
      });
    }
  );

  assert.deepEqual(overlayResult, {
    reasonMessageKey: 'reasonGeneric',
    guidance: {
      strengthKey: 'strong',
      tendencyKeys: ['directedStrongLanguage']
    }
  });
  assert.equal(Object.hasOwn(overlayResult, 'score'), false);
  assert.equal(Object.hasOwn(overlayResult, 'categories'), false);
  assert.equal(Object.hasOwn(overlayResult, 'reasons'), false);
  assert.equal(Object.hasOwn(overlayResult, 'matchedRules'), false);
}

function testMarksRiskCheckedWithoutCushion() {
  let guidanceBuildCount = 0;
  let overlayCreateCount = 0;
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
      withCushionGuidance(
        {
          buildCushionGuidance() {
            guidanceBuildCount += 1;

            return {
              strengthKey: 'strong',
              tendencyKeys: ['directedStrongLanguage']
            };
          }
        },
        () => {
          withOverlay(
            {
              createCushionElement() {
                overlayCreateCount += 1;

                return createElement('section');
              }
            },
            () => {
              const result = processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);

              assert.deepEqual(result, {
                processed: true,
                riskChecked: true,
                shouldCushion: false
              });
            }
          );
        }
      );
    }
  );

  assert.equal(postNode.getAttribute(ATTRIBUTES.processed), 'true');
  assert.equal(postNode.getAttribute(ATTRIBUTES.riskChecked), 'true');
  assert.equal(postNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
  assert.equal(guidanceBuildCount, 0);
  assert.equal(overlayCreateCount, 0);
}

function testRendersWithoutCushionGuidanceApi() {
  const unavailableApis = [
    null,
    {},
    {
      buildCushionGuidance() {
        throw new Error('Guidance unavailable');
      }
    }
  ];

  for (const cushionGuidanceApi of unavailableApis) {
    let overlayResult = null;
    const { postNode } = createPostNodeWithNestedText('お前なんか存在価値がない');

    withRiskDetector(
      {
        detectTextRisk() {
          return {
            shouldCushion: true,
            score: 85,
            categories: ['personality_attack']
          };
        }
      },
      () => {
        withCushionGuidance(cushionGuidanceApi, () => {
          withOverlay(
            {
              createCushionElement(result) {
                overlayResult = result;

                return createElement('section');
              }
            },
            () => {
              processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
            }
          );
        });
      }
    );

    assert.deepEqual(overlayResult, {
      reasonMessageKey: 'reasonGeneric'
    });
    assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
  }
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

function testProcessesQuotedPostSourceTextSeparately() {
  const receivedTexts = [];
  let createCount = 0;
  const { mainBodyNode, mainTextNode, postNode, quoteBodyNode, quoteTextNode } =
    createQuotedPostNodeWithNestedTexts('引用している側の通常本文です', 'お前なんか存在価値がない');

  withRiskDetector(
    {
      detectTextRisk(text) {
        receivedTexts.push(text);

        return {
          shouldCushion: text === 'お前なんか存在価値がない'
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
          assert.deepEqual(receivedTexts, [
            '引用している側の通常本文です',
            'お前なんか存在価値がない'
          ]);
          assert.equal(postNode.getAttribute(ATTRIBUTES.processed), null);
          assert.equal(mainTextNode.getAttribute(ATTRIBUTES.processed), 'true');
          assert.equal(mainTextNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
          assert.equal(mainTextNode.className.includes(CLASSES.contentBlur), false);
          assert.equal(quoteTextNode.getAttribute(ATTRIBUTES.processed), 'true');
          assert.equal(quoteTextNode.getAttribute(ATTRIBUTES.cushionCandidate), 'true');
          assert.equal(quoteTextNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
          assert.equal(quoteTextNode.className.includes(CLASSES.contentBlur), true);
          assert.equal(quoteTextNode.getAttribute(ATTRIBUTES.contentBlurred), 'true');
          assert.equal(mainBodyNode.children.length, 1);
          assert.equal(mainBodyNode.children[0], mainTextNode);
          assert.equal(quoteBodyNode.children[0].tagName, 'SECTION');
          assert.equal(quoteBodyNode.children[1], quoteTextNode);
          assert.equal(createCount, 1);
        }
      );
    }
  );
}

function testPassesCushionGuidanceToQuotedSourceOnly() {
  const overlayResults = [];
  const { mainTextNode, postNode, quoteTextNode } = createQuotedPostNodeWithNestedTexts(
    '引用している側の通常本文です',
    'お前なんか存在価値がない'
  );

  withRiskDetector(
    {
      detectTextRisk(text) {
        if (text === 'お前なんか存在価値がない') {
          return {
            shouldCushion: true,
            score: 85,
            categories: ['personality_attack']
          };
        }

        return {
          shouldCushion: false,
          score: 0,
          categories: []
        };
      }
    },
    () => {
      withCushionGuidance({ buildCushionGuidance }, () => {
        withOverlay(
          {
            createCushionElement(result) {
              overlayResults.push(result);

              return createElement('section');
            }
          },
          () => {
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
          }
        );
      });
    }
  );

  assert.equal(mainTextNode.getAttribute(ATTRIBUTES.cushionCandidate), null);
  assert.equal(quoteTextNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
  assert.deepEqual(overlayResults, [
    {
      reasonMessageKey: 'reasonGeneric',
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['directedStrongLanguage']
      }
    }
  ]);
}

function testPassesIndependentCushionGuidanceToQuotedPostTexts() {
  const overlayResults = [];
  const { mainTextNode, postNode, quoteTextNode } = createQuotedPostNodeWithNestedTexts(
    '引用している側の強い本文です',
    '引用元のより強い本文です'
  );

  withRiskDetector(
    {
      detectTextRisk(text) {
        if (text === '引用している側の強い本文です') {
          return {
            shouldCushion: true,
            score: 85,
            categories: ['personality_attack']
          };
        }

        return {
          shouldCushion: true,
          score: 95,
          categories: ['threat_or_harm', 'persistent_attack']
        };
      }
    },
    () => {
      withCushionGuidance({ buildCushionGuidance }, () => {
        withOverlay(
          {
            createCushionElement(result) {
              overlayResults.push(result);

              return createElement('section');
            }
          },
          () => {
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
          }
        );
      });
    }
  );

  assert.equal(mainTextNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
  assert.equal(quoteTextNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
  assert.deepEqual(overlayResults, [
    {
      reasonMessageKey: 'reasonGeneric',
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['directedStrongLanguage']
      }
    },
    {
      reasonMessageKey: 'reasonGeneric',
      guidance: {
        strengthKey: 'veryStrong',
        tendencyKeys: ['personalSafety', 'possiblyPressuringLanguage']
      }
    }
  ]);
}

function testPassesSameLocalizationToQuotedPostTexts() {
  const receivedLocalizations = [];
  const localization = Object.freeze({
    getMessage: (key) => `en:${key}`
  });
  const { postNode } = createQuotedPostNodeWithNestedTexts(
    '引用している側の強い本文です',
    '引用元の強い本文です'
  );

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: true,
          score: 85,
          categories: ['personality_attack']
        };
      }
    },
    () => {
      withCushionGuidance({ buildCushionGuidance }, () => {
        withOverlay(
          {
            createCushionElement(_result, _handlers, receivedLocalization) {
              receivedLocalizations.push(receivedLocalization);

              return createElement('section');
            }
          },
          () => {
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS, localization);
          }
        );
      });
    }
  );

  assert.deepEqual(receivedLocalizations, [localization, localization]);
}

function testDoesNotInsertDuplicateCushionForQuotedSource() {
  let createCount = 0;
  let riskDetectorCallCount = 0;
  const { postNode, quoteBodyNode, quoteTextNode } = createQuotedPostNodeWithNestedTexts(
    '引用している側の通常本文です',
    'お前なんか存在価値がない'
  );

  withRiskDetector(
    {
      detectTextRisk(text) {
        riskDetectorCallCount += 1;

        return {
          shouldCushion: text === 'お前なんか存在価値がない'
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
          processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
          processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);

          assert.equal(riskDetectorCallCount, 2);
          assert.equal(createCount, 1);
          assert.equal(quoteBodyNode.children.length, 2);
          assert.equal(quoteBodyNode.children[0].tagName, 'SECTION');
          assert.equal(quoteBodyNode.children[1], quoteTextNode);
        }
      );
    }
  );
}

function testShowButtonRevealsQuotedSourceOnly() {
  let onShow = null;
  const { mainTextNode, postNode, quoteBodyNode, quoteTextNode } =
    createQuotedPostNodeWithNestedTexts('引用している側の通常本文です', 'お前なんか存在価値がない');

  withRiskDetector(
    {
      detectTextRisk(text) {
        return {
          shouldCushion: text === 'お前なんか存在価値がない'
        };
      }
    },
    () => {
      withOverlay(
        {
          createCushionElement(_result, handlers) {
            onShow = handlers.onShow;

            return createElement('section');
          }
        },
        () => {
          processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);

          assert.equal(quoteTextNode.className.includes(CLASSES.contentBlur), true);
          assert.equal(mainTextNode.className.includes(CLASSES.contentBlur), false);
          assert.equal(quoteBodyNode.children.length, 2);

          onShow();

          assert.equal(quoteTextNode.className.includes(CLASSES.contentBlur), false);
          assert.equal(quoteTextNode.getAttribute(ATTRIBUTES.contentBlurred), null);
          assert.equal(quoteTextNode.getAttribute(ATTRIBUTES.contentRevealed), 'true');
          assert.equal(mainTextNode.getAttribute(ATTRIBUTES.contentRevealed), null);
          assert.equal(quoteBodyNode.children.length, 1);
          assert.equal(quoteBodyNode.children[0], quoteTextNode);
        }
      );
    }
  );
}

function testShowButtonRevealsOnlyItsOwnQuotedPostText() {
  const renderedCushions = [];
  const { mainBodyNode, mainTextNode, postNode, quoteBodyNode, quoteTextNode } =
    createQuotedPostNodeWithNestedTexts('引用している側の本文です', '引用元の本文です');

  withRiskDetector(
    {
      detectTextRisk(text) {
        return {
          shouldCushion: true,
          score: text === '引用している側の本文です' ? 85 : 95,
          categories:
            text === '引用している側の本文です'
              ? ['personality_attack']
              : ['threat_or_harm', 'persistent_attack']
        };
      }
    },
    () => {
      withCushionGuidance({ buildCushionGuidance }, () => {
        withOverlay(
          {
            createCushionElement(_result, handlers) {
              const cushionElement = createElement('section');
              renderedCushions.push({ cushionElement, handlers });

              return cushionElement;
            }
          },
          () => {
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
          }
        );
      });
    }
  );

  assert.equal(renderedCushions.length, 2);
  assert.equal(mainTextNode.className.includes(CLASSES.contentBlur), true);
  assert.equal(quoteTextNode.className.includes(CLASSES.contentBlur), true);

  renderedCushions[0].handlers.onShow();

  assert.equal(mainTextNode.className.includes(CLASSES.contentBlur), false);
  assert.equal(mainBodyNode.children.length, 1);
  assert.equal(mainBodyNode.children[0], mainTextNode);
  assert.equal(quoteTextNode.className.includes(CLASSES.contentBlur), true);
  assert.equal(quoteBodyNode.children.length, 2);

  renderedCushions[1].handlers.onShow();

  assert.equal(mainTextNode.getAttribute(ATTRIBUTES.contentRevealed), 'true');
  assert.equal(quoteTextNode.className.includes(CLASSES.contentBlur), false);
  assert.equal(quoteBodyNode.children.length, 1);
  assert.equal(quoteBodyNode.children[0], quoteTextNode);
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

function testDoesNotPassGuidanceForForcedDevTestCushion() {
  let overlayResult = null;
  const postNode = createPostNode([DEV_TEST_CUSHION_TEXT]);

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: false,
          score: 85,
          categories: ['personality_attack']
        };
      }
    },
    () => {
      withCushionGuidance({ buildCushionGuidance }, () => {
        withOverlay(
          {
            createCushionElement(result) {
              overlayResult = result;

              return createElement('section');
            }
          },
          () => {
            processCandidatePost(postNode, {
              enableCushionOverlayDev: true,
              enableDevTestCushionText: true
            });
          }
        );
      });
    }
  );

  assert.deepEqual(overlayResult, {
    reasonMessageKey: 'reasonGeneric'
  });
}

function testRetainsCushionGuidanceWhenCushionElementCreationFails() {
  const overlayResults = [];
  let shouldCreateElement = false;
  const { postNode } = createPostNodeWithNestedText('お前なんか存在価値がない');

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: true,
          score: 85,
          categories: ['personality_attack']
        };
      }
    },
    () => {
      withCushionGuidance({ buildCushionGuidance }, () => {
        withOverlay(
          {
            createCushionElement(result) {
              overlayResults.push(result);

              return shouldCreateElement ? createElement('section') : null;
            }
          },
          () => {
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
            shouldCreateElement = true;
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
          }
        );
      });
    }
  );

  assert.deepEqual(overlayResults, [
    {
      reasonMessageKey: 'reasonGeneric',
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['directedStrongLanguage']
      }
    },
    {
      reasonMessageKey: 'reasonGeneric',
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['directedStrongLanguage']
      }
    }
  ]);
  assert.equal(postNode.getAttribute(ATTRIBUTES.cushionRendered), 'true');
}

function testRetainsAndCleansUpCushionGuidanceAroundOverlayInsertion() {
  const overlayResults = [];
  const postNode = createPostNode(['お前なんか存在価値がない']);
  const insertBefore = postNode.insertBefore;

  postNode.insertBefore = undefined;

  withRiskDetector(
    {
      detectTextRisk() {
        return {
          shouldCushion: true,
          score: 85,
          categories: ['personality_attack']
        };
      }
    },
    () => {
      withCushionGuidance({ buildCushionGuidance }, () => {
        withOverlay(
          {
            createCushionElement(result) {
              overlayResults.push(result);

              return createElement('section');
            }
          },
          () => {
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
            postNode.insertBefore = insertBefore;
            processCandidatePost(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
            postNode.setAttribute(ATTRIBUTES.cushionRendered, 'false');
            maybeRenderCushionOverlay(postNode, FEATURE_FLAGS, ENABLED_SETTINGS);
          }
        );
      });
    }
  );

  assert.deepEqual(overlayResults, [
    {
      reasonMessageKey: 'reasonGeneric',
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['directedStrongLanguage']
      }
    },
    {
      reasonMessageKey: 'reasonGeneric',
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['directedStrongLanguage']
      }
    },
    {
      reasonMessageKey: 'reasonGeneric'
    }
  ]);
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

async function testInitializePreparesAndSharesLocalizationOnce() {
  const previousDocument = globalThis.document;
  const previousMutationObserver = globalThis.MutationObserver;
  const previousOverlay = globalThis.kotobaUkeMimamoriOverlay;
  const previousRiskDetector = globalThis.kotobaUkeMimamoriRiskDetector;
  const previousCushionGuidance = globalThis.kotobaUkeMimamoriCushionGuidance;
  const firstPostNode = createPostNode(['最初の確認用テキスト']);
  const secondPostNode = createPostNode(['次の確認用テキスト']);
  const rootNode = createElement('main');
  const receivedLocalizations = [];
  const receivedMessageKeys = [];
  let localeLoadCount = 0;

  rootNode.querySelectorAll = (selector) =>
    selector === SELECTORS.post ? [firstPostNode, secondPostNode] : [];

  globalThis.document = { body: rootNode };
  delete globalThis.MutationObserver;
  globalThis.kotobaUkeMimamoriRiskDetector = {
    detectTextRisk() {
      return {
        shouldCushion: true,
        score: 85,
        categories: ['personality_attack']
      };
    }
  };
  globalThis.kotobaUkeMimamoriCushionGuidance = { buildCushionGuidance };
  globalThis.kotobaUkeMimamoriOverlay = {
    createCushionElement(_result, _handlers, localization) {
      receivedLocalizations.push(localization);
      receivedMessageKeys.push(localization.getMessage('cushionTitle'));

      return createElement('section');
    }
  };

  const initializationI18nApi = {
    getLocaleMessage: i18nApi.getLocaleMessage,
    getMessage: (key) => `fallback:${key}`,
    loadLocaleMessages: async (resolvedLanguage) => {
      localeLoadCount += 1;
      assert.equal(resolvedLanguage, 'en');

      return {
        ...createState2LocaleMessages('en'),
        cushionTitle: { message: 'English cushion title' }
      };
    },
    resolveUiLanguage: i18nApi.resolveUiLanguage
  };

  try {
    const initializedResult = await initialize(
      {
        DEFAULT_SETTINGS: settingsApi.DEFAULT_SETTINGS,
        loadSettings: async () => ({
          enabled: true,
          cushionSensitivity: 'standard',
          uiLanguage: 'en'
        }),
        normalizeSettings: settingsApi.normalizeSettings
      },
      FEATURE_FLAGS,
      initializationI18nApi
    );

    assert.equal(initializedResult, true);
    assert.equal(localeLoadCount, 1);
    assert.equal(receivedLocalizations.length, 2);
    assert.equal(receivedLocalizations[0], receivedLocalizations[1]);
    assert.equal(receivedLocalizations[0].resolvedLanguage, 'en');
    assert.equal(receivedLocalizations[0].isResolvedLanguageReliable, true);
    assert.deepEqual(receivedMessageKeys, ['English cushion title', 'English cushion title']);
    assert.equal(receivedMessageKeys.includes('最初の確認用テキスト'), false);
    assert.equal(receivedMessageKeys.includes('次の確認用テキスト'), false);
  } finally {
    restoreGlobalValue('document', previousDocument);
    restoreGlobalValue('MutationObserver', previousMutationObserver);
    restoreGlobalValue('kotobaUkeMimamoriOverlay', previousOverlay);
    restoreGlobalValue('kotobaUkeMimamoriRiskDetector', previousRiskDetector);
    restoreGlobalValue('kotobaUkeMimamoriCushionGuidance', previousCushionGuidance);
  }
}

function createState2LocaleMessages(language) {
  return {
    cushionTitle: { message: `${language}:title` },
    cushionDismissedMessage: { message: `${language}:dismissed` },
    cushionDismissedBody: { message: `${language}:later` },
    cushionDismissedLeavePost: { message: `${language}:leave` },
    cushionDismissedDistanceOptions: { message: `${language}:distance` },
    cushionProtectYourHeartLink: { message: `${language}:protect-link` },
    linkOpensInNewTab: { message: `${language}:new-tab` },
    buttonShowContent: { message: `${language}:show` }
  };
}

function createPostNodeWithNestedText(textContent = '') {
  const postNode = createElement('article');
  const bodyNode = createElement('div');
  const textNode = createElement('div');

  textNode.textContent = textContent;
  textNode.matches = (selector) => selector === SELECTORS.text;
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

function createQuotedPostNodeWithNestedTexts(mainText, quoteText) {
  const postNode = createElement('article');
  const mainBodyNode = createElement('div');
  const quoteCardNode = createElement('div');
  const quoteBodyNode = createElement('div');
  const mainTextNode = createElement('div');
  const quoteTextNode = createElement('div');

  mainTextNode.textContent = mainText;
  mainTextNode.matches = (selector) => selector === SELECTORS.text;
  quoteTextNode.textContent = quoteText;
  quoteTextNode.matches = (selector) => selector === SELECTORS.text;

  postNode.insertBefore(mainBodyNode, null);
  mainBodyNode.insertBefore(mainTextNode, null);
  postNode.insertBefore(quoteCardNode, null);
  quoteCardNode.insertBefore(quoteBodyNode, null);
  quoteBodyNode.insertBefore(quoteTextNode, null);

  postNode.querySelector = (selector) => {
    if (selector !== SELECTORS.text) {
      return null;
    }

    return mainTextNode;
  };
  postNode.querySelectorAll = (selector) => {
    if (selector !== SELECTORS.text) {
      return [];
    }

    return [mainTextNode, quoteTextNode];
  };

  return {
    mainBodyNode,
    mainTextNode,
    postNode,
    quoteBodyNode,
    quoteCardNode,
    quoteTextNode
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

function withCushionGuidance(cushionGuidanceApi, callback) {
  const previousCushionGuidanceApi = globalThis.kotobaUkeMimamoriCushionGuidance;
  globalThis.kotobaUkeMimamoriCushionGuidance = cushionGuidanceApi;

  try {
    callback();
  } finally {
    if (previousCushionGuidanceApi === undefined) {
      delete globalThis.kotobaUkeMimamoriCushionGuidance;
    } else {
      globalThis.kotobaUkeMimamoriCushionGuidance = previousCushionGuidanceApi;
    }
  }
}

function restoreGlobalValue(key, value) {
  if (value === undefined) {
    delete globalThis[key];
  } else {
    globalThis[key] = value;
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
