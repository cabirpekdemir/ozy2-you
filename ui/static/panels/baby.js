/* OZY2 — Baby Tracker (Calendar + Photo) */

const BABY_EVENTS = {
  feed:        { icon:'🍼', label:'Feed',     valuePlaceholder:'Amount (ml)' },
  sleep_start: { icon:'😴', label:'Sleep',    valuePlaceholder:null },
  sleep_end:   { icon:'⏰', label:'Wake up',  valuePlaceholder:null },
  diaper:      { icon:'💩', label:'Diaper',   valuePlaceholder:'wet / dirty / both' },
  weight:      { icon:'⚖️', label:'Weight',   valuePlaceholder:'3.8 kg' },
  vaccine:     { icon:'💉', label:'Vaccine',  valuePlaceholder:'BCG, Hep B…' },
  photo:       { icon:'📷', label:'Photo',    valuePlaceholder:'Caption…' },
  note:        { icon:'📝', label:'Note',     valuePlaceholder:'What happened?' },
};

// ── State ─────────────────────────────────────────────────────────────────────
let _babyProfile    = null;
let _babyCalYear    = new Date().getFullYear();
let _babyCalMonth   = new Date().getMonth() + 1;  // 1-12
let _babySelDay     = null;
let _babyLogType    = null;
let _babyPhotoData  = '';   // base64 data URL for current log

// ── Init ──────────────────────────────────────────────────────────────────────
function init_baby(el) {
  el.innerHTML = `
  <div style="max-width:800px;margin:0 auto;padding:16px">

    <!-- Profile Setup -->
    <div id="baby-setup" style="display:none;background:var(--card-bg);border:1px solid var(--card-border);
         border-radius:var(--r-lg);padding:36px;text-align:center;margin-bottom:20px">
      <div style="font-size:56px;margin-bottom:12px">👶</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:6px">Set up baby profile</div>
      <div style="color:var(--text-3);font-size:13px;margin-bottom:24px">Track feeds, sleep, diapers and memories</div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:320px;margin:0 auto">
        <input id="baby-name-input" placeholder="Baby's name" type="text"
          style="background:var(--bg-base,#0e1018);border:1px solid var(--card-border);border-radius:10px;
                 padding:10px 14px;color:var(--text-1);font-size:14px;outline:none">
        <input id="baby-birth-input" type="date"
          style="background:var(--bg-base,#0e1018);border:1px solid var(--card-border);border-radius:10px;
                 padding:10px 14px;color:var(--text-1);font-size:14px;outline:none">
        <button onclick="babySaveProfile()"
          style="background:var(--accent);color:#fff;border:none;border-radius:10px;
                 padding:11px;font-size:14px;font-weight:600;cursor:pointer">Create Profile →</button>
      </div>
    </div>

    <!-- Main tracker (hidden until profile exists) -->
    <div id="baby-main" style="display:none">

      <!-- Profile header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:36px">👶</div>
          <div>
            <div id="baby-hdr-name" style="font-size:18px;font-weight:700"></div>
            <div id="baby-hdr-age"  style="font-size:12px;color:var(--text-3)"></div>
          </div>
        </div>
        <div style="display:flex;gap:16px;text-align:center">
          <div><div id="stat-feeds"   style="font-size:20px;font-weight:700;color:#f59e0b">—</div><div style="font-size:10px;color:var(--text-3)">feeds today</div></div>
          <div><div id="stat-diapers" style="font-size:20px;font-weight:700;color:#f59e0b">—</div><div style="font-size:10px;color:var(--text-3)">diapers</div></div>
          <div><div id="stat-sleep"   style="font-size:20px;font-weight:700;color:#f59e0b">—</div><div style="font-size:10px;color:var(--text-3)">sleep</div></div>
          <button onclick="babyShowSetup()"
            style="background:transparent;border:1px solid var(--card-border);border-radius:8px;
                   padding:4px 12px;font-size:11px;color:var(--text-3);cursor:pointer;align-self:center">✏️ Edit</button>
        </div>
      </div>

      <!-- Quick log buttons -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
        ${Object.entries(BABY_EVENTS).map(([type,ev])=>`
          <button onclick="babyStartLog('${type}')"
            style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:8px;
                   padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;color:var(--text-1)">
            ${ev.icon} ${ev.label}
          </button>`).join('')}
      </div>

      <!-- Log form (hidden until triggered) -->
      <div id="baby-log-form" style="display:none;background:var(--card-bg);border:1px solid var(--card-border);
           border-radius:var(--r-lg);padding:16px;margin-bottom:16px">
        <div id="baby-log-title" style="font-size:14px;font-weight:600;margin-bottom:12px"></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="baby-log-value" type="text" placeholder=""
            style="background:var(--bg-base,#0e1018);border:1px solid var(--card-border);border-radius:8px;
                   padding:8px 12px;color:var(--text-1);font-size:13px;outline:none"
            onkeydown="if(event.key==='Enter') babySubmitLog()">
          <input id="baby-log-note" type="text" placeholder="Note (optional)"
            style="background:var(--bg-base,#0e1018);border:1px solid var(--card-border);border-radius:8px;
                   padding:8px 12px;color:var(--text-1);font-size:13px;outline:none"
            onkeydown="if(event.key==='Enter') babySubmitLog()">
          <!-- Photo attach -->
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;
                          background:var(--bg-base,#0e1018);border:1px dashed var(--card-border);
                          border-radius:8px;padding:7px 11px;font-size:12px;color:var(--text-3)">
              📷 Kamera
              <input type="file" accept="image/*" capture="environment" id="baby-photo-input"
                style="display:none" onchange="babyPhotoSelected(this)">
            </label>
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;
                          background:var(--bg-base,#0e1018);border:1px dashed var(--card-border);
                          border-radius:8px;padding:7px 11px;font-size:12px;color:var(--text-3)">
              🖼️ Galeri
              <input type="file" accept="image/*" id="baby-photo-input-gallery"
                style="display:none" onchange="babyPhotoSelected(this)">
            </label>
            <div id="baby-photo-preview" style="display:none">
              <img id="baby-photo-thumb" style="height:40px;width:40px;object-fit:cover;border-radius:6px">
              <button onclick="babyClearPhoto()" style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:13px">✕</button>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="babySubmitLog()"
              style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;
                     padding:9px;font-size:13px;font-weight:600;cursor:pointer">Save</button>
            <button onclick="babyCloseLogForm()"
              style="background:transparent;border:none;color:var(--text-3);font-size:22px;cursor:pointer">✕</button>
          </div>
        </div>
      </div>

      <!-- Two-column: Calendar | Day detail -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" id="baby-grid">

        <!-- Calendar -->
        <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-lg);padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <button onclick="babyCalNav(-1)"
              style="background:none;border:none;color:var(--text-2);font-size:18px;cursor:pointer;padding:0 6px">‹</button>
            <div id="baby-cal-title" style="font-size:14px;font-weight:600"></div>
            <button onclick="babyCalNav(1)"
              style="background:none;border:none;color:var(--text-2);font-size:18px;cursor:pointer;padding:0 6px">›</button>
          </div>
          <!-- Day-of-week headers -->
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
            ${['S','M','T','W','T','F','S'].map(d=>`
              <div style="text-align:center;font-size:10px;font-weight:600;color:var(--text-3);padding:2px">${d}</div>`).join('')}
          </div>
          <div id="baby-cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px"></div>
        </div>

        <!-- Day detail -->
        <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-lg);padding:14px;overflow-y:auto;max-height:380px">
          <div id="baby-day-header" style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text-3)">
            ← Select a day
          </div>
          <div id="baby-day-events"></div>
        </div>

      </div><!-- /grid -->

    </div><!-- /baby-main -->

    <!-- Lightbox -->
    <div id="baby-lightbox" onclick="babyCloseLightbox()"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;
             align-items:center;justify-content:center">
      <img id="baby-lightbox-img" style="max-width:90vw;max-height:90vh;border-radius:10px;box-shadow:0 8px 40px rgba(0,0,0,.5)">
    </div>

  </div>`;

  babyLoad();
}

// ── Load ──────────────────────────────────────────────────────────────────────
async function babyLoad() {
  try {
    const [pr, st] = await Promise.all([
      fetch('/api/baby/profile').then(r=>r.json()),
      fetch('/api/baby/stats').then(r=>r.json()),
    ]);
    if (pr.profile) {
      _babyProfile = pr.profile;
      document.getElementById('baby-setup').style.display = 'none';
      document.getElementById('baby-main').style.display  = '';
      document.getElementById('baby-hdr-name').textContent = pr.profile.name;
      document.getElementById('baby-hdr-age').textContent  = babyAge(pr.profile.birth_date);
      document.getElementById('stat-feeds').textContent    = st.today_feed_count   ?? '—';
      document.getElementById('stat-diapers').textContent  = st.today_diaper_count ?? '—';
      const slMin = st.total_sleep_today_min || 0;
      document.getElementById('stat-sleep').textContent    = slMin ? (Math.floor(slMin/60)+'h'+(slMin%60?slMin%60+'m':'')) : '—';
      babyRenderCalendar();
      // Auto-select today
      const todayStr = new Date().toISOString().slice(0,10);
      babySelectDay(todayStr);
    } else {
      babyShowSetup();
    }
  } catch {}
}

// ── Profile ───────────────────────────────────────────────────────────────────
function babyShowSetup() {
  document.getElementById('baby-setup').style.display = '';
  document.getElementById('baby-main').style.display  = 'none';
}

async function babySaveProfile() {
  const name  = document.getElementById('baby-name-input').value.trim();
  const birth = document.getElementById('baby-birth-input').value;
  if (!name || !birth) return;
  await fetch('/api/baby/profile', {method:'POST',headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name, birth_date: birth})});
  babyLoad();
}

// ── Calendar ──────────────────────────────────────────────────────────────────
let _calSummary = {};

async function babyRenderCalendar() {
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  document.getElementById('baby-cal-title').textContent =
    `${monthNames[_babyCalMonth-1]} ${_babyCalYear}`;

  // Fetch month summary
  try {
    const d = await fetch(`/api/baby/calendar/${_babyCalYear}/${_babyCalMonth}`).then(r=>r.json());
    _calSummary = d.summary || {};
  } catch { _calSummary = {}; }

  const grid  = document.getElementById('baby-cal-grid');
  const today = new Date().toISOString().slice(0,10);

  // First day of month (0=Sun)
  const firstDOW = new Date(_babyCalYear, _babyCalMonth-1, 1).getDay();
  const daysInMonth = new Date(_babyCalYear, _babyCalMonth, 0).getDate();

  let html = '';
  // Empty cells before 1st
  for (let i = 0; i < firstDOW; i++) html += '<div></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${_babyCalYear}-${String(_babyCalMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday  = dateStr === today;
    const isSel    = dateStr === _babySelDay;
    const dayData  = _calSummary[dateStr] || {};
    const hasData  = Object.keys(dayData).length > 0;
    const feeds    = dayData['feed']    || 0;
    const diapers  = dayData['diaper']  || 0;
    const hasPhoto = dayData['photo']   || 0;

    html += `
      <div onclick="babySelectDay('${dateStr}')"
        style="aspect-ratio:1;border-radius:8px;padding:3px;cursor:pointer;font-size:10px;
               display:flex;flex-direction:column;align-items:center;justify-content:center;
               background:${isSel ? 'var(--accent)' : isToday ? 'rgba(99,102,241,.15)' : hasData ? 'rgba(245,158,11,.08)' : 'transparent'};
               border:1px solid ${isSel ? 'var(--accent)' : isToday ? 'rgba(99,102,241,.4)' : 'transparent'};
               transition:.1s">
        <div style="font-size:11px;font-weight:${isToday?700:500};color:${isSel?'#fff':'var(--text-1)'}">${d}</div>
        ${hasData ? `<div style="font-size:8px;color:${isSel?'rgba(255,255,255,.8)':'var(--text-3)'};line-height:1.3">
          ${feeds?'🍼':''}${diapers?'💩':''}${hasPhoto?'📷':''}
        </div>` : ''}
      </div>`;
  }
  grid.innerHTML = html;
}

async function babyCalNav(dir) {
  _babyCalMonth += dir;
  if (_babyCalMonth > 12) { _babyCalMonth = 1;  _babyCalYear++; }
  if (_babyCalMonth < 1)  { _babyCalMonth = 12; _babyCalYear--; }
  await babyRenderCalendar();
}

// ── Day detail ────────────────────────────────────────────────────────────────
async function babySelectDay(dateStr) {
  _babySelDay = dateStr;
  babyRenderCalendar();  // re-highlight

  const hdr = document.getElementById('baby-day-header');
  const el  = document.getElementById('baby-day-events');
  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US',
    {weekday:'short', month:'short', day:'numeric'});
  hdr.textContent = label;
  el.innerHTML = '<div style="color:var(--text-3);font-size:12px">Loading…</div>';

  try {
    const d = await fetch(`/api/baby/events/day/${dateStr}`).then(r=>r.json());
    babyRenderDayEvents(d.events || [], el);
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);font-size:12px">Error loading events.</div>';
  }
}

function babyRenderDayEvents(events, el) {
  if (!events.length) {
    el.innerHTML = '<div style="color:var(--text-3);font-size:12px;padding:16px 0;text-align:center">No events this day</div>';
    return;
  }
  el.innerHTML = events.map(ev => {
    const def   = BABY_EVENTS[ev.event_type] || {icon:'📌', label: ev.event_type};
    const time  = ev.created_at ? ev.created_at.slice(11,16) : '';
    const photo = ev.photo_data ? `
      <img src="${ev.photo_data}" onclick="babyOpenLightbox('${ev.photo_data.replace(/'/g,"\\'")}', event)"
        style="margin-top:8px;width:100%;max-height:160px;object-fit:cover;
               border-radius:8px;cursor:zoom-in">` : '';
    return `
      <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--card-border)">
        <div style="font-size:18px;width:24px;text-align:center;padding-top:1px">${def.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:baseline;gap:6px">
            <span style="font-size:12px;font-weight:600">${def.label}</span>
            ${ev.value ? `<span style="font-size:11px;color:var(--text-3)">${ev.value}</span>` : ''}
            <span style="font-size:10px;color:var(--text-3);margin-left:auto">${time}</span>
          </div>
          ${ev.note ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${ev.note}</div>` : ''}
          ${photo}
        </div>
        <button onclick="babyDeleteEvent(${ev.id})"
          style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:13px;align-self:flex-start;padding:0 4px">✕</button>
      </div>`;
  }).join('');
}

// ── Log form ──────────────────────────────────────────────────────────────────
function babyStartLog(type) {
  _babyLogType  = type;
  _babyPhotoData = '';
  const def = BABY_EVENTS[type];
  const form = document.getElementById('baby-log-form');
  document.getElementById('baby-log-title').textContent = def.icon + ' ' + def.label;
  const valInput = document.getElementById('baby-log-value');
  valInput.placeholder = def.valuePlaceholder || '';
  valInput.style.display = def.valuePlaceholder ? '' : 'none';
  valInput.value = '';
  document.getElementById('baby-log-note').value = '';
  babyClearPhoto();
  form.style.display = '';
  if (def.valuePlaceholder) valInput.focus();
}

function babyCloseLogForm() {
  document.getElementById('baby-log-form').style.display = 'none';
  babyClearPhoto();
}

function babyPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    // Compress via canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1200;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else       { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      _babyPhotoData = canvas.toDataURL('image/jpeg', 0.75);
      document.getElementById('baby-photo-thumb').src = _babyPhotoData;
      document.getElementById('baby-photo-preview').style.display = 'flex';
      document.getElementById('baby-photo-preview').style.alignItems = 'center';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function babyClearPhoto() {
  _babyPhotoData = '';
  document.getElementById('baby-photo-preview').style.display = 'none';
  document.getElementById('baby-photo-input').value = '';
}

async function babySubmitLog() {
  const value = document.getElementById('baby-log-value').value.trim();
  const note  = document.getElementById('baby-log-note').value.trim();
  babyCloseLogForm();
  await fetch('/api/baby/event', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({event_type: _babyLogType, value, note, photo_data: _babyPhotoData}),
  });
  // Refresh stats + today's day view + calendar
  const todayStr = new Date().toISOString().slice(0,10);
  const st = await fetch('/api/baby/stats').then(r=>r.json());
  document.getElementById('stat-feeds').textContent    = st.today_feed_count   ?? '—';
  document.getElementById('stat-diapers').textContent  = st.today_diaper_count ?? '—';
  const slMin = st.total_sleep_today_min || 0;
  document.getElementById('stat-sleep').textContent    = slMin ? (Math.floor(slMin/60)+'h'+(slMin%60?slMin%60+'m':'')) : '—';
  await babyRenderCalendar();
  if (_babySelDay) await babySelectDay(_babySelDay);
}

async function babyDeleteEvent(id) {
  await fetch('/api/baby/event/'+id, {method:'DELETE'});
  await babyRenderCalendar();
  if (_babySelDay) await babySelectDay(_babySelDay);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function babyAge(birthDate) {
  if (!birthDate) return '';
  const days = Math.floor((Date.now() - new Date(birthDate)) / 86400000);
  if (days < 0)    return '';
  if (days === 0)  return 'born today 🎉';
  if (days < 30)   return days + ' days old';
  if (days < 365)  return Math.floor(days/30) + ' months old';
  const y = Math.floor(days/365);
  return y + ' year' + (y > 1 ? 's' : '') + ' old';
}

function babyOpenLightbox(src, e) {
  e.stopPropagation();
  document.getElementById('baby-lightbox-img').src = src;
  document.getElementById('baby-lightbox').style.display = 'flex';
}

function babyCloseLightbox() {
  document.getElementById('baby-lightbox').style.display = 'none';
}
