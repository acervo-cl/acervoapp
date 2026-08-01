function toast(msg, type='') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${type==='success'?'✓':type==='error'?'✕':'ℹ'} ${msg}`;
  c.appendChild(el);
  setTimeout(()=>el.remove(), 3000);
}
