/* OZY2 — Tasks Panel */

function init_tasks(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:780px;margin:0 auto">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:20px;font-weight:700;margin:0">Tasks</h2>
        <button class="btn btn-primary" onclick="openAddTask()">+ Add Task</button>
      </div>

      <!-- Filter tabs -->
      <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--card-bg);
        padding:4px;border-radius:var(--r-md);border:1px solid var(--card-border);width:fit-content">
        ${['all','todo','in_progress','done'].map(s => `
          <button id="filter-${s}" class="btn btn-ghost" style="font-size:12px;padding:5px 12px;
            ${s==='all' ? 'background:var(--accent);color:white' : ''}"
            onclick="filterTasks('${s}')">${s==='all' ? 'All' : s==='in_progress' ? 'In Progress' : s.charAt(0).toUpperCase()+s.slice(1)}</button>
        `).join('')}
      </div>

      <!-- Task list -->
      <div id="task-list">
        <div class="spinner" style="margin:40px auto"></div>
      </div>

      <!-- Add Task Modal -->
      <div id="task-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
        z-index:200;display:none;align-items:center;justify-content:center">
        <div class="card" style="width:min(400px,90vw);padding:24px">
          <div style="font-size:18px;font-weight:600;margin-bottom:16px">New Task</div>
          <input id="task-title" class="input" placeholder="Task title" style="width:100%;margin-bottom:10px">
          <textarea id="task-notes" class="input" placeholder="Notes (optional)" rows="2"
            style="width:100%;resize:none;margin-bottom:10px;font-family:inherit"></textarea>
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <select id="task-priority" class="input" style="flex:1">
              <option value="low">Low Priority</option>
              <option value="normal" selected>Normal Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input id="task-due" type="date" class="input" style="flex:1">
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-ghost" onclick="closeAddTask()">Cancel</button>
            <button class="btn btn-primary" onclick="submitTask()">Create</button>
          </div>
        </div>
      </div>

    </div>
  `;

  window._taskFilter = 'all';
  loadTasks();
}

async function loadTasks() {
  const el     = document.getElementById('task-list');
  if (!el) return;
  const status = window._taskFilter === 'all' ? '' : window._taskFilter;
  try {
    const r = await fetch(`/api/tasks${status ? '?status=' + status : ''}`);
    if (r.status === 401) { window.location.replace('/login'); return; }
    const d = await r.json();
    if (d.ok) renderTasks(d.tasks);
    else el.innerHTML = `<div style="color:var(--text-3);padding:20px 0">Failed to load tasks</div>`;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px 0">Error loading tasks</div>`;
  }
}

function renderTasks(tasks) {
  const el = document.getElementById('task-list');
  if (!el) return;
  if (!tasks.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-3)">
      <div style="font-size:40px;margin-bottom:12px">✅</div>
      <div>No tasks found</div>
    </div>`;
    return;
  }
  const priorityColor = {high:'#ef4444', normal:'var(--accent)', low:'var(--text-3)'};
  const statusColor   = {todo:'var(--text-3)', in_progress:'#f59e0b', done:'#10b981'};
  el.innerHTML = tasks.map(t => `
    <div class="card" style="margin-bottom:8px;padding:14px 16px;
      display:flex;align-items:center;gap:12px;
      ${t.status==='done' ? 'opacity:0.6' : ''}">
      <div onclick="toggleTask(${t.id},'${t.status}')" style="cursor:pointer;flex-shrink:0;
        width:22px;height:22px;border-radius:6px;border:2px solid var(--card-border);
        display:flex;align-items:center;justify-content:center;
        ${t.status==='done' ? 'background:#10b981;border-color:#10b981;color:white' : ''}">
        ${t.status==='done' ? '✓' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:14px;${t.status==='done' ? 'text-decoration:line-through' : ''}">${t.title}</div>
        ${t.notes ? `<div style="font-size:12px;color:var(--text-3);margin-top:2px">${t.notes}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:4px;align-items:center">
          <span style="font-size:11px;color:${priorityColor[t.priority] || 'var(--text-3)'}">
            ${t.priority}
          </span>
          ${t.due_date ? `<span style="font-size:11px;color:var(--text-3)">due ${t.due_date}</span>` : ''}
        </div>
      </div>
      <button class="btn btn-ghost btn-icon" onclick="deleteTask(${t.id})"
        style="flex-shrink:0;color:var(--text-3);font-size:16px">🗑</button>
    </div>
  `).join('');
}

function filterTasks(status) {
  window._taskFilter = status;
  document.querySelectorAll('[id^="filter-"]').forEach(b => {
    b.style.background = '';
    b.style.color = '';
  });
  const active = document.getElementById(`filter-${status}`);
  if (active) { active.style.background = 'var(--accent)'; active.style.color = 'white'; }
  loadTasks();
}

async function toggleTask(id, current) {
  const newStatus = current === 'done' ? 'todo' : 'done';
  try {
    const r = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({status: newStatus})
    });
    if (r.status === 401) { window.location.replace('/login'); return; }
    if (!r.ok) { toast('Failed to update task', 'error'); return; }
  } catch {
    toast('Failed to update task', 'error');
    return;
  }
  loadTasks();
}

async function deleteTask(id) {
  await fetch(`/api/tasks/${id}`, {method:'DELETE'});
  loadTasks();
}

function openAddTask() {
  const m = document.getElementById('task-modal');
  if (m) { m.style.display = 'flex'; document.getElementById('task-title').focus(); }
}

function closeAddTask() {
  const m = document.getElementById('task-modal');
  if (m) m.style.display = 'none';
}

async function submitTask() {
  const title = document.getElementById('task-title')?.value.trim();
  if (!title) return;
  const body = {
    title,
    notes:    document.getElementById('task-notes')?.value || '',
    priority: document.getElementById('task-priority')?.value || 'normal',
    due_date: document.getElementById('task-due')?.value || null,
  };
  await fetch('/api/tasks', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
  });
  closeAddTask();
  document.getElementById('task-title').value  = '';
  document.getElementById('task-notes').value  = '';
  document.getElementById('task-due').value    = '';
  loadTasks();
  toast('Task created', 'success');
}
