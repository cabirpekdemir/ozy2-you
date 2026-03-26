/* OZY2 — Briefing Panel */

function init_briefing(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:700px;margin:0 auto">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700;margin:0">Morning Briefing</h2>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="sendBriefingTelegram()">📨 Send to Telegram</button>
          <button class="btn btn-primary btn-sm" onclick="loadBriefing()">↻ Refresh</button>
        </div>
      </div>

      <div id="briefing-content">
        <div class="spinner" style="margin:80px auto"></div>
      </div>

    </div>
  `;

  loadBriefing();
}

async function loadBriefing() {
  const el = document.getElementById('briefing-content');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:80px auto"></div>`;
  try {
    const r = await fetch('/api/briefing');
    const d = await r.json();
    if (d.ok) {
      el.innerHTML = `
        <div class="card" style="padding:24px;margin-bottom:16px;
          background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.05))">
          <div style="font-size:16px;font-weight:600;margin-bottom:4px">☀️ ${d.date}</div>
          <div style="color:var(--text-3);font-size:13px">Your daily overview</div>
        </div>
        ${d.sections.map(s => `
          <div class="card" style="padding:18px 20px;margin-bottom:12px">
            <div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${s.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')}</div>
          </div>
        `).join('')}
      `;
    } else {
      el.innerHTML = `<div class="card" style="padding:24px;color:var(--text-3)">
        <p>Could not load briefing: ${d.error || 'Unknown error'}</p>
        <p style="font-size:12px">Make sure your Google integrations are connected in Settings.</p>
      </div>`;
    }
  } catch (e) {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Error: ${e.message}</div>`;
  }
}

async function sendBriefingTelegram() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {
    const r = await fetch('/api/briefing/send', {method:'POST'});
    const d = await r.json();
    if (d.ok) toast('Briefing sent to Telegram!', 'success');
    else toast('Failed: ' + (d.error || ''), 'error');
  } catch {
    toast('Send failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📨 Send to Telegram';
  }
}
