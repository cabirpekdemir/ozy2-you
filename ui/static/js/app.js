/* OZY2 — Core App */

const _loaded = new Set();

function showPanel(name) {
  // Update panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${name}`)?.classList.add('active');

  // Update sidebar nav
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.panel === name);
  });

  // Update bottom nav
  document.querySelectorAll('.bnav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.panel === name);
  });

  // Update topbar title
  const navEl = document.querySelector(`[data-panel="${name}"] span[data-i18n]`);
  const title = navEl ? (I18N.t(navEl.getAttribute('data-i18n')) || navEl.textContent) : name;
  document.getElementById('topbar-title').textContent = title;

  // Lazy load panel
  if (!_loaded.has(name)) {
    _loaded.add(name);
    loadPanel(name);
  }
}

async function loadPanel(name) {
  const el = document.getElementById(`panel-${name}`);
  if (!el) return;

  // Show spinner while loading
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  try {
    const r = await fetch(`/static/panels/${name}.js`);
    if (!r.ok) throw new Error(`Panel not found: ${name}`);
    const script = document.createElement('script');
    script.src = `/static/panels/${name}.js?v=${Date.now()}`;
    script.onload = () => {
      const initFn = window[`init_${name}`];
      if (typeof initFn === 'function') initFn(el);
    };
    document.head.appendChild(script);
  } catch {
    el.innerHTML = `
      <div class="loading-center" style="flex-direction:column;gap:8px">
        <span style="font-size:32px">🚧</span>
        <span class="text-2">${name} panel coming soon</span>
      </div>`;
  }
}

// ── Toast ──────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3000) {
  const c    = document.getElementById('toast-container');
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.transition = '0.2s ease';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

// ── Sidebar toggle (tablet) ────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('hidden');
}

// ── Inactivity auto-logout (remote access only) ───────────────
const IDLE_MS = 5 * 60 * 1000; // 5 dakika
let _idleTimer = null;

async function _checkRemoteAndStartIdle() {
  try {
    const r = await fetch('/api/auth/status');
    const d = await r.json();
    if (!d.remote_access || !d.pin_set) return; // yerel mod → timeout yok
    _resetIdleTimer();
    ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(ev =>
      document.addEventListener(ev, _resetIdleTimer, { passive: true })
    );
  } catch {}
}

function _resetIdleTimer() {
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(_idleLogout, IDLE_MS);
}

async function _idleLogout() {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
  const ov = document.createElement('div');
  ov.style.cssText = `position:fixed;inset:0;background:#080a10;z-index:9999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:-apple-system,sans-serif;color:#e8eaf2;gap:12px;`;
  ov.innerHTML = `
    <div style="font-size:44px">🔒</div>
    <div style="font-size:18px;font-weight:600">Oturum süresi doldu</div>
    <div style="font-size:13px;color:#5a6380">5 dakika hareketsizlik nedeniyle kilitlendi</div>
  `;
  document.body.appendChild(ov);
  setTimeout(() => window.location.replace('/login'), 1500);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Apply saved theme
  const theme = localStorage.getItem('ozy-theme') || 'dark';
  if (theme === 'light') document.body.classList.add('theme-light');

  // Load language
  const lang = localStorage.getItem('ozy2_lang') || 'en';
  await I18N.load(lang);

  // Show initial panel
  showPanel('chat');

  // Mobile: show sidebar toggle
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar-toggle').style.display = 'flex';
  }

  // Hareketsizlik timer'ını başlat (remote access aktifse)
  _checkRemoteAndStartIdle();
});
