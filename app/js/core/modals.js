function openModal(id) {
  closeAllModals();
  document.getElementById(id).classList.add('open');
  document.getElementById('modal-backdrop').classList.add('open');
  document.body.classList.add('modal-open');
  if (id === 'modal-doc') _makeModalWindow(id);
}

function _makeModalWindow(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (isMobile()) {
    modal.classList.remove('win-mode');
    modal.style.left = '';
    modal.style.top = '';
    modal.style.width = '';
    modal.style.height = '';
    return;
  }
  modal.classList.add('win-mode');
  requestAnimationFrame(() => {
    const width = modal.offsetWidth || 560;
    const height = modal.offsetHeight || 400;
    if (!modal.style.left) modal.style.left = `${Math.max(8, Math.round((window.innerWidth - width) / 2))}px`;
    if (!modal.style.top) modal.style.top = `${Math.max(8, Math.round((window.innerHeight - height) / 2))}px`;
  });
  const title = modal.querySelector('.modal-title');
  if (title && !title._winDrag) {
    title._winDrag = true;
    title.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button,input,a,select,textarea')) return;
      e.preventDefault();
      const rect = modal.getBoundingClientRect();
      const sx = e.clientX;
      const sy = e.clientY;
      const ox = rect.left;
      const oy = rect.top;
      try {
        title.setPointerCapture(e.pointerId);
      } catch (_) {}
      const mv = (ev) => {
        modal.style.left = `${Math.max(0, Math.min(ox + (ev.clientX - sx), window.innerWidth - 80))}px`;
        modal.style.top = `${Math.max(0, Math.min(oy + (ev.clientY - sy), window.innerHeight - 40))}px`;
      };
      const up = () => {
        document.removeEventListener('pointermove', mv);
        document.removeEventListener('pointerup', up);
      };
      document.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
    });
  }
}

function toggleFS(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.toggle('fullscreen');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.classList.remove('open');
    modal.classList.remove('fullscreen');
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
