/* OZY2 — Settings Panel */

function init_settings(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:700px;margin:0 auto">

      <h2 style="font-size:20px;font-weight:700;margin:0 0 20px">Settings</h2>

      <!-- AI Provider -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:16px;font-size:15px;font-weight:600">AI Provider</div>

        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">Provider</label>
        <select id="s-provider" class="input" style="width:100%;margin-bottom:12px"
          onchange="updateModelOptions()">
          <option value="gemini">Gemini (Google)</option>
          <option value="openai">OpenAI (ChatGPT)</option>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="ollama">Ollama (Local)</option>
        </select>

        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">Model</label>
        <select id="s-model" class="input" style="width:100%;margin-bottom:12px"></select>

        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">API Key</label>
        <div style="display:flex;gap:8px;margin-bottom:4px">
          <input id="s-api-key" type="password" class="input" placeholder="Enter API key..."
            style="flex:1">
          <button class="btn btn-ghost btn-icon" onclick="toggleApiKeyVisibility()"
            id="s-eye" title="Show/hide">👁</button>
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">
          Stored locally. Never sent anywhere except to your chosen provider.
        </div>
      </div>

      <!-- Appearance -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:16px;font-size:15px;font-weight:600">Appearance</div>
        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">Theme</label>
        <div style="display:flex;gap:8px">
          <button id="theme-dark" class="btn btn-primary" onclick="setTheme('dark')">🌙 Dark</button>
          <button id="theme-light" class="btn btn-ghost" onclick="setTheme('light')">☀️ Light</button>
        </div>
      </div>

      <!-- Integrations -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:16px;font-size:15px;font-weight:600">Integrations</div>

        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">Telegram Bot Token</label>
        <input id="s-telegram" type="password" class="input" placeholder="1234567890:AABBcc..."
          style="width:100%;margin-bottom:12px">

        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">
          Telegram Chat ID
          <span style="font-size:11px;color:var(--text-3);font-weight:400">
            — <a href="https://t.me/userinfobot" target="_blank" style="color:var(--accent)">@userinfobot</a>'a yaz, ID'ni yolla
          </span>
        </label>
        <input id="s-telegram-users" class="input" placeholder="123456789"
          style="width:100%;margin-bottom:12px">

        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">GitHub Token</label>
        <input id="s-github" type="password" class="input" placeholder="ghp_..."
          style="width:100%;margin-bottom:12px">

        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">GitHub Username</label>
        <input id="s-github-user" class="input" placeholder="your-username"
          style="width:100%;margin-bottom:12px">

        <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">Your Name</label>
        <input id="s-name" class="input" placeholder="Cabir"
          style="width:100%;margin-bottom:12px">
      </div>

      <!-- Gmail / Google OAuth -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:16px;font-size:15px;font-weight:600">📧 Gmail, Calendar & Drive</div>

        <div id="google-status" style="font-size:13px;margin-bottom:16px;padding:12px 14px;border-radius:10px;background:var(--bg-2,#111);border-left:3px solid #333">
          Checking...
        </div>

        <!-- Connected state: just show gmail input -->
        <div id="google-connected-section" style="display:none">
          <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">Gmail Address</label>
          <input id="s-gmail" class="input" placeholder="you@gmail.com" style="width:100%;margin-bottom:12px">
          <button class="btn btn-ghost" style="font-size:12px;color:#ef4444" onclick="disconnectGoogle()">
            Disconnect Google
          </button>
        </div>

        <!-- Not connected state: credentials + connect button -->
        <div id="google-setup-section" style="display:none">
          <div style="font-size:13px;color:var(--text-3);margin-bottom:12px;line-height:1.6">
            Paste your <strong>google_credentials.json</strong> content below, then click Connect.<br>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank"
               style="color:var(--accent,#4f8ef7);font-size:12px">
              Get credentials from Google Cloud Console →
            </a>
          </div>
          <textarea id="s-google-creds" class="input"
            placeholder='{"installed": {"client_id": "...", "client_secret": "..."}}'
            style="width:100%;height:90px;font-size:11px;font-family:monospace;margin-bottom:12px;resize:vertical"></textarea>
          <button class="btn btn-primary" style="width:100%" onclick="connectGoogle()">
            🔗 Connect Google Account
          </button>
          <div id="google-auth-progress" style="display:none;margin-top:10px;font-size:13px;color:var(--text-3);text-align:center">
            ⏳ Browser opened — complete sign-in there…
          </div>
        </div>

      </div>

      <!-- Security -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:4px;font-size:15px;font-weight:600">🔐 Security & Access</div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:16px">
          Set a PIN to protect OZY2. Required when remote access is enabled.
        </div>

        <!-- Port setting -->
        <div style="margin-bottom:16px">
          <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">
            Port
            <span style="font-size:11px;color:var(--text-3);font-weight:400"> — default 8082. Change if another app uses the same port (e.g. 8082). Restart required.</span>
          </label>
          <input id="s-port" type="number" class="input" placeholder="8082" min="1024" max="65535"
            style="width:140px">
        </div>

        <!-- Remote access toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding:12px 14px;background:var(--bg-2,#111);border-radius:10px">
          <div>
            <div style="font-size:13px;font-weight:600">Remote Access</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:2px">
              Allow access from other devices on your network
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="s-remote-access" onchange="toggleRemoteAccess(this)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div id="remote-ip-info" style="display:none;font-size:12px;color:var(--text-3);margin-bottom:16px;padding:10px 14px;background:#4f8ef711;border:1px solid #4f8ef733;border-radius:8px">
          📡 Open <strong id="remote-url">http://&lt;your-ip&gt;:8082</strong> on other devices.<br>
          <span style="color:#f59e0b">⚠ Restart OZY2 for this to take effect.</span>
        </div>

        <!-- PIN setup -->
        <div id="pin-status-line" style="font-size:13px;color:var(--text-3);margin-bottom:12px"></div>

        <div style="display:grid;gap:10px">
          <div>
            <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px" id="pin-current-label">Current PIN</label>
            <input id="s-pin-current" type="password" inputmode="numeric" maxlength="6"
              class="input" placeholder="Leave empty if no PIN set" style="width:100%">
          </div>
          <div>
            <label style="font-size:13px;color:var(--text-3);display:block;margin-bottom:6px">New PIN (4–6 digits)</label>
            <input id="s-pin-new" type="password" inputmode="numeric" maxlength="6"
              class="input" placeholder="e.g. 1234" style="width:100%">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="flex:1" onclick="savePin()">Set PIN</button>
            <button class="btn btn-ghost" style="color:#ef4444" onclick="removePin()" id="btn-remove-pin">Remove PIN</button>
          </div>
          <div id="pin-msg" style="font-size:12px;min-height:16px"></div>
        </div>
      </div>

      <!-- Health Check -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:4px;font-size:15px;font-weight:600">🏥 Sistem Sağlığı</div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:14px">
          Tüm servisleri test eder. Rapor otomatik olarak 09:00 ve 21:00'da Telegram'a gönderilir.
        </div>
        <div id="health-result" style="margin-bottom:12px"></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" style="flex:1" onclick="healthRun()">🔍 Şimdi Test Et</button>
          <button class="btn btn-ghost" style="flex:1" onclick="healthSend()">📩 Telegram'a Gönder</button>
        </div>
      </div>

      <!-- Save -->
      <button class="btn btn-primary" style="width:100%;padding:13px"
        onclick="saveSettings()">Save Settings</button>

    </div>
  `;

  loadCurrentSettings();
  checkGoogleStatus();
  loadSecurityStatus();
}

const MODELS = {
  gemini:    ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  ollama:    ['llama3.3', 'mistral', 'phi4', 'qwen2.5', 'deepseek-r1'],
};

function updateModelOptions() {
  const provider = document.getElementById('s-provider')?.value;
  const sel      = document.getElementById('s-model');
  if (!sel || !provider) return;
  const models = MODELS[provider] || [];
  sel.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
}

async function loadCurrentSettings() {
  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    if (d.ok) {
      const s = d.settings;
      const provSel = document.getElementById('s-provider');
      if (provSel) provSel.value = s.provider || 'gemini';
      updateModelOptions();
      const modSel = document.getElementById('s-model');
      if (modSel) modSel.value = s.model || '';
      const apiKey = document.getElementById('s-api-key');
      if (apiKey) apiKey.value = s.api_key || '';
      const telegram = document.getElementById('s-telegram');
      if (telegram) telegram.value = s.telegram_token || '';
      const telegramUsers = document.getElementById('s-telegram-users');
      if (telegramUsers) telegramUsers.value = s.telegram_users || '';
      const github = document.getElementById('s-github');
      if (github) github.value = s.github_token || '';
      const githubUser = document.getElementById('s-github-user');
      if (githubUser) githubUser.value = s.github_username || '';
      const name = document.getElementById('s-name');
      if (name) name.value = s.user_name || '';
      const port = document.getElementById('s-port');
      if (port) port.value = s.port || 8082;
      const gmail = document.getElementById('s-gmail');
      const emailAccounts = s.email_accounts || [];
      const gmailAcc = emailAccounts.find(a => a.provider === 'gmail');
      if (gmail) gmail.value = gmailAcc?.email || '';
      // Theme
      const theme = s.theme || 'dark';
      document.getElementById(`theme-${theme}`)?.click();
    }
  } catch {}
}

async function saveSettings() {
  const data = {
    provider:        document.getElementById('s-provider')?.value,
    model:           document.getElementById('s-model')?.value,
    api_key:         document.getElementById('s-api-key')?.value,
    telegram_token:  document.getElementById('s-telegram')?.value,
    telegram_users:  document.getElementById('s-telegram-users')?.value,
    github_token:    document.getElementById('s-github')?.value,
    github_username: document.getElementById('s-github-user')?.value,
    user_name:       document.getElementById('s-name')?.value,
    port:            parseInt(document.getElementById('s-port')?.value) || 8082,
    theme:           document.body.classList.contains('theme-light') ? 'light' : 'dark',
    email_accounts:  (() => {
      const gmail = document.getElementById('s-gmail')?.value?.trim();
      return gmail ? [{ provider: 'gmail', email: gmail, active: true }] : [];
    })(),
  };
  try {
    const r = await fetch('/api/settings', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    const d = await r.json();
    if (d.ok) toast('Settings saved', 'success');
    else toast('Save failed: ' + d.error, 'error');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

function toggleApiKeyVisibility() {
  const inp = document.getElementById('s-api-key');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

function setTheme(theme) {
  document.body.classList.toggle('theme-light', theme === 'light');
  document.getElementById('theme-dark')?.classList.toggle('btn-primary', theme === 'dark');
  document.getElementById('theme-dark')?.classList.toggle('btn-ghost',   theme !== 'dark');
  document.getElementById('theme-light')?.classList.toggle('btn-primary', theme === 'light');
  document.getElementById('theme-light')?.classList.toggle('btn-ghost',   theme !== 'light');
  localStorage.setItem('ozy-theme', theme);
}

async function checkGoogleStatus() {
  const el        = document.getElementById('google-status');
  const connected = document.getElementById('google-connected-section');
  const setup     = document.getElementById('google-setup-section');
  if (!el) return;
  try {
    const r = await fetch('/api/google/status');
    const d = await r.json();
    if (d.connected) {
      el.innerHTML = `<span style="color:#10b981;font-weight:600">✓ Connected</span> — Gmail, Calendar and Drive active.`;
      el.style.borderLeft = '3px solid #10b981';
      if (connected) connected.style.display = 'block';
      if (setup)     setup.style.display     = 'none';
    } else {
      el.innerHTML = `<span style="color:#f59e0b;font-weight:600">⚠ Not connected on this device</span>`;
      el.style.borderLeft = '3px solid #f59e0b';
      if (connected) connected.style.display = 'none';
      if (setup)     setup.style.display     = 'block';
    }
  } catch {
    el.innerHTML = `<span style="color:#ef4444;font-weight:600">✗ Error checking status</span>`;
  }
}

async function connectGoogle() {
  const credsEl = document.getElementById('s-google-creds');
  const progress = document.getElementById('google-auth-progress');
  const content = credsEl?.value?.trim();

  if (content) {
    const r = await fetch('/api/google/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const d = await r.json();
    if (!d.ok) { toast('Credentials error: ' + d.error, 'error'); return; }
  }

  const r2 = await fetch('/api/google/auth/start', { method: 'POST' });
  const d2 = await r2.json();
  if (!d2.ok) { toast(d2.error || 'Could not start auth', 'error'); return; }

  if (progress) progress.style.display = 'block';
  toast('Browser opened — sign in with Google', 'success');

  // Poll until done
  const poll = setInterval(async () => {
    const s = await fetch('/api/google/auth/status').then(r => r.json());
    if (s.state === 'done') {
      clearInterval(poll);
      if (progress) progress.style.display = 'none';
      toast('✓ Google connected!', 'success');
      checkGoogleStatus();
    } else if (s.state === 'error') {
      clearInterval(poll);
      if (progress) progress.style.display = 'none';
      toast('Auth error: ' + s.error, 'error');
    }
  }, 2000);
}

async function disconnectGoogle() {
  await fetch('/api/google/status');
  toast('To disconnect, delete ~/Ozy2/config/google_token.json', 'info');
}

// ── Security / PIN ────────────────────────────────────────────────────────────

async function loadSecurityStatus() {
  try {
    const r = await fetch('/api/auth/status');
    const d = await r.json();

    // PIN status
    const line = document.getElementById('pin-status-line');
    if (line) {
      line.innerHTML = d.pin_set
        ? `🔒 <strong>PIN is active</strong> — enter current PIN to change it.`
        : `🔓 <strong>No PIN set</strong> — OZY2 opens without authentication.`;
    }
    const removeBtn = document.getElementById('btn-remove-pin');
    if (removeBtn) removeBtn.style.display = d.pin_set ? 'block' : 'none';

    // Remote access
    const toggle = document.getElementById('s-remote-access');
    if (toggle) toggle.checked = d.remote_access;
    updateRemoteInfo(d.remote_access);
  } catch {}
}

async function savePin() {
  const current = document.getElementById('s-pin-current')?.value || '';
  const newPin  = document.getElementById('s-pin-new')?.value || '';
  const msg     = document.getElementById('pin-msg');
  if (!newPin) { if (msg) msg.innerHTML = `<span style="color:#f59e0b">Enter a new PIN.</span>`; return; }
  try {
    const r = await fetch('/api/auth/pin', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({current_pin: current, new_pin: newPin}),
    });
    const d = await r.json();
    if (d.ok) {
      if (msg) msg.innerHTML = `<span style="color:#10b981">✓ PIN updated!</span>`;
      document.getElementById('s-pin-current').value = '';
      document.getElementById('s-pin-new').value = '';
      loadSecurityStatus();
    } else {
      if (msg) msg.innerHTML = `<span style="color:#f43f5e">${d.error}</span>`;
    }
  } catch (e) { if (msg) msg.innerHTML = `<span style="color:#f43f5e">Error: ${e.message}</span>`; }
}

async function removePin() {
  const current = document.getElementById('s-pin-current')?.value || '';
  const msg = document.getElementById('pin-msg');
  try {
    const r = await fetch('/api/auth/pin', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({current_pin: current, new_pin: ''}),
    });
    const d = await r.json();
    if (d.ok) {
      if (msg) msg.innerHTML = `<span style="color:#10b981">✓ PIN removed.</span>`;
      loadSecurityStatus();
    } else {
      if (msg) msg.innerHTML = `<span style="color:#f43f5e">${d.error}</span>`;
    }
  } catch (e) { if (msg) msg.innerHTML = `<span style="color:#f43f5e">Error: ${e.message}</span>`; }
}

async function toggleRemoteAccess(checkbox) {
  const enabled = checkbox.checked;
  updateRemoteInfo(enabled);
  try {
    await fetch('/api/settings', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({remote_access: enabled}),
    });
    toast(enabled ? '📡 Remote access enabled — restart OZY2' : '🔒 Remote access disabled — restart OZY2', 'success');
  } catch {}
}

async function updateRemoteInfo(enabled) {
  const info = document.getElementById('remote-ip-info');
  if (!info) return;
  info.style.display = enabled ? 'block' : 'none';
  if (enabled) {
    try {
      const r = await fetch('/api/settings');
      const d = await r.json();
    } catch {}
    document.getElementById('remote-url').textContent = `http://<your-mac-ip>:8082`;
  }
}

// Toggle switch CSS (injected once)
(function injectToggleCSS() {
  if (document.getElementById('toggle-switch-css')) return;
  const s = document.createElement('style');
  s.id = 'toggle-switch-css';
  s.textContent = `
    .toggle-switch { position:relative; display:inline-block; width:44px; height:24px; flex-shrink:0; }
    .toggle-switch input { opacity:0; width:0; height:0; }
    .toggle-slider {
      position:absolute; cursor:pointer; inset:0;
      background:#2a2f45; border-radius:24px;
      transition:background .2s;
    }
    .toggle-slider::before {
      content:''; position:absolute;
      width:18px; height:18px; border-radius:50%;
      background:#fff; left:3px; bottom:3px;
      transition:transform .2s;
    }
    .toggle-switch input:checked + .toggle-slider { background:#4f8ef7; }
    .toggle-switch input:checked + .toggle-slider::before { transform:translateX(20px); }
  `;
  document.head.appendChild(s);
})();

// ── Health Check ──────────────────────────────────────────────────────────────

// Tüm testlerin tanımı (health_check.py ile senkron)
const HEALTH_TESTS = [
  { category:'Core',       emoji:'⚙️',  name:'Settings API'    },
  { category:'Core',       emoji:'🔐',  name:'Auth Durumu'     },
  { category:'Google',     emoji:'🔗',  name:'Google OAuth'    },
  { category:'Google',     emoji:'📧',  name:'Gmail'           },
  { category:'Google',     emoji:'📅',  name:'Calendar'        },
  { category:'Google',     emoji:'💾',  name:'Drive'           },
  { category:'Üretkenlik', emoji:'✅',  name:'Tasks'           },
  { category:'Üretkenlik', emoji:'🧠',  name:'Memory'          },
  { category:'Üretkenlik', emoji:'☀️',  name:'Briefing'        },
  { category:'İletişim',   emoji:'✈️',  name:'Telegram Bot'    },
  { category:'Medya',      emoji:'▶️',  name:'YouTube Kanallar'},
  { category:'Medya',      emoji:'📖',  name:'Kitap Takipçi'   },
  { category:'Akıllı Ev',  emoji:'🏠',  name:'Smart Home'      },
];

async function healthRun() {
  const el = document.getElementById('health-result');
  if (!el) return;

  // 1. Önce tüm testleri "bekliyor" olarak göster
  const cats = {};
  HEALTH_TESTS.forEach(t => { cats[t.category] = cats[t.category] || []; cats[t.category].push(t); });
  let skeleton = `<div style="background:var(--bg3);border-radius:10px;padding:12px">
    <div style="font-size:13px;color:var(--text-3);margin-bottom:10px">⏳ Testler çalışıyor...</div>`;
  for (const [cat, items] of Object.entries(cats)) {
    skeleton += `<div style="font-weight:600;font-size:12px;margin:8px 0 4px">⬜ ${cat}</div>`;
    items.forEach(t => {
      skeleton += `<div style="padding:2px 0 2px 12px;font-size:12px;color:var(--text-3)">
        ⏳ ${t.emoji} ${t.name}</div>`;
    });
  }
  skeleton += '</div>';
  el.innerHTML = skeleton;

  // 2. Sonuçları al
  try {
    const r = await fetch('/api/health');
    const d = await r.json();
    if (!d.ok) { el.innerHTML = `<span style="color:var(--red);font-size:13px">❌ ${d.error}</span>`; return; }

    const pct   = d.score_pct;
    const color = pct === 100 ? 'var(--green)' : pct >= 70 ? '#f59e0b' : 'var(--red)';
    const icon  = pct === 100 ? '✅' : pct >= 70 ? '🟡' : '🔴';

    // Kategorilere göre grupla
    const resCats = {};
    (d.results || []).forEach(r => {
      resCats[r.category] = resCats[r.category] || [];
      resCats[r.category].push(r);
    });

    let rows = '';
    for (const [cat, items] of Object.entries(resCats)) {
      const catPass = items.filter(i => i.passed).length;
      const catIcon = catPass === items.length ? '🟢' : catPass > 0 ? '🟡' : '🔴';
      rows += `<div style="font-weight:600;font-size:12px;margin:8px 0 4px">${catIcon} ${cat}</div>`;
      items.forEach(i => {
        const mark   = i.passed ? '✅' : '❌';
        const ms     = i.passed ? `<span style="color:var(--text-3);font-size:11px"> ${i.ms}ms</span>` : '';
        const detail = !i.passed && i.detail
          ? `<span style="color:var(--red);font-size:11px"> — ${i.detail.substring(0,55)}</span>` : '';
        const req    = i.required && !i.passed
          ? `<span style="background:#ef444420;color:var(--red);font-size:10px;padding:1px 5px;border-radius:4px;margin-left:4px">KRİTİK</span>` : '';
        rows += `<div style="padding:3px 0 3px 12px;font-size:12px">${mark} ${i.emoji} ${i.name}${ms}${req}${detail}</div>`;
      });
    }

    el.innerHTML = `
      <div style="background:var(--bg3);border-radius:10px;padding:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
          <span style="font-size:24px">${icon}</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px;color:${color}">${pct}% Sağlıklı</div>
            <div style="font-size:11px;color:var(--text-3)">${d.passed}/${d.total} test · ${d.duration_ms}ms</div>
          </div>
        </div>
        ${rows}
      </div>`;
  } catch(e) {
    el.innerHTML = `<span style="color:var(--red);font-size:13px">❌ Bağlantı hatası: ${e.message}</span>`;
  }
}

async function healthSend() {
  const r = await fetch('/api/health/send', { method: 'POST' });
  const d = await r.json();
  if (d.ok) {
    toast('Rapor Telegram\'a gönderildi ✅', 'success');
  } else {
    toast(d.error || 'Gönderilemedi', 'error');
  }
}
