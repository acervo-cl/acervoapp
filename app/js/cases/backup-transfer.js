async function resetData() {
  if (STATE.viewingUid) { toast('Estás viendo otra biblioteca; vuelve a la tuya primero', 'error'); return; }
  if (!confirm('¿Restaurar la biblioteca a los datos originales? Se perderán tus cambios (también en la nube).')) return;
  localStorage.removeItem('kmic_data');
  try { await idbDel('kmic_data'); } catch (e) {}
  if (STATE.uid) {
    try { await sb.from('acervo_state').delete().eq('user_id', STATE.uid); } catch (e) {}
  }
  location.reload();
}

async function exportBackup() {
  closeAvatarMenu();
  toast('Preparando backup…');
  const data = _statePayload();
  const files = {};
  for (const d of DOCUMENTS) {
    if (d.hasFile) {
      const blob = await getFileBlob(d.id);
      if (blob) {
        files[d.id] = { name: d.fileName, type: blob.type, b64: await blobToB64(blob) };
      }
    }
  }
  const out = { kmic: true, version: 2, exportedAt: new Date().toISOString(), data, files };
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kmic-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup descargado', 'success');
}

function importBackup() {
  closeAvatarMenu();
  document.getElementById('import-file').click();
}

async function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const obj = JSON.parse(await file.text());
    if (!obj.kmic) { toast('Archivo de backup no válido', 'error'); return; }
    if (!confirm('Esto reemplazará toda tu biblioteca actual (y la de la nube si tienes sesión). ¿Continuar?')) return;
    const data = obj.data || {};
    await idbPut('kmic_data', data);
    try { localStorage.setItem('kmic_data', JSON.stringify(data)); } catch (e) {}
    if (obj.files) {
      for (const id in obj.files) {
        const f = obj.files[id];
        await putFileBlob(id, b64ToBlob(f.b64, f.type));
      }
    }
    if (STATE.uid && typeof sb !== 'undefined' && sb) {
      try {
        const { error } = await sb.from('acervo_state').upsert({ user_id: STATE.uid, data, updated_at: new Date().toISOString() });
        if (error) { toast('Importado local, pero no se pudo subir a la nube: ' + error.message, 'error'); }
      } catch (err) {
        toast('Importado local; sin conexión a la nube', 'error');
      }
    }
    toast('Backup importado, recargando…', 'success');
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    toast('Error al importar: ' + (err.message || err), 'error');
  } finally {
    e.target.value = '';
  }
}
