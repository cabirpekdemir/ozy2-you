// OZY2 — Women's Health Panel (Period Cycle + Pregnancy Tracker)
'use strict';

let _womenTab = 'period'; // 'period' | 'pregnancy'
let _wYear, _wMonth, _wSelDay;
let _pYear, _pMonth, _pSelDay;

async function init_women(el) {
  const now = new Date();
  _wYear = _pYear = now.getFullYear();
  _wMonth = _pMonth = now.getMonth() + 1;
  _wSelDay = _pSelDay = null;

  el.innerHTML = `
<div style="max-width:960px;margin:0 auto;padding:16px">

  <!-- Header + Tabs -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <span style="font-size:2rem">🌸</span>
    <h2 style="margin:0;font-size:1.4rem">Kadın Sağlığı</h2>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:20px">
    <button id="w-tab-period" onclick="wSetTab('period')"
      style="padding:8px 20px;border-radius:20px;border:none;cursor:pointer;font-size:.9rem;
             background:var(--accent,#6366f1);color:#fff">
      🩸 Döngü
    </button>
    <button id="w-tab-pregnancy" onclick="wSetTab('pregnancy')"
      style="padding:8px 20px;border-radius:20px;border:1px solid var(--border,#444);
             background:transparent;cursor:pointer;font-size:.9rem;color:inherit">
      🤰 Hamilelik
    </button>
  </div>

  <div id="w-content"></div>
</div>`;

  wSetTab('period');
}

function wSetTab(tab) {
  _womenTab = tab;
  const tabs = ['period','pregnancy'];
  tabs.forEach(t => {
    const btn = document.getElementById(`w-tab-${t}`);
    if (!btn) return;
    if (t === tab) {
      btn.style.background = 'var(--accent,#6366f1)';
      btn.style.color = '#fff';
      btn.style.border = 'none';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'inherit';
      btn.style.border = '1px solid var(--border,#444)';
    }
  });
  if (tab === 'period')    wRenderPeriod();
  if (tab === 'pregnancy') wRenderPregnancy();
}

// ─── PERIOD ──────────────────────────────────────────────────────────────────

async function wRenderPeriod() {
  const content = document.getElementById('w-content');
  content.innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1.1fr;gap:20px;align-items:start">

    <!-- Calendar -->
    <div style="background:var(--card-bg);border-radius:16px;padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <button onclick="wPeriodNav(-1)" class="btn-icon">‹</button>
        <strong id="w-period-cal-title"></strong>
        <button onclick="wPeriodNav(1)" class="btn-icon">›</button>
      </div>
      <div id="w-period-cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center"></div>

      <!-- Legend -->
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;font-size:.75rem">
        <span>🔴 Regl</span>
        <span>🟣 Tahmin</span>
        <span>🟢 Verimli</span>
        <span>🟡 Ara kanama</span>
      </div>

      <!-- Stats -->
      <div id="w-period-stats" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border,#333)"></div>
    </div>

    <!-- Day detail / log form -->
    <div id="w-period-day" style="background:var(--card-bg);border-radius:16px;padding:16px;min-height:280px">
      <div style="text-align:center;opacity:.5;padding:30px 0">
        <div style="font-size:2.5rem">🗓️</div><p>Bir gün seç</p>
      </div>
    </div>

  </div>`;

  await wDrawPeriodCal();
  await wLoadPeriodStats();
}

async function wDrawPeriodCal() {
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  document.getElementById('w-period-cal-title').textContent =
    `${months[_wMonth-1]} ${_wYear}`;

  const [calRes, statsRes] = await Promise.all([
    fetch(`/api/women/period/calendar/${_wYear}/${_wMonth}`).then(r=>r.json()),
    fetch('/api/women/period/stats').then(r=>r.json()),
  ]);

  // Build date→entry map
  const entries = {};
  (calRes.entries || []).forEach(e => { entries[e.log_date] = e; });

  // Calculate predicted & fertile days
  const predicted = new Set(), fertile = new Set();
  if (statsRes.next_period_predicted) {
    const np = new Date(statsRes.next_period_predicted + 'T00:00');
    const avg = statsRes.avg_cycle_days || 28;
    for (let i=0; i<5; i++) {
      const d = new Date(np); d.setDate(d.getDate() + i);
      predicted.add(d.toISOString().slice(0,10));
    }
    // Fertile window: ~days 12-16 of cycle before next period
    const ovDay = new Date(np); ovDay.setDate(ovDay.getDate() - 14);
    for (let i=-2; i<=2; i++) {
      const d = new Date(ovDay); d.setDate(d.getDate() + i);
      fertile.add(d.toISOString().slice(0,10));
    }
  }

  const today = new Date().toISOString().slice(0,10);
  const days = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
  const firstDay = new Date(_wYear, _wMonth-1, 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const dim = new Date(_wYear, _wMonth, 0).getDate();

  let html = days.map(d=>`<div style="font-size:.65rem;opacity:.5;padding:3px 0">${d}</div>`).join('');
  for (let i=0; i<startDow; i++) html += '<div></div>';

  for (let d=1; d<=dim; d++) {
    const ds = `${_wYear}-${String(_wMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const entry = entries[ds];
    const flow = entry?.flow || '';
    const isSel   = ds === _wSelDay;
    const isToday = ds === today;
    const isPred  = predicted.has(ds);
    const isFert  = fertile.has(ds);

    const isPeriod = ['start','end','light','medium','heavy'].includes(flow);

    let bg = 'transparent', emoji = '';
    if (isSel)       bg = 'var(--accent,#6366f1)';
    else if (isPeriod) bg = 'rgba(239,68,68,.25)';
    else if (isPred)   bg = 'rgba(139,92,246,.2)';
    else if (isFert)   bg = 'rgba(34,197,94,.15)';

    if (isPeriod)    emoji = '🔴';
    else if (isPred) emoji = '🟣';
    else if (isFert) emoji = '🟢';
    else if (flow === 'spotting') { emoji = '🟡'; bg = 'rgba(234,179,8,.15)'; }

    html += `<div onclick="wPeriodSelectDay('${ds}')" style="
      cursor:pointer;padding:3px 1px;border-radius:7px;background:${bg};
      border:${isToday?'2px solid var(--accent,#6366f1)':'none'};
      font-size:.82rem;min-height:42px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      ${isSel?'color:#fff':''}">
      <span>${d}</span>
      ${emoji ? `<span style="font-size:.65rem">${emoji}</span>` : ''}
    </div>`;
  }

  document.getElementById('w-period-cal-grid').innerHTML = html;
}

async function wLoadPeriodStats() {
  const r = await fetch('/api/women/period/stats').then(x=>x.json());
  const el = document.getElementById('w-period-stats');
  if (!el) return;
  if (!r.last_period_start) {
    el.innerHTML = `<p style="opacity:.5;font-size:.85rem">Henüz döngü kaydı yok.</p>`;
    return;
  }
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.82rem">
      <div><span style="opacity:.5">Son başlangıç</span><br><strong>${r.last_period_start}</strong></div>
      <div><span style="opacity:.5">Ort. döngü</span><br><strong>${r.avg_cycle_days} gün</strong></div>
      <div><span style="opacity:.5">Tahmini sonraki</span><br><strong>${r.next_period_predicted || '—'}</strong></div>
      <div><span style="opacity:.5">Verimli pencere</span><br><strong>${r.fertile_start ? r.fertile_start+' – '+r.fertile_end : '—'}</strong></div>
    </div>`;
}

function wPeriodNav(dir) {
  _wMonth += dir;
  if (_wMonth > 12) { _wMonth = 1; _wYear++; }
  if (_wMonth < 1)  { _wMonth = 12; _wYear--; }
  wDrawPeriodCal();
}

async function wPeriodSelectDay(ds) {
  _wSelDay = ds;
  wDrawPeriodCal();

  const dayEl = document.getElementById('w-period-day');
  dayEl.innerHTML = `<div style="text-align:center;padding:20px;opacity:.5">Yükleniyor…</div>`;

  const res = await fetch(`/api/women/period/day/${ds}`).then(r=>r.json());
  const entry = res.entry;

  const label = new Date(ds+'T00:00').toLocaleDateString('tr-TR',
    {weekday:'long',day:'numeric',month:'long'});

  const flow = entry?.flow || '';
  const symptoms = entry?.symptoms ? JSON.parse(entry.symptoms) : [];

  const FLOWS = [
    {k:'start',   l:'Başladı', e:'🩸'},
    {k:'heavy',   l:'Yoğun',   e:'🔴'},
    {k:'medium',  l:'Orta',    e:'🟠'},
    {k:'light',   l:'Hafif',   e:'🟡'},
    {k:'spotting',l:'Ara kanama',e:'🟤'},
    {k:'end',     l:'Bitti',   e:'⬜'},
  ];

  const SYMS = ['Kramp','Şişkinlik','Baş ağrısı','Yorgunluk',
                'Ruh hali değişimi','Bulantı','Sırt ağrısı','Akne'];

  dayEl.innerHTML = `
    <strong style="font-size:1rem">${label}</strong>

    <p style="margin:14px 0 6px;font-size:.85rem;opacity:.6">Akış:</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      ${FLOWS.map(f=>`
        <button onclick="wPeriodToggleFlow(this,'${f.k}')"
          data-flow="${f.k}"
          style="padding:6px 12px;border-radius:20px;border:1px solid var(--border,#444);
                 cursor:pointer;font-size:.82rem;
                 ${flow===f.k?'background:var(--accent,#6366f1);color:#fff;border-color:transparent':'background:transparent;color:inherit'}">
          ${f.e} ${f.l}
        </button>`).join('')}
    </div>

    <p style="margin:0 0 6px;font-size:.85rem;opacity:.6">Belirtiler:</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      ${SYMS.map(s=>`
        <label style="display:flex;align-items:center;gap:4px;font-size:.82rem;cursor:pointer">
          <input type="checkbox" value="${s}" ${symptoms.includes(s)?'checked':''}
            onchange="wPeriodSymChange()"> ${s}
        </label>`).join('')}
    </div>

    <textarea id="w-period-note" placeholder="Not…"
      style="width:100%;min-height:70px;resize:vertical;border-radius:10px;
             border:1px solid var(--border,#333);background:transparent;
             color:inherit;padding:8px;font-size:.85rem;box-sizing:border-box"
    >${entry?.note || ''}</textarea>

    <div style="display:flex;gap:8px;margin-top:10px">
      <button onclick="wPeriodSave('${ds}')"
        style="flex:1;padding:9px;border-radius:10px;border:none;
               background:var(--accent,#6366f1);color:#fff;cursor:pointer">
        💾 Kaydet
      </button>
      ${entry ? `<button onclick="wPeriodDelete('${ds}')"
        style="padding:9px 14px;border-radius:10px;border:none;
               background:rgba(239,68,68,.2);color:inherit;cursor:pointer">🗑️</button>` : ''}
    </div>`;
}

let _wSelFlow = '';
function wPeriodToggleFlow(btn, key) {
  document.querySelectorAll('[data-flow]').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = 'inherit';
    b.style.borderColor = 'var(--border,#444)';
  });
  _wSelFlow = key;
  btn.style.background = 'var(--accent,#6366f1)';
  btn.style.color = '#fff';
  btn.style.borderColor = 'transparent';
}

async function wPeriodSave(ds) {
  const flowBtns = document.querySelectorAll('[data-flow]');
  let flow = '';
  flowBtns.forEach(b => {
    if (b.style.background.includes('6366f1') || b.style.background.includes('accent')) {
      flow = b.dataset.flow;
    }
  });
  // Fallback: read from original selected
  if (!flow) {
    const active = document.querySelector('[data-flow][style*="6366f1"]');
    if (active) flow = active.dataset.flow;
  }

  const symptoms = [...document.querySelectorAll('[data-flow]~div input[type=checkbox]:checked,#w-period-day input[type=checkbox]:checked')]
    .map(c=>c.value);
  const note = document.getElementById('w-period-note')?.value || '';

  await fetch('/api/women/period/log', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ log_date: ds, flow: _wSelFlow || flow, symptoms, note })
  });

  wDrawPeriodCal();
  wLoadPeriodStats();
  wPeriodSelectDay(ds);
}

async function wPeriodDelete(ds) {
  if (!confirm('Bu kaydı sil?')) return;
  await fetch(`/api/women/period/log/${ds}`, {method:'DELETE'});
  _wSelDay = null;
  document.getElementById('w-period-day').innerHTML =
    `<div style="text-align:center;opacity:.5;padding:30px 0"><div style="font-size:2.5rem">🗓️</div><p>Bir gün seç</p></div>`;
  wDrawPeriodCal();
  wLoadPeriodStats();
}


// ─── PREGNANCY ────────────────────────────────────────────────────────────────

async function wRenderPregnancy() {
  const content = document.getElementById('w-content');
  content.innerHTML = `<div style="text-align:center;padding:30px;opacity:.5">Yükleniyor…</div>`;

  const res = await fetch('/api/women/pregnancy').then(r=>r.json());
  const p = res.pregnancy;

  if (!p) {
    content.innerHTML = `
    <div style="max-width:440px;margin:0 auto;background:var(--card-bg);border-radius:16px;padding:24px;text-align:center">
      <div style="font-size:3rem;margin-bottom:12px">🤰</div>
      <h3 style="margin:0 0 8px">Hamilelik Takibi</h3>
      <p style="opacity:.6;font-size:.9rem">Son adet başlangıç tarihini gir</p>
      <input id="w-preg-lmp" type="date" style="
        margin:16px 0;padding:10px;border-radius:10px;border:1px solid var(--border,#444);
        background:transparent;color:inherit;font-size:1rem;width:100%;box-sizing:border-box">
      <button onclick="wPregStart()"
        style="width:100%;padding:12px;border-radius:12px;border:none;
               background:var(--accent,#6366f1);color:#fff;cursor:pointer;font-size:1rem">
        Başlat 🎉
      </button>
    </div>`;
    return;
  }

  // Calculate progress
  const totalDays = 280;
  const daysGone  = totalDays - p.days_remaining;
  const pct = Math.min(100, Math.round(daysGone / totalDays * 100));
  const week = p.current_week;

  content.innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:20px;align-items:start">

    <!-- LEFT: Info + log form -->
    <div>
      <!-- Week card -->
      <div style="background:var(--card-bg);border-radius:16px;padding:20px;text-align:center;margin-bottom:16px">
        <div style="font-size:3.5rem">${p.baby_emoji}</div>
        <div style="font-size:1.8rem;font-weight:700;margin:4px 0">${week}. Hafta</div>
        <div style="opacity:.6;font-size:.9rem">${p.baby_size} büyüklüğünde 💕</div>
        <div style="margin:14px 0;background:var(--border-color,#333);border-radius:20px;height:10px;overflow:hidden">
          <div style="width:${pct}%;background:linear-gradient(90deg,#f472b6,#a78bfa);height:100%;border-radius:20px;transition:width .4s"></div>
        </div>
        <div style="font-size:.8rem;opacity:.5">${daysGone} gün geçti • ${p.days_remaining} gün kaldı</div>
        <div style="font-size:.85rem;margin-top:6px">🗓️ Tahmini doğum: <strong>${p.due_date}</strong></div>
      </div>

      <!-- Log form -->
      <div style="background:var(--card-bg);border-radius:16px;padding:16px">
        <strong style="font-size:.95rem">📝 Kayıt Ekle</strong>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${['weight','kick','appointment','symptom','note'].map(t=>
              `<button onclick="wPregType(this,'${t}')" data-ptype="${t}"
                style="padding:5px 10px;border-radius:16px;border:1px solid var(--border,#444);
                       cursor:pointer;font-size:.78rem;background:transparent;color:inherit">
                ${{weight:'⚖️ Kilo',kick:'👣 Tekme',appointment:'🏥 Randevu',symptom:'🤢 Belirti',note:'📝 Not'}[t]}
              </button>`).join('')}
          </div>
          <input id="w-preg-date" type="date" value="${new Date().toISOString().slice(0,10)}"
            style="padding:8px;border-radius:10px;border:1px solid var(--border,#444);
                   background:transparent;color:inherit;font-size:.9rem">
          <input id="w-preg-value" type="text" placeholder="Değer (örn. 68.5 kg / 10 tekme)"
            style="padding:8px;border-radius:10px;border:1px solid var(--border,#444);
                   background:transparent;color:inherit;font-size:.9rem">
          <textarea id="w-preg-note" placeholder="Not…"
            style="min-height:60px;resize:vertical;padding:8px;border-radius:10px;
                   border:1px solid var(--border,#444);background:transparent;
                   color:inherit;font-size:.85rem;font-family:inherit"></textarea>
          <button onclick="wPregAddLog()"
            style="padding:10px;border-radius:10px;border:none;
                   background:var(--accent,#6366f1);color:#fff;cursor:pointer">
            ➕ Ekle
          </button>
        </div>
        <button onclick="wPregDelete()" style="margin-top:14px;font-size:.75rem;opacity:.4;
          background:none;border:none;cursor:pointer;color:inherit">
          ⚠️ Hamilelik kaydını sil
        </button>
      </div>
    </div>

    <!-- RIGHT: Calendar -->
    <div style="background:var(--card-bg);border-radius:16px;padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <button onclick="wPregNav(-1)" class="btn-icon">‹</button>
        <strong id="w-preg-cal-title"></strong>
        <button onclick="wPregNav(1)" class="btn-icon">›</button>
      </div>
      <div id="w-preg-cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center"></div>
      <div id="w-preg-day-detail" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border,#333)">
        <p style="opacity:.5;font-size:.85rem">Bir güne tıkla</p>
      </div>
    </div>

  </div>`;

  _wPregType = 'note';
  wDrawPregCal();
}

let _wPregType = 'note';
function wPregType(btn, type) {
  _wPregType = type;
  document.querySelectorAll('[data-ptype]').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = 'inherit';
    b.style.borderColor = 'var(--border,#444)';
  });
  btn.style.background = 'var(--accent,#6366f1)';
  btn.style.color = '#fff';
  btn.style.borderColor = 'transparent';
}

async function wPregAddLog() {
  const log_date = document.getElementById('w-preg-date')?.value;
  const value    = document.getElementById('w-preg-value')?.value || '';
  const note     = document.getElementById('w-preg-note')?.value || '';
  if (!log_date) return;

  await fetch('/api/women/pregnancy/log', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ log_date, log_type: _wPregType, value, note })
  });

  document.getElementById('w-preg-value').value = '';
  document.getElementById('w-preg-note').value  = '';
  wDrawPregCal();
  if (_pSelDay) wPregSelectDay(_pSelDay);
}

async function wPregStart() {
  const lmp = document.getElementById('w-preg-lmp')?.value;
  if (!lmp) return;
  const r = await fetch('/api/women/pregnancy', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ lmp_date: lmp })
  }).then(x=>x.json());
  wRenderPregnancy();
}

async function wPregDelete() {
  if (!confirm('Hamilelik kaydı ve tüm loglar silinsin mi?')) return;
  await fetch('/api/women/pregnancy', { method:'DELETE' });
  wRenderPregnancy();
}

async function wDrawPregCal() {
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const titleEl = document.getElementById('w-preg-cal-title');
  if (titleEl) titleEl.textContent = `${months[_pMonth-1]} ${_pYear}`;

  const res = await fetch(`/api/women/pregnancy/calendar/${_pYear}/${_pMonth}`).then(r=>r.json());
  const summary = res.summary || {};

  const TYPE_ICONS = { weight:'⚖️', kick:'👣', appointment:'🏥', symptom:'🤢', note:'📝' };
  const today = new Date().toISOString().slice(0,10);
  const days = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz'];
  const firstDay = new Date(_pYear, _pMonth-1, 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const dim = new Date(_pYear, _pMonth, 0).getDate();

  let html = days.map(d=>`<div style="font-size:.65rem;opacity:.5;padding:3px 0">${d}</div>`).join('');
  for (let i=0; i<startDow; i++) html += '<div></div>';

  for (let d=1; d<=dim; d++) {
    const ds = `${_pYear}-${String(_pMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isSel   = ds === _pSelDay;
    const isToday = ds === today;
    const logs    = summary[ds];
    const icons   = logs ? [...new Set(logs.map(l=>TYPE_ICONS[l.log_type]||'📝'))].join('') : '';

    html += `<div onclick="wPregSelectDay('${ds}')" style="
      cursor:pointer;padding:3px 1px;border-radius:7px;
      background:${isSel?'var(--accent,#6366f1)':'transparent'};
      border:${isToday?'2px solid var(--accent,#6366f1)':'none'};
      font-size:.82rem;min-height:42px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      ${isSel?'color:#fff':''}">
      <span>${d}</span>
      ${icons?`<span style="font-size:.65rem">${icons}</span>`:''}
    </div>`;
  }

  const gridEl = document.getElementById('w-preg-cal-grid');
  if (gridEl) gridEl.innerHTML = html;
}

async function wPregSelectDay(ds) {
  _pSelDay = ds;
  wDrawPregCal();

  const detail = document.getElementById('w-preg-day-detail');
  if (!detail) return;
  detail.innerHTML = '<div style="opacity:.5;font-size:.85rem">Yükleniyor…</div>';

  const res = await fetch(`/api/women/pregnancy/calendar/${_pYear}/${_pMonth}`).then(r=>r.json());
  const logs = (res.summary || {})[ds] || [];

  const label = new Date(ds+'T00:00').toLocaleDateString('tr-TR',
    {weekday:'long',day:'numeric',month:'long'});

  const TYPE_ICONS = { weight:'⚖️', kick:'👣', appointment:'🏥', symptom:'🤢', note:'📝' };
  const TYPE_LABELS = { weight:'Kilo', kick:'Tekme', appointment:'Randevu', symptom:'Belirti', note:'Not' };

  if (!logs.length) {
    detail.innerHTML = `<strong>${label}</strong><p style="opacity:.5;font-size:.85rem">Bu gün kayıt yok.</p>`;
    return;
  }

  detail.innerHTML = `
    <strong>${label}</strong>
    <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
      ${logs.map(l=>`
        <div style="display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:8px;
                    background:var(--hover-bg,rgba(255,255,255,.05))">
          <span>${TYPE_ICONS[l.log_type]||'📝'}</span>
          <div style="flex:1">
            <span style="font-size:.75rem;opacity:.5">${TYPE_LABELS[l.log_type]||l.log_type}</span>
            ${l.value?`<div style="font-size:.9rem">${l.value}</div>`:''}
            ${l.note?`<div style="font-size:.82rem;opacity:.7">${l.note}</div>`:''}
          </div>
          <button onclick="wPregDeleteLog(${l.id})"
            style="background:none;border:none;cursor:pointer;opacity:.4;font-size:.9rem">🗑️</button>
        </div>`).join('')}
    </div>`;
}

function wPregNav(dir) {
  _pMonth += dir;
  if (_pMonth > 12) { _pMonth = 1; _pYear++; }
  if (_pMonth < 1)  { _pMonth = 12; _pYear--; }
  wDrawPregCal();
}

async function wPregDeleteLog(id) {
  await fetch(`/api/women/pregnancy/log/${id}`, { method:'DELETE' });
  wDrawPregCal();
  if (_pSelDay) wPregSelectDay(_pSelDay);
}
