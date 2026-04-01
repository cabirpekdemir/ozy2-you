/* OZY2 — Profile Panel */

async function init_profile(el) {
  // fetch settings and memory stats
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  let settings = {};
  let memoryStats = { facts: 0, history: 0 };

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    if (d.ok) settings = d.settings || {};
  } catch {}

  try {
    const r = await fetch('/api/memory/stats');
    const d = await r.json();
    if (d.ok) {
      memoryStats.facts   = d.facts_count   ?? 0;
      memoryStats.history = d.history_count ?? 0;
    }
  } catch {}

  const userName  = settings.user_name || 'User';
  const gmailAcc  = (settings.email_accounts || []).find(a => a.provider === 'gmail');
  const email     = gmailAcc?.email || '—';

  el.innerHTML = `
    <div style="padding:20px;max-width:600px;margin:0 auto">

      <h2 style="font-size:20px;font-weight:700;margin:0 0 20px">Profile</h2>

      <!-- User info card -->
      <div class="card" style="padding:24px;margin-bottom:16px;display:flex;align-items:center;gap:20px">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--accent,#4f8ef7);
                    display:flex;align-items:center;justify-content:center;
                    font-size:26px;font-weight:700;color:#fff;flex-shrink:0">
          ${userName.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:18px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${_escHtml(userName)}
          </div>
          <div style="font-size:13px;color:var(--text-3);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${_escHtml(email)}
          </div>
        </div>
      </div>

      <!-- Memory stats card -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div style="font-size:15px;font-weight:600;margin-bottom:14px">🧠 Memory Summary</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="padding:14px;background:var(--bg-2,#111);border-radius:10px;text-align:center">
            <div style="font-size:28px;font-weight:700;color:var(--accent,#4f8ef7)" id="profile-facts-count">
              ${memoryStats.facts}
            </div>
            <div style="font-size:12px;color:var(--text-3);margin-top:4px">Saved Facts</div>
          </div>
          <div style="padding:14px;background:var(--bg-2,#111);border-radius:10px;text-align:center">
            <div style="font-size:28px;font-weight:700;color:var(--accent,#4f8ef7)" id="profile-history-count">
              ${memoryStats.history}
            </div>
            <div style="font-size:12px;color:var(--text-3);margin-top:4px">Chat History</div>
          </div>
        </div>
      </div>

      <!-- Quick links card -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div style="font-size:15px;font-weight:600;margin-bottom:14px">Quick Links</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost" onclick="showPanel('memory')" style="flex:1;min-width:120px">
            🧠 Memory
          </button>
          <button class="btn btn-ghost" onclick="showPanel('settings')" style="flex:1;min-width:120px">
            🔧 Settings
          </button>
        </div>
      </div>

      <!-- Logout -->
      <button class="btn" onclick="_profileLogout()"
        style="width:100%;padding:13px;background:#ef444422;color:#ef4444;
               border:1px solid #ef444444;border-radius:10px;font-size:14px;
               font-weight:600;cursor:pointer;transition:background .15s"
        onmouseover="this.style.background='#ef444433'"
        onmouseout="this.style.background='#ef444422'">
        🚪 Logout
      </button>

    </div>
  `;
}

async function _profileLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  window.location.replace('/login');
}

function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
