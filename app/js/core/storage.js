let _db = null;

function idb() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open('kmic_files', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files');
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('files', 'readonly').objectStore('files').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key) {
  const db = await idb();
  return new Promise((resolve) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').delete(key);
    tx.oncomplete = resolve;
  });
}

const FILE_BUCKET = 'acervo-files';

function _fileOwner() {
  return STATE.viewingUid || STATE.uid || null;
}

function cloudFilePath(id) {
  const uid = _fileOwner();
  return uid ? `${uid}/${id}` : null;
}

function _hasStorage() {
  return typeof sb !== 'undefined' && sb && sb.storage;
}

async function putFileBlob(id, blob) {
  try {
    await idbPut(id, blob);
  } catch (_) {}
  const path = cloudFilePath(id);
  if (path && _hasStorage()) {
    try {
      const { error } = await sb.storage.from(FILE_BUCKET).upload(path, blob, {
        upsert: true,
        contentType: (blob && blob.type) || 'application/octet-stream',
      });
      if (error) throw error;
    } catch (_) {
      toast('Archivo guardado en el equipo; no se pudo subir a la nube', 'error');
    }
  }
}

async function getFileBlob(id) {
  let blob = null;
  try {
    blob = await idbGet(id);
  } catch (_) {}
  if (blob) return blob;
  const path = cloudFilePath(id);
  if (path && _hasStorage()) {
    try {
      const { data, error } = await sb.storage.from(FILE_BUCKET).download(path);
      if (!error && data) {
        try {
          await idbPut(id, data);
        } catch (_) {}
        return data;
      }
    } catch (_) {}
  }
  const causePath = _causaPathForDoc(id);
  if (causePath && _hasStorage()) {
    try {
      const { data, error } = await sb.storage.from(FILE_BUCKET).download(causePath);
      if (!error && data) {
        try {
          await idbPut(id, data);
        } catch (_) {}
        return data;
      }
    } catch (_) {}
  }
  if (typeof _sharedDocIds !== 'undefined' && _sharedDocIds.has(id) && _hasStorage()) {
    try {
      const { data, error } = await sb.storage.from(FILE_BUCKET).download(`doc/${id}/${id}`);
      if (!error && data) {
        try {
          await idbPut(id, data);
        } catch (_) {}
        return data;
      }
    } catch (_) {}
  }
  const baseDoc = typeof DOCUMENTS !== 'undefined' ? DOCUMENTS.find((x) => x.id === id) : null;
  if (baseDoc && baseDoc.baseLib && _hasStorage()) {
    try {
      const { data, error } = await sb.storage.from(FILE_BUCKET).download(`base/${id}`);
      if (!error && data) {
        try {
          await idbPut(id, data);
        } catch (_) {}
        return data;
      }
    } catch (_) {}
  }
  return null;
}

function _causaPathForDoc(id) {
  try {
    const doc = typeof EXDOCS !== 'undefined' ? EXDOCS.find((d) => d.id === id) : null;
    if (
      doc &&
      doc.expediente &&
      (doc.shared || (typeof _sharedCausaIds !== 'undefined' && _sharedCausaIds.has(doc.expediente)))
    ) {
      return `causa/${doc.expediente}/${id}`;
    }
  } catch (_) {}
  return null;
}

async function pushCausaFiles(causaId, onlyId) {
  if (!_hasStorage()) return;
  const docs = EXDOCS.filter((x) => x.expediente === causaId && x.hasFile && (!onlyId || x.id === onlyId));
  for (const doc of docs) {
    let blob = null;
    try {
      blob = await idbGet(doc.id);
    } catch (_) {}
    if (!blob) {
      try {
        const path = cloudFilePath(doc.id);
        if (path) {
          const { data } = await sb.storage.from(FILE_BUCKET).download(path);
          blob = data;
        }
      } catch (_) {}
    }
    if (!blob) continue;
    try {
      await sb.storage.from(FILE_BUCKET).upload(`causa/${causaId}/${doc.id}`, blob, {
        upsert: true,
        contentType: blob.type || 'application/octet-stream',
      });
    } catch (_) {}
  }
}

async function delFileBlob(id) {
  try {
    await idbDel(id);
  } catch (_) {}
  const path = cloudFilePath(id);
  if (path && _hasStorage()) {
    try {
      await sb.storage.from(FILE_BUCKET).remove([path]);
    } catch (_) {}
  }
}

async function compressIfImage(file) {
  try {
    const type = ((file && file.type) || '').toLowerCase();
    if (!type.startsWith('image/') || type.includes('gif')) return file;
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return file;
    const max = 1800;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (blob && blob.size < file.size) {
      const name = `${(file.name || 'imagen').replace(/\.[^.]+$/, '')}.webp`;
      const out = new File([blob], name, { type: 'image/webp' });
      const saved = Math.round((1 - out.size / file.size) * 100);
      if (saved >= 5) {
        toast(`Imagen optimizada −${saved}% (${fmtBytes(file.size)}→${fmtBytes(out.size)})`, 'success');
      }
      return out;
    }
    return file;
  } catch (_) {
    return file;
  }
}

let _backfillDone = false;

async function backfillFilesToCloud() {
  if (_backfillDone || !STATE.uid || !_hasStorage()) return;
  _backfillDone = true;
  try {
    const uid = STATE.uid;
    const cloud = new Set();
    let offset = 0;
    while (true) {
      const { data, error } = await sb.storage.from(FILE_BUCKET).list(uid, { limit: 1000, offset });
      if (error || !data) break;
      data.forEach((obj) => cloud.add(obj.name));
      if (data.length < 1000) break;
      offset += data.length;
    }
    for (const doc of DOCUMENTS) {
      if (!doc.hasFile || cloud.has(doc.id)) continue;
      let blob = null;
      try {
        blob = await idbGet(doc.id);
      } catch (_) {}
      if (!blob) continue;
      try {
        await sb.storage.from(FILE_BUCKET).upload(`${uid}/${doc.id}`, blob, {
          upsert: false,
          contentType: blob.type || 'application/octet-stream',
        });
      } catch (_) {}
    }
  } catch (_) {}
}
