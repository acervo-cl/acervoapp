import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/js/core/toast.js', import.meta.url), 'utf8');

function loadToast() {
  const children = [];
  const timers = [];
  const container = {
    children,
    appendChild(element) { children.push(element); },
  };
  const context = {
    document: {
      getElementById() { return container; },
      createElement() {
        return {
          dataset: {},
          className: '',
          innerHTML: '',
          remove() {
            const index = children.indexOf(this);
            if (index >= 0) children.splice(index, 1);
          },
        };
      },
    },
    clearTimeout(timer) {
      const index = timers.indexOf(timer);
      if (index >= 0) timers.splice(index, 1);
    },
    setTimeout(callback) {
      timers.push(callback);
      return callback;
    },
  };
  vm.runInNewContext(`${source}\nthis.toast = toast;`, context);
  return { toast: context.toast, children };
}

test('keyed toasts update one existing notification', () => {
  const { toast, children } = loadToast();

  toast('Vista: 100%', '', 'reader-size');
  toast('Vista: 120%', '', 'reader-size');

  assert.equal(children.length, 1);
  assert.match(children[0].innerHTML, /120%/);
});

test('unkeyed toasts remain independent', () => {
  const { toast, children } = loadToast();

  toast('Primero');
  toast('Segundo');

  assert.equal(children.length, 2);
});
