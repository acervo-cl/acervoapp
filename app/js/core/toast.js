function toast(msg, type='', key='') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const el = key
    ? [...c.children].find(item => item.dataset && item.dataset.toastKey === key)
    : null;
  const target = el || document.createElement('div');
  if (key) target.dataset.toastKey = key;
  target.className = `toast ${type}`;
  target.innerHTML = `${type==='success'?'✓':type==='error'?'✕':'ℹ'} ${msg}`;
  if (!el) c.appendChild(target);
  clearTimeout(target._toastTimer);
  target._toastTimer = setTimeout(() => target.remove(), 3000);
}
