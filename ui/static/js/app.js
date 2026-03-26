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
});
