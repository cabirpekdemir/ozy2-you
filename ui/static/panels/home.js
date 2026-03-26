/* OZY2 — Home Panel */

function init_home(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">

      <!-- Greeting -->
      <div class="card" style="margin-bottom:16px;padding:24px 28px;
        background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));
        border-color:rgba(99,102,241,0.3)">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:56px;height:56px;border-radius:18px;
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            display:flex;align-items:center;justify-content:center;
            font-size:26px;box-shadow:0 0 30px rgba(99,102,241,0.4)">✦</div>
          <div>
            <div id="home-greeting" style="font-size:22px;font-weight:700">Good morning</div>
            <div style="color:var(--text-3);font-size:14px" id="home-date"></div>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
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

      <!-- Quick Actions -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="padding:16px 20px 0">Quick Actions</div>
        <div style="padding:12px 16px 16px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="showPanel('chat')">💬 Chat</button>
          <button class="btn btn-ghost" onclick="showPanel('gmail')">📧 Email</button>
          <button class="btn btn-ghost" onclick="showPanel('calendar')">📅 Calendar</button>
          <button class="btn btn-ghost" onclick="showPanel('tasks')">✅ Tasks</button>
          <button class="btn btn-ghost" onclick="showPanel('briefing')">☀️ Briefing</button>
        </div>
      </div>

      <!-- Today's Events -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header" style="padding:16px 20px 12px">Today's Calendar</div>
        <div id="home-events" style="padding:0 16px 16px">
          <div class="spinner" style="margin:20px auto"></div>
        </div>
      </div>

    </div>
  `;

  _setGreeting();
  _loadStats();
  _loadEvents();
}

function _setGreeting() {
  const now  = new Date();
  const h    = now.getHours();
  const name = "Cabir";
  let greet  = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  document.getElementById('home-greeting').textContent = `${greet}, ${name}`;
  document.getElementById('home-date').textContent = now.toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });
}

async function _loadStats() {
  // Tasks
  try {
    const r = await fetch('/api/tasks?status=todo');
    const d = await r.json();
    if (d.ok) document.getElementById('stat-tasks').textContent = d.tasks.length;
  } catch {}

  // Email
  try {
    const r = await fetch('/api/gmail/unread');
    const d = await r.json();
    if (d.ok) document.getElementById('stat-email').textContent = d.count;
  } catch {}

  // Events
  try {
    const r = await fetch('/api/calendar/today');
    const d = await r.json();
    if (d.ok) document.getElementById('stat-events').textContent = d.events.length;
  } catch {}
}

async function _loadEvents() {
  const el = document.getElementById('home-events');
  if (!el) return;
  try {
    const r = await fetch('/api/calendar/today');
    const d = await r.json();
    if (d.ok && d.events.length > 0) {
      el.innerHTML = d.events.map(e => `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;
          border-bottom:1px solid var(--card-border)">
          <div style="width:40px;flex-shrink:0;text-align:center">
            <div style="font-size:11px;color:var(--text-3);line-height:1">
              ${e.start.includes('T') ? e.start.substring(11,16) : 'All day'}
            </div>
          </div>
          <div>
            <div style="font-weight:500;font-size:14px">${e.title}</div>
            ${e.location ? `<div style="font-size:12px;color:var(--text-3)">${e.location}</div>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      el.innerHTML = '<div style="color:var(--text-3);padding:12px 0;font-size:14px">No events today</div>';
    }
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:12px 0;font-size:14px">Could not load calendar</div>';
  }
}
