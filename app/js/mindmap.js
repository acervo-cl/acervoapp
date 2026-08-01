const CKEY = '__center__';

function mmDims() { const vp = document.getElementById('mm-viewport'); const r = vp ? vp.getBoundingClientRect() : { width: 900, height: 560 }; return { w: r.width || 900, h: r.height || 560 }; }
function inBounds(p, w, h) { return p && p.x >= 4 && p.x <= w - 4 && p.y >= 4 && p.y <= h - 4; }

function layoutPositions(force) {
  const { w, h } = mmDims(), cx = w / 2, cy = h / 2;
  if (force || !inBounds(mmPos[CKEY], w, h)) mmPos[CKEY] = { x: cx, y: cy };
  const R = Math.max(150, Math.min(w, h) * 0.34), n = SUBJECTS.length || 1;
  SUBJECTS.forEach((s, i) => {
    if (force || !inBounds(mmPos[s.id], w, h)) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      mmPos[s.id] = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
    }
  });
}

function ensureDocPos(subId, force) {
  const { w, h } = mmDims();
  const sp = mmPos[subId] || { x: w / 2, y: h / 2 };
  const docs = DOCUMENTS.filter(d => d.subject === subId);
  const rr = Math.max(95, Math.min(w, h) * 0.17);
  docs.forEach((d, j) => {
    if (!force && inBounds(mmPos[d.id], w, h)) return;
    const a = (j / Math.max(1, docs.length)) * Math.PI * 2 + 0.5;
    mmPos[d.id] = { x: Math.max(6, Math.min(w - 6, sp.x + Math.cos(a) * rr)), y: Math.max(6, Math.min(h - 6, sp.y + Math.sin(a) * rr)) };
  });
}

function renderMindmap() {
  renderMmMobileList();
  layoutPositions(false);
  const nodes = document.getElementById('mindmap-nodes'); if (!nodes) return;
  let html = '';
  SUBJECTS.forEach(s => {
    const p = mmPos[s.id];
    const cls = s.progress === 100 ? 'node-done' : s.progress > 0 ? 'node-progress' : 'node-pending';
    const bcls = s.progress === 100 ? 'badge-done' : s.progress > 0 ? 'badge-progress' : 'badge-pending';
    const count = DOCUMENTS.filter(d => d.subject === s.id).length;
    const exp = STATE.mmExpanded.has(s.id);
    const caret = count ? `<span style="opacity:.65;font-size:10px"> ${exp ? '▼' : '▶'}${count}</span>` : '';
    html += `<div class="mindmap-node ${cls}" data-id="${s.id}" data-kind="subject" style="left:${p.x}px;top:${p.y}px">${s.icon} ${s.name}${caret}<div><span class="node-badge ${bcls}">${s.progress}%</span></div></div>`;
    if (exp) {
      ensureDocPos(s.id, false);
      DOCUMENTS.filter(d => d.subject === s.id).forEach(d => {
        const dp = mmPos[d.id];
        const dcls = d.status === 'done' ? 'done' : d.status === 'progress' ? 'progress' : 'pending';
        html += `<div class="mm-doc ${dcls}" data-id="${d.id}" data-kind="doc" style="left:${dp.x}px;top:${dp.y}px">📄 ${d.title}</div>`;
      });
    }
  });
  nodes.innerHTML = html;
  nodes.querySelectorAll('[data-kind]').forEach(el => el.addEventListener('mousedown', e => startItemDrag(e, el.dataset.id, el.dataset.kind)));
  const c = document.getElementById('mm-center');
  if (c) { const cp = mmPos[CKEY]; c.style.left = cp.x + 'px'; c.style.top = cp.y + 'px'; c.innerHTML = `${centerLabel}<small>${SUBJECTS.length} áreas · ${DOCUMENTS.length} documentos</small>`; }
  drawLines();
}

function drawLines() {
  const svg = document.getElementById('mm-svg'); if (!svg) return;
  const cp = mmPos[CKEY] || { x: 0, y: 0 };
  let s = '';
  SUBJECTS.forEach(sub => {
    const p = mmPos[sub.id]; if (!p) return;
    s += `<line class="mm-line" x1="${cp.x}" y1="${cp.y}" x2="${p.x}" y2="${p.y}"></line>`;
    if (STATE.mmExpanded.has(sub.id)) {
      DOCUMENTS.filter(d => d.subject === sub.id).forEach(d => { const dp = mmPos[d.id]; if (!dp) return; s += `<line class="mm-line mm-line-doc" x1="${p.x}" y1="${p.y}" x2="${dp.x}" y2="${dp.y}"></line>`; });
    }
  });
  svg.innerHTML = s;
}

function toggleSubjectExpand(id) {
  if (STATE.mmExpanded.has(id)) STATE.mmExpanded.delete(id);
  else { STATE.mmExpanded.add(id); ensureDocPos(id, false); }
  renderMindmap(); saveState();
}

function reorganizeMap() {
  layoutPositions(true);
  SUBJECTS.forEach(s => { if (STATE.mmExpanded.has(s.id)) ensureDocPos(s.id, true); });
  renderMindmap(); saveState(); toast('Mapa reorganizado');
}

let nodeDrag = null;
function startItemDrag(e, id, kind) {
  e.stopPropagation();
  const key = kind === 'center' ? CKEY : id;
  if (!mmPos[key]) mmPos[key] = { x: 60, y: 60 };
  nodeDrag = { key, kind, id, sx: e.clientX, sy: e.clientY, ox: mmPos[key].x, oy: mmPos[key].y, moved: false };
}

document.addEventListener('mousemove', e => {
  if (!nodeDrag) return;
  const { w, h } = mmDims();
  const dx = e.clientX - nodeDrag.sx, dy = e.clientY - nodeDrag.sy;
  if (Math.abs(dx) + Math.abs(dy) > 4) nodeDrag.moved = true;
  mmPos[nodeDrag.key] = { x: Math.max(0, Math.min(w, nodeDrag.ox + dx)), y: Math.max(0, Math.min(h, nodeDrag.oy + dy)) };
  const sel = nodeDrag.kind === 'center' ? document.getElementById('mm-center') : document.querySelector(`[data-id="${nodeDrag.id}"][data-kind="${nodeDrag.kind}"]`);
  if (sel) { sel.style.left = mmPos[nodeDrag.key].x + 'px'; sel.style.top = mmPos[nodeDrag.key].y + 'px'; }
  drawLines();
});

document.addEventListener('mouseup', () => {
  if (!nodeDrag) return;
  if (!nodeDrag.moved) {
    if (nodeDrag.kind === 'subject') toggleSubjectExpand(nodeDrag.id);
    else if (nodeDrag.kind === 'doc') openReader(nodeDrag.id);
  } else saveState();
  nodeDrag = null;
});

function editCenterLabel() {
  const v = prompt('Nombre del centro de tu mapa:', centerLabel);
  if (v !== null && v.trim()) { centerLabel = v.trim().toUpperCase(); renderMindmap(); saveState(); }
}
