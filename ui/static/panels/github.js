/* OZY2 — GitHub Panel (repos, issues, PRs, commits) */

let _ghRepos = [];
let _ghUser  = null;
let _ghSelected = null; // { fullName, name }

async function init_github(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:960px;margin:0 auto">

      <!-- No token state -->
      <div id="gh-no-token" style="display:none">
        <div class="card" style="padding:48px;text-align:center">
          <div style="font-size:52px;margin-bottom:16px">🐙</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px">GitHub Token Required</div>
          <div style="color:var(--text-3);font-size:13px;max-width:340px;margin:0 auto 20px">
            Add your GitHub Personal Access Token in Settings to connect your account.
          </div>
          <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
        </div>
      </div>

      <!-- Main content -->
      <div id="gh-main" style="display:none">
        <div id="gh-user-header" style="margin-bottom:20px"></div>

        <!-- Repo breadcrumb (visible when inside a repo) -->
        <div id="gh-breadcrumb" style="display:none;margin-bottom:12px;align-items:center;gap:10px">
          <button class="btn btn-ghost btn-sm" onclick="ghBackToRepos()">← Repos</button>
          <span id="gh-breadcrumb-name" style="font-size:14px;font-weight:600;color:var(--text-2)"></span>
        </div>

        <!-- Tabs -->
        <div id="gh-tabs" class="tab-row" style="margin-bottom:16px">
          <button class="tab-btn active" id="gh-tab-repos" onclick="ghShowTab('repos')">📦 Repos</button>
        </div>

        <!-- Content area -->
        <div id="gh-content"><div class="spinner" style="margin:60px auto"></div></div>
      </div>

    </div>`;

  try {
    const r = await fetch('/api/github/user');
    const d = await r.json();
    if (!d.ok) {
      document.getElementById('gh-no-token').style.display = '';
      return;
    }
    _ghUser = d.user;
    document.getElementById('gh-main').style.display = '';
    _ghRenderUserHeader();
    await _ghLoadRepos();
  } catch {
    document.getElementById('gh-no-token').style.display = '';
  }
}

function _ghRenderUserHeader() {
  const el = document.getElementById('gh-user-header');
  if (!_ghUser || !el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <img src="${_ghUser.avatar_url}" alt=""
        style="width:52px;height:52px;border-radius:50%;background:var(--card-border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:18px;font-weight:700">${_ghUser.name || _ghUser.login}</div>
        <div style="font-size:13px;color:var(--text-3)">
          @${_ghUser.login} · ${_ghUser.public_repos} repos · ${_ghUser.followers} followers
        </div>
        ${_ghUser.bio ? `<div style="font-size:12px;color:var(--text-3);margin-top:2px">${_ghUser.bio}</div>` : ''}
      </div>
      <a href="${_ghUser.html_url}" target="_blank" class="btn btn-ghost btn-sm">GitHub ↗</a>
    </div>`;
}

// ── Repos ───────────────────────────────────────────────────────────────────

async function _ghLoadRepos() {
  const el = document.getElementById('gh-content');
  if (el) el.innerHTML = '<div class="spinner" style="margin:60px auto"></div>';
  try {
    const r = await fetch('/api/github/repos?per_page=50');
    const d = await r.json();
    _ghRepos = d.repos || [];
    _ghRenderRepos(_ghRepos);
  } catch {
    if (el) el.innerHTML = '<div style="color:var(--text-3);padding:20px">Failed to load repos.</div>';
  }
}

function _ghRenderRepos(repos) {
  const el = document.getElementById('gh-content');
  if (!el) return;
  if (!repos.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-3)">
      <div style="font-size:44px">🐙</div><div>No repositories found.</div></div>`;
    return;
  }
  el.innerHTML = `
    <input class="input" id="gh-repo-filter" placeholder="Filter repos…"
      oninput="ghFilterRepos(this.value)" style="margin-bottom:14px;width:100%">
    <div id="gh-repo-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
      ${_ghRepoCards(repos)}
    </div>`;
}

function ghFilterRepos(q) {
  const filtered = q
    ? _ghRepos.filter(r =>
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.description.toLowerCase().includes(q.toLowerCase()))
    : _ghRepos;
  const el = document.getElementById('gh-repo-grid');
  if (el) el.innerHTML = _ghRepoCards(filtered);
}

function _ghRepoCards(repos) {
  return repos.map(r => `
    <div class="card" style="padding:16px;cursor:pointer;transition:border-color .15s"
      onclick="ghOpenRepo('${r.full_name}','${r.name}')">
      <div style="margin-bottom:8px">
        <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${r.private ? '🔒 ' : ''}${r.name}
        </div>
        ${r.description
          ? `<div style="font-size:12px;color:var(--text-3);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description}</div>`
          : ''}
      </div>
      <div style="display:flex;gap:10px;font-size:12px;color:var(--text-3);flex-wrap:wrap;align-items:center">
        ${r.language ? `<span style="display:flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block"></span>${r.language}</span>` : ''}
        <span>⭐ ${r.stars}</span>
        <span>🍴 ${r.forks}</span>
        ${r.open_issues ? `<span style="color:#ef4444">● ${r.open_issues}</span>` : ''}
        <span style="margin-left:auto">${r.updated_at}</span>
      </div>
    </div>`).join('');
}

// ── Repo detail ──────────────────────────────────────────────────────────────

function ghOpenRepo(fullName, name) {
  _ghSelected = { fullName, name };
  const bc = document.getElementById('gh-breadcrumb');
  if (bc) { bc.style.display = 'flex'; }
  const bn = document.getElementById('gh-breadcrumb-name');
  if (bn) bn.textContent = fullName;

  document.getElementById('gh-tabs').innerHTML = `
    <button class="tab-btn active" id="gh-tab-issues"  onclick="ghShowTab('issues')">🔴 Issues</button>
    <button class="tab-btn"        id="gh-tab-pulls"   onclick="ghShowTab('pulls')">🔀 Pull Requests</button>
    <button class="tab-btn"        id="gh-tab-commits" onclick="ghShowTab('commits')">📝 Commits</button>`;

  ghShowTab('issues');
}

function ghBackToRepos() {
  _ghSelected = null;
  document.getElementById('gh-breadcrumb').style.display = 'none';
  document.getElementById('gh-tabs').innerHTML = `
    <button class="tab-btn active" id="gh-tab-repos" onclick="ghShowTab('repos')">📦 Repos</button>`;
  _ghRenderRepos(_ghRepos);
}

function ghShowTab(tab) {
  document.querySelectorAll('#gh-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('gh-tab-' + tab);
  if (btn) btn.classList.add('active');
  if (tab === 'repos')   _ghLoadRepos();
  if (tab === 'issues')  _ghLoadIssues();
  if (tab === 'pulls')   _ghLoadPulls();
  if (tab === 'commits') _ghLoadCommits();
}

// ── Issues ───────────────────────────────────────────────────────────────────

async function _ghLoadIssues() {
  const el = document.getElementById('gh-content');
  const [owner, repo] = _ghSelected.fullName.split('/');
  el.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';
  try {
    const r = await fetch(`/api/github/repos/${owner}/${repo}/issues?per_page=30`);
    const d = await r.json();
    const issues = d.issues || [];
    if (!issues.length) {
      el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-3)">
        <div style="font-size:36px">✅</div><div style="margin-top:8px">No open issues.</div></div>`;
      return;
    }
    el.innerHTML = issues.map(i => `
      <a href="${i.html_url}" target="_blank" style="display:block;text-decoration:none;color:inherit">
        <div class="card" style="padding:14px;margin-bottom:8px">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:16px;flex-shrink:0;margin-top:1px">${i.state === 'open' ? '🟢' : '🔴'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600">#${i.number} ${i.title}</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:3px">
                ${i.user} · ${i.created_at}
                ${i.labels.map(l => `<span style="background:rgba(99,102,241,.15);color:#6366f1;padding:1px 6px;border-radius:4px;font-size:11px;margin-left:4px">${l}</span>`).join('')}
              </div>
            </div>
            ${i.comments ? `<span style="font-size:12px;color:var(--text-3);flex-shrink:0">💬 ${i.comments}</span>` : ''}
          </div>
        </div>
      </a>`).join('');
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Failed to load issues.</div>';
  }
}

// ── Pull Requests ─────────────────────────────────────────────────────────────

async function _ghLoadPulls() {
  const el = document.getElementById('gh-content');
  const [owner, repo] = _ghSelected.fullName.split('/');
  el.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';
  try {
    const r = await fetch(`/api/github/repos/${owner}/${repo}/pulls?per_page=30`);
    const d = await r.json();
    const pulls = d.pulls || [];
    if (!pulls.length) {
      el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-3)">
        <div style="font-size:36px">🎉</div><div style="margin-top:8px">No open pull requests.</div></div>`;
      return;
    }
    el.innerHTML = pulls.map(p => `
      <a href="${p.html_url}" target="_blank" style="display:block;text-decoration:none;color:inherit">
        <div class="card" style="padding:14px;margin-bottom:8px">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:16px;flex-shrink:0;margin-top:1px">${p.draft ? '⚪' : '🟣'}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600">#${p.number} ${p.title}</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:3px">
                ${p.user} · ${p.created_at} ·
                <code style="background:var(--card-border);padding:1px 5px;border-radius:3px;font-size:11px">${p.head}</code>
                → <code style="background:var(--card-border);padding:1px 5px;border-radius:3px;font-size:11px">${p.base}</code>
                ${p.draft ? '<span style="color:var(--text-3);font-size:11px"> · Draft</span>' : ''}
              </div>
            </div>
          </div>
        </div>
      </a>`).join('');
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Failed to load pull requests.</div>';
  }
}

// ── Commits ───────────────────────────────────────────────────────────────────

async function _ghLoadCommits() {
  const el = document.getElementById('gh-content');
  const [owner, repo] = _ghSelected.fullName.split('/');
  el.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';
  try {
    const r = await fetch(`/api/github/repos/${owner}/${repo}/commits?per_page=20`);
    const d = await r.json();
    const commits = d.commits || [];
    if (!commits.length) {
      el.innerHTML = '<div style="color:var(--text-3);padding:40px;text-align:center">No commits found.</div>';
      return;
    }
    el.innerHTML = commits.map(c => `
      <a href="${c.html_url}" target="_blank" style="display:block;text-decoration:none;color:inherit">
        <div class="card" style="padding:12px;margin-bottom:6px;display:flex;align-items:center;gap:12px">
          <code style="font-size:11px;background:var(--card-border);padding:3px 7px;border-radius:5px;flex-shrink:0;font-family:monospace">${c.sha}</code>
          <div style="flex:1;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.message}</div>
          <div style="font-size:11px;color:var(--text-3);flex-shrink:0;text-align:right">
            <div>${c.author}</div>
            <div>${c.date}</div>
          </div>
        </div>
      </a>`).join('');
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Failed to load commits.</div>';
  }
}
