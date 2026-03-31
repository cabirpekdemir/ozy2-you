/* OZY2 — Slack Panel */

async function init_slack(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>💬 Slack</h2>
      </div>
      <div id="slack-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const token = d.ok && d.settings?.slack_token;
    if (token) {
      slackShowChannels();
    } else {
      slackShowSetup();
    }
  } catch {
    slackShowSetup();
  }
}

function slackShowSetup() {
  const el = document.getElementById('slack-body');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">💬</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect Slack</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        Add your Slack Bot Token to browse channels and send messages.<br>
        <ol style="text-align:left;margin:12px 0 0;padding-left:20px;color:var(--text-2)">
          <li>Go to <strong style="color:var(--text-1)">api.slack.com/apps</strong></li>
          <li>Create or select your app → OAuth & Permissions</li>
          <li>Copy the <strong style="color:var(--text-1)">Bot User OAuth Token</strong></li>
          <li>Paste it in Settings → Slack Token</li>
        </ol>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

async function slackShowChannels() {
  const el = document.getElementById('slack-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch('/api/slack/channels');
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
      <div id="slack-channel-list">
        ${channels.map(ch => `
          <div class="card" style="margin-bottom:8px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer"
            onclick="slackOpenChannel('${ch.id}','${(ch.name||'').replace(/'/g,"\\'")}')">
            <div style="font-size:18px;color:var(--text-3)">#</div>
            <div style="flex:1">
              <div style="font-weight:500;font-size:14px">${ch.name || ch.id}</div>
              ${ch.topic ? `<div style="font-size:12px;color:var(--text-3);margin-top:2px">${ch.topic}</div>` : ''}
            </div>
            <div style="font-size:12px;color:var(--text-3)">${ch.num_members ? ch.num_members + ' members' : ''}</div>
          </div>`).join('')}
      </div>`;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load channels.</div>`;
  }
}

async function slackOpenChannel(channelId, channelName) {
  const el = document.getElementById('slack-body');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <button class="btn btn-ghost btn-sm" onclick="slackShowChannels()">← Back</button>
        <span style="font-weight:600;font-size:16px"># ${channelName}</span>
      </div>
      <div id="slack-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:16px;min-height:200px">
        <div class="spinner" style="margin:30px auto"></div>
      </div>
      <div style="display:flex;gap:8px">
        <input id="slack-compose" class="input" placeholder="Message #${channelName}…" style="flex:1"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();slackSend('${channelId}')}">
        <button class="btn btn-primary" onclick="slackSend('${channelId}')">Send</button>
      </div>
    </div>`;
  slackLoadMessages(channelId);
}

async function slackLoadMessages(channelId) {
  const el = document.getElementById('slack-messages');
  if (!el) return;
  try {
    const r = await fetch(`/api/slack/channels/${channelId}/messages`);
    const d = await r.json();
    const messages = d.messages || [];
    if (!messages.length) {
      el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-3)">No messages yet</div>`;
      return;
    }
    el.innerHTML = messages.map(m => {
      const ts = m.ts ? new Date(parseFloat(m.ts) * 1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
      return `
        <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--card-border)">
          <div style="width:32px;height:32px;border-radius:8px;background:var(--bg2);display:flex;align-items:center;
            justify-content:center;font-size:14px;font-weight:600;flex-shrink:0;color:var(--accent)">
            ${(m.username||m.user||'?')[0].toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
              <span style="font-weight:600;font-size:13px">${m.username || m.user || 'Unknown'}</span>
              <span style="font-size:11px;color:var(--text-3)">${ts}</span>
            </div>
            <div style="font-size:14px;color:var(--text-2);white-space:pre-wrap;word-break:break-word">${m.text || ''}</div>
          </div>
        </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load messages.</div>`;
  }
}

async function slackSend(channelId) {
  const input = document.getElementById('slack-compose');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  try {
    const r = await fetch('/api/slack/send', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({channel: channelId, text})
    });
    const d = await r.json();
    if (d.ok) {
      toast('Message sent', 'success');
      slackLoadMessages(channelId);
    } else {
      toast(d.error || 'Failed to send', 'error');
    }
  } catch {
    toast('Failed to send message', 'error');
  }
}
