'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../distance-terms-core');
const mutations = require('../distance-terms-mutations');
const serviceWorker = require('../distance-terms-service-worker');

const {
  validateDistanceTermsMutationRequest,
  validateDistanceTermsSender,
  createDistanceTermsMutationController
} = serviceWorker;

const ID_A = '00000000-0000-4000-8000-000000000001';
const ID_B = '00000000-0000-4000-9000-000000000002';
const ID_C = '00000000-0000-4000-a000-000000000003';
const INVALID_UUID = 'not-a-uuid';
const EXTENSION_ID = 'test-extension-id';
const OPTIONS_URL = `chrome-extension://${EXTENSION_ID}/options.html`;
const EXTENSION_ORIGIN = new URL(OPTIONS_URL).origin;
const MISSING = Symbol('missing');
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

function createSnapshot(rawValue) {
  if (rawValue === MISSING) {
    return {
      rawValue: undefined,
      classification: core.classifyDistanceTermsSnapshot({ readStatus: 'ok', exists: false })
    };
  }

  return {
    rawValue,
    classification: core.classifyDistanceTermsSnapshot({
      readStatus: 'ok',
      exists: true,
      value: rawValue
    })
  };
}

function request(operation, ...payloadArguments) {
  const [payload] = payloadArguments;
  const message = {
    type: 'distanceTermsMutation',
    protocolVersion: 1,
    operation
  };

  if (operation !== 'deleteInvalidItems' || payloadArguments.length > 0) {
    message.payload = payload;
  }

  return message;
}

function authorizedSender(overrides = {}) {
  return {
    id: EXTENSION_ID,
    url: OPTIONS_URL,
    ...overrides
  };
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

function createHarness(options = {}) {
  let rawValue = Object.hasOwn(options, 'rawValue') ? options.rawValue : validSettings();
  const events = [];
  const writes = [];
  let readCount = 0;
  let uuidCount = 0;
  let writeCount = 0;
  const uuidValues = [...(options.uuidValues ?? [ID_A, ID_B, ID_C])];
  const runtime = options.runtime ?? {
    id: EXTENSION_ID,
    getURL(resourcePath) {
      return `chrome-extension://${EXTENSION_ID}/${resourcePath}`;
    }
  };
  const reader = {
    async readDistanceTermsMutationSnapshot() {
      readCount += 1;
      events.push(`read:${readCount}`);

      if (options.readBehavior) {
        return options.readBehavior({ readCount, rawValue, events });
      }

      return createSnapshot(rawValue);
    }
  };
  const storageLocal = {
    async set(value) {
      writeCount += 1;
      writes.push(value);
      events.push(`set:start:${writeCount}`);

      if (options.setBehavior) {
        await options.setBehavior({ value, writeCount, events });
      }

      rawValue = value.distanceTermsSettings;
      events.push(`set:done:${writeCount}`);
    }
  };
  const cryptoApi = {
    randomUUID() {
      uuidCount += 1;
      events.push(`uuid:${uuidCount}`);
      const value = uuidValues.shift();

      if (value instanceof Error) {
        throw value;
      }

      return value;
    }
  };
  const controller = createDistanceTermsMutationController({
    runtime,
    storageLocal,
    reader,
    mutations: options.mutations ?? mutations,
    cryptoApi
  });

  return {
    controller,
    events,
    writes,
    getReadCount: () => readCount,
    getUuidCount: () => uuidCount,
    getWriteCount: () => writeCount,
    getRawValue: () => rawValue
  };
}

test('公開test APIと正式なrequest 6種を受理する', async () => {
  assert.deepEqual(Object.keys(serviceWorker).sort(), [
    'createDistanceTermsMutationController',
    'validateDistanceTermsMutationRequest',
    'validateDistanceTermsSender'
  ]);
  assert.equal(Object.isFrozen(serviceWorker), true);

  const validRequests = [
    request('addTerm', { term: '追加' }),
    request('setMasterEnabled', { enabled: false }),
    request('setItemEnabled', { id: ID_A, enabled: false }),
    request('deleteItem', { id: ID_A }),
    request('deleteInvalidItems'),
    request('resetInvalidSettings', {
      confirmation: 'RESET_DISTANCE_TERMS_SETTINGS'
    })
  ];

  assert.ok(validRequests.every(validateDistanceTermsMutationRequest));
});

test('request envelopeの型 version operation fieldをstrictに検証する', async () => {
  const invalidRequests = [
    null,
    [],
    { ...request('addTerm', { term: '追加' }), unknown: true },
    { ...request('addTerm', { term: '追加' }), type: 'other' },
    { ...request('addTerm', { term: '追加' }), protocolVersion: '1' },
    { ...request('addTerm', { term: '追加' }), protocolVersion: 2 },
    request('unknown', {}),
    { type: 'distanceTermsMutation', protocolVersion: 1, operation: 'addTerm' },
    request('deleteInvalidItems', {})
  ];

  for (const message of invalidRequests) {
    assert.equal(validateDistanceTermsMutationRequest(message), false);
  }
});

test('payloadのunknown fieldと型をstrictに検証する', async () => {
  const invalidRequests = [
    request('addTerm', { term: '追加', id: ID_A }),
    request('addTerm', { term: 1 }),
    request('setMasterEnabled', { enabled: false, extra: true }),
    request('setItemEnabled', { id: 1, enabled: true }),
    request('setItemEnabled', { id: ID_A }),
    request('deleteItem', { id: ID_A, enabled: true }),
    request('deleteItem', { id: null }),
    request('resetInvalidSettings', { confirmation: 'RESET' }),
    request('resetInvalidSettings', {
      confirmation: 'RESET_DISTANCE_TERMS_SETTINGS',
      extra: true
    })
  ];

  for (const message of invalidRequests) {
    assert.equal(validateDistanceTermsMutationRequest(message), false);
  }
});

test('booleanをcoerceせずstrict booleanだけ受理する', async () => {
  for (const enabled of ['false', 'true', 0, 1, null, undefined]) {
    assert.equal(
      validateDistanceTermsMutationRequest(request('setMasterEnabled', { enabled })),
      false
    );
    assert.equal(
      validateDistanceTermsMutationRequest(request('setItemEnabled', { id: ID_A, enabled })),
      false
    );
  }
});

test('unsafe request getterをINVALID_REQUESTへfail-safeに縮退する', async () => {
  const message = request('addTerm', { term: '追加' });
  Object.defineProperty(message, 'operation', {
    enumerable: true,
    get() {
      throw new Error('unsafe request');
    }
  });

  assert.equal(validateDistanceTermsMutationRequest(message), false);
});

test('senderはexact extension IDとOptions URLだけを許可する', async () => {
  const runtime = {
    id: EXTENSION_ID,
    getURL(resourcePath) {
      return `chrome-extension://${EXTENSION_ID}/${resourcePath}`;
    }
  };

  assert.equal(validateDistanceTermsSender(authorizedSender(), runtime), true);
  assert.equal(
    validateDistanceTermsSender(authorizedSender({ origin: EXTENSION_ORIGIN }), runtime),
    true
  );
  assert.equal(
    validateDistanceTermsSender(authorizedSender({ id: 'other-extension' }), runtime),
    false
  );
  assert.equal(
    validateDistanceTermsSender(
      authorizedSender({ url: `${EXTENSION_ORIGIN}/popup.html` }),
      runtime
    ),
    false
  );
  assert.equal(
    validateDistanceTermsSender(authorizedSender({ url: 'https://x.com/home' }), runtime),
    false
  );
  assert.equal(
    validateDistanceTermsSender(
      authorizedSender({ url: `${EXTENSION_ORIGIN}/other.html` }),
      runtime
    ),
    false
  );
  assert.equal(
    validateDistanceTermsSender(authorizedSender({ origin: 'https://x.com' }), runtime),
    false
  );
});

test('sender.tabの有無で認可を変えずorigin present undefinedは拒否する', async () => {
  const runtime = {
    id: EXTENSION_ID,
    getURL(resourcePath) {
      return `chrome-extension://${EXTENSION_ID}/${resourcePath}`;
    }
  };

  assert.equal(validateDistanceTermsSender(authorizedSender({ tab: { id: 1 } }), runtime), true);
  assert.equal(
    validateDistanceTermsSender(authorizedSender({ origin: undefined }), runtime),
    false
  );
});

test('request validationをsender validationより先に実行する', async () => {
  const harness = createHarness({
    runtime: {
      id: EXTENSION_ID,
      getURL() {
        throw new Error('sender validation reached');
      }
    }
  });

  assert.deepEqual(await harness.controller.handleMessage(null, null), {
    ok: false,
    code: 'INVALID_REQUEST'
  });
  assert.equal(harness.getReadCount(), 0);
});

test('unauthorized senderをqueueへ入れずmessage body sender claimも信用しない', async () => {
  const harness = createHarness();

  assert.deepEqual(
    await harness.controller.handleMessage(request('deleteInvalidItems'), {
      id: 'other-extension',
      url: OPTIONS_URL
    }),
    { ok: false, code: 'UNAUTHORIZED_SENDER' }
  );
  assert.equal(harness.getReadCount(), 0);

  assert.deepEqual(
    await harness.controller.handleMessage(
      { ...request('deleteInvalidItems'), sender: authorizedSender() },
      authorizedSender()
    ),
    { ok: false, code: 'INVALID_REQUEST' }
  );
  assert.equal(harness.getReadCount(), 0);
});

test('queueへ入る前にStorageをreadしない', async () => {
  const harness = createHarness();
  const responsePromise = harness.controller.handleMessage(
    request('deleteInvalidItems'),
    authorizedSender()
  );

  assert.equal(harness.getReadCount(), 0);
  assert.deepEqual(await responsePromise, { ok: true, code: 'NO_CHANGE' });
  assert.equal(harness.getReadCount(), 1);
});

test('FIFOでA write完了後にB latest readを行いCまで順序を維持する', async () => {
  const firstWriteGate = createDeferred();
  const harness = createHarness({
    rawValue: MISSING,
    uuidValues: [ID_A, ID_B],
    async setBehavior({ writeCount }) {
      if (writeCount === 1) {
        await firstWriteGate.promise;
      }
    }
  });
  const responseA = harness.controller.handleMessage(
    request('addTerm', { term: '仕事' }),
    authorizedSender()
  );
  const responseB = harness.controller.handleMessage(
    request('addTerm', { term: '休息' }),
    authorizedSender()
  );
  const responseC = harness.controller.handleMessage(
    request('setMasterEnabled', { enabled: false }),
    authorizedSender()
  );

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(harness.events, ['read:1', 'uuid:1', 'set:start:1']);

  firstWriteGate.resolve();
  assert.deepEqual(await Promise.all([responseA, responseB, responseC]), [
    { ok: true, code: 'OK' },
    { ok: true, code: 'OK' },
    { ok: true, code: 'OK' }
  ]);
  assert.deepEqual(harness.getRawValue(), {
    schemaVersion: 1,
    masterEnabled: false,
    items: [validItem(ID_A, '仕事'), validItem(ID_B, '休息')]
  });
  assert.ok(harness.events.indexOf('set:done:1') < harness.events.indexOf('read:2'));
  assert.ok(harness.events.indexOf('set:done:2') < harness.events.indexOf('read:3'));
});

test('A write failure後もBとCを継続しqueue tailをreject状態にしない', async () => {
  const harness = createHarness({
    uuidValues: [ID_A],
    async setBehavior({ writeCount }) {
      if (writeCount === 1) {
        throw new Error('first write failed');
      }
    }
  });

  const responses = await Promise.all([
    harness.controller.handleMessage(
      request('setMasterEnabled', { enabled: false }),
      authorizedSender()
    ),
    harness.controller.handleMessage(request('addTerm', { term: '仕事' }), authorizedSender()),
    harness.controller.handleMessage(
      request('setMasterEnabled', { enabled: false }),
      authorizedSender()
    )
  ]);

  assert.deepEqual(responses, [
    { ok: false, code: 'STORAGE_WRITE_FAILED' },
    { ok: true, code: 'OK' },
    { ok: true, code: 'OK' }
  ]);
  assert.equal(harness.getReadCount(), 3);
});

test('unexpected rejected turnをINTERNAL_ERRORへ縮退して次のturnを継続する', async () => {
  const harness = createHarness({
    readBehavior({ readCount, rawValue }) {
      if (readCount === 1) {
        throw new Error('reader failed unexpectedly');
      }

      return createSnapshot(rawValue);
    }
  });

  const first = harness.controller.handleMessage(request('deleteInvalidItems'), authorizedSender());
  const second = harness.controller.handleMessage(
    request('setMasterEnabled', { enabled: false }),
    authorizedSender()
  );

  assert.deepEqual(await Promise.all([first, second]), [
    { ok: false, code: 'INTERNAL_ERROR' },
    { ok: true, code: 'OK' }
  ]);
  assert.equal(harness.getReadCount(), 2);
});

test('addTermだけUUIDを生成しinvalidと大小文字collisionを再生成する', async () => {
  const invalidItemWithValidId = { id: ID_A, term: '仕事', enabled: 'invalid' };
  const harness = createHarness({
    rawValue: validSettings([invalidItemWithValidId]),
    uuidValues: [INVALID_UUID, ID_A.toUpperCase(), ID_B]
  });

  assert.deepEqual(
    await harness.controller.handleMessage(
      request('addTerm', { term: '休息' }),
      authorizedSender()
    ),
    { ok: true, code: 'OK' }
  );
  assert.equal(harness.getUuidCount(), 3);
  assert.equal(harness.getRawValue().items[1].id, ID_B);

  const nonAddHarness = createHarness();
  assert.deepEqual(
    await nonAddHarness.controller.handleMessage(
      request('setMasterEnabled', { enabled: false }),
      authorizedSender()
    ),
    { ok: true, code: 'OK' }
  );
  assert.equal(nonAddHarness.getUuidCount(), 0);
});

test('UUIDを10 attemptsで得られなければINTERNAL_ERRORかつwrite 0回', async () => {
  const harness = createHarness({ uuidValues: Array(10).fill(INVALID_UUID) });

  assert.deepEqual(
    await harness.controller.handleMessage(
      request('addTerm', { term: '仕事' }),
      authorizedSender()
    ),
    { ok: false, code: 'INTERNAL_ERROR' }
  );
  assert.equal(harness.getUuidCount(), 10);
  assert.equal(harness.getWriteCount(), 0);
});

test('UUID生成throwはdetailを漏らさずINTERNAL_ERRORかつwrite 0回', async () => {
  const harness = createHarness({ uuidValues: [new Error('SECRET_UUID_ERROR')] });
  const response = await harness.controller.handleMessage(
    request('addTerm', { term: '仕事' }),
    authorizedSender()
  );

  assert.deepEqual(response, { ok: false, code: 'INTERNAL_ERROR' });
  assert.equal(JSON.stringify(response).includes('SECRET_UUID_ERROR'), false);
  assert.equal(harness.getWriteCount(), 0);
});

test('write mutationはdistanceTermsSettings whole objectをexactly once書く', async () => {
  const harness = createHarness({ rawValue: MISSING, uuidValues: [ID_A] });

  assert.deepEqual(
    await harness.controller.handleMessage(
      request('addTerm', { term: '仕事' }),
      authorizedSender()
    ),
    { ok: true, code: 'OK' }
  );
  assert.equal(harness.getWriteCount(), 1);
  assert.deepEqual(Object.keys(harness.writes[0]), ['distanceTermsSettings']);
  assert.deepEqual(harness.writes[0].distanceTermsSettings, {
    schemaVersion: 1,
    masterEnabled: true,
    items: [validItem(ID_A, '仕事')]
  });
});

test('storage.local.set完了をawaitしてからOKを返す', async () => {
  const gate = createDeferred();
  const harness = createHarness({
    async setBehavior() {
      await gate.promise;
    }
  });
  let settled = false;
  const responsePromise = harness.controller
    .handleMessage(request('setMasterEnabled', { enabled: false }), authorizedSender())
    .then((response) => {
      settled = true;
      return response;
    });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  gate.resolve();
  assert.deepEqual(await responsePromise, { ok: true, code: 'OK' });
});

test('NO_CHANGEとdomain rejectionはwrite 0回', async () => {
  const noChangeHarness = createHarness();
  assert.deepEqual(
    await noChangeHarness.controller.handleMessage(
      request('setMasterEnabled', { enabled: true }),
      authorizedSender()
    ),
    { ok: true, code: 'NO_CHANGE' }
  );
  assert.equal(noChangeHarness.getWriteCount(), 0);

  const duplicateHarness = createHarness({
    rawValue: validSettings([validItem(ID_A, 'Hello')]),
    uuidValues: [ID_B]
  });
  assert.deepEqual(
    await duplicateHarness.controller.handleMessage(
      request('addTerm', { term: 'hello' }),
      authorizedSender()
    ),
    { ok: false, code: 'DUPLICATE_TERM' }
  );
  assert.equal(duplicateHarness.getWriteCount(), 0);
});

test('read failureはSTORAGE_READ_FAILEDかつwrite 0回', async () => {
  const harness = createHarness({
    readBehavior() {
      return {
        rawValue: undefined,
        classification: core.classifyDistanceTermsSnapshot({ readStatus: 'error' })
      };
    }
  });

  assert.deepEqual(
    await harness.controller.handleMessage(
      request('setMasterEnabled', { enabled: false }),
      authorizedSender()
    ),
    { ok: false, code: 'STORAGE_READ_FAILED' }
  );
  assert.equal(harness.getWriteCount(), 0);
});

test('rawとclassification不整合はINTEGRITY_CHECK_FAILEDかつwrite 0回', async () => {
  const rawValue = validSettings([validItem()]);
  const harness = createHarness({
    rawValue,
    readBehavior() {
      return {
        rawValue,
        classification: core.classifyDistanceTermsSnapshot({
          readStatus: 'ok',
          exists: true,
          value: validSettings()
        })
      };
    }
  });

  assert.deepEqual(
    await harness.controller.handleMessage(
      request('setMasterEnabled', { enabled: false }),
      authorizedSender()
    ),
    { ok: false, code: 'INTEGRITY_CHECK_FAILED' }
  );
  assert.equal(harness.getWriteCount(), 0);
});

test('write failureは1回でSTORAGE_WRITE_FAILEDとしautomatic retryしない', async () => {
  const harness = createHarness({
    async setBehavior() {
      throw new Error('SECRET_WRITE_ERROR');
    }
  });
  const response = await harness.controller.handleMessage(
    request('setMasterEnabled', { enabled: false }),
    authorizedSender()
  );

  assert.deepEqual(response, { ok: false, code: 'STORAGE_WRITE_FAILED' });
  assert.equal(harness.getWriteCount(), 1);
  assert.equal(JSON.stringify(response).includes('SECRET_WRITE_ERROR'), false);
});

test('malformed planner responseとunknown codeをINTERNAL_ERRORへ縮退する', async () => {
  const malformedMutations = {
    planDistanceTermsMutation() {
      return { ok: false, code: 'SECRET_CODE', shouldWrite: false, rawValue: 'SECRET' };
    }
  };
  const harness = createHarness({ mutations: malformedMutations });

  assert.deepEqual(
    await harness.controller.handleMessage(
      request('setMasterEnabled', { enabled: false }),
      authorizedSender()
    ),
    { ok: false, code: 'INTERNAL_ERROR' }
  );
  assert.equal(harness.getWriteCount(), 0);
});

test('全responseをokとfixed codeだけへdata minimizationする', async () => {
  const cases = [
    createHarness(),
    createHarness({ rawValue: MISSING, uuidValues: [ID_A] }),
    createHarness({
      readBehavior() {
        throw new Error('SECRET_READER_ERROR');
      }
    })
  ];
  const responses = [
    await cases[0].controller.handleMessage(
      request('setMasterEnabled', { enabled: true }),
      authorizedSender()
    ),
    await cases[1].controller.handleMessage(
      request('addTerm', { term: '秘密語' }),
      authorizedSender()
    ),
    await cases[2].controller.handleMessage(request('deleteInvalidItems'), authorizedSender())
  ];

  for (const response of responses) {
    assert.deepEqual(Object.keys(response).sort(), ['code', 'ok']);
    const serialized = JSON.stringify(response);

    for (const forbidden of [
      '秘密語',
      ID_A,
      'rawValue',
      'classification',
      'exception',
      'SECRET_READER_ERROR',
      'message',
      'stack'
    ]) {
      assert.equal(serialized.includes(forbidden), false);
    }
  }
});

test('classic Service Workerがimport順を守りruntime.onMessageだけを登録する', async () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'distance-terms-service-worker.js'),
    'utf8'
  );
  const imports = [];
  let listener;
  const context = {
    URL,
    Object,
    Promise,
    Set,
    globalThis: null,
    importScripts(...paths) {
      imports.push(...paths);
      context.kotobaUkeMimamoriDistanceTermsCore = core;
      context.kotobaUkeMimamoriDistanceTermsReader = {
        async readDistanceTermsMutationSnapshot() {
          return createSnapshot(MISSING);
        }
      };
      context.kotobaUkeMimamoriDistanceTermsMutations = mutations;
    },
    chrome: {
      runtime: {
        id: EXTENSION_ID,
        getURL(resourcePath) {
          return `chrome-extension://${EXTENSION_ID}/${resourcePath}`;
        },
        onMessage: {
          addListener(callback) {
            listener = callback;
          }
        }
      },
      storage: {
        local: {
          async set() {
            throw new Error('NO_CHANGE must not write');
          }
        }
      }
    }
  };
  context.globalThis = context;

  vm.runInNewContext(source, context);

  assert.deepEqual(imports, [
    'distance-terms-core.js',
    'distance-terms-reader.js',
    'distance-terms-mutations.js'
  ]);
  assert.equal(typeof listener, 'function');

  const responseDeferred = createDeferred();
  const returnsTrue = listener(request('deleteInvalidItems'), authorizedSender(), (response) => {
    responseDeferred.resolve(response);
  });
  assert.equal(returnsTrue, true);
  assert.equal(JSON.stringify(await responseDeferred.promise), '{"ok":true,"code":"NO_CHANGE"}');
  assert.equal(source.includes('onMessageExternal'), false);
});

test('Service Worker sourceはprivacyと責務境界を維持する', async () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'distance-terms-service-worker.js'),
    'utf8'
  );

  for (const forbiddenSource of [
    'document.',
    'window.',
    'localStorage',
    'fetch(',
    'XMLHttpRequest',
    'console.',
    'risk-detector',
    'overlay',
    'i18n',
    'onMessageExternal'
  ]) {
    assert.equal(source.includes(forbiddenSource), false, `${forbiddenSource} must not be used`);
  }
});

async function runTests() {
  for (const { name, callback } of tests) {
    try {
      await callback();
    } catch (error) {
      error.message = `${name}: ${error.message}`;
      throw error;
    }
  }

  console.log(`All distance-terms Service Worker tests passed (${tests.length} tests).`);
}

runTests();
