/* OZY2 — Home Panel (customizable quick actions) */
'use strict';

// ── All available quick actions ───────────────────────────────────
const _QA_ALL = [
  { id:'chat',        emoji:'💬', label:'Chat' },
  { id:'briefing',    emoji:'☀️', label:'Briefing' },
  { id:'tasks',       emoji:'✅', label:'Tasks' },
  { id:'gmail',       emoji:'📧', label:'Email' },
  { id:'calendar',    emoji:'📅', label:'Calendar' },
  { id:'notes',       emoji:'📝', label:'Notes' },
  { id:'reminders',   emoji:'⏰', label:'Reminders' },
  { id:'memory',      emoji:'🧠', label:'Memory' },
  { id:'daily',       emoji:'📓', label:'Diary' },
  { id:'nutrition',   emoji:'🥗', label:'Nutrition' },
  { id:'health',      emoji:'❤️', label:'Health' },
  { id:'automations', emoji:'⚡', label:'Automations' },
  { id:'telegram',    emoji:'✈️', label:'Telegram' },
  { id:'drive',       emoji:'💾', label:'Drive' },
  { id:'github',      emoji:'🐙', label:'GitHub' },
  { id:'smarthome',   emoji:'🏠', label:'Smart Home' },
  { id:'books',       emoji:'📚', label:'Books' },
  { id:'baby',        emoji:'👶', label:'Baby Tracker' },
  { id:'women',       emoji:'🌸', label:"Women's Health" },
  { id:'stocks',      emoji:'📈', label:'Stocks' },
  { id:'roles',       emoji:'🎭', label:'Roles' },
  { id:'profile',     emoji:'👤', label:'Profile' },
  { id:'settings',    emoji:'⚙️', label:'Settings' },
  { id:'__voice',     emoji:'🎤', label:'Voice Mode', href:'/voice' },
];

const _QA_DEFAULT = ['chat','gmail','calendar','tasks','briefing'];
const _QA_KEY     = 'ozy_quick_actions';

function _qaLoad() {
  try {
    const v = localStorage.getItem(_QA_KEY);
    return v ? JSON.parse(v) : _QA_DEFAULT;
  } catch { return _QA_DEFAULT; }
}

function _qaSave(ids) {
  localStorage.setItem(_QA_KEY, JSON.stringify(ids));
}

// ── Init ──────────────────────────────────────────────────────────
function init_home(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">

      <!-- Greeting -->
      <div class="card" style="margin-bottom:16px;padding:24px 28px;
        background:linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.1));
        border-color:rgba(99,102,241,.3)">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:56px;height:56px;border-radius:18px;
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            display:flex;align-items:center;justify-content:center;
            font-size:26px;box-shadow:0 0 30px rgba(99,102,241,.4)" id="home-avatar">✦</div>
          <div>
            <div id="home-greeting" style="font-size:22px;font-weight:700">Good morning</div>
            <div style="color:var(--text-3);font-size:14px" id="home-date"></div>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px">
        <div class="card stat-card" onclick="showPanel('tasks')" style="cursor:pointer">
          <div style="font-size:28px;font-weight:700;color:var(--accent)" id="stat-tasks">—</div>
          <div style="color:var(--text-3);font-size:13px;margin-top:4px">Tasks Today</div>
        </div>
        <div class="card stat-card" onclick="showPanel('gmail')" style="cursor:pointer">
          <div style="font-size:28px;font-weight:700;color:#f59e0b" id="stat-email">—</div>
          <div style="color:var(--text-3);font-size:13px;margin-top:4px">Unread Emails</div>
        </div>
        <div class="card stat-card" onclick="showPanel('calendar')" style="cursor:pointer">
          <div style="font-size:28px;font-weight:700;color:#10b981" id="stat-events">—</div>
          <div style="color:var(--text-3);font-size:13px;margin-top:4px">Events Today</div>
        </div>
      </div>

      <!-- Quick Actions (customizable) -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px 0">
          <div class="card-header" style="padding:0;border:none">Quick Actions</div>
          <button onclick="qaEdit()" title="Customize"
            style="background:none;border:none;cursor:pointer;color:var(--text-3);
                   font-size:.8rem;padding:4px 10px;border-radius:8px;
                   transition:background .15s;display:flex;align-items:center;gap:5px"
            onmouseover="this.style.background='var(--card-bg)'"
            onmouseout="this.style.background='none'">
            ✏️ Customize
          </button>
        </div>
        <div id="qa-buttons" style="padding:12px 16px 16px;display:flex;gap:8px;flex-wrap:wrap"></div>
      </div>

      <!-- Customize modal (inline, hidden) -->
      <div id="qa-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);
           z-index:8000;align-items:center;justify-content:center;padding:20px">
        <div style="background:var(--bg-base,#13141a);border:1px solid var(--card-border);
             border-radius:20px;padding:24px;width:100%;max-width:520px;max-height:85vh;
             overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
            <div>
              <div style="font-size:1.1rem;font-weight:700">Customize Quick Actions</div>
              <div style="font-size:.8rem;color:var(--text-3);margin-top:2px">Tap to add or remove</div>
            </div>
            <button onclick="qaClose()" style="background:none;border:none;cursor:pointer;
              font-size:1.3rem;color:var(--text-3);padding:4px 8px;border-radius:8px"
              onmouseover="this.style.color='var(--text-1)'"
              onmouseout="this.style.color='var(--text-3)'">✕</button>
          </div>

          <div id="qa-picker" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:20px"></div>

          <div style="display:flex;gap:8px">
            <button onclick="qaReset()" style="flex:1;padding:10px;border-radius:10px;
              border:1px solid var(--card-border);background:transparent;cursor:pointer;
              color:var(--text-3);font-size:.85rem">
              Reset defaults
            </button>
            <button onclick="qaDone()" style="flex:2;padding:10px;border-radius:10px;
              border:none;background:var(--accent,#6366f1);color:#fff;cursor:pointer;
              font-size:.95rem;font-weight:600">
              ✓ Done
            </button>
          </div>
        </div>
      </div>

      <!-- Today's Events -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="padding:16px 20px 12px">Today's Calendar</div>
        <div id="home-events" style="padding:0 16px 16px">
          <div class="spinner" style="margin:20px auto"></div>
        </div>
      </div>

      <!-- Upgrade promo -->
      <div style="border-radius:14px;padding:16px 20px;margin-bottom:16px;
        background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(16,185,129,.08));
        border:1px solid rgba(99,102,241,.25);display:flex;align-items:center;gap:14px;
        cursor:pointer" onclick="showPanel('packages')">
        <div style="font-size:28px;flex-shrink:0">🚀</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;margin-bottom:2px">
            OZY Professional, Social & Business coming soon
          </div>
          <div style="color:var(--text-3);font-size:12px;line-height:1.4">
            Multi-agent workflows · WhatsApp · Team tools · CRM — join the waitlist
          </div>
        </div>
        <div style="color:var(--accent);font-size:18px;flex-shrink:0">→</div>
      </div>

    </div>`;

  _setGreeting();
  _loadStats();
  _loadEvents();
  _renderQA();
}

// ── Render saved quick actions ────────────────────────────────────
function _renderQA() {
  const ids  = _qaLoad();
  const wrap = document.getElementById('qa-buttons');
  if (!wrap) return;

  if (ids.length === 0) {
    wrap.innerHTML = `<span style="color:var(--text-3);font-size:.85rem;padding:4px 0">
      No actions — click <strong>Customize</strong> to add some.</span>`;
    return;
  }

  wrap.innerHTML = ids.map(id => {
    const a = _QA_ALL.find(x => x.id === id);
    if (!a) return '';
    if (a.href) {
      return `<a href="${a.href}" target="_blank"
        style="display:inline-flex;align-items:center;gap:6px;
               padding:8px 14px;border-radius:10px;border:1px solid var(--card-border);
               background:transparent;color:inherit;text-decoration:none;
               font-size:.88rem;font-weight:500;cursor:pointer;transition:border-color .15s"
        onmouseover="this.style.borderColor='var(--accent)'"
        onmouseout="this.style.borderColor='var(--card-border)'">
        ${a.emoji} ${a.label}
      </a>`;
    }
    const isPrimary = id === ids[0];
    return `<button onclick="showPanel('${id}')"
      style="display:inline-flex;align-items:center;gap:6px;
             padding:8px 14px;border-radius:10px;
             ${isPrimary
               ? 'border:none;background:var(--accent,#6366f1);color:#fff;'
               : 'border:1px solid var(--card-border);background:transparent;color:inherit;'}
             font-size:.88rem;font-weight:500;cursor:pointer;transition:all .15s"
      onmouseover="this.style.opacity='.8'"
      onmouseout="this.style.opacity='1'">
      ${a.emoji} ${a.label}
    </button>`;
  }).join('');
}

// ── Customize modal ───────────────────────────────────────────────
let _qaDraft = [];

function qaEdit() {
  _qaDraft = [..._qaLoad()];
  _renderPicker();
  document.getElementById('qa-modal').style.display = 'flex';
}

function _renderPicker() {
  const picker = document.getElementById('qa-picker');
  if (!picker) return;
  picker.innerHTML = _QA_ALL.map(a => {
    const on = _qaDraft.includes(a.id);
    return `<button onclick="qaToggle('${a.id}', this)" data-qa="${a.id}"
      style="display:flex;flex-direction:column;align-items:center;gap:4px;
             padding:12px 8px;border-radius:12px;cursor:pointer;font-size:.82rem;
             font-weight:600;transition:all .15s;
             border:2px solid ${on ? 'var(--accent,#6366f1)' : 'var(--card-border)'};
             background:${on ? 'rgba(99,102,241,.12)' : 'transparent'};
             color:${on ? 'var(--accent,#6366f1)' : 'inherit'}">
      <span style="font-size:1.6rem">${a.emoji}</span>
      <span>${a.label}</span>
      <span style="font-size:.75rem;opacity:.6">${on ? '✓ Added' : '+ Add'}</span>
    </button>`;
  }).join('');
}

function qaToggle(id, btn) {
  const idx = _qaDraft.indexOf(id);
  if (idx >= 0) {
    _qaDraft.splice(idx, 1);
    btn.style.borderColor = 'var(--card-border)';
    btn.style.background  = 'transparent';
    btn.style.color       = 'inherit';
    btn.querySelector('span:last-child').textContent = '+ Add';
  } else {
    _qaDraft.push(id);
    btn.style.borderColor = 'var(--accent,#6366f1)';
    btn.style.background  = 'rgba(99,102,241,.12)';
    btn.style.color       = 'var(--accent,#6366f1)';
    btn.querySelector('span:last-child').textContent = '✓ Added';
  }
}

function qaDone() {
  _qaSave(_qaDraft);
  qaClose();
  _renderQA();
}

function qaReset() {
  _qaDraft = [..._QA_DEFAULT];
  _renderPicker();
}

function qaClose() {
  document.getElementById('qa-modal').style.display = 'none';
}

// Close on backdrop click
document.addEventListener('click', e => {
  const modal = document.getElementById('qa-modal');
  if (modal && e.target === modal) qaClose();
});

// ── Greeting ──────────────────────────────────────────────────────
async function _setGreeting() {
  const now = new Date();
  const h   = now.getHours();
  let greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  let name  = '';
  let avatar = '';

  try {
    const d = await fetch('/api/auth/me').then(r => r.json());
    if (d.ok) {
      if (d.is_demo && d.demo_name) {
        name = d.demo_name.split(' ')[0];
      } else {
        try {
          const s = await fetch('/api/settings').then(r => r.json());
          name   = s.settings?.user_name  || '';
          avatar = s.settings?.ai_avatar  || '';
        } catch {}
      }
    }
  } catch {}

  document.getElementById('home-greeting').textContent = name ? `${greet}, ${name}` : greet;
  document.getElementById('home-date').textContent = now.toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric',
  });
  if (avatar) {
    const av = document.getElementById('home-avatar');
    if (av) { av.textContent = avatar; av.style.fontSize = '2rem'; }
  }
}

// ── Stats ─────────────────────────────────────────────────────────
async function _loadStats() {
  try {
    const d = await fetch('/api/tasks?status=todo').then(r => r.json());
    if (d.ok) document.getElementById('stat-tasks').textContent = d.tasks.length;
  } catch {}
  try {
    const d = await fetch('/api/gmail/unread').then(r => r.json());
    if (d.ok) document.getElementById('stat-email').textContent = d.count;
  } catch {}
  try {
    const d = await fetch('/api/calendar/today').then(r => r.json());
    if (d.ok) document.getElementById('stat-events').textContent = d.events.length;
  } catch {}
}

// ── Calendar events ───────────────────────────────────────────────
async function _loadEvents() {
  const el = document.getElementById('home-events');
  if (!el) return;
  try {
    const d = await fetch('/api/calendar/today').then(r => r.json());
    if (d.ok && d.events.length > 0) {
      el.innerHTML = d.events.map(e => `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;
          border-bottom:1px solid var(--card-border)">
          <div style="width:44px;flex-shrink:0;text-align:center">
            <div style="font-size:11px;color:var(--text-3);line-height:1">
              ${e.start?.includes('T') ? e.start.substring(11,16) : 'All day'}
            </div>
          </div>
          <div>
            <div style="font-weight:500;font-size:14px">${e.title}</div>
            ${e.location ? `<div style="font-size:12px;color:var(--text-3)">${e.location}</div>` : ''}
          </div>
        </div>`).join('');
    } else {
      el.innerHTML = '<div style="color:var(--text-3);padding:12px 0;font-size:14px">No events today ✌️</div>';
    }
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:12px 0;font-size:14px">Could not load calendar</div>';
  }
}
