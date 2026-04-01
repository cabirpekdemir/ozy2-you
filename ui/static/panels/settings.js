/* OZY2 — Settings Panel */

function init_settings(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:700px;margin:0 auto">

      <h2 style="font-size:20px;font-weight:700;margin:0 0 20px">Settings</h2>

      <!-- Active Plan Banner -->
      <div id="plan-banner" style="margin-bottom:16px"></div>

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
            — write to <a href="https://t.me/userinfobot" target="_blank" style="color:var(--accent)">@userinfobot</a>, it will send your ID
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
            Paste or upload your <strong>google_credentials.json</strong>, then click Connect.<br>
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank"
               style="color:var(--accent,#4f8ef7);font-size:12px">
              Get credentials from Google Cloud Console →
            </a>
          </div>

          <!-- File upload row -->
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
            <label for="s-google-creds-file" class="btn btn-ghost"
              style="font-size:12px;cursor:pointer;padding:6px 12px;flex-shrink:0">
              📂 Browse file
            </label>
            <span id="s-google-creds-filename" style="font-size:12px;color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              No file chosen
            </span>
            <input type="file" id="s-google-creds-file" accept=".json,application/json"
              style="display:none" onchange="loadCredentialsFile(this)">
          </div>

          <textarea id="s-google-creds" class="input"
            placeholder='{"web": {"client_id": "...", "client_secret": "..."}}'
            style="width:100%;height:80px;font-size:11px;font-family:monospace;margin-bottom:12px;resize:vertical"></textarea>
          <button class="btn btn-primary" style="width:100%" onclick="connectGoogle()">
            🔗 Connect Google Account
          </button>
          <div id="google-auth-progress" style="display:none;margin-top:10px;font-size:13px;color:var(--text-3);text-align:center">
            ⏳ Waiting for Google sign-in in the new tab…
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

      <!-- TTS -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:4px;font-size:15px;font-weight:600">🔊 Voice Response (TTS)</div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:14px">
          Microsoft Edge Neural TTS — free, no API key required. Provides voice responses to incoming Telegram messages.
        </div>

        <!-- Enable toggle -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <span style="font-size:13px">Enable voice response</span>
          <label class="toggle-switch">
            <input type="checkbox" id="tts-enabled" onchange="ttsSaveEnabled(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- Voice selector -->
        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:6px">Voice Selection</label>
          <div style="display:flex;gap:8px">
            <select id="tts-voice" class="input" style="flex:1" onchange="ttsSaveVoice(this.value)">
              <option value="">Loading...</option>
            </select>
            <button class="btn btn-ghost btn-sm" onclick="ttsTest()" title="Test">▶️</button>
          </div>
        </div>

        <!-- Lang filter -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px" id="tts-lang-filter"></div>

        <audio id="tts-preview" style="display:none"></audio>
      </div>

      <!-- Health Check -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:4px;font-size:15px;font-weight:600">🏥 System Health</div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:14px">
          Tests all services. Report is automatically sent to Telegram at 09:00 and 21:00.
        </div>
        <div id="health-result" style="margin-bottom:12px"></div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" style="flex:1" onclick="healthRun()">🔍 Run Test Now</button>
          <button class="btn btn-ghost" style="flex:1" onclick="healthSend()">📩 Send to Telegram</button>
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
  ttsLoad();
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

async function loadPlanBanner() {
  const banner = document.getElementById('plan-banner');
  if (!banner) return;
  try {
    const [settingsRes, meRes] = await Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]);
    const pkg = settingsRes.settings?.package || 'full';
    const role = meRes.role || 'admin';
    const planMeta = {
      you:      { label: 'OZY2 You',      color: '#4f8ef7', icon: '🧑' },
      pro:      { label: 'OZY2 Pro',      color: '#a855f7', icon: '⚡' },
      social:   { label: 'OZY2 Social',   color: '#f43f5e', icon: '🌐' },
      business: { label: 'OZY2 Business', color: '#f59e0b', icon: '🏢' },
      full:     { label: 'OZY2 Full',     color: '#10b981', icon: '✨' },
    };
    const roleMeta = {
      admin:        { label: 'Admin',        icon: '🛡️', color: '#10b981' },
      collaborator: { label: 'Collaborator', icon: '🤝', color: '#3b82f6' },
      observer:     { label: 'Observer',     icon: '👁️', color: '#f59e0b' },
    };
    const plan = planMeta[pkg] || planMeta.full;
    const roleInfo = roleMeta[role] || { label: role, icon: '👤', color: '#6b7280' };
    banner.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;padding:14px 18px;
        background:var(--card-bg);border:1px solid var(--card-border);border-radius:12px;
        border-left:4px solid ${plan.color}">
        <span style="font-size:22px">${plan.icon}</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600">${plan.label}</div>
          <div style="font-size:12px;color:var(--text-3)">Active plan</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:5px 12px;
          background:${roleInfo.color}22;border-radius:20px;border:1px solid ${roleInfo.color}44">
          <span style="font-size:14px">${roleInfo.icon}</span>
          <span style="font-size:12px;font-weight:600;color:${roleInfo.color}">${roleInfo.label}</span>
        </div>
      </div>`;
  } catch(e) { banner.innerHTML = ''; }
}

async function loadCurrentSettings() {
  loadPlanBanner();
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

function loadCredentialsFile(input) {
  const file = input.files[0];
  if (!file) return;
  const label = document.getElementById('s-google-creds-filename');
  if (label) label.textContent = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    const ta = document.getElementById('s-google-creds');
    if (ta) ta.value = e.target.result;
  };
  reader.readAsText(file);
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

  // Open Google sign-in in a new tab (works on headless servers too)
  window.open(d2.auth_url, '_blank', 'width=600,height=700,noopener');
  if (progress) progress.style.display = 'block';
  toast('Sign in with Google in the new tab', 'success');

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

// All test definitions (synced with health_check.py)
const HEALTH_TESTS = [
  { category:'Core',         emoji:'⚙️',  name:'Settings API'    },
  { category:'Core',         emoji:'🔐',  name:'Auth Status'     },
  { category:'Google',       emoji:'🔗',  name:'Google OAuth'    },
  { category:'Google',       emoji:'📧',  name:'Gmail'           },
  { category:'Google',       emoji:'📅',  name:'Calendar'        },
  { category:'Google',       emoji:'💾',  name:'Drive'           },
  { category:'Productivity', emoji:'✅',  name:'Tasks'           },
  { category:'Productivity', emoji:'🧠',  name:'Memory'          },
  { category:'Productivity', emoji:'☀️',  name:'Briefing'        },
  { category:'Communication',emoji:'✈️',  name:'Telegram Bot'    },
  { category:'Media',        emoji:'▶️',  name:'YouTube Channels'},
  { category:'Media',        emoji:'📖',  name:'Book Tracker'    },
  { category:'Smart Home',   emoji:'🏠',  name:'Smart Home'      },
];

async function healthRun() {
  const el = document.getElementById('health-result');
  if (!el) return;

  // 1. Show all tests as "pending" first
  const cats = {};
  HEALTH_TESTS.forEach(t => { cats[t.category] = cats[t.category] || []; cats[t.category].push(t); });
  let skeleton = `<div style="background:var(--bg3);border-radius:10px;padding:12px">
    <div style="font-size:13px;color:var(--text-3);margin-bottom:10px">⏳ Running tests...</div>`;
  for (const [cat, items] of Object.entries(cats)) {
    skeleton += `<div style="font-weight:600;font-size:12px;margin:8px 0 4px">⬜ ${cat}</div>`;
    items.forEach(t => {
      skeleton += `<div style="padding:2px 0 2px 12px;font-size:12px;color:var(--text-3)">
        ⏳ ${t.emoji} ${t.name}</div>`;
    });
  }
  skeleton += '</div>';
  el.innerHTML = skeleton;

  // 2. Fetch results
  try {
    const r = await fetch('/api/health');
    const d = await r.json();
    if (!d.ok) { el.innerHTML = `<span style="color:var(--red);font-size:13px">❌ ${d.error}</span>`; return; }

    const pct   = d.score_pct;
    const color = pct === 100 ? 'var(--green)' : pct >= 70 ? '#f59e0b' : 'var(--red)';
    const icon  = pct === 100 ? '✅' : pct >= 70 ? '🟡' : '🔴';

    // Group by category
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
          ? `<span style="background:#ef444420;color:var(--red);font-size:10px;padding:1px 5px;border-radius:4px;margin-left:4px">CRITICAL</span>` : '';
        rows += `<div style="padding:3px 0 3px 12px;font-size:12px">${mark} ${i.emoji} ${i.name}${ms}${req}${detail}</div>`;
      });
    }

    el.innerHTML = `
      <div style="background:var(--bg3);border-radius:10px;padding:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
          <span style="font-size:24px">${icon}</span>
          <div style="flex:1">
            <div style="font-weight:700;font-size:15px;color:${color}">${pct}% Healthy</div>
            <div style="font-size:11px;color:var(--text-3)">${d.passed}/${d.total} test · ${d.duration_ms}ms</div>
          </div>
        </div>
        ${rows}
      </div>`;
  } catch(e) {
    el.innerHTML = `<span style="color:var(--red);font-size:13px">❌ Connection error: ${e.message}</span>`;
  }
}

async function healthSend() {
  const r = await fetch('/api/health/send', { method: 'POST' });
  const d = await r.json();
  if (d.ok) {
    toast('Report sent to Telegram ✅', 'success');
  } else {
    toast(d.error || 'Could not send', 'error');
  }
}

// ── TTS ───────────────────────────────────────────────────────────────────────

let _ttsAllVoices = [];
let _ttsLang      = 'all';

async function ttsLoad() {
  // Load config
  try {
    const cfg = await fetch('/api/tts/config').then(r => r.json());
    const chk = document.getElementById('tts-enabled');
    if (chk) chk.checked = cfg.enabled;
    _ttsCurrentVoice = cfg.voice;
  } catch {}

  // Load voices
  try {
    const r  = await fetch('/api/tts/voices?featured_only=false');
    const d  = await r.json();
    _ttsAllVoices = d.voices || [];
    ttsRenderLangFilter();
    ttsRenderVoices();
  } catch (e) {
    const sel = document.getElementById('tts-voice');
    if (sel) sel.innerHTML = '<option value="">Failed to load</option>';
  }
}

function ttsRenderLangFilter() {
  const el = document.getElementById('tts-lang-filter');
  if (!el) return;
  const langs = ['all', ...new Set(_ttsAllVoices.map(v => v.lang || v.locale?.split('-')[0]))].slice(0, 12);
  const labels = { all:'All', tr:'🇹🇷 TR', en:'🇬🇧 EN', de:'🇩🇪 DE', fr:'🇫🇷 FR',
                   es:'🇪🇸 ES', ar:'🇸🇦 AR', ja:'🇯🇵 JA', zh:'🇨🇳 ZH', ko:'🇰🇷 KO',
                   it:'🇮🇹 IT', pt:'🇧🇷 PT', ru:'🇷🇺 RU' };
  el.innerHTML = langs.map(l => `
    <button class="btn btn-ghost btn-sm ${l===_ttsLang?'active':''}" style="font-size:11px;padding:3px 8px"
            onclick="ttsSetLang('${l}',this)">${labels[l]||l.toUpperCase()}</button>
  `).join('');
}

function ttsSetLang(lang, btn) {
  _ttsLang = lang;
  document.querySelectorAll('#tts-lang-filter .btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ttsRenderVoices();
}

function ttsRenderVoices() {
  const sel = document.getElementById('tts-voice');
  if (!sel) return;
  const filtered = _ttsLang === 'all'
    ? _ttsAllVoices
    : _ttsAllVoices.filter(v => (v.lang || v.locale?.split('-')[0]) === _ttsLang);

  sel.innerHTML = filtered.map(v => {
    const name      = v.short_name || v.name;
    const gender    = v.gender === 'Female' ? '👩' : '👨';
    const locale    = v.locale || '';
    const display   = name.replace('Neural', '').replace(locale + '-', '').replace(locale + '.', '');
    return `<option value="${name}" ${name === _ttsCurrentVoice ? 'selected' : ''}>
      ${gender} ${display} — ${locale}
    </option>`;
  }).join('');
}

let _ttsCurrentVoice = '';

async function ttsSaveVoice(voice) {
  _ttsCurrentVoice = voice;
  try {
    const cfg = await fetch('/api/settings').then(r => r.json());
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg.settings, tts_voice: voice }),
    });
    toast('Voice saved', 'success');
  } catch {}
}

async function ttsSaveEnabled(enabled) {
  try {
    const cfg = await fetch('/api/settings').then(r => r.json());
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg.settings, tts_enabled: enabled }),
    });
    toast(enabled ? 'TTS enabled 🔊' : 'TTS disabled', 'info');
  } catch {}
}

async function ttsTest() {
  const voice  = document.getElementById('tts-voice')?.value;
  const lang   = voice ? voice.split('-')[0] : 'tr';
  const samples = {
    tr: 'Merhaba! Ben OZY2. Sesimi beğendiniz mi?',
    en: 'Hello! I am OZY2, your personal AI assistant. How does my voice sound?',
    de: 'Hallo! Ich bin OZY2, dein persönlicher KI-Assistent.',
    fr: 'Bonjour! Je suis OZY2, votre assistant IA personnel.',
    es: '¡Hola! Soy OZY2, tu asistente de inteligencia artificial.',
    ar: 'مرحباً! أنا OZY2، مساعدك الذكي الشخصي.',
    ja: 'こんにちは！私はOZY2、あなたのパーソナルAIアシスタントです。',
  };
  const sample = samples[lang] || samples['en'];
  try {
    const r = await fetch('/api/tts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sample, voice }),
    });
    if (!r.ok) { toast('Could not generate audio', 'error'); return; }
    const blob = await r.blob();
    const url  = URL.createObjectURL(blob);
    const audio = document.getElementById('tts-preview');
    if (audio) {
      audio.src = url;
      audio.style.display = 'block';
      audio.play();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } catch (e) {
    toast('TTS error: ' + e.message, 'error');
  }
}
