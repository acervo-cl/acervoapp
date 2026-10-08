function _modalButton(label, title, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `modal-window-btn ${className || ''}`;
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', title);
  return button;
}

function _syncModalControls(modal) {
  if (!modal) return;
  const floatButton = modal.querySelector('.modal-window-float');
  const fullscreenButton = modal.querySelector('.modal-window-fullscreen');
  if (floatButton) {
    const floating = modal.classList.contains('win-mode');
    floatButton.textContent = floating ? '⦿' : '⠿';
    floatButton.title = floating ? 'Centrar ventana' : 'Flotar y mover ventana';
    floatButton.setAttribute('aria-label', floatButton.title);
  }
  if (fullscreenButton) {
    const fullscreen = modal.classList.contains('fullscreen');
    fullscreenButton.textContent = fullscreen ? '⤢' : '⛶';
    fullscreenButton.title = fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';
    fullscreenButton.setAttribute('aria-label', fullscreenButton.title);
  }
}

function _installModalDrag(modal) {
  if (!modal || modal._modalDragInstalled) return;
  modal._modalDragInstalled = true;
  modal.addEventListener('pointerdown', (event) => {
    if (!modal.classList.contains('win-mode')) return;
    const title = event.target.closest('.modal-title');
    if (!title || event.target.closest('button,input,textarea,select,a')) return;
    event.preventDefault();
    const rect = modal.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = rect.left;
    const originY = rect.top;
    try { title.setPointerCapture(event.pointerId); } catch (_) {}
    const move = (current) => {
      modal.style.left = `${Math.max(0, Math.min(originX + current.clientX - startX, window.innerWidth - 80))}px`;
      modal.style.top = `${Math.max(0, Math.min(originY + current.clientY - startY, window.innerHeight - 40))}px`;
    };
    const stop = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
  });
}

function _ensureModalControls(modal) {
  if (!modal || modal.dataset.windowControls === 'true') return;
  modal.dataset.windowControls = 'true';
  modal.dataset.baseWidth = modal.style.width || '';
  modal.dataset.baseHeight = modal.style.height || '';
  modal.style.position = 'fixed';
  const controls = document.createElement('div');
  controls.className = 'modal-window-controls';
  const floatButton = _modalButton('⠿', 'Flotar y mover ventana', 'modal-window-float');
  const fullscreenButton = _modalButton('⛶', 'Pantalla completa', 'modal-window-fullscreen');
  const closeButton = _modalButton('✕', 'Cerrar', 'modal-window-close');
  floatButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleModalFloat(modal.id);
  });
  fullscreenButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleFS(modal.id);
  });
  closeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    onBackdrop();
  });
  controls.append(floatButton, fullscreenButton, closeButton);
  modal.prepend(controls);
  _installModalDrag(modal);
  _syncModalControls(modal);
}

function openModal(id) {
  closeAllModals();
  const modal = document.getElementById(id);
  if (!modal) {
    console.warn(`No existe el modal #${id}`);
    return;
  }
  _ensureModalControls(modal);
  modal.classList.add('open');
  document.getElementById('modal-backdrop').classList.add('open');
  document.body.classList.add('modal-open');
  _syncModalControls(modal);
}

function _makeModalWindow(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  _ensureModalControls(modal);
  modal.classList.add('win-mode');
  const width = modal.offsetWidth || 560;
  const height = modal.offsetHeight || 400;
  modal.style.left = `${Math.max(8, Math.round((window.innerWidth - width) / 2))}px`;
  modal.style.top = `${Math.max(8, Math.round((window.innerHeight - height) / 2))}px`;
  _syncModalControls(modal);
}

function toggleModalFloat(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (modal.classList.contains('fullscreen')) modal.classList.remove('fullscreen');
  if (modal.classList.contains('win-mode')) {
    modal.classList.remove('win-mode');
    modal.style.left = '';
    modal.style.top = '';
    modal.style.width = modal.dataset.baseWidth || '';
    modal.style.height = modal.dataset.baseHeight || '';
  } else {
    _makeModalWindow(id);
  }
  _syncModalControls(modal);
}

function toggleFS(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  _ensureModalControls(modal);
  modal.classList.toggle('fullscreen');
  _syncModalControls(modal);
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.classList.remove('open');
    modal.classList.remove('fullscreen');
    _syncModalControls(modal);
  });
  document.getElementById('modal-backdrop').classList.remove('open');
  document.body.classList.remove('modal-open');
}

function onBackdrop() {
  const redModal = document.getElementById('modal-redactar');
  if (redModal && redModal.classList.contains('open') && _RW) {
    rwSaveDraft();
    closeAllModals();
    toast('Borrador guardado', 'success');
    return;
  }
  const docModal = document.getElementById('modal-doc');
  if (docModal && docModal.classList.contains('open')) {
    const title = (document.getElementById('fd-title').value || '').trim();
    if (title) {
      saveDoc();
      return;
    }
    closeAllModals();
    return;
  }
  const expModal = document.getElementById('modal-exp');
  if (expModal && expModal.classList.contains('open')) {
    const name = (document.getElementById('fe-name').value || '').trim();
    if (name) {
      saveExpediente();
      return;
    }
    closeAllModals();
    return;
  }
  closeAllModals();
}
