/* OZY2 — Automations Panel */

function init_automations(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:800px;margin:0 auto">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">Automations</h2>
          <div style="color:var(--text-3);font-size:13px">Scheduled tasks and triggers</div>
        </div>
        <button class="btn btn-primary" onclick="openAutoModal()">+ New Automation</button>
      </div>

      <!-- Built-in automations -->
      <div style="font-size:12px;font-weight:700;color:var(--text-3);
        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Built-in</div>

      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
        ${[
          {name:'Morning Briefing', desc:'Send daily briefing to Telegram', icon:'☀️', schedule:'08:30 daily', enabled:true},
          {name:'Email Check',      desc:'Check for new emails every 30 min', icon:'📧', schedule:'Every 30 min', enabled:false},
        ].map(a => `
          <div class="card" style="padding:16px;display:flex;align-items:center;gap:14px">
            <div style="width:40px;height:40px;border-radius:12px;background:var(--card-border);
              display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
              ${a.icon}
            </div>
            <div style="flex:1">
              <div style="font-weight:500;font-size:14px">${a.name}</div>
              <div style="font-size:12px;color:var(--text-3)">${a.desc}</div>
              <div style="font-size:11px;color:var(--accent);margin-top:2px">⏰ ${a.schedule}</div>
            </div>
            <label class="toggle" style="flex-shrink:0">
              <input type="checkbox" ${a.enabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        `).join('')}
      </div>

      <!-- Custom automations -->
      <div style="font-size:12px;font-weight:700;color:var(--text-3);
        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Custom</div>
      <div id="custom-automations">
        <div class="card" style="padding:20px;text-align:center;color:var(--text-3)">
          <div style="font-size:32px;margin-bottom:8px">⚙️</div>
          <div style="font-size:14px">No custom automations yet</div>
          <div style="font-size:12px;margin-top:4px">Create automations to run tasks on a schedule</div>
        </div>
      </div>

    </div>

    <!-- New Automation Modal -->
    <div id="auto-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:200;align-items:center;justify-content:center">
      <div class="card" style="width:min(440px,90vw);padding:24px">
        <div style="font-size:18px;font-weight:600;margin-bottom:16px">New Automation</div>
        <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:6px">Name</label>
        <input id="auto-name" class="input" placeholder="e.g. Weekly report" style="width:100%;margin-bottom:10px">
        <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:6px">Action</label>
        <select id="auto-action" class="input" style="width:100%;margin-bottom:10px">
          <option value="briefing">Send Morning Briefing</option>
          <option value="email_check">Check New Emails</option>
          <option value="calendar_summary">Calendar Summary</option>
        </select>
        <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:6px">Schedule</label>
        <select id="auto-schedule" class="input" style="width:100%;margin-bottom:16px">
          <option value="daily_08">Daily at 8:00</option>
          <option value="daily_09">Daily at 9:00</option>
          <option value="every_30m">Every 30 minutes</option>
          <option value="every_1h">Every hour</option>
          <option value="weekly_mon">Every Monday</option>
        </select>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="closeAutoModal()">Cancel</button>
          <button class="btn btn-primary" onclick="createAutomation()">Create</button>
        </div>
      </div>
    </div>

    <style>
      .toggle { position:relative; display:inline-block; width:44px; height:24px; }
      .toggle input { display:none; }
      .toggle-slider { position:absolute; cursor:pointer; inset:0; background:#374151;
        border-radius:12px; transition:.3s; }
      .toggle-slider:before { content:''; position:absolute; width:18px; height:18px;
        left:3px; top:3px; background:white; border-radius:50%; transition:.3s; }
      .toggle input:checked + .toggle-slider { background:var(--accent); }
      .toggle input:checked + .toggle-slider:before { transform:translateX(20px); }
    </style>
  `;
}

function openAutoModal() {
  const m = document.getElementById('auto-modal');
  if (m) m.style.display = 'flex';
}
function closeAutoModal() {
  const m = document.getElementById('auto-modal');
  if (m) m.style.display = 'none';
}

function createAutomation() {
  const name = document.getElementById('auto-name')?.value.trim();
  if (!name) { toast('Name required', 'error'); return; }
  toast('Automation saved (demo)', 'success');
  closeAutoModal();
}
