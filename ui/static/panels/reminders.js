/* OZY2 — Reminders Panel */

let _remindersTab = 'upcoming';

async function init_reminders(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>⏰ Reminders</h2>
        <button class="btn btn-primary btn-sm" onclick="remindersOpenModal()">＋ Add</button>
      </div>

      <!-- Tabs -->
      <div class="tab-row" style="margin-bottom:16px">
        <button class="tab-btn active" id="rem-tab-upcoming" onclick="remindersSetTab('upcoming',this)">Upcoming</button>
        <button class="tab-btn" id="rem-tab-done" onclick="remindersSetTab('done',this)">Done</button>
      </div>

      <!-- List -->
      <div id="reminders-list">
        <div class="spinner" style="margin:40px auto"></div>
      </div>

      <!-- Modal -->
      <div id="reminders-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);
        z-index:1000;align-items:center;justify-content:center">
        <div style="background:var(--bg2);border-radius:16px;padding:28px;width:100%;
          max-width:440px;margin:16px">
          <h3 style="margin:0 0 16px;font-size:17px;font-weight:600">New Reminder</h3>
          <input id="rem-title-input" class="input" placeholder="Reminder title *" style="margin-bottom:10px">
          <textarea id="rem-notes-input" class="input" rows="2" placeholder="Notes (optional)"
            style="resize:none;font-family:inherit;margin-bottom:10px"></textarea>
          <label style="display:block;font-size:12px;color:var(--text-3);margin-bottom:4px">Due date &amp; time</label>
          <input id="rem-due-input" type="datetime-local" class="input" style="margin-bottom:16px">
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-ghost" onclick="remindersCloseModal()">Cancel</button>
            <button class="btn btn-primary" onclick="remindersSave()">Save</button>
          </div>
        </div>
      </div>
    </div>`;

  await loadReminders();
}

async function loadReminders() {
  const el = document.getElementById('reminders-list');
  if (!el) return;
  const done = _remindersTab === 'done' ? 1 : 0;
  try {
    const r = await fetch(`/api/reminders?done=${done}`);
    const d = await r.json();
    remindersRender(d.reminders || []);
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load reminders.</div>`;
  }
}

function remindersRender(items) {
  const el = document.getElementById('reminders-list');
  if (!el) return;
  if (!items.length) {
    const emptyMsg = _remindersTab === 'done' ? 'No completed reminders.' : 'No upcoming reminders.';
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-3)">
      <div style="font-size:44px;margin-bottom:12px">⏰</div>
      <div>${emptyMsg}</div>
    </div>`;
    return;
  }
  el.innerHTML = items.map(rem => {
    const due = rem.due_date ? remindersFormatDate(rem.due_date) : null;
    const isOverdue = rem.due_date && !rem.done && new Date(rem.due_date) < new Date();
    return `
    <div class="card" style="margin-bottom:8px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;
      ${rem.done ? 'opacity:0.6' : ''}">
      <input type="checkbox" ${rem.done ? 'checked' : ''} onchange="remindersToggleDone(${rem.id})"
        style="margin-top:3px;width:16px;height:16px;accent-color:var(--accent);flex-shrink:0;cursor:pointer">
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:14px;${rem.done ? 'text-decoration:line-through' : ''}">${rem.title}</div>
        ${rem.notes ? `<div style="font-size:12px;color:var(--text-2);margin-top:2px">${rem.notes}</div>` : ''}
        ${due ? `<div style="font-size:12px;margin-top:4px;color:${isOverdue ? '#ef4444' : 'var(--text-3)'}">
          ${isOverdue ? '⚠️ ' : '🕐 '}${due}
        </div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="remindersDelete(${rem.id})"
        title="Delete" style="color:var(--text-3);flex-shrink:0">🗑️</button>
    </div>`;
  }).join('');
}

function remindersFormatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function remindersSetTab(tab, btn) {
  _remindersTab = tab;
  document.querySelectorAll('.tab-btn[id^="rem-tab-"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadReminders();
}

function remindersOpenModal() {
  document.getElementById('rem-title-input').value = '';
  document.getElementById('rem-notes-input').value = '';
  document.getElementById('rem-due-input').value   = '';
  document.getElementById('reminders-modal').style.display = 'flex';
  document.getElementById('rem-title-input').focus();
}

function remindersCloseModal() {
  document.getElementById('reminders-modal').style.display = 'none';
}

async function remindersSave() {
  const title    = document.getElementById('rem-title-input').value.trim();
  const notes    = document.getElementById('rem-notes-input').value.trim();
  const due_date = document.getElementById('rem-due-input').value;
  if (!title) { toast('Please enter a title', 'error'); return; }
  try {
    const r = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, notes, due_date: due_date || null }),
    });
    const d = await r.json();
    if (d.ok) {
      toast('Reminder saved', 'success');
      remindersCloseModal();
      _remindersTab = 'upcoming';
      document.getElementById('rem-tab-upcoming')?.classList.add('active');
      document.getElementById('rem-tab-done')?.classList.remove('active');
      await loadReminders();
    } else {
      toast(d.error || 'Failed to save', 'error');
    }
  } catch {
    toast('Failed to save reminder', 'error');
  }
}

async function remindersToggleDone(id) {
  try {
    await fetch(`/api/reminders/${id}/done`, { method: 'POST' });
    await loadReminders();
    toast('Reminder updated', 'success');
  } catch {
    toast('Failed to update reminder', 'error');
  }
}

async function remindersDelete(id) {
  try {
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
    await loadReminders();
    toast('Reminder deleted', 'info');
  } catch {
    toast('Failed to delete reminder', 'error');
  }
}
