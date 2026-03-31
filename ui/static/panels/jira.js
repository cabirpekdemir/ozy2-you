/* OZY2 — Jira Panel */

async function init_jira(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🔵 Jira</h2>
      </div>
      <div id="jira-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const hasUrl = d.ok && d.settings?.jira_url;
    const hasEmail = d.ok && d.settings?.jira_email;
    const hasToken = d.ok && d.settings?.jira_api_token;
    if (hasUrl && hasEmail && hasToken) {
      jiraLoadIssues();
    } else {
      jiraShowSetup(hasUrl, hasEmail, hasToken);
    }
  } catch {
    jiraShowSetup(false, false, false);
  }
}

function jiraShowSetup(hasUrl, hasEmail, hasToken) {
  const el = document.getElementById('jira-body');
  if (!el) return;
  const missing = [];
  if (!hasUrl) missing.push('<strong style="color:var(--text-1)">jira_url</strong> — e.g. https://yourorg.atlassian.net');
  if (!hasEmail) missing.push('<strong style="color:var(--text-1)">jira_email</strong> — Atlassian account email');
  if (!hasToken) missing.push('<strong style="color:var(--text-1)">jira_api_token</strong> — API token from id.atlassian.com');
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">🔵</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect Jira</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        The following settings are required:
        <ul style="text-align:left;margin:12px 0 0;padding-left:20px">
          ${missing.map(m => `<li style="margin-bottom:6px;color:var(--text-2)">${m}</li>`).join('')}
        </ul>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

const JIRA_STATUS_COLORS = {
  'To Do': '#6b7280',
  'In Progress': '#2563eb',
  'In Review': '#7c3aed',
  'Done': '#16a34a',
  'Closed': '#16a34a',
  'Blocked': '#dc2626',
};

function jiraStatusColor(status) {
  return JIRA_STATUS_COLORS[status] || 'var(--accent)';
}

async function jiraLoadIssues() {
  const el = document.getElementById('jira-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch('/api/jira/issues?jql=' + encodeURIComponent('assignee=currentUser() ORDER BY created DESC') + '&limit=20');
    const d = await r.json();
    const issues = d.issues || [];
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-3)">${issues.length} issues assigned to you</div>
        <button class="btn btn-primary btn-sm" onclick="jiraShowCreateModal()">+ Create Issue</button>
      </div>
      <div id="jira-issue-list">
        ${issues.length ? issues.map(issue => `
          <div class="card" style="margin-bottom:8px;padding:14px 16px">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:12px;font-weight:600;color:var(--accent);font-family:monospace">${issue.key}</span>
                  <span style="font-size:11px;padding:2px 8px;border-radius:20px;font-weight:500;
                    background:${jiraStatusColor(issue.status)}22;color:${jiraStatusColor(issue.status)};border:1px solid ${jiraStatusColor(issue.status)}44">
                    ${issue.status || 'Unknown'}
                  </span>
                </div>
                <div style="font-size:14px;font-weight:500;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  ${issue.summary || 'No summary'}
                </div>
                <div style="font-size:12px;color:var(--text-3)">
                  ${issue.assignee ? `👤 ${issue.assignee}` : ''}
                  ${issue.priority ? ` · ${issue.priority}` : ''}
                </div>
              </div>
            </div>
          </div>`).join('') : `<div style="text-align:center;padding:40px;color:var(--text-3)">
            <div style="font-size:36px;margin-bottom:10px">✅</div>
            <div>No issues assigned to you</div>
          </div>`}
      </div>
      <div id="jira-modal-overlay" style="display:none"></div>`;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load issues.</div>`;
  }
}

function jiraShowCreateModal() {
  const overlay = document.getElementById('jira-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:480px;max-width:95vw;padding:28px;position:relative">
        <div style="font-size:16px;font-weight:600;margin-bottom:20px">Create Jira Issue</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Project Key *</label>
            <input id="jira-new-project" class="input" placeholder="e.g. PROJ" style="width:100%">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Issue Type</label>
            <select id="jira-new-type" class="input" style="width:100%">
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
              <option value="Story">Story</option>
              <option value="Epic">Epic</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Summary *</label>
            <input id="jira-new-summary" class="input" placeholder="Issue summary…" style="width:100%">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Description</label>
            <textarea id="jira-new-desc" class="input" placeholder="Optional description…"
              style="width:100%;min-height:80px;resize:vertical"></textarea>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button class="btn btn-ghost" onclick="jiraCloseModal()">Cancel</button>
          <button class="btn btn-primary" onclick="jiraCreateIssue()">Create Issue</button>
        </div>
      </div>
    </div>`;
}

function jiraCloseModal() {
  const overlay = document.getElementById('jira-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function jiraCreateIssue() {
  const project_key = document.getElementById('jira-new-project')?.value.trim();
  const summary = document.getElementById('jira-new-summary')?.value.trim();
  const description = document.getElementById('jira-new-desc')?.value.trim();
  const issue_type = document.getElementById('jira-new-type')?.value;
  if (!project_key || !summary) { toast('Project key and summary are required', 'error'); return; }
  try {
    const r = await fetch('/api/jira/issues', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({project_key, summary, description, issue_type})
    });
    const d = await r.json();
    if (d.ok || d.key) {
      toast('Issue created: ' + (d.key || ''), 'success');
      jiraCloseModal();
      jiraLoadIssues();
    } else {
      toast(d.error || 'Failed to create issue', 'error');
    }
  } catch {
    toast('Failed to create issue', 'error');
  }
}
