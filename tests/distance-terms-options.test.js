'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../distance-terms-core');
const {
  createDistanceTermsOptionsController,
  validateDistanceTermsMutationResponse
} = require('../distance-terms-options');

const { OPERATIONS, RESPONSE_CODES, STATES } = core.CONSTANTS;
const ID_A = '123e4567-e89b-42d3-a456-426614174000';
const ID_B = '223e4567-e89b-42d3-a456-426614174001';
const ID_C = '323e4567-e89b-42d3-a456-426614174002';
const JA_MESSAGES = readMessages('ja');
const EN_MESSAGES = readMessages('en');
const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

test('公開APIは正式な2 APIだけをglobalへ公開する', () => {
  assert.deepEqual(Object.keys(globalThis.kotobaUkeMimamoriDistanceTermsOptions).sort(), [
    'initializeDistanceTermsOptions',
    'updateDistanceTermsOptionsLocalization'
  ]);
});

test('Options HTMLはsemantic sectionと3 native dialogと依存順を持つ', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'options.html'), 'utf8');

  assert.match(
    html,
    /<section[\s\S]*id="distance-terms-section"[\s\S]*aria-labelledby="distance-terms-title"/
  );
  assert.equal((html.match(/<dialog\b/g) ?? []).length, 3);
  assert.match(html, /id="distance-terms-add-form"/);
  assert.match(html, /id="distance-terms-master-enabled"[\s\S]*type="checkbox"/);
  assert.match(html, /role="status"[\s\S]*aria-live="polite"[\s\S]*aria-atomic="true"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /aria-hidden="true"> ↗</);

  const scripts = Array.from(html.matchAll(/<script src="([^"]+)"/g), (match) => match[1]);
  assert.deepEqual(scripts.slice(-7), [
    'i18n.js',
    'settings.js',
    'distance-terms-core.js',
    'distance-terms-mutations.js',
    'distance-terms-reader.js',
    'distance-terms-options.js',
    'options.js'
  ]);
});

test('initial loadingはnormal UIを隠しsectionだけをbusyにする', async () => {
  const deferred = createDeferred();
  const harness = createHarness({
    reader: createReader({ views: [deferred.promise] })
  });
  const initialization = harness.controller.initialize();

  assert.equal(harness.elements.section.getAttribute('aria-busy'), 'true');
  assert.equal(harness.elements.normalArea.hidden, true);
  assert.equal(harness.existingSetting.disabled, false);

  deferred.resolve(missingView());
  await initialization;
  assert.equal(harness.elements.section.getAttribute('aria-busy'), 'false');
});

test('missingはwriteせず既定値のnormal managementと0 / 30を表示する', async () => {
  const runtime = createRuntime();
  const harness = await initializeHarness({
    reader: createReader({ views: [missingView()] }),
    runtime
  });

  assert.equal(harness.elements.normalArea.hidden, false);
  assert.equal(harness.elements.masterCheckbox.checked, true);
  assert.equal(harness.elements.count.textContent, '登録数：0 / 30');
  assert.equal(harness.elements.empty.hidden, false);
  assert.equal(runtime.requests.length, 0);
});

test('validは1件と複数件を登録順に表示する', async () => {
  for (const items of [
    [item(ID_A, '仕事', true)],
    [item(ID_A, '仕事', true), item(ID_B, '#話題', false), item(ID_C, 'English', true)]
  ]) {
    const harness = await initializeHarness({
      reader: createReader({ views: [validView(items)] })
    });
    const renderedTerms = harness.elements.list.children.map(
      (row) => row.children[0].children[1].children[0].textContent
    );

    assert.deepEqual(
      renderedTerms,
      items.map(({ term }) => term)
    );
    assert.equal(harness.elements.count.textContent, `登録数：${items.length} / 30`);
  }
});

test('partially_invalidはwarningとusable itemsとrawItemCountだけを表示する', async () => {
  const harness = await initializeHarness({
    reader: createReader({
      views: [
        partialView([item(ID_A, '読める言葉', true)], {
          invalidCount: 2,
          rawItemCount: 3
        })
      ]
    })
  });
  const text = getText(harness.elements.section);

  assert.equal(harness.elements.normalArea.hidden, false);
  assert.match(text, /一部の登録設定を読み込めませんでした/);
  assert.match(text, /問題のある登録：2件/);
  assert.match(text, /登録数：3 \/ 30/);
  assert.match(text, /読める言葉/);
  assert.doesNotMatch(text, /漏らしてはいけないinvalid term/);
});

test('whole_invalidはResetだけ、unsupported_schemaはnoticeだけを表示する', async () => {
  const whole = await initializeHarness({
    reader: createReader({ views: [stateOnlyView(STATES.WHOLE_INVALID)] })
  });
  assert.equal(whole.elements.normalArea.hidden, true);
  assert.equal(findButtons(whole.elements.stateArea).length, 1);
  assert.match(getText(whole.elements.stateArea), /設定を初期化する/);

  const unsupported = await initializeHarness({
    reader: createReader({ views: [stateOnlyView(STATES.UNSUPPORTED_SCHEMA)] })
  });
  assert.equal(unsupported.elements.normalArea.hidden, true);
  assert.equal(findButtons(unsupported.elements.stateArea).length, 0);
  assert.doesNotMatch(getText(unsupported.elements.stateArea), /もう一度読み込む|初期化する/);
});

test('read_errorはRetryだけを表示しResetやnormal managementを出さない', async () => {
  const harness = await initializeHarness({
    reader: createReader({ views: [stateOnlyView(STATES.READ_ERROR)] })
  });

  assert.equal(harness.elements.normalArea.hidden, true);
  assert.equal(findButtons(harness.elements.stateArea).length, 1);
  assert.equal(findButtons(harness.elements.stateArea)[0].textContent, 'もう一度読み込む');
  assert.doesNotMatch(getText(harness.elements.stateArea), /初期化する/);
});

test('30件ではraw countと全件を表示しAdd buttonだけを件数理由でdisabledにする', async () => {
  const items = Array.from({ length: 30 }, (_value, index) => {
    return item(createId(index), `言葉${index + 1}`, index % 2 === 0);
  });
  const harness = await initializeHarness({
    reader: createReader({ views: [validView(items)] })
  });

  assert.equal(harness.elements.list.children.length, 30);
  assert.equal(harness.elements.count.textContent, '登録数：30 / 30');
  assert.equal(harness.elements.addButton.disabled, true);
  assert.equal(harness.elements.addInput.disabled, false);
  assert.equal(harness.elements.maximum.hidden, false);
  assert.equal(harness.elements.masterCheckbox.disabled, false);
  assert.equal(getDeleteButton(harness, 0).disabled, false);
});

test('individual OFFはcheckbox・状態label・row classの複数cueで表す', async () => {
  const harness = await initializeHarness({
    reader: createReader({ views: [validView([item(ID_A, '#話題', false)])] })
  });
  const row = harness.elements.list.children[0];

  assert.equal(getItemCheckbox(harness, 0).checked, false);
  assert.equal(row.children[0].children[1].children[1].textContent, 'OFF');
  assert.match(row.className, /distance-terms-item--off/);
});

test('Master OFFでもAdd・delete・item ON/OFFは利用できitem stateを保持する', async () => {
  const harness = await initializeHarness({
    reader: createReader({ views: [validView([item(ID_A, '仕事', false)], false)] })
  });

  assert.equal(harness.elements.masterCheckbox.checked, false);
  assert.equal(harness.elements.addInput.disabled, false);
  assert.equal(harness.elements.addButton.disabled, false);
  assert.equal(getItemCheckbox(harness, 0).disabled, false);
  assert.equal(getItemCheckbox(harness, 0).checked, false);
  assert.equal(getDeleteButton(harness, 0).disabled, false);
});

test('Master mutationはdesired booleanを送りoptimistic表示せずlatest view後にfocusを戻す', async () => {
  const response = createDeferred();
  const reader = createReader({
    views: [validView([], true), validView([], false)]
  });
  const runtime = createRuntime([response.promise]);
  const harness = await initializeHarness({ reader, runtime });

  harness.elements.masterCheckbox.checked = false;
  const mutation = harness.elements.masterCheckbox.dispatch('change');
  await flush();

  assert.equal(harness.elements.masterCheckbox.checked, true);
  assert.deepEqual(runtime.requests[0], request(OPERATIONS.SET_MASTER_ENABLED, { enabled: false }));

  response.resolve(okResponse());
  await mutation;
  assert.equal(harness.elements.masterCheckbox.checked, false);
  assert.equal(harness.document.activeElement, harness.elements.masterCheckbox);
});

test('individual mutationはUUIDをclosureから送りlatest viewで再描画する', async () => {
  const reader = createReader({
    views: [validView([item(ID_A, '仕事', true)]), validView([item(ID_A, '仕事', false)])]
  });
  const runtime = createRuntime([okResponse()]);
  const harness = await initializeHarness({ reader, runtime });
  const checkbox = getItemCheckbox(harness, 0);

  checkbox.checked = false;
  await checkbox.dispatch('change');

  assert.deepEqual(
    runtime.requests[0],
    request(OPERATIONS.SET_ITEM_ENABLED, { id: ID_A, enabled: false })
  );
  assert.equal(getItemCheckbox(harness, 0).checked, false);
  assert.equal(harness.document.activeElement, getItemCheckbox(harness, 0));
});

test('item target消失時はadd inputへfocus fallbackする', async () => {
  const harness = await initializeHarness({
    reader: createReader({
      views: [validView([item(ID_A, '仕事', true)]), validView([])]
    }),
    runtime: createRuntime([failureResponse(RESPONSE_CODES.ITEM_NOT_FOUND)])
  });
  const checkbox = getItemCheckbox(harness, 0);

  checkbox.checked = false;
  await checkbox.dispatch('change');
  assert.equal(harness.document.activeElement, harness.elements.addInput);
  assert.equal(
    harness.elements.status.textContent,
    JA_MESSAGES.distanceTermsSettingChangeFailure.message
  );
});

test('Addはcanonical化前のraw draftを送信しlatest read後だけclearする', async () => {
  const latestRead = createDeferred();
  const reader = createReader({ views: [missingView(), latestRead.promise] });
  const runtime = createRuntime([okResponse()]);
  const harness = await initializeHarness({ reader, runtime });
  const rawDraft = ' ＡＢ ';

  harness.elements.addInput.value = rawDraft;
  await harness.elements.addInput.dispatch('input');
  const submission = harness.elements.addForm.dispatch('submit');
  await flush();

  assert.deepEqual(runtime.requests[0], request(OPERATIONS.ADD_TERM, { term: rawDraft }));
  assert.equal(harness.elements.addInput.value, rawDraft);

  latestRead.resolve(validView([item(ID_A, 'AB', true)]));
  await submission;
  assert.equal(harness.elements.addInput.value, '');
  assert.equal(harness.document.activeElement, harness.elements.addInput);
  assert.equal(harness.elements.status.textContent, JA_MESSAGES.distanceTermsAddSuccess.message);
});

test('client validationはsendせずdraft・focus・aria-invalid・describedbyを維持する', async () => {
  for (const [draft, expectedMessage] of [
    ['a', JA_MESSAGES.distanceTermsValidationLength.message],
    ['ab\ncd', JA_MESSAGES.distanceTermsValidationLineBreakTab.message],
    [`ab${String.fromCodePoint(0x200b)}cd`, JA_MESSAGES.distanceTermsValidationForbidden.message]
  ]) {
    const runtime = createRuntime();
    const harness = await initializeHarness({
      reader: createReader({ views: [missingView()] }),
      runtime
    });
    harness.elements.addInput.value = draft;
    await harness.elements.addInput.dispatch('input');
    await harness.elements.addForm.dispatch('submit');

    assert.equal(runtime.requests.length, 0);
    assert.equal(harness.elements.addInput.value, draft);
    assert.equal(harness.document.activeElement, harness.elements.addInput);
    assert.equal(harness.elements.validation.textContent, expectedMessage);
    assert.equal(harness.elements.addInput.getAttribute('aria-invalid'), 'true');
    assert.equal(
      harness.elements.addInput.getAttribute('aria-describedby'),
      'distance-terms-validation'
    );
  }
});

test('server duplicate・limit・generic failureはlocalized copyとdraftを維持する', async () => {
  for (const [response, expectedValidation, expectedStatus] of [
    [
      failureResponse(RESPONSE_CODES.DUPLICATE_TERM),
      JA_MESSAGES.distanceTermsValidationDuplicate.message,
      ''
    ],
    [failureResponse(RESPONSE_CODES.LIMIT_REACHED), JA_MESSAGES.distanceTermsMaximum.message, ''],
    [
      failureResponse(RESPONSE_CODES.STORAGE_WRITE_FAILED),
      '',
      JA_MESSAGES.distanceTermsAddFailure.message
    ]
  ]) {
    const harness = await initializeHarness({
      reader: createReader({ views: [missingView(), missingView()] }),
      runtime: createRuntime([response])
    });
    harness.elements.addInput.value = '仕事';
    await harness.elements.addInput.dispatch('input');
    await harness.elements.addForm.dispatch('submit');

    assert.equal(harness.elements.addInput.value, '仕事');
    assert.equal(harness.elements.validation.textContent, expectedValidation);
    assert.equal(harness.elements.status.textContent, expectedStatus);
  }
});

test('IME composition中のEnterとsubmitは抑止し通常submitは維持する', async () => {
  const runtime = createRuntime([okResponse()]);
  const harness = await initializeHarness({
    reader: createReader({ views: [missingView(), validView([item(ID_A, '仕事', true)])] }),
    runtime
  });
  harness.elements.addInput.value = '仕事';
  await harness.elements.addInput.dispatch('input');
  await harness.elements.addInput.dispatch('compositionstart');
  const keydown = await harness.elements.addInput.dispatch('keydown', {
    key: 'Enter',
    isComposing: true
  });
  await harness.elements.addForm.dispatch('submit', { isComposing: true });

  assert.equal(keydown.defaultPrevented, true);
  assert.equal(runtime.requests.length, 0);

  await harness.elements.addInput.dispatch('compositionend');
  const normalKeydown = await harness.elements.addInput.dispatch('keydown', {
    key: 'Enter',
    isComposing: false
  });
  assert.equal(normalKeydown.defaultPrevented, false);
  await harness.elements.addForm.dispatch('submit');
  assert.equal(runtime.requests.length, 1);
});

test('mutatingとreconciling中はdistance controlsとdialog actionだけをdisableする', async () => {
  const response = createDeferred();
  const latestRead = createDeferred();
  const harness = await initializeHarness({
    reader: createReader({ views: [validView([item(ID_A, '仕事', true)]), latestRead.promise] }),
    runtime: createRuntime([response.promise])
  });
  harness.elements.addInput.value = '追加語';
  await harness.elements.addInput.dispatch('input');
  const submission = harness.elements.addForm.dispatch('submit');
  await flush();

  assertBusyState(harness, true);
  response.resolve(okResponse());
  await flush();
  assertBusyState(harness, true);

  latestRead.resolve(validView([item(ID_A, '仕事', true), item(ID_B, '追加語', true)]));
  await submission;
  assertBusyState(harness, false);
});

test('runtime response validationはexact shape・allowlist・ok/code組合せだけを許可する', () => {
  for (const response of [okResponse(), { ok: true, code: RESPONSE_CODES.NO_CHANGE }]) {
    assert.equal(validateDistanceTermsMutationResponse(response), true);
  }

  assert.equal(
    validateDistanceTermsMutationResponse(failureResponse(RESPONSE_CODES.DUPLICATE_TERM)),
    true
  );

  for (const response of [
    null,
    [],
    'OK',
    1,
    {},
    { ok: true },
    { code: RESPONSE_CODES.OK },
    { ok: true, code: 'UNKNOWN' },
    { ok: true, code: RESPONSE_CODES.DUPLICATE_TERM },
    { ok: false, code: RESPONSE_CODES.OK },
    { ok: false, code: RESPONSE_CODES.NO_CHANGE },
    { ok: true, code: RESPONSE_CODES.OK, term: '漏えい' }
  ]) {
    assert.equal(validateDistanceTermsMutationResponse(response), false);
  }
});

test('communication failureはPhase 2.5 same-read APIとdesired helperだけを使いblind retryしない', async () => {
  const classification = Object.freeze({
    state: STATES.VALID,
    secretClassificationValue: 'DOMへ出してはいけない'
  });
  const latestView = validView([item(ID_A, '仕事', true)]);
  const reader = createReader({
    views: [missingView()],
    reconciliations: [{ view: latestView, classification }]
  });
  const desiredCalls = [];
  const mutations = {
    isDistanceTermsDesiredStateSatisfied(input) {
      desiredCalls.push(input);
      return true;
    }
  };
  const runtime = createRuntime([Promise.reject(new Error('response lost'))]);
  const harness = await initializeHarness({ reader, runtime, mutations });
  harness.elements.addInput.value = '仕事';
  await harness.elements.addInput.dispatch('input');
  await harness.elements.addForm.dispatch('submit');

  assert.equal(reader.optionReadCount, 1);
  assert.equal(reader.reconciliationReadCount, 1);
  assert.equal(runtime.requests.length, 1);
  assert.equal(desiredCalls.length, 1);
  assert.equal(desiredCalls[0].classification, classification);
  assert.equal(harness.elements.addInput.value, '');
  assert.equal(harness.elements.status.textContent, JA_MESSAGES.distanceTermsAddSuccess.message);
  assert.doesNotMatch(getText(harness.elements.section), /DOMへ出してはいけない/);
});

test('malformed responseもreconcileしdesired falseならdraftを保持して再送しない', async () => {
  const reader = createReader({
    views: [missingView()],
    reconciliations: [
      { view: missingView(), classification: Object.freeze({ state: STATES.MISSING }) }
    ]
  });
  const runtime = createRuntime([{ ok: true, code: RESPONSE_CODES.OK, unknown: true }]);
  const harness = await initializeHarness({
    reader,
    runtime,
    mutations: { isDistanceTermsDesiredStateSatisfied: () => false }
  });
  harness.elements.addInput.value = '仕事';
  await harness.elements.addInput.dispatch('input');
  await harness.elements.addForm.dispatch('submit');

  assert.equal(runtime.requests.length, 1);
  assert.equal(reader.reconciliationReadCount, 1);
  assert.equal(harness.elements.addInput.value, '仕事');
  assert.equal(harness.elements.status.textContent, JA_MESSAGES.distanceTermsAddFailure.message);
});

test('delete dialogはtermを安全なtextで表示しCancel初期focusとEscape復帰を行う', async () => {
  const dangerousTerm = '<img src=x onerror=alert(1)>';
  const harness = await initializeHarness({
    reader: createReader({ views: [validView([item(ID_A, dangerousTerm, true)])] })
  });
  const origin = getDeleteButton(harness, 0);
  await origin.dispatch('click');

  assert.equal(harness.elements.deleteDialog.open, true);
  assert.equal(harness.document.activeElement, harness.elements.deleteDialogCancel);
  assert.equal(
    harness.elements.deleteDialogTarget.textContent,
    `「${dangerousTerm}」を削除します。`
  );
  assert.doesNotMatch(getText(harness.elements.deleteDialog), new RegExp(ID_A));

  const cancelEvent = await harness.elements.deleteDialog.dispatch('cancel');
  assert.equal(cancelEvent.defaultPrevented, true);
  assert.equal(harness.elements.deleteDialog.open, false);
  assert.equal(harness.document.activeElement, origin);
});

test('delete mutation中はdialogを維持しCancel・Delete・Escapeを無効化する', async () => {
  const response = createDeferred();
  const harness = await initializeHarness({
    reader: createReader({
      views: [validView([item(ID_A, '仕事', true)]), validView([])]
    }),
    runtime: createRuntime([response.promise])
  });
  await getDeleteButton(harness, 0).dispatch('click');
  const deletion = harness.elements.deleteDialogAction.dispatch('click');
  await flush();

  assert.equal(harness.elements.deleteDialog.open, true);
  assert.equal(harness.elements.deleteDialogCancel.disabled, true);
  assert.equal(harness.elements.deleteDialogAction.disabled, true);
  await harness.elements.deleteDialog.dispatch('cancel');
  assert.equal(harness.elements.deleteDialog.open, true);

  response.resolve(okResponse());
  await deletion;
});

test('delete successはdialogを閉じadd focus、failure target残存はdialogを維持する', async () => {
  const success = await initializeHarness({
    reader: createReader({
      views: [validView([item(ID_A, '仕事', true)]), validView([])]
    }),
    runtime: createRuntime([okResponse()])
  });
  await getDeleteButton(success, 0).dispatch('click');
  await success.elements.deleteDialogAction.dispatch('click');
  assert.equal(success.elements.deleteDialog.open, false);
  assert.equal(success.document.activeElement, success.elements.addInput);
  assert.equal(success.elements.status.textContent, JA_MESSAGES.distanceTermsDeleteSuccess.message);

  const failure = await initializeHarness({
    reader: createReader({
      views: [validView([item(ID_A, '仕事', true)]), validView([item(ID_A, '仕事', true)])]
    }),
    runtime: createRuntime([failureResponse(RESPONSE_CODES.STORAGE_WRITE_FAILED)])
  });
  await getDeleteButton(failure, 0).dispatch('click');
  await failure.elements.deleteDialogAction.dispatch('click');
  assert.equal(failure.elements.deleteDialog.open, true);
  assert.equal(failure.document.activeElement, failure.elements.deleteDialogAction);
  assert.equal(
    failure.elements.deleteDialogError.textContent,
    JA_MESSAGES.distanceTermsDeleteFailure.message
  );
});

test('delete failureでtarget消失・term変更・state incompatibleならdialogを閉じfallbackする', async () => {
  for (const latestView of [
    validView([]),
    validView([item(ID_A, '別の言葉', true)]),
    stateOnlyView(STATES.WHOLE_INVALID)
  ]) {
    const harness = await initializeHarness({
      reader: createReader({
        views: [validView([item(ID_A, '仕事', true)]), latestView]
      }),
      runtime: createRuntime([failureResponse(RESPONSE_CODES.ITEM_NOT_FOUND)])
    });
    await getDeleteButton(harness, 0).dispatch('click');
    await harness.elements.deleteDialogAction.dispatch('click');

    assert.equal(harness.elements.deleteDialog.open, false);
    assert.equal(
      harness.document.activeElement,
      latestView.state === STATES.VALID
        ? harness.elements.addInput
        : findFirstHeading(harness.elements.stateArea)
    );
  }
});

test('partial Recoveryは確認後payloadなしで送りsuccess時だけwarningを消す', async () => {
  const initial = partialView([item(ID_A, '仕事', true)], {
    invalidCount: 1,
    rawItemCount: 2
  });
  const runtime = createRuntime([okResponse()]);
  const harness = await initializeHarness({
    reader: createReader({ views: [initial, validView([item(ID_A, '仕事', true)])] }),
    runtime
  });
  const recoveryButton = findButtons(harness.elements.stateArea)[0];
  await recoveryButton.dispatch('click');
  assert.equal(harness.document.activeElement, harness.elements.invalidDialogCancel);
  await harness.elements.invalidDialogAction.dispatch('click');

  assert.deepEqual(runtime.requests[0], request(OPERATIONS.DELETE_INVALID_ITEMS));
  assert.equal(harness.elements.invalidDialog.open, false);
  assert.equal(harness.elements.stateArea.hidden, true);
  assert.equal(harness.document.activeElement, harness.elements.addInput);
  assert.equal(
    harness.elements.status.textContent,
    JA_MESSAGES.distanceTermsPartialSuccess.message
  );
});

test('partialとwholeのdialogもEscapeをCancelとしてorigin actionへfocus復帰する', async () => {
  for (const view of [
    partialView([], { invalidCount: 1, rawItemCount: 1 }),
    stateOnlyView(STATES.WHOLE_INVALID)
  ]) {
    const harness = await initializeHarness({
      reader: createReader({ views: [view] })
    });
    const origin = findButtons(harness.elements.stateArea)[0];
    await origin.dispatch('click');
    const dialog =
      view.state === STATES.PARTIALLY_INVALID
        ? harness.elements.invalidDialog
        : harness.elements.resetDialog;

    await dialog.dispatch('cancel');
    assert.equal(dialog.open, false);
    assert.equal(harness.document.activeElement, origin);
  }
});

test('partial Recovery failureはcompatible時dialogを維持しincompatible時閉じる', async () => {
  const initial = partialView([], { invalidCount: 1, rawItemCount: 1 });
  const compatible = await initializeHarness({
    reader: createReader({ views: [initial, initial] }),
    runtime: createRuntime([failureResponse(RESPONSE_CODES.STORAGE_WRITE_FAILED)])
  });
  await findButtons(compatible.elements.stateArea)[0].dispatch('click');
  await compatible.elements.invalidDialogAction.dispatch('click');
  assert.equal(compatible.elements.invalidDialog.open, true);
  assert.equal(compatible.document.activeElement, compatible.elements.invalidDialogAction);
  assert.equal(
    compatible.elements.invalidDialogError.textContent,
    JA_MESSAGES.distanceTermsRecoveryUnknown.message
  );

  const incompatible = await initializeHarness({
    reader: createReader({ views: [initial, stateOnlyView(STATES.WHOLE_INVALID)] }),
    runtime: createRuntime([failureResponse(RESPONSE_CODES.RECOVERY_NOT_ALLOWED)])
  });
  await findButtons(incompatible.elements.stateArea)[0].dispatch('click');
  await incompatible.elements.invalidDialogAction.dispatch('click');
  assert.equal(incompatible.elements.invalidDialog.open, false);
  assert.equal(
    incompatible.document.activeElement,
    findFirstHeading(incompatible.elements.stateArea)
  );
});

test('whole resetはstrong confirmationを送りexact initial view後だけnormal UIへ戻る', async () => {
  const runtime = createRuntime([okResponse()]);
  const harness = await initializeHarness({
    reader: createReader({
      views: [stateOnlyView(STATES.WHOLE_INVALID), validView([])]
    }),
    runtime
  });
  await findButtons(harness.elements.stateArea)[0].dispatch('click');
  assert.equal(harness.document.activeElement, harness.elements.resetDialogCancel);
  await harness.elements.resetDialogAction.dispatch('click');

  assert.deepEqual(
    runtime.requests[0],
    request(OPERATIONS.RESET_INVALID_SETTINGS, {
      confirmation: 'RESET_DISTANCE_TERMS_SETTINGS'
    })
  );
  assert.equal(harness.elements.resetDialog.open, false);
  assert.equal(harness.elements.normalArea.hidden, false);
  assert.equal(harness.document.activeElement, harness.elements.addInput);
  assert.equal(harness.elements.status.textContent, JA_MESSAGES.distanceTermsResetSuccess.message);
});

test('whole reset failureはcompatible時dialogを維持しgeneric errorを表示する', async () => {
  const whole = stateOnlyView(STATES.WHOLE_INVALID);
  const harness = await initializeHarness({
    reader: createReader({ views: [whole, whole] }),
    runtime: createRuntime([failureResponse(RESPONSE_CODES.STORAGE_WRITE_FAILED)])
  });
  await findButtons(harness.elements.stateArea)[0].dispatch('click');
  await harness.elements.resetDialogAction.dispatch('click');

  assert.equal(harness.elements.resetDialog.open, true);
  assert.equal(harness.document.activeElement, harness.elements.resetDialogAction);
  assert.equal(
    harness.elements.resetDialogError.textContent,
    JA_MESSAGES.distanceTermsRecoveryUnknown.message
  );
});

test('whole reset後のlatest stateがincompatibleなら古いdialogを閉じlatest UIへfocusする', async () => {
  const harness = await initializeHarness({
    reader: createReader({
      views: [
        stateOnlyView(STATES.WHOLE_INVALID),
        validView([item(ID_A, '別に保存された言葉', true)])
      ]
    }),
    runtime: createRuntime([failureResponse(RESPONSE_CODES.RECOVERY_NOT_ALLOWED)])
  });
  await findButtons(harness.elements.stateArea)[0].dispatch('click');
  await harness.elements.resetDialogAction.dispatch('click');

  assert.equal(harness.elements.resetDialog.open, false);
  assert.equal(harness.document.activeElement, harness.elements.addInput);
  assert.equal(
    harness.elements.status.textContent,
    JA_MESSAGES.distanceTermsRecoveryUnknown.message
  );
});

test('read_error Retryは失敗時buttonへ、成功時latest state actionへfocusする', async () => {
  const reader = createReader({
    views: [
      stateOnlyView(STATES.READ_ERROR),
      stateOnlyView(STATES.READ_ERROR),
      stateOnlyView(STATES.WHOLE_INVALID)
    ]
  });
  const harness = await initializeHarness({ reader });
  await findButtons(harness.elements.stateArea)[0].dispatch('click');
  assert.equal(harness.document.activeElement, findButtons(harness.elements.stateArea)[0]);

  await findButtons(harness.elements.stateArea)[0].dispatch('click');
  assert.equal(harness.elements.normalArea.hidden, true);
  assert.equal(harness.document.activeElement, findFirstHeading(harness.elements.stateArea));
});

test('language updateはStorageを読まずsection・manual URL・開いたdialogを同時更新する', async () => {
  const reader = createReader({ views: [validView([item(ID_A, 'Work', true)])] });
  const harness = await initializeHarness({ reader, localization: createLocalization('ja') });
  await getDeleteButton(harness, 0).dispatch('click');
  const readsBeforeUpdate = reader.optionReadCount;

  harness.controller.updateLocalization(createLocalization('en'));

  assert.equal(reader.optionReadCount, readsBeforeUpdate);
  assert.equal(harness.elements.title.textContent, EN_MESSAGES.distanceTermsSectionTitle.message);
  assert.equal(
    harness.elements.manualLink.href,
    'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/en/manual.html'
  );
  assert.equal(harness.elements.manualLabel.textContent, 'View the user manual');
  assert.match(harness.elements.manualNewTab.textContent, /Opens in a new tab/);
  assert.equal(harness.elements.deleteDialog.open, true);
  assert.equal(harness.elements.deleteDialogTitle.textContent, 'Delete this registered word?');
  assert.equal(harness.elements.deleteDialogTarget.textContent, 'Delete “Work”.');
});

test('language updateは保持中のvalidation・transient statusも表示文言だけ更新する', async () => {
  const statusHarness = await initializeHarness({
    reader: createReader({ views: [missingView(), validView([item(ID_A, '仕事', true)])] }),
    runtime: createRuntime([okResponse()])
  });
  statusHarness.elements.addInput.value = '仕事';
  await statusHarness.elements.addInput.dispatch('input');
  await statusHarness.elements.addForm.dispatch('submit');
  statusHarness.controller.updateLocalization(createLocalization('en'));
  assert.equal(
    statusHarness.elements.status.textContent,
    EN_MESSAGES.distanceTermsAddSuccess.message
  );

  const validationHarness = await initializeHarness({
    reader: createReader({ views: [missingView()] })
  });
  validationHarness.elements.addInput.value = 'a';
  await validationHarness.elements.addInput.dispatch('input');
  await validationHarness.elements.addForm.dispatch('submit');
  validationHarness.controller.updateLocalization(createLocalization('en'));
  assert.equal(
    validationHarness.elements.validation.textContent,
    EN_MESSAGES.distanceTermsValidationLength.message
  );
});

test('UUID・invalid raw term・classificationはvisible textやDOM idへ出さない', async () => {
  const classification = { state: STATES.PARTIALLY_INVALID, secret: 'classification-secret' };
  const reader = createReader({
    views: [
      partialView([item(ID_A, '表示してよい言葉', true)], {
        invalidCount: 1,
        rawItemCount: 2
      })
    ],
    reconciliations: [
      {
        view: partialView([item(ID_A, '表示してよい言葉', true)], {
          invalidCount: 1,
          rawItemCount: 2
        }),
        classification
      }
    ]
  });
  const harness = await initializeHarness({ reader });
  const text = getText(harness.elements.section);
  const ids = collectAttributeValues(harness.elements.section, 'id').join('\n');
  const accessibleReferences = [
    ...collectAttributeValues(harness.elements.section, 'aria-label'),
    ...collectAttributeValues(harness.elements.section, 'aria-labelledby'),
    ...collectAttributeValues(harness.elements.section, 'aria-describedby')
  ].join('\n');

  assert.doesNotMatch(text, new RegExp(ID_A));
  assert.doesNotMatch(text, /invalid raw term|classification-secret/);
  assert.doesNotMatch(ids, new RegExp(ID_A));
  assert.doesNotMatch(accessibleReferences, new RegExp(ID_A));
});

test('production sourceはdirect Storage write・dataset UUID・innerHTML term挿入を持たない', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'distance-terms-options.js'), 'utf8');

  assert.doesNotMatch(source, /storage\.local\.(?:set|remove|clear)\s*\(/);
  assert.doesNotMatch(source, /\.dataset\b/);
  assert.doesNotMatch(source, /innerHTML/);
  assert.doesNotMatch(source, /console\./);
  assert.doesNotMatch(source, /setTimeout\s*\(/);
});

function createHarness({
  reader = createReader({ views: [missingView()] }),
  runtime = createRuntime(),
  localization = createLocalization('ja'),
  mutations = { isDistanceTermsDesiredStateSatisfied: () => false }
} = {}) {
  const { document, elements, existingSetting } = createFakeDocument();
  const controller = createDistanceTermsOptionsController({
    document,
    runtimeApi: runtime,
    localization,
    reader,
    mutations,
    coreApi: core
  });

  return { controller, document, elements, existingSetting, reader, runtime };
}

async function initializeHarness(options) {
  const harness = createHarness(options);
  assert.equal(await harness.controller.initialize(), true);
  return harness;
}

function createReader({ views = [], reconciliations = [] } = {}) {
  let viewIndex = 0;
  let reconciliationIndex = 0;

  return {
    optionReadCount: 0,
    reconciliationReadCount: 0,
    async readDistanceTermsOptionsView() {
      this.optionReadCount += 1;
      const value = views[Math.min(viewIndex, views.length - 1)];
      viewIndex += 1;
      return await value;
    },
    async readDistanceTermsOptionsReconciliationSnapshot() {
      this.reconciliationReadCount += 1;
      const value = reconciliations[Math.min(reconciliationIndex, reconciliations.length - 1)];
      reconciliationIndex += 1;
      return await value;
    }
  };
}

function createRuntime(responses = []) {
  let responseIndex = 0;

  return {
    requests: [],
    async sendMessage(message) {
      this.requests.push(message);
      const value = responses[Math.min(responseIndex, responses.length - 1)];
      responseIndex += 1;

      if (value === undefined) {
        return okResponse();
      }

      return await value;
    }
  };
}

function createLocalization(locale) {
  const messages = locale === 'ja' ? JA_MESSAGES : EN_MESSAGES;

  return {
    resolvedLanguage: locale,
    getMessage(key, substitutions) {
      let message = messages[key]?.message ?? key;

      if (Array.isArray(substitutions)) {
        substitutions.forEach((substitution, index) => {
          message = message.replaceAll(`$${index + 1}`, String(substitution));
        });
      }

      return message;
    }
  };
}

function createFakeDocument() {
  const document = {
    activeElement: null,
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
    getElementById(id) {
      return elementsById.get(id) ?? null;
    }
  };
  const elementsById = new Map();
  const createStatic = (name, id, tagName = 'div') => {
    const element = new FakeElement(tagName, document);
    element.id = id;
    element.setAttribute('id', id);
    elementsById.set(id, element);
    elements[name] = element;
    return element;
  };
  const elements = {};

  createStatic('section', 'distance-terms-section', 'section');
  createStatic('title', 'distance-terms-title', 'h2');
  createStatic('description', 'distance-terms-description', 'p');
  createStatic('privacy', 'distance-terms-privacy', 'p');
  createStatic('manualLink', 'distance-terms-manual-link', 'a');
  createStatic('manualLabel', 'distance-terms-manual-label', 'span');
  createStatic('manualNewTab', 'distance-terms-manual-new-tab', 'span');
  createStatic('stateArea', 'distance-terms-storage-state');
  createStatic('normalArea', 'distance-terms-management');
  createStatic('masterCheckbox', 'distance-terms-master-enabled', 'input');
  createStatic('masterLabel', 'distance-terms-master-label', 'span');
  createStatic('masterNote', 'distance-terms-master-note', 'span');
  createStatic('addHeading', 'distance-terms-add-heading', 'h3');
  createStatic('addForm', 'distance-terms-add-form', 'form');
  createStatic('addInput', 'distance-terms-add-input', 'input');
  createStatic('addButton', 'distance-terms-add-button', 'button');
  createStatic('validation', 'distance-terms-validation', 'p');
  createStatic('maximum', 'distance-terms-maximum', 'p');
  createStatic('count', 'distance-terms-count', 'p');
  createStatic('listHeading', 'distance-terms-list-heading', 'h3');
  createStatic('list', 'distance-terms-list', 'ul');
  createStatic('empty', 'distance-terms-empty', 'p');
  createStatic('status', 'distance-terms-status', 'p');

  for (const [prefix, name] of [
    ['delete', 'deleteDialog'],
    ['invalid', 'invalidDialog'],
    ['reset', 'resetDialog']
  ]) {
    createStatic(name, `distance-terms-${prefix}-dialog`, 'dialog');
  }

  createStatic('deleteDialogTitle', 'distance-terms-delete-dialog-title', 'h2');
  createStatic('deleteDialogTarget', 'distance-terms-delete-dialog-target', 'p');
  createStatic('deleteDialogCannotRestore', 'distance-terms-delete-dialog-cannot-restore', 'p');
  createStatic('deleteDialogReregister', 'distance-terms-delete-dialog-reregister', 'p');
  createStatic('deleteDialogError', 'distance-terms-delete-dialog-error', 'p');
  createStatic('deleteDialogCancel', 'distance-terms-delete-dialog-cancel', 'button');
  createStatic('deleteDialogAction', 'distance-terms-delete-dialog-action', 'button');
  createStatic('invalidDialogTitle', 'distance-terms-invalid-dialog-title', 'h2');
  createStatic('invalidDialogBody', 'distance-terms-invalid-dialog-body', 'p');
  createStatic('invalidDialogCannotRestore', 'distance-terms-invalid-dialog-cannot-restore', 'p');
  createStatic('invalidDialogKeepsValid', 'distance-terms-invalid-dialog-keeps-valid', 'p');
  createStatic('invalidDialogError', 'distance-terms-invalid-dialog-error', 'p');
  createStatic('invalidDialogCancel', 'distance-terms-invalid-dialog-cancel', 'button');
  createStatic('invalidDialogAction', 'distance-terms-invalid-dialog-action', 'button');
  createStatic('resetDialogTitle', 'distance-terms-reset-dialog-title', 'h2');
  createStatic('resetDialogBody', 'distance-terms-reset-dialog-body', 'p');
  createStatic('resetDialogCannotUndo', 'distance-terms-reset-dialog-cannot-undo', 'p');
  createStatic('resetDialogOtherSettings', 'distance-terms-reset-dialog-other-settings', 'p');
  createStatic('resetDialogError', 'distance-terms-reset-dialog-error', 'p');
  createStatic('resetDialogCancel', 'distance-terms-reset-dialog-cancel', 'button');
  createStatic('resetDialogAction', 'distance-terms-reset-dialog-action', 'button');

  elements.normalArea.hidden = true;
  elements.validation.hidden = true;
  elements.maximum.hidden = true;
  elements.manualLink.append(elements.manualLabel, elements.manualNewTab);
  elements.section.append(
    elements.title,
    elements.description,
    elements.privacy,
    elements.manualLink,
    elements.stateArea,
    elements.normalArea,
    elements.status
  );
  elements.normalArea.append(
    elements.masterCheckbox,
    elements.masterLabel,
    elements.masterNote,
    elements.addHeading,
    elements.addForm,
    elements.maximum,
    elements.count,
    elements.listHeading,
    elements.empty,
    elements.list
  );
  elements.addForm.append(elements.addInput, elements.addButton, elements.validation);
  elements.deleteDialog.append(
    elements.deleteDialogTitle,
    elements.deleteDialogTarget,
    elements.deleteDialogCannotRestore,
    elements.deleteDialogReregister,
    elements.deleteDialogError,
    elements.deleteDialogCancel,
    elements.deleteDialogAction
  );
  elements.invalidDialog.append(
    elements.invalidDialogTitle,
    elements.invalidDialogBody,
    elements.invalidDialogCannotRestore,
    elements.invalidDialogKeepsValid,
    elements.invalidDialogError,
    elements.invalidDialogCancel,
    elements.invalidDialogAction
  );
  elements.resetDialog.append(
    elements.resetDialogTitle,
    elements.resetDialogBody,
    elements.resetDialogCannotUndo,
    elements.resetDialogOtherSettings,
    elements.resetDialogError,
    elements.resetDialogCancel,
    elements.resetDialogAction
  );

  const existingSetting = new FakeElement('input', document);
  return { document, elements, existingSetting };
}

class FakeElement {
  constructor(tagName, document) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = document;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.value = '';
    this.placeholder = '';
    this.href = '';
    this.open = false;
    this.tabIndex = 0;
  }

  append(...children) {
    this.children.push(...children);
  }

  prepend(...children) {
    this.children.unshift(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  async dispatch(type, init = {}) {
    const event = {
      ...init,
      type,
      target: this,
      currentTarget: this,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      }
    };

    for (const listener of this.listeners.get(type) ?? []) {
      await listener(event);
    }

    return event;
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
  }
}

function missingView() {
  return Object.freeze({
    state: STATES.MISSING,
    masterEnabled: true,
    items: Object.freeze([]),
    invalidCount: 0,
    rawItemCount: 0
  });
}

function validView(items, masterEnabled = true) {
  return Object.freeze({
    state: STATES.VALID,
    masterEnabled,
    items: Object.freeze(items),
    invalidCount: 0,
    rawItemCount: items.length
  });
}

function partialView(items, { invalidCount, rawItemCount }, masterEnabled = true) {
  return Object.freeze({
    state: STATES.PARTIALLY_INVALID,
    masterEnabled,
    items: Object.freeze(items),
    invalidCount,
    rawItemCount
  });
}

function stateOnlyView(state) {
  return Object.freeze({ state });
}

function item(id, term, enabled) {
  return Object.freeze({ id, term, enabled });
}

function createId(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function request(operation, payload) {
  const value = {
    type: 'distanceTermsMutation',
    protocolVersion: 1,
    operation
  };

  if (payload !== undefined) {
    value.payload = payload;
  }

  return value;
}

function okResponse() {
  return { ok: true, code: RESPONSE_CODES.OK };
}

function failureResponse(code) {
  return { ok: false, code };
}

function getItemCheckbox(harness, index) {
  return harness.elements.list.children[index].children[0].children[0];
}

function getDeleteButton(harness, index) {
  return harness.elements.list.children[index].children[1];
}

function findButtons(root) {
  return findAll(root, (element) => element.tagName === 'BUTTON');
}

function findFirstHeading(root) {
  return findAll(root, (element) => /^H[1-6]$/.test(element.tagName))[0] ?? null;
}

function findAll(root, predicate) {
  const matches = [];

  for (const child of root.children) {
    if (predicate(child)) {
      matches.push(child);
    }

    matches.push(...findAll(child, predicate));
  }

  return matches;
}

function getText(root) {
  return [root.textContent, ...root.children.map(getText)].filter(Boolean).join('\n');
}

function collectAttributeValues(root, attributeName) {
  const values = [];
  const value = root.getAttribute(attributeName);

  if (value !== null) {
    values.push(value);
  }

  for (const child of root.children) {
    values.push(...collectAttributeValues(child, attributeName));
  }

  return values;
}

function assertBusyState(harness, expectedBusy) {
  assert.equal(harness.elements.section.getAttribute('aria-busy'), expectedBusy ? 'true' : 'false');
  assert.equal(harness.elements.masterCheckbox.disabled, expectedBusy);
  assert.equal(harness.elements.addInput.disabled, expectedBusy);
  assert.equal(harness.elements.addButton.disabled, expectedBusy);
  assert.equal(getItemCheckbox(harness, 0).disabled, expectedBusy);
  assert.equal(getDeleteButton(harness, 0).disabled, expectedBusy);
  assert.equal(harness.elements.manualLink.disabled, false);
  assert.equal(harness.existingSetting.disabled, false);
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function readMessages(locale) {
  const filePath = path.join(__dirname, '..', '_locales', locale, 'messages.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function runTests() {
  let passed = 0;

  for (const { name, callback } of tests) {
    try {
      await callback();
      passed += 1;
    } catch (error) {
      console.error(`FAIL: ${name}`);
      throw error;
    }
  }

  console.log(`All distance terms options tests passed (${passed}).`);
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
