'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  CUSHION_STYLE_ELEMENT_ID,
  createCushionElement,
  ensureCushionStyles
} = require('../overlay');

const MESSAGES = Object.freeze({
  cushionTitle: '読む前に、少しだけワンクッションを置きました',
  cushionBody: 'この投稿には、心に負荷がかかる可能性のある表現が含まれているかもしれません。',
  reasonGeneric: '心に負荷がかかる可能性のある表現を検知しました',
  cushionGuidanceStrengthLabel: '表現の強さの目安',
  cushionGuidanceTendencyLabel: '検知された表現の傾向',
  cushionGuidanceNote: '固定ルールによる補助的な目安です。',
  cushionGuidanceStrengthSomewhatStrong: 'やや強め',
  cushionGuidanceStrengthStrong: '強め',
  cushionGuidanceStrengthVeryStrong: 'かなり強め',
  cushionGuidanceTendencyPersonalSafety: '身の安全に関わる可能性のある表現',
  cushionGuidanceTendencyPrivacy: '個人情報やプライバシーに関わる可能性のある表現',
  cushionGuidanceTendencyCircumstancesOrBackground: '人の立場や背景などに関わる強い表現',
  cushionGuidanceTendencyDirectedStrongLanguage: '人に向けた強い表現',
  cushionGuidanceTendencyPossiblyPressuringLanguage: '圧を感じる可能性のある表現',
  cushionDismissedMessage: '今は読まないようにしました。',
  cushionDismissedBody: '読みたくなったら、あとから内容を表示できます。',
  cushionDismissedLeavePost: 'このまま内容を見ずに、この投稿から離れることもできます。',
  cushionDismissedDistanceOptions:
    '必要なら、Xのミュートやブロックなどを使って、そのアカウントと距離を取る方法もあります。',
  cushionProtectYourHeartLink: '心を守る使い方を見る',
  linkOpensInNewTab: '新しいタブで開きます',
  buttonShowContent: '内容を表示する',
  buttonHideForNow: '今は見ない'
});
const ENGLISH_MESSAGES = readLocaleMessages('en');

function runTests() {
  testCreatesGenericCushionElement();
  testCreatesButtonElements();
  testCreatesCushionGuidanceElement();
  testRendersStrengthWithoutGuidanceTendencies();
  testRendersOneGuidanceTendency();
  testRendersTwoGuidanceTendenciesInOrder();
  testDoesNotRenderGuidanceWithoutValidData();
  testIgnoresUnknownStrengthKey();
  testIgnoresUnknownTendencyKey();
  testRendersOnlyKnownGuidanceKeys();
  testUsesInjectedJapaneseLocalizerForAllFixedMessages();
  testUsesInjectedEnglishLocalizerThroughDismissedState();
  testFailedLocalizerFallsBackToChromeI18n();
  testHideButtonCollapsesCushionElement();
  testOmitsProtectLinkWhenLocalizationIsUnreliable();
  testOmitsProtectLinkWhenResolvedLanguageIsUnknown();
  testState2AccessibleNamesUseUniqueIds();
  testInjectsCushionStylesOnce();
  testDoesNotRenderPostTextOrInternalRiskDetails();
  testShowButtonHandler();
  testButtonClickStopsDefaultAndPropagation();
  testDoesNotAddRuntimeCommunicationOrScriptedNavigation();

  console.log('All overlay tests passed.');
}

function testCreatesGenericCushionElement() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({ reasonMessageKey: 'reasonGeneric' });

    assert.equal(element.tagName, 'SECTION');
    assert.equal(element.className, 'kum-cushion');
    assert.equal(element.getAttribute('role'), 'group');
    assert.equal(element.children[0].className, 'kum-cushion__title');
    assert.equal(element.children[1].className, 'kum-cushion__body');
    assert.equal(element.children[2].className, 'kum-cushion__reason');
    assert.equal(element.children[3].className, 'kum-cushion__actions');
    assert.equal(element.children[3].children[0].className, 'kum-cushion__button');
    assert.equal(element.children[3].children[1].className, 'kum-cushion__button');
    assert.ok(element.textContent.includes(MESSAGES.cushionTitle));
    assert.ok(element.textContent.includes(MESSAGES.cushionBody));
    assert.ok(element.textContent.includes(MESSAGES.reasonGeneric));
    assert.ok(element.textContent.includes(MESSAGES.buttonShowContent));
    assert.ok(element.textContent.includes(MESSAGES.buttonHideForNow));
    assert.equal(getGuidanceElement(element), null);
  });
}

function testCreatesButtonElements() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({ reasonMessageKey: 'reasonGeneric' });
    const showButton = element.children[3].children[0];
    const hideButton = element.children[3].children[1];

    assert.equal(showButton.tagName, 'BUTTON');
    assert.equal(hideButton.tagName, 'BUTTON');
    assert.equal(showButton.type, 'button');
    assert.equal(hideButton.type, 'button');
    assert.equal(showButton.className, 'kum-cushion__button');
    assert.equal(hideButton.className, 'kum-cushion__button');
  });
}

function testHideButtonCollapsesCushionElement() {
  withFakeDomAndI18n(() => {
    let showCount = 0;
    let hideCount = 0;
    const element = createCushionElement(
      {
        guidance: {
          strengthKey: 'strong',
          tendencyKeys: ['directedStrongLanguage']
        }
      },
      {
        onShow: () => {
          showCount += 1;
        },
        onHide: () => {
          hideCount += 1;
        }
      },
      createReliableLocalization(MESSAGES, 'ja')
    );
    const hideButton = element.children[4].children[1];

    hideButton.click();

    assert.equal(element.className, 'kum-cushion kum-cushion--dismissed');
    assert.equal(element.children.length, 5);
    assert.equal(
      element.children[0].className,
      'kum-cushion__state-2-group kum-cushion__state-2-summary'
    );
    assert.equal(
      element.children[1].className,
      'kum-cushion__state-2-group kum-cushion__state-2-leave'
    );
    assert.equal(
      element.children[2].className,
      'kum-cushion__state-2-group kum-cushion__state-2-distance'
    );
    assert.equal(element.children[3].className, 'kum-cushion__protect-link');
    assert.equal(element.children[4].className, 'kum-cushion__actions');
    assert.deepEqual(
      element.children.slice(0, 3).map((childNode) => childNode.tagName),
      ['P', 'P', 'P']
    );
    assert.equal(element.children[0].children[0].textContent, MESSAGES.cushionDismissedMessage);
    assert.equal(element.children[0].children[1].textContent, MESSAGES.cushionDismissedBody);
    assert.equal(element.children[1].textContent, MESSAGES.cushionDismissedLeavePost);
    assert.equal(element.children[2].textContent, MESSAGES.cushionDismissedDistanceOptions);
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedMessage));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedBody));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedLeavePost));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedDistanceOptions));
    assert.ok(element.textContent.includes(MESSAGES.cushionProtectYourHeartLink));
    assert.ok(element.textContent.includes(MESSAGES.buttonShowContent));
    assert.equal(element.textContent.includes(MESSAGES.buttonHideForNow), false);
    assert.equal(element.textContent.includes(MESSAGES.cushionTitle), false);
    assert.equal(element.textContent.includes(MESSAGES.cushionBody), false);
    assert.equal(element.textContent.includes(MESSAGES.cushionGuidanceStrengthLabel), false);
    assert.equal(element.textContent.includes(MESSAGES.cushionGuidanceStrengthStrong), false);
    assert.equal(element.textContent.includes(MESSAGES.cushionGuidanceTendencyLabel), false);
    assert.equal(
      element.textContent.includes(MESSAGES.cushionGuidanceTendencyDirectedStrongLanguage),
      false
    );
    assert.equal(element.textContent.includes(MESSAGES.cushionGuidanceNote), false);
    assert.equal(hideCount, 1);
    assert.equal(element.getAttribute('tabindex'), '-1');
    assert.equal(element.getAttribute('role'), 'group');
    assert.equal(element.getAttribute('aria-live'), null);
    assert.equal(
      element.getAttribute('aria-labelledby'),
      element.children[0].children[0].getAttribute('id')
    );
    assert.equal(element._focused, true);

    const protectLink = element.children[3];
    const showButton = element.children[4].children[0];

    assert.equal(protectLink.tagName, 'A');
    assert.equal(
      protectLink.getAttribute('href'),
      'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/protect-your-heart.html'
    );
    assert.equal(protectLink.getAttribute('target'), '_blank');
    assert.deepEqual(protectLink.getAttribute('rel').split(/\s+/u).sort(), [
      'noopener',
      'noreferrer'
    ]);
    assert.equal(protectLink.children[0].textContent, MESSAGES.cushionProtectYourHeartLink);
    assert.equal(protectLink.children[1].textContent, ' ↗');
    assert.equal(protectLink.children[1].getAttribute('aria-hidden'), 'true');
    assert.equal(protectLink.children[2].className, 'kum-visually-hidden');
    assert.ok(protectLink.children[2].textContent.includes(MESSAGES.linkOpensInNewTab));
    let linkPreventDefaultCount = 0;
    protectLink.click({
      preventDefault() {
        linkPreventDefaultCount += 1;
      }
    });
    assert.equal(linkPreventDefaultCount, 0);
    assert.equal(protectLink.getAttribute('tabindex'), null);
    assert.equal(showButton.tagName, 'BUTTON');
    assert.equal(showButton.type, 'button');
    assert.equal(showButton.className, 'kum-cushion__button');
    assert.equal(showButton._focused, false);
    assert.equal(showButton.getAttribute('tabindex'), null);

    hideButton.click();
    assert.equal(hideCount, 1);

    showButton.click();

    assert.equal(showCount, 1);
  });
}

function testInjectsCushionStylesOnce() {
  withFakeDomAndI18n((fakeDocument) => {
    const firstResult = ensureCushionStyles();
    const secondResult = ensureCushionStyles();
    const styleElement = fakeDocument.getElementById(CUSHION_STYLE_ELEMENT_ID);

    assert.equal(firstResult, true);
    assert.equal(secondResult, false);
    assert.equal(fakeDocument.head.children.length, 1);
    assert.ok(styleElement.textContent.includes('.kum-cushion'));
    assert.ok(styleElement.textContent.includes('.kum-content-blur'));
    assert.ok(styleElement.textContent.includes('filter: blur(5px)'));
    assert.ok(styleElement.textContent.includes('.kum-cushion--dismissed'));
    assert.ok(styleElement.textContent.includes('.kum-cushion__guidance'));
    assert.ok(styleElement.textContent.includes('.kum-cushion__guidance-note'));
    assert.ok(styleElement.textContent.includes('padding-left: 1.2em'));
    assert.ok(styleElement.textContent.includes('.kum-cushion__state-2-group'));
    assert.ok(styleElement.textContent.includes('.kum-cushion__protect-link:focus-visible'));
    assert.ok(styleElement.textContent.includes('.kum-visually-hidden'));
    assert.equal(styleElement.textContent.includes('display: none'), false);
    assert.equal(styleElement.textContent.includes('visibility: hidden'), false);
    assert.ok(styleElement.textContent.includes('.kum-cushion__button:focus-visible'));
    assert.ok(styleElement.textContent.includes('outline-offset: 2px'));
    assert.ok(styleElement.textContent.includes('outline: 2px solid rgba(245, 158, 11, 0.85)'));
    assert.ok(styleElement.textContent.includes('@media (prefers-color-scheme: dark)'));
    assert.ok(styleElement.textContent.includes('body[data-color-scheme="dark"] .kum-cushion'));
    assert.ok(
      styleElement.textContent.includes('body[data-color-scheme="dark"] .kum-cushion__protect-link')
    );
    assert.ok(styleElement.textContent.includes('background: rgba(43, 35, 27, 0.96)'));
    assert.ok(styleElement.textContent.includes('color: #d6c9a8'));
    assert.ok(styleElement.textContent.includes('outline-color: rgba(252, 211, 77, 0.95)'));
  });
}

function testOmitsProtectLinkWhenLocalizationIsUnreliable() {
  withFakeDomAndI18n(() => {
    const localization = {
      ...createReliableLocalization(MESSAGES, 'ja'),
      isResolvedLanguageReliable: false
    };
    const element = createCushionElement({}, {}, localization);

    element.children[3].children[1].click();

    assert.equal(findElementByClass(element, 'kum-cushion__protect-link'), null);
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedMessage));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedBody));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedLeavePost));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedDistanceOptions));
    assert.equal(element.children[3].className, 'kum-cushion__actions');
    assert.equal(element.children[3].children[0].textContent, MESSAGES.buttonShowContent);
  });
}

function testOmitsProtectLinkWhenResolvedLanguageIsUnknown() {
  withFakeDomAndI18n(() => {
    const localization = createReliableLocalization(MESSAGES, 'unknown');
    const element = createCushionElement({}, {}, localization);

    element.children[3].children[1].click();

    assert.equal(findElementByClass(element, 'kum-cushion__protect-link'), null);
    assert.equal(element.children[3].children[0].tagName, 'BUTTON');
  });
}

function testState2AccessibleNamesUseUniqueIds() {
  withFakeDomAndI18n(() => {
    const localization = createReliableLocalization(MESSAGES, 'ja');
    const firstElement = createCushionElement({}, {}, localization);
    const secondElement = createCushionElement({}, {}, localization);

    firstElement.children[3].children[1].click();
    secondElement.children[3].children[1].click();

    const firstLabelId = firstElement.getAttribute('aria-labelledby');
    const secondLabelId = secondElement.getAttribute('aria-labelledby');

    assert.notEqual(firstLabelId, secondLabelId);
    assert.equal(firstElement.children[0].children[0].getAttribute('id'), firstLabelId);
    assert.equal(secondElement.children[0].children[0].getAttribute('id'), secondLabelId);
    assert.equal(firstElement.getAttribute('tabindex'), '-1');
    assert.equal(secondElement.getAttribute('tabindex'), '-1');
    assert.equal(firstElement._focused, true);
    assert.equal(secondElement._focused, true);
  });
}

function testDoesNotRenderPostTextOrInternalRiskDetails() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      postText: 'これはUIに出してはいけない投稿本文です',
      score: 100,
      matchedRules: ['existence_denial.strong_phrase'],
      categories: ['existence_denial'],
      reasons: ['存在否定に近い表現の可能性があります'],
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['directedStrongLanguage']
      }
    });

    assertDoesNotIncludeRiskDetails(element);
    assertDoesNotIncludeInternalGuidanceKeys(element);
    assert.ok(element.textContent.includes(MESSAGES.reasonGeneric));
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceStrengthStrong));
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceTendencyDirectedStrongLanguage));

    element.children[4].children[1].click();

    assertDoesNotIncludeRiskDetails(element);
    assertDoesNotIncludeInternalGuidanceKeys(element);
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedMessage));
  });
}

function assertDoesNotIncludeRiskDetails(element) {
  assert.equal(element.textContent.includes('これはUIに出してはいけない投稿本文です'), false);
  assert.equal(element.textContent.includes('100'), false);
  assert.equal(element.textContent.includes('existence_denial'), false);
  assert.equal(element.textContent.includes('existence_denial.strong_phrase'), false);
  assert.equal(element.textContent.includes('存在否定に近い表現の可能性があります'), false);
}

function testCreatesCushionGuidanceElement() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['directedStrongLanguage']
      }
    });
    const guidance = getGuidanceElement(element);

    assert.ok(guidance);
    assert.equal(guidance.children[0].className, 'kum-cushion__guidance-strength');
    assert.equal(guidance.children[1].className, 'kum-cushion__guidance-tendency');
    assert.equal(guidance.children[2].className, 'kum-cushion__guidance-note');
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceStrengthLabel));
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceStrengthStrong));
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceTendencyLabel));
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceTendencyDirectedStrongLanguage));
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceNote));
    assertDoesNotIncludeInternalGuidanceKeys(element);
  });
}

function testRendersOneGuidanceTendency() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      guidance: {
        tendencyKeys: ['personalSafety']
      }
    });
    const guidance = getGuidanceElement(element);
    const list = findElementByClass(guidance, 'kum-cushion__guidance-list');

    assert.equal(findElementByClass(guidance, 'kum-cushion__guidance-strength'), null);
    assert.equal(list.children.length, 1);
    assert.equal(list.children[0].textContent, MESSAGES.cushionGuidanceTendencyPersonalSafety);
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceNote));
  });
}

function testRendersStrengthWithoutGuidanceTendencies() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      guidance: {
        strengthKey: 'somewhatStrong',
        tendencyKeys: []
      }
    });
    const guidance = getGuidanceElement(element);

    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceStrengthSomewhatStrong));
    assert.equal(findElementByClass(guidance, 'kum-cushion__guidance-tendency'), null);
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceNote));
  });
}

function testRendersTwoGuidanceTendenciesInOrder() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      guidance: {
        strengthKey: 'veryStrong',
        tendencyKeys: ['personalSafety', 'possiblyPressuringLanguage']
      }
    });
    const list = findElementByClass(getGuidanceElement(element), 'kum-cushion__guidance-list');

    assert.equal(list.children.length, 2);
    assert.equal(list.children[0].textContent, MESSAGES.cushionGuidanceTendencyPersonalSafety);
    assert.equal(
      list.children[1].textContent,
      MESSAGES.cushionGuidanceTendencyPossiblyPressuringLanguage
    );
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceStrengthVeryStrong));
  });
}

function testDoesNotRenderGuidanceWithoutValidData() {
  const invalidGuidanceValues = [
    undefined,
    null,
    [],
    {},
    { tendencyKeys: [] },
    { tendencyKeys: 'directedStrongLanguage' },
    { strengthKey: 'unknownStrength' },
    { tendencyKeys: ['unknownTendency'] }
  ];

  withFakeDomAndI18n(() => {
    for (const guidance of invalidGuidanceValues) {
      const element = createCushionElement({ guidance });

      assert.equal(getGuidanceElement(element), null);
      assert.equal(element.textContent.includes(MESSAGES.cushionGuidanceNote), false);
    }
  });
}

function testIgnoresUnknownStrengthKey() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      guidance: {
        strengthKey: 'unknownStrength',
        tendencyKeys: ['directedStrongLanguage']
      }
    });

    assert.equal(element.textContent.includes('unknownStrength'), false);
    assert.equal(element.textContent.includes(MESSAGES.cushionGuidanceStrengthLabel), false);
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceTendencyDirectedStrongLanguage));
  });
}

function testIgnoresUnknownTendencyKey() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['unknownTendency']
      }
    });

    assert.equal(element.textContent.includes('unknownTendency'), false);
    assert.equal(element.textContent.includes(MESSAGES.cushionGuidanceTendencyLabel), false);
    assert.ok(element.textContent.includes(MESSAGES.cushionGuidanceStrengthStrong));
  });
}

function testRendersOnlyKnownGuidanceKeys() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['unknownTendency', 'personalSafety', 'possiblyPressuringLanguage']
      }
    });
    const list = findElementByClass(getGuidanceElement(element), 'kum-cushion__guidance-list');

    assert.equal(element.textContent.includes('unknownTendency'), false);
    assert.equal(list.children.length, 2);
    assert.equal(list.children[0].textContent, MESSAGES.cushionGuidanceTendencyPersonalSafety);
    assert.equal(
      list.children[1].textContent,
      MESSAGES.cushionGuidanceTendencyPossiblyPressuringLanguage
    );
  });
}

function testUsesInjectedJapaneseLocalizerForAllFixedMessages() {
  withFakeDomAndI18n(() => {
    assertInjectedLocalizationThroughDismissedState(MESSAGES, ENGLISH_MESSAGES, 'ja');
  }, ENGLISH_MESSAGES);
}

function testUsesInjectedEnglishLocalizerThroughDismissedState() {
  withFakeDomAndI18n(() => {
    assertInjectedLocalizationThroughDismissedState(ENGLISH_MESSAGES, MESSAGES, 'en');
  });
}

function assertInjectedLocalizationThroughDismissedState(
  messages,
  otherLanguageMessages,
  resolvedLanguage
) {
  const localization = createReliableLocalization(messages, resolvedLanguage);
  const element = createCushionElement(
    {
      reasonMessageKey: 'reasonGeneric',
      guidance: {
        strengthKey: 'strong',
        tendencyKeys: ['personalSafety', 'directedStrongLanguage']
      }
    },
    {},
    localization
  );

  assert.equal(element.children[0].textContent, messages.cushionTitle);
  assert.equal(element.children[1].textContent, messages.cushionBody);
  assert.equal(element.children[2].textContent, messages.reasonGeneric);
  assert.ok(element.textContent.includes(messages.cushionGuidanceStrengthLabel));
  assert.ok(element.textContent.includes(messages.cushionGuidanceStrengthStrong));
  assert.ok(element.textContent.includes(messages.cushionGuidanceTendencyLabel));
  assert.ok(element.textContent.includes(messages.cushionGuidanceTendencyPersonalSafety));
  assert.ok(element.textContent.includes(messages.cushionGuidanceTendencyDirectedStrongLanguage));
  assert.ok(element.textContent.includes(messages.cushionGuidanceNote));
  assert.ok(element.textContent.includes(messages.buttonShowContent));
  assert.ok(element.textContent.includes(messages.buttonHideForNow));
  assert.equal(element.textContent.includes(otherLanguageMessages.cushionTitle), false);

  element.children[4].children[1].click();

  assert.equal(element.className, 'kum-cushion kum-cushion--dismissed');
  assert.equal(element.children[0].children[0].textContent, messages.cushionDismissedMessage);
  assert.equal(element.children[0].children[1].textContent, messages.cushionDismissedBody);
  assert.equal(element.children[1].textContent, messages.cushionDismissedLeavePost);
  assert.equal(element.children[2].textContent, messages.cushionDismissedDistanceOptions);
  assert.equal(element.children[3].children[0].textContent, messages.cushionProtectYourHeartLink);
  assert.equal(element.children[3].children[2].textContent, ` (${messages.linkOpensInNewTab})`);
  assert.equal(element.children[4].children[0].textContent, messages.buttonShowContent);
  assert.equal(
    element.children[3].getAttribute('href'),
    resolvedLanguage === 'ja'
      ? 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/protect-your-heart.html'
      : 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/en/protect-your-heart.html'
  );
  assert.equal(element.textContent.includes(otherLanguageMessages.cushionDismissedMessage), false);
  assert.equal(element.textContent.includes(otherLanguageMessages.cushionDismissedBody), false);
  assert.equal(
    element.textContent.includes(otherLanguageMessages.cushionDismissedLeavePost),
    false
  );
  assert.equal(
    element.textContent.includes(otherLanguageMessages.cushionDismissedDistanceOptions),
    false
  );
  assert.equal(
    element.textContent.includes(otherLanguageMessages.cushionProtectYourHeartLink),
    false
  );
}

function testFailedLocalizerFallsBackToChromeI18n() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement(
      { reasonMessageKey: 'reasonGeneric' },
      {},
      {
        getMessage() {
          throw new Error('Localizer unavailable');
        }
      }
    );

    assert.ok(element.textContent.includes(MESSAGES.cushionTitle));
    assert.ok(element.textContent.includes(MESSAGES.cushionBody));
    assert.ok(element.textContent.includes(MESSAGES.reasonGeneric));
    assert.ok(element.textContent.includes(MESSAGES.buttonShowContent));
    assert.ok(element.textContent.includes(MESSAGES.buttonHideForNow));

    element.children[3].children[1].click();

    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedMessage));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedBody));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedLeavePost));
    assert.ok(element.textContent.includes(MESSAGES.cushionDismissedDistanceOptions));
    assert.equal(findElementByClass(element, 'kum-cushion__protect-link'), null);
    assert.equal(element.children[3].children[0].textContent, MESSAGES.buttonShowContent);
  });
}

function assertDoesNotIncludeInternalGuidanceKeys(element) {
  assert.equal(element.textContent.includes('strong'), false);
  assert.equal(element.textContent.includes('personalSafety'), false);
  assert.equal(element.textContent.includes('directedStrongLanguage'), false);
}

function createReliableLocalization(messages, resolvedLanguage) {
  return Object.freeze({
    resolvedLanguage,
    isResolvedLanguageReliable: true,
    getMessage(key) {
      return messages[key] || '';
    }
  });
}

function testShowButtonHandler() {
  withFakeDomAndI18n(() => {
    let showCount = 0;
    const element = createCushionElement(
      {},
      {
        onShow: () => {
          showCount += 1;
        }
      }
    );
    const showButton = element.children[3].children[0];

    showButton.click();

    assert.equal(showCount, 1);
  });
}

function testButtonClickStopsDefaultAndPropagation() {
  withFakeDomAndI18n(() => {
    let preventDefaultCount = 0;
    let stopPropagationCount = 0;
    let receivedEvent = null;
    const element = createCushionElement(
      {},
      {
        onShow: (event) => {
          receivedEvent = event;
        }
      }
    );
    const event = {
      preventDefault() {
        preventDefaultCount += 1;
      },
      stopPropagation() {
        stopPropagationCount += 1;
      }
    };

    element.children[3].children[0].click(event);

    assert.equal(preventDefaultCount, 1);
    assert.equal(stopPropagationCount, 1);
    assert.equal(receivedEvent, event);
    assert.equal(element.className, 'kum-cushion');
  });
}

function testDoesNotAddRuntimeCommunicationOrScriptedNavigation() {
  const overlaySource = fs.readFileSync(path.join(__dirname, '..', 'overlay.js'), 'utf8');

  assert.equal(overlaySource.includes('window.open'), false);
  assert.equal(overlaySource.includes('fetch('), false);
  assert.equal(overlaySource.includes('XMLHttpRequest'), false);
}

function withFakeDomAndI18n(callback, fallbackMessages = MESSAGES) {
  const previousDocument = globalThis.document;
  const previousI18n = globalThis.kotobaUkeMimamoriI18n;
  const fakeDocument = {
    createElement,
    head: createElement('head'),
    getElementById(id) {
      return findElementById(this.head, id);
    }
  };

  globalThis.document = fakeDocument;
  globalThis.kotobaUkeMimamoriI18n = {
    getMessage(key) {
      return fallbackMessages[key] || key;
    }
  };

  try {
    callback(fakeDocument);
  } finally {
    restoreGlobal('document', previousDocument);
    restoreGlobal('kotobaUkeMimamoriI18n', previousI18n);
  }
}

function readLocaleMessages(locale) {
  const filePath = path.join(__dirname, '..', '_locales', locale, 'messages.json');
  const localeMessages = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  return Object.freeze(
    Object.fromEntries(Object.entries(localeMessages).map(([key, entry]) => [key, entry.message]))
  );
}

function restoreGlobal(key, value) {
  if (value === undefined) {
    delete globalThis[key];
  } else {
    globalThis[key] = value;
  }
}

function findElementById(root, id) {
  if (!root) {
    return null;
  }

  if (typeof root.getAttribute === 'function' && root.getAttribute('id') === id) {
    return root;
  }

  for (const childNode of root.children || []) {
    const foundNode = findElementById(childNode, id);

    if (foundNode) {
      return foundNode;
    }
  }

  return null;
}

function getGuidanceElement(element) {
  return findElementByClass(element, 'kum-cushion__guidance');
}

function findElementByClass(root, className) {
  if (!root) {
    return null;
  }

  if (root.className.split(' ').includes(className)) {
    return root;
  }

  for (const childNode of root.children || []) {
    const foundNode = findElementByClass(childNode, className);

    if (foundNode) {
      return foundNode;
    }
  }

  return null;
}

function createElement(tagName) {
  const attributes = new Map();
  const listeners = new Map();

  return {
    children: [],
    className: '',
    nodeType: 1,
    _focused: false,
    tagName: String(tagName).toUpperCase(),
    _textContent: '',
    get textContent() {
      return this._textContent + this.children.map((childNode) => childNode.textContent).join('');
    },
    set textContent(value) {
      this._textContent = String(value);
      this.children = [];
    },
    addEventListener(eventName, handler) {
      listeners.set(eventName, handler);
    },
    append(...childNodes) {
      for (const childNode of childNodes) {
        this.children.push(childNode);
      }
    },
    appendChild(childNode) {
      this.children.push(childNode);
      return childNode;
    },
    click(event) {
      const clickHandler = listeners.get('click');

      if (typeof clickHandler === 'function') {
        clickHandler(event);
      }
    },
    focus() {
      this._focused = true;
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    }
  };
}

runTests();
