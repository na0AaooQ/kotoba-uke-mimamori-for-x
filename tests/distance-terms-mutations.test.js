'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../distance-terms-core');
const mutations = require('../distance-terms-mutations');

const { classifyDistanceTermsSnapshot } = core;
const { planDistanceTermsMutation, isDistanceTermsDesiredStateSatisfied } = mutations;

const ID_A = '00000000-0000-4000-8000-000000000001';
const ID_B = '00000000-0000-4000-9000-000000000002';
const ID_C = '00000000-0000-4000-a000-000000000003';
const ID_D = '00000000-0000-4000-b000-000000000004';
const OPERATIONS = [
  'addTerm',
  'setItemEnabled',
  'setMasterEnabled',
  'deleteItem',
  'deleteInvalidItems',
  'resetInvalidSettings'
];
const STATES = [
  'missing',
  'valid',
  'partially_invalid',
  'whole_invalid',
  'unsupported_schema',
  'read_error'
];
const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function validItem(id = ID_A, term = '仕事', enabled = true) {
  return { id, term, enabled };
}

function validSettings(items = [], masterEnabled = true) {
  return { schemaVersion: 1, masterEnabled, items };
}

function classifyValue(value) {
  return classifyDistanceTermsSnapshot({ readStatus: 'ok', exists: true, value });
}

function getStateFixture(state) {
  switch (state) {
    case 'missing':
      return {
        rawValue: undefined,
        classification: classifyDistanceTermsSnapshot({ readStatus: 'ok', exists: false })
      };
    case 'valid': {
      const rawValue = validSettings([validItem()]);
      return { rawValue, classification: classifyValue(rawValue) };
    }
    case 'partially_invalid': {
      const rawValue = validSettings([validItem(), { id: ID_B, term: '休息', enabled: 'invalid' }]);
      return { rawValue, classification: classifyValue(rawValue) };
    }
    case 'whole_invalid': {
      const rawValue = { schemaVersion: 1, masterEnabled: 'true', items: [] };
      return { rawValue, classification: classifyValue(rawValue) };
    }
    case 'unsupported_schema': {
      const rawValue = { schemaVersion: 2, future: true };
      return { rawValue, classification: classifyValue(rawValue) };
    }
    case 'read_error':
      return {
        rawValue: undefined,
        classification: classifyDistanceTermsSnapshot({ readStatus: 'error' })
      };
    default:
      throw new Error(`Unknown fixture state: ${state}`);
  }
}

function getOperationPayload(operation) {
  switch (operation) {
    case 'addTerm':
      return { term: '追加' };
    case 'setItemEnabled':
      return { id: ID_A, enabled: false };
    case 'setMasterEnabled':
      return { enabled: false };
    case 'deleteItem':
      return { id: ID_A };
    case 'deleteInvalidItems':
      return undefined;
    case 'resetInvalidSettings':
      return { confirmation: 'RESET_DISTANCE_TERMS_SETTINGS' };
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

function planForFixture(state, operation, overrides = {}) {
  const fixture = getStateFixture(state);
  const input = {
    rawValue: fixture.rawValue,
    classification: fixture.classification,
    operation,
    payload: getOperationPayload(operation),
    ...overrides
  };

  if (operation === 'addTerm' && !Object.hasOwn(overrides, 'generatedId')) {
    input.generatedId = ID_D;
  }

  return planDistanceTermsMutation(input);
}

const MATRIX_EXPECTATIONS = Object.freeze({
  missing: Object.freeze({
    addTerm: ['OK', true, true],
    setItemEnabled: ['ITEM_NOT_FOUND', false, false],
    setMasterEnabled: ['OK', true, true],
    deleteItem: ['NO_CHANGE', false, true],
    deleteInvalidItems: ['NO_CHANGE', false, true],
    resetInvalidSettings: ['RECOVERY_NOT_ALLOWED', false, false]
  }),
  valid: Object.freeze({
    addTerm: ['OK', true, true],
    setItemEnabled: ['OK', true, true],
    setMasterEnabled: ['OK', true, true],
    deleteItem: ['OK', true, true],
    deleteInvalidItems: ['NO_CHANGE', false, true],
    resetInvalidSettings: ['RECOVERY_NOT_ALLOWED', false, false]
  }),
  partially_invalid: Object.freeze({
    addTerm: ['OK', true, true],
    setItemEnabled: ['OK', true, true],
    setMasterEnabled: ['OK', true, true],
    deleteItem: ['OK', true, true],
    deleteInvalidItems: ['OK', true, true],
    resetInvalidSettings: ['RECOVERY_NOT_ALLOWED', false, false]
  }),
  whole_invalid: Object.freeze({
    addTerm: ['SETTINGS_INVALID', false, false],
    setItemEnabled: ['SETTINGS_INVALID', false, false],
    setMasterEnabled: ['SETTINGS_INVALID', false, false],
    deleteItem: ['SETTINGS_INVALID', false, false],
    deleteInvalidItems: ['RECOVERY_NOT_ALLOWED', false, false],
    resetInvalidSettings: ['OK', true, true]
  }),
  unsupported_schema: Object.freeze({
    addTerm: ['UNSUPPORTED_SCHEMA', false, false],
    setItemEnabled: ['UNSUPPORTED_SCHEMA', false, false],
    setMasterEnabled: ['UNSUPPORTED_SCHEMA', false, false],
    deleteItem: ['UNSUPPORTED_SCHEMA', false, false],
    deleteInvalidItems: ['UNSUPPORTED_SCHEMA', false, false],
    resetInvalidSettings: ['UNSUPPORTED_SCHEMA', false, false]
  }),
  read_error: Object.freeze({
    addTerm: ['STORAGE_READ_FAILED', false, false],
    setItemEnabled: ['STORAGE_READ_FAILED', false, false],
    setMasterEnabled: ['STORAGE_READ_FAILED', false, false],
    deleteItem: ['STORAGE_READ_FAILED', false, false],
    deleteInvalidItems: ['STORAGE_READ_FAILED', false, false],
    resetInvalidSettings: ['STORAGE_READ_FAILED', false, false]
  })
});

for (const state of STATES) {
  for (const operation of OPERATIONS) {
    test(`6x6 matrix: ${state} x ${operation}`, () => {
      const result = planForFixture(state, operation);
      const [expectedCode, expectedShouldWrite, expectedOk] = MATRIX_EXPECTATIONS[state][operation];

      assert.equal(result.code, expectedCode);
      assert.equal(result.shouldWrite, expectedShouldWrite);
      assert.equal(result.ok, expectedOk);

      if (expectedShouldWrite) {
        assert.equal(Object.hasOwn(result, 'nextValue'), true);
      } else {
        assert.deepEqual(Object.keys(result).sort(), ['code', 'ok', 'shouldWrite']);
      }
    });
  }
}

test('公開APIが正式契約に一致する', () => {
  assert.deepEqual(Object.keys(mutations).sort(), [
    'isDistanceTermsDesiredStateSatisfied',
    'planDistanceTermsMutation'
  ]);
  assert.equal(globalThis.kotobaUkeMimamoriDistanceTermsMutations, mutations);
  assert.equal(Object.isFrozen(mutations), true);
});

test('planner inputとpayloadをstrictに検証する', () => {
  const fixture = getStateFixture('valid');
  const base = {
    rawValue: fixture.rawValue,
    classification: fixture.classification
  };
  const invalidInputs = [
    null,
    { ...base, operation: 'unknown', payload: {} },
    { ...base, operation: 'addTerm', payload: { term: '追加' } },
    {
      ...base,
      operation: 'addTerm',
      payload: { term: '追加', unknown: true },
      generatedId: ID_D
    },
    {
      ...base,
      operation: 'setMasterEnabled',
      payload: { enabled: 'false' }
    },
    {
      ...base,
      operation: 'setItemEnabled',
      payload: { id: 'not-a-uuid', enabled: true }
    },
    {
      ...base,
      operation: 'deleteInvalidItems',
      payload: {}
    },
    {
      ...base,
      operation: 'resetInvalidSettings',
      payload: { confirmation: 'RESET' }
    },
    {
      ...base,
      operation: 'setMasterEnabled',
      payload: { enabled: true },
      generatedId: undefined
    }
  ];

  for (const input of invalidInputs) {
    assert.deepEqual(planDistanceTermsMutation(input), {
      ok: false,
      code: 'INVALID_REQUEST',
      shouldWrite: false
    });
  }
});

test('契約外object accessがthrowしてもfail-safeに扱う', () => {
  const throwingInput = {};
  Object.defineProperty(throwingInput, 'operation', {
    enumerable: true,
    get() {
      throw new Error('untrusted getter');
    }
  });

  assert.deepEqual(planDistanceTermsMutation(throwingInput), {
    ok: false,
    code: 'INVALID_REQUEST',
    shouldWrite: false
  });
  assert.equal(isDistanceTermsDesiredStateSatisfied(throwingInput), false);
});

test('addTerm missingはcanonical termを持つ初期Storageを作成する', () => {
  const result = planForFixture('missing', 'addTerm', {
    payload: { term: '  Ｈｅｌｌｏ  ' },
    generatedId: ID_A
  });

  assert.deepEqual(result, {
    ok: true,
    code: 'OK',
    shouldWrite: true,
    nextValue: {
      schemaVersion: 1,
      masterEnabled: true,
      items: [{ id: ID_A, term: 'Hello', enabled: true }]
    }
  });
});

test('partial addはinvalid raw entryと既存順を保持する', () => {
  const invalidRawItem = { id: ID_B, term: '休息', enabled: 'invalid' };
  const existingItem = validItem(ID_A, '仕事');
  const rawValue = validSettings([existingItem, invalidRawItem], false);
  const result = planDistanceTermsMutation({
    rawValue,
    classification: classifyValue(rawValue),
    operation: 'addTerm',
    payload: { term: '  ＡＢ  ' },
    generatedId: ID_C
  });

  assert.equal(result.ok, true);
  assert.equal(result.nextValue.masterEnabled, false);
  assert.equal(result.nextValue.items[0], existingItem);
  assert.equal(result.nextValue.items[1], invalidRawItem);
  assert.deepEqual(result.nextValue.items[2], { id: ID_C, term: 'AB', enabled: true });
  assert.deepEqual(rawValue.items, [existingItem, invalidRawItem]);
  assert.equal(classifyValue(result.nextValue).state, 'partially_invalid');
  assert.equal(classifyValue(result.nextValue).invalidCount, 1);
});

test('addTermはraw 30 itemsでLIMIT_REACHEDにする', () => {
  const items = Array.from({ length: 29 }, (_value, index) => {
    const suffix = String(index + 1).padStart(12, '0');
    return validItem(`00000000-0000-4000-8000-${suffix}`, `項目${index}`);
  });
  items.push({ id: ID_D, term: '壊れた項目', enabled: 'invalid' });
  const rawValue = validSettings(items);

  assert.deepEqual(
    planDistanceTermsMutation({
      rawValue,
      classification: classifyValue(rawValue),
      operation: 'addTerm',
      payload: { term: '追加' },
      generatedId: 'ffffffff-ffff-4fff-bfff-ffffffffffff'
    }),
    { ok: false, code: 'LIMIT_REACHED', shouldWrite: false }
  );
});

test('addTermはcore validation codeを固定codeとして返す', () => {
  assert.equal(
    planForFixture('valid', 'addTerm', { payload: { term: 'a' } }).code,
    'INVALID_TERM_LENGTH'
  );
  assert.equal(
    planForFixture('valid', 'addTerm', { payload: { term: 'A\u200bB' } }).code,
    'FORBIDDEN_CHARACTER'
  );
});

test('addTermはvalid disabled safe-readable-invalidとのduplicateを拒否する', () => {
  const fixtures = [
    validSettings([validItem(ID_A, 'Hello')]),
    validSettings([validItem(ID_A, 'Hello', false)]),
    validSettings([{ id: 'invalid-id', term: 'Hello', enabled: true }])
  ];

  for (const rawValue of fixtures) {
    assert.deepEqual(
      planDistanceTermsMutation({
        rawValue,
        classification: classifyValue(rawValue),
        operation: 'addTerm',
        payload: { term: 'ＨＥＬＬＯ' },
        generatedId: ID_D
      }),
      { ok: false, code: 'DUPLICATE_TERM', shouldWrite: false }
    );
  }
});

test('addTermはgenerated ID collisionを拒否する', () => {
  assert.deepEqual(planForFixture('valid', 'addTerm', { generatedId: ID_A.toUpperCase() }), {
    ok: false,
    code: 'INVALID_REQUEST',
    shouldWrite: false
  });
});

test('setMasterEnabled missing trueはNO_CHANGE falseはexact initial falseを書く', () => {
  assert.deepEqual(planForFixture('missing', 'setMasterEnabled', { payload: { enabled: true } }), {
    ok: true,
    code: 'NO_CHANGE',
    shouldWrite: false
  });

  const result = planForFixture('missing', 'setMasterEnabled');
  assert.deepEqual(result.nextValue, { schemaVersion: 1, masterEnabled: false, items: [] });
});

test('setMasterEnabledはsame valueをNO_CHANGEにしpartial rawを保持する', () => {
  assert.deepEqual(planForFixture('valid', 'setMasterEnabled', { payload: { enabled: true } }), {
    ok: true,
    code: 'NO_CHANGE',
    shouldWrite: false
  });

  const invalidItem = { id: ID_B, term: '休息', enabled: 'invalid' };
  const rawValue = validSettings([validItem(), invalidItem]);
  const result = planDistanceTermsMutation({
    rawValue,
    classification: classifyValue(rawValue),
    operation: 'setMasterEnabled',
    payload: { enabled: false }
  });

  assert.equal(result.nextValue.items[0], rawValue.items[0]);
  assert.equal(result.nextValue.items[1], invalidItem);
  assert.equal(result.nextValue.masterEnabled, false);
  assert.equal(rawValue.masterEnabled, true);
});

test('setItemEnabledはunique usable targetだけを変更しsame valueはNO_CHANGEにする', () => {
  const rawValue = validSettings([validItem(ID_A, '仕事'), validItem(ID_B, '休息', false)]);
  const classification = classifyValue(rawValue);
  const changed = planDistanceTermsMutation({
    rawValue,
    classification,
    operation: 'setItemEnabled',
    payload: { id: ID_A.toUpperCase(), enabled: false }
  });

  assert.equal(changed.nextValue.items[0].enabled, false);
  assert.equal(changed.nextValue.items[0].id, ID_A);
  assert.equal(changed.nextValue.items[0].term, '仕事');
  assert.equal(changed.nextValue.items[1], rawValue.items[1]);
  assert.equal(rawValue.items[0].enabled, true);
  assert.deepEqual(
    planDistanceTermsMutation({
      rawValue,
      classification,
      operation: 'setItemEnabled',
      payload: { id: ID_B, enabled: false }
    }),
    { ok: true, code: 'NO_CHANGE', shouldWrite: false }
  );
});

test('setItemEnabledはpartialのinvalid raw entryを保持する', () => {
  const target = validItem(ID_A, '仕事', true);
  const invalid = { id: ID_B, term: '休息', enabled: 'invalid' };
  const unrelated = validItem(ID_C, '距離', false);
  const rawValue = validSettings([target, invalid, unrelated]);
  const result = planDistanceTermsMutation({
    rawValue,
    classification: classifyValue(rawValue),
    operation: 'setItemEnabled',
    payload: { id: ID_A, enabled: false }
  });

  assert.equal(result.ok, true);
  assert.equal(result.nextValue.items[0].enabled, false);
  assert.equal(result.nextValue.items[1], invalid);
  assert.equal(result.nextValue.items[2], unrelated);
  assert.equal(classifyValue(result.nextValue).invalidCount, 1);
  assert.equal(rawValue.items[0].enabled, true);
});

test('setItemEnabledはinvalid ambiguous conflict targetをITEM_NOT_EDITABLEにする', () => {
  const fixtures = [
    validSettings([{ id: ID_A, term: '仕事', enabled: 'invalid' }]),
    validSettings([validItem(ID_A, '仕事'), validItem(ID_A.toUpperCase(), '休息')]),
    validSettings([validItem(ID_A, 'Hello'), validItem(ID_B, 'hello')])
  ];

  for (const rawValue of fixtures) {
    assert.equal(
      planDistanceTermsMutation({
        rawValue,
        classification: classifyValue(rawValue),
        operation: 'setItemEnabled',
        payload: { id: ID_A, enabled: false }
      }).code,
      'ITEM_NOT_EDITABLE'
    );
  }
});

test('setItemEnabled absent targetはITEM_NOT_FOUNDにする', () => {
  assert.equal(
    planForFixture('valid', 'setItemEnabled', { payload: { id: ID_C, enabled: false } }).code,
    'ITEM_NOT_FOUND'
  );
});

test('deleteItemはusable targetだけを削除しunrelated rawと順序を保持する', () => {
  const first = validItem(ID_A, '仕事');
  const invalid = { id: ID_B, term: '休息', enabled: 'invalid' };
  const last = validItem(ID_C, '距離');
  const rawValue = validSettings([first, invalid, last]);
  const result = planDistanceTermsMutation({
    rawValue,
    classification: classifyValue(rawValue),
    operation: 'deleteItem',
    payload: { id: ID_A }
  });

  assert.deepEqual(result.nextValue.items, [invalid, last]);
  assert.equal(result.nextValue.items[0], invalid);
  assert.equal(result.nextValue.items[1], last);
  assert.deepEqual(rawValue.items, [first, invalid, last]);
});

test('deleteItem absentはNO_CHANGE invalidとconflict targetはITEM_NOT_EDITABLEにする', () => {
  assert.equal(planForFixture('valid', 'deleteItem', { payload: { id: ID_C } }).code, 'NO_CHANGE');

  const invalidRaw = validSettings([{ id: ID_A, term: 'a', enabled: true }]);
  assert.equal(
    planDistanceTermsMutation({
      rawValue: invalidRaw,
      classification: classifyValue(invalidRaw),
      operation: 'deleteItem',
      payload: { id: ID_A }
    }).code,
    'ITEM_NOT_EDITABLE'
  );

  const conflictRaw = validSettings([validItem(ID_A, 'Hello'), validItem(ID_B, 'hello')]);
  assert.equal(
    planDistanceTermsMutation({
      rawValue: conflictRaw,
      classification: classifyValue(conflictRaw),
      operation: 'deleteItem',
      payload: { id: ID_A }
    }).code,
    'ITEM_NOT_EDITABLE'
  );
});

test('deleteInvalidItemsはcurrent invalidだけを削除しusable rawと順序を保持する', () => {
  const first = validItem(ID_A, '仕事', false);
  const invalid = { id: ID_B, term: '休息', enabled: 'invalid' };
  const last = validItem(ID_C, '距離', true);
  const rawValue = validSettings([first, invalid, last], false);
  const result = planDistanceTermsMutation({
    rawValue,
    classification: classifyValue(rawValue),
    operation: 'deleteInvalidItems',
    payload: undefined
  });

  assert.equal(result.ok, true);
  assert.equal(result.nextValue.masterEnabled, false);
  assert.deepEqual(result.nextValue.items, [first, last]);
  assert.equal(result.nextValue.items[0], first);
  assert.equal(result.nextValue.items[1], last);
  assert.equal(classifyValue(result.nextValue).state, 'valid');
  assert.deepEqual(rawValue.items, [first, invalid, last]);
});

test('resetInvalidSettingsはexact confirmation時だけexact initial structureを返す', () => {
  const result = planForFixture('whole_invalid', 'resetInvalidSettings');
  assert.deepEqual(result, {
    ok: true,
    code: 'OK',
    shouldWrite: true,
    nextValue: { schemaVersion: 1, masterEnabled: true, items: [] }
  });

  assert.deepEqual(
    planForFixture('whole_invalid', 'resetInvalidSettings', {
      payload: { confirmation: 'RESET_DISTANCE_TERMS_SETTINGS ' }
    }),
    { ok: false, code: 'INVALID_REQUEST', shouldWrite: false }
  );
});

test('rawValueとclassification不一致はINTEGRITY_CHECK_FAILEDにする', () => {
  const classificationRaw = validSettings([validItem(ID_A, '仕事')]);
  const differentRaw = validSettings([validItem(ID_B, '休息')]);

  assert.deepEqual(
    planDistanceTermsMutation({
      rawValue: differentRaw,
      classification: classifyValue(classificationRaw),
      operation: 'setItemEnabled',
      payload: { id: ID_A, enabled: false }
    }),
    { ok: false, code: 'INTEGRITY_CHECK_FAILED', shouldWrite: false }
  );
  assert.equal(differentRaw.items[0].enabled, true);
});

test('add desired-stateはunique enabled usable itemかつnamespace count 1だけtrueにする', () => {
  const satisfiedRaw = validSettings([validItem(ID_A, 'Hello', true)]);
  const disabledRaw = validSettings([validItem(ID_A, 'Hello', false)]);
  const invalidOnlyRaw = validSettings([{ id: 'invalid-id', term: 'Hello', enabled: true }]);
  const conflictRaw = validSettings([validItem(ID_A, 'Hello'), validItem(ID_B, 'hello')]);
  const desiredInput = { operation: 'addTerm', payload: { term: 'ＨＥＬＬＯ' } };

  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      ...desiredInput,
      classification: classifyValue(satisfiedRaw)
    }),
    true
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      ...desiredInput,
      classification: classifyValue(disabledRaw)
    }),
    false
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      ...desiredInput,
      classification: classifyValue(invalidOnlyRaw)
    }),
    false
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      ...desiredInput,
      classification: classifyValue(conflictRaw)
    }),
    false
  );
});

test('master desired-stateはmissing trueを初期状態と同義にする', () => {
  const missing = getStateFixture('missing').classification;
  const validFalse = classifyValue(validSettings([], false));

  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: missing,
      operation: 'setMasterEnabled',
      payload: { enabled: true }
    }),
    true
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: missing,
      operation: 'setMasterEnabled',
      payload: { enabled: false }
    }),
    false
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: validFalse,
      operation: 'setMasterEnabled',
      payload: { enabled: false }
    }),
    true
  );
});

test('item enabled desired-stateはunique usable targetのdesired valueだけtrueにする', () => {
  const classification = classifyValue(validSettings([validItem(ID_A, '仕事', false)]));

  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification,
      operation: 'setItemEnabled',
      payload: { id: ID_A, enabled: false }
    }),
    true
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification,
      operation: 'setItemEnabled',
      payload: { id: ID_A, enabled: true }
    }),
    false
  );
});

test('delete desired-stateはsafe-readable ID namespaceにもtargetがない場合だけtrueにする', () => {
  const absentClassification = classifyValue(validSettings([validItem(ID_B, '仕事')]));
  const invalidTargetClassification = classifyValue(
    validSettings([{ id: ID_A, term: 'a', enabled: true }])
  );

  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: absentClassification,
      operation: 'deleteItem',
      payload: { id: ID_A }
    }),
    true
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: invalidTargetClassification,
      operation: 'deleteItem',
      payload: { id: ID_A }
    }),
    false
  );
});

test('Recovery desired-stateはvalidとexact initial stateを区別する', () => {
  const validNonempty = classifyValue(validSettings([validItem()]));
  const exactInitial = classifyValue(validSettings());
  const validMasterOff = classifyValue(validSettings([], false));

  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: validNonempty,
      operation: 'deleteInvalidItems',
      payload: undefined
    }),
    true
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: getStateFixture('missing').classification,
      operation: 'deleteInvalidItems',
      payload: undefined
    }),
    false
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: exactInitial,
      operation: 'resetInvalidSettings',
      payload: { confirmation: 'RESET_DISTANCE_TERMS_SETTINGS' }
    }),
    true
  );
  assert.equal(
    isDistanceTermsDesiredStateSatisfied({
      classification: validMasterOff,
      operation: 'resetInvalidSettings',
      payload: { confirmation: 'RESET_DISTANCE_TERMS_SETTINGS' }
    }),
    false
  );
});

test('plannerは既存3設定をdistance schemaとして扱わない', () => {
  const rawValue = {
    schemaVersion: 1,
    masterEnabled: true,
    items: [],
    enabled: false,
    cushionSensitivity: 'high',
    uiLanguage: 'en'
  };
  const before = structuredClone(rawValue);
  const result = planDistanceTermsMutation({
    rawValue,
    classification: classifyValue(rawValue),
    operation: 'setMasterEnabled',
    payload: { enabled: false }
  });

  assert.deepEqual(result, { ok: false, code: 'SETTINGS_INVALID', shouldWrite: false });
  assert.deepEqual(rawValue, before);
});

test('mutations production moduleはpure境界を維持する', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'distance-terms-mutations.js'), 'utf8');

  for (const forbiddenSource of [
    'chrome.',
    'document.',
    'localStorage',
    'fetch(',
    'XMLHttpRequest',
    'console.',
    'randomUUID',
    'cushionSensitivity',
    'uiLanguage'
  ]) {
    assert.equal(source.includes(forbiddenSource), false, `${forbiddenSource} must not be used`);
  }
});

function runTests() {
  for (const { name, callback } of tests) {
    try {
      callback();
    } catch (error) {
      error.message = `${name}: ${error.message}`;
      throw error;
    }
  }

  console.log(`All distance-terms mutations tests passed (${tests.length} tests).`);
}

runTests();
