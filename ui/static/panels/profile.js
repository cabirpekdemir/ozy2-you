/* OZY2 — Profile Panel (Personal info + onboarding) */

const _INTERESTS_LIST = [
  'Technology','Science','Music','Sports','Travel','Cooking','Art','Reading',
  'Gaming','Fashion','Finance','Health & Fitness','Photography','Movies & TV',
  'Podcasts','Nature','Politics','History','Languages','Space',
];
const _HOBBIES_LIST = [
  'Running','Yoga','Cycling','Swimming','Hiking','Dancing','Painting',
  'Gardening','Chess','Knitting','3D Printing','Guitar','Coding','Writing',
  'Board Games','Rock Climbing','Meditation','Baking','Volunteering',
];
const _DIET_GOALS = [
  {k:'lose_weight', e:'⚖️', l:'Lose weight'},
  {k:'healthy',     e:'🥗', l:'Healthy eating'},
  {k:'maintain',    e:'⚡', l:'Maintain weight'},
  {k:'gain_muscle', e:'💪', l:'Build muscle'},
  {k:'custom',      e:'✏️', l:'Custom goal'},
];

let _profileData = {};

async function init_profile(el) {
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  const [settingsRes, profileRes, meRes, memRes] = await Promise.all([
    fetch('/api/settings').then(r=>r.json()).catch(()=>({})),
    fetch('/api/profile').then(r=>r.json()).catch(()=>({})),
    fetch('/api/auth/me').then(r=>r.json()).catch(()=>({})),
    fetch('/api/memory/stats').then(r=>r.json()).catch(()=>({})),
  ]);

  const settings = settingsRes.settings || {};
  _profileData   = profileRes.profile  || {};
  const isDemo   = meRes.is_demo || false;
  const memFacts = memRes.facts_count ?? 0;
  const memHist  = memRes.history_count ?? 0;

  const userName = _profileData.name || settings.user_name || 'User';
  const initial  = (userName.charAt(0) || '?').toUpperCase();

  el.innerHTML = `
<div style="max-width:640px;margin:0 auto;padding:16px">

  ${isDemo ? `<div style="background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.3);
      border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:.82rem;color:#eab308">
      ⚠️ Demo mode — please do not enter real personal information.
    </div>` : ''}

  <!-- Avatar + name -->
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
    <div style="width:60px;height:60px;border-radius:50%;background:var(--accent,#6366f1);
                display:flex;align-items:center;justify-content:center;
                font-size:28px;font-weight:700;color:#fff;flex-shrink:0">
      ${initial}
    </div>
    <div>
      <div style="font-size:1.3rem;font-weight:700">${_escHtml(userName)}</div>
      <div style="font-size:.8rem;opacity:.5">${_profileData.country || ''} ${_profileData.age ? '· Age '+_profileData.age : ''}</div>
    </div>
    <button onclick="profileEdit()" style="margin-left:auto;padding:7px 16px;border-radius:20px;
      border:1px solid var(--border,#444);background:transparent;cursor:pointer;color:inherit;font-size:.85rem">
      ✏️ Edit
    </button>
  </div>

  <!-- Profile summary chips -->
  <div id="profile-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px">
    ${_buildChips(_profileData)}
  </div>

  <!-- Edit form (hidden initially) -->
  <div id="profile-edit-form" style="display:none;background:var(--card-bg);border-radius:16px;padding:20px;margin-bottom:20px">
    ${_buildProfileForm(_profileData, isDemo)}
  </div>

  <!-- Memory stats -->
  <div style="background:var(--card-bg);border-radius:16px;padding:18px;margin-bottom:16px">
    <div style="font-size:.9rem;font-weight:600;margin-bottom:12px">🧠 Memory</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="padding:12px;background:var(--bg-base,#0e1018);border-radius:10px;text-align:center">
        <div style="font-size:1.6rem;font-weight:700;color:var(--accent,#6366f1)">${memFacts}</div>
        <div style="font-size:.75rem;opacity:.5;margin-top:2px">Saved Facts</div>
      </div>
      <div style="padding:12px;background:var(--bg-base,#0e1018);border-radius:10px;text-align:center">
        <div style="font-size:1.6rem;font-weight:700;color:var(--accent,#6366f1)">${memHist}</div>
        <div style="font-size:.75rem;opacity:.5;margin-top:2px">Chat History</div>
      </div>
    </div>
    <button onclick="showPanel('memory')" style="width:100%;margin-top:10px;padding:8px;border-radius:10px;
      border:1px solid var(--border,#444);background:transparent;cursor:pointer;color:inherit;font-size:.82rem">
      View Memory →
    </button>
  </div>

  <!-- Logout -->
  <button onclick="_profileLogout()" style="width:100%;padding:12px;background:rgba(239,68,68,.1);
    color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:12px;font-size:.9rem;
    font-weight:600;cursor:pointer">
    🚪 Sign Out
  </button>

</div>`;
}

function _buildChips(p) {
  const chips = [];
  if (p.gender)       chips.push(`${p.gender==='female'?'👩':'👤'} ${p.gender.charAt(0).toUpperCase()+p.gender.slice(1)}`);
  if (p.occupation)   chips.push(`💼 ${p.occupation}`);
  if (p.dietary_goal) {
    const g = _DIET_GOALS.find(d=>d.k===p.dietary_goal);
    chips.push(`${g?.e||'🥗'} ${g?.l||p.dietary_goal}`);
  }
  if (p.favorite_color) chips.push(`🎨 ${p.favorite_color}`);
  (p.pets||[]).forEach(pet => chips.push(`🐾 ${pet}`));
  (p.interests||[]).slice(0,5).forEach(i => chips.push(`⭐ ${i}`));
  (p.hobbies||[]).slice(0,5).forEach(h => chips.push(`🎯 ${h}`));
  if (!chips.length) return `<span style="opacity:.4;font-size:.85rem">No profile info yet — click Edit to get started</span>`;
  return chips.map(c=>`<span style="padding:5px 12px;border-radius:20px;border:1px solid var(--border,#444);font-size:.82rem">${_escHtml(c)}</span>`).join('');
}

function _buildProfileForm(p, isDemo) {
  const selects = (list, current) => list.map(item =>
    `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.82rem">
      <input type="checkbox" value="${item}" ${(current||[]).includes(item)?'checked':''}> ${item}
    </label>`
  ).join('');

  const dietBtns = _DIET_GOALS.map(g =>
    `<button type="button" onclick="profileDietToggle(this,'${g.k}')" data-diet="${g.k}"
      style="padding:6px 12px;border-radius:16px;border:1px solid var(--border,#444);
             cursor:pointer;font-size:.8rem;${p.dietary_goal===g.k?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
      ${g.e} ${g.l}
    </button>`
  ).join('');

  return `
  <h3 style="margin:0 0 16px;font-size:1rem">Personal Information</h3>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
    <div>
      <label style="font-size:.8rem;opacity:.6">Full Name</label>
      <input id="pf-name" value="${_escHtml(p.name||'')}" placeholder="Your name"
        style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border,#444);
               background:transparent;color:inherit;font-size:.9rem;box-sizing:border-box;margin-top:4px">
    </div>
    <div>
      <label style="font-size:.8rem;opacity:.6">Age</label>
      <input id="pf-age" type="number" value="${p.age||''}" placeholder="e.g. 28" min="1" max="120"
        style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border,#444);
               background:transparent;color:inherit;font-size:.9rem;box-sizing:border-box;margin-top:4px">
    </div>
    <div>
      <label style="font-size:.8rem;opacity:.6">Country</label>
      <input id="pf-country" value="${_escHtml(p.country||'')}" placeholder="e.g. Turkey"
        style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border,#444);
               background:transparent;color:inherit;font-size:.9rem;box-sizing:border-box;margin-top:4px">
    </div>
    <div>
      <label style="font-size:.8rem;opacity:.6">Occupation</label>
      <input id="pf-occupation" value="${_escHtml(p.occupation||'')}" placeholder="e.g. Designer"
        style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border,#444);
               background:transparent;color:inherit;font-size:.9rem;box-sizing:border-box;margin-top:4px">
    </div>
  </div>

  <!-- Gender -->
  <div style="margin-bottom:14px">
    <label style="font-size:.8rem;opacity:.6;display:block;margin-bottom:6px">Gender</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${['male','female','other','prefer_not'].map(g =>
        `<button type="button" onclick="profileGenderToggle(this,'${g}')" data-gender="${g}"
          style="padding:6px 14px;border-radius:16px;border:1px solid var(--border,#444);cursor:pointer;font-size:.82rem;
                 ${p.gender===g?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
          ${{male:'👦 Male',female:'👩 Female',other:'🌈 Other',prefer_not:'🤐 Prefer not to say'}[g]}
        </button>`).join('')}
    </div>
  </div>

  <!-- Favorite color -->
  <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
    <div style="flex:1">
      <label style="font-size:.8rem;opacity:.6">Favorite Color</label>
      <input id="pf-color" value="${_escHtml(p.favorite_color||'')}" placeholder="e.g. Deep blue"
        style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border,#444);
               background:transparent;color:inherit;font-size:.9rem;box-sizing:border-box;margin-top:4px">
    </div>
    <div>
      <label style="font-size:.8rem;opacity:.6">Pet(s)</label>
      <input id="pf-pets" value="${_escHtml((p.pets||[]).join(', '))}" placeholder="e.g. Cat, Dog"
        style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border,#444);
               background:transparent;color:inherit;font-size:.9rem;box-sizing:border-box;margin-top:4px">
    </div>
  </div>

  <!-- Diet goal -->
  <div style="margin-bottom:14px">
    <label style="font-size:.8rem;opacity:.6;display:block;margin-bottom:6px">Diet Goal</label>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${dietBtns}</div>
    <input id="pf-diet-custom" value="${_escHtml(p.dietary_custom||'')}"
      placeholder="Describe your goal..." style="width:100%;margin-top:8px;padding:7px;border-radius:8px;
      border:1px solid var(--border,#444);background:transparent;color:inherit;font-size:.85rem;
      box-sizing:border-box;display:${p.dietary_goal==='custom'?'block':'none'}">
  </div>

  <!-- Interests -->
  <div style="margin-bottom:14px">
    <label style="font-size:.8rem;opacity:.6;display:block;margin-bottom:6px">Interests</label>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px;
                max-height:150px;overflow-y:auto;padding:2px">
      ${selects(_INTERESTS_LIST, p.interests)}
    </div>
  </div>

  <!-- Hobbies -->
  <div style="margin-bottom:16px">
    <label style="font-size:.8rem;opacity:.6;display:block;margin-bottom:6px">Hobbies</label>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px;
                max-height:130px;overflow-y:auto;padding:2px">
      ${selects(_HOBBIES_LIST, p.hobbies)}
    </div>
  </div>

  <div style="display:flex;gap:8px">
    <button onclick="profileSave()" style="flex:1;padding:10px;border-radius:10px;border:none;
      background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:.95rem">
      💾 Save Profile
    </button>
    <button onclick="profileCancelEdit()" style="padding:10px 16px;border-radius:10px;
      border:1px solid var(--border,#444);background:transparent;cursor:pointer;color:inherit">
      Cancel
    </button>
  </div>`;
}

let _pfGender = '';
let _pfDiet   = '';

function profileEdit() {
  const form = document.getElementById('profile-edit-form');
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
  _pfGender = _profileData.gender || '';
  _pfDiet   = _profileData.dietary_goal || '';
}

function profileCancelEdit() {
  const form = document.getElementById('profile-edit-form');
  if (form) form.style.display = 'none';
}

function profileGenderToggle(btn, g) {
  _pfGender = g;
  document.querySelectorAll('[data-gender]').forEach(b => {
    const active = b.dataset.gender === g;
    b.style.background = active ? 'var(--accent,#6366f1)' : 'transparent';
    b.style.color      = active ? '#fff' : 'inherit';
    b.style.borderColor = active ? 'transparent' : 'var(--border,#444)';
  });
}

function profileDietToggle(btn, d) {
  _pfDiet = d;
  document.querySelectorAll('[data-diet]').forEach(b => {
    const active = b.dataset.diet === d;
    b.style.background = active ? 'var(--accent,#6366f1)' : 'transparent';
    b.style.color      = active ? '#fff' : 'inherit';
    b.style.borderColor = active ? 'transparent' : 'var(--border,#444)';
  });
  const custom = document.getElementById('pf-diet-custom');
  if (custom) custom.style.display = d === 'custom' ? 'block' : 'none';
}

async function profileSave() {
  const name     = document.getElementById('pf-name')?.value.trim()       || '';
  const age      = parseInt(document.getElementById('pf-age')?.value)      || null;
  const country  = document.getElementById('pf-country')?.value.trim()    || '';
  const occ      = document.getElementById('pf-occupation')?.value.trim() || '';
  const color    = document.getElementById('pf-color')?.value.trim()      || '';
  const petsRaw  = document.getElementById('pf-pets')?.value.trim()       || '';
  const pets     = petsRaw ? petsRaw.split(',').map(p=>p.trim()).filter(Boolean) : [];
  const dietCust = document.getElementById('pf-diet-custom')?.value.trim()|| '';

  const interests = [...document.querySelectorAll('#profile-edit-form input[type=checkbox]')]
    .filter((c,i) => c.checked && i < _INTERESTS_LIST.length).map(c=>c.value);
  const hobbies   = [...document.querySelectorAll('#profile-edit-form input[type=checkbox]')]
    .filter((c,i) => c.checked && i >= _INTERESTS_LIST.length).map(c=>c.value);

  const payload = {
    name, age, country, occupation: occ,
    gender: _pfGender,
    favorite_color: color,
    pets,
    dietary_goal: _pfDiet,
    dietary_custom: dietCust,
    interests, hobbies,
    onboarding_done: true,
  };

  const r = await fetch('/api/profile', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload),
  }).then(x=>x.json());

  if (r.ok) {
    _profileData = payload;
    toast('Profile saved ✓', 'success');
    profileCancelEdit();
    // Update chips + avatar
    const chips = document.getElementById('profile-chips');
    if (chips) chips.innerHTML = _buildChips(_profileData);
    // Update gender-based nav visibility
    _applyGenderNav(_pfGender);
    // Update settings user_name if provided
    if (name) {
      await fetch('/api/settings', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({user_name: name}),
      }).catch(()=>{});
    }
  }
}

function _applyGenderNav(gender) {
  const womenItems = document.querySelectorAll('[data-panel="women"]');
  womenItems.forEach(el => {
    el.style.display = (gender === 'female') ? '' : 'none';
  });
}

async function _profileLogout() {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
  window.location.replace('/login');
}

function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
