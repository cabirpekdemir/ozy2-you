/* OZY2 — GitHub Panel */

function init_github(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">
      <div style="margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">GitHub</h2>
        <div style="color:var(--text-3);font-size:13px">Repositories, issues, and pull requests</div>
      </div>
      <div class="card" style="padding:40px;text-align:center">
        <div style="font-size:48px;margin-bottom:16px">🐙</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">GitHub Integration</div>
        <div style="color:var(--text-3);font-size:13px;max-width:340px;margin:0 auto 20px">
          Connect your GitHub account to view repos, issues, PRs, and get AI code reviews.
        </div>
        <button class="btn btn-primary" onclick="showPanel('settings')">
          Configure in Settings →
        </button>
      </div>
    </div>
  `;
  // If token is set, load repos
  fetch('/api/settings').then(r=>r.json()).then(d => {
    if (d.ok && d.settings.github_token) loadGitHubRepos(el, d.settings);
  });
}

async function loadGitHubRepos(el, settings) {
  // GitHub API integration placeholder
  // Will call /api/github/repos once router is built
}
