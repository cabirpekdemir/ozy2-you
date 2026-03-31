/* OZY2 — Asana Panel */

async function init_asana(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🔴 Asana</h2>
      </div>
      <div id="asana-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const hasToken = d.ok && d.settings?.asana_token;
    const hasWorkspace = d.ok && d.settings?.asana_workspace;
    if (hasToken && hasWorkspace) {
      asanaLoadTasks();
    } else {
      asanaShowSetup(hasToken, hasWorkspace);
    }
  } catch {
    asanaShowSetup(false, false);
  }
}

function asanaShowSetup(hasToken, hasWorkspace) {
  const el = document.getElementById('asana-body');
  if (!el) return;
  const missing = [];
  if (!hasToken) missing.push('<strong style="color:var(--text-1)">asana_token</strong> — Personal Access Token from app.asana.com/0/my-apps');
  if (!hasWorkspace) missing.push('<strong style="color:var(--text-1)">asana_workspace</strong> — Workspace GID');
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">🔴</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect Asana</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        The following settings are required:
        <ul style="text-align:left;margin:12px 0 0;padding-left:20px">
          ${missing.map(m => `<li style="margin-bottom:6px;color:var(--text-2)">${m}</li>`).join('')}
        </ul>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

async function asanaLoadTasks() {
  const el = document.getElementById('asana-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch('/api/asana/tasks');
    const d = await r.json();
    const tasks = d.tasks || [];
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-3)">${tasks.length} tasks</div>
        <button class="btn btn-primary btn-sm" onclick="asanaShowAddModal()">+ Add Task</button>
      </div>
      <div id="asana-task-list">
        ${tasks.length ? tasks.map(task => {
          const due = task.due_on ? new Date(task.due_on).toLocaleDateString([], {month:'short',day:'numeric'}) : null;
          const overdue = task.due_on && !task.completed && new Date(task.due_on) < new Date();
          return `
          <div class="card" style="margin-bottom:8px;padding:14px 16px;display:flex;align-items:center;gap:12px"
            id="asana-task-${task.gid || task.id}">
            <input type="checkbox" ${task.completed ? 'checked' : ''}
              style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;flex-shrink:0"
              onchange="asanaToggleTask('${task.gid || task.id}', this.checked)">
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:500;${task.completed ? 'text-decoration:line-through;color:var(--text-3)' : ''}
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${task.name || 'Untitled'}
              </div>
              ${due ? `<div style="font-size:12px;margin-top:3px;color:${overdue ? '#dc2626' : 'var(--text-3)'}">
                📅 ${due}${overdue ? ' (overdue)' : ''}
              </div>` : ''}
            </div>
          </div>`;
        }).join('') : `<div style="text-align:center;padding:40px;color:var(--text-3)">
          <div style="font-size:36px;margin-bottom:10px">✅</div>
          <div>No tasks found</div>
        </div>`}
      </div>
      <div id="asana-modal-overlay" style="display:none"></div>`;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load tasks.</div>`;
  }
}

async function asanaToggleTask(taskId, completed) {
  try {
    const r = await fetch(`/api/asana/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({completed})
    });
    const d = await r.json();
    if (!d.ok) toast(d.error || 'Failed to update task', 'error');
  } catch {
    toast('Failed to update task', 'error');
  }
}

function asanaShowAddModal() {
  const overlay = document.getElementById('asana-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:440px;max-width:95vw;padding:28px">
        <div style="font-size:16px;font-weight:600;margin-bottom:20px">Add Asana Task</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Task Name *</label>
            <input id="asana-new-name" class="input" placeholder="Task name…" style="width:100%">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Notes</label>
            <textarea id="asana-new-notes" class="input" placeholder="Optional notes…"
              style="width:100%;min-height:80px;resize:vertical"></textarea>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Due Date</label>
            <input id="asana-new-due" class="input" type="date" style="width:100%">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button class="btn btn-ghost" onclick="asanaCloseModal()">Cancel</button>
          <button class="btn btn-primary" onclick="asanaAddTask()">Add Task</button>
        </div>
      </div>
    </div>`;
}

function asanaCloseModal() {
  const overlay = document.getElementById('asana-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function asanaAddTask() {
  const name = document.getElementById('asana-new-name')?.value.trim();
  const notes = document.getElementById('asana-new-notes')?.value.trim();
  const due_on = document.getElementById('asana-new-due')?.value;
  if (!name) { toast('Task name is required', 'error'); return; }
  try {
    const r = await fetch('/api/asana/tasks', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name, notes, due_on: due_on || undefined})
    });
    const d = await r.json();
    if (d.ok || d.gid || d.id) {
      toast('Task added', 'success');
      asanaCloseModal();
      asanaLoadTasks();
    } else {
      toast(d.error || 'Failed to add task', 'error');
    }
  } catch {
    toast('Failed to add task', 'error');
  }
}
