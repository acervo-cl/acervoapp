const GOLD_HEX = '#c9a84c';

function goldifyEl(root) {
  if (root) ungoldEl(root);
}

function richSync() {
  const r = document.getElementById('fd-rich');
  const t = document.getElementById('fd-content');
  if (r && t) t.value = r.innerHTML;
}

function richLoad() {
  const r = document.getElementById('fd-rich');
  const t = document.getElementById('fd-content');
  if (!r || !t) return;
  let v = (t.value || '').trim();
  if (v && !looksLikeHtml(v)) {
    v = v.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }
  r.innerHTML = v;
  goldifyEl(r);
  richSync();
}

function sanitizePasted(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('script,style,meta,link,title,svg,img').forEach((e) => e.remove());
  tmp.querySelectorAll('*').forEach((el) => {
    const fw = (el.style && el.style.fontWeight) || '';
    const isBold = el.tagName === 'B'
      || el.tagName === 'STRONG'
      || fw === 'bold'
      || fw === 'bolder'
      || (parseInt(fw, 10) || 0) >= 600;
    ['style', 'class', 'color', 'face', 'bgcolor', 'align', 'width', 'height'].forEach((at) => el.removeAttribute(at));
    if (isBold) el.classList.add('gold-bold');
  });
  tmp.querySelectorAll('font').forEach((f) => {
    const s = document.createElement('span');
    if (f.classList.contains('gold-bold')) s.className = 'gold-bold';
    s.innerHTML = f.innerHTML;
    f.replaceWith(s);
  });
  return tmp.innerHTML;
}

function isHighlighted() {
  const s = window.getSelection();
  if (!s || !s.rangeCount) return false;
  let n = s.anchorNode;
  if (n && n.nodeType === 3) n = n.parentElement;
  if (!n || n.id === 'fd-rich') return false;
  const bg = getComputedStyle(n).backgroundColor;
  return !!bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
}

let editorInited = false;

function initEditor() {
  if (editorInited) return;
  editorInited = true;
  const tb = document.getElementById('rte-toolbar');
  const r = document.getElementById('fd-rich');
  if (!tb || !r) return;
  const css = () => {
    try {
      document.execCommand('styleWithCSS', false, true);
    } catch (e) {}
  };
  css();
  let savedRange = null;
  document.addEventListener('selectionchange', () => {
    const s = window.getSelection();
    if (s && s.rangeCount) {
      const rg = s.getRangeAt(0);
      if (r.contains(rg.startContainer)) savedRange = rg.cloneRange();
    }
  });
  const restoreSel = () => {
    r.focus();
    if (savedRange) {
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(savedRange);
    }
  };
  const run = (cmd, val) => {
    css();
    document.execCommand(cmd, false, val || null);
    richSync();
    r.focus();
  };
  const runSel = (cmd, val) => {
    restoreSel();
    css();
    document.execCommand(cmd, false, val || null);
    richSync();
  };
  tb.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) e.preventDefault();
  });
  tb.querySelectorAll('button[data-cmd]').forEach((b) => {
    b.onclick = () => run(b.dataset.cmd);
  });
  tb.querySelectorAll('button[data-block]').forEach((b) => {
    b.onclick = () => run('formatBlock', `<${b.dataset.block}>`);
  });
  tb.querySelectorAll('button[data-color]').forEach((b) => {
    b.onclick = () => run('foreColor', b.dataset.color);
  });
  const gb = tb.querySelector('button[data-gold]');
  if (gb) gb.onclick = () => run('foreColor', GOLD_HEX);
  const hb = tb.querySelector('button[data-hilite]');
  if (hb) hb.onclick = () => run('hiliteColor', isHighlighted() ? 'transparent' : '#6e5e22');
  const cf = document.getElementById('rte-clearfmt');
  if (cf) {
    cf.onclick = () => {
      css();
      document.execCommand('removeFormat');
      document.execCommand('hiliteColor', false, 'transparent');
      richSync();
      r.focus();
    };
  }
  const col = document.getElementById('rte-color');
  if (col) col.addEventListener('input', () => runSel('foreColor', col.value));
  const rf = document.getElementById('rte-font');
  if (rf) {
    rf.addEventListener('change', () => {
      runSel('fontName', rf.value || "'Segoe UI', system-ui, sans-serif");
    });
  }
  r.addEventListener('paste', (e) => {
    e.preventDefault();
    const cb = e.clipboardData || window.clipboardData;
    if (!cb) return;
    const html = cb.getData('text/html');
    css();
    if (html) {
      document.execCommand('insertHTML', false, sanitizePasted(html));
    } else {
      document.execCommand('insertText', false, cb.getData('text/plain'));
    }
    setTimeout(() => {
      goldifyEl(r);
      richSync();
    }, 0);
  });
  r.addEventListener('input', richSync);
  r.addEventListener('blur', () => {
    goldifyEl(r);
    richSync();
  });
}
