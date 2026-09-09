'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const reader = require('../distance-terms-reader');

const {
  readDistanceTermsOptionsView,
  readDistanceTermsContentView,
  readDistanceTermsMutationSnapshot
} = reader;

const ID_A = '00000000-0000-4000-8000-000000000001';
const ID_B = '00000000-0000-4000-9000-000000000002';
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

function useStorageGet(get) {
  globalThis.chrome = {
    storage: {
      local: {
        get,
        set() {
          throw new Error('reader must not write');
        },
        remove() {
          throw new Error('reader must not remove');
        },
        clear() {
          throw new Error('reader must not clear');
        }
      }
    }
  };
}

test('公開APIが正式契約に一致する', async () => {
  assert.deepEqual(Object.keys(reader).sort(), [
    'readDistanceTermsContentView',
    'readDistanceTermsMutationSnapshot',
    'readDistanceTermsOptionsView'
  ]);
  assert.equal(globalThis.kotobaUkeMimamoriDistanceTermsReader, reader);
  assert.equal(Object.isFrozen(reader), true);
});

test('Storage keyを指定してcore経由のOptions viewを返す', async () => {
  const calls = [];
  useStorageGet(async (key) => {
    calls.push(key);
    return {
      distanceTermsSettings: validSettings([
        validItem(ID_A, '仕事', true),
        validItem(ID_B, '#topic', false)
      ])
    };
  });

  assert.deepEqual(await readDistanceTermsOptionsView(), {
    state: 'valid',
    masterEnabled: true,
    items: [
      { id: ID_A, term: '仕事', enabled: true },
      { id: ID_B, term: '#topic', enabled: false }
    ],
    invalidCount: 0,
    rawItemCount: 2
  });
  assert.deepEqual(calls, ['distanceTermsSettings']);
});

test('key absentだけをmissingとして既定Options viewへ投影する', async () => {
  useStorageGet(async () => ({ unrelated: true }));

  assert.deepEqual(await readDistanceTermsOptionsView(), {
    state: 'missing',
    masterEnabled: true,
    items: [],
    invalidCount: 0,
    rawItemCount: 0
  });
});

test('partially_invalidではusable itemだけをOptionsへ返す', async () => {
  const invalidRawTerm = 'SECRET_INVALID_TERM';
  useStorageGet(async () => ({
    distanceTermsSettings: validSettings([
      validItem(),
      { id: ID_B, term: invalidRawTerm, enabled: 'true', secret: 'RAW_SECRET' }
    ])
  }));

  const view = await readDistanceTermsOptionsView();

  assert.deepEqual(view, {
    state: 'partially_invalid',
    masterEnabled: true,
    items: [{ id: ID_A, term: '仕事', enabled: true }],
    invalidCount: 1,
    rawItemCount: 2
  });
  const serialized = JSON.stringify(view);
  assert.equal(serialized.includes(invalidRawTerm), false);
  assert.equal(serialized.includes('RAW_SECRET'), false);
});

test('Options viewへ内部index reason duplicate key等を漏らさない', async () => {
  useStorageGet(async () => ({
    distanceTermsSettings: validSettings([validItem()])
  }));

  const view = await readDistanceTermsOptionsView();
  const serialized = JSON.stringify(view);

  for (const internalField of [
    'index',
    'reasonCodes',
    'idKey',
    'termKey',
    'idKeyCounts',
    'termKeyCounts',
    'classification',
    'rawValue'
  ]) {
    assert.equal(serialized.includes(internalField), false);
  }
});

test('whole_invalid unsupported_schema read_errorはstateだけをOptionsへ返す', async () => {
  const cases = [
    [null, 'whole_invalid'],
    [{ schemaVersion: 2, future: true }, 'unsupported_schema']
  ];

  for (const [value, state] of cases) {
    useStorageGet(async () => ({ distanceTermsSettings: value }));
    assert.deepEqual(await readDistanceTermsOptionsView(), { state });
  }

  useStorageGet(async () => null);
  assert.deepEqual(await readDistanceTermsOptionsView(), { state: 'read_error' });
});

test('get rejectionと同期throwをread_errorへ縮退する', async () => {
  useStorageGet(async () => {
    throw new Error('rejected');
  });
  assert.deepEqual(await readDistanceTermsOptionsView(), { state: 'read_error' });

  useStorageGet(() => {
    throw new Error('thrown');
  });
  assert.deepEqual(await readDistanceTermsOptionsView(), { state: 'read_error' });
});

test('null primitive Array resolveをmissingでなくread_errorにする', async () => {
  for (const value of [null, undefined, true, 1, 'result', []]) {
    useStorageGet(async () => value);
    assert.deepEqual(await readDistanceTermsOptionsView(), { state: 'read_error' });
  }
});

test('Storage resultの安全でないproperty accessをread_errorにする', async () => {
  const result = {};
  Object.defineProperty(result, 'distanceTermsSettings', {
    enumerable: true,
    get() {
      throw new Error('unsafe getter');
    }
  });
  useStorageGet(async () => result);

  assert.deepEqual(await readDistanceTermsOptionsView(), { state: 'read_error' });
});

test('Content viewはenabled usable canonical termsだけを返す', async () => {
  useStorageGet(async () => ({
    distanceTermsSettings: validSettings([
      validItem(ID_A, '仕事', true),
      validItem(ID_B, '#topic', false),
      { id: 'bad-id', term: '秘密', enabled: true }
    ])
  }));

  assert.deepEqual(await readDistanceTermsContentView(), { terms: ['仕事'] });
  assert.deepEqual(Object.keys(await readDistanceTermsContentView()), ['terms']);
});

test('Master OFFではContent termsを空にする', async () => {
  useStorageGet(async () => ({
    distanceTermsSettings: validSettings([validItem()], false)
  }));

  assert.deepEqual(await readDistanceTermsContentView(), { terms: [] });
});

test('missing whole unsupported read_errorはContent termsを空にする', async () => {
  const results = [
    {},
    { distanceTermsSettings: null },
    { distanceTermsSettings: { schemaVersion: 2 } },
    null
  ];

  for (const result of results) {
    useStorageGet(async () => result);
    assert.deepEqual(await readDistanceTermsContentView(), { terms: [] });
  }
});

test('Mutation snapshotのrawValueとclassificationは同じ1回のread由来', async () => {
  const first = validSettings([validItem(ID_A, '仕事')]);
  const second = validSettings([validItem(ID_B, '休息')]);
  let readCount = 0;
  useStorageGet(async () => {
    readCount += 1;
    return { distanceTermsSettings: readCount === 1 ? first : second };
  });

  const snapshot = await readDistanceTermsMutationSnapshot();

  assert.equal(readCount, 1);
  assert.equal(snapshot.rawValue, first);
  assert.equal(snapshot.classification.usableItems[0].term, '仕事');
});

test('missing Mutation snapshotはraw undefinedとmissing classificationを返す', async () => {
  useStorageGet(async () => ({}));

  assert.deepEqual(await readDistanceTermsMutationSnapshot(), {
    rawValue: undefined,
    classification: { state: 'missing' }
  });
});

test('read_error Mutation snapshotはraw undefinedを返す', async () => {
  useStorageGet(async () => null);

  assert.deepEqual(await readDistanceTermsMutationSnapshot(), {
    rawValue: undefined,
    classification: { state: 'read_error' }
  });
});

test('projectionをfreezeするがraw Storageはdeep-freezeしない', async () => {
  const rawValue = validSettings([validItem()]);
  useStorageGet(async () => ({ distanceTermsSettings: rawValue }));

  const optionsView = await readDistanceTermsOptionsView();
  const contentView = await readDistanceTermsContentView();
  const mutationSnapshot = await readDistanceTermsMutationSnapshot();

  assert.equal(Object.isFrozen(optionsView), true);
  assert.equal(Object.isFrozen(optionsView.items), true);
  assert.equal(Object.isFrozen(optionsView.items[0]), true);
  assert.equal(Object.isFrozen(contentView), true);
  assert.equal(Object.isFrozen(contentView.terms), true);
  assert.equal(Object.isFrozen(mutationSnapshot), true);
  assert.equal(Object.isFrozen(rawValue), false);
  assert.equal(Object.isFrozen(rawValue.items), false);
});

test('reader production moduleはread-only境界とdata minimizationを維持する', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'distance-terms-reader.js'), 'utf8');

  assert.equal(source.includes('storage.local.get'), true);

  for (const forbiddenSource of [
    'storage.local.set',
    'storage.local.remove',
    'storage.local.clear',
    'document.',
    'localStorage',
    'fetch(',
    'XMLHttpRequest',
    'console.'
  ]) {
    assert.equal(source.includes(forbiddenSource), false, `${forbiddenSource} must not be used`);
  }
});

async function runTests() {
  try {
    for (const { name, callback } of tests) {
      try {
        await callback();
      } catch (error) {
        error.message = `${name}: ${error.message}`;
        throw error;
      }
    }

    console.log(`All distance-terms reader tests passed (${tests.length} tests).`);
  } finally {
    delete globalThis.chrome;
  }
}

runTests();
