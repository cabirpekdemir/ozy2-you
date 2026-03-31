/* OZY2 — Skill Marketplace Panel */

let _mkTab        = 'browse';
let _mkSkills     = [];
let _mkInstalled  = [];
let _mkPending    = [];
let _mkDevId      = '';

async function init_marketplace(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:960px;margin:0 auto">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 2px">🛍️ Skill Marketplace</h2>
          <div style="color:var(--text-3);font-size:13px">Discover, install, and publish OZY2 skills · 15% platform commission</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-row" style="margin-bottom:20px">
        <button class="tab-btn active" id="mk-tab-browse"    onclick="mkShowTab('browse')">🔍 Browse</button>
        <button class="tab-btn"        id="mk-tab-installed" onclick="mkShowTab('installed')">✅ Installed</button>
        <button class="tab-btn"        id="mk-tab-publish"   onclick="mkShowTab('publish')">🚀 Publish</button>
        <button class="tab-btn"        id="mk-tab-revenue"   onclick="mkShowTab('revenue')">💰 Revenue</button>
        <button class="tab-btn"        id="mk-tab-admin"     onclick="mkShowTab('admin')">🛠️ Admin</button>
      </div>

      <div id="mk-content"><div class="spinner" style="margin:60px auto"></div></div>

    </div>`;

  mkShowTab('browse');
}

function mkShowTab(tab) {
  _mkTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('mk-tab-' + tab);
  if (btn) btn.classList.add('active');
  if (tab === 'browse')    mkLoadBrowse();
  if (tab === 'installed') mkLoadInstalled();
  if (tab === 'publish')   mkRenderPublish();
  if (tab === 'revenue')   mkLoadRevenue();
  if (tab === 'admin')     mkLoadAdmin();
}

// ── Browse ───────────────────────────────────────────────────────────────────

async function mkLoadBrowse(q = '', category = '') {
  const el = document.getElementById('mk-content');
  el.innerHTML = '<div class="spinner" style="margin:60px auto"></div>';
  try {
    let url = '/api/marketplace/skills';
    const params = [];
    if (q)        params.push('q='        + encodeURIComponent(q));
    if (category) params.push('category=' + encodeURIComponent(category));
    if (params.length) url += '?' + params.join('&');

    const r = await fetch(url);
    const d = await r.json();
    _mkSkills = d.skills || [];

    const categories = [...new Set(_mkSkills.map(s => s.category))].sort();

    el.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <input class="input" id="mk-search" placeholder="Search skills…" value="${q}"
          oninput="mkLoadBrowse(this.value, document.getElementById('mk-cat-filter')?.value||'')"
          style="flex:1;min-width:200px">
        <select class="input" id="mk-cat-filter" style="width:160px"
          onchange="mkLoadBrowse(document.getElementById('mk-search')?.value||'', this.value)">
          <option value="">All categories</option>
          ${categories.map(c => `<option value="${c}" ${c===category?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>

      ${!_mkSkills.length ? `
        <div style="text-align:center;padding:80px 20px;color:var(--text-3)">
          <div style="font-size:52px;margin-bottom:14px">🛍️</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px">No skills yet</div>
          <div style="font-size:13px;margin-bottom:20px">Be the first to publish a skill!</div>
          <button class="btn btn-primary" onclick="mkShowTab('publish')">Publish a Skill →</button>
        </div>` :
        `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
          ${_mkSkills.map(s => mkSkillCard(s)).join('')}
        </div>`}`;
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Failed to load marketplace.</div>';
  }
}

function mkSkillCard(s) {
  const stars = '★'.repeat(Math.round(s.rating || 0)) + '☆'.repeat(5 - Math.round(s.rating || 0));
  return `
    <div class="card" style="padding:18px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="width:44px;height:44px;border-radius:14px;background:var(--card-border);
          font-size:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${s.icon || '⚡'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600">${s.name}</div>
          <div style="font-size:12px;color:var(--text-3)">${s.developer_name} · v${s.version}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:13px;font-weight:600;color:${s.price ? 'var(--accent)' : '#10b981'}">
            ${s.price ? '$' + s.price.toFixed(2) : 'Free'}
          </div>
        </div>
      </div>

      <div style="font-size:13px;color:var(--text-2);line-height:1.5">${s.description}</div>

      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:11px;background:var(--card-border);padding:2px 8px;border-radius:var(--r-full)">${s.category}</span>
        ${s.tags && s.tags.length ? s.tags.slice(0,3).map(t => `<span style="font-size:11px;background:rgba(99,102,241,.1);color:#6366f1;padding:2px 7px;border-radius:var(--r-full)">${t}</span>`).join('') : ''}
        <span style="font-size:11px;color:var(--text-3);margin-left:auto">${stars} (${s.installs})</span>
      </div>

      <button class="btn ${s.installed ? 'btn-ghost' : 'btn-primary'} btn-sm"
        style="width:100%"
        onclick="${s.installed ? `mkUninstall(${s.id},'${s.name.replace(/'/g,'\\\'')}')`
                               : `mkInstall(${s.id},'${s.name.replace(/'/g,'\\\'')}')`}">
        ${s.installed ? '✓ Installed — Uninstall' : (s.price ? `Buy · $${s.price.toFixed(2)}` : 'Install Free')}
      </button>
    </div>`;
}

async function mkInstall(id, name) {
  try {
    const r = await fetch(`/api/marketplace/skills/${id}/install`, { method: 'POST' });
    const d = await r.json();
    if (d.ok) { toast(`'${name}' installed`, 'success'); mkLoadBrowse(); }
    else       toast(d.error, 'error');
  } catch { toast('Install failed', 'error'); }
}

async function mkUninstall(id, name) {
  if (!confirm(`Uninstall '${name}'?`)) return;
  await fetch(`/api/marketplace/skills/${id}/install`, { method: 'DELETE' });
  toast(`'${name}' uninstalled`, 'info');
  mkLoadBrowse();
}

// ── Installed ────────────────────────────────────────────────────────────────

async function mkLoadInstalled() {
  const el = document.getElementById('mk-content');
  el.innerHTML = '<div class="spinner" style="margin:60px auto"></div>';
  try {
    const r = await fetch('/api/marketplace/skills/installed');
    const d = await r.json();
    _mkInstalled = d.skills || [];
    if (!_mkInstalled.length) {
      el.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-3)">
        <div style="font-size:52px;margin-bottom:14px">📦</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">No installed skills</div>
        <button class="btn btn-primary" onclick="mkShowTab('browse')">Browse Marketplace →</button>
      </div>`;
      return;
    }
    el.innerHTML = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--text-3)">${_mkInstalled.length} installed skill${_mkInstalled.length > 1 ? 's' : ''}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${_mkInstalled.map(s => mkSkillCard({...s, installed: true})).join('')}
      </div>`;
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Failed to load installed skills.</div>';
  }
}

// ── Publish ───────────────────────────────────────────────────────────────────

function mkRenderPublish() {
  const el = document.getElementById('mk-content');
  el.innerHTML = `
    <div style="max-width:600px">
      <div class="card" style="padding:24px;margin-bottom:20px">
        <h3 style="margin:0 0 16px;font-size:16px">🚀 Publish a New Skill</h3>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <div style="font-size:12px;font-weight:600;margin-bottom:4px">Skill Name *</div>
            <input id="mk-pub-name" class="input" placeholder="My Awesome Skill">
          </div>
          <div>
            <div style="font-size:12px;font-weight:600;margin-bottom:4px">Version</div>
            <input id="mk-pub-version" class="input" placeholder="1.0.0" value="1.0.0">
          </div>
        </div>

        <div style="margin-bottom:10px">
          <div style="font-size:12px;font-weight:600;margin-bottom:4px">Short Description *</div>
          <input id="mk-pub-desc" class="input" placeholder="What does your skill do?">
        </div>

        <div style="margin-bottom:10px">
          <div style="font-size:12px;font-weight:600;margin-bottom:4px">Long Description</div>
          <textarea id="mk-pub-longdesc" class="input" rows="4"
            placeholder="Detailed description, usage instructions, requirements…"
            style="resize:vertical"></textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
          <div>
            <div style="font-size:12px;font-weight:600;margin-bottom:4px">Category</div>
            <select id="mk-pub-category" class="input">
              <option>Utilities</option>
              <option>Productivity</option>
              <option>Communication</option>
              <option>Creative</option>
              <option>Business</option>
              <option>Lifestyle</option>
              <option>AI & Data</option>
            </select>
          </div>
          <div>
            <div style="font-size:12px;font-weight:600;margin-bottom:4px">Price (USD)</div>
            <input id="mk-pub-price" class="input" type="number" min="0" step="0.99" placeholder="0" value="0">
          </div>
          <div>
            <div style="font-size:12px;font-weight:600;margin-bottom:4px">Icon (emoji)</div>
            <input id="mk-pub-icon" class="input" placeholder="⚡" value="⚡" maxlength="4">
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          <div>
            <div style="font-size:12px;font-weight:600;margin-bottom:4px">Developer ID *</div>
            <input id="mk-pub-devid" class="input" placeholder="your-dev-id">
          </div>
          <div>
            <div style="font-size:12px;font-weight:600;margin-bottom:4px">Developer Name *</div>
            <input id="mk-pub-devname" class="input" placeholder="Your Name">
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:600;margin-bottom:4px">Tags (comma-separated)</div>
          <input id="mk-pub-tags" class="input" placeholder="automation, api, productivity">
        </div>

        <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);
          border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--text-2)">
          💰 Platform commission: <strong>15%</strong> per paid install.
          You receive <strong>85%</strong> of each sale.
          Free skills are always free.
        </div>

        <button class="btn btn-primary" style="width:100%" onclick="mkSubmitSkill()">
          Submit for Review →
        </button>
      </div>

      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 12px;font-size:14px">📋 Skill Manifest Format</h3>
        <pre style="font-size:11px;color:var(--text-3);overflow:auto;line-height:1.6;margin:0">{
  "name": "My Skill",
  "entry": "skills/my_skill.py",
  "tools": [
    {
      "name": "my_tool",
      "description": "What this tool does",
      "params": {
        "query": {"type": "string", "description": "Search query"}
      }
    }
  ],
  "env_vars": ["MY_API_KEY"],
  "min_ozy2_version": "2.0.0"
}</pre>
      </div>
    </div>`;
}

async function mkSubmitSkill() {
  const name       = document.getElementById('mk-pub-name')?.value.trim();
  const desc       = document.getElementById('mk-pub-desc')?.value.trim();
  const longdesc   = document.getElementById('mk-pub-longdesc')?.value.trim();
  const category   = document.getElementById('mk-pub-category')?.value;
  const price      = parseFloat(document.getElementById('mk-pub-price')?.value || '0');
  const icon       = document.getElementById('mk-pub-icon')?.value.trim() || '⚡';
  const version    = document.getElementById('mk-pub-version')?.value.trim() || '1.0.0';
  const devId      = document.getElementById('mk-pub-devid')?.value.trim();
  const devName    = document.getElementById('mk-pub-devname')?.value.trim();
  const tagsRaw    = document.getElementById('mk-pub-tags')?.value.trim();
  const tags       = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!name || !desc || !devId || !devName) {
    toast('Name, description, and developer info are required', 'error');
    return;
  }

  try {
    const r = await fetch('/api/marketplace/skills', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, long_description: longdesc,
        developer_id: devId, developer_name: devName, category, price, icon, tags, version }),
    });
    const d = await r.json();
    if (d.ok) {
      toast(`'${name}' submitted for review! ID: ${d.id}`, 'success');
      mkRenderPublish(); // reset form
    } else {
      toast(d.error, 'error');
    }
  } catch {
    toast('Submission failed', 'error');
  }
}

// ── Revenue ───────────────────────────────────────────────────────────────────

async function mkLoadRevenue() {
  const el = document.getElementById('mk-content');
  el.innerHTML = '<div class="spinner" style="margin:60px auto"></div>';
  try {
    const [revR, tierR] = await Promise.all([
      fetch('/api/marketplace/revenue').then(r => r.json()),
      fetch('/api/packages/current').then(r => r.json()),
    ]);
    const s = revR.summary || {};
    const tier = tierR.tier || {};

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px">
        ${[
          ['💰', 'Total Revenue',    '$' + (s.total_revenue    || 0).toFixed(2)],
          ['🏦', 'Platform Earned',  '$' + (s.total_commission || 0).toFixed(2)],
          ['👨‍💻', 'Dev Payouts',       '$' + (s.total_payouts   || 0).toFixed(2)],
          ['🧾', 'Transactions',     s.total_transactions || 0],
        ].map(([icon, label, val]) => `
          <div class="card" style="padding:20px;text-align:center">
            <div style="font-size:28px;margin-bottom:6px">${icon}</div>
            <div style="font-size:22px;font-weight:700">${val}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:4px">${label}</div>
          </div>`).join('')}
      </div>

      <div class="card" style="padding:20px;max-width:480px">
        <div style="font-size:14px;font-weight:600;margin-bottom:14px">📦 Current Package</div>
        <div style="display:flex;align-items:center;gap:14px">
          <div style="font-size:36px">${tier.icon || '⚡'}</div>
          <div>
            <div style="font-size:16px;font-weight:700" style="color:${tier.color}">${tier.name || 'Full'}</div>
            <div style="font-size:13px;color:var(--text-3)">${tier.description || ''}</div>
          </div>
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-ghost btn-sm" onclick="mkShowPackages()">Manage Packages →</button>
        </div>
      </div>

      <!-- Developer revenue lookup -->
      <div class="card" style="padding:20px;max-width:480px;margin-top:14px">
        <div style="font-size:14px;font-weight:600;margin-bottom:12px">👨‍💻 Developer Revenue Lookup</div>
        <div style="display:flex;gap:8px">
          <input id="mk-dev-lookup" class="input" style="flex:1" placeholder="developer-id">
          <button class="btn btn-primary btn-sm" onclick="mkLookupDevRevenue()">Look up</button>
        </div>
        <div id="mk-dev-revenue-result" style="margin-top:12px;font-size:13px"></div>
      </div>`;
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Failed to load revenue data.</div>';
  }
}

async function mkLookupDevRevenue() {
  const devId = document.getElementById('mk-dev-lookup')?.value.trim();
  const resEl = document.getElementById('mk-dev-revenue-result');
  if (!devId || !resEl) return;
  resEl.innerHTML = '<div class="spinner" style="margin:10px auto;width:20px;height:20px"></div>';
  try {
    const r = await fetch(`/api/marketplace/developers/${encodeURIComponent(devId)}/revenue`);
    const d = await r.json();
    const s = d.summary || {};
    resEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="card" style="padding:12px;text-align:center">
          <div style="font-weight:600">${s.total_sales || 0}</div>
          <div style="font-size:11px;color:var(--text-3)">Sales</div>
        </div>
        <div class="card" style="padding:12px;text-align:center">
          <div style="font-weight:600">$${(s.gross_revenue || 0).toFixed(2)}</div>
          <div style="font-size:11px;color:var(--text-3)">Gross</div>
        </div>
        <div class="card" style="padding:12px;text-align:center">
          <div style="font-weight:600;color:#10b981">$${(s.net_payout || 0).toFixed(2)}</div>
          <div style="font-size:11px;color:var(--text-3)">Net (85%)</div>
        </div>
      </div>`;
  } catch {
    resEl.innerHTML = '<div style="color:var(--text-3)">Lookup failed.</div>';
  }
}

function mkShowPackages() {
  const el = document.getElementById('mk-content');
  el.innerHTML = '<div class="spinner" style="margin:60px auto"></div>';
  fetch('/api/packages').then(r => r.json()).then(d => {
    const tiers   = d.tiers || {};
    const current = d.current || 'full';
    el.innerHTML = `
      <div style="margin-bottom:16px;font-size:14px;font-weight:600">Select Your Package</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${Object.entries(tiers).map(([key, t]) => `
          <div class="card" style="padding:20px;border:2px solid ${key===current ? t.color : 'transparent'}">
            <div style="font-size:32px;margin-bottom:8px">${t.icon}</div>
            <div style="font-size:15px;font-weight:700;margin-bottom:4px">${t.name}</div>
            <div style="font-size:13px;color:var(--text-3);margin-bottom:12px">${t.description}</div>
            <div style="font-size:16px;font-weight:600;margin-bottom:12px;color:${t.color}">
              ${t.price_usd === 0 ? 'Free' : '$' + t.price_usd + '/mo'}
            </div>
            <button class="btn ${key===current ? 'btn-ghost' : 'btn-primary'} btn-sm" style="width:100%"
              onclick="mkSetPackage('${key}')" ${key===current ? 'disabled' : ''}>
              ${key===current ? '✓ Current' : 'Switch'}
            </button>
          </div>`).join('')}
      </div>`;
  });
}

async function mkSetPackage(pkg) {
  const r = await fetch('/api/packages/set', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: pkg }),
  });
  const d = await r.json();
  if (d.ok) { toast(`Switched to ${d.tier.name}`, 'success'); mkLoadRevenue(); }
  else       toast(d.error, 'error');
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function mkLoadAdmin() {
  const el = document.getElementById('mk-content');
  el.innerHTML = '<div class="spinner" style="margin:60px auto"></div>';
  try {
    const r = await fetch('/api/marketplace/pending');
    const d = await r.json();
    _mkPending = d.skills || [];
    if (!_mkPending.length) {
      el.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-3)">
        <div style="font-size:52px">✅</div>
        <div style="margin-top:12px;font-size:15px;font-weight:600">Review queue is empty</div>
      </div>`;
      return;
    }
    el.innerHTML = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--text-3)">
        ${_mkPending.length} skill${_mkPending.length > 1 ? 's' : ''} pending review
      </div>
      ${_mkPending.map(s => `
        <div class="card" style="padding:18px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;gap:12px">
            <div style="font-size:28px">${s.icon || '⚡'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600">${s.name} <span style="font-size:11px;color:var(--text-3)">v${s.version}</span></div>
              <div style="font-size:12px;color:var(--text-3);margin-bottom:4px">${s.developer_name} (${s.developer_id})</div>
              <div style="font-size:13px;color:var(--text-2)">${s.description}</div>
            </div>
            <div style="flex-shrink:0;text-align:right">
              <div style="font-size:13px;font-weight:600;margin-bottom:6px">${s.price > 0 ? '$' + s.price.toFixed(2) : 'Free'}</div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-primary btn-sm" onclick="mkApprove(${s.id},'${s.name.replace(/'/g,'\\\'')}')">✓ Approve</button>
                <button class="btn btn-ghost btn-sm" style="color:#ef4444" onclick="mkReject(${s.id},'${s.name.replace(/'/g,'\\\'')}')">✗ Reject</button>
              </div>
            </div>
          </div>
        </div>`).join('')}`;
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Failed to load review queue.</div>';
  }
}

async function mkApprove(id, name) {
  await fetch(`/api/marketplace/skills/${id}/approve`, { method: 'POST' });
  toast(`'${name}' approved and published!`, 'success');
  mkLoadAdmin();
}

async function mkReject(id, name) {
  if (!confirm(`Reject '${name}'?`)) return;
  await fetch(`/api/marketplace/skills/${id}/reject`, { method: 'POST' });
  toast(`'${name}' rejected`, 'info');
  mkLoadAdmin();
}
