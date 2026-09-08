'use strict';

(function initializeDistanceTermsCore() {
  const STATES = Object.freeze({
    MISSING: 'missing',
    VALID: 'valid',
    PARTIALLY_INVALID: 'partially_invalid',
    WHOLE_INVALID: 'whole_invalid',
    UNSUPPORTED_SCHEMA: 'unsupported_schema',
    READ_ERROR: 'read_error'
  });

  const OPERATIONS = Object.freeze({
    ADD_TERM: 'addTerm',
    SET_ITEM_ENABLED: 'setItemEnabled',
    SET_MASTER_ENABLED: 'setMasterEnabled',
    DELETE_ITEM: 'deleteItem',
    DELETE_INVALID_ITEMS: 'deleteInvalidItems',
    RESET_INVALID_SETTINGS: 'resetInvalidSettings'
  });

  const RESPONSE_CODES = Object.freeze({
    OK: 'OK',
    NO_CHANGE: 'NO_CHANGE',
    INVALID_REQUEST: 'INVALID_REQUEST',
    INVALID_TERM_LENGTH: 'INVALID_TERM_LENGTH',
    FORBIDDEN_CHARACTER: 'FORBIDDEN_CHARACTER',
    DUPLICATE_TERM: 'DUPLICATE_TERM',
    LIMIT_REACHED: 'LIMIT_REACHED',
    ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
    ITEM_NOT_EDITABLE: 'ITEM_NOT_EDITABLE',
    RECOVERY_NOT_ALLOWED: 'RECOVERY_NOT_ALLOWED',
    SETTINGS_INVALID: 'SETTINGS_INVALID',
    UNSUPPORTED_SCHEMA: 'UNSUPPORTED_SCHEMA',
    STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
    STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
    INTEGRITY_CHECK_FAILED: 'INTEGRITY_CHECK_FAILED',
    UNAUTHORIZED_SENDER: 'UNAUTHORIZED_SENDER',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  });

  const CONSTANTS = Object.freeze({
    // 「距離を置きたい言葉」の設定を保存する、拡張機能のローカルStorageのトップレベルキーです。
    STORAGE_KEY: 'distanceTermsSettings',
    // 永続化するdistanceTermsSettingsのschema版です。通信protocol版とは独立して管理します。
    SCHEMA_VERSION: 1,
    // 利用者が登録できるtermの最小長（extended grapheme cluster数）です。
    MIN_GRAPHEMES: 2,
    // 利用者が登録できるtermの最大長（extended grapheme cluster数）です。
    MAX_GRAPHEMES: 50,
    // NFKCとtrim後のtermに適用する内部安全上限（Unicode code point数）です。
    MAX_CODE_POINTS: 512,
    // Storageのraw items配列に保存できる最大件数です。invalid itemも件数に含みます。
    MAX_ITEMS: 30,
    // runtime messageがdistance termsのmutation requestであることを識別するtypeです。
    MESSAGE_TYPE: 'distanceTermsMutation',
    // mutation messageの通信protocol版です。Storage schema版とは独立して管理します。
    PROTOCOL_VERSION: 1,
    // 破壊的な設定初期化を明示的に確認するための固定値です。
    RESET_CONFIRMATION_VALUE: 'RESET_DISTANCE_TERMS_SETTINGS',
    // Storage snapshotを分類する6状態の固定値です。
    STATES,
    // Service Workerが受け付けるmutation operationの固定値です。
    OPERATIONS,
    // mutation結果を返す際に使用する固定response codeです。
    RESPONSE_CODES
  });

  const ROOT_FIELDS = Object.freeze(['schemaVersion', 'masterEnabled', 'items']);
  const ITEM_FIELDS = Object.freeze(['id', 'term', 'enabled']);
  const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

  function validateDistanceTermInput(rawTerm) {
    if (typeof rawTerm !== 'string') {
      return createTermValidationFailure(RESPONSE_CODES.INVALID_TERM_LENGTH, 'GRAPHEME_RANGE');
    }

    let term;

    try {
      term = rawTerm.normalize('NFKC').trim();
    } catch (_error) {
      return createTermValidationFailure(RESPONSE_CODES.FORBIDDEN_CHARACTER, 'FORBIDDEN_CHARACTER');
    }

    if (containsLineBreakOrTab(term)) {
      return createTermValidationFailure(RESPONSE_CODES.FORBIDDEN_CHARACTER, 'LINE_BREAK_OR_TAB');
    }

    if (containsForbiddenCharacter(term)) {
      return createTermValidationFailure(RESPONSE_CODES.FORBIDDEN_CHARACTER, 'FORBIDDEN_CHARACTER');
    }

    const graphemeCount = countGraphemes(term);

    if (
      graphemeCount === null ||
      graphemeCount < CONSTANTS.MIN_GRAPHEMES ||
      graphemeCount > CONSTANTS.MAX_GRAPHEMES
    ) {
      return createTermValidationFailure(RESPONSE_CODES.INVALID_TERM_LENGTH, 'GRAPHEME_RANGE');
    }

    if (countCodePoints(term) > CONSTANTS.MAX_CODE_POINTS) {
      return createTermValidationFailure(RESPONSE_CODES.INVALID_TERM_LENGTH, 'CODE_POINT_LIMIT');
    }

    return Object.freeze({
      ok: true,
      term,
      duplicateKey: createDistanceTermDuplicateKey(term)
    });
  }

  function createTermValidationFailure(code, reason) {
    return Object.freeze({
      ok: false,
      code,
      reason
    });
  }

  function containsLineBreakOrTab(value) {
    for (const character of value) {
      const codePoint = character.codePointAt(0);

      if (codePoint === 0x0009 || codePoint === 0x000a || codePoint === 0x000d) {
        return true;
      }
    }

    return false;
  }

  function containsForbiddenCharacter(value) {
    for (const character of value) {
      const codePoint = character.codePointAt(0);

      if (
        codePoint <= 0x001f ||
        (codePoint >= 0x007f && codePoint <= 0x009f) ||
        codePoint === 0x00ad ||
        codePoint === 0x034f ||
        codePoint === 0x061c ||
        codePoint === 0x200b ||
        codePoint === 0x200e ||
        codePoint === 0x200f ||
        codePoint === 0x2028 ||
        codePoint === 0x2029 ||
        (codePoint >= 0x202a && codePoint <= 0x202e) ||
        codePoint === 0x2060 ||
        (codePoint >= 0x2066 && codePoint <= 0x2069) ||
        codePoint === 0xfeff
      ) {
        return true;
      }
    }

    return false;
  }

  function countGraphemes(value) {
    if (typeof globalThis.Intl?.Segmenter !== 'function') {
      return null;
    }

    try {
      const segmenter = new globalThis.Intl.Segmenter(undefined, { granularity: 'grapheme' });
      let count = 0;

      for (const _segment of segmenter.segment(value)) {
        count += 1;
      }

      return count;
    } catch (_error) {
      return null;
    }
  }

  function countCodePoints(value) {
    let count = 0;

    for (const _codePoint of value) {
      count += 1;
    }

    return count;
  }

  function createDistanceTermDuplicateKey(canonicalTerm) {
    if (typeof canonicalTerm !== 'string') {
      return '';
    }

    return canonicalTerm.replace(/[A-Z]/g, (character) => {
      return String.fromCodePoint(character.codePointAt(0) + 32);
    });
  }

  function isValidDistanceTermId(id) {
    return typeof id === 'string' && UUID_V4_PATTERN.test(id);
  }

  function createInitialDistanceTermsSettings(masterEnabled = true) {
    return {
      schemaVersion: CONSTANTS.SCHEMA_VERSION,
      masterEnabled: typeof masterEnabled === 'boolean' ? masterEnabled : true,
      items: []
    };
  }

  function classifyDistanceTermsSnapshot(snapshot) {
    if (!isSafeObject(snapshot)) {
      return createStateOnlyClassification(STATES.READ_ERROR);
    }

    const readStatusRead = readProperty(snapshot, 'readStatus');

    if (!readStatusRead.ok) {
      return createStateOnlyClassification(STATES.READ_ERROR);
    }

    if (readStatusRead.value === 'error') {
      return createStateOnlyClassification(STATES.READ_ERROR);
    }

    if (readStatusRead.value !== 'ok') {
      return createStateOnlyClassification(STATES.READ_ERROR);
    }

    const existsRead = readProperty(snapshot, 'exists');

    if (!existsRead.ok) {
      return createStateOnlyClassification(STATES.READ_ERROR);
    }

    const exists = existsRead.value;

    if (exists === false) {
      return createStateOnlyClassification(STATES.MISSING);
    }

    if (exists !== true) {
      return createStateOnlyClassification(STATES.READ_ERROR);
    }

    const rawValueRead = readProperty(snapshot, 'value');

    if (!rawValueRead.ok) {
      return createStateOnlyClassification(STATES.READ_ERROR);
    }

    const rawValue = rawValueRead.value;

    if (!isSafeObject(rawValue)) {
      return createStateOnlyClassification(STATES.WHOLE_INVALID);
    }

    const schemaVersionRead = readProperty(rawValue, 'schemaVersion');

    if (!schemaVersionRead.ok) {
      return createStateOnlyClassification(STATES.WHOLE_INVALID);
    }

    const schemaVersion = schemaVersionRead.value;

    if (
      typeof schemaVersion !== 'number' ||
      !Number.isInteger(schemaVersion) ||
      schemaVersion <= 0
    ) {
      return createStateOnlyClassification(STATES.WHOLE_INVALID);
    }

    if (schemaVersion > CONSTANTS.SCHEMA_VERSION) {
      return Object.freeze({
        state: STATES.UNSUPPORTED_SCHEMA,
        schemaVersion
      });
    }

    if (schemaVersion !== CONSTANTS.SCHEMA_VERSION) {
      return createStateOnlyClassification(STATES.WHOLE_INVALID);
    }

    const rootKeys = readOwnEnumerableKeys(rawValue);
    const masterEnabledRead = readProperty(rawValue, 'masterEnabled');
    const itemsRead = readProperty(rawValue, 'items');

    if (
      rootKeys === null ||
      !hasExactFields(rootKeys, ROOT_FIELDS) ||
      !masterEnabledRead.ok ||
      typeof masterEnabledRead.value !== 'boolean' ||
      !itemsRead.ok ||
      !Array.isArray(itemsRead.value) ||
      itemsRead.value.length > CONSTANTS.MAX_ITEMS
    ) {
      return Object.freeze({
        state: STATES.WHOLE_INVALID,
        schemaVersion
      });
    }

    return classifyVersionOneItems({
      schemaVersion,
      masterEnabled: masterEnabledRead.value,
      items: itemsRead.value
    });
  }

  function classifyVersionOneItems({ schemaVersion, masterEnabled, items }) {
    const itemRecords = [];
    const idIndexesByKey = new Map();
    const termIndexesByKey = new Map();

    for (let index = 0; index < items.length; index += 1) {
      const record = inspectStoredItem(items[index], index);
      itemRecords.push(record);

      if (record.idKey !== null) {
        addIndexForKey(idIndexesByKey, record.idKey, index);
      }

      if (record.termKey !== null) {
        addIndexForKey(termIndexesByKey, record.termKey, index);
      }
    }

    const duplicateIdIndexes = collectDuplicateIndexes(idIndexesByKey);
    const duplicateTermIndexes = collectDuplicateIndexes(termIndexesByKey);
    const usableItems = [];
    const invalidItems = [];

    for (const record of itemRecords) {
      const reasonCodes = [...record.reasonCodes];

      if (duplicateIdIndexes.has(record.index)) {
        reasonCodes.push('DUPLICATE_ID');
      }

      if (duplicateTermIndexes.has(record.index)) {
        reasonCodes.push('DUPLICATE_TERM');
      }

      if (reasonCodes.length > 0) {
        invalidItems.push(
          Object.freeze({
            index: record.index,
            reasonCodes: Object.freeze(reasonCodes)
          })
        );
        continue;
      }

      usableItems.push(
        Object.freeze({
          index: record.index,
          id: record.id,
          idKey: record.idKey,
          term: record.term,
          termKey: record.termKey,
          enabled: record.enabled
        })
      );
    }

    const frozenUsableItems = Object.freeze(usableItems);
    const frozenInvalidItems = Object.freeze(invalidItems);

    return Object.freeze({
      state: invalidItems.length === 0 ? STATES.VALID : STATES.PARTIALLY_INVALID,
      schemaVersion,
      masterEnabled,
      rawItemCount: items.length,
      usableItems: frozenUsableItems,
      invalidItems: frozenInvalidItems,
      invalidCount: invalidItems.length,
      idKeyCounts: freezeKeyCounts(idIndexesByKey),
      termKeyCounts: freezeKeyCounts(termIndexesByKey)
    });
  }

  function inspectStoredItem(rawItem, index) {
    const reasonCodes = [];

    if (!isSafeObject(rawItem)) {
      return {
        index,
        id: null,
        idKey: null,
        term: null,
        termKey: null,
        enabled: null,
        reasonCodes: ['INVALID_ITEM_TYPE']
      };
    }

    const itemKeys = readOwnEnumerableKeys(rawItem);
    const idRead = readProperty(rawItem, 'id');
    const termRead = readProperty(rawItem, 'term');
    const enabledRead = readProperty(rawItem, 'enabled');

    if (itemKeys === null || !hasExactFields(itemKeys, ITEM_FIELDS)) {
      reasonCodes.push('INVALID_ITEM_FIELDS');
    }

    const id = idRead.ok && typeof idRead.value === 'string' ? idRead.value : null;
    const idKey = isValidDistanceTermId(id) ? id.toLowerCase() : null;

    if (idKey === null) {
      reasonCodes.push('INVALID_ID');
    }

    let term = null;
    let termKey = null;

    if (termRead.ok && typeof termRead.value === 'string') {
      const termValidation = validateDistanceTermInput(termRead.value);

      if (termValidation.ok) {
        termKey = termValidation.duplicateKey;

        if (termValidation.term === termRead.value) {
          term = termRead.value;
        } else {
          reasonCodes.push('NONCANONICAL_TERM');
        }
      } else {
        reasonCodes.push('INVALID_TERM');
      }
    } else {
      reasonCodes.push('INVALID_TERM');
    }

    const enabled =
      enabledRead.ok && typeof enabledRead.value === 'boolean' ? enabledRead.value : null;

    if (enabled === null) {
      reasonCodes.push('INVALID_ENABLED');
    }

    return {
      index,
      id,
      idKey,
      term,
      termKey,
      enabled,
      reasonCodes
    };
  }

  function isSafeObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function readProperty(object, key) {
    try {
      if (!Object.hasOwn(object, key)) {
        return { ok: false };
      }

      return { ok: true, value: object[key] };
    } catch (_error) {
      return { ok: false };
    }
  }

  function readOwnEnumerableKeys(object) {
    try {
      return Object.keys(object);
    } catch (_error) {
      return null;
    }
  }

  function hasExactFields(actualKeys, expectedFields) {
    return (
      actualKeys.length === expectedFields.length &&
      expectedFields.every((field) => actualKeys.includes(field))
    );
  }

  function addIndexForKey(indexesByKey, key, index) {
    const indexes = indexesByKey.get(key);

    if (indexes) {
      indexes.push(index);
    } else {
      indexesByKey.set(key, [index]);
    }
  }

  function collectDuplicateIndexes(indexesByKey) {
    const duplicateIndexes = new Set();

    for (const indexes of indexesByKey.values()) {
      if (indexes.length > 1) {
        for (const index of indexes) {
          duplicateIndexes.add(index);
        }
      }
    }

    return duplicateIndexes;
  }

  function freezeKeyCounts(indexesByKey) {
    return Object.freeze(
      Array.from(indexesByKey, ([key, indexes]) => {
        return Object.freeze({ key, count: indexes.length });
      })
    );
  }

  function createStateOnlyClassification(state) {
    return Object.freeze({ state });
  }

  const distanceTermsCore = Object.freeze({
    CONSTANTS,
    validateDistanceTermInput,
    createDistanceTermDuplicateKey,
    isValidDistanceTermId,
    createInitialDistanceTermsSettings,
    classifyDistanceTermsSnapshot
  });

  if (typeof globalThis !== 'undefined') {
    globalThis.kotobaUkeMimamoriDistanceTermsCore = distanceTermsCore;
  }

  if (typeof module !== 'undefined') {
    module.exports = distanceTermsCore;
  }
})();
