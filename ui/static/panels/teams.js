/* OZY2 — Microsoft Teams Panel */

async function init_teams(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🟣 Microsoft Teams</h2>
      </div>
      <div id="teams-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const hasToken = d.ok && d.settings?.teams_token;
    const hasTeam = d.ok && d.settings?.teams_team_id;
    if (hasToken && hasTeam) {
      teamsShowChannels();
    } else {
      teamsShowSetup(hasToken, hasTeam);
    }
  } catch {
    teamsShowSetup(false, false);
  }
}

function teamsShowSetup(hasToken, hasTeam) {
  const el = document.getElementById('teams-body');
  if (!el) return;
  const missing = [];
  if (!hasToken) missing.push('<strong style="color:var(--text-1)">teams_token</strong> — Azure AD access token');
  if (!hasTeam) missing.push('<strong style="color:var(--text-1)">teams_team_id</strong> — Target team ID');
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">🟣</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect Microsoft Teams</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        The following settings are required:
        <ul style="text-align:left;margin:12px 0 0;padding-left:20px">
          ${missing.map(m => `<li style="margin-bottom:6px;color:var(--text-2)">${m}</li>`).join('')}
        </ul>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

async function teamsShowChannels() {
  const el = document.getElementById('teams-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch('/api/teams/channels');
    const d = await r.json();
    const channels = d.channels || [];
    if (!channels.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-3)">
        <div style="font-size:36px;margin-bottom:10px">📭</div>
        <div>No channels found</div>
      </div>`;
      return;
    }
    el.innerHTML = `
      <div style="margin-bottom:16px;font-size:13px;color:var(--text-3)">${channels.length} channels</div>
      ${channels.map(ch => `
        <div class="card" style="margin-bottom:8px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer"
          onclick="teamsOpenChannel('${ch.id}','${(ch.displayName||ch.name||'').replace(/'/g,"\\'")}')">
          <div style="font-size:18px">📢</div>
          <div style="flex:1">
            <div style="font-weight:500;font-size:14px">${ch.displayName || ch.name || ch.id}</div>
            ${ch.description ? `<div style="font-size:12px;color:var(--text-3);margin-top:2px">${ch.description}</div>` : ''}
          </div>
        </div>`).join('')}`;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load channels.</div>`;
  }
}

async function teamsOpenChannel(channelId, channelName) {
  const el = document.getElementById('teams-body');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <button class="btn btn-ghost btn-sm" onclick="teamsShowChannels()">← Back</button>
        <span style="font-weight:600;font-size:16px">📢 ${channelName}</span>
      </div>
      <div id="teams-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:16px;min-height:200px">
        <div class="spinner" style="margin:30px auto"></div>
      </div>
      <div style="display:flex;gap:8px">
        <input id="teams-compose" class="input" placeholder="Message ${channelName}…" style="flex:1"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();teamsSend('${channelId}')}">
        <button class="btn btn-primary" onclick="teamsSend('${channelId}')">Send</button>
      </div>
    </div>`;
  teamsLoadMessages(channelId);
}

async function teamsLoadMessages(channelId) {
  const el = document.getElementById('teams-messages');
  if (!el) return;
  try {
    const r = await fetch(`/api/teams/channels/${channelId}/messages`);
    const d = await r.json();
    const messages = d.messages || [];
    if (!messages.length) {
      el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-3)">No messages yet</div>`;
      return;
    }
    el.innerHTML = messages.map(m => {
      const ts = m.createdDateTime ? new Date(m.createdDateTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
      const author = m.from?.user?.displayName || 'Unknown';
      const body = m.body?.content || '';
      return `
        <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--card-border)">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--bg2);display:flex;align-items:center;
            justify-content:center;font-size:14px;font-weight:600;flex-shrink:0;color:var(--accent)">
            ${author[0].toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
              <span style="font-weight:600;font-size:13px">${author}</span>
              <span style="font-size:11px;color:var(--text-3)">${ts}</span>
            </div>
            <div style="font-size:14px;color:var(--text-2);white-space:pre-wrap;word-break:break-word">${body}</div>
          </div>
        </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load messages.</div>`;
  }
}

async function teamsSend(channelId) {
  const input = document.getElementById('teams-compose');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  try {
    const r = await fetch('/api/teams/send', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({channel_id: channelId, text})
    });
    const d = await r.json();
    if (d.ok) {
      toast('Message sent', 'success');
      teamsLoadMessages(channelId);
    } else {
      toast(d.error || 'Failed to send', 'error');
    }
  } catch {
    toast('Failed to send message', 'error');
  }
}
