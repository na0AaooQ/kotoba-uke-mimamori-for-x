'use strict';

(function initializeDistanceTermsMutations() {
  const core = resolveCore();
  const { CONSTANTS } = core;
  const { OPERATIONS, RESPONSE_CODES, STATES } = CONSTANTS;

  function resolveCore() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./distance-terms-core');
    }

    return globalThis.kotobaUkeMimamoriDistanceTermsCore;
  }

  function planDistanceTermsMutation(input) {
    try {
      return planDistanceTermsMutationInternal(input);
    } catch (_error) {
      return reject(RESPONSE_CODES.INVALID_REQUEST);
    }
  }

  function planDistanceTermsMutationInternal(input) {
    if (!isSafeObject(input) || !isKnownOperation(input.operation)) {
      return reject(RESPONSE_CODES.INVALID_REQUEST);
    }

    const operation = input.operation;

    if (!isValidPayload(operation, input.payload)) {
      return reject(RESPONSE_CODES.INVALID_REQUEST);
    }

    const hasGeneratedId = Object.hasOwn(input, 'generatedId');

    if (operation === OPERATIONS.ADD_TERM) {
      if (!hasGeneratedId || !core.isValidDistanceTermId(input.generatedId)) {
        return reject(RESPONSE_CODES.INVALID_REQUEST);
      }
    } else if (hasGeneratedId) {
      return reject(RESPONSE_CODES.INVALID_REQUEST);
    }

    if (!isSafeObject(input.classification) || !isKnownState(input.classification.state)) {
      return reject(RESPONSE_CODES.INVALID_REQUEST);
    }

    const stateRejection = getStateRejection(operation, input.classification.state);

    if (stateRejection) {
      return reject(stateRejection);
    }

    if (!sourceMatchesClassification(input.rawValue, input.classification)) {
      return reject(RESPONSE_CODES.INTEGRITY_CHECK_FAILED);
    }

    if (
      operation === OPERATIONS.DELETE_INVALID_ITEMS &&
      (input.classification.state === STATES.MISSING || input.classification.state === STATES.VALID)
    ) {
      return noChange();
    }

    try {
      return planAllowedMutation({
        rawValue: input.rawValue,
        classification: input.classification,
        operation,
        payload: input.payload,
        generatedId: input.generatedId
      });
    } catch (_error) {
      return reject(RESPONSE_CODES.INTEGRITY_CHECK_FAILED);
    }
  }

  function planAllowedMutation({ rawValue, classification, operation, payload, generatedId }) {
    switch (operation) {
      case OPERATIONS.ADD_TERM:
        return planAddTerm({ rawValue, classification, payload, generatedId });
      case OPERATIONS.SET_MASTER_ENABLED:
        return planSetMasterEnabled({ rawValue, classification, payload });
      case OPERATIONS.SET_ITEM_ENABLED:
        return planSetItemEnabled({ rawValue, classification, payload });
      case OPERATIONS.DELETE_ITEM:
        return planDeleteItem({ rawValue, classification, payload });
      case OPERATIONS.DELETE_INVALID_ITEMS:
        return planDeleteInvalidItems({ rawValue, classification });
      case OPERATIONS.RESET_INVALID_SETTINGS:
        return planResetInvalidSettings({ classification });
      default:
        return reject(RESPONSE_CODES.INVALID_REQUEST);
    }
  }

  function planAddTerm({ rawValue, classification, payload, generatedId }) {
    const sourceItems = classification.state === STATES.MISSING ? [] : rawValue.items;

    if (sourceItems.length >= CONSTANTS.MAX_ITEMS) {
      return reject(RESPONSE_CODES.LIMIT_REACHED);
    }

    const termValidation = core.validateDistanceTermInput(payload.term);

    if (!termValidation.ok) {
      return reject(termValidation.code);
    }

    if (getNamespaceCount(classification.termKeyCounts, termValidation.duplicateKey) > 0) {
      return reject(RESPONSE_CODES.DUPLICATE_TERM);
    }

    const generatedIdKey = generatedId.toLowerCase();

    if (getNamespaceCount(classification.idKeyCounts, generatedIdKey) > 0) {
      return reject(RESPONSE_CODES.INVALID_REQUEST);
    }

    const nextValue =
      classification.state === STATES.MISSING
        ? core.createInitialDistanceTermsSettings()
        : copySettingsWithItems(rawValue, sourceItems);

    nextValue.items.push({
      id: generatedId,
      term: termValidation.term,
      enabled: true
    });

    return finishPlan({
      operation: OPERATIONS.ADD_TERM,
      sourceValue: rawValue,
      sourceClassification: classification,
      nextValue,
      payload,
      generatedId,
      desiredTermKey: termValidation.duplicateKey
    });
  }

  function planSetMasterEnabled({ rawValue, classification, payload }) {
    if (classification.state === STATES.MISSING) {
      if (payload.enabled === true) {
        return noChange();
      }

      const nextValue = core.createInitialDistanceTermsSettings(false);

      return finishPlan({
        operation: OPERATIONS.SET_MASTER_ENABLED,
        sourceValue: rawValue,
        sourceClassification: classification,
        nextValue,
        payload
      });
    }

    if (classification.masterEnabled === payload.enabled) {
      return noChange();
    }

    const nextValue = {
      ...rawValue,
      masterEnabled: payload.enabled,
      items: [...rawValue.items]
    };

    return finishPlan({
      operation: OPERATIONS.SET_MASTER_ENABLED,
      sourceValue: rawValue,
      sourceClassification: classification,
      nextValue,
      payload
    });
  }

  function planSetItemEnabled({ rawValue, classification, payload }) {
    const target = findTarget(classification, payload.id);

    if (target.status === 'absent') {
      return reject(RESPONSE_CODES.ITEM_NOT_FOUND);
    }

    if (target.status !== 'editable') {
      return reject(RESPONSE_CODES.ITEM_NOT_EDITABLE);
    }

    if (target.item.enabled === payload.enabled) {
      return noChange();
    }

    const nextItems = [...rawValue.items];
    nextItems[target.item.index] = {
      ...rawValue.items[target.item.index],
      enabled: payload.enabled
    };
    const nextValue = copySettingsWithItems(rawValue, nextItems);

    return finishPlan({
      operation: OPERATIONS.SET_ITEM_ENABLED,
      sourceValue: rawValue,
      sourceClassification: classification,
      nextValue,
      payload,
      target: target.item
    });
  }

  function planDeleteItem({ rawValue, classification, payload }) {
    if (classification.state === STATES.MISSING) {
      return noChange();
    }

    const target = findTarget(classification, payload.id);

    if (target.status === 'absent') {
      return noChange();
    }

    if (target.status !== 'editable') {
      return reject(RESPONSE_CODES.ITEM_NOT_EDITABLE);
    }

    const nextItems = rawValue.items.filter((_item, index) => index !== target.item.index);
    const nextValue = copySettingsWithItems(rawValue, nextItems);

    return finishPlan({
      operation: OPERATIONS.DELETE_ITEM,
      sourceValue: rawValue,
      sourceClassification: classification,
      nextValue,
      payload,
      target: target.item
    });
  }

  function planDeleteInvalidItems({ rawValue, classification }) {
    const invalidIndexes = new Set(classification.invalidItems.map(({ index }) => index));
    const nextItems = rawValue.items.filter((_item, index) => !invalidIndexes.has(index));
    const nextValue = copySettingsWithItems(rawValue, nextItems);

    return finishPlan({
      operation: OPERATIONS.DELETE_INVALID_ITEMS,
      sourceValue: rawValue,
      sourceClassification: classification,
      nextValue
    });
  }

  function planResetInvalidSettings({ classification }) {
    return finishPlan({
      operation: OPERATIONS.RESET_INVALID_SETTINGS,
      sourceClassification: classification,
      nextValue: core.createInitialDistanceTermsSettings(),
      payload: {
        confirmation: CONSTANTS.RESET_CONFIRMATION_VALUE
      }
    });
  }

  function finishPlan(context) {
    const nextClassification = core.classifyDistanceTermsSnapshot({
      readStatus: 'ok',
      exists: true,
      value: context.nextValue
    });

    if (!postConditionIsSatisfied({ ...context, nextClassification })) {
      return reject(RESPONSE_CODES.INTEGRITY_CHECK_FAILED);
    }

    return Object.freeze({
      ok: true,
      code: RESPONSE_CODES.OK,
      shouldWrite: true,
      nextValue: context.nextValue
    });
  }

  function postConditionIsSatisfied(context) {
    switch (context.operation) {
      case OPERATIONS.ADD_TERM:
        return addPostConditionIsSatisfied(context);
      case OPERATIONS.SET_MASTER_ENABLED:
        return masterPostConditionIsSatisfied(context);
      case OPERATIONS.SET_ITEM_ENABLED:
        return itemEnabledPostConditionIsSatisfied(context);
      case OPERATIONS.DELETE_ITEM:
        return deleteItemPostConditionIsSatisfied(context);
      case OPERATIONS.DELETE_INVALID_ITEMS:
        return deleteInvalidPostConditionIsSatisfied(context);
      case OPERATIONS.RESET_INVALID_SETTINGS:
        return resetPostConditionIsSatisfied(context);
      default:
        return false;
    }
  }

  function addPostConditionIsSatisfied({
    sourceValue,
    sourceClassification,
    nextValue,
    nextClassification,
    generatedId,
    desiredTermKey
  }) {
    const sourceItems = sourceClassification.state === STATES.MISSING ? [] : sourceValue.items;
    const generatedIdKey = generatedId.toLowerCase();
    const targetItems = nextClassification.usableItems?.filter(
      ({ idKey }) => idKey === generatedIdKey
    );
    const target = targetItems?.[0];

    return (
      isUsableState(nextClassification.state) &&
      nextClassification.rawItemCount === sourceItems.length + 1 &&
      nextClassification.invalidCount === getInvalidCount(sourceClassification) &&
      Array.isArray(targetItems) &&
      targetItems.length === 1 &&
      target.termKey === desiredTermKey &&
      target.enabled === true &&
      getNamespaceCount(nextClassification.idKeyCounts, generatedIdKey) === 1 &&
      getNamespaceCount(nextClassification.termKeyCounts, desiredTermKey) === 1 &&
      nextValue.items.length === sourceItems.length + 1 &&
      sourceItems.every((item, index) => nextValue.items[index] === item)
    );
  }

  function masterPostConditionIsSatisfied({
    sourceValue,
    sourceClassification,
    nextValue,
    nextClassification,
    payload
  }) {
    const sourceItems = sourceClassification.state === STATES.MISSING ? [] : sourceValue.items;

    return (
      isUsableState(nextClassification.state) &&
      nextClassification.masterEnabled === payload.enabled &&
      nextClassification.rawItemCount === sourceItems.length &&
      nextClassification.invalidCount === getInvalidCount(sourceClassification) &&
      nextValue.items.length === sourceItems.length &&
      sourceItems.every((item, index) => nextValue.items[index] === item)
    );
  }

  function itemEnabledPostConditionIsSatisfied({
    sourceValue,
    sourceClassification,
    nextValue,
    nextClassification,
    payload,
    target
  }) {
    const targetAfter = findUniqueUsableItem(nextClassification, payload.id);

    return (
      isUsableState(nextClassification.state) &&
      nextClassification.rawItemCount === sourceClassification.rawItemCount &&
      nextClassification.invalidCount === sourceClassification.invalidCount &&
      targetAfter !== null &&
      targetAfter.enabled === payload.enabled &&
      rawItemsPreservedExceptIndex(sourceValue.items, nextValue.items, target.index) &&
      rawItemMatchesUsableItem(nextValue.items[target.index], targetAfter)
    );
  }

  function deleteItemPostConditionIsSatisfied({
    sourceValue,
    sourceClassification,
    nextValue,
    nextClassification,
    payload,
    target
  }) {
    const expectedItems = sourceValue.items.filter((_item, index) => index !== target.index);

    return (
      isUsableState(nextClassification.state) &&
      nextClassification.rawItemCount === sourceClassification.rawItemCount - 1 &&
      nextClassification.invalidCount === sourceClassification.invalidCount &&
      getNamespaceCount(nextClassification.idKeyCounts, payload.id.toLowerCase()) === 0 &&
      arraysHaveSameReferences(nextValue.items, expectedItems)
    );
  }

  function deleteInvalidPostConditionIsSatisfied({
    sourceValue,
    sourceClassification,
    nextValue,
    nextClassification
  }) {
    const expectedItems = sourceClassification.usableItems.map(
      ({ index }) => sourceValue.items[index]
    );

    return (
      nextClassification.state === STATES.VALID &&
      nextClassification.invalidCount === 0 &&
      nextClassification.rawItemCount === sourceClassification.usableItems.length &&
      arraysHaveSameReferences(nextValue.items, expectedItems)
    );
  }

  function resetPostConditionIsSatisfied({ nextValue, nextClassification }) {
    return (
      nextClassification.state === STATES.VALID &&
      nextClassification.schemaVersion === CONSTANTS.SCHEMA_VERSION &&
      nextClassification.masterEnabled === true &&
      nextClassification.rawItemCount === 0 &&
      hasExactFields(nextValue, ['schemaVersion', 'masterEnabled', 'items']) &&
      nextValue.schemaVersion === CONSTANTS.SCHEMA_VERSION &&
      nextValue.masterEnabled === true &&
      Array.isArray(nextValue.items) &&
      nextValue.items.length === 0
    );
  }

  function sourceMatchesClassification(rawValue, classification) {
    if (classification.state === STATES.MISSING) {
      return rawValue === undefined;
    }

    if (classification.state === STATES.READ_ERROR) {
      return rawValue === undefined;
    }

    const actualClassification = core.classifyDistanceTermsSnapshot({
      readStatus: 'ok',
      exists: true,
      value: rawValue
    });

    return classificationsAreEquivalent(actualClassification, classification);
  }

  function classificationsAreEquivalent(actual, expected) {
    if (actual.state !== expected.state) {
      return false;
    }

    if (actual.state === STATES.WHOLE_INVALID) {
      return actual.schemaVersion === expected.schemaVersion;
    }

    if (actual.state === STATES.UNSUPPORTED_SCHEMA) {
      return actual.schemaVersion === expected.schemaVersion;
    }

    if (!isUsableState(actual.state)) {
      return true;
    }

    return (
      actual.schemaVersion === expected.schemaVersion &&
      actual.masterEnabled === expected.masterEnabled &&
      actual.rawItemCount === expected.rawItemCount &&
      actual.invalidCount === expected.invalidCount &&
      recordsEqual(actual.usableItems, expected.usableItems, [
        'index',
        'id',
        'idKey',
        'term',
        'termKey',
        'enabled'
      ]) &&
      invalidRecordsEqual(actual.invalidItems, expected.invalidItems) &&
      recordsEqual(actual.idKeyCounts, expected.idKeyCounts, ['key', 'count']) &&
      recordsEqual(actual.termKeyCounts, expected.termKeyCounts, ['key', 'count'])
    );
  }

  function recordsEqual(actualRecords, expectedRecords, fields) {
    if (!Array.isArray(actualRecords) || !Array.isArray(expectedRecords)) {
      return false;
    }

    return (
      actualRecords.length === expectedRecords.length &&
      actualRecords.every((actualRecord, index) => {
        const expectedRecord = expectedRecords[index];
        return (
          isSafeObject(expectedRecord) &&
          fields.every((field) => actualRecord[field] === expectedRecord[field])
        );
      })
    );
  }

  function invalidRecordsEqual(actualRecords, expectedRecords) {
    if (!Array.isArray(actualRecords) || !Array.isArray(expectedRecords)) {
      return false;
    }

    return (
      actualRecords.length === expectedRecords.length &&
      actualRecords.every((actualRecord, index) => {
        const expectedRecord = expectedRecords[index];
        return (
          isSafeObject(expectedRecord) &&
          actualRecord.index === expectedRecord.index &&
          Array.isArray(expectedRecord.reasonCodes) &&
          actualRecord.reasonCodes.length === expectedRecord.reasonCodes.length &&
          actualRecord.reasonCodes.every(
            (reasonCode, reasonIndex) => reasonCode === expectedRecord.reasonCodes[reasonIndex]
          )
        );
      })
    );
  }

  function findTarget(classification, id) {
    const idKey = id.toLowerCase();
    const namespaceCount = getNamespaceCount(classification.idKeyCounts, idKey);

    if (namespaceCount === 0) {
      return { status: 'absent' };
    }

    const matches = classification.usableItems.filter((item) => item.idKey === idKey);

    if (namespaceCount !== 1 || matches.length !== 1) {
      return { status: 'not_editable' };
    }

    return { status: 'editable', item: matches[0] };
  }

  function findUniqueUsableItem(classification, id) {
    if (!isUsableState(classification.state) || !core.isValidDistanceTermId(id)) {
      return null;
    }

    const idKey = id.toLowerCase();
    const matches = classification.usableItems.filter((item) => item.idKey === idKey);

    if (matches.length !== 1 || getNamespaceCount(classification.idKeyCounts, idKey) !== 1) {
      return null;
    }

    return matches[0];
  }

  function getStateRejection(operation, state) {
    if (state === STATES.UNSUPPORTED_SCHEMA) {
      return RESPONSE_CODES.UNSUPPORTED_SCHEMA;
    }

    if (state === STATES.READ_ERROR) {
      return RESPONSE_CODES.STORAGE_READ_FAILED;
    }

    if (state !== STATES.WHOLE_INVALID) {
      if (
        operation === OPERATIONS.RESET_INVALID_SETTINGS &&
        (state === STATES.MISSING || state === STATES.VALID || state === STATES.PARTIALLY_INVALID)
      ) {
        return RESPONSE_CODES.RECOVERY_NOT_ALLOWED;
      }

      return null;
    }

    if (operation === OPERATIONS.RESET_INVALID_SETTINGS) {
      return null;
    }

    if (operation === OPERATIONS.DELETE_INVALID_ITEMS) {
      return RESPONSE_CODES.RECOVERY_NOT_ALLOWED;
    }

    return RESPONSE_CODES.SETTINGS_INVALID;
  }

  function isDistanceTermsDesiredStateSatisfied(input) {
    try {
      return isDistanceTermsDesiredStateSatisfiedInternal(input);
    } catch (_error) {
      return false;
    }
  }

  function isDistanceTermsDesiredStateSatisfiedInternal(input) {
    if (
      !isSafeObject(input) ||
      !isKnownOperation(input.operation) ||
      !isValidPayload(input.operation, input.payload) ||
      !isSafeObject(input.classification) ||
      !isKnownState(input.classification.state)
    ) {
      return false;
    }

    const { classification, operation, payload } = input;

    switch (operation) {
      case OPERATIONS.ADD_TERM:
        return addDesiredStateIsSatisfied(classification, payload);
      case OPERATIONS.SET_MASTER_ENABLED:
        return masterDesiredStateIsSatisfied(classification, payload);
      case OPERATIONS.SET_ITEM_ENABLED:
        return itemEnabledDesiredStateIsSatisfied(classification, payload);
      case OPERATIONS.DELETE_ITEM:
        return deleteItemDesiredStateIsSatisfied(classification, payload);
      case OPERATIONS.DELETE_INVALID_ITEMS:
        return classification.state === STATES.VALID;
      case OPERATIONS.RESET_INVALID_SETTINGS:
        return resetDesiredStateIsSatisfied(classification);
      default:
        return false;
    }
  }

  function addDesiredStateIsSatisfied(classification, payload) {
    if (!isUsableState(classification.state)) {
      return false;
    }

    const validation = core.validateDistanceTermInput(payload.term);

    if (!validation.ok) {
      return false;
    }

    const matches = classification.usableItems.filter(
      ({ termKey }) => termKey === validation.duplicateKey
    );

    return (
      matches.length === 1 &&
      matches[0].enabled === true &&
      getNamespaceCount(classification.termKeyCounts, validation.duplicateKey) === 1
    );
  }

  function masterDesiredStateIsSatisfied(classification, payload) {
    if (classification.state === STATES.MISSING) {
      return payload.enabled === true;
    }

    return isUsableState(classification.state) && classification.masterEnabled === payload.enabled;
  }

  function itemEnabledDesiredStateIsSatisfied(classification, payload) {
    const target = findUniqueUsableItem(classification, payload.id);
    return target !== null && target.enabled === payload.enabled;
  }

  function deleteItemDesiredStateIsSatisfied(classification, payload) {
    if (classification.state === STATES.MISSING) {
      return true;
    }

    return (
      isUsableState(classification.state) &&
      getNamespaceCount(classification.idKeyCounts, payload.id.toLowerCase()) === 0
    );
  }

  function resetDesiredStateIsSatisfied(classification) {
    return (
      classification.state === STATES.VALID &&
      classification.schemaVersion === CONSTANTS.SCHEMA_VERSION &&
      classification.masterEnabled === true &&
      classification.rawItemCount === 0 &&
      Array.isArray(classification.usableItems) &&
      classification.usableItems.length === 0 &&
      classification.invalidCount === 0
    );
  }

  function isValidPayload(operation, payload) {
    switch (operation) {
      case OPERATIONS.ADD_TERM:
        return hasExactFields(payload, ['term']) && typeof payload.term === 'string';
      case OPERATIONS.SET_MASTER_ENABLED:
        return hasExactFields(payload, ['enabled']) && typeof payload.enabled === 'boolean';
      case OPERATIONS.SET_ITEM_ENABLED:
        return (
          hasExactFields(payload, ['id', 'enabled']) &&
          core.isValidDistanceTermId(payload.id) &&
          typeof payload.enabled === 'boolean'
        );
      case OPERATIONS.DELETE_ITEM:
        return hasExactFields(payload, ['id']) && core.isValidDistanceTermId(payload.id);
      case OPERATIONS.DELETE_INVALID_ITEMS:
        return payload === undefined;
      case OPERATIONS.RESET_INVALID_SETTINGS:
        return (
          hasExactFields(payload, ['confirmation']) &&
          payload.confirmation === CONSTANTS.RESET_CONFIRMATION_VALUE
        );
      default:
        return false;
    }
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

  function copySettingsWithItems(rawValue, items) {
    return {
      ...rawValue,
      items: [...items]
    };
  }

  function rawItemMatchesUsableItem(rawItem, usableItem) {
    return (
      isSafeObject(rawItem) &&
      rawItem.id === usableItem.id &&
      rawItem.term === usableItem.term &&
      rawItem.enabled === usableItem.enabled
    );
  }

  function rawItemsPreservedExceptIndex(sourceItems, nextItems, changedIndex) {
    if (sourceItems.length !== nextItems.length) {
      return false;
    }

    return sourceItems.every((item, index) => index === changedIndex || nextItems[index] === item);
  }

  function arraysHaveSameReferences(actual, expected) {
    return (
      actual.length === expected.length && actual.every((item, index) => item === expected[index])
    );
  }

  function getNamespaceCount(keyCounts, key) {
    if (!Array.isArray(keyCounts)) {
      return 0;
    }

    const entry = keyCounts.find((candidate) => candidate?.key === key);
    return entry?.count ?? 0;
  }

  function getInvalidCount(classification) {
    return classification.state === STATES.MISSING ? 0 : classification.invalidCount;
  }

  function isKnownOperation(operation) {
    return Object.values(OPERATIONS).includes(operation);
  }

  function isKnownState(state) {
    return Object.values(STATES).includes(state);
  }

  function isUsableState(state) {
    return state === STATES.VALID || state === STATES.PARTIALLY_INVALID;
  }

  function isSafeObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function noChange() {
    return Object.freeze({
      ok: true,
      code: RESPONSE_CODES.NO_CHANGE,
      shouldWrite: false
    });
  }

  function reject(code) {
    return Object.freeze({
      ok: false,
      code,
      shouldWrite: false
    });
  }

  const distanceTermsMutations = Object.freeze({
    planDistanceTermsMutation,
    isDistanceTermsDesiredStateSatisfied
  });

  if (typeof globalThis !== 'undefined') {
    globalThis.kotobaUkeMimamoriDistanceTermsMutations = distanceTermsMutations;
  }

  if (typeof module !== 'undefined') {
    module.exports = distanceTermsMutations;
  }
})();
