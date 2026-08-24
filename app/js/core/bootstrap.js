// PDF.js worker
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Supabase
const SUPA_URL = 'https://kjoapvkcztkhjxdzjfuw.supabase.co';
const SUPA_KEY = 'sb_publishable_nSVo9ncRoiuEdHF0feWQ-A_RXUBq2du';

function _rememberSession() {
  try {
    return localStorage.getItem('acervo_remember') !== '0';
  } catch (_) {
    return true;
  }
}

const _authStorage = {
  getItem: (k) => {
    try {
      return (_rememberSession() ? localStorage : sessionStorage).getItem(k);
    } catch (_) {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      const keep = _rememberSession();
      (keep ? localStorage : sessionStorage).setItem(k, v);
      (keep ? sessionStorage : localStorage).removeItem(k);
    } catch (_) {}
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch (_) {}
  },
};

const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storage: _authStorage },
});
window.acervoSupabase = sb;

function _setAppVH() {
  try {
    document.documentElement.style.setProperty('--appvh', `${window.innerHeight}px`);
  } catch (_) {}
}

function _setAppVHsoon() {
  _setAppVH();
  requestAnimationFrame(_setAppVH);
  setTimeout(_setAppVH, 120);
  setTimeout(_setAppVH, 400);
  setTimeout(_setAppVH, 900);
}

_setAppVHsoon();
window.addEventListener('resize', _setAppVH);
window.addEventListener('orientationchange', _setAppVHsoon);
window.addEventListener('pageshow', _setAppVHsoon);
window.addEventListener('load', _setAppVHsoon);
document.addEventListener('DOMContentLoaded', _setAppVHsoon);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', _setAppVH);
}

function _kickViewport() {
  try {
    const vp = document.querySelector('meta[name="viewport"]');
    if (!vp) return;
    const base = vp.getAttribute('content') || '';
    if (!base.includes('viewport-fit=cover')) {
      _setAppVH();
      return;
    }
    vp.setAttribute('content', base.replace('viewport-fit=cover', 'viewport-fit=contain'));
    requestAnimationFrame(() => {
      vp.setAttribute('content', base);
      _setAppVH();
    });
  } catch (_) {}
}

window.addEventListener('load', () => {
  setTimeout(_kickViewport, 200);
  setTimeout(_kickViewport, 600);
});
window.addEventListener('pageshow', () => setTimeout(_kickViewport, 120));

function showViewportDiag() {
  try {
    const old = document.getElementById('vp-diag');
    if (old) {
      old.remove();
      return;
    }
    const vv = window.visualViewport;
    const dm = window.matchMedia('(display-mode: standalone)').matches;
    const nav = 'standalone' in navigator ? navigator.standalone : 'n/a';
    const box = document.createElement('div');
    box.id = 'vp-diag';
    box.style.cssText =
      'position:fixed;left:8px;right:8px;top:calc(env(safe-area-inset-top) + 8px);z-index:99999;background:rgba(0,0,0,.9);color:#5f5;font:12px/1.55 monospace;padding:12px 14px;border-radius:10px;border:1px solid #0a0;white-space:pre-wrap;box-shadow:0 10px 30px rgba(0,0,0,.6)';
    box.textContent =
      '📐 DIAGNÓSTICO PANTALLA  (toca para cerrar)\n' +
      '¿standalone real? nav=' +
      nav +
      '  ·  display-mode=' +
      dm +
      '\n' +
      'inner:  ' +
      innerWidth +
      ' x ' +
      innerHeight +
      '\n' +
      'screen: ' +
      screen.width +
      ' x ' +
      screen.height +
      '\n' +
      'docEl:  ' +
      document.documentElement.clientWidth +
      ' x ' +
      document.documentElement.clientHeight +
      '\n' +
      'visualVP: ' +
      (vv ? `${Math.round(vv.width)} x ${Math.round(vv.height)}` : 'n/a') +
      '\n' +
      '--appvh: ' +
      (getComputedStyle(document.documentElement).getPropertyValue('--appvh') || '(sin fijar)').trim() +
      '\n' +
      'dpr: ' +
      window.devicePixelRatio;
    box.onclick = () => box.remove();
    document.body.appendChild(box);
  } catch (e) {
    try {
      alert(`diag error: ${e.message}`);
    } catch (_) {}
  }
}
