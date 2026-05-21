'use strict';

const assert = require('node:assert/strict');
const {
  CUSHION_STYLE_ELEMENT_ID,
  createCushionElement,
  ensureCushionStyles
} = require('../overlay');

const MESSAGES = Object.freeze({
  cushionTitle: '読む前に、少しだけワンクッションを置きました',
  cushionBody: 'この投稿には、心に負荷がかかる可能性のある表現が含まれているかもしれません。',
  reasonGeneric: '心に負荷がかかる可能性のある表現を検知しました',
  buttonShowContent: '内容を表示する',
  buttonHideForNow: '今は見ない'
});

function runTests() {
  testCreatesGenericCushionElement();
  testCreatesButtonElements();
  testInjectsCushionStylesOnce();
  testDoesNotRenderPostTextOrInternalRiskDetails();
  testShowButtonHandler();

  console.log('All overlay tests passed.');
}

function testCreatesGenericCushionElement() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({ reasonMessageKey: 'reasonGeneric' });

    assert.equal(element.tagName, 'SECTION');
    assert.equal(element.className, 'kum-cushion');
    assert.equal(element.getAttribute('role'), 'group');
    assert.equal(element.children[0].className, 'kum-cushion__title');
    assert.equal(element.children[1].className, 'kum-cushion__body');
    assert.equal(element.children[2].className, 'kum-cushion__reason');
    assert.equal(element.children[3].className, 'kum-cushion__actions');
    assert.equal(element.children[3].children[0].className, 'kum-cushion__button');
    assert.equal(element.children[3].children[1].className, 'kum-cushion__button');
    assert.ok(element.textContent.includes(MESSAGES.cushionTitle));
    assert.ok(element.textContent.includes(MESSAGES.cushionBody));
    assert.ok(element.textContent.includes(MESSAGES.reasonGeneric));
    assert.ok(element.textContent.includes(MESSAGES.buttonShowContent));
    assert.ok(element.textContent.includes(MESSAGES.buttonHideForNow));
  });
}

function testCreatesButtonElements() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({ reasonMessageKey: 'reasonGeneric' });
    const showButton = element.children[3].children[0];
    const hideButton = element.children[3].children[1];

    assert.equal(showButton.tagName, 'BUTTON');
    assert.equal(hideButton.tagName, 'BUTTON');
    assert.equal(showButton.type, 'button');
    assert.equal(hideButton.type, 'button');
    assert.equal(showButton.className, 'kum-cushion__button');
    assert.equal(hideButton.className, 'kum-cushion__button');
  });
}

function testInjectsCushionStylesOnce() {
  withFakeDomAndI18n((fakeDocument) => {
    const firstResult = ensureCushionStyles();
    const secondResult = ensureCushionStyles();
    const styleElement = fakeDocument.getElementById(CUSHION_STYLE_ELEMENT_ID);

    assert.equal(firstResult, true);
    assert.equal(secondResult, false);
    assert.equal(fakeDocument.head.children.length, 1);
    assert.ok(styleElement.textContent.includes('.kum-cushion'));
    assert.ok(styleElement.textContent.includes('.kum-content-blur'));
    assert.ok(styleElement.textContent.includes('filter: blur(5px)'));
    assert.ok(styleElement.textContent.includes('.kum-cushion__button:focus-visible'));
    assert.ok(styleElement.textContent.includes('outline-offset: 2px'));
    assert.ok(styleElement.textContent.includes('outline: 2px solid rgba(245, 158, 11, 0.85)'));
    assert.ok(styleElement.textContent.includes('@media (prefers-color-scheme: dark)'));
    assert.ok(styleElement.textContent.includes('body[data-color-scheme="dark"] .kum-cushion'));
    assert.ok(styleElement.textContent.includes('background: rgba(43, 35, 27, 0.96)'));
    assert.ok(styleElement.textContent.includes('outline-color: rgba(252, 211, 77, 0.95)'));
  });
}

function testDoesNotRenderPostTextOrInternalRiskDetails() {
  withFakeDomAndI18n(() => {
    const element = createCushionElement({
      postText: 'これはUIに出してはいけない投稿本文です',
      score: 100,
      matchedRules: ['existence_denial.strong_phrase'],
      categories: ['existence_denial'],
      reasons: ['存在否定に近い表現の可能性があります']
    });

    assert.equal(element.textContent.includes('これはUIに出してはいけない投稿本文です'), false);
    assert.equal(element.textContent.includes('100'), false);
    assert.equal(element.textContent.includes('existence_denial'), false);
    assert.equal(element.textContent.includes('existence_denial.strong_phrase'), false);
    assert.equal(element.textContent.includes('存在否定に近い表現の可能性があります'), false);
    assert.ok(element.textContent.includes(MESSAGES.reasonGeneric));
  });
}

function testShowButtonHandler() {
  withFakeDomAndI18n(() => {
    let showCount = 0;
    const element = createCushionElement(
      {},
      {
        onShow: () => {
          showCount += 1;
        }
      }
    );
    const showButton = element.children[3].children[0];

    showButton.click();

    assert.equal(showCount, 1);
  });
}

function withFakeDomAndI18n(callback) {
  const previousDocument = globalThis.document;
  const previousI18n = globalThis.kotobaUkeMimamoriI18n;
  const fakeDocument = {
    createElement,
    head: createElement('head'),
    getElementById(id) {
      return findElementById(this.head, id);
    }
  };

  globalThis.document = fakeDocument;
  globalThis.kotobaUkeMimamoriI18n = {
    getMessage(key) {
      return MESSAGES[key] || key;
    }
  };

  try {
    callback(fakeDocument);
  } finally {
    restoreGlobal('document', previousDocument);
    restoreGlobal('kotobaUkeMimamoriI18n', previousI18n);
  }
}

function restoreGlobal(key, value) {
  if (value === undefined) {
    delete globalThis[key];
  } else {
    globalThis[key] = value;
  }
}

function findElementById(root, id) {
  if (!root) {
    return null;
  }

  if (typeof root.getAttribute === 'function' && root.getAttribute('id') === id) {
    return root;
  }

  for (const childNode of root.children || []) {
    const foundNode = findElementById(childNode, id);

    if (foundNode) {
      return foundNode;
    }
  }

  return null;
}

function createElement(tagName) {
  const attributes = new Map();
  const listeners = new Map();

  return {
    children: [],
    className: '',
    nodeType: 1,
    tagName: String(tagName).toUpperCase(),
    _textContent: '',
    get textContent() {
      return this._textContent + this.children.map((childNode) => childNode.textContent).join('');
    },
    set textContent(value) {
      this._textContent = String(value);
      this.children = [];
    },
    addEventListener(eventName, handler) {
      listeners.set(eventName, handler);
    },
    append(...childNodes) {
      for (const childNode of childNodes) {
        this.children.push(childNode);
      }
    },
    appendChild(childNode) {
      this.children.push(childNode);
      return childNode;
    },
    click() {
      const clickHandler = listeners.get('click');

      if (typeof clickHandler === 'function') {
        clickHandler();
      }
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    }
  };
}

runTests();
