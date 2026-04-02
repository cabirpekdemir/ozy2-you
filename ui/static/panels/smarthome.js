/* OZY2 — Smart Home Panel */

function init_smarthome(el) {
  el.innerHTML = `
    <div style="max-width:720px;margin:0 auto;padding:16px">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:20px;font-weight:700">🏠 Smart Home</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px">Control devices via webhooks</div>
        </div>
        <button onclick="shShowAddForm()"
          style="background:var(--accent);color:#fff;border:none;border-radius:10px;
                 padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer">+ Add Device</button>
      </div>

      <!-- Add Device Form -->
      <div id="sh-add-form" style="display:none;background:var(--card-bg);border:1px solid var(--card-border);
           border-radius:var(--r-lg);padding:20px;margin-bottom:20px">
        <div style="font-size:14px;font-weight:600;margin-bottom:14px">New Device</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Name *</div>
            <input id="sh-new-name" placeholder="Living Room Light" type="text"
              style="width:100%;box-sizing:border-box;background:var(--bg-base,#0e1018);border:1px solid var(--card-border);
                     border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;outline:none">
          </div>
          <div>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Icon</div>
            <input id="sh-new-icon" placeholder="💡" type="text"
              style="width:100%;box-sizing:border-box;background:var(--bg-base,#0e1018);border:1px solid var(--card-border);
                     border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;outline:none">
          </div>
        </div>
        <div style="margin-bottom:10px">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Webhook — ON (GET URL)</div>
          <input id="sh-new-on" placeholder="http://192.168.1.x/on" type="url"
            style="width:100%;box-sizing:border-box;background:var(--bg-base,#0e1018);border:1px solid var(--card-border);
                   border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;outline:none">
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">Webhook — OFF (GET URL)</div>
          <input id="sh-new-off" placeholder="http://192.168.1.x/off" type="url"
            style="width:100%;box-sizing:border-box;background:var(--bg-base,#0e1018);border:1px solid var(--card-border);
                   border-radius:8px;padding:8px 12px;color:var(--text-1);font-size:13px;outline:none">
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="shSaveDevice()"
            style="background:var(--accent);color:#fff;border:none;border-radius:8px;
                   padding:9px 20px;font-size:13px;font-weight:600;cursor:pointer">Save</button>
          <button onclick="shHideAddForm()"
            style="background:transparent;color:var(--text-3);border:1px solid var(--card-border);
                   border-radius:8px;padding:9px 16px;font-size:13px;cursor:pointer">Cancel</button>
        </div>
      </div>

      <!-- Device Grid -->
      <div id="sh-devices" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px"></div>

      <!-- Empty state -->
      <div id="sh-empty" style="display:none;background:var(--card-bg);border:1px solid var(--card-border);
           border-radius:var(--r-lg);padding:48px 24px;text-align:center">
        <div style="font-size:52px;margin-bottom:12px">🏠</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-2);margin-bottom:6px">No devices yet</div>
        <div style="font-size:13px;color:var(--text-3);margin-bottom:20px;max-width:280px;margin-left:auto;margin-right:auto">
          Add devices with webhook URLs to control smart home gadgets (Shelly, Tasmota, Home Assistant, etc.)
        </div>
        <button onclick="shShowAddForm()"
          style="background:var(--accent);color:#fff;border:none;border-radius:10px;
                 padding:9px 20px;font-size:13px;font-weight:600;cursor:pointer">+ Add First Device</button>
      </div>

      <!-- Info footer -->
      <div style="margin-top:20px;background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.15);
           border-radius:10px;padding:12px 16px;font-size:12px;color:var(--text-3)">
        💡 Supports any device with a GET webhook: <strong style="color:var(--text-2)">Shelly</strong>,
        <strong style="color:var(--text-2)">Tasmota</strong>,
        <strong style="color:var(--text-2)">Home Assistant</strong>,
        <strong style="color:var(--text-2)">ESPHome</strong> and more.
        Devices must be on the same network or reachable via internet.
      </div>
    </div>`;
  shLoad();
}

async function shLoad() {
  try {
    const d = await (await fetch('/api/smarthome/devices')).json();
    shRender(d.devices || []);
  } catch { shRender([]); }
}

function shRender(devices) {
  const grid  = document.getElementById('sh-devices');
  const empty = document.getElementById('sh-empty');
  if (!devices.length) {
    grid.style.display  = 'none';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  grid.style.display  = 'grid';
  grid.innerHTML = devices.map(d => {
    const on = d.state;
    return `
      <div style="background:var(--card-bg);border:1px solid ${on ? 'rgba(245,158,11,.5)' : 'var(--card-border)'};
                  border-radius:var(--r-lg);padding:18px;position:relative;transition:border-color .2s">
        <button onclick="shDelete('${d.id}')"
          style="position:absolute;top:10px;right:10px;background:none;border:none;
                 color:var(--text-3);cursor:pointer;font-size:13px;padding:2px 6px;opacity:.6"
          title="Remove">✕</button>
        <div style="font-size:36px;margin-bottom:10px">${d.icon || '💡'}</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:4px;padding-right:20px">${d.name}</div>
        <div style="font-size:11px;color:${on ? '#f59e0b' : 'var(--text-3)'};margin-bottom:14px;font-weight:600">
          ${on ? '● ON' : '○ OFF'}
        </div>
        <button onclick="shToggle('${d.id}')"
          style="width:100%;background:${on ? '#f59e0b' : 'var(--accent-dim,rgba(99,102,241,.12))'};
                 color:${on ? '#fff' : 'var(--accent)'};
                 border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer;
                 transition:all .2s">
          ${on ? '⏻ Turn Off' : '⏻ Turn On'}
        </button>
      </div>`;
  }).join('');
}

async function shToggle(id) {
  try {
    const d = await (await fetch(`/api/smarthome/devices/${id}/toggle`, {method:'POST'})).json();
    if (d.ok) shLoad();
  } catch {}
}

async function shDelete(id) {
  if (!confirm('Remove this device?')) return;
  await fetch(`/api/smarthome/devices/${id}`, {method:'DELETE'});
  shLoad();
}

function shShowAddForm() {
  document.getElementById('sh-add-form').style.display = '';
  document.getElementById('sh-new-name').focus();
}
function shHideAddForm() {
  document.getElementById('sh-add-form').style.display = 'none';
  ['sh-new-name','sh-new-icon','sh-new-on','sh-new-off'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

async function shSaveDevice() {
  const name = document.getElementById('sh-new-name').value.trim();
  if (!name) { document.getElementById('sh-new-name').focus(); return; }
  const body = {
    name,
    icon:        document.getElementById('sh-new-icon').value.trim() || '💡',
    webhook_on:  document.getElementById('sh-new-on').value.trim(),
    webhook_off: document.getElementById('sh-new-off').value.trim(),
  };
  const r = await fetch('/api/smarthome/devices', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  });
  if ((await r.json()).ok) { shHideAddForm(); shLoad(); }
}
