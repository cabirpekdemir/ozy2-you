/* OZY2 — Automations Panel (full-featured) */
'use strict';

const AUTO_ACTIONS = [
  // ── AI
  { group:'🤖 AI', type:'briefing',       label:'Morning Briefing',    desc:'Full daily briefing (weather, calendar, tasks, news)', icon:'☀️' },
  { group:'🤖 AI', type:'ai_prompt',      label:'Custom AI Prompt',    desc:'Run any prompt, send result to Telegram/in-app',       icon:'💬', cfg:['prompt'] },
  { group:'🤖 AI', type:'news_summary',   label:'News Summary',        desc:'Latest news digest via web search',                   icon:'📰' },
  // ── Communication
  { group:'📬 Communication', type:'email_check',    label:'Email Check',    desc:'Check new emails and summarize them',       icon:'📧' },
  { group:'📬 Communication', type:'custom_message', label:'Send Message',   desc:'Send a custom message to Telegram',         icon:'✉️', cfg:['message'] },
  // ── Calendar & Tasks
  { group:'📅 Calendar & Tasks', type:'calendar_summary', label:'Calendar Summary', desc:'Upcoming events for today / week',   icon:'📅' },
  { group:'📅 Calendar & Tasks', type:'task_check',       label:'Task Reminder',    desc:'Remind to review open tasks',        icon:'✅' },
  { group:'📅 Calendar & Tasks', type:'reminder',         label:'Custom Reminder',  desc:'Add a scheduled reminder note',      icon:'⏰', cfg:['text'] },
  // ── Health & Wellness
  { group:'💪 Health', type:'water_reminder',  label:'Hydration Reminder',  desc:'Drink water reminder at set intervals', icon:'💧' },
  { group:'💪 Health', type:'medication',      label:'Medication Reminder', desc:'Remind to take specific medication',    icon:'💊', cfg:['name'] },
  { group:'💪 Health', type:'step_check',      label:'Movement Reminder',   desc:'Reminder to move / take a walk',        icon:'👟' },
  { group:'💪 Health', type:'sleep_reminder',  label:'Sleep Reminder',      desc:'Bedtime wind-down reminder',            icon:'😴' },
  // ── Finance
  { group:'💰 Finance', type:'stock_check',   label:'Stock / Crypto Alert', desc:'Price check for chosen symbols',        icon:'📈', cfg:['symbols'] },
  // ── Notes
  { group:'📝 Notes', type:'note',            label:'Auto Note',            desc:'Append a recurring note',               icon:'📝', cfg:['text'] },
];

const AUTO_TRIGGER_LABELS = {
  manual:   '▶️ Manual only',
  interval: '🔁 Repeat every…',
  daily:    '📅 Daily at…',
  weekly:   '📆 Weekly on…',
};
const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const CHANNELS = [
  { k:'inapp',    l:'🔔 In-app' },
  { k:'telegram', l:'✈️ Telegram' },
  { k:'both',     l:'🔔+✈️ Both' },
];

let _autoList  = [];
let _editingId = null;
let _editData  = {};
let _amTrigger = 'daily';
let _amChannel = 'inapp';
let _amWeekDay = 0;

// ── Init ──────────────────────────────────────────────────────────────────────

async function init_automations(el) {
  el.innerHTML = `
  <div style="max-width:860px;margin:0 auto;padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
      <div>
        <h2 style="margin:0;font-size:1.4rem">⚙️ Automations</h2>
        <p style="margin:4px 0 0;opacity:.5;font-size:.82rem">Scheduled tasks that run automatically</p>
      </div>
      <button onclick="autoOpenModal(null)"
        style="padding:9px 20px;border-radius:20px;border:none;
               background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:.9rem">
        + New Automation
      </button>
    </div>
    <div id="auto-list"><div style="text-align:center;opacity:.4;padding:40px">Loading…</div></div>
  </div>

  <!-- Create/Edit Modal -->
  <div id="auto-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);
    z-index:500;align-items:center;justify-content:center;padding:16px"
    onclick="if(event.target===this)autoCloseModal()">
    <div id="auto-modal-box" style="background:var(--card-bg,#1a1d27);border-radius:20px;
      width:min(580px,100%);max-height:90vh;overflow-y:auto;padding:24px;
      border:1px solid var(--card-border,#2a2d3a)"></div>
  </div>

  <!-- Log Modal -->
  <div id="auto-log-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);
    z-index:500;align-items:center;justify-content:center;padding:16px"
    onclick="if(event.target===this)autoCloseLog()">
    <div style="background:var(--card-bg,#1a1d27);border-radius:16px;width:min(520px,100%);
      max-height:80vh;overflow-y:auto;padding:20px;border:1px solid var(--card-border,#2a2d3a)">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <strong id="auto-log-title">Run Logs</strong>
        <button onclick="autoCloseLog()" style="background:none;border:none;cursor:pointer;opacity:.5;font-size:1.2rem">✕</button>
      </div>
      <div id="auto-log-content"></div>
    </div>
  </div>`;

  autoLoadList();
}

// ── List ──────────────────────────────────────────────────────────────────────

async function autoLoadList() {
  const res = await fetch('/api/automations').then(r=>r.json());
  _autoList = res.automations || [];
  const el = document.getElementById('auto-list');
  if (!el) return;

  if (!_autoList.length) {
    // Show quick-start templates
    const templates = [
      {name:'Morning Briefing', action_type:'briefing', trigger_type:'daily', daily_hour:8, daily_minute:0, output_channel:'telegram', description:'Full daily briefing every morning'},
      {name:'Hydration Reminder', action_type:'water_reminder', trigger_type:'interval', interval_min:60, output_channel:'inapp', description:'Drink water every hour'},
      {name:'Task Check', action_type:'task_check', trigger_type:'daily', daily_hour:9, daily_minute:0, output_channel:'inapp', description:'Daily task list review'},
      {name:'Sleep Reminder', action_type:'sleep_reminder', trigger_type:'daily', daily_hour:22, daily_minute:30, output_channel:'inapp', description:'Bedtime reminder'},
    ];
    el.innerHTML = `
      <div style="text-align:center;padding:32px 20px;background:var(--card-bg);border-radius:16px;margin-bottom:20px">
        <div style="font-size:3rem;margin-bottom:12px">⚙️</div>
        <div style="font-weight:600;margin-bottom:6px">No automations yet</div>
        <div style="opacity:.5;font-size:.85rem;margin-bottom:20px">Set up tasks that run automatically on schedule</div>
        <button onclick="autoOpenModal(null)" style="padding:10px 24px;border-radius:20px;border:none;
          background:var(--accent,#6366f1);color:#fff;cursor:pointer">+ Create automation</button>
      </div>
      <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;opacity:.4;margin-bottom:8px">
        ⚡ Quick start templates
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
        ${templates.map(t => {
          const def = AUTO_ACTIONS.find(a=>a.type===t.action_type)||{};
          return `<div onclick='autoCreateFromTemplate(${JSON.stringify(t).replace(/'/g,"&#39;")})'
            style="background:var(--card-bg);border:1px solid var(--card-border,#2a2d3a);border-radius:12px;
                   padding:14px;cursor:pointer;transition:border-color .15s"
            onmouseover="this.style.borderColor='var(--accent,#6366f1)'"
            onmouseout="this.style.borderColor='var(--card-border,#2a2d3a)'">
            <div style="font-size:1.4rem;margin-bottom:6px">${def.icon||'⚙️'}</div>
            <div style="font-weight:600;font-size:.88rem">${t.name}</div>
            <div style="font-size:.75rem;opacity:.5;margin-top:3px">${t.description}</div>
          </div>`;
        }).join('')}
      </div>`;
    return;
  }

  // Group by action category
  const byGroup = {};
  _autoList.forEach(a => {
    const def = AUTO_ACTIONS.find(x=>x.type===a.action_type)||{};
    const grp = def.group || '📋 Other';
    if (!byGroup[grp]) byGroup[grp] = [];
    byGroup[grp].push({...a, _def: def});
  });

  el.innerHTML = Object.entries(byGroup).map(([grp, items]) => `
    <div style="margin-bottom:20px">
      <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;
                  letter-spacing:.6px;opacity:.4;margin-bottom:8px">${grp}</div>
      ${items.map(a => _autoCard(a)).join('')}
    </div>`).join('');
}

async function autoCreateFromTemplate(t) {
  const r = await fetch('/api/automations', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({...t, action_config:{}})
  }).then(x=>x.json());
  if (r.ok) { toast('✅ Automation created', 'success'); autoLoadList(); }
}

function _autoCard(a) {
  const def      = a._def || AUTO_ACTIONS.find(x=>x.type===a.action_type)||{};
  const icon     = def.icon || '⚙️';
  const schedStr = _autoSchedStr(a);
  const lastRun  = a.last_run  ? _autoRelTime(a.last_run)       : 'Never';
  const nextRun  = a.next_run && a.enabled ? _autoRelTime(a.next_run, true) : '—';
  const chIcon   = {inapp:'🔔', telegram:'✈️', both:'🔔✈️'}[a.output_channel]||'🔔';

  return `
  <div style="background:var(--card-bg);border:1px solid var(--card-border,#2a2d3a);border-radius:14px;
    padding:16px;margin-bottom:8px;${!a.enabled?'opacity:.5':''}">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="font-size:1.6rem;min-width:36px;text-align:center">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <strong style="font-size:.95rem">${_ah(a.name)}</strong>
          <span style="font-size:.72rem;padding:2px 8px;border-radius:10px;
            background:${a.enabled?'rgba(34,197,94,.15)':'rgba(156,163,175,.12)'};
            color:${a.enabled?'#22c55e':'#6b7280'}">${a.enabled?'Active':'Paused'}</span>
          <span style="font-size:.75rem;opacity:.4">${chIcon}</span>
        </div>
        <div style="font-size:.8rem;opacity:.55;margin-top:3px">${_ah(a.description||def.desc||'')}</div>
        <div style="display:flex;gap:14px;margin-top:8px;font-size:.78rem;flex-wrap:wrap">
          <span style="opacity:.5">⏱ ${schedStr}</span>
          <span style="opacity:.5">Last: ${lastRun}</span>
          ${a.enabled && a.next_run ? `<span style="color:var(--accent,#6366f1)">Next: ${nextRun}</span>` : ''}
          ${a.run_count ? `<span style="opacity:.4">Ran ${a.run_count}×</span>` : ''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
        <button onclick="autoRunNow(${a.id})" title="Run now"
          style="padding:5px 9px;border-radius:8px;border:1px solid var(--border,#444);
                 background:transparent;cursor:pointer;font-size:.78rem;color:inherit">▶️</button>
        <button onclick="autoShowLogs(${a.id},'${_ah(a.name)}')" title="Logs"
          style="padding:5px 9px;border-radius:8px;border:1px solid var(--border,#444);
                 background:transparent;cursor:pointer;font-size:.78rem;color:inherit">📋</button>
        <button onclick="autoToggle(${a.id})" title="${a.enabled?'Pause':'Resume'}"
          style="padding:5px 9px;border-radius:8px;border:1px solid var(--border,#444);
                 background:transparent;cursor:pointer;font-size:.78rem;color:inherit">${a.enabled?'⏸':'▶'}</button>
        <button onclick="autoOpenModal(${a.id})" title="Edit"
          style="padding:5px 9px;border-radius:8px;border:1px solid var(--border,#444);
                 background:transparent;cursor:pointer;font-size:.78rem;color:inherit">✏️</button>
        <button onclick="autoDelete(${a.id})" title="Delete"
          style="padding:5px 9px;border-radius:8px;border:1px solid rgba(239,68,68,.3);
                 background:transparent;cursor:pointer;font-size:.78rem;color:#ef4444">🗑️</button>
      </div>
    </div>
  </div>`;
}

function _autoSchedStr(a) {
  if (a.trigger_type==='manual')   return 'Manual only';
  if (a.trigger_type==='interval') return `Every ${a.interval_min} min`;
  const t = `${String(a.daily_hour||8).padStart(2,'0')}:${String(a.daily_minute||0).padStart(2,'0')}`;
  if (a.trigger_type==='daily')    return `Daily ${t}`;
  if (a.trigger_type==='weekly')   return `${(WEEKDAYS[a.weekly_day||0]||'').slice(0,3)} ${t}`;
  return a.trigger_type;
}

function _autoRelTime(ts, future=false) {
  const d = new Date((ts+'').replace(' ','T')+'Z');
  const diff = Math.abs(Date.now() - d.getTime());
  const m = Math.floor(diff/60000);
  if (m < 2)  return future ? 'soon' : 'just now';
  if (m < 60) return future ? `in ${m}m` : `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return future ? `in ${h}h` : `${h}h ago`;
  return future ? `in ${Math.floor(h/24)}d` : `${Math.floor(h/24)}d ago`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function autoOpenModal(id) {
  _editingId = id;
  const found = id ? _autoList.find(a=>a.id===id) : null;
  _editData  = found ? {...found} : { trigger_type:'daily', daily_hour:8, daily_minute:0, output_channel:'inapp', action_type:'briefing', action_config:'{}' };
  _amTrigger = _editData.trigger_type || 'daily';
  _amChannel = _editData.output_channel || 'inapp';
  _amWeekDay = _editData.weekly_day || 0;
  _renderModal();
  document.getElementById('auto-modal').style.display = 'flex';
}

function autoCloseModal() {
  document.getElementById('auto-modal').style.display = 'none';
}

function _renderModal() {
  const d   = _editData;
  const cfg = typeof d.action_config==='string' ? JSON.parse(d.action_config||'{}') : (d.action_config||{});

  const actionGroups = {};
  AUTO_ACTIONS.forEach(a => {
    if (!actionGroups[a.group]) actionGroups[a.group] = [];
    actionGroups[a.group].push(a);
  });
  const actionOptions = Object.entries(actionGroups).map(([grp, acts]) =>
    `<optgroup label="${grp}">${acts.map(a =>
      `<option value="${a.type}" ${d.action_type===a.type?'selected':''}>${a.icon} ${a.label}</option>`
    ).join('')}</optgroup>`).join('');

  document.getElementById('auto-modal-box').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
      <h3 style="margin:0;font-size:1.1rem">${_editingId ? '✏️ Edit' : '+ New'} Automation</h3>
      <button onclick="autoCloseModal()" style="background:none;border:none;cursor:pointer;opacity:.5;font-size:1.3rem">✕</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      <div>
        <label style="font-size:.8rem;opacity:.6">Name *</label>
        <input id="am-name" value="${_ah(d.name||'')}" placeholder="e.g. Morning Routine"
          style="width:100%;margin-top:4px;padding:9px;border-radius:10px;border:1px solid var(--border,#444);
                 background:transparent;color:inherit;font-size:.9rem;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:.8rem;opacity:.6">Description</label>
        <input id="am-desc" value="${_ah(d.description||'')}" placeholder="Optional note"
          style="width:100%;margin-top:4px;padding:9px;border-radius:10px;border:1px solid var(--border,#444);
                 background:transparent;color:inherit;font-size:.9rem;box-sizing:border-box">
      </div>
    </div>

    <div style="margin-bottom:16px">
      <label style="font-size:.8rem;opacity:.6;display:block;margin-bottom:4px">Action *</label>
      <select id="am-action" onchange="_autoActionChange()"
        style="width:100%;padding:9px;border-radius:10px;border:1px solid var(--border,#444);
               background:var(--card-bg,#1a1d27);color:inherit;font-size:.9rem">
        ${actionOptions}
      </select>
      <div id="am-action-cfg" style="margin-top:8px"></div>
    </div>

    <div style="margin-bottom:16px">
      <label style="font-size:.8rem;opacity:.6;display:block;margin-bottom:6px">When to run</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
        ${Object.entries(AUTO_TRIGGER_LABELS).map(([k,v])=>`
          <button type="button" onclick="autoTrigToggle(this,'${k}')" data-trig="${k}"
            style="padding:6px 14px;border-radius:16px;font-size:.82rem;cursor:pointer;
                   border:1px solid var(--border,#444);
                   ${_amTrigger===k?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
            ${v}
          </button>`).join('')}
      </div>
      <div id="am-trigger-cfg"></div>
    </div>

    <div style="margin-bottom:20px">
      <label style="font-size:.8rem;opacity:.6;display:block;margin-bottom:6px">Send result to</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${CHANNELS.map(c=>`
          <button type="button" onclick="autoChanToggle(this,'${c.k}')" data-chan="${c.k}"
            style="padding:7px 14px;border-radius:16px;font-size:.82rem;cursor:pointer;
                   border:1px solid var(--border,#444);
                   ${_amChannel===c.k?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
            ${c.l}
          </button>`).join('')}
      </div>
    </div>

    <div style="display:flex;gap:8px">
      <button onclick="autoSave()" style="flex:1;padding:11px;border-radius:12px;border:none;
        background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:.95rem">
        ${_editingId ? '💾 Save' : '✅ Create'}
      </button>
      <button onclick="autoCloseModal()" style="padding:11px 18px;border-radius:12px;
        border:1px solid var(--border,#444);background:transparent;cursor:pointer;color:inherit">Cancel</button>
    </div>`;

  _renderTrigCfg(_amTrigger);
  _autoActionChange();
}

function autoTrigToggle(btn, t) {
  _amTrigger = t;
  document.querySelectorAll('[data-trig]').forEach(b => {
    const a = b.dataset.trig===t;
    b.style.background=a?'var(--accent,#6366f1)':'transparent';
    b.style.color=a?'#fff':'inherit';
    b.style.borderColor=a?'transparent':'var(--border,#444)';
  });
  _renderTrigCfg(t);
}

function autoChanToggle(btn, c) {
  _amChannel = c;
  document.querySelectorAll('[data-chan]').forEach(b => {
    const a = b.dataset.chan===c;
    b.style.background=a?'var(--accent,#6366f1)':'transparent';
    b.style.color=a?'#fff':'inherit';
    b.style.borderColor=a?'transparent':'var(--border,#444)';
  });
}

function autoWDToggle(btn, d) {
  _amWeekDay = d;
  document.querySelectorAll('[data-wd]').forEach(b => {
    const a=parseInt(b.dataset.wd)===d;
    b.style.background=a?'var(--accent,#6366f1)':'transparent';
    b.style.color=a?'#fff':'inherit';
    b.style.borderColor=a?'transparent':'var(--border,#444)';
  });
}

function _renderTrigCfg(t) {
  const d = _editData;
  const el = document.getElementById('am-trigger-cfg');
  if (!el) return;
  const inStyle = 'width:100%;margin-top:4px;padding:8px;border-radius:8px;border:1px solid var(--border,#444);background:transparent;color:inherit;box-sizing:border-box';

  if (t==='manual') {
    el.innerHTML = `<p style="font-size:.82rem;opacity:.5;margin:4px 0">Only runs when you click ▶️ Run Now.</p>`;
  } else if (t==='interval') {
    const opts = [5,10,15,20,30,45,60,90,120,180,360,720];
    el.innerHTML = `<label style="font-size:.8rem;opacity:.6">Repeat every</label>
      <select id="am-interval" style="${inStyle}">
        ${opts.map(m=>`<option value="${m}" ${(d.interval_min||30)===m?'selected':''}>${m<60?m+' min':m/60+'h'}</option>`).join('')}
      </select>`;
  } else if (t==='daily') {
    el.innerHTML = `<div style="display:flex;gap:8px">
      <div style="flex:1"><label style="font-size:.8rem;opacity:.6">Hour</label>
        <input id="am-hour" type="number" min="0" max="23" value="${d.daily_hour??8}" style="${inStyle}"></div>
      <div style="flex:1"><label style="font-size:.8rem;opacity:.6">Minute</label>
        <input id="am-minute" type="number" min="0" max="59" step="5" value="${d.daily_minute??0}" style="${inStyle}"></div>
    </div>`;
  } else if (t==='weekly') {
    el.innerHTML = `
      <label style="font-size:.8rem;opacity:.6;display:block;margin-bottom:4px">Day</label>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
        ${WEEKDAYS.map((w,i)=>`
          <button type="button" onclick="autoWDToggle(this,${i})" data-wd="${i}"
            style="padding:4px 10px;border-radius:10px;font-size:.78rem;cursor:pointer;
                   border:1px solid var(--border,#444);
                   ${(_amWeekDay)===i?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
            ${w.slice(0,3)}
          </button>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label style="font-size:.8rem;opacity:.6">Hour</label>
          <input id="am-hour" type="number" min="0" max="23" value="${d.daily_hour??8}" style="${inStyle}"></div>
        <div style="flex:1"><label style="font-size:.8rem;opacity:.6">Minute</label>
          <input id="am-minute" type="number" min="0" max="59" step="5" value="${d.daily_minute??0}" style="${inStyle}"></div>
      </div>`;
  }
}

function _autoActionChange() {
  const t   = document.getElementById('am-action')?.value;
  const cfg = typeof _editData.action_config==='string'
    ? JSON.parse(_editData.action_config||'{}') : (_editData.action_config||{});
  const el  = document.getElementById('am-action-cfg');
  if (!el) return;
  const def = AUTO_ACTIONS.find(a=>a.type===t);
  if (!def?.cfg?.length) { el.innerHTML=''; return; }
  const meta = { prompt:['💬 Prompt','e.g. Give me a motivational quote'], text:['📝 Text','e.g. Take a break!'], message:['✉️ Message','e.g. Good morning!'], name:['💊 Name','e.g. Vitamin D'], symbols:['📈 Symbols','e.g. BTC, AAPL'] };
  const inStyle = 'width:100%;margin-top:4px;padding:8px;border-radius:8px;border:1px solid var(--border,#444);background:transparent;color:inherit;font-size:.85rem;box-sizing:border-box';
  el.innerHTML = def.cfg.map(k => {
    const [lbl,ph] = meta[k]||[k,''];
    return `<div><label style="font-size:.8rem;opacity:.6">${lbl}</label>
      <input id="am-cfg-${k}" value="${_ah(String(cfg[k]||''))}" placeholder="${ph}" style="${inStyle}"></div>`;
  }).join('');
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function autoSave() {
  const name = document.getElementById('am-name')?.value.trim();
  if (!name) { toast('Name is required', 'error'); return; }
  const actionType = document.getElementById('am-action')?.value;
  const def = AUTO_ACTIONS.find(a=>a.type===actionType)||{};
  const cfg = {};
  (def.cfg||[]).forEach(k => { const v=document.getElementById(`am-cfg-${k}`)?.value.trim(); if(v) cfg[k]=v; });

  const payload = {
    name,
    description:   document.getElementById('am-desc')?.value.trim()||'',
    trigger_type:  _amTrigger,
    interval_min:  parseInt(document.getElementById('am-interval')?.value)||30,
    daily_hour:    parseInt(document.getElementById('am-hour')?.value)??8,
    daily_minute:  parseInt(document.getElementById('am-minute')?.value)??0,
    weekly_day:    _amWeekDay,
    action_type:   actionType,
    action_config: cfg,
    output_channel: _amChannel,
  };

  const url    = _editingId ? `/api/automations/${_editingId}` : '/api/automations';
  const method = _editingId ? 'PUT' : 'POST';
  const r = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(x=>x.json());
  if (r.ok) { toast(_editingId?'Updated ✓':'Created ✓','success'); autoCloseModal(); autoLoadList(); }
  else toast(r.error||'Error','error');
}

async function autoRunNow(id) {
  const r = await fetch(`/api/automations/${id}/run`,{method:'POST'}).then(x=>x.json());
  if (r.ok) { toast(`✅ ${(r.message||'Done').slice(0,100)}`,'success',4000); autoLoadList(); }
  else toast('Run failed','error');
}

async function autoToggle(id) {
  await fetch(`/api/automations/${id}/toggle`,{method:'PATCH'});
  autoLoadList();
}

async function autoDelete(id) {
  if (!confirm('Delete this automation?')) return;
  await fetch(`/api/automations/${id}`,{method:'DELETE'});
  autoLoadList();
}

// ── Logs ──────────────────────────────────────────────────────────────────────

async function autoShowLogs(id, name) {
  document.getElementById('auto-log-title').textContent = `📋 ${name}`;
  document.getElementById('auto-log-content').innerHTML = `<div style="opacity:.5;text-align:center;padding:20px">Loading…</div>`;
  document.getElementById('auto-log-modal').style.display = 'flex';
  const r = await fetch(`/api/automations/${id}/logs`).then(x=>x.json());
  const logs = r.logs||[];
  if (!logs.length) {
    document.getElementById('auto-log-content').innerHTML=`<div style="opacity:.4;text-align:center;padding:20px">No logs yet</div>`;
    return;
  }
  document.getElementById('auto-log-content').innerHTML = logs.map(l=>`
    <div style="padding:10px;border-bottom:1px solid var(--border,#333);font-size:.82rem">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:${l.status==='success'?'#22c55e':'#ef4444'}">${l.status==='success'?'✅':'❌'} ${l.status}</span>
        <span style="opacity:.4">${_autoRelTime(l.ran_at)}</span>
      </div>
      ${l.result?`<div style="opacity:.7;line-height:1.5">${_ah(l.result.slice(0,200))}</div>`:''}
    </div>`).join('');
}

function autoCloseLog() { document.getElementById('auto-log-modal').style.display='none'; }

function _ah(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
