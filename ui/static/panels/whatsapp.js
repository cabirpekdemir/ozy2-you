/* OZY2 — WhatsApp Panel */

function init_whatsapp(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:700px;margin:0 auto">
      <div style="margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">WhatsApp</h2>
        <div style="color:var(--text-3);font-size:13px">Messaging via whatsapp-web.js bridge</div>
      </div>

      <div class="card" style="padding:40px;text-align:center">
        <div style="font-size:48px;margin-bottom:16px">💬</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">WhatsApp Bridge</div>
        <div style="color:var(--text-3);font-size:13px;max-width:360px;margin:0 auto 20px">
          OZY2 connects to WhatsApp via the Node.js whatsapp-web.js bridge.
          Start the bridge to enable messaging.
        </div>

        <div style="background:var(--bg-layer2);border:1px solid var(--card-border);
          border-radius:var(--r-md);padding:16px;font-family:monospace;font-size:13px;
          text-align:left;max-width:400px;margin:0 auto 20px;color:var(--text-2)">
          # From terminal:<br>
          cd ~/Ozy2<br>
          node skills/whatsapp/bot.js
        </div>

        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-ghost" onclick="checkWAStatus()">Check Status</button>
          <button class="btn btn-ghost" onclick="showPanel('chat')">Use Chat Instead →</button>
        </div>

        <div id="wa-status" style="margin-top:16px;font-size:13px;color:var(--text-3)"></div>
      </div>
    </div>
  `;
}

async function checkWAStatus() {
  const el = document.getElementById('wa-status');
  if (!el) return;
  try {
    const r = await fetch('/api/whatsapp/status');
    const d = await r.json();
    el.textContent = d.ok ? '✓ Bridge connected' : '✗ Bridge not running';
    el.style.color = d.ok ? '#10b981' : '#ef4444';
  } catch {
    el.textContent = '✗ Bridge not running';
    el.style.color = '#ef4444';
  }
}
