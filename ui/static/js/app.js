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
    } else if (!mr.is_demo) {
      // Admin/authenticated user: always show admin-tier items
      document.querySelectorAll('[data-tier="admin"]').forEach(el => {
        el.style.display = '';
      });
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

  // Load profile and apply gender-based nav + onboarding check
  _initProfileAndOnboarding();
});

// ── Profile / Onboarding ──────────────────────────────
async function _initProfileAndOnboarding() {
  try {
    const [profileRes, meRes] = await Promise.all([
      fetch('/api/profile').then(r=>r.json()).catch(()=>({})),
      fetch('/api/auth/me').then(r=>r.json()).catch(()=>({})),
    ]);
    const profile = profileRes.profile;
    const isDemo  = meRes.is_demo || false;

    // Apply gender-based Women's Health visibility
    if (profile?.gender === 'female') {
      document.querySelectorAll('[data-panel="women"]').forEach(el => el.style.display = '');
    } else if (!profile || profile.gender !== 'female') {
      document.querySelectorAll('[data-panel="women"]').forEach(el => el.style.display = 'none');
    }

    // Show onboarding if profile not set (except for demo — optional)
    if (!profile?.onboarding_done) {
      _showOnboarding(isDemo);
    }
  } catch {}
}

// ── Ollama helper ─────────────────────────────────────
function _detectSystemSpecs() {
  const ram   = navigator.deviceMemory   || 8;   // GB (capped at 8 by browsers)
  const cores = navigator.hardwareConcurrency || 4;
  const ua    = navigator.userAgent;
  const os    = /Mac/.test(ua) ? 'mac' : /Win/.test(ua) ? 'win' : 'linux';

  let rec;
  if (ram <= 4 || cores <= 4) {
    rec = { model:'phi3:mini',    size:'2.3 GB', quality:'Fast & lightweight',  emoji:'⚡' };
  } else if (ram <= 8 || cores <= 8) {
    rec = { model:'llama3.2:3b', size:'2.0 GB', quality:'Good balance',         emoji:'🔥' };
  } else {
    rec = { model:'llama3.1:8b', size:'4.7 GB', quality:'High quality (recommended)', emoji:'🚀' };
  }

  const installCmd = {
    mac:   '→ Download from ollama.com/download',
    win:   '→ Download from ollama.com/download',
    linux: 'curl -fsSL https://ollama.com/install.sh | sh',
  }[os];

  return { ram, cores, os, rec, installCmd };
}

async function _checkOllamaRunning() {
  try {
    const r = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

function _showOnboarding(isDemo) {
  const modal = document.getElementById('onboarding-modal');
  const box   = document.getElementById('onboarding-box');
  if (!modal || !box) return;

  // step: -1=AI setup, 0=AI persona, 1-4=personal info, 5=gender, 6=blood type, 7=interests, 8=diet
  const INPUT_STEPS = [
    { emoji:'✨', q:"What's your name?",            sub:"I'd love to know who I'm talking to!", id:'ob-name',    type:'text',   placeholder:'Your name' },
    { emoji:'🎂', q:'How old are you?',             sub:'No judgment, I promise 😄',            id:'ob-age',     type:'number', placeholder:'e.g. 28' },
    { emoji:'🌍', q:'Where in the world are you?',  sub:"I love learning about different places!", id:'ob-country', type:'text', placeholder:'e.g. Turkey, USA…' },
    { emoji:'💼', q:'What do you do?',              sub:'This helps me give better advice!',    id:'ob-occ',     type:'text',   placeholder:'e.g. Designer, Student, Engineer…' },
  ];

  const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  let selBloodType = '';

  const AVATARS = ['🤖','🦊','🦉','🐬','🌟','🦋','🐱','🐺','🌙','🎭','🎨','🍀'];

  const genderOptions = ['male','female','other','prefer_not'];
  const genderLabels  = {male:'👦 Male', female:'👩 Female', other:'🌈 Other', prefer_not:'🤐 Prefer not'};
  const dietGoals = [
    {k:'lose_weight',e:'⚖️',l:'Lose weight'}, {k:'healthy',e:'🥗',l:'Healthy eating'},
    {k:'maintain',e:'⚡',l:'Maintain'},        {k:'gain_muscle',e:'💪',l:'Build muscle'},
  ];
  const interestsList = ['Technology','Science','Music','Sports','Travel','Cooking','Art',
    'Gaming','Finance','Health','Photography','Movies','Nature','History'];

  let step = -1;
  const answers = {};
  let _obAiChoice = '';
  let selGender = '';
  let selDiet = '';
  let selAvatar = '🤖';
  let selAiName = '';
  const selInterests = new Set();

  // TOTAL steps for progress bar: ai + persona + inputs + gender + blood + interests + diet
  const TOTAL = 2 + INPUT_STEPS.length + 4;

  function _pct(current) {
    const p = Math.round((current / (TOTAL - 1)) * 100);
    return `<div style="height:3px;background:var(--border,#333);border-radius:2px;margin-bottom:20px">
      <div style="width:${p}%;height:100%;background:var(--accent,#6366f1);border-radius:2px;transition:width .4s ease"></div>
    </div>`;
  }

  function render() {

    // ── STEP -1: AI Setup ─────────────────────────────────────────
    if (step === -1) {
      const specs = _detectSystemSpecs();
      box.innerHTML = `
        ${_pct(0)}
        <div style="text-align:center;margin-bottom:18px">
          <div style="font-size:3.5rem;margin-bottom:8px">👋</div>
          <h2 style="margin:0 0 6px;font-size:1.3rem;font-weight:800">Hey! I'm OZY.</h2>
          <p style="margin:0;opacity:.55;font-size:.85rem;line-height:1.5">
            Your personal AI assistant — always on, always private.<br>Let's get you set up in just a minute!
          </p>
        </div>
        <p style="text-align:center;font-size:.9rem;margin:0 0 14px;font-weight:600">First: how should my brain run?</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <button onclick="obAiChoice(this,'local')" data-ai="local"
            style="padding:20px 12px;border-radius:14px;border:2px solid ${_obAiChoice==='local'?'var(--accent,#6366f1)':'var(--border,#444)'};
                   cursor:pointer;text-align:center;font-size:.9rem;
                   background:${_obAiChoice==='local'?'rgba(99,102,241,.1)':'transparent'};color:inherit">
            <div style="font-size:2rem;margin-bottom:6px">🏠</div>
            <div style="font-weight:700;margin-bottom:4px">Local (Ollama)</div>
            <div style="font-size:.75rem;opacity:.6">100% private<br>runs on your device</div>
          </button>
          <button onclick="obAiChoice(this,'cloud')" data-ai="cloud"
            style="padding:20px 12px;border-radius:14px;border:2px solid ${_obAiChoice==='cloud'?'var(--accent,#6366f1)':'var(--border,#444)'};
                   cursor:pointer;text-align:center;font-size:.9rem;
                   background:${_obAiChoice==='cloud'?'rgba(99,102,241,.1)':'transparent'};color:inherit">
            <div style="font-size:2rem;margin-bottom:6px">☁️</div>
            <div style="font-weight:700;margin-bottom:4px">Cloud</div>
            <div style="font-size:.75rem;opacity:.6">OpenAI · Gemini<br>Anthropic (API key)</div>
          </button>
        </div>
        <div id="ob-ai-detail" style="margin-bottom:14px"></div>
        <button onclick="obNext()" style="width:100%;padding:12px;border-radius:12px;border:none;
          background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem;font-weight:600">
          Let's go! →
        </button>
        <button onclick="obSkip()" style="width:100%;margin-top:8px;background:none;border:none;
          color:inherit;opacity:.35;cursor:pointer;font-size:.8rem">Skip setup for now</button>`;
      if (_obAiChoice) _renderAiDetail(specs);

    // ── STEP 0: AI Persona — name + avatar ────────────────────────
    } else if (step === 0) {
      box.innerHTML = `
        ${_pct(1)}
        <div style="text-align:center;margin-bottom:18px">
          <div id="ob-avatar-preview" style="font-size:4rem;margin-bottom:8px;cursor:default">${selAvatar}</div>
          <h2 style="margin:0 0 6px;font-size:1.2rem;font-weight:800">Would you like to give me a name?</h2>
          <p style="margin:0;opacity:.5;font-size:.83rem">Totally optional — I'll stay "OZY" if you skip 😊</p>
        </div>
        <input id="ob-ai-name" type="text" placeholder='e.g. Max, Luna, Aria… or just leave blank'
          value="${selAiName}"
          style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--border,#444);
                 background:transparent;color:inherit;font-size:1rem;box-sizing:border-box;
                 text-align:center;margin-bottom:16px"
          onkeydown="if(event.key==='Enter') document.getElementById('ob-next').click()">
        <div style="font-size:.82rem;opacity:.5;margin-bottom:10px;text-align:center">Pick my avatar:</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:20px">
          ${AVATARS.map(a=>`
            <button onclick="obPickAvatar('${a}')" data-av="${a}"
              style="font-size:1.8rem;padding:8px;border-radius:12px;line-height:1;
                     border:2px solid ${selAvatar===a?'var(--accent,#6366f1)':'var(--border,#444)'};
                     cursor:pointer;background:${selAvatar===a?'rgba(99,102,241,.12)':'transparent'};
                     transition:all .15s">${a}</button>`).join('')}
        </div>
        <button id="ob-next" onclick="obNext()" style="width:100%;padding:12px;border-radius:12px;border:none;
          background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem;font-weight:600">
          Nice to meet you! →
        </button>
        <button onclick="obBack()" style="width:100%;margin-top:8px;background:none;border:none;
          color:inherit;opacity:.35;cursor:pointer;font-size:.8rem">← Back</button>`;
      setTimeout(() => document.getElementById('ob-ai-name')?.focus(), 100);

    // ── STEPS 1-4: Personal info ──────────────────────────────────
    } else if (step >= 1 && step <= INPUT_STEPS.length) {
      const s = INPUT_STEPS[step - 1];
      const aiLabel = selAiName || 'OZY';
      box.innerHTML = `
        ${_pct(step + 1)}
        ${isDemo ? '<div style="background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.3);border-radius:8px;padding:8px 12px;font-size:.78rem;color:#eab308;margin-bottom:14px">⚠️ Demo mode — do not enter real personal info.</div>' : ''}
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:3rem;margin-bottom:10px">${s.emoji}</div>
          <h2 style="margin:0 0 6px;font-size:1.2rem;font-weight:800">${s.q}</h2>
          <p style="margin:0;opacity:.5;font-size:.82rem">${s.sub}</p>
        </div>
        <input id="${s.id}" type="${s.type}" placeholder="${s.placeholder}"
          value="${answers[s.id]||''}"
          style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--border,#444);
                 background:transparent;color:inherit;font-size:1rem;box-sizing:border-box;text-align:center"
          onkeydown="if(event.key==='Enter') document.getElementById('ob-next').click()">
        <div style="display:flex;gap:8px;margin-top:16px">
          <button onclick="obBack()" style="flex:1;padding:11px;border-radius:12px;border:1px solid var(--border,#444);background:transparent;cursor:pointer;color:inherit">← Back</button>
          <button id="ob-next" onclick="obNext()" style="flex:2;padding:11px;border-radius:12px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem;font-weight:600">
            ${step < INPUT_STEPS.length ? 'Next →' : 'Continue →'}
          </button>
        </div>
        <button onclick="obSkip()" style="width:100%;margin-top:10px;background:none;border:none;color:inherit;opacity:.35;cursor:pointer;font-size:.82rem">Skip for now</button>`;
      setTimeout(() => document.getElementById(s.id)?.focus(), 100);

    // ── STEP gender ───────────────────────────────────────────────
    } else if (step === INPUT_STEPS.length + 1) {
      const firstName = (answers['ob-name'] || '').split(' ')[0];
      box.innerHTML = `
        ${_pct(INPUT_STEPS.length + 2)}
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:3rem;margin-bottom:10px">🧬</div>
          <h2 style="margin:0 0 6px;font-size:1.2rem;font-weight:800">What's your gender${firstName ? ', '+firstName : ''}?</h2>
          <p style="margin:0;opacity:.5;font-size:.82rem">Helps me personalize certain features for you</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${genderOptions.map(g=>`
            <button onclick="obGender(this,'${g}')" data-g="${g}"
              style="padding:14px;border-radius:12px;border:2px solid var(--border,#444);
                     cursor:pointer;font-size:.95rem;${selGender===g?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
              ${genderLabels[g]}
            </button>`).join('')}
        </div>
        <button id="ob-next" onclick="obNext()" style="width:100%;margin-top:16px;padding:12px;border-radius:12px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem;font-weight:600">Continue →</button>
        <button onclick="obBack()" style="width:100%;margin-top:8px;background:none;border:none;color:inherit;opacity:.35;cursor:pointer;font-size:.8rem">← Back</button>`;

    // ── STEP blood type ───────────────────────────────────────────
    } else if (step === INPUT_STEPS.length + 2) {
      box.innerHTML = `
        ${_pct(INPUT_STEPS.length + 3)}
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:3rem;margin-bottom:10px">🩸</div>
          <h2 style="margin:0 0 6px;font-size:1.2rem;font-weight:800">What's your blood type?</h2>
          <p style="margin:0;opacity:.5;font-size:.82rem">Helps personalize diet & health recommendations</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
          ${BLOOD_TYPES.map(bt=>`
            <button onclick="obBloodType(this,'${bt}')" data-bt="${bt}"
              style="padding:14px 8px;border-radius:12px;font-size:1rem;font-weight:700;
                     border:2px solid var(--border,#444);cursor:pointer;
                     ${selBloodType===bt?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
              ${bt}
            </button>`).join('')}
        </div>
        <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);
             border-radius:10px;padding:10px 14px;font-size:.78rem;color:rgba(239,68,68,.9);
             margin-bottom:16px;line-height:1.5">
          ⚠️ <strong>Not sure?</strong> Skip this — don't guess your blood type. Only enter it if you know it for certain.
        </div>
        <button id="ob-next" onclick="obNext()" style="width:100%;padding:12px;border-radius:12px;
          border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem;font-weight:600">
          Continue →
        </button>
        <button onclick="obBack()" style="width:100%;margin-top:8px;background:none;border:none;
          color:inherit;opacity:.35;cursor:pointer;font-size:.8rem">← Back</button>`;

    // ── STEP interests ────────────────────────────────────────────
    } else if (step === INPUT_STEPS.length + 3) {
      box.innerHTML = `
        ${_pct(INPUT_STEPS.length + 3)}
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:3rem;margin-bottom:10px">⭐</div>
          <h2 style="margin:0 0 6px;font-size:1.2rem;font-weight:800">What are you into?</h2>
          <p style="margin:0;opacity:.5;font-size:.82rem">Pick anything that fits — I'll tailor my suggestions!</p>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px">
          ${interestsList.map(i=>`
            <button onclick="obToggleInt(this,'${i}')"
              style="padding:7px 14px;border-radius:20px;border:1px solid var(--border,#444);cursor:pointer;
                     font-size:.82rem;${selInterests.has(i)?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
              ${i}
            </button>`).join('')}
        </div>
        <button onclick="obNext()" style="width:100%;padding:12px;border-radius:12px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem;font-weight:600">Continue →</button>
        <button onclick="obBack()" style="width:100%;margin-top:8px;background:none;border:none;color:inherit;opacity:.35;cursor:pointer;font-size:.8rem">← Back</button>`;

    // ── STEP diet + Finish ────────────────────────────────────────
    } else if (step === INPUT_STEPS.length + 4) {
      const aiLabel = selAiName || 'OZY';
      box.innerHTML = `
        ${_pct(TOTAL - 1)}
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:3rem;margin-bottom:10px">🥗</div>
          <h2 style="margin:0 0 6px;font-size:1.2rem;font-weight:800">Last one! What's your food goal?</h2>
          <p style="margin:0;opacity:.5;font-size:.82rem">${aiLabel} will personalize recipes and nutrition tips</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          ${dietGoals.map(d=>`
            <button onclick="obDiet(this,'${d.k}')" data-d="${d.k}"
              style="padding:16px;border-radius:12px;border:2px solid var(--border,#444);cursor:pointer;
                     text-align:center;font-size:.9rem;${selDiet===d.k?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
              <div style="font-size:1.6rem;margin-bottom:4px">${d.e}</div>${d.l}
            </button>`).join('')}
        </div>
        <button onclick="obFinish()" style="width:100%;padding:12px;border-radius:12px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem;font-weight:600">🎉 All done — let's start!</button>
        <button onclick="obBack()" style="width:100%;margin-top:8px;background:none;border:none;color:inherit;opacity:.35;cursor:pointer;font-size:.8rem">← Back</button>`;
    }
  }

  function _renderAiDetail(specs) {
    const detail = document.getElementById('ob-ai-detail');
    if (!detail) return;
    if (_obAiChoice === 'cloud') {
      detail.innerHTML = `
        <div style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:12px;padding:14px;font-size:.83rem">
          <div style="font-weight:600;margin-bottom:8px">☁️ Cloud setup</div>
          <div style="opacity:.7;line-height:1.6">
            You'll need an API key from one of:<br>
            • <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent,#6366f1)">Google Gemini</a> (free tier available)<br>
            • <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--accent,#6366f1)">OpenAI</a><br>
            • <a href="https://console.anthropic.com/" target="_blank" style="color:var(--accent,#6366f1)">Anthropic</a><br>
            Add it in Settings → AI after setup.
          </div>
        </div>`;
    } else if (_obAiChoice === 'local') {
      const osLabel = {mac:'macOS 🍎', win:'Windows 🪟', linux:'Linux 🐧'}[specs.os];
      detail.innerHTML = `
        <div style="background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);border-radius:12px;padding:14px;font-size:.83rem">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-weight:600">🏠 Local · ${osLabel}</div>
            <span style="font-size:.75rem;opacity:.5">${specs.ram >= 8 ? specs.ram+'+' : specs.ram} GB · ${specs.cores} cores</span>
          </div>
          <div style="margin-bottom:10px">
            <div style="opacity:.6;margin-bottom:4px">Recommended model:</div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(0,0,0,.2);border-radius:8px">
              <span style="font-size:1.2rem">${specs.rec.emoji}</span>
              <div>
                <div style="font-weight:700;font-family:monospace">${specs.rec.model}</div>
                <div style="font-size:.75rem;opacity:.6">${specs.rec.size} · ${specs.rec.quality}</div>
              </div>
            </div>
          </div>
          <div style="opacity:.7;margin-bottom:8px">
            <div style="margin-bottom:4px">1. Install Ollama:</div>
            ${specs.os === 'linux'
              ? `<code style="display:block;background:rgba(0,0,0,.3);padding:6px 10px;border-radius:6px;font-size:.78rem">${specs.installCmd}</code>`
              : `<a href="https://ollama.com/download" target="_blank" style="color:var(--accent,#6366f1)">ollama.com/download</a>`}
          </div>
          <div style="opacity:.7;margin-bottom:10px">
            <div style="margin-bottom:4px">2. Pull the model:</div>
            <code style="display:block;background:rgba(0,0,0,.3);padding:6px 10px;border-radius:6px;font-size:.78rem">ollama pull ${specs.rec.model}</code>
          </div>
          <button onclick="obCheckOllama('${specs.rec.model}')" id="ob-ollama-check"
            style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(34,197,94,.4);
                   background:transparent;color:inherit;cursor:pointer;font-size:.82rem">
            🔍 Check if Ollama is running
          </button>
          <div id="ob-ollama-status" style="margin-top:8px;text-align:center;font-size:.8rem"></div>
        </div>`;
    }
  }

  window.obAiChoice = function(btn, choice) {
    _obAiChoice = choice;
    document.querySelectorAll('[data-ai]').forEach(b => {
      const active = b.dataset.ai === choice;
      b.style.borderColor = active ? 'var(--accent,#6366f1)' : 'var(--border,#444)';
      b.style.background  = active ? 'rgba(99,102,241,.1)' : 'transparent';
    });
    _renderAiDetail(_detectSystemSpecs());
  };

  window.obPickAvatar = function(a) {
    selAvatar = a;
    document.querySelectorAll('[data-av]').forEach(b => {
      const active = b.dataset.av === a;
      b.style.borderColor = active ? 'var(--accent,#6366f1)' : 'var(--border,#444)';
      b.style.background  = active ? 'rgba(99,102,241,.12)' : 'transparent';
    });
    const prev = document.getElementById('ob-avatar-preview');
    if (prev) prev.textContent = a;
  };

  window.obCheckOllama = async function(model) {
    const btn = document.getElementById('ob-ollama-check');
    const status = document.getElementById('ob-ollama-status');
    if (btn) btn.textContent = '⏳ Checking…';
    const running = await _checkOllamaRunning();
    if (running) {
      if (status) status.innerHTML = `<span style="color:#22c55e">✅ Ollama is running! OZY will use <strong>${model}</strong></span>`;
      if (btn) { btn.textContent = '✓ Connected'; btn.style.borderColor='#22c55e'; btn.style.color='#22c55e'; }
    } else {
      if (status) status.innerHTML = `<span style="color:#f59e0b">⚠️ Ollama not found. Install it first, then click Check again.</span>`;
      if (btn) btn.textContent = '🔍 Check again';
    }
  };

  window.obNext = function() {
    if (step === -1) {
      if (_obAiChoice === 'local') {
        const specs = _detectSystemSpecs();
        fetch('/api/settings', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ provider: 'ollama', model: specs.rec.model }),
        }).catch(()=>{});
      }
      step = 0; render(); return;
    }
    if (step === 0) {
      selAiName = document.getElementById('ob-ai-name')?.value.trim() || '';
      step = 1; render(); return;
    }
    if (step >= 1 && step <= INPUT_STEPS.length) {
      const s = INPUT_STEPS[step - 1];
      answers[s.id] = document.getElementById(s.id)?.value.trim() || '';
    }
    step++;
    render();
  };

  window.obBack = function() {
    if (step === 0) { step = -1; }
    else { step--; }
    render();
  };

  window.obSkip = function() { modal.style.display = 'none'; };

  window.obGender = function(btn, g) {
    selGender = g;
    document.querySelectorAll('[data-g]').forEach(b => {
      const a = b.dataset.g === g;
      b.style.background  = a ? 'var(--accent,#6366f1)' : 'transparent';
      b.style.color       = a ? '#fff' : 'inherit';
      b.style.borderColor = a ? 'transparent' : 'var(--border,#444)';
    });
  };

  window.obBloodType = function(btn, bt) {
    selBloodType = bt;
    document.querySelectorAll('[data-bt]').forEach(b => {
      const a = b.dataset.bt === bt;
      b.style.background  = a ? 'var(--accent,#6366f1)' : 'transparent';
      b.style.color       = a ? '#fff' : 'inherit';
      b.style.borderColor = a ? 'transparent' : 'var(--border,#444)';
    });
  };

  window.obToggleInt = function(btn, i) {
    if (selInterests.has(i)) {
      selInterests.delete(i);
      btn.style.background = 'transparent'; btn.style.color = 'inherit'; btn.style.borderColor = 'var(--border,#444)';
    } else {
      selInterests.add(i);
      btn.style.background = 'var(--accent,#6366f1)'; btn.style.color = '#fff'; btn.style.borderColor = 'transparent';
    }
  };

  window.obDiet = function(btn, d) {
    selDiet = d;
    document.querySelectorAll('[data-d]').forEach(b => {
      const a = b.dataset.d === d;
      b.style.background  = a ? 'var(--accent,#6366f1)' : 'transparent';
      b.style.color       = a ? '#fff' : 'inherit';
      b.style.borderColor = a ? 'transparent' : 'var(--border,#444)';
    });
  };

  window.obFinish = async function() {
    const payload = {
      name:         answers['ob-name']   || '',
      age:          parseInt(answers['ob-age']) || null,
      country:      answers['ob-country'] || '',
      occupation:   answers['ob-occ']    || '',
      gender:       selGender,
      blood_type:   selBloodType,
      dietary_goal: selDiet,
      interests:    [...selInterests],
      hobbies: [], pets: [],
      onboarding_done: true,
    };
    await fetch('/api/profile', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    });
    // Save name to settings + AI persona (name, avatar)
    const settingsPayload = {};
    if (payload.name) settingsPayload.user_name = payload.name;
    if (selAiName)    settingsPayload.ai_name   = selAiName;
    if (selAvatar)    settingsPayload.ai_avatar  = selAvatar;
    if (Object.keys(settingsPayload).length) {
      await fetch('/api/settings', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(settingsPayload),
      }).catch(()=>{});
    }
    // Apply gender nav
    document.querySelectorAll('[data-panel="women"]').forEach(el => {
      el.style.display = selGender === 'female' ? '' : 'none';
    });
    modal.style.display = 'none';

    // ── Welcome toast ─────────────────────────────────────────────
    const aiLabel  = selAiName || 'OZY';
    const firstName = payload.name ? payload.name.split(' ')[0] : '';
    const userName  = firstName ? `, ${firstName}` : '';
    toast(`${selAvatar} Hey${userName}! I'm ${aiLabel} — so happy you're here! 🎉`, 'success', 4000);

    // ── Welcome speech (TTS) ──────────────────────────────────────
    // Build greeting in the app's current language
    const lang = (typeof I18N !== 'undefined' ? I18N.lang : null)
              || navigator.language?.slice(0, 2)
              || 'en';
    const _greetings = {
      tr: firstName
        ? `Merhaba ${firstName}! Ben ${aiLabel}. Seninle tanışmak gerçekten çok güzel. Seni zaten çok sevdim — ne zaman ihtiyacın olursa buradayım!`
        : `Merhaba! Ben ${aiLabel}, senin kişisel yapay zeka asistanınım. Seninle tanışmak harika — ne zaman ihtiyacın olursa buradayım!`,
      en: firstName
        ? `Hey ${firstName}! I'm ${aiLabel}, your personal AI assistant. I'm so excited to meet you! I'm here whenever you need me — let's do great things together!`
        : `Hey there! I'm ${aiLabel}, your personal AI assistant. It's so great to meet you! I'm here whenever you need me!`,
      de: firstName
        ? `Hallo ${firstName}! Ich bin ${aiLabel}, dein persönlicher KI-Assistent. Es ist wunderbar, dich kennenzulernen! Ich bin immer für dich da!`
        : `Hallo! Ich bin ${aiLabel}, dein persönlicher KI-Assistent. Schön, dich kennenzulernen!`,
      fr: firstName
        ? `Bonjour ${firstName}! Je suis ${aiLabel}, ton assistant IA personnel. Ravi de te rencontrer — je suis là quand tu as besoin de moi!`
        : `Bonjour! Je suis ${aiLabel}, ton assistant IA personnel. Enchanté de te rencontrer!`,
      es: firstName
        ? `Hola ${firstName}! Soy ${aiLabel}, tu asistente de inteligencia artificial. Es genial conocerte — aquí estaré siempre que me necesites!`
        : `Hola! Soy ${aiLabel}, tu asistente de inteligencia artificial. Es un placer conocerte!`,
      pt: firstName
        ? `Olá ${firstName}! Eu sou ${aiLabel}, o seu assistente pessoal de inteligência artificial. É muito bom te conhecer — estarei aqui sempre que precisar!`
        : `Olá! Eu sou ${aiLabel}, o seu assistente de IA pessoal. Prazer em te conhecer!`,
      it: firstName
        ? `Ciao ${firstName}! Sono ${aiLabel}, il tuo assistente personale di intelligenza artificiale. È un piacere conoscerti — sono qui ogni volta che hai bisogno!`
        : `Ciao! Sono ${aiLabel}, il tuo assistente personale di IA. Piacere di conoscerti!`,
      ja: firstName
        ? `こんにちは、${firstName}さん！私は${aiLabel}、あなたのパーソナルAIアシスタントです。出会えてとても嬉しいです！いつでもお気軽にどうぞ！`
        : `こんにちは！私は${aiLabel}、あなたのパーソナルAIアシスタントです。よろしくお願いします！`,
      zh: firstName
        ? `你好，${firstName}！我是${aiLabel}，你的个人AI助手。很高兴认识你！随时都可以来找我！`
        : `你好！我是${aiLabel}，你的个人AI助手。很高兴认识你！`,
      ar: firstName
        ? `مرحباً ${firstName}! أنا ${aiLabel}، مساعدك الذكي الشخصي. يسعدني التعرف عليك — أنا هنا كلما احتجتني!`
        : `مرحباً! أنا ${aiLabel}، مساعدك الذكي الشخصي. يسعدني التعرف عليك!`,
    };
    const speechText = _greetings[lang] || _greetings['en'];

    // Call TTS — non-blocking, silently skip if TTS is off or unavailable
    (async () => {
      try {
        const r = await fetch('/api/tts/speak', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ text: speechText }),
        });
        if (!r.ok) return;
        const blob = await r.blob();
        if (!blob.size) return;
        const url  = URL.createObjectURL(blob);
        const aud  = new Audio(url);
        aud.play().catch(() => {});
        aud.onended = () => URL.revokeObjectURL(url);
      } catch(_e) { /* TTS unavailable — skip silently */ }
    })();
  };

  modal.style.display = 'flex';
  render();
}

// ── Camera (edu-style: getUserMedia called directly in button click) ──
let _cameraStream   = null;
let _cameraCallback = null;
let _camReady       = false;   // listeners attached once

function _initCameraListeners() {
  if (_camReady) return;
  _camReady = true;

  const modal       = document.getElementById('camera-modal');
  const startScreen = document.getElementById('cam-start-screen');
  const video       = document.getElementById('camera-video');
  const liveCtrl    = document.getElementById('cam-live-controls');
  const startBtn    = document.getElementById('cam-start-btn');
  const galleryInp  = document.getElementById('cam-gallery-input');
  const captureBtn  = document.getElementById('cam-capture-btn');
  const cancelBtn   = document.getElementById('cam-cancel-btn');
  const closeBtn    = document.getElementById('cam-close-btn');
  const canvas      = document.getElementById('camera-canvas');

  // ▶ Start Camera — getUserMedia is called DIRECTLY in this click handler
  // (guaranteed user-gesture context → Chrome always shows the permission popup)
  startBtn.addEventListener('click', async function () {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // On mobile: close modal and open native camera via <input capture>
      cameraClose();
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.setAttribute('capture', 'environment');
      inp.onchange = () => {
        const file = inp.files?.[0];
        if (file && _cameraCallback) compressFileToBase64(file, _cameraCallback);
      };
      inp.click();
      return;
    }

    startBtn.textContent = '⏳ Starting…';
    startBtn.disabled = true;
    try {
      _cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      video.srcObject = _cameraStream;
      startScreen.style.display = 'none';
      video.style.display       = 'block';
      liveCtrl.style.display    = 'flex';
    } catch (err) {
      startBtn.textContent = '▶ Start Camera';
      startBtn.disabled = false;
      if (err.name === 'NotAllowedError') {
        startBtn.style.display = 'none';
        _camShowDenied(startScreen);
      } else {
        startScreen.querySelectorAll('.cam-msg').forEach(e => e.remove());
        const msg = document.createElement('div');
        msg.className = 'cam-msg';
        msg.style.cssText = 'margin-top:12px;color:#f87171;font-size:.9rem;text-align:center;max-width:300px';
        msg.textContent = '⚠️ No camera found or camera is in use by another app.';
        startScreen.appendChild(msg);
        setTimeout(() => msg.remove(), 6000);
      }
    }
  });

  // 📷 Capture
  captureBtn.addEventListener('click', function () {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const b64 = canvas.toDataURL('image/jpeg', 0.78);
    cameraClose();
    if (_cameraCallback) _cameraCallback(b64);   // single-arg, matching all panel callbacks
  });

  // 🖼️ Gallery file picker
  galleryInp.addEventListener('change', function () {
    const file = this.files?.[0];
    if (file && _cameraCallback) {
      compressFileToBase64(file, _cameraCallback);
      cameraClose();
    }
    this.value = '';
  });

  // Cancel / Close buttons
  cancelBtn.addEventListener('click', cameraClose);
  closeBtn.addEventListener('click',  cameraClose);

  // Click dark backdrop to dismiss
  modal.addEventListener('click', function (e) {
    if (e.target === modal) cameraClose();
  });
}

function _camShowDenied(startScreen) {
  startScreen.querySelectorAll('.cam-msg').forEach(e => e.remove());
  const msg = document.createElement('div');
  msg.className = 'cam-msg';
  msg.style.cssText = 'margin-top:14px;text-align:center;max-width:320px;line-height:1.6';
  msg.innerHTML = `
    <div style="color:#f87171;font-size:.9rem;margin-bottom:12px">
      🔒 Camera access is blocked for this site.
    </div>
    <div style="color:#aaa;font-size:.82rem;margin-bottom:14px">
      Click the <strong style="color:#fff">🔒</strong> icon in the address bar
      → <strong style="color:#fff">Camera</strong>
      → change to <strong style="color:#fff">Allow</strong>
      → then reload.
    </div>
    <button onclick="location.reload()"
      style="padding:9px 22px;border-radius:50px;border:none;
             background:var(--accent,#6366f1);color:#fff;font-size:.9rem;
             font-weight:600;cursor:pointer">🔄 Reload page</button>`;
  startScreen.appendChild(msg);
}

async function cameraOpen(callback) {
  _cameraCallback = callback;
  _initCameraListeners();

  const modal       = document.getElementById('camera-modal');
  const startScreen = document.getElementById('cam-start-screen');
  const video       = document.getElementById('camera-video');
  const liveCtrl    = document.getElementById('cam-live-controls');
  const startBtn    = document.getElementById('cam-start-btn');

  // Stop any running stream first
  if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }

  // Reset UI
  startScreen.style.display = 'flex';
  video.style.display       = 'none';
  liveCtrl.style.display    = 'none';
  startBtn.textContent      = '▶ Start Camera';
  startBtn.disabled         = false;
  startScreen.querySelectorAll('.cam-msg').forEach(e => e.remove());

  modal.style.display = 'flex';

  // Check permission state BEFORE showing anything
  // granted  → skip "Start Camera", open camera directly
  // denied   → skip "Start Camera", show guide immediately
  // prompt   → show "Start Camera" button (default path)
  if (navigator.permissions) {
    try {
      const perm = await navigator.permissions.query({ name: 'camera' });
      if (perm.state === 'denied') {
        startBtn.style.display = 'none';
        _camShowDenied(startScreen);
        return;
      }
      if (perm.state === 'granted') {
        // Already allowed — start immediately (no button click needed)
        startBtn.textContent = '⏳ Starting…';
        startBtn.disabled = true;
        try {
          _cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
          video.srcObject = _cameraStream;
          startScreen.style.display = 'none';
          video.style.display       = 'block';
          liveCtrl.style.display    = 'flex';
        } catch {
          startBtn.textContent = '▶ Start Camera';
          startBtn.disabled = false;
        }
        return;
      }
    } catch { /* permissions API not supported — fall through */ }
  }
  // state === 'prompt': show "Start Camera" button, user gesture needed
  startBtn.style.display = '';
}

function cameraClose() {
  if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }
  document.getElementById('camera-modal').style.display = 'none';
}

// Shared photo compressor (used by baby + daily panels)
function compressFileToBase64(file, callback) {
  const canvas = document.createElement('canvas');
  const img    = new Image();
  const reader = new FileReader();
  reader.onload = e => {
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h*MAX/w); w = MAX; }
        else       { w = Math.round(w*MAX/h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
