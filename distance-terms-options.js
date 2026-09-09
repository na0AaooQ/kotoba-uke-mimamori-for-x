'use strict';

(function initializeDistanceTermsOptionsModule() {
  const dependencies = resolveDependencies();
  const { core } = dependencies;
  const { CONSTANTS } = core;
  const { OPERATIONS, RESPONSE_CODES, STATES } = CONSTANTS;
  const NORMAL_STATES = new Set([STATES.MISSING, STATES.VALID, STATES.PARTIALLY_INVALID]);
  const SUCCESS_RESPONSE_CODES = new Set([RESPONSE_CODES.OK, RESPONSE_CODES.NO_CHANGE]);
  const FAILURE_RESPONSE_CODES = new Set(
    Object.values(RESPONSE_CODES).filter((code) => !SUCCESS_RESPONSE_CODES.has(code))
  );
  const MANUAL_URLS = Object.freeze({
    ja: 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/manual.html',
    en: 'https://na0aaooq.github.io/kotoba-uke-mimamori-for-x/en/manual.html'
  });
  const ELEMENT_IDS = Object.freeze({
    section: 'distance-terms-section',
    title: 'distance-terms-title',
    description: 'distance-terms-description',
    privacy: 'distance-terms-privacy',
    manualLink: 'distance-terms-manual-link',
    manualLabel: 'distance-terms-manual-label',
    manualNewTab: 'distance-terms-manual-new-tab',
    stateArea: 'distance-terms-storage-state',
    normalArea: 'distance-terms-management',
    masterCheckbox: 'distance-terms-master-enabled',
    masterLabel: 'distance-terms-master-label',
    masterNote: 'distance-terms-master-note',
    addHeading: 'distance-terms-add-heading',
    addForm: 'distance-terms-add-form',
    addInput: 'distance-terms-add-input',
    addButton: 'distance-terms-add-button',
    validation: 'distance-terms-validation',
    maximum: 'distance-terms-maximum',
    count: 'distance-terms-count',
    listHeading: 'distance-terms-list-heading',
    list: 'distance-terms-list',
    empty: 'distance-terms-empty',
    status: 'distance-terms-status',
    deleteDialog: 'distance-terms-delete-dialog',
    deleteDialogTitle: 'distance-terms-delete-dialog-title',
    deleteDialogTarget: 'distance-terms-delete-dialog-target',
    deleteDialogCannotRestore: 'distance-terms-delete-dialog-cannot-restore',
    deleteDialogReregister: 'distance-terms-delete-dialog-reregister',
    deleteDialogError: 'distance-terms-delete-dialog-error',
    deleteDialogCancel: 'distance-terms-delete-dialog-cancel',
    deleteDialogAction: 'distance-terms-delete-dialog-action',
    invalidDialog: 'distance-terms-invalid-dialog',
    invalidDialogTitle: 'distance-terms-invalid-dialog-title',
    invalidDialogBody: 'distance-terms-invalid-dialog-body',
    invalidDialogCannotRestore: 'distance-terms-invalid-dialog-cannot-restore',
    invalidDialogKeepsValid: 'distance-terms-invalid-dialog-keeps-valid',
    invalidDialogError: 'distance-terms-invalid-dialog-error',
    invalidDialogCancel: 'distance-terms-invalid-dialog-cancel',
    invalidDialogAction: 'distance-terms-invalid-dialog-action',
    resetDialog: 'distance-terms-reset-dialog',
    resetDialogTitle: 'distance-terms-reset-dialog-title',
    resetDialogBody: 'distance-terms-reset-dialog-body',
    resetDialogCannotUndo: 'distance-terms-reset-dialog-cannot-undo',
    resetDialogOtherSettings: 'distance-terms-reset-dialog-other-settings',
    resetDialogError: 'distance-terms-reset-dialog-error',
    resetDialogCancel: 'distance-terms-reset-dialog-cancel',
    resetDialogAction: 'distance-terms-reset-dialog-action'
  });

  let activeController = null;

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

  function initializeDistanceTermsOptions({
    document = globalThis.document,
    runtimeApi = globalThis.chrome?.runtime,
    localization
  } = {}) {
    activeController = createDistanceTermsOptionsController({
      document,
      runtimeApi,
      localization
    });

    return activeController.initialize();
  }

  function updateDistanceTermsOptionsLocalization(localization) {
    if (!activeController) {
      return false;
    }

    activeController.updateLocalization(localization);
    return true;
  }

  function createDistanceTermsOptionsController({
    document,
    runtimeApi,
    localization,
    reader = dependencies.reader,
    mutations = dependencies.mutations,
    coreApi = dependencies.core
  } = {}) {
    const elements = getElements(document);
    const state = {
      activity: 'loading',
      view: null,
      dialog: 'none',
      draftTerm: '',
      pendingAction: null,
      transientStatus: '',
      localization: normalizeLocalization(localization),
      focusToken: null,
      dialogMemory: null,
      dialogError: '',
      validationError: '',
      isComposing: false
    };
    let listenersInstalled = false;
    const dynamicControls = createEmptyDynamicControls();

    async function initialize() {
      if (!hasRequiredEnvironment()) {
        return false;
      }

      installListeners();
      renderView();

      try {
        state.view = normalizeOptionsView(await reader.readDistanceTermsOptionsView());
      } catch (_error) {
        state.view = Object.freeze({ state: STATES.READ_ERROR });
      }

      state.activity = 'idle';
      renderView();
      return true;
    }

    function updateLocalization(nextLocalization) {
      state.localization = normalizeLocalization(nextLocalization);

      if (elements) {
        renderView();
      }
    }

    function hasRequiredEnvironment() {
      return (
        elements !== null &&
        typeof runtimeApi?.sendMessage === 'function' &&
        typeof reader?.readDistanceTermsOptionsView === 'function' &&
        typeof reader?.readDistanceTermsOptionsReconciliationSnapshot === 'function' &&
        typeof mutations?.isDistanceTermsDesiredStateSatisfied === 'function' &&
        typeof coreApi?.validateDistanceTermInput === 'function'
      );
    }

    function installListeners() {
      if (listenersInstalled) {
        return;
      }

      listenersInstalled = true;

      elements.masterCheckbox.addEventListener('change', async () => {
        if (!canStartNormalMutation()) {
          return;
        }

        const desiredEnabled = elements.masterCheckbox.checked;
        elements.masterCheckbox.checked = state.view.masterEnabled;
        await performMutation({
          kind: 'master',
          operation: OPERATIONS.SET_MASTER_ENABLED,
          payload: { enabled: desiredEnabled },
          focusToken: { kind: 'master' }
        });
      });

      elements.addInput.addEventListener('input', () => {
        state.draftTerm = elements.addInput.value;

        if (state.validationError) {
          state.validationError = '';
          applyValidationState();
        }
      });
      elements.addInput.addEventListener('compositionstart', () => {
        state.isComposing = true;
      });
      elements.addInput.addEventListener('compositionend', () => {
        state.isComposing = false;
        state.draftTerm = elements.addInput.value;
      });
      elements.addInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.isComposing === true || state.isComposing)) {
          event.preventDefault();
        }
      });
      elements.addForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (event.isComposing === true || state.isComposing) {
          return;
        }

        await submitDraft();
      });

      installDialogListeners({
        type: 'delete_item',
        dialog: elements.deleteDialog,
        cancelButton: elements.deleteDialogCancel,
        actionButton: elements.deleteDialogAction,
        onConfirm: confirmDeleteItem
      });
      installDialogListeners({
        type: 'delete_invalid_items',
        dialog: elements.invalidDialog,
        cancelButton: elements.invalidDialogCancel,
        actionButton: elements.invalidDialogAction,
        onConfirm: confirmDeleteInvalidItems
      });
      installDialogListeners({
        type: 'reset_invalid_settings',
        dialog: elements.resetDialog,
        cancelButton: elements.resetDialogCancel,
        actionButton: elements.resetDialogAction,
        onConfirm: confirmResetInvalidSettings
      });
    }

    function installDialogListeners({ type, dialog, cancelButton, actionButton, onConfirm }) {
      cancelButton.addEventListener('click', () => {
        cancelDialog(type);
      });
      actionButton.addEventListener('click', async () => {
        if (state.dialog === type && !isBusy()) {
          await onConfirm();
        }
      });
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();

        if (!isBusy()) {
          cancelDialog(type);
        }
      });
    }

    async function submitDraft() {
      if (!canStartNormalMutation() || state.view.rawItemCount >= CONSTANTS.MAX_ITEMS) {
        return;
      }

      state.draftTerm = elements.addInput.value;
      const validation = coreApi.validateDistanceTermInput(state.draftTerm);

      if (!validation.ok) {
        state.validationError = getValidationMessageKey(validation.reason);
        applyValidationState();
        elements.addInput.focus();
        return;
      }

      state.validationError = '';
      await performMutation({
        kind: 'add',
        operation: OPERATIONS.ADD_TERM,
        payload: { term: state.draftTerm },
        focusToken: { kind: 'add-input' }
      });
    }

    async function confirmDeleteItem() {
      if (!state.dialogMemory?.itemId) {
        return;
      }

      await performMutation({
        kind: 'delete_item',
        operation: OPERATIONS.DELETE_ITEM,
        payload: { id: state.dialogMemory.itemId },
        focusToken: { kind: 'add-input' },
        targetId: state.dialogMemory.itemId
      });
    }

    async function confirmDeleteInvalidItems() {
      await performMutation({
        kind: 'delete_invalid_items',
        operation: OPERATIONS.DELETE_INVALID_ITEMS,
        payload: undefined,
        focusToken: { kind: 'add-input' }
      });
    }

    async function confirmResetInvalidSettings() {
      await performMutation({
        kind: 'reset_invalid_settings',
        operation: OPERATIONS.RESET_INVALID_SETTINGS,
        payload: { confirmation: CONSTANTS.RESET_CONFIRMATION_VALUE },
        focusToken: { kind: 'add-input' }
      });
    }

    async function performMutation(action) {
      if (state.activity !== 'idle') {
        return false;
      }

      state.pendingAction = action;
      state.transientStatus = '';
      state.dialogError = '';
      state.activity = 'mutating';
      applyStatusState();
      applyDialogState();
      applyBusyState();

      let response = null;
      let responseLost = false;

      try {
        const candidateResponse = await runtimeApi.sendMessage(createRuntimeRequest(action));
        const parsedResponse = parseDistanceTermsMutationResponse(candidateResponse);

        if (parsedResponse) {
          response = parsedResponse;
        } else {
          responseLost = true;
        }
      } catch (_error) {
        responseLost = true;
      }

      state.activity = 'reconciling';
      applyBusyState();

      let latestView;
      let desiredStateSatisfied = false;

      if (responseLost) {
        try {
          const snapshot = await reader.readDistanceTermsOptionsReconciliationSnapshot();
          latestView = normalizeOptionsView(snapshot?.view);
          desiredStateSatisfied = mutations.isDistanceTermsDesiredStateSatisfied({
            classification: snapshot?.classification,
            operation: action.operation,
            payload: action.payload
          });
        } catch (_error) {
          latestView = Object.freeze({ state: STATES.READ_ERROR });
        }
      } else {
        try {
          latestView = normalizeOptionsView(await reader.readDistanceTermsOptionsView());
        } catch (_error) {
          latestView = Object.freeze({ state: STATES.READ_ERROR });
        }
      }

      state.view = latestView;
      state.activity = 'idle';
      state.pendingAction = null;

      finishMutation(action, {
        confirmed: responseLost ? desiredStateSatisfied : response.ok,
        response,
        responseLost
      });
      return true;
    }

    function finishMutation(action, result) {
      switch (action.kind) {
        case 'add':
          finishAddMutation(action, result);
          return;
        case 'master':
        case 'item':
          state.transientStatus = result.confirmed ? '' : 'distanceTermsSettingChangeFailure';
          renderView(action.focusToken);
          return;
        case 'delete_item':
          finishDeleteItemMutation(action, result);
          return;
        case 'delete_invalid_items':
          finishDeleteInvalidItemsMutation(result);
          return;
        case 'reset_invalid_settings':
          finishResetInvalidSettingsMutation(result);
          return;
        default:
          renderView();
      }
    }

    function finishAddMutation(action, result) {
      if (result.confirmed) {
        state.draftTerm = '';
        state.validationError = '';
        state.transientStatus = 'distanceTermsAddSuccess';
      } else {
        state.validationError = getAddResponseValidationMessageKey(result.response?.code);
        state.transientStatus = state.validationError ? '' : 'distanceTermsAddFailure';
      }

      renderView(action.focusToken);
    }

    function finishDeleteItemMutation(action, result) {
      if (result.confirmed) {
        closeActiveDialog();
        state.transientStatus = 'distanceTermsDeleteSuccess';
        renderView(action.focusToken);
        return;
      }

      const errorMessage = result.responseLost
        ? 'distanceTermsRecoveryUnknown'
        : 'distanceTermsDeleteFailure';

      if (isDeleteDialogCompatible(action.targetId)) {
        state.dialogError = errorMessage;
        renderView();
        elements.deleteDialogAction.focus();
        return;
      }

      closeActiveDialog();
      state.transientStatus = errorMessage;
      renderView(action.focusToken);
    }

    function finishDeleteInvalidItemsMutation(result) {
      if (result.confirmed && state.view.state === STATES.VALID) {
        closeActiveDialog();
        state.transientStatus = 'distanceTermsPartialSuccess';
        renderView({ kind: 'add-input' });
        return;
      }

      const errorMessage = 'distanceTermsRecoveryUnknown';

      if (state.view.state === STATES.PARTIALLY_INVALID) {
        state.dialogError = errorMessage;
        renderView();
        elements.invalidDialogAction.focus();
        return;
      }

      closeActiveDialog();
      state.transientStatus = errorMessage;
      renderView(getLatestStateFocusToken());
    }

    function finishResetInvalidSettingsMutation(result) {
      if (result.confirmed && isInitialOptionsView(state.view)) {
        closeActiveDialog();
        state.transientStatus = 'distanceTermsResetSuccess';
        renderView({ kind: 'add-input' });
        return;
      }

      const errorMessage = 'distanceTermsRecoveryUnknown';

      if (state.view.state === STATES.WHOLE_INVALID) {
        state.dialogError = errorMessage;
        renderView();
        elements.resetDialogAction.focus();
        return;
      }

      closeActiveDialog();
      state.transientStatus = errorMessage;
      renderView(getLatestStateFocusToken());
    }

    async function retryRead() {
      if (state.activity !== 'idle' || state.view?.state !== STATES.READ_ERROR) {
        return;
      }

      state.activity = 'loading';
      applyBusyState();

      try {
        state.view = normalizeOptionsView(await reader.readDistanceTermsOptionsView());
      } catch (_error) {
        state.view = Object.freeze({ state: STATES.READ_ERROR });
      }

      state.activity = 'idle';
      renderView(
        state.view.state === STATES.READ_ERROR ? { kind: 'retry' } : getLatestStateFocusToken()
      );
    }

    function renderView(focusToken = null) {
      if (!elements) {
        return;
      }

      applyStaticLocalization();
      renderStorageState();
      renderNormalManagement();
      applyStatusState();
      applyDialogState();
      applyBusyState();

      if (focusToken) {
        focusByToken(focusToken);
      }
    }

    function applyStaticLocalization() {
      elements.title.textContent = message('distanceTermsSectionTitle');
      elements.description.textContent = message('distanceTermsDescription');
      elements.privacy.textContent = message('distanceTermsPrivacy');
      elements.manualLabel.textContent = message('distanceTermsManualLink');
      elements.manualNewTab.textContent = ` (${message('linkOpensInNewTab')})`;
      elements.manualLink.href =
        state.localization.resolvedLanguage === 'ja' ? MANUAL_URLS.ja : MANUAL_URLS.en;
      elements.masterLabel.textContent = message('distanceTermsMasterLabel');
      elements.masterNote.textContent = message('distanceTermsMasterNote');
      elements.addHeading.textContent = message('distanceTermsAddHeading');
      elements.addInput.placeholder = message('distanceTermsAddPlaceholder');
      elements.addButton.textContent = message('distanceTermsAddButton');
      elements.listHeading.textContent = message('distanceTermsListHeading');
      elements.empty.textContent = message('distanceTermsEmpty');
      elements.maximum.textContent = message('distanceTermsMaximum');
    }

    function renderStorageState() {
      elements.stateArea.replaceChildren();
      dynamicControls.stateFocusElement = null;
      dynamicControls.recoveryButton = null;
      dynamicControls.retryButton = null;

      if (!state.view || state.view.state === STATES.MISSING || state.view.state === STATES.VALID) {
        elements.stateArea.hidden = true;
        return;
      }

      elements.stateArea.hidden = false;
      const card = createElement(document, 'div', 'distance-terms-state-card');

      if (state.view.state === STATES.PARTIALLY_INVALID) {
        const heading = createStateHeading('distanceTermsPartialTitle');
        card.append(heading);
        appendParagraph(card, 'distanceTermsPartialBody');
        appendParagraph(card, 'distanceTermsPartialCount', [state.view.invalidCount]);
        const action = createButton('distanceTermsPartialAction', () => {
          openDialog('delete_invalid_items', {
            originFocusToken: getCurrentRecoveryFocusToken()
          });
        });
        card.append(action);
        dynamicControls.stateFocusElement = heading;
        dynamicControls.recoveryButton = action;
      } else if (state.view.state === STATES.WHOLE_INVALID) {
        const heading = createStateHeading('distanceTermsWholeInvalidTitle');
        card.append(heading);
        appendParagraph(card, 'distanceTermsWholeInvalidBody');
        appendParagraph(card, 'distanceTermsWholeInvalidFixedRules');
        const action = createButton('distanceTermsWholeInvalidAction', () => {
          openDialog('reset_invalid_settings', {
            originFocusToken: getCurrentRecoveryFocusToken()
          });
        });
        card.append(action);
        dynamicControls.stateFocusElement = heading;
        dynamicControls.recoveryButton = action;
      } else if (state.view.state === STATES.UNSUPPORTED_SCHEMA) {
        const heading = createStateHeading('distanceTermsUnsupportedTitle');
        appendParagraph(card, 'distanceTermsUnsupportedBody');
        appendParagraph(card, 'distanceTermsUnsupportedPaused');
        card.prepend(heading);
        dynamicControls.stateFocusElement = heading;
      } else if (state.view.state === STATES.READ_ERROR) {
        const heading = createStateHeading('distanceTermsReadErrorTitle');
        card.append(heading);
        appendParagraph(card, 'distanceTermsReadErrorBody');
        const retryButton = createButton('distanceTermsRetry', retryRead);
        card.append(retryButton);
        dynamicControls.stateFocusElement = heading;
        dynamicControls.retryButton = retryButton;
      } else {
        elements.stateArea.hidden = true;
        return;
      }

      elements.stateArea.append(card);
    }

    function renderNormalManagement() {
      const normalView = state.view && NORMAL_STATES.has(state.view.state);
      elements.normalArea.hidden = !normalView;
      dynamicControls.itemControls = new Map();
      dynamicControls.itemInputs = [];
      dynamicControls.itemDeleteButtons = [];

      if (!normalView) {
        elements.list.replaceChildren();
        return;
      }

      elements.masterCheckbox.checked = state.view.masterEnabled;
      elements.addInput.value = state.draftTerm;
      elements.count.textContent = message('distanceTermsCount', [state.view.rawItemCount]);
      elements.maximum.hidden = state.view.rawItemCount < CONSTANTS.MAX_ITEMS;
      elements.empty.hidden = state.view.items.length !== 0;
      elements.list.hidden = state.view.items.length === 0;
      elements.list.replaceChildren();
      applyValidationState();

      for (const [index, item] of state.view.items.entries()) {
        const row = createElement(
          document,
          'li',
          item.enabled ? 'distance-terms-item' : 'distance-terms-item distance-terms-item--off'
        );
        const label = createElement(document, 'label', 'distance-terms-item-toggle');
        const checkbox = createElement(document, 'input', 'distance-terms-item-checkbox');
        checkbox.type = 'checkbox';
        checkbox.checked = item.enabled;
        const copy = createElement(document, 'span', 'distance-terms-item-copy');
        const term = createElement(document, 'span', 'distance-terms-item-term');
        term.id = `distance-terms-item-term-${index + 1}`;
        term.setAttribute('id', term.id);
        term.textContent = item.term;
        const itemStatus = createElement(document, 'span', 'distance-terms-item-status');
        itemStatus.textContent = message(
          item.enabled ? 'distanceTermsItemStateOn' : 'distanceTermsItemStateOff'
        );
        copy.append(term, itemStatus);
        label.append(checkbox, copy);
        const deleteButton = createElement(document, 'button', 'distance-terms-delete-button');
        deleteButton.type = 'button';
        deleteButton.textContent = message('distanceTermsDeleteButton');
        deleteButton.setAttribute('aria-describedby', term.id);

        checkbox.addEventListener('change', async () => {
          if (!canStartNormalMutation()) {
            return;
          }

          const desiredEnabled = checkbox.checked;
          checkbox.checked = item.enabled;
          await performMutation({
            kind: 'item',
            operation: OPERATIONS.SET_ITEM_ENABLED,
            payload: { id: item.id, enabled: desiredEnabled },
            focusToken: { kind: 'item-switch', id: item.id }
          });
        });
        deleteButton.addEventListener('click', () => {
          openDialog('delete_item', {
            itemId: item.id,
            displayTerm: item.term,
            originFocusToken: { kind: 'item-delete', id: item.id }
          });
        });

        row.append(label, deleteButton);
        elements.list.append(row);
        dynamicControls.itemControls.set(item.id, {
          checkbox,
          deleteButton
        });
        dynamicControls.itemInputs.push(checkbox);
        dynamicControls.itemDeleteButtons.push(deleteButton);
      }
    }

    function createStateHeading(messageKey) {
      const heading = createElement(document, 'h3', 'distance-terms-state-title');
      heading.tabIndex = -1;
      heading.textContent = message(messageKey);
      return heading;
    }

    function appendParagraph(parent, messageKey, substitutions) {
      const paragraph = createElement(document, 'p', 'distance-terms-state-copy');
      paragraph.textContent = message(messageKey, substitutions);
      parent.append(paragraph);
    }

    function createButton(messageKey, listener) {
      const button = createElement(document, 'button', 'distance-terms-secondary-button');
      button.type = 'button';
      button.textContent = message(messageKey);
      button.addEventListener('click', listener);
      return button;
    }

    function applyValidationState() {
      if (!elements || !state.view || !NORMAL_STATES.has(state.view.state)) {
        return;
      }

      const validationMessage = state.validationError ? message(state.validationError) : '';
      elements.validation.textContent = validationMessage;
      elements.validation.hidden = !validationMessage;

      if (validationMessage) {
        elements.addInput.setAttribute('aria-invalid', 'true');
        elements.addInput.setAttribute('aria-describedby', ELEMENT_IDS.validation);
      } else {
        elements.addInput.removeAttribute('aria-invalid');
        elements.addInput.removeAttribute('aria-describedby');
      }
    }

    function applyStatusState() {
      elements.status.textContent = state.transientStatus ? message(state.transientStatus) : '';
    }

    function applyDialogState() {
      elements.deleteDialogTitle.textContent = message('distanceTermsDeleteDialogTitle');
      elements.deleteDialogTarget.textContent = state.dialogMemory?.displayTerm
        ? message('distanceTermsDeleteDialogTarget', [state.dialogMemory.displayTerm])
        : '';
      elements.deleteDialogCannotRestore.textContent = message(
        'distanceTermsDeleteDialogCannotRestore'
      );
      elements.deleteDialogReregister.textContent = message('distanceTermsDeleteDialogReregister');
      elements.deleteDialogCancel.textContent = message('distanceTermsCancel');
      elements.deleteDialogAction.textContent = message('distanceTermsDeleteDialogAction');
      elements.deleteDialogError.textContent =
        state.dialog === 'delete_item' && state.dialogError ? message(state.dialogError) : '';

      elements.invalidDialogTitle.textContent = message('distanceTermsPartialDialogTitle');
      elements.invalidDialogBody.textContent = message('distanceTermsPartialDialogBody');
      elements.invalidDialogCannotRestore.textContent = message(
        'distanceTermsPartialDialogCannotRestore'
      );
      elements.invalidDialogKeepsValid.textContent = message(
        'distanceTermsPartialDialogKeepsValid'
      );
      elements.invalidDialogCancel.textContent = message('distanceTermsCancel');
      elements.invalidDialogAction.textContent = message('distanceTermsPartialAction');
      elements.invalidDialogError.textContent =
        state.dialog === 'delete_invalid_items' && state.dialogError
          ? message(state.dialogError)
          : '';

      elements.resetDialogTitle.textContent = message('distanceTermsResetDialogTitle');
      elements.resetDialogBody.textContent = message('distanceTermsResetDialogBody');
      elements.resetDialogCannotUndo.textContent = message('distanceTermsResetDialogCannotUndo');
      elements.resetDialogOtherSettings.textContent = message(
        'distanceTermsResetDialogOtherSettings'
      );
      elements.resetDialogCancel.textContent = message('distanceTermsCancel');
      elements.resetDialogAction.textContent = message('distanceTermsResetDialogAction');
      elements.resetDialogError.textContent =
        state.dialog === 'reset_invalid_settings' && state.dialogError
          ? message(state.dialogError)
          : '';
    }

    function applyBusyState() {
      const busy = isBusy();
      const loading = state.activity === 'loading';
      elements.section.setAttribute('aria-busy', busy || loading ? 'true' : 'false');
      elements.masterCheckbox.disabled = busy;
      elements.addInput.disabled = busy;
      elements.addButton.disabled =
        busy || Boolean(state.view && state.view.rawItemCount >= CONSTANTS.MAX_ITEMS);

      for (const input of dynamicControls.itemInputs) {
        input.disabled = busy;
      }

      for (const button of dynamicControls.itemDeleteButtons) {
        button.disabled = busy;
      }

      if (dynamicControls.recoveryButton) {
        dynamicControls.recoveryButton.disabled = busy;
      }

      if (dynamicControls.retryButton) {
        dynamicControls.retryButton.disabled = loading;
      }

      elements.deleteDialogCancel.disabled = busy;
      elements.deleteDialogAction.disabled = busy;
      elements.invalidDialogCancel.disabled = busy;
      elements.invalidDialogAction.disabled = busy;
      elements.resetDialogCancel.disabled = busy;
      elements.resetDialogAction.disabled = busy;
    }

    function openDialog(type, memory) {
      if (state.activity !== 'idle' || state.dialog !== 'none') {
        return;
      }

      state.dialog = type;
      state.dialogMemory = {
        itemId: memory.itemId,
        displayTerm: memory.displayTerm,
        originFocusToken: memory.originFocusToken
      };
      state.dialogError = '';
      applyDialogState();
      const dialog = getDialogElement(type);
      const cancelButton = getDialogCancelButton(type);

      dialog.showModal();
      cancelButton.focus();
    }

    function cancelDialog(type) {
      if (state.dialog !== type || isBusy()) {
        return;
      }

      const focusToken = state.dialogMemory?.originFocusToken ?? getLatestStateFocusToken();
      closeActiveDialog();
      focusByToken(focusToken);
    }

    function closeActiveDialog() {
      if (state.dialog === 'none') {
        return;
      }

      const dialog = getDialogElement(state.dialog);

      if (dialog.open) {
        dialog.close();
      }

      state.dialog = 'none';
      state.dialogMemory = null;
      state.dialogError = '';
    }

    function focusByToken(token) {
      state.focusToken = token;
      let target = null;

      if (token?.kind === 'master' && !elements.normalArea.hidden) {
        target = elements.masterCheckbox;
      } else if (token?.kind === 'add-input' && !elements.normalArea.hidden) {
        target = elements.addInput;
      } else if (token?.kind === 'item-switch') {
        target = dynamicControls.itemControls.get(token.id)?.checkbox ?? getNormalFallback();
      } else if (token?.kind === 'item-delete') {
        target = dynamicControls.itemControls.get(token.id)?.deleteButton ?? getNormalFallback();
      } else if (token?.kind === 'retry') {
        target = dynamicControls.retryButton ?? getStateFallback();
      } else if (token?.kind === 'state') {
        target = dynamicControls.stateFocusElement;
      } else if (token?.kind === 'state-action') {
        target = dynamicControls.recoveryButton ?? dynamicControls.stateFocusElement;
      }

      if (!target) {
        target = getStateFallback();
      }

      target?.focus();
      state.focusToken = null;
    }

    function getNormalFallback() {
      return elements.normalArea.hidden ? null : elements.addInput;
    }

    function getStateFallback() {
      return dynamicControls.stateFocusElement ?? getNormalFallback() ?? elements.title;
    }

    function getLatestStateFocusToken() {
      return NORMAL_STATES.has(state.view?.state) ? { kind: 'add-input' } : { kind: 'state' };
    }

    function getCurrentRecoveryFocusToken() {
      if (state.view?.state === STATES.READ_ERROR) {
        return { kind: 'retry' };
      }

      return { kind: 'state-action' };
    }

    function isDeleteDialogCompatible(id) {
      if (!NORMAL_STATES.has(state.view?.state)) {
        return false;
      }

      const latestTarget = state.view.items.find((item) => item.id === id);

      return latestTarget?.term === state.dialogMemory?.displayTerm;
    }

    function canStartNormalMutation() {
      return (
        state.activity === 'idle' &&
        state.dialog === 'none' &&
        state.view !== null &&
        NORMAL_STATES.has(state.view.state)
      );
    }

    function isBusy() {
      return state.activity === 'mutating' || state.activity === 'reconciling';
    }

    function createRuntimeRequest(action) {
      const request = {
        type: CONSTANTS.MESSAGE_TYPE,
        protocolVersion: CONSTANTS.PROTOCOL_VERSION,
        operation: action.operation
      };

      if (action.payload !== undefined) {
        request.payload = action.payload;
      }

      return request;
    }

    function message(key, substitutions) {
      return state.localization.getMessage(key, substitutions);
    }

    function getDialogElement(type) {
      if (type === 'delete_item') {
        return elements.deleteDialog;
      }

      if (type === 'delete_invalid_items') {
        return elements.invalidDialog;
      }

      return elements.resetDialog;
    }

    function getDialogCancelButton(type) {
      if (type === 'delete_item') {
        return elements.deleteDialogCancel;
      }

      if (type === 'delete_invalid_items') {
        return elements.invalidDialogCancel;
      }

      return elements.resetDialogCancel;
    }

    return Object.freeze({
      initialize,
      updateLocalization
    });
  }

  function getElements(document) {
    if (!document || typeof document.getElementById !== 'function') {
      return null;
    }

    const elements = {};

    for (const [name, id] of Object.entries(ELEMENT_IDS)) {
      const element = document.getElementById(id);

      if (!element) {
        return null;
      }

      elements[name] = element;
    }

    return elements;
  }

  function normalizeLocalization(localization) {
    return {
      resolvedLanguage: localization?.resolvedLanguage === 'ja' ? 'ja' : 'en',
      getMessage:
        typeof localization?.getMessage === 'function'
          ? (key, substitutions) => {
              try {
                return String(localization.getMessage(key, substitutions) || key);
              } catch (_error) {
                return key;
              }
            }
          : (key) => key
    };
  }

  function normalizeOptionsView(view) {
    if (!isSafeObject(view) || !Object.values(STATES).includes(view.state)) {
      return Object.freeze({ state: STATES.READ_ERROR });
    }

    if (!NORMAL_STATES.has(view.state)) {
      return Object.freeze({ state: view.state });
    }

    if (
      typeof view.masterEnabled !== 'boolean' ||
      !Array.isArray(view.items) ||
      !Number.isInteger(view.invalidCount) ||
      view.invalidCount < 0 ||
      !Number.isInteger(view.rawItemCount) ||
      view.rawItemCount < 0 ||
      view.rawItemCount > CONSTANTS.MAX_ITEMS ||
      view.items.some((item) => {
        return (
          !isSafeObject(item) ||
          typeof item.id !== 'string' ||
          typeof item.term !== 'string' ||
          typeof item.enabled !== 'boolean'
        );
      })
    ) {
      return Object.freeze({ state: STATES.READ_ERROR });
    }

    return view;
  }

  function validateDistanceTermsMutationResponse(response) {
    return parseDistanceTermsMutationResponse(response) !== null;
  }

  function parseDistanceTermsMutationResponse(response) {
    try {
      if (!isSafeObject(response)) {
        return null;
      }

      const keys = Object.keys(response);
      const ok = response.ok;
      const code = response.code;

      if (
        keys.length !== 2 ||
        !Object.hasOwn(response, 'ok') ||
        !Object.hasOwn(response, 'code') ||
        typeof ok !== 'boolean' ||
        typeof code !== 'string'
      ) {
        return null;
      }

      if (ok) {
        return SUCCESS_RESPONSE_CODES.has(code) ? Object.freeze({ ok, code }) : null;
      }

      return FAILURE_RESPONSE_CODES.has(code) ? Object.freeze({ ok, code }) : null;
    } catch (_error) {
      return null;
    }
  }

  function getValidationMessageKey(reason) {
    if (reason === 'CODE_POINT_LIMIT') {
      return 'distanceTermsValidationSafetyLength';
    }

    if (reason === 'LINE_BREAK_OR_TAB') {
      return 'distanceTermsValidationLineBreakTab';
    }

    if (reason === 'FORBIDDEN_CHARACTER') {
      return 'distanceTermsValidationForbidden';
    }

    return 'distanceTermsValidationLength';
  }

  function getAddResponseValidationMessageKey(code) {
    if (code === RESPONSE_CODES.DUPLICATE_TERM) {
      return 'distanceTermsValidationDuplicate';
    }

    if (code === RESPONSE_CODES.LIMIT_REACHED) {
      return 'distanceTermsMaximum';
    }

    if (code === RESPONSE_CODES.INVALID_TERM_LENGTH) {
      return 'distanceTermsValidationLength';
    }

    if (code === RESPONSE_CODES.FORBIDDEN_CHARACTER) {
      return 'distanceTermsValidationForbidden';
    }

    return '';
  }

  function isInitialOptionsView(view) {
    return (
      view?.state === STATES.VALID &&
      view.masterEnabled === true &&
      view.rawItemCount === 0 &&
      view.invalidCount === 0 &&
      Array.isArray(view.items) &&
      view.items.length === 0
    );
  }

  function createEmptyDynamicControls() {
    return {
      itemControls: new Map(),
      itemInputs: [],
      itemDeleteButtons: [],
      stateFocusElement: null,
      recoveryButton: null,
      retryButton: null
    };
  }

  function createElement(document, tagName, className) {
    const element = document.createElement(tagName);
    element.className = className;
    return element;
  }

  function isSafeObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  const publicApi = Object.freeze({
    initializeDistanceTermsOptions,
    updateDistanceTermsOptionsLocalization
  });

  if (typeof globalThis !== 'undefined') {
    globalThis.kotobaUkeMimamoriDistanceTermsOptions = publicApi;
  }

  if (typeof module !== 'undefined') {
    module.exports = {
      ...publicApi,
      createDistanceTermsOptionsController,
      validateDistanceTermsMutationResponse
    };
  }
})();
