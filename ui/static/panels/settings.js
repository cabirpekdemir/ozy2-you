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

      <!-- Google OAuth Status -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <div class="card-header" style="margin-bottom:12px;font-size:15px;font-weight:600">Google OAuth</div>
        <div id="google-status" style="font-size:13px;color:var(--text-3)">Checking...</div>
      </div>

      <!-- Save -->
      <button class="btn btn-primary" style="width:100%;padding:13px"
        onclick="saveSettings()">Save Settings</button>

    </div>
  `;

  loadCurrentSettings();
  checkGoogleStatus();
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
      const github = document.getElementById('s-github');
      if (github) github.value = s.github_token || '';
      const githubUser = document.getElementById('s-github-user');
      if (githubUser) githubUser.value = s.github_username || '';
      const name = document.getElementById('s-name');
      if (name) name.value = s.user_name || '';
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
    github_token:    document.getElementById('s-github')?.value,
    github_username: document.getElementById('s-github-user')?.value,
    user_name:       document.getElementById('s-name')?.value,
    theme:           document.body.classList.contains('theme-light') ? 'light' : 'dark',
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
  const el = document.getElementById('google-status');
  if (!el) return;
  try {
    const r = await fetch('/api/calendar/today');
    const d = await r.json();
    if (d.ok) {
      el.innerHTML = `<span style="color:#10b981">✓ Connected</span> — Gmail, Calendar, Drive`;
    } else {
      el.innerHTML = `<span style="color:#ef4444">✗ Not connected</span> — ${d.error || 'Auth required'}`;
    }
  } catch {
    el.innerHTML = `<span style="color:#ef4444">✗ Not connected</span> — Could not reach Google APIs`;
  }
}
