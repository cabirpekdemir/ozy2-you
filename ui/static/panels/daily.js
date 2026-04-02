// OZY2 — Daily Diary Panel (photo + text, calendar-based)
'use strict';

let _diaryYear, _diaryMonth, _diarySelDay, _diaryPhotoData = null;

async function init_daily(el) {
  const now = new Date();
  _diaryYear   = now.getFullYear();
  _diaryMonth  = now.getMonth() + 1;
  _diarySelDay = null;
  _diaryPhotoData = null;

  el.innerHTML = `
<div style="max-width:900px;margin:0 auto;padding:16px">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <span style="font-size:2rem">📓</span>
    <div>
      <h2 style="margin:0;font-size:1.4rem">My Diary</h2>
      <p style="margin:0;opacity:.6;font-size:.85rem">A photo and note for every day</p>
    </div>
  </div>

  <!-- Two-column layout -->
  <div style="display:grid;grid-template-columns:1fr 1.1fr;gap:20px;align-items:start">

    <!-- LEFT: Calendar -->
    <div style="background:var(--card-bg);border-radius:16px;padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <button onclick="diaryCalNav(-1)" class="btn-icon">‹</button>
        <strong id="diary-cal-title" style="font-size:1rem"></strong>
        <button onclick="diaryCalNav(1)" class="btn-icon">›</button>
      </div>
      <div id="diary-cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center"></div>
    </div>

    <!-- RIGHT: Day detail / editor -->
    <div id="diary-day-panel" style="background:var(--card-bg);border-radius:16px;padding:16px;min-height:300px">
      <div style="text-align:center;opacity:.5;padding:40px 0">
        <div style="font-size:3rem">📅</div>
        <p>Select a day</p>
      </div>
    </div>

  </div>
</div>`;

  diaryRenderCalendar();
}

async function diaryRenderCalendar() {
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  document.getElementById('diary-cal-title').textContent =
    `${months[_diaryMonth-1]} ${_diaryYear}`;

  const res = await fetch(`/api/daily/calendar/${_diaryYear}/${_diaryMonth}`).then(r=>r.json());
  const summary = res.summary || {};

  const days = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  const today = new Date().toISOString().slice(0,10);

  const firstDay = new Date(_diaryYear, _diaryMonth-1, 1);
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0
  const daysInMonth = new Date(_diaryYear, _diaryMonth, 0).getDate();

  let html = days.map(d=>`<div style="font-size:.7rem;opacity:.5;padding:4px 0">${d}</div>`).join('');
  for (let i=0; i<startDow; i++) html += '<div></div>';

  for (let d=1; d<=daysInMonth; d++) {
    const ds = `${_diaryYear}-${String(_diaryMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === today;
    const isSel   = ds === _diarySelDay;
    const info    = summary[ds];

    let bg = 'transparent', border = 'none';
    if (isSel)        bg = 'var(--accent,#6366f1)';
    else if (isToday) border = '2px solid var(--accent,#6366f1)';

    html += `<div onclick="diarySelectDay('${ds}')" style="
      cursor:pointer;padding:4px 2px;border-radius:8px;
      background:${bg};border:${border};
      font-weight:${isToday?'700':'400'};
      font-size:.85rem;min-height:44px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      ${isSel?'color:#fff':''}">
      <span>${d}</span>
      ${info ? `<span style="font-size:.7rem;line-height:1">${info.has_photo?'📷':'✏️'}</span>` : ''}
    </div>`;
  }

  document.getElementById('diary-cal-grid').innerHTML = html;
}

function diaryCalNav(dir) {
  _diaryMonth += dir;
  if (_diaryMonth > 12) { _diaryMonth = 1; _diaryYear++; }
  if (_diaryMonth < 1)  { _diaryMonth = 12; _diaryYear--; }
  diaryRenderCalendar();
}

async function diarySelectDay(dateStr) {
  _diarySelDay = dateStr;
  _diaryPhotoData = null;
  diaryRenderCalendar();

  const panel = document.getElementById('diary-day-panel');
  panel.innerHTML = `<div style="text-align:center;padding:20px;opacity:.5">Loading…</div>`;

  const res = await fetch(`/api/daily/entry/${dateStr}`).then(r=>r.json());
  const entry = res.entry;

  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US',
    {day:'numeric', month:'long', year:'numeric', weekday:'long'});

  if (entry) _diaryPhotoData = entry.photo_data || null;

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <strong style="font-size:1rem">${label}</strong>
      ${entry ? `<button onclick="diaryDeleteEntry('${dateStr}')" style="background:none;border:none;cursor:pointer;font-size:1.1rem;opacity:.5" title="Delete">🗑️</button>` : ''}
    </div>

    <!-- Photo area -->
    <div id="diary-photo-wrap" style="margin-bottom:14px">
      ${entry?.photo_data
        ? `<img src="${entry.photo_data}" onclick="diaryOpenLightbox('${entry.photo_data}')"
             style="max-width:100%;max-height:220px;border-radius:10px;cursor:pointer;object-fit:cover;display:block;margin:0 auto">`
        : `<div style="border:2px dashed var(--border,#333);border-radius:10px;padding:18px;text-align:center">
             <div style="font-size:2rem;margin-bottom:10px">📷</div>
             <div style="display:flex;justify-content:center;gap:8px">
               <button onclick="cameraOpen(b=>diarySetPhoto(null,b))"
                 style="cursor:pointer;padding:7px 14px;border-radius:20px;
                        border:1px solid var(--border,#444);font-size:.82rem;
                        background:var(--card-bg,transparent);color:inherit">
                 📷 Camera
               </button>
               <label style="cursor:pointer;padding:7px 14px;border-radius:20px;
                             border:1px solid var(--border,#444);font-size:.82rem;
                             background:var(--card-bg,transparent)">
                 🖼️ Gallery
                 <input type="file" accept="image/*" style="display:none" onchange="diaryPhotoSelected(this)">
               </label>
             </div>
           </div>`
      }
      ${entry?.photo_data
        ? `<div style="display:flex;justify-content:center;gap:8px;margin-top:8px">
             <button onclick="cameraOpen(b=>diarySetPhoto(null,b))"
               style="cursor:pointer;font-size:.8rem;opacity:.6;padding:4px 12px;
                      border-radius:16px;border:1px solid var(--border,#444);
                      background:transparent;color:inherit">
               📷 Camera
             </button>
             <label style="cursor:pointer;font-size:.8rem;opacity:.6;padding:4px 12px;
                           border-radius:16px;border:1px solid var(--border,#444)">
               🖼️ Gallery
               <input type="file" accept="image/*" style="display:none" onchange="diaryPhotoSelected(this)">
             </label>
           </div>`
        : ''}
    </div>

    <!-- Note -->
    <textarea id="diary-note" placeholder="How was your day? What happened?…"
      style="width:100%;min-height:120px;resize:vertical;border-radius:10px;
             border:1px solid var(--border,#333);background:transparent;
             color:inherit;padding:10px;font-size:.9rem;font-family:inherit;box-sizing:border-box"
    >${entry?.note || ''}</textarea>

    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="diarySave('${dateStr}')"
        style="flex:1;padding:10px;border-radius:10px;border:none;
               background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:.95rem">
        💾 Save
      </button>
    </div>
  `;
}

function diaryPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  compressFileToBase64(file, b64 => diarySetPhoto(null, b64));
}

function diarySetPhoto(file, b64) {
  if (file) { compressFileToBase64(file, b2 => diarySetPhoto(null, b2)); return; }
  _diaryPhotoData = b64;
  const wrap = document.getElementById('diary-photo-wrap');
  if (wrap) wrap.innerHTML = `
    <img src="${b64}" onclick="diaryOpenLightbox('${b64}')"
      style="max-width:100%;max-height:220px;border-radius:10px;cursor:pointer;object-fit:cover;display:block;margin:0 auto">
    <div style="display:flex;justify-content:center;gap:8px;margin-top:8px">
      <button onclick="cameraOpen(b=>diarySetPhoto(null,b))"
        style="cursor:pointer;font-size:.8rem;opacity:.6;padding:4px 12px;
               border-radius:16px;border:1px solid var(--border,#444);background:transparent;color:inherit">
        📷 Camera
      </button>
      <label style="cursor:pointer;font-size:.8rem;opacity:.6;padding:4px 12px;border-radius:16px;border:1px solid var(--border,#444)">
        🖼️ Gallery<input type="file" accept="image/*" style="display:none" onchange="diaryPhotoSelected(this)">
      </label>
    </div>`;
}

async function diarySave(dateStr) {
  const note = document.getElementById('diary-note')?.value || '';
  await fetch('/api/daily/entry', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ entry_date: dateStr, photo_data: _diaryPhotoData || '', note })
  });
  diaryRenderCalendar();
  diarySelectDay(dateStr);
}

async function diaryDeleteEntry(dateStr) {
  if (!confirm('Delete this diary entry?')) return;
  await fetch(`/api/daily/entry/${dateStr}`, { method: 'DELETE' });
  _diarySelDay = null; _diaryPhotoData = null;
  const panel = document.getElementById('diary-day-panel');
  if (panel) panel.innerHTML = `<div style="text-align:center;opacity:.5;padding:40px 0"><div style="font-size:3rem">📅</div><p>Select a day</p></div>`;
  diaryRenderCalendar();
}

function diaryOpenLightbox(src) {
  let lb = document.getElementById('diary-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'diary-lightbox';
    lb.onclick = diaryCloseLightbox;
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    document.body.appendChild(lb);
  }
  lb.innerHTML = `<img src="${src}" style="max-width:95vw;max-height:92vh;border-radius:10px;object-fit:contain">`;
  lb.style.display = 'flex';
}
function diaryCloseLightbox() {
  const lb = document.getElementById('diary-lightbox');
  if (lb) lb.style.display = 'none';
}
