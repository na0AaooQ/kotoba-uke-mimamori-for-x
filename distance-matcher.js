'use strict';

(function initializeDistanceMatcher() {
  function createDistanceMatcher(terms) {
    const preparedTerms = Array.isArray(terms)
      ? terms.filter((term) => typeof term === 'string').map(prepareTextForMatching)
      : [];

    return function matches(rawPostText) {
      if (typeof rawPostText !== 'string') {
        return false;
      }

      try {
        const preparedPostText = prepareTextForMatching(rawPostText);

        return preparedTerms.some((preparedTerm) => preparedPostText.includes(preparedTerm));
      } catch (_error) {
        return false;
      }
    };
  }

  function prepareTextForMatching(text) {
    let preparedText = '';

    for (const character of text.normalize('NFKC')) {
      const codePoint = character.codePointAt(0);
      preparedText +=
        codePoint >= 0x41 && codePoint <= 0x5a ? String.fromCodePoint(codePoint + 0x20) : character;
    }

    return preparedText;
  }

  const distanceMatcher = Object.freeze({ createDistanceMatcher });

  if (typeof globalThis !== 'undefined') {
    globalThis.kotobaUkeMimamoriDistanceMatcher = distanceMatcher;
  }

  if (typeof module !== 'undefined') {
    module.exports = distanceMatcher;
  }
})();
