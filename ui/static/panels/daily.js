// OZY2 — Daily Diary Panel (photo + text, calendar-based)
'use strict';

let _diaryYear, _diaryMonth, _diarySelDay, _diaryPhotoData = null;

async function init_daily(el) {
  const now = new Date();
  _diaryYear  = now.getFullYear();
  _diaryMonth = now.getMonth() + 1;
  _diarySelDay = null;
  _diaryPhotoData = null;

  el.innerHTML = `
<div class="baby-wrap" style="max-width:900px;margin:0 auto;padding:16px">

  <!-- Header -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <span style="font-size:2rem">📓</span>
    <div>
      <h2 style="margin:0;font-size:1.4rem">Günlüğüm</h2>
      <p style="margin:0;opacity:.6;font-size:.85rem">Her günün fotoğrafı ve notu</p>
    </div>
  </div>

  <!-- Two-column layout -->
  <div style="display:grid;grid-template-columns:1fr 1.1fr;gap:20px;align-items:start">

    <!-- LEFT: Calendar -->
    <div class="baby-card" style="background:var(--card-bg);border-radius:16px;padding:16px">
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
        <p>Bir gün seç</p>
      </div>
    </div>

  </div>
</div>`;

  diaryRenderCalendar();
}

async function diaryRenderCalendar() {
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  document.getElementById('diary-cal-title').textContent =
    `${months[_diaryMonth-1]} ${_diaryYear}`;

  const res = await fetch(`/api/daily/calendar/${_diaryYear}/${_diaryMonth}`).then(r=>r.json());
  const summary = res.summary || {};

  const days = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
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
    const hasPhoto = info?.has_photo;
    const hasNote  = info?.note;

    let bg = 'transparent';
    let border = 'none';
    if (isSel)   { bg='var(--accent,#6366f1)'; }
    else if (isToday) { border='2px solid var(--accent,#6366f1)'; }

    html += `<div onclick="diarySelectDay('${ds}')" style="
      cursor:pointer;padding:4px 2px;border-radius:8px;
      background:${bg};border:${border};
      font-weight:${isToday?'700':'400'};
      font-size:.85rem;position:relative;min-height:44px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      ${isSel?'color:#fff':''}
    ">
      <span>${d}</span>
      ${info ? `<span style="font-size:.7rem;line-height:1">${hasPhoto?'📷':'✏️'}</span>` : ''}
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
  panel.innerHTML = `<div style="text-align:center;padding:20px;opacity:.5">Yükleniyor…</div>`;

  const res = await fetch(`/api/daily/entry/${dateStr}`).then(r=>r.json());
  const entry = res.entry;

  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR',
    {day:'numeric', month:'long', year:'numeric', weekday:'long'});

  if (entry) {
    _diaryPhotoData = entry.photo_data || null;
  }

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <strong style="font-size:1rem">${label}</strong>
      ${entry ? `<button onclick="diaryDeleteEntry('${dateStr}')" style="background:none;border:none;cursor:pointer;font-size:1.1rem;opacity:.5" title="Sil">🗑️</button>` : ''}
    </div>

    <!-- Photo area -->
    <div id="diary-photo-wrap" style="margin-bottom:14px;text-align:center">
      ${entry?.photo_data
        ? `<img src="${entry.photo_data}" onclick="diaryOpenLightbox('${entry.photo_data}')"
             style="max-width:100%;max-height:220px;border-radius:10px;cursor:pointer;object-fit:cover">`
        : `<div id="diary-photo-placeholder" style="border:2px dashed var(--border,#333);border-radius:10px;
             padding:24px;cursor:pointer" onclick="document.getElementById('diary-file-input').click()">
             <div style="font-size:2rem">📷</div>
             <div style="font-size:.85rem;opacity:.6;margin-top:4px">Fotoğraf ekle</div>
           </div>`
      }
      <input id="diary-file-input" type="file" accept="image/*" capture="environment"
        style="display:none" onchange="diaryPhotoSelected(this)">
      ${entry?.photo_data
        ? `<button onclick="document.getElementById('diary-file-input').click()"
             style="margin-top:8px;font-size:.8rem;opacity:.6;background:none;border:none;cursor:pointer">
             📷 Fotoğrafı değiştir</button>`
        : ''}
    </div>

    <!-- Note -->
    <textarea id="diary-note" placeholder="Bugün nasıldı? Ne yaşandı?..."
      style="width:100%;min-height:120px;resize:vertical;border-radius:10px;
             border:1px solid var(--border,#333);background:var(--input-bg,transparent);
             color:inherit;padding:10px;font-size:.9rem;font-family:inherit;box-sizing:border-box"
    >${entry?.note || ''}</textarea>

    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="diarySave('${dateStr}')"
        style="flex:1;padding:10px;border-radius:10px;border:none;
               background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:.95rem">
        💾 Kaydet
      </button>
    </div>
  `;
}

function diaryPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  const canvas = document.createElement('canvas');
  const img = new Image();
  const reader = new FileReader();
  reader.onload = e => {
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else       { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      _diaryPhotoData = canvas.toDataURL('image/jpeg', 0.78);
      // Show preview
      const wrap = document.getElementById('diary-photo-wrap');
      if (wrap) wrap.innerHTML = `
        <img src="${_diaryPhotoData}" onclick="diaryOpenLightbox('${_diaryPhotoData}')"
          style="max-width:100%;max-height:220px;border-radius:10px;cursor:pointer;object-fit:cover">
        <br>
        <button onclick="document.getElementById('diary-file-input').click()"
          style="margin-top:8px;font-size:.8rem;opacity:.6;background:none;border:none;cursor:pointer">
          📷 Değiştir</button>
        <input id="diary-file-input" type="file" accept="image/*" capture="environment"
          style="display:none" onchange="diaryPhotoSelected(this)">`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function diarySave(dateStr) {
  const note = document.getElementById('diary-note')?.value || '';
  await fetch('/api/daily/entry', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ entry_date: dateStr, photo_data: _diaryPhotoData || '', note })
  });
  diaryRenderCalendar();
  // Refresh the day view to show saved state
  diarySelectDay(dateStr);
}

async function diaryDeleteEntry(dateStr) {
  if (!confirm('Bu günlük kaydı silinsin mi?')) return;
  await fetch(`/api/daily/entry/${dateStr}`, { method:'DELETE' });
  _diarySelDay = null;
  _diaryPhotoData = null;
  const panel = document.getElementById('diary-day-panel');
  if (panel) panel.innerHTML = `<div style="text-align:center;opacity:.5;padding:40px 0"><div style="font-size:3rem">📅</div><p>Bir gün seç</p></div>`;
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
