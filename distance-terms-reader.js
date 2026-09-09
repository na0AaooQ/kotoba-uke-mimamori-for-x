'use strict';

(function initializeDistanceTermsReader() {
  const core = resolveCore();
  const { STORAGE_KEY, STATES } = core.CONSTANTS;

  function resolveCore() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./distance-terms-core');
    }

    return globalThis.kotobaUkeMimamoriDistanceTermsCore;
  }

  async function readDistanceTermsSnapshot() {
    try {
      const result = await globalThis.chrome.storage.local.get(STORAGE_KEY);

      if (!isSafeObject(result)) {
        return createReadErrorSnapshot();
      }

      let exists;

      try {
        exists = Object.hasOwn(result, STORAGE_KEY);
      } catch (_error) {
        return createReadErrorSnapshot();
      }

      if (!exists) {
        return Object.freeze({
          rawValue: undefined,
          classification: core.classifyDistanceTermsSnapshot({
            readStatus: 'ok',
            exists: false
          })
        });
      }

      let rawValue;

      try {
        rawValue = result[STORAGE_KEY];
      } catch (_error) {
        return createReadErrorSnapshot();
      }

      return Object.freeze({
        rawValue,
        classification: core.classifyDistanceTermsSnapshot({
          readStatus: 'ok',
          exists: true,
          value: rawValue
        })
      });
    } catch (_error) {
      return createReadErrorSnapshot();
    }
  }

  function createReadErrorSnapshot() {
    return Object.freeze({
      rawValue: undefined,
      classification: core.classifyDistanceTermsSnapshot({ readStatus: 'error' })
    });
  }

  async function readDistanceTermsOptionsView() {
    const { classification } = await readDistanceTermsSnapshot();

    return createOptionsView(classification);
  }

  function createOptionsView(classification) {
    if (classification.state === STATES.MISSING) {
      return Object.freeze({
        state: STATES.MISSING,
        masterEnabled: true,
        items: Object.freeze([]),
        invalidCount: 0,
        rawItemCount: 0
      });
    }

    if (
      classification.state !== STATES.VALID &&
      classification.state !== STATES.PARTIALLY_INVALID
    ) {
      return Object.freeze({ state: classification.state });
    }

    const items = Object.freeze(
      classification.usableItems.map(({ id, term, enabled }) => {
        return Object.freeze({ id, term, enabled });
      })
    );

    return Object.freeze({
      state: classification.state,
      masterEnabled: classification.masterEnabled,
      items,
      invalidCount: classification.invalidCount,
      rawItemCount: classification.rawItemCount
    });
  }

  async function readDistanceTermsOptionsReconciliationSnapshot() {
    const { classification } = await readDistanceTermsSnapshot();

    return Object.freeze({
      view: createOptionsView(classification),
      classification
    });
  }

  async function readDistanceTermsContentView() {
    const { classification } = await readDistanceTermsSnapshot();
    let terms = [];

    if (
      (classification.state === STATES.VALID ||
        classification.state === STATES.PARTIALLY_INVALID) &&
      classification.masterEnabled === true
    ) {
      terms = classification.usableItems
        .filter(({ enabled }) => enabled === true)
        .map(({ term }) => term);
    }

    return Object.freeze({ terms: Object.freeze(terms) });
  }

  async function readDistanceTermsMutationSnapshot() {
    return readDistanceTermsSnapshot();
  }

  function isSafeObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  const distanceTermsReader = Object.freeze({
    readDistanceTermsOptionsView,
    readDistanceTermsContentView,
    readDistanceTermsMutationSnapshot,
    readDistanceTermsOptionsReconciliationSnapshot
  });

  if (typeof globalThis !== 'undefined') {
    globalThis.kotobaUkeMimamoriDistanceTermsReader = distanceTermsReader;
  }

  if (typeof module !== 'undefined') {
    module.exports = distanceTermsReader;
  }
})();
