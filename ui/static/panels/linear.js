/* OZY2 — Linear Panel */

async function init_linear(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🔷 Linear</h2>
      </div>
      <div id="linear-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const hasKey = d.ok && d.settings?.linear_api_key;
    if (hasKey) {
      linearLoadIssues();
    } else {
      linearShowSetup();
    }
  } catch {
    linearShowSetup();
  }
}

function linearShowSetup() {
  const el = document.getElementById('linear-body');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">🔷</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect Linear</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        Add your Linear API key to view and manage issues.<br>
        <ol style="text-align:left;margin:12px 0 0;padding-left:20px;color:var(--text-2)">
          <li>Go to <strong style="color:var(--text-1)">linear.app/settings/api</strong></li>
          <li>Click <strong style="color:var(--text-1)">Create new API key</strong></li>
          <li>Copy the key and paste it in Settings</li>
        </ol>
        <div style="margin-top:10px">Required setting: <strong style="color:var(--text-1)">linear_api_key</strong></div>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

const LINEAR_STATE_COLORS = {
  'backlog':    '#6b7280',
  'todo':       '#3b82f6',
  'in_progress':'#f59e0b',
  'in progress':'#f59e0b',
  'done':       '#16a34a',
  'cancelled':  '#dc2626',
  'duplicate':  '#9ca3af',
};

function linearStateColor(state) {
  if (!state) return 'var(--accent)';
  return LINEAR_STATE_COLORS[state.toLowerCase()] || 'var(--accent)';
}

async function linearLoadIssues() {
  const el = document.getElementById('linear-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch('/api/linear/issues');
    const d = await r.json();
    const issues = d.issues || [];
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-3)">${issues.length} issues</div>
        <button class="btn btn-primary btn-sm" onclick="linearShowCreateModal()">+ Create Issue</button>
      </div>
      <div id="linear-issue-list">
        ${issues.length ? issues.map(issue => {
          const state = issue.state?.name || issue.state || 'Unknown';
          const color = linearStateColor(state);
          return `
          <div class="card" style="margin-bottom:8px;padding:14px 16px">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div style="width:10px;height:10px;border-radius:50%;background:${color};margin-top:4px;flex-shrink:0"></div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="font-size:11px;font-weight:600;color:var(--accent);font-family:monospace">${issue.identifier || issue.id || ''}</span>
                  <span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:500;
                    background:${color}22;color:${color};border:1px solid ${color}44">
                    ${state}
                  </span>
                </div>
                <div style="font-size:14px;font-weight:500;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${issue.title || 'Untitled'}
                </div>
                <div style="font-size:12px;color:var(--text-3)">
                  ${issue.assignee?.name ? `👤 ${issue.assignee.name}` : ''}
                  ${issue.priority ? ` · P${issue.priority}` : ''}
                  ${issue.team?.name ? ` · ${issue.team.name}` : ''}
                </div>
              </div>
            </div>
          </div>`;
        }).join('') : `<div style="text-align:center;padding:40px;color:var(--text-3)">
          <div style="font-size:36px;margin-bottom:10px">✅</div>
          <div>No issues found</div>
        </div>`}
      </div>
      <div id="linear-modal-overlay" style="display:none"></div>`;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load issues.</div>`;
  }
}

function linearShowCreateModal() {
  const overlay = document.getElementById('linear-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:460px;max-width:95vw;padding:28px;position:relative">
        <div style="font-size:16px;font-weight:600;margin-bottom:20px">Create Linear Issue</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Title *</label>
            <input id="linear-new-title" class="input" placeholder="Issue title…" style="width:100%">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Description</label>
            <textarea id="linear-new-desc" class="input" placeholder="Optional description…"
              style="width:100%;min-height:100px;resize:vertical"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button class="btn btn-ghost" onclick="linearCloseModal()">Cancel</button>
          <button class="btn btn-primary" onclick="linearCreateIssue()">Create Issue</button>
        </div>
      </div>
    </div>`;
}

function linearCloseModal() {
  const overlay = document.getElementById('linear-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function linearCreateIssue() {
  const title = document.getElementById('linear-new-title')?.value.trim();
  const description = document.getElementById('linear-new-desc')?.value.trim();
  if (!title) { toast('Title is required', 'error'); return; }
  try {
    const r = await fetch('/api/linear/issues', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({title, description})
    });
    const d = await r.json();
    if (d.ok || d.id) {
      toast('Issue created', 'success');
      linearCloseModal();
      linearLoadIssues();
    } else {
      toast(d.error || 'Failed to create issue', 'error');
    }
  } catch {
    toast('Failed to create issue', 'error');
  }
}
