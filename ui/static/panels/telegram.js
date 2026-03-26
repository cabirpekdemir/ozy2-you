/* OZY2 — Telegram Panel */

let _telegramOffset = 0;

function init_telegram(el) {
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;max-width:700px;margin:0 auto">

      <!-- Status bar -->
      <div id="tg-status" style="padding:12px 20px;border-bottom:1px solid var(--card-border);
        display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <div id="tg-status-dot" style="width:8px;height:8px;border-radius:50%;background:#6b7280"></div>
          <span id="tg-status-text" style="font-size:13px;color:var(--text-3)">Connecting...</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="loadTelegramUpdates()">↻ Refresh</button>
      </div>

      <!-- Messages -->
      <div id="tg-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px">
        <div class="spinner" style="margin:40px auto"></div>
      </div>

      <!-- Input -->
      <div style="padding:12px 16px 16px;border-top:1px solid var(--card-border)">
        <div style="display:flex;gap:10px;align-items:flex-end;background:var(--card-bg);
          border:1px solid var(--card-border);border-radius:var(--r-lg);padding:10px 12px">
          <textarea id="tg-input" rows="1" placeholder="Message..."
            style="flex:1;background:none;border:none;outline:none;color:var(--text-1);
              font-size:14px;font-family:inherit;resize:none;max-height:120px;overflow-y:auto"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendTelegram()}"
            oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"></textarea>
          <button onclick="sendTelegram()" style="width:34px;height:34px;border-radius:10px;
            background:var(--accent);border:none;cursor:pointer;color:white;font-size:15px;
            display:flex;align-items:center;justify-content:center;flex-shrink:0">↑</button>
        </div>
      </div>
    </div>
  `;

  checkTelegramStatus();
  loadTelegramUpdates();
}

async function checkTelegramStatus() {
  try {
    const r = await fetch('/api/telegram/status');
    const d = await r.json();
    const dot  = document.getElementById('tg-status-dot');
    const text = document.getElementById('tg-status-text');
    if (d.ok) {
      dot.style.background  = '#10b981';
      text.textContent      = `@${d.username} · Connected`;
    } else {
      dot.style.background  = '#ef4444';
      text.textContent      = 'Not connected — set telegram_token in Settings';
    }
  } catch {}
}

async function loadTelegramUpdates() {
  const el = document.getElementById('tg-messages');
  if (!el) return;
  try {
    const r = await fetch(`/api/telegram/updates?limit=50`);
    const d = await r.json();
    if (d.ok && d.messages.length) {
      el.innerHTML = d.messages.map(m => `
        <div style="display:flex;gap:8px;align-items:flex-start">
          <div style="width:32px;height:32px;border-radius:10px;flex-shrink:0;
            background:linear-gradient(135deg,#2AABEE,#229ED9);
            display:flex;align-items:center;justify-content:center;font-size:16px">✈️</div>
          <div>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:3px">${m.from} · ${m.date?.substring(11,16) || ''}</div>
            <div style="background:var(--card-bg);border:1px solid var(--card-border);
              padding:10px 14px;border-radius:4px 14px 14px 14px;font-size:14px;line-height:1.5">
              ${m.text || '(media)'}
            </div>
          </div>
        </div>
      `).join('');
      el.scrollTop = el.scrollHeight;
    } else if (d.ok) {
      el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-3)">
        <div style="font-size:36px;margin-bottom:12px">✈️</div>
        <div>No messages yet</div>
        <div style="font-size:12px;margin-top:6px">Messages from your Telegram bot will appear here</div>
      </div>`;
    } else {
      el.innerHTML = `<div style="padding:20px;color:var(--text-3);font-size:13px">${d.error}</div>`;
    }
  } catch (e) {
    el.innerHTML = `<div style="padding:20px;color:var(--text-3)">Error: ${e.message}</div>`;
  }
}

async function sendTelegram() {
  const input = document.getElementById('tg-input');
  const text  = input?.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  try {
    const r = await fetch('/api/telegram/send', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text})
    });
    const d = await r.json();
    if (d.ok) { toast('Sent', 'success'); loadTelegramUpdates(); }
    else toast('Failed: ' + d.error, 'error');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}
