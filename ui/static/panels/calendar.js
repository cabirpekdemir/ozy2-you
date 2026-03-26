/* OZY2 — Calendar Panel */

function init_calendar(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:20px;font-weight:700;margin:0">Calendar</h2>
        <div style="display:flex;gap:8px">
          <select id="cal-days" class="input" style="font-size:13px" onchange="loadCalendarEvents()">
            <option value="1">Today</option>
            <option value="7" selected>Next 7 days</option>
            <option value="14">Next 14 days</option>
            <option value="30">Next 30 days</option>
          </select>
          <button class="btn btn-primary" onclick="openEventModal()">+ Event</button>
        </div>
      </div>

      <div id="calendar-events">
        <div class="spinner" style="margin:60px auto"></div>
      </div>

    </div>

    <!-- New Event Modal -->
    <div id="event-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:200;align-items:center;justify-content:center">
      <div class="card" style="width:min(400px,90vw);padding:24px">
        <div style="font-size:18px;font-weight:600;margin-bottom:16px">New Event</div>
        <input id="ev-title"    class="input" placeholder="Event title"  style="width:100%;margin-bottom:8px">
        <input id="ev-location" class="input" placeholder="Location"     style="width:100%;margin-bottom:8px">
        <textarea id="ev-desc"  class="input" placeholder="Description" rows="2"
          style="width:100%;resize:none;margin-bottom:8px;font-family:inherit"></textarea>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          <div style="flex:1">
            <label style="font-size:11px;color:var(--text-3)">Start</label>
            <input id="ev-start" type="datetime-local" class="input" style="width:100%;margin-top:4px">
          </div>
          <div style="flex:1">
            <label style="font-size:11px;color:var(--text-3)">End</label>
            <input id="ev-end"   type="datetime-local" class="input" style="width:100%;margin-top:4px">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="closeEventModal()">Cancel</button>
          <button class="btn btn-primary" onclick="createEvent()">Create</button>
        </div>
      </div>
    </div>
  `;

  loadCalendarEvents();
}

async function loadCalendarEvents() {
  const el   = document.getElementById('calendar-events');
  const days = document.getElementById('cal-days')?.value || 7;
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:60px auto"></div>`;
  try {
    const r = await fetch(`/api/calendar/events?days=${days}`);
    const d = await r.json();
    if (d.ok) renderCalendarEvents(d.events);
    else el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load</div>`;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Error loading calendar</div>`;
  }
}

function renderCalendarEvents(events) {
  const el = document.getElementById('calendar-events');
  if (!el) return;
  if (!events.length) {
    el.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-3)">
      <div style="font-size:40px;margin-bottom:12px">📅</div>
      <div>No upcoming events</div>
    </div>`;
    return;
  }

  // Group by date
  const groups = {};
  for (const e of events) {
    const date = e.start.includes('T') ? e.start.split('T')[0] : e.start;
    if (!groups[date]) groups[date] = [];
    groups[date].push(e);
  }

  el.innerHTML = Object.entries(groups).map(([date, evs]) => {
    const d       = new Date(date + 'T00:00:00');
    const today   = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const label   = isToday ? 'Today' : d.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
    return `
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;color:${isToday ? 'var(--accent)' : 'var(--text-3)'};
          margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
        ${evs.map(e => `
          <div class="card" style="margin-bottom:8px;padding:14px 16px;display:flex;gap:14px;align-items:flex-start">
            <div style="flex-shrink:0;text-align:center;min-width:44px">
              <div style="font-size:14px;font-weight:600;color:var(--accent)">
                ${e.all_day ? 'All' : e.start.substring(11,16)}
              </div>
              ${!e.all_day ? `<div style="font-size:11px;color:var(--text-3)">${e.end.substring(11,16)}</div>` : ''}
            </div>
            <div style="flex:1">
              <div style="font-weight:500;font-size:14px">${e.title}</div>
              ${e.location ? `<div style="font-size:12px;color:var(--text-3);margin-top:2px">📍 ${e.location}</div>` : ''}
              ${e.description ? `<div style="font-size:12px;color:var(--text-3);margin-top:4px">${e.description.substring(0,100)}</div>` : ''}
            </div>
            <button class="btn btn-ghost btn-icon" onclick="deleteCalEvent('${e.id}')"
              style="color:var(--text-3);flex-shrink:0">🗑</button>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function openEventModal() {
  // Default start = now+1h, end = now+2h
  const now  = new Date();
  const s    = new Date(now.getTime() + 60*60*1000);
  const en   = new Date(now.getTime() + 2*60*60*1000);
  const fmt  = d => d.toISOString().slice(0,16);
  document.getElementById('ev-start').value = fmt(s);
  document.getElementById('ev-end').value   = fmt(en);
  const m = document.getElementById('event-modal');
  if (m) { m.style.display = 'flex'; document.getElementById('ev-title').focus(); }
}

function closeEventModal() {
  const m = document.getElementById('event-modal');
  if (m) m.style.display = 'none';
}

async function createEvent() {
  const title = document.getElementById('ev-title')?.value.trim();
  const start = document.getElementById('ev-start')?.value;
  const end   = document.getElementById('ev-end')?.value;
  if (!title || !start || !end) { toast('Title, start, and end required', 'error'); return; }
  const r = await fetch('/api/calendar/events', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      title, start: start+':00', end: end+':00',
      description: document.getElementById('ev-desc')?.value || '',
      location:    document.getElementById('ev-location')?.value || '',
    })
  });
  const d = await r.json();
  if (d.ok) { closeEventModal(); loadCalendarEvents(); toast('Event created', 'success'); }
  else toast('Failed: ' + (d.error || ''), 'error');
}

async function deleteCalEvent(id) {
  await fetch(`/api/calendar/events/${id}`, {method:'DELETE'});
  loadCalendarEvents();
  toast('Event deleted', 'success');
}
