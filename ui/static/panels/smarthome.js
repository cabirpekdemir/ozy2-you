/* OZY2 — Smart Home Panel */

let _shDevices = [];
let _shDomain  = 'all';
let _shDomains = [];

async function init_smarthome(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🏠 Smart Home</h2>
        <button class="btn btn-ghost btn-sm" onclick="shShowConfig()">⚙️ Configure</button>
      </div>

      <div id="sh-setup-banner" style="display:none" class="card" style="background:var(--bg2);padding:20px;text-align:center;margin-bottom:16px">
        <div style="font-size:40px;margin-bottom:10px">🏠</div>
        <h3>Connect Home Assistant</h3>
        <p class="text-2">Control your lights, thermostat, and other smart devices through OZY2.</p>
        <button class="btn btn-primary" onclick="shShowConfig()">Connect Now</button>
      </div>

      <!-- Domain filter -->
      <div id="sh-domain-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px"></div>

      <!-- Search -->
      <input id="sh-search" class="input" placeholder="Search devices..." oninput="shFilter()"
             style="margin-bottom:12px;display:none">

      <!-- Device grid -->
      <div id="sh-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px"></div>

      <!-- Config Modal -->
      <div id="sh-config-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;align-items:center;justify-content:center">
        <div style="background:var(--bg2);border-radius:16px;padding:28px;width:100%;max-width:460px;margin:16px">
          <h3 style="margin:0 0 6px">Home Assistant Setup</h3>
          <p class="text-2" style="margin-bottom:16px">
            Enter your Home Assistant URL and a <a href="https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token" target="_blank" style="color:var(--accent)">Long-Lived Access Token</a>.
          </p>
          <div style="display:grid;gap:10px">
            <input id="sh-url" class="input" placeholder="http://homeassistant.local:8123" type="url">
            <input id="sh-token" class="input" placeholder="Long-Lived Access Token" type="password">
          </div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-primary" onclick="shSaveConfig()">Connect</button>
            <button class="btn btn-ghost" onclick="shCloseConfig()">Cancel</button>
          </div>
          <div id="sh-config-msg" style="margin-top:10px;font-size:13px"></div>
        </div>
      </div>
    </div>`;

  await shLoad();
}

async function shLoad() {
  // Check config
  const cfg = await fetch('/api/smarthome/config').then(r => r.json());
  if (!cfg.configured) {
    document.getElementById('sh-setup-banner').style.display = 'block';
    document.getElementById('sh-grid').innerHTML = '';
    return;
  }
  document.getElementById('sh-setup-banner').style.display = 'none';

  // Load domains
  const domR = await fetch('/api/smarthome/domains').then(r => r.json());
  _shDomains = (domR.domains || []).filter(d => ['light','switch','climate','sensor','media_player','cover','fan','lock'].includes(d));
  shRenderDomainBar();

  // Load devices
  await shLoadDevices();
}

async function shLoadDevices() {
  const url = `/api/smarthome/states?domain=${_shDomain}`;
  const r = await fetch(url).then(r => r.json());
  if (!r.ok) {
    if (r.setup_required) {
      document.getElementById('sh-setup-banner').style.display = 'block';
    }
    return;
  }
  _shDevices = r.devices || [];
  document.getElementById('sh-search').style.display = _shDevices.length > 6 ? 'block' : 'none';
  shRenderGrid(_shDevices);
}

function shRenderDomainBar() {
  const el = document.getElementById('sh-domain-row');
  const domains = ['all', ..._shDomains];
  const icons = { all:'🌐', light:'💡', switch:'🔌', climate:'🌡️', sensor:'📡', media_player:'📺', cover:'🪟', fan:'💨', lock:'🔒' };
  el.innerHTML = domains.map(d => `
    <button class="btn btn-ghost btn-sm ${d===_shDomain?'active':''}" onclick="shSetDomain('${d}',this)">
      ${icons[d]||'⚙️'} ${d==='all'?'All':d}
    </button>
  `).join('');
}

function shSetDomain(domain, btn) {
  _shDomain = domain;
  document.querySelectorAll('#sh-domain-row .btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  shLoadDevices();
}

function shFilter() {
  const q = document.getElementById('sh-search').value.toLowerCase();
  const filtered = q ? _shDevices.filter(d =>
    d.name.toLowerCase().includes(q) || d.entity_id.toLowerCase().includes(q)
  ) : _shDevices;
  shRenderGrid(filtered);
}

function shRenderGrid(devices) {
  const el = document.getElementById('sh-grid');
  if (!devices.length) {
    el.innerHTML = '<p class="text-2" style="grid-column:1/-1">No devices found.</p>';
    return;
  }
  el.innerHTML = devices.map(d => shDeviceCard(d)).join('');
}

function shDeviceCard(d) {
  const domain = d.entity_id.split('.')[0];
  const isOn   = d.state === 'on';
  const isOff  = d.state === 'off';
  const icons  = { light:'💡', switch:'🔌', climate:'🌡️', sensor:'📡', media_player:'📺', cover:'🪟', fan:'💨', lock:'🔒' };
  const icon   = icons[domain] || '⚙️';
  const stateColor = isOn ? 'var(--accent)' : isOff ? 'var(--text3)' : 'var(--text2)';
  const bgColor    = isOn ? 'rgba(79,142,247,.12)' : 'var(--bg2)';
  const canToggle  = ['light','switch','fan','media_player'].includes(domain);
  const temp       = d.temperature ? `${d.temperature}°` : '';
  const unit       = d.unit || '';
  const stateText  = temp || (d.state + (unit ? ' ' + unit : ''));

  return `
  <div style="background:${bgColor};border:1px solid var(--border);border-radius:14px;padding:16px;cursor:${canToggle?'pointer':'default'}"
       onclick="${canToggle ? `shToggle('${d.entity_id}',this)` : ''}">
    <div style="font-size:28px;margin-bottom:8px">${icon}</div>
    <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px">${d.name}</div>
    <div style="font-size:12px;color:${stateColor}">${stateText}</div>
    ${domain === 'light' && isOn ? `
      <input type="range" min="0" max="255" value="${d.brightness||128}"
             style="width:100%;margin-top:8px;accent-color:var(--accent)"
             oninput="shSetBrightness('${d.entity_id}',this.value)"
             onclick="event.stopPropagation()">
    ` : ''}
    ${domain === 'climate' ? `
      <div style="display:flex;gap:4px;margin-top:8px" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-icon" style="font-size:16px" onclick="shSetTemp('${d.entity_id}',-1)">−</button>
        <span style="flex:1;text-align:center;line-height:2">${d.temperature || '--'}°</span>
        <button class="btn btn-ghost btn-icon" style="font-size:16px" onclick="shSetTemp('${d.entity_id}',+1)">+</button>
      </div>
    ` : ''}
  </div>`;
}

async function shToggle(entityId, card) {
  card.style.opacity = '0.5';
  const r = await fetch('/api/smarthome/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entityId, action: 'toggle' }),
  });
  const d = await r.json();
  if (d.ok) {
    setTimeout(() => shLoadDevices(), 600); // HA needs a moment
  } else {
    toast(d.error || 'Control failed', 'error');
    card.style.opacity = '1';
  }
}

let _brightnessTimer = {};
function shSetBrightness(entityId, value) {
  clearTimeout(_brightnessTimer[entityId]);
  _brightnessTimer[entityId] = setTimeout(async () => {
    await fetch('/api/smarthome/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_id: entityId, action: 'turn_on', brightness: parseInt(value) }),
    });
  }, 300);
}

async function shSetTemp(entityId, delta) {
  const device = _shDevices.find(d => d.entity_id === entityId);
  const current = parseFloat(device?.temperature || 20);
  const newTemp = current + delta;
  await fetch('/api/smarthome/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entityId, action: 'set_temperature', temperature: newTemp }),
  });
  setTimeout(() => shLoadDevices(), 800);
}

// ── Config Modal ───────────────────────────────────────────────────────────

function shShowConfig() {
  fetch('/api/smarthome/config').then(r => r.json()).then(cfg => {
    if (cfg.url) document.getElementById('sh-url').value = cfg.url;
  });
  document.getElementById('sh-config-modal').style.display = 'flex';
}

function shCloseConfig() {
  document.getElementById('sh-config-modal').style.display = 'none';
  document.getElementById('sh-config-msg').textContent = '';
}

async function shSaveConfig() {
  const url   = document.getElementById('sh-url').value.trim();
  const token = document.getElementById('sh-token').value.trim();
  const msgEl = document.getElementById('sh-config-msg');
  if (!url || !token) { msgEl.textContent = 'Please enter URL and token.'; return; }
  msgEl.textContent = 'Connecting...';
  const r = await fetch('/api/smarthome/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, token }),
  });
  const d = await r.json();
  if (d.ok) {
    msgEl.style.color = 'var(--green)';
    msgEl.textContent = `✓ ${d.message}`;
    setTimeout(() => { shCloseConfig(); shLoad(); }, 1200);
  } else {
    msgEl.style.color = 'var(--red)';
    msgEl.textContent = d.error || 'Connection failed';
  }
}
