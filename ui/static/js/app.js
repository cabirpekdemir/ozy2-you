/* OZY2 — Core App */

const _loaded = new Set();

// Set of allowed panels for the current package (null = all allowed)
let _allowedPanels = null;

function showPanel(name) {
  // Guard: redirect to home if panel is locked for current package
  if (_allowedPanels !== null && !_allowedPanels.has(name)) {
    if (name !== 'home') { showPanel('home'); return; }
  }

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

  // Update topbar title — use navEl.textContent (already translated by I18N._apply) first
  const navEl = document.querySelector(`[data-panel="${name}"] span[data-i18n]`);
  const title = navEl ? (navEl.textContent.trim() || I18N.t(navEl.getAttribute('data-i18n'))) : name;
  document.getElementById('topbar-title').textContent = title;

  // Persist active panel to URL hash
  if (history.replaceState) history.replaceState(null, '', '#' + name);

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

// ── Sidebar plan badge ─────────────────────────────────────────
async function loadSidebarPlanBadge() {
  try {
    const [sr, mr] = await Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]);
    const pkg = sr.settings?.package || 'you';
    const role = mr.role || 'admin';
    const plans = { you:'🧑 You', pro:'⚡ Pro', social:'🌐 Social', business:'🏢 Business', full:'✨ Full' };
    const roles = { admin:'🛡️ Admin', collaborator:'🤝 Collaborator', observer:'👁️ Observer', demo:'🚀 Demo' };
    const badge = document.getElementById('sidebar-plan-badge');
    if (!badge) return;
    document.getElementById('sidebar-plan-icon').textContent = plans[pkg]?.split(' ')[0] || '🧑';
    document.getElementById('sidebar-plan-name').textContent = (plans[pkg] || pkg).split(' ').slice(1).join(' ') || pkg;
    document.getElementById('sidebar-role-name').textContent = (roles[role] || role).split(' ').slice(1).join(' ') || role;
    badge.style.display = 'block';

    // Demo banner — query counter + nav filtering
    if (mr.is_demo) {
      _showDemoBanner(mr.query_count || 0, mr.query_limit || 10, mr.demo_name || '');
      _filterNavForDemo();
    }
  } catch {}
}

// ── Demo query counter banner ─────────────────────────────────
function _showDemoBanner(used, limit, name) {
  if (document.getElementById('demo-banner')) return; // already shown
  const left = Math.max(0, limit - used);
  const pct  = Math.min(100, Math.round((used / limit) * 100));
  const bar  = document.createElement('div');
  bar.id = 'demo-banner';
  bar.style.cssText = `
    position:fixed;bottom:0;left:0;right:0;z-index:1000;
    background:#0e1118;border-top:1px solid #1e2130;
    padding:8px 16px;display:flex;align-items:center;gap:12px;
    font-size:12px;color:#5a6380;
  `;
  bar.innerHTML = `
    <span>🚀 Demo${name ? ' · ' + name : ''}</span>
    <div style="flex:1;background:#1e2130;border-radius:999px;height:6px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:${left===0?'#f43f5e':'#4f8ef7'};border-radius:999px;transition:width .3s"></div>
    </div>
    <span style="color:${left===0?'#f43f5e':'#4f8ef7'};font-weight:600">${left} / ${limit} queries left</span>
    ${left === 0 ? '<span style="color:#f43f5e">· Limit reached</span>' : ''}
  `;
  document.body.appendChild(bar);
  // Keep bottom padding so chat doesn't hide behind banner
  document.body.style.paddingBottom = '40px';
}

// ── Package-based nav filter ──────────────────────────────────
// Fetches current package from API and hides locked nav items.
// `features: null` means full (all panels visible).
async function _applyPackageFilter() {
  try {
    const r = await fetch('/api/packages/current');
    const d = await r.json();
    if (!d.ok) return;
    const features = d.tier?.features;   // null = all panels unlocked
    if (features === null) { _allowedPanels = null; return; }
    _allowedPanels = new Set(features);
    // Hide any nav/bnav item whose data-panel is not in the allowed list.
    // data-tier="admin" items are never hidden by package filter (admin-only logic runs separately).
    document.querySelectorAll('[data-panel]').forEach(el => {
      if (el.dataset.tier === 'admin') return;
      if (!_allowedPanels.has(el.dataset.panel)) el.style.display = 'none';
    });
    // Also hide section labels that have no visible items after them
    document.querySelectorAll('.nav-section-label').forEach(label => {
      let next = label.nextElementSibling;
      let hasVisible = false;
      while (next && !next.classList.contains('nav-section-label')) {
        if (next.style.display !== 'none') { hasVisible = true; break; }
        next = next.nextElementSibling;
      }
      if (!hasVisible) label.style.display = 'none';
    });
  } catch {}
}

// ── Demo: sidebar nav filtering ──────────────────────────────
// For demo users (is_demo=true) only data-tier="you" items are shown.
function _filterNavForDemo() {
  const DEMO_TIERS = new Set(['you']);
  document.querySelectorAll('[data-tier]').forEach(el => {
    if (!DEMO_TIERS.has(el.dataset.tier)) el.style.display = 'none';
  });
}

// ── Inactivity auto-logout (remote access only) ───────────────
const IDLE_MS = 5 * 60 * 1000; // 5 minutes
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
    <div style="font-size:18px;font-weight:600">Session expired</div>
    <div style="font-size:13px;color:#5a6380">Locked due to 5 minutes of inactivity</div>
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

  // Apply package-based nav filtering (must run before showPanel)
  await _applyPackageFilter();

  // Restore panel from URL hash, or default to 'home'
  const hashPanel = location.hash.slice(1);
  showPanel(hashPanel || 'home');

  // Mobile: show sidebar toggle
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar-toggle').style.display = 'flex';
  }

  // Start inactivity timer (remote access only)
  _checkRemoteAndStartIdle();

  // Sidebar plan badge
  loadSidebarPlanBadge();
});
