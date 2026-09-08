'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../distance-terms-core');

const {
  CONSTANTS,
  validateDistanceTermInput,
  createDistanceTermDuplicateKey,
  isValidDistanceTermId,
  createInitialDistanceTermsSettings,
  classifyDistanceTermsSnapshot
} = core;

const ID_A = '00000000-0000-4000-8000-000000000001';
const ID_B = '00000000-0000-4000-9000-000000000002';
const ID_C = '00000000-0000-4000-a000-000000000003';
const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function validItem(id = ID_A, term = '仕事', enabled = true) {
  return { id, term, enabled };
}

function classifyValue(value) {
  return classifyDistanceTermsSnapshot({ readStatus: 'ok', exists: true, value });
}

function validSettings(items = [], masterEnabled = true) {
  return {
    schemaVersion: 1,
    masterEnabled,
    items
  };
}

function createUniqueItem(index) {
  const idSuffix = String(index + 1).padStart(12, '0');
  return validItem(`00000000-0000-4000-8000-${idSuffix}`, `項目${index}`);
}

test('公開APIと定数が正式契約に一致する', () => {
  assert.deepEqual(Object.keys(core).sort(), [
    'CONSTANTS',
    'classifyDistanceTermsSnapshot',
    'createDistanceTermDuplicateKey',
    'createInitialDistanceTermsSettings',
    'isValidDistanceTermId',
    'validateDistanceTermInput'
  ]);
  assert.deepEqual(
    {
      STORAGE_KEY: CONSTANTS.STORAGE_KEY,
      SCHEMA_VERSION: CONSTANTS.SCHEMA_VERSION,
      MIN_GRAPHEMES: CONSTANTS.MIN_GRAPHEMES,
      MAX_GRAPHEMES: CONSTANTS.MAX_GRAPHEMES,
      MAX_CODE_POINTS: CONSTANTS.MAX_CODE_POINTS,
      MAX_ITEMS: CONSTANTS.MAX_ITEMS,
      MESSAGE_TYPE: CONSTANTS.MESSAGE_TYPE,
      PROTOCOL_VERSION: CONSTANTS.PROTOCOL_VERSION,
      RESET_CONFIRMATION_VALUE: CONSTANTS.RESET_CONFIRMATION_VALUE
    },
    {
      STORAGE_KEY: 'distanceTermsSettings',
      SCHEMA_VERSION: 1,
      MIN_GRAPHEMES: 2,
      MAX_GRAPHEMES: 50,
      MAX_CODE_POINTS: 512,
      MAX_ITEMS: 30,
      MESSAGE_TYPE: 'distanceTermsMutation',
      PROTOCOL_VERSION: 1,
      RESET_CONFIRMATION_VALUE: 'RESET_DISTANCE_TERMS_SETTINGS'
    }
  );
  assert.deepEqual(Object.values(CONSTANTS.STATES), [
    'missing',
    'valid',
    'partially_invalid',
    'whole_invalid',
    'unsupported_schema',
    'read_error'
  ]);
  assert.deepEqual(Object.values(CONSTANTS.OPERATIONS), [
    'addTerm',
    'setItemEnabled',
    'setMasterEnabled',
    'deleteItem',
    'deleteInvalidItems',
    'resetInvalidSettings'
  ]);
  assert.deepEqual(Object.values(CONSTANTS.RESPONSE_CODES), [
    'OK',
    'NO_CHANGE',
    'INVALID_REQUEST',
    'INVALID_TERM_LENGTH',
    'FORBIDDEN_CHARACTER',
    'DUPLICATE_TERM',
    'LIMIT_REACHED',
    'ITEM_NOT_FOUND',
    'ITEM_NOT_EDITABLE',
    'RECOVERY_NOT_ALLOWED',
    'SETTINGS_INVALID',
    'UNSUPPORTED_SCHEMA',
    'STORAGE_READ_FAILED',
    'STORAGE_WRITE_FAILED',
    'INTEGRITY_CHECK_FAILED',
    'UNAUTHORIZED_SENDER',
    'INTERNAL_ERROR'
  ]);
  assert.equal(globalThis.kotobaUkeMimamoriDistanceTermsCore, core);
  assert.equal(Object.isFrozen(core), true);
  assert.equal(Object.isFrozen(CONSTANTS), true);
});

test('入力をNFKC化してtrimしASCII caseを保存する', () => {
  assert.deepEqual(validateDistanceTermInput(' \tＨｅｌｌｏ\n'), {
    ok: true,
    term: 'Hello',
    duplicateKey: 'hello'
  });
  assert.deepEqual(validateDistanceTermInput(' HELLO '), {
    ok: true,
    term: 'HELLO',
    duplicateKey: 'hello'
  });
});

test('2 graphemeと50 graphemeを受理する', () => {
  assert.equal(validateDistanceTermInput('ab').ok, true);
  assert.equal(validateDistanceTermInput('あ'.repeat(50)).ok, true);
});

test('1 graphemeと51 graphemeを拒否する', () => {
  assert.deepEqual(validateDistanceTermInput('a'), {
    ok: false,
    code: 'INVALID_TERM_LENGTH',
    reason: 'GRAPHEME_RANGE'
  });
  assert.deepEqual(validateDistanceTermInput('あ'.repeat(51)), {
    ok: false,
    code: 'INVALID_TERM_LENGTH',
    reason: 'GRAPHEME_RANGE'
  });
});

test('emojiとcombining sequenceをgraphemeとして扱う', () => {
  assert.equal(validateDistanceTermInput('😀a').ok, true);
  const result = validateDistanceTermInput('e\u0301x');
  assert.equal(result.ok, true);
  assert.equal(result.term, 'éx');
});

test('ZWJ emojiとvariation selectorを壊さず受理する', () => {
  assert.equal(validateDistanceTermInput('👨‍👩‍👧‍👦a').ok, true);
  assert.equal(validateDistanceTermInput('❤️a').ok, true);
});

test('512 code pointsを受理し513 code pointsを拒否する', () => {
  const atLimit = `a${'\u035d'.repeat(255)}b${'\u035d'.repeat(255)}`;
  const overLimit = `${atLimit}\u035d`;

  assert.equal(Array.from(atLimit).length, 512);
  assert.equal(validateDistanceTermInput(atLimit).ok, true);
  assert.deepEqual(validateDistanceTermInput(overLimit), {
    ok: false,
    code: 'INVALID_TERM_LENGTH',
    reason: 'CODE_POINT_LIMIT'
  });
});

test('内部空白と連続空白を保持する', () => {
  assert.deepEqual(validateDistanceTermInput(' A  B '), {
    ok: true,
    term: 'A  B',
    duplicateKey: 'a  b'
  });
});

test('outer LF CR TABとU+FEFFをtrim後に受理する', () => {
  assert.deepEqual(validateDistanceTermInput('\n\r\t\uFEFF仕事\uFEFF\t\r\n'), {
    ok: true,
    term: '仕事',
    duplicateKey: '仕事'
  });
});

test('internal LF CR TABを専用reasonで拒否する', () => {
  for (const character of ['\n', '\r', '\t']) {
    assert.deepEqual(validateDistanceTermInput(`仕${character}事`), {
      ok: false,
      code: 'FORBIDDEN_CHARACTER',
      reason: 'LINE_BREAK_OR_TAB'
    });
  }
});

test('C0 DEL C1 controlsを拒否する', () => {
  for (const codePoint of [0x0000, 0x0001, 0x001f, 0x007f, 0x0080, 0x009f]) {
    const result = validateDistanceTermInput(`A${String.fromCodePoint(codePoint)}B`);
    assert.equal(result.ok, false, `U+${codePoint.toString(16)} should be rejected`);
    assert.equal(result.code, 'FORBIDDEN_CHARACTER');
  }
});

test('bidi controlsを拒否する', () => {
  const bidiControls = [
    0x061c, 0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069
  ];

  for (const codePoint of bidiControls) {
    assert.equal(
      validateDistanceTermInput(`A${String.fromCodePoint(codePoint)}B`).ok,
      false,
      `U+${codePoint.toString(16)} should be rejected`
    );
  }
});

test('line separatorsと指定invisible charactersを拒否する', () => {
  const forbidden = [0x2028, 0x2029, 0x200b, 0x2060, 0xfeff, 0x00ad, 0x034f];

  for (const codePoint of forbidden) {
    assert.deepEqual(validateDistanceTermInput(`A${String.fromCodePoint(codePoint)}B`), {
      ok: false,
      code: 'FORBIDDEN_CHARACTER',
      reason: 'FORBIDDEN_CHARACTER'
    });
  }
});

test('ZWNJとZWJを許可する', () => {
  assert.equal(validateDistanceTermInput('A\u200cB').ok, true);
  assert.equal(validateDistanceTermInput('A\u200dB').ok, true);
});

test('Arabic Hebrew symbolsと通常Unicodeを許可する', () => {
  for (const term of ['مرحبا', 'שלום', '記号★', 'café']) {
    assert.equal(validateDistanceTermInput(term).ok, true, `${term} should be accepted`);
  }
});

test('duplicate keyはASCII A-Zだけをfoldする', () => {
  assert.equal(createDistanceTermDuplicateKey('HelloÄΩ'), 'helloÄΩ');
  assert.equal(createDistanceTermDuplicateKey('helloäω'), 'helloäω');
  assert.notEqual(
    createDistanceTermDuplicateKey('HelloÄΩ'),
    createDistanceTermDuplicateKey('helloäω')
  );
});

test('ASCII caseと全角NFKC入力は同じduplicate keyになる', () => {
  assert.equal(validateDistanceTermInput('Hello').duplicateKey, 'hello');
  assert.equal(validateDistanceTermInput('hello').duplicateKey, 'hello');
  assert.equal(validateDistanceTermInput('Ｈｅｌｌｏ').duplicateKey, 'hello');
});

test('containmentとhashtag有無はduplicateにしない', () => {
  assert.notEqual(
    validateDistanceTermInput('テスト').duplicateKey,
    validateDistanceTermInput('Xワンクッションテスト文字列').duplicateKey
  );
  assert.notEqual(
    validateDistanceTermInput('#topic').duplicateKey,
    validateDistanceTermInput('topic').duplicateKey
  );
});

test('契約外のterm型とIntl.Segmenter不在時はfail-safeに拒否する', () => {
  assert.equal(validateDistanceTermInput(null).ok, false);
  assert.equal(createDistanceTermDuplicateKey(null), '');

  const segmenterDescriptor = Object.getOwnPropertyDescriptor(globalThis.Intl, 'Segmenter');
  Object.defineProperty(globalThis.Intl, 'Segmenter', {
    configurable: true,
    value: undefined
  });

  try {
    assert.deepEqual(validateDistanceTermInput('仕事'), {
      ok: false,
      code: 'INVALID_TERM_LENGTH',
      reason: 'GRAPHEME_RANGE'
    });
  } finally {
    Object.defineProperty(globalThis.Intl, 'Segmenter', segmenterDescriptor);
  }
});

test('canonical hyphenated UUID v4とvariantだけを受理する', () => {
  for (const id of [ID_A, ID_B, ID_C, 'ABCDEFAB-CDEF-4ABC-BDEF-ABCDEFABCDEF']) {
    assert.equal(isValidDistanceTermId(id), true, `${id} should be valid`);
  }

  for (const id of [
    '00000000-0000-1000-8000-000000000001',
    '00000000-0000-5000-8000-000000000001',
    '00000000-0000-4000-7000-000000000001',
    '00000000-0000-4000-c000-000000000001',
    '00000000000040008000000000000001',
    null
  ]) {
    assert.equal(isValidDistanceTermId(id), false, `${String(id)} should be invalid`);
  }
});

test('初期設定を毎回新規生成しstrict boolean以外はdefaultへ縮退する', () => {
  const first = createInitialDistanceTermsSettings();
  const second = createInitialDistanceTermsSettings(false);

  assert.deepEqual(first, { schemaVersion: 1, masterEnabled: true, items: [] });
  assert.deepEqual(second, { schemaVersion: 1, masterEnabled: false, items: [] });
  assert.deepEqual(createInitialDistanceTermsSettings('false'), first);
  assert.notEqual(first, second);
  assert.notEqual(first.items, second.items);
});

test('missingとread_errorを区別する', () => {
  assert.deepEqual(classifyDistanceTermsSnapshot({ readStatus: 'ok', exists: false }), {
    state: 'missing'
  });
  assert.deepEqual(classifyDistanceTermsSnapshot({ readStatus: 'error' }), {
    state: 'read_error'
  });
  assert.deepEqual(classifyDistanceTermsSnapshot(null), { state: 'read_error' });
  assert.deepEqual(classifyDistanceTermsSnapshot({ readStatus: 'ok' }), {
    state: 'read_error'
  });
});

test('primitive null Array rootをwhole_invalidにする', () => {
  for (const value of [undefined, null, true, 1, 'value', []]) {
    assert.equal(classifyValue(value).state, 'whole_invalid');
  }
});

test('schemaVersion missing wrong type zero negative non-integerを拒否する', () => {
  const invalidRoots = [
    { masterEnabled: true, items: [] },
    { schemaVersion: '1', masterEnabled: true, items: [] },
    { schemaVersion: 0, masterEnabled: true, items: [] },
    { schemaVersion: -1, masterEnabled: true, items: [] },
    { schemaVersion: 1.5, masterEnabled: true, items: [] },
    { schemaVersion: Number.NaN, masterEnabled: true, items: [] }
  ];

  for (const root of invalidRoots) {
    assert.equal(classifyValue(root).state, 'whole_invalid');
  }
});

test('future schemaをunsupported_schemaとしてv1 deep validationしない', () => {
  const futureRoot = { schemaVersion: 2, unknownFutureField: true };
  Object.defineProperty(futureRoot, 'masterEnabled', {
    enumerable: true,
    get() {
      throw new Error('must not read future schema fields');
    }
  });

  assert.deepEqual(classifyValue(futureRoot), {
    state: 'unsupported_schema',
    schemaVersion: 2
  });
});

test('version 1 unknown root fieldをwhole_invalidにする', () => {
  assert.equal(
    classifyValue({ ...validSettings(), normalizedTerm: 'forbidden' }).state,
    'whole_invalid'
  );
});

test('masterEnabledはstrict boolean itemsはArrayだけを受理する', () => {
  for (const masterEnabled of ['true', 'false', 0, 1, null, undefined]) {
    assert.equal(
      classifyValue({ schemaVersion: 1, masterEnabled, items: [] }).state,
      'whole_invalid'
    );
  }

  for (const items of [null, {}, 'items']) {
    assert.equal(
      classifyValue({ schemaVersion: 1, masterEnabled: true, items }).state,
      'whole_invalid'
    );
  }
});

test('30 itemsを受理し31 itemsをwhole_invalidにする', () => {
  const thirtyItems = Array.from({ length: 30 }, (_value, index) => createUniqueItem(index));
  const validResult = classifyValue(validSettings(thirtyItems));

  assert.equal(validResult.state, 'valid');
  assert.equal(validResult.rawItemCount, 30);
  assert.equal(validResult.usableItems.length, 30);
  assert.equal(classifyValue(validSettings([...thirtyItems, null])).state, 'whole_invalid');
});

test('valid Storageをrich resultへ分類しitem順と表記を保持する', () => {
  const upperId = 'ABCDEFAB-CDEF-4ABC-BDEF-ABCDEFABCDEF';
  const result = classifyValue(
    validSettings([validItem(upperId, 'Hello', false), validItem(ID_B, '仕事', true)], false)
  );

  assert.equal(result.state, 'valid');
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.masterEnabled, false);
  assert.equal(result.rawItemCount, 2);
  assert.equal(result.invalidCount, 0);
  assert.deepEqual(result.usableItems, [
    {
      index: 0,
      id: upperId,
      idKey: upperId.toLowerCase(),
      term: 'Hello',
      termKey: 'hello',
      enabled: false
    },
    {
      index: 1,
      id: ID_B,
      idKey: ID_B,
      term: '仕事',
      termKey: '仕事',
      enabled: true
    }
  ]);
  assert.deepEqual(result.idKeyCounts, [
    { key: upperId.toLowerCase(), count: 1 },
    { key: ID_B, count: 1 }
  ]);
  assert.deepEqual(result.termKeyCounts, [
    { key: 'hello', count: 1 },
    { key: '仕事', count: 1 }
  ]);
});

test('malformed itemをroot昇格せずpartially_invalidにする', () => {
  for (const malformedItem of [null, 1, 'item', []]) {
    const result = classifyValue(validSettings([validItem(), malformedItem]));
    assert.equal(result.state, 'partially_invalid');
    assert.equal(result.usableItems.length, 1);
    assert.equal(result.invalidCount, 1);
    assert.equal(result.invalidItems[0].index, 1);
  }
});

test('missingまたはunknown item fieldをitem invalidにする', () => {
  const missingField = { id: ID_A, term: '仕事' };
  const unknownField = { ...validItem(ID_B, '休息'), extra: true };
  const result = classifyValue(validSettings([missingField, unknownField]));

  assert.equal(result.state, 'partially_invalid');
  assert.equal(result.invalidCount, 2);
  assert.equal(result.usableItems.length, 0);
  assert.ok(
    result.invalidItems.every(({ reasonCodes }) => reasonCodes.includes('INVALID_ITEM_FIELDS'))
  );
});

test('invalid UUID version variant enabled型をitem invalidにする', () => {
  const result = classifyValue(
    validSettings([
      validItem('00000000-0000-1000-8000-000000000001', '仕事'),
      validItem('00000000-0000-4000-7000-000000000002', '休息'),
      validItem(ID_C, '距離', 'true')
    ])
  );

  assert.equal(result.state, 'partially_invalid');
  assert.equal(result.invalidCount, 3);
  assert.equal(result.usableItems.length, 0);
});

test('noncanonical stored termをrepairせずinvalidにしnamespaceは予約する', () => {
  const rawValue = validSettings([validItem(ID_A, ' Ｈello ')]);
  const before = structuredClone(rawValue);
  const result = classifyValue(rawValue);

  assert.equal(result.state, 'partially_invalid');
  assert.equal(result.invalidCount, 1);
  assert.equal(result.usableItems.length, 0);
  assert.deepEqual(result.termKeyCounts, [{ key: 'hello', count: 1 }]);
  assert.ok(result.invalidItems[0].reasonCodes.includes('NONCANONICAL_TERM'));
  assert.deepEqual(rawValue, before);
});

test('safe-readable invalid termがduplicate namespaceを占有する', () => {
  const result = classifyValue(
    validSettings([validItem('not-a-uuid', 'Hello'), { id: ID_B, term: '仕事', enabled: 'true' }])
  );

  assert.deepEqual(result.termKeyCounts, [
    { key: 'hello', count: 1 },
    { key: '仕事', count: 1 }
  ]);
  assert.deepEqual(result.idKeyCounts, [{ key: ID_B, count: 1 }]);
  assert.equal(result.invalidCount, 2);
});

test('安全に解釈できないtermのduplicate keyを推測しない', () => {
  const result = classifyValue(
    validSettings([validItem(ID_A, 'A\u200bB'), { id: ID_B, term: 123, enabled: true }])
  );

  assert.deepEqual(result.termKeyCounts, []);
  assert.equal(result.invalidCount, 2);
});

test('duplicate valid UUIDの参加itemをすべてunusableにする', () => {
  const upperId = ID_A.toUpperCase();
  const result = classifyValue(
    validSettings([validItem(ID_A, '仕事'), validItem(upperId, '休息')])
  );

  assert.equal(result.state, 'partially_invalid');
  assert.equal(result.invalidCount, 2);
  assert.equal(result.usableItems.length, 0);
  assert.deepEqual(result.idKeyCounts, [{ key: ID_A, count: 2 }]);
  assert.ok(result.invalidItems.every(({ reasonCodes }) => reasonCodes.includes('DUPLICATE_ID')));
});

test('duplicate canonical termの参加itemをすべてunusableにする', () => {
  const result = classifyValue(
    validSettings([validItem(ID_A, 'Hello'), validItem(ID_B, 'hello', false)])
  );

  assert.equal(result.state, 'partially_invalid');
  assert.equal(result.invalidCount, 2);
  assert.equal(result.usableItems.length, 0);
  assert.deepEqual(result.termKeyCounts, [{ key: 'hello', count: 2 }]);
  assert.ok(result.invalidItems.every(({ reasonCodes }) => reasonCodes.includes('DUPLICATE_TERM')));
});

test('invalid itemとのterm conflictでもvalid itemをwinnerにしない', () => {
  const result = classifyValue(
    validSettings([
      validItem(ID_A, 'Hello'),
      { id: 'invalid-id', term: 'hello', enabled: 'true' },
      validItem(ID_C, '休息')
    ])
  );

  assert.equal(result.state, 'partially_invalid');
  assert.deepEqual(
    result.usableItems.map(({ id }) => id),
    [ID_C]
  );
  assert.deepEqual(
    result.invalidItems.map(({ index }) => index),
    [0, 1]
  );
  assert.deepEqual(result.termKeyCounts, [
    { key: 'hello', count: 2 },
    { key: '休息', count: 1 }
  ]);
});

test('全item invalidでもroot validならpartially_invalidにする', () => {
  const result = classifyValue(validSettings([null, { id: 'bad', term: 'a', enabled: null }]));

  assert.equal(result.state, 'partially_invalid');
  assert.equal(result.rawItemCount, 2);
  assert.equal(result.usableItems.length, 0);
  assert.equal(result.invalidCount, 2);
});

test('classificationへinvalid raw dataをコピーしない', () => {
  const invalidRawTerm = ' Ｈello ';
  const secretValue = 'RAW_SECRET_VALUE_SHOULD_NOT_ESCAPE';
  const result = classifyValue(
    validSettings([
      {
        id: 'invalid-id',
        term: invalidRawTerm,
        enabled: true,
        secret: secretValue
      }
    ])
  );
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes(invalidRawTerm), false);
  assert.equal(serialized.includes(secretValue), false);
  assert.equal(serialized.includes('invalid-id'), false);
  assert.deepEqual(result.termKeyCounts, [{ key: 'hello', count: 1 }]);
});

test('classification resultを可能な範囲でfreezeする', () => {
  const validResult = classifyValue(validSettings([validItem()]));
  const invalidResult = classifyValue(validSettings([null]));

  assert.equal(Object.isFrozen(validResult), true);
  assert.equal(Object.isFrozen(validResult.usableItems), true);
  assert.equal(Object.isFrozen(validResult.usableItems[0]), true);
  assert.equal(Object.isFrozen(validResult.idKeyCounts), true);
  assert.equal(Object.isFrozen(validResult.idKeyCounts[0]), true);
  assert.equal(Object.isFrozen(invalidResult.invalidItems), true);
  assert.equal(Object.isFrozen(invalidResult.invalidItems[0]), true);
  assert.equal(Object.isFrozen(invalidResult.invalidItems[0].reasonCodes), true);
});

test('core production moduleはpure境界を維持する', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'distance-terms-core.js'), 'utf8');

  for (const forbiddenSource of [
    'chrome.',
    'document.',
    'localStorage',
    'fetch(',
    'XMLHttpRequest',
    'console.',
    'randomUUID'
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

  console.log(`All distance-terms core tests passed (${tests.length} tests).`);
}

runTests();
