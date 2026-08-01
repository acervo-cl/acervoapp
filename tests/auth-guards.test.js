import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPasswordRecoveryHash,
  rememberSessionEnabled,
  resolveAuthEventScreen,
  resolveBootScreen,
  resolveEnterScreen,
} from '../app/js/testing/auth-helpers.js';

test('rememberSessionEnabled defaults to true unless explicitly disabled', () => {
  assert.equal(rememberSessionEnabled(null), true);
  assert.equal(rememberSessionEnabled('1'), true);
  assert.equal(rememberSessionEnabled('0'), false);
});

test('isPasswordRecoveryHash detects Supabase recovery hashes', () => {
  assert.equal(isPasswordRecoveryHash('#access_token=abc&type=recovery'), true);
  assert.equal(isPasswordRecoveryHash('#access_token=abc&type=signup'), false);
});

test('resolveBootScreen prioritizes recovery flow', () => {
  assert.equal(resolveBootScreen({ hash: '#type=recovery', hasSession: true }), 'reset-screen');
});

test('resolveBootScreen falls back to app or login based on session state', () => {
  assert.equal(resolveBootScreen({ hasSession: true }), 'app-screen');
  assert.equal(resolveBootScreen({ hasSession: false }), 'login-screen');
});

test('resolveBootScreen sends boot errors to login screen', () => {
  assert.equal(resolveBootScreen({ bootError: true, hasSession: true }), 'login-screen');
});

test('resolveEnterScreen guards login and pending approval states', () => {
  assert.equal(resolveEnterScreen({ hasUser: false, approved: true }), 'login-screen');
  assert.equal(resolveEnterScreen({ hasUser: true, approved: false }), 'pending-screen');
  assert.equal(resolveEnterScreen({ hasUser: true, approved: true }), 'app-screen');
});

test('resolveAuthEventScreen reacts only to password recovery events', () => {
  assert.equal(resolveAuthEventScreen('PASSWORD_RECOVERY'), 'reset-screen');
  assert.equal(resolveAuthEventScreen('SIGNED_IN'), '');
});
