function blobToB64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

function b64ToBlob(b64, type) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    arr[i] = bin.charCodeAt(i);
  }
  return new Blob([arr], { type: type || 'application/octet-stream' });
}

function _fmtBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function apunteSnippet(html) {
  const node = document.createElement('div');
  node.innerHTML = html || ''; // xss-reviewed: HTML is converted to plain text immediately for snippets
  const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
  return `${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`;
}

function fmtDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  } catch (_) {
    return '';
  }
}

function fillMarkers(tpl, map) {
  let text = tpl || '';
  Object.keys(map).forEach((key) => {
    text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), map[key] == null ? '' : map[key]);
  });
  return text;
}

function causaLabel(expediente) {
  return (expediente && (expediente.name || expediente.rit || expediente.rol)) || 'Sin caratular';
}

function escapeHtml(value) {
  return (value || '').replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[char]));
}
