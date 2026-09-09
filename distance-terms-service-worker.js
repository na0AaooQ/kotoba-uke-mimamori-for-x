'use strict';

if (typeof module === 'undefined' || !module.exports) {
  importScripts(
    'distance-terms-core.js',
    'distance-terms-reader.js',
    'distance-terms-mutations.js'
  );
}

(function initializeDistanceTermsServiceWorker() {
  const dependencies = resolveDependencies();
  const { core } = dependencies;
  const { CONSTANTS } = core;
  const { OPERATIONS, RESPONSE_CODES } = CONSTANTS;
  const RESPONSE_CODE_ALLOWLIST = new Set(Object.values(RESPONSE_CODES));
  const FAILURE_RESPONSE_CODES = new Set(
    Object.values(RESPONSE_CODES).filter((code) => {
      return code !== RESPONSE_CODES.OK && code !== RESPONSE_CODES.NO_CHANGE;
    })
  );

  function resolveDependencies() {
    if (typeof module !== 'undefined' && module.exports) {
      return {
        core: require('./distance-terms-core'),
        reader: require('./distance-terms-reader'),
        mutations: require('./distance-terms-mutations')
      };
    }

    return {
      core: globalThis.kotobaUkeMimamoriDistanceTermsCore,
      reader: globalThis.kotobaUkeMimamoriDistanceTermsReader,
      mutations: globalThis.kotobaUkeMimamoriDistanceTermsMutations
    };
  }

  function validateDistanceTermsMutationRequest(message) {
    return parseDistanceTermsMutationRequest(message) !== null;
  }

  function parseDistanceTermsMutationRequest(message) {
    try {
      if (!isSafeObject(message)) {
        return null;
      }

      const type = message.type;
      const protocolVersion = message.protocolVersion;
      const operation = message.operation;

      if (
        type !== CONSTANTS.MESSAGE_TYPE ||
        protocolVersion !== CONSTANTS.PROTOCOL_VERSION ||
        !Object.values(OPERATIONS).includes(operation)
      ) {
        return null;
      }

      const requiresPayload = operation !== OPERATIONS.DELETE_INVALID_ITEMS;
      const expectedFields = requiresPayload
        ? ['type', 'protocolVersion', 'operation', 'payload']
        : ['type', 'protocolVersion', 'operation'];

      if (!hasExactFields(message, expectedFields)) {
        return null;
      }

      const payload = requiresPayload ? copyValidPayload(operation, message.payload) : undefined;

      if (requiresPayload && payload === null) {
        return null;
      }

      const parsedRequest = { operation };

      if (requiresPayload) {
        parsedRequest.payload = payload;
      }

      return Object.freeze(parsedRequest);
    } catch (_error) {
      return null;
    }
  }

  function copyValidPayload(operation, payload) {
    switch (operation) {
      case OPERATIONS.ADD_TERM: {
        if (!hasExactFields(payload, ['term'])) {
          return null;
        }

        const term = payload.term;
        return typeof term === 'string' ? Object.freeze({ term }) : null;
      }
      case OPERATIONS.SET_MASTER_ENABLED: {
        if (!hasExactFields(payload, ['enabled'])) {
          return null;
        }

        const enabled = payload.enabled;
        return typeof enabled === 'boolean' ? Object.freeze({ enabled }) : null;
      }
      case OPERATIONS.SET_ITEM_ENABLED: {
        if (!hasExactFields(payload, ['id', 'enabled'])) {
          return null;
        }

        const id = payload.id;
        const enabled = payload.enabled;
        return typeof id === 'string' && typeof enabled === 'boolean'
          ? Object.freeze({ id, enabled })
          : null;
      }
      case OPERATIONS.DELETE_ITEM: {
        if (!hasExactFields(payload, ['id'])) {
          return null;
        }

        const id = payload.id;
        return typeof id === 'string' ? Object.freeze({ id }) : null;
      }
      case OPERATIONS.RESET_INVALID_SETTINGS: {
        if (!hasExactFields(payload, ['confirmation'])) {
          return null;
        }

        const confirmation = payload.confirmation;
        return confirmation === CONSTANTS.RESET_CONFIRMATION_VALUE
          ? Object.freeze({ confirmation })
          : null;
      }
      default:
        return null;
    }
  }

  function validateDistanceTermsSender(sender, runtime) {
    try {
      if (!isSafeObject(sender) || !runtime || typeof runtime.getURL !== 'function') {
        return false;
      }

      const optionsUrl = runtime.getURL('options.html');
      const optionsOrigin = new URL(optionsUrl).origin;

      if (sender.id !== runtime.id || sender.url !== optionsUrl) {
        return false;
      }

      return !Object.hasOwn(sender, 'origin') || sender.origin === optionsOrigin;
    } catch (_error) {
      return false;
    }
  }

  function createDistanceTermsMutationController(overrides = {}) {
    const runtime = overrides.runtime ?? globalThis.chrome?.runtime;
    const storageLocal = overrides.storageLocal ?? globalThis.chrome?.storage?.local;
    const reader = overrides.reader ?? dependencies.reader;
    const mutations = overrides.mutations ?? dependencies.mutations;
    const cryptoApi = overrides.cryptoApi ?? globalThis.crypto;
    let queueTail = Promise.resolve();

    function handleMessage(message, sender) {
      const request = parseDistanceTermsMutationRequest(message);

      if (request === null) {
        return Promise.resolve(createFailureResponse(RESPONSE_CODES.INVALID_REQUEST));
      }

      if (!validateDistanceTermsSender(sender, runtime)) {
        return Promise.resolve(createFailureResponse(RESPONSE_CODES.UNAUTHORIZED_SENDER));
      }

      const turn = queueTail.then(() => {
        return executeMutation({ request, storageLocal, reader, mutations, cryptoApi });
      });

      queueTail = turn.then(
        () => undefined,
        () => undefined
      );

      return turn.catch(() => {
        return createFailureResponse(RESPONSE_CODES.INTERNAL_ERROR);
      });
    }

    return Object.freeze({ handleMessage });
  }

  async function executeMutation({ request, storageLocal, reader, mutations, cryptoApi }) {
    try {
      const snapshot = await reader.readDistanceTermsMutationSnapshot();
      const plannerInput = {
        rawValue: snapshot.rawValue,
        classification: snapshot.classification,
        operation: request.operation,
        payload: request.payload
      };

      if (request.operation === OPERATIONS.ADD_TERM) {
        const generatedId = generateUniqueDistanceTermId(snapshot.classification, cryptoApi);

        if (generatedId === null) {
          return createFailureResponse(RESPONSE_CODES.INTERNAL_ERROR);
        }

        plannerInput.generatedId = generatedId;
      }

      const plan = mutations.planDistanceTermsMutation(plannerInput);

      if (!isValidMutationPlan(plan)) {
        return createFailureResponse(RESPONSE_CODES.INTERNAL_ERROR);
      }

      if (!plan.shouldWrite) {
        return createResponseFromPlan(plan);
      }

      try {
        await storageLocal.set({ [CONSTANTS.STORAGE_KEY]: plan.nextValue });
      } catch (_error) {
        return createFailureResponse(RESPONSE_CODES.STORAGE_WRITE_FAILED);
      }

      return createSuccessResponse(RESPONSE_CODES.OK);
    } catch (_error) {
      return createFailureResponse(RESPONSE_CODES.INTERNAL_ERROR);
    }
  }

  function generateUniqueDistanceTermId(classification, cryptoApi) {
    const existingIds = collectExistingDistanceTermIds(classification);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = cryptoApi.randomUUID();

      if (core.isValidDistanceTermId(candidate) && !existingIds.has(candidate.toLowerCase())) {
        return candidate;
      }
    }

    return null;
  }

  function collectExistingDistanceTermIds(classification) {
    const ids = new Set();

    if (!Array.isArray(classification?.idKeyCounts)) {
      return ids;
    }

    for (const entry of classification.idKeyCounts) {
      if (isSafeObject(entry) && core.isValidDistanceTermId(entry.key)) {
        ids.add(entry.key.toLowerCase());
      }
    }

    return ids;
  }

  function isValidMutationPlan(plan) {
    if (
      !isSafeObject(plan) ||
      typeof plan.ok !== 'boolean' ||
      typeof plan.shouldWrite !== 'boolean' ||
      typeof plan.code !== 'string' ||
      !RESPONSE_CODE_ALLOWLIST.has(plan.code)
    ) {
      return false;
    }

    if (plan.shouldWrite) {
      return (
        plan.ok === true && plan.code === RESPONSE_CODES.OK && Object.hasOwn(plan, 'nextValue')
      );
    }

    if (plan.ok) {
      return plan.code === RESPONSE_CODES.NO_CHANGE;
    }

    return FAILURE_RESPONSE_CODES.has(plan.code);
  }

  function createResponseFromPlan(plan) {
    if (plan.ok) {
      return createSuccessResponse(plan.code);
    }

    return createFailureResponse(plan.code);
  }

  function createSuccessResponse(code) {
    return Object.freeze({ ok: true, code });
  }

  function createFailureResponse(code) {
    return Object.freeze({ ok: false, code });
  }

  function hasExactFields(value, expectedFields) {
    if (!isSafeObject(value)) {
      return false;
    }

    let keys;

    try {
      keys = Object.keys(value);
    } catch (_error) {
      return false;
    }

    return (
      keys.length === expectedFields.length &&
      expectedFields.every((field) => Object.hasOwn(value, field))
    );
  }

  function isSafeObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function installRuntimeMessageListener() {
    const controller = createDistanceTermsMutationController();

    globalThis.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      controller.handleMessage(message, sender).then((response) => {
        try {
          sendResponse(response);
        } catch (_error) {
          // The response channel can close without changing the completed Storage operation.
        }
      });

      return true;
    });
  }

  const serviceWorkerTestApi = Object.freeze({
    validateDistanceTermsMutationRequest,
    validateDistanceTermsSender,
    createDistanceTermsMutationController
  });

  if (typeof module !== 'undefined') {
    module.exports = serviceWorkerTestApi;
  } else {
    installRuntimeMessageListener();
  }
})();
