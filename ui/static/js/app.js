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

function _showOnboarding(isDemo) {
  const modal = document.getElementById('onboarding-modal');
  const box   = document.getElementById('onboarding-box');
  if (!modal || !box) return;

  const STEPS = [
    { emoji:'👋', q:'What\'s your name?', id:'ob-name', type:'text', placeholder:'Your name' },
    { emoji:'🎂', q:'How old are you?', id:'ob-age', type:'number', placeholder:'e.g. 28' },
    { emoji:'🌍', q:'Where are you from?', id:'ob-country', type:'text', placeholder:'e.g. Turkey' },
    { emoji:'💼', q:'What do you do?', id:'ob-occ', type:'text', placeholder:'e.g. Designer, Student, Doctor…' },
  ];

  let step = 0;
  const answers = {};

  const genderOptions = ['male','female','other','prefer_not'];
  const genderLabels  = {male:'👦 Male', female:'👩 Female', other:'🌈 Other', prefer_not:'🤐 Prefer not to say'};
  let selGender = '';

  const dietGoals = [
    {k:'lose_weight',e:'⚖️',l:'Lose weight'},{k:'healthy',e:'🥗',l:'Healthy eating'},
    {k:'maintain',e:'⚡',l:'Maintain'},{k:'gain_muscle',e:'💪',l:'Build muscle'},
  ];
  let selDiet = '';

  const interestsList = ['Technology','Science','Music','Sports','Travel','Cooking','Art',
    'Gaming','Finance','Health','Photography','Movies','Nature','History'];
  const selInterests = new Set();

  function render() {
    if (step < STEPS.length) {
      const s = STEPS[step];
      box.innerHTML = `
        ${isDemo ? '<div style="background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.3);border-radius:8px;padding:8px 12px;font-size:.78rem;color:#eab308;margin-bottom:16px">⚠️ Demo mode — do not enter real personal information.</div>' : ''}
        <div style="text-align:center;font-size:3rem;margin-bottom:12px">${s.emoji}</div>
        <h2 style="text-align:center;margin:0 0 20px;font-size:1.2rem">${s.q}</h2>
        <input id="${s.id}" type="${s.type}" placeholder="${s.placeholder}"
          value="${answers[s.id]||''}"
          style="width:100%;padding:12px;border-radius:12px;border:1px solid var(--border,#444);
                 background:transparent;color:inherit;font-size:1rem;box-sizing:border-box;text-align:center"
          onkeydown="if(event.key==='Enter') document.getElementById('ob-next').click()">
        <div style="display:flex;gap:8px;margin-top:16px">
          ${step > 0 ? '<button onclick="obBack()" style="flex:1;padding:11px;border-radius:12px;border:1px solid var(--border,#444);background:transparent;cursor:pointer;color:inherit">← Back</button>' : ''}
          <button id="ob-next" onclick="obNext()" style="flex:2;padding:11px;border-radius:12px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem">
            ${step < STEPS.length-1 ? 'Next →' : 'Continue →'}
          </button>
        </div>
        <button onclick="obSkip()" style="width:100%;margin-top:10px;background:none;border:none;color:inherit;opacity:.4;cursor:pointer;font-size:.82rem">Skip for now</button>
        <div style="text-align:center;margin-top:12px;font-size:.75rem;opacity:.3">${step+1} / ${STEPS.length+3}</div>`;
      setTimeout(() => document.getElementById(s.id)?.focus(), 100);
    } else if (step === STEPS.length) {
      // Gender
      box.innerHTML = `
        <div style="text-align:center;font-size:3rem;margin-bottom:12px">🧬</div>
        <h2 style="text-align:center;margin:0 0 20px;font-size:1.2rem">What's your gender?</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${genderOptions.map(g=>`
            <button onclick="obGender(this,'${g}')" data-g="${g}"
              style="padding:14px;border-radius:12px;border:2px solid var(--border,#444);
                     cursor:pointer;font-size:.95rem;${selGender===g?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
              ${genderLabels[g]}
            </button>`).join('')}
        </div>
        <button id="ob-next" onclick="obNext()" style="width:100%;margin-top:16px;padding:12px;border-radius:12px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem">Continue →</button>
        <div style="text-align:center;margin-top:12px;font-size:.75rem;opacity:.3">${step+1} / ${STEPS.length+3}</div>`;
    } else if (step === STEPS.length+1) {
      // Interests
      box.innerHTML = `
        <div style="text-align:center;font-size:3rem;margin-bottom:12px">⭐</div>
        <h2 style="text-align:center;margin:0 0 6px;font-size:1.2rem">What are you into?</h2>
        <p style="text-align:center;opacity:.5;font-size:.85rem;margin:0 0 16px">Pick anything that fits</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px">
          ${interestsList.map(i=>`
            <button onclick="obToggleInt(this,'${i}')"
              style="padding:7px 14px;border-radius:20px;border:1px solid var(--border,#444);cursor:pointer;
                     font-size:.82rem;${selInterests.has(i)?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
              ${i}
            </button>`).join('')}
        </div>
        <button onclick="obNext()" style="width:100%;padding:12px;border-radius:12px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem">Continue →</button>
        <div style="text-align:center;margin-top:12px;font-size:.75rem;opacity:.3">${step+1} / ${STEPS.length+3}</div>`;
    } else if (step === STEPS.length+2) {
      // Diet goal
      box.innerHTML = `
        <div style="text-align:center;font-size:3rem;margin-bottom:12px">🥗</div>
        <h2 style="text-align:center;margin:0 0 6px;font-size:1.2rem">What's your food goal?</h2>
        <p style="text-align:center;opacity:.5;font-size:.85rem;margin:0 0 16px">OZY will personalize recipes and tips</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          ${dietGoals.map(d=>`
            <button onclick="obDiet(this,'${d.k}')" data-d="${d.k}"
              style="padding:16px;border-radius:12px;border:2px solid var(--border,#444);cursor:pointer;
                     text-align:center;font-size:.9rem;${selDiet===d.k?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
              <div style="font-size:1.6rem;margin-bottom:4px">${d.e}</div>${d.l}
            </button>`).join('')}
        </div>
        <button onclick="obFinish()" style="width:100%;padding:12px;border-radius:12px;border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem">🎉 Let's go!</button>`;
    }
  }

  window.obNext = function() {
    if (step < STEPS.length) {
      const s = STEPS[step];
      answers[s.id] = document.getElementById(s.id)?.value.trim() || '';
    }
    step++;
    render();
  };
  window.obBack = function() { step--; render(); };
  window.obSkip = function() { modal.style.display = 'none'; };
  window.obGender = function(btn, g) {
    selGender = g;
    document.querySelectorAll('[data-g]').forEach(b => {
      const a = b.dataset.g === g;
      b.style.background = a ? 'var(--accent,#6366f1)' : 'transparent';
      b.style.color      = a ? '#fff' : 'inherit';
      b.style.borderColor = a ? 'transparent' : 'var(--border,#444)';
    });
  };
  window.obToggleInt = function(btn, i) {
    if (selInterests.has(i)) { selInterests.delete(i); btn.style.background='transparent'; btn.style.color='inherit'; btn.style.borderColor='var(--border,#444)'; }
    else { selInterests.add(i); btn.style.background='var(--accent,#6366f1)'; btn.style.color='#fff'; btn.style.borderColor='transparent'; }
  };
  window.obDiet = function(btn, d) {
    selDiet = d;
    document.querySelectorAll('[data-d]').forEach(b => {
      const a = b.dataset.d === d;
      b.style.background = a ? 'var(--accent,#6366f1)' : 'transparent';
      b.style.color      = a ? '#fff' : 'inherit';
      b.style.borderColor = a ? 'transparent' : 'var(--border,#444)';
    });
  };
  window.obFinish = async function() {
    const payload = {
      name:         answers['ob-name']   || '',
      age:          parseInt(answers['ob-age']) || null,
      country:      answers['ob-country']|| '',
      occupation:   answers['ob-occ']    || '',
      gender:       selGender,
      dietary_goal: selDiet,
      interests:    [...selInterests],
      hobbies: [], pets: [],
      onboarding_done: true,
    };
    await fetch('/api/profile', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    });
    if (payload.name) {
      await fetch('/api/settings', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({user_name: payload.name}),
      }).catch(()=>{});
    }
    // Apply gender nav
    document.querySelectorAll('[data-panel="women"]').forEach(el => {
      el.style.display = selGender === 'female' ? '' : 'none';
    });
    modal.style.display = 'none';
  };

  modal.style.display = 'flex';
  render();
}

// ── Camera (getUserMedia) ─────────────────────────────
let _cameraStream = null;
let _cameraCallback = null;

async function cameraOpen(callback) {
  _cameraCallback = callback;
  try {
    _cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const video = document.getElementById('camera-video');
    video.srcObject = _cameraStream;
    document.getElementById('camera-modal').style.display = 'flex';
  } catch(e) {
    // Fallback: file picker
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = () => { if (inp.files[0] && callback) callback(inp.files[0], null); };
    inp.click();
  }
}

function cameraCapture() {
  const video  = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    cameraClose();
    if (_cameraCallback) _cameraCallback(null, canvas.toDataURL('image/jpeg', 0.78));
  }, 'image/jpeg', 0.78);
}

function cameraClose() {
  if (_cameraStream) { _cameraStream.getTracks().forEach(t=>t.stop()); _cameraStream = null; }
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
