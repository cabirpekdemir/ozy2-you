/* OZY2 — Baby Tracker Panel */

const BABY_EVENTS = {
  feed:        { icon:'🍼', label:'Feed',    valuePlaceholder:'150 ml' },
  sleep_start: { icon:'😴', label:'Sleep',   valuePlaceholder:null },
  sleep_end:   { icon:'⏰', label:'Wake up', valuePlaceholder:null },
  diaper:      { icon:'💩', label:'Diaper',  valuePlaceholder:'wet / dirty / both' },
  weight:      { icon:'⚖️', label:'Weight',  valuePlaceholder:'3.8 kg' },
  vaccine:     { icon:'💉', label:'Vaccine', valuePlaceholder:'BCG' },
  note:        { icon:'📝', label:'Note',    valuePlaceholder:'Smiled today!' },
};

function babyTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff/60) + ' min ago';
  if (diff < 86400) return Math.floor(diff/3600) + ' hr ago';
  if (diff < 172800) return 'yesterday';
  return Math.floor(diff/86400) + ' days ago';
}

function babyAge(birthDate) {
  if (!birthDate) return '';
  const days = Math.floor((Date.now() - new Date(birthDate)) / 86400000);
  if (days < 30)  return days + ' days old';
  if (days < 365) return Math.floor(days/30) + ' months old';
  return Math.floor(days/365) + ' years old';
}

function init_baby(el) {
  el.innerHTML = `
    <div style="max-width:680px;margin:0 auto;padding:16px">

      <!-- Setup -->
      <div id="baby-setup" style="display:none;background:var(--card-bg);border:1px solid var(--card-border);
           border-radius:var(--r-lg);padding:32px;text-align:center;margin-bottom:20px">
        <div style="font-size:52px;margin-bottom:12px">👶</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:4px">Set up baby profile</div>
        <div style="color:var(--text-3);font-size:13px;margin-bottom:20px">Track feeds, sleep, diapers & more</div>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto">
          <input id="baby-name-input" placeholder="Baby's name" type="text"
            style="background:var(--bg-base,#0e1018);border:1px solid var(--card-border);border-radius:10px;
                   padding:10px 14px;color:var(--text-1);font-size:14px;outline:none">
          <input id="baby-birth-input" type="date"
            style="background:var(--bg-base,#0e1018);border:1px solid var(--card-border);border-radius:10px;
                   padding:10px 14px;color:var(--text-1);font-size:14px;outline:none">
          <button onclick="babySaveProfile()"
            style="background:var(--accent);color:#fff;border:none;border-radius:10px;
                   padding:11px;font-size:14px;font-weight:600;cursor:pointer">Save Profile</button>
        </div>
      </div>

      <!-- Profile card + stats -->
      <div id="baby-profile-card" style="display:none;background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(249,115,22,.1));
           border:1px solid rgba(245,158,11,.3);border-radius:var(--r-lg);padding:16px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="font-size:38px">👶</div>
            <div>
              <div id="baby-profile-name" style="font-size:18px;font-weight:700"></div>
              <div id="baby-profile-age"  style="font-size:13px;color:var(--text-3)"></div>
            </div>
          </div>
          <div style="display:flex;gap:20px;text-align:center">
            <div><div id="stat-feeds"   style="font-size:22px;font-weight:700;color:#f59e0b">0</div><div style="font-size:11px;color:var(--text-3)">feeds</div></div>
            <div><div id="stat-diapers" style="font-size:22px;font-weight:700;color:#f59e0b">0</div><div style="font-size:11px;color:var(--text-3)">diapers</div></div>
            <div><div id="stat-sleep"   style="font-size:22px;font-weight:700;color:#f59e0b">0h</div><div style="font-size:11px;color:var(--text-3)">sleep</div></div>
          </div>
          <button onclick="babyShowSetup()"
            style="background:transparent;color:var(--text-3);border:1px solid var(--card-border);
                   border-radius:8px;padding:5px 12px;font-size:12px;cursor:pointer">Edit</button>
        </div>
      </div>

      <!-- Quick action buttons -->
      <div id="baby-actions" style="display:none">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          ${Object.entries(BABY_EVENTS).map(([type,ev])=>`
            <button onclick="babyLog('${type}')"
              style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:10px;
                     padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;color:var(--text-1)">
              ${ev.icon} ${ev.label}
            </button>`).join('')}
        </div>

        <!-- Inline value form -->
        <div id="baby-log-form" style="display:none;background:var(--card-bg);border:1px solid var(--card-border);
             border-radius:var(--r-lg);padding:14px;margin-bottom:14px">
          <div id="baby-log-title" style="font-size:14px;font-weight:600;margin-bottom:10px"></div>
          <div style="display:flex;gap:8px">
            <input id="baby-log-value" type="text"
              style="flex:1;background:var(--bg-base,#0e1018);border:1px solid var(--card-border);
                     border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;outline:none"
              onkeydown="if(event.key==='Enter') babySubmitLog()">
            <button onclick="babySubmitLog()"
              style="background:var(--accent);color:#fff;border:none;border-radius:8px;
                     padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer">Log</button>
            <button onclick="document.getElementById('baby-log-form').style.display='none'"
              style="background:transparent;border:none;color:var(--text-3);font-size:18px;cursor:pointer">✕</button>
          </div>
        </div>

        <!-- Event feed -->
        <div id="baby-events-list" style="display:flex;flex-direction:column;gap:8px"></div>
      </div>
    </div>`;
  babyLoad();
}

let _babyCurrentType = null;

async function babyLoad() {
  try {
    const [pr, ev, st] = await Promise.all([
      fetch('/api/baby/profile').then(r=>r.json()),
      fetch('/api/baby/events?limit=30').then(r=>r.json()),
      fetch('/api/baby/stats').then(r=>r.json()),
    ]);
    if (pr.profile) {
      document.getElementById('baby-setup').style.display = 'none';
      document.getElementById('baby-profile-card').style.display = '';
      document.getElementById('baby-actions').style.display = '';
      document.getElementById('baby-profile-name').textContent = pr.profile.name;
      document.getElementById('baby-profile-age').textContent  = babyAge(pr.profile.birth_date);
      document.getElementById('stat-feeds').textContent   = st.today_feed_count   || 0;
      document.getElementById('stat-diapers').textContent = st.today_diaper_count || 0;
      document.getElementById('stat-sleep').textContent   = Math.round((st.total_sleep_today_min||0)/6)/10 + 'h';
      babyRenderEvents(ev.events || []);
    } else {
      babyShowSetup();
    }
  } catch {}
}

function babyShowSetup() {
  document.getElementById('baby-setup').style.display        = '';
  document.getElementById('baby-profile-card').style.display = 'none';
  document.getElementById('baby-actions').style.display      = 'none';
}

function babyRenderEvents(events) {
  const el = document.getElementById('baby-events-list');
  if (!events.length) {
    el.innerHTML = '<div style="color:var(--text-3);font-size:13px;text-align:center;padding:24px">No events yet. Use the buttons above to log!</div>';
    return;
  }
  el.innerHTML = events.map(ev => {
    const def = BABY_EVENTS[ev.event_type] || {icon:'📌', label:ev.event_type};
    return `
      <div style="display:flex;align-items:center;gap:12px;background:var(--card-bg);
                  border:1px solid var(--card-border);border-radius:10px;padding:12px 14px">
        <div style="font-size:22px">${def.icon}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${def.label}${ev.value?' — '+ev.value:''}</div>
          ${ev.note?`<div style="font-size:12px;color:var(--text-3)">${ev.note}</div>`:''}
        </div>
        <div style="font-size:11px;color:var(--text-3);white-space:nowrap">${babyTimeAgo(ev.created_at)}</div>
        <button onclick="babyDeleteEvent(${ev.id})"
          style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:14px;padding:2px 6px">✕</button>
      </div>`;
  }).join('');
}

function babyLog(type) {
  _babyCurrentType = type;
  const def = BABY_EVENTS[type];
  if (def.valuePlaceholder) {
    document.getElementById('baby-log-title').textContent = def.icon + ' ' + def.label;
    const inp = document.getElementById('baby-log-value');
    inp.placeholder = def.valuePlaceholder;
    inp.value = '';
    document.getElementById('baby-log-form').style.display = '';
    inp.focus();
  } else {
    _babySubmit('');
  }
}

async function babySubmitLog() {
  const val = document.getElementById('baby-log-value').value.trim();
  document.getElementById('baby-log-form').style.display = 'none';
  _babySubmit(val);
}

async function _babySubmit(value) {
  await fetch('/api/baby/event', {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({event_type: _babyCurrentType, value})});
  babyLoad();
}

async function babyDeleteEvent(id) {
  await fetch('/api/baby/event/'+id, {method:'DELETE'});
  babyLoad();
}

async function babySaveProfile() {
  const name  = document.getElementById('baby-name-input').value.trim();
  const birth = document.getElementById('baby-birth-input').value;
  if (!name || !birth) { alert('Please enter name and birth date.'); return; }
  await fetch('/api/baby/profile', {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name, birth_date: birth})});
  babyLoad();
}
