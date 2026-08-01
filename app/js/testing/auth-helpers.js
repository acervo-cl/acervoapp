export function rememberSessionEnabled(storedValue) {
  return storedValue !== '0';
}

export function isPasswordRecoveryHash(hashValue = '') {
  return String(hashValue || '').includes('type=recovery');
}

export function resolveBootScreen({ hash = '', hasSession = false, bootError = false } = {}) {
  if (isPasswordRecoveryHash(hash)) return 'reset-screen';
  if (bootError) return 'login-screen';
  return hasSession ? 'app-screen' : 'login-screen';
}

export function resolveEnterScreen({ hasUser = false, approved = false } = {}) {
  if (!hasUser) return 'login-screen';
  return approved ? 'app-screen' : 'pending-screen';
}

export function resolveAuthEventScreen(eventName = '') {
  return eventName === 'PASSWORD_RECOVERY' ? 'reset-screen' : '';
}
