// ── SUBJECT ──
function openAddSubject() {
  STATE.editingSubjectId = null;
  document.getElementById('modal-subject-title').textContent = 'Nueva Carpeta';
  document.getElementById('fs-name').value='';
  document.getElementById('fs-icon').value='';
  document.getElementById('fs-color').value='#6366F1';
  document.getElementById('fs-desc').value='';
  openModal('modal-subject');
}

function openEditSubject(id) {
  const s = SUBJECTS.find(x=>x.id===id);
  if(!s) return;
  STATE.editingSubjectId = id;
  document.getElementById('modal-subject-title').textContent = 'Editar Carpeta';
  document.getElementById('fs-name').value=s.name;
  document.getElementById('fs-icon').value=s.icon;
  document.getElementById('fs-color').value=s.color;
  document.getElementById('fs-desc').value=s.desc;
  openModal('modal-subject');
}

function saveSubject() {
  const name = document.getElementById('fs-name').value.trim();
  if(!name){toast('El nombre es obligatorio','error');return;}
  const icon = document.getElementById('fs-icon').value || '📚';
  const color = document.getElementById('fs-color').value || '#6366F1';
  const desc = document.getElementById('fs-desc').value.trim();
  if (STATE.editingSubjectId) {
    const s = SUBJECTS.find(x=>x.id===STATE.editingSubjectId);
    if(s){ s.name=name; s.icon=icon; s.color=color; s.desc=desc; }
    toast('Carpeta actualizada','success');
  } else {
    SUBJECTS.push({id:'subj'+Date.now(), name, icon, color, progress:0, desc});
    toast('Carpeta creada','success');
  }
  closeAllModals();
  saveState();
  buildSearchIndex();
  renderAll();
}

// ── DELETE ──
function confirmDelete(type, id) {
  STATE.pendingDeleteId = id;
  STATE.pendingDeleteType = type;
  const name = type==='doc' ? DOCUMENTS.find(x=>x.id===id)?.title : SUBJECTS.find(x=>x.id===id)?.name;
  document.getElementById('confirm-title').textContent = `¿Eliminar "${name}"?`;
  if (type==='subject') {
    const n = DOCUMENTS.filter(d=>d.subject===id).length;
    document.getElementById('confirm-body').textContent = n ? `Se eliminará la carpeta y sus ${n} documento(s), incluidos sus archivos. No se puede deshacer.` : 'Se eliminará esta carpeta vacía. No se puede deshacer.';
  } else {
    document.getElementById('confirm-body').textContent = 'Esta acción eliminará el elemento permanentemente.';
  }
  document.getElementById('confirm-ok-btn').onclick = executeDelete;
  openModal('modal-confirm');
}
async function executeDelete() {
  if (STATE.pendingDeleteType==='doc') {
    const did = STATE.pendingDeleteId;
    const doc = DOCUMENTS.find(x=>x.id===did);
    if(doc && doc.baseLib){            // biblioteca base del admin → solo se OCULTA de MI vista (no borra el original)
      _removeBookFromLib(doc);
      closeAllModals(); saveState(); buildSearchIndex(); renderAll();
      if(openFolderSubject) openFolderDocs(openFolderSubject);
      toast('Quitado de tu biblioteca'); return;
    }
    if(doc && doc.shared){            // libro que un colega me compartió → quitarlo de la nube (mi acceso)
      await unshareBookFromCloud(did);
      const ix=DOCUMENTS.findIndex(x=>x.id===did); if(ix>=0) DOCUMENTS.splice(ix,1);
      closeAllModals(); await loadSharedBooks(); buildSearchIndex(); renderAll();
      if(openFolderSubject) openFolderDocs(openFolderSubject);
      toast('Libro compartido eliminado'); return;
    }
    // A la papelera (recuperable): el libro con su orden/posición. El archivo (blob) se conserva.
    if(doc) _removeBookFromLib(doc);
    toast('Documento movido a la papelera 🗑');
  } else if (STATE.pendingDeleteType==='subject') {
    const sid = STATE.pendingDeleteId;
    DOCUMENTS.filter(d=>d.subject===sid).forEach(d => {
      delFileBlob(d.id);
      STATE.docOrder = STATE.docOrder.filter(x=>x!==d.id);
      delete mmPos[d.id];
      delete STATE.bookPos[d.id];
    });
    for(let i=DOCUMENTS.length-1;i>=0;i--) if(DOCUMENTS[i].subject===sid) DOCUMENTS.splice(i,1);
    const si = SUBJECTS.findIndex(x=>x.id===sid); if(si>=0) SUBJECTS.splice(si,1);
    delete mmPos[sid]; STATE.mmExpanded.delete(sid);
    if(openFolderSubject===sid){ openFolderSubject=null; document.getElementById('folder-docs-section').innerHTML=''; }
    toast('Carpeta y sus documentos eliminados');
  }
  closeAllModals();
  saveState();
  buildSearchIndex();
  renderAll();
  if(openFolderSubject) openFolderDocs(openFolderSubject);
}


