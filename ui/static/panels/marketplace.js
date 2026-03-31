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
        <button class="tab-btn"        id="mk-tab-docs"      onclick="mkShowTab('docs')">📖 Docs</button>
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
  if (tab === 'docs')      mkRenderDocs();
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

// ── Developer Docs ────────────────────────────────────────────────────────────

function mkRenderDocs() {
  const el = document.getElementById('mk-content');
  el.innerHTML = `
    <div style="max-width:720px;line-height:1.75;font-size:14px">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;padding:28px 32px;margin-bottom:28px;color:#fff">
        <div style="font-size:26px;font-weight:700;margin-bottom:6px">OZY2 Skill Developer Guide</div>
        <div style="opacity:.85;font-size:14px">Build and publish AI-powered skills for the OZY2 ecosystem.<br>
          Earn 85% of every sale — 15% platform commission.</div>
      </div>

      <!-- TOC -->
      <div class="card" style="padding:18px 24px;margin-bottom:24px">
        <div style="font-weight:600;margin-bottom:10px;font-size:13px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">Contents</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:13px">
          ${[
            ['#what','What is a Skill?'],['#quickstart','Quick Start'],
            ['#register','@register Decorator'],['#params','Parameter Types'],
            ['#tiers','Package Tiers'],['#permissions','Permissions'],
            ['#manifest','Skill Manifest'],['#test','Testing Locally'],
            ['#publish','Publishing'],['#revenue','Revenue & Payouts'],
            ['#categories','Categories'],['#best','Best Practices'],
          ].map(([h,t]) => `<a href="${h}" style="color:var(--accent);text-decoration:none">→ ${t}</a>`).join('')}
        </div>
      </div>

      ${mkDoc('what','🤔 What is a Skill?',`
        <p>A <strong>Skill</strong> is an async Python function registered with the OZY2 tool registry.
        When a user asks the AI assistant something, OZY2 automatically calls the right skill and
        returns a structured result.</p>
        <p>Skills can do anything: call external APIs, read files, query databases, send messages,
        run calculations — the AI handles when and how to use them.</p>
      `)}

      ${mkDoc('quickstart','⚡ Quick Start',`
        <p>Minimum viable skill — one file, one function:</p>
        <pre style="${mkPre()}"><code><span style="color:#94a3b8"># my_skill.py</span>
<span style="color:#7dd3fc">from</span> core.tools <span style="color:#7dd3fc">import</span> register

<span style="color:#7dd3fc">def</span> <span style="color:#fde68a">register_all</span>():

    <span style="color:#a5b4fc">@register</span>(
        name=<span style="color:#86efac">"hello_world"</span>,
        description=<span style="color:#86efac">"Greet a person by name."</span>,
        params={
            <span style="color:#86efac">"name"</span>: {<span style="color:#86efac">"type"</span>: <span style="color:#86efac">"string"</span>, <span style="color:#86efac">"description"</span>: <span style="color:#86efac">"Person's name"</span>, <span style="color:#86efac">"required"</span>: <span style="color:#fca5a5">True</span>},
        },
        package=<span style="color:#86efac">"you"</span>,
    )
    <span style="color:#7dd3fc">async def</span> <span style="color:#fde68a">_hello</span>(name: str):
        <span style="color:#7dd3fc">return</span> {<span style="color:#86efac">"message"</span>: <span style="color:#86efac">f"Hello, {name}! 👋"</span>}</code></pre>
        <p>That's it. OZY2's AI will automatically call this when someone says <em>"greet John"</em>.</p>
      `)}

      ${mkDoc('register','🎯 @register Decorator',`
        <p>Every skill uses the <code style="${mkCode()}">@register</code> decorator from <code style="${mkCode()}">core.tools</code>:</p>
        <pre style="${mkPre()}"><code><span style="color:#a5b4fc">@register</span>(
    name=<span style="color:#86efac">"tool_name"</span>,          <span style="color:#94a3b8"># unique snake_case identifier</span>
    description=<span style="color:#86efac">"..."</span>,       <span style="color:#94a3b8"># shown to AI — be specific</span>
    params={...},             <span style="color:#94a3b8"># input parameters (see below)</span>
    package=<span style="color:#86efac">"you"</span>,           <span style="color:#94a3b8"># tier: you | pro | social | business</span>
    permission=<span style="color:#86efac">"scope.read"</span>,  <span style="color:#94a3b8"># optional permission scope</span>
)</code></pre>
        <div style="background:var(--bg2);border-radius:8px;padding:12px 16px;margin-top:12px;font-size:13px">
          <strong>💡 Description tip:</strong> Write it from the AI's perspective. Include trigger phrases:
          <em>"Use for: 'weather', 'is it raining', 'forecast'"</em>. The better the description,
          the more accurately the AI calls your skill.
        </div>
      `)}

      ${mkDoc('params','📝 Parameter Types',`
        <p>Parameters are defined as a dict. Each key is a parameter name:</p>
        <pre style="${mkPre()}"><code>params={
    <span style="color:#86efac">"city"</span>:    {<span style="color:#86efac">"type"</span>: <span style="color:#86efac">"string"</span>,  <span style="color:#86efac">"description"</span>: <span style="color:#86efac">"City name"</span>},
    <span style="color:#86efac">"forecast"</span>: {<span style="color:#86efac">"type"</span>: <span style="color:#86efac">"boolean"</span>, <span style="color:#86efac">"description"</span>: <span style="color:#86efac">"True for multi-day"</span>},
    <span style="color:#86efac">"days"</span>:     {<span style="color:#86efac">"type"</span>: <span style="color:#86efac">"integer"</span>, <span style="color:#86efac">"description"</span>: <span style="color:#86efac">"Days 1–7"</span>},
    <span style="color:#86efac">"query"</span>:    {<span style="color:#86efac">"type"</span>: <span style="color:#86efac">"string"</span>,  <span style="color:#86efac">"description"</span>: <span style="color:#86efac">"Search query"</span>, <span style="color:#86efac">"required"</span>: <span style="color:#fca5a5">True</span>},
}</code></pre>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
          <thead><tr style="border-bottom:1px solid var(--card-border)">
            <th style="text-align:left;padding:6px 8px;color:var(--text-3)">Type</th>
            <th style="text-align:left;padding:6px 8px;color:var(--text-3)">Python</th>
            <th style="text-align:left;padding:6px 8px;color:var(--text-3)">Example</th>
          </tr></thead>
          <tbody>
            ${[
              ['string','str','"Istanbul"'],
              ['integer','int','7'],
              ['boolean','bool','True / False'],
              ['number','float','3.14'],
              ['array','list','["a","b","c"]'],
              ['object','dict','{"key":"val"}'],
            ].map(([t,p,e]) => `<tr style="border-bottom:1px solid var(--card-border)">
              <td style="padding:6px 8px"><code style="${mkCode()}">${t}</code></td>
              <td style="padding:6px 8px"><code style="${mkCode()}">${p}</code></td>
              <td style="padding:6px 8px;color:var(--text-3)">${e}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `)}

      ${mkDoc('tiers','📦 Package Tiers',`
        <p>Every skill belongs to a tier. Users can only call skills in their tier or below:</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:1px solid var(--card-border)">
            <th style="text-align:left;padding:8px;color:var(--text-3)">Tier</th>
            <th style="text-align:left;padding:8px;color:var(--text-3)">package=</th>
            <th style="text-align:left;padding:8px;color:var(--text-3)">Typical use</th>
          </tr></thead>
          <tbody>
            ${[
              ['⚡ YOU',    'you',      'Weather, web search, notes, reminders, tasks'],
              ['💼 PRO',    'pro',      'Email, calendar, drive, documents, TTS'],
              ['🌐 SOCIAL', 'social',   'YouTube, content creation, debate, Instagram'],
              ['🏢 BUSINESS','business','Slack, Jira, Linear, HubSpot, GA4, invoices'],
              ['✨ FULL',   'core',     'Available in all tiers'],
            ].map(([n,p,d]) => `<tr style="border-bottom:1px solid var(--card-border)">
              <td style="padding:8px;font-weight:600">${n}</td>
              <td style="padding:8px"><code style="${mkCode()}">${p}</code></td>
              <td style="padding:8px;color:var(--text-3)">${d}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `)}

      ${mkDoc('permissions','🔐 Permissions',`
        <p>Permissions let admins grant specific capabilities to collaborator roles.
        Use <code style="${mkCode()}">permission="scope.action"</code> on skills that touch
        sensitive data:</p>
        <pre style="${mkPre()}"><code><span style="color:#a5b4fc">@register</span>(
    name=<span style="color:#86efac">"send_slack_message"</span>,
    description=<span style="color:#86efac">"Send a Slack message."</span>,
    package=<span style="color:#86efac">"business"</span>,
    permission=<span style="color:#86efac">"slack.write"</span>,  <span style="color:#94a3b8"># role must have this permission</span>
)</code></pre>
        <p>Use <code style="${mkCode()}">permission="*"</code> (default) for unrestricted skills.
        Built-in scopes: <code style="${mkCode()}">email.read</code>, <code style="${mkCode()}">calendar.write</code>,
        <code style="${mkCode()}">task.read</code>, <code style="${mkCode()}">slack.write</code>, etc.</p>
      `)}

      ${mkDoc('manifest','📋 Skill Manifest',`
        <p>When submitting to the marketplace, include a <code style="${mkCode()}">manifest</code>
        object describing your skill's requirements:</p>
        <pre style="${mkPre()}"><code>{
  <span style="color:#86efac">"tools"</span>: [<span style="color:#86efac">"my_tool_name"</span>],       <span style="color:#94a3b8"># registered tool names</span>
  <span style="color:#86efac">"settings_keys"</span>: [              <span style="color:#94a3b8"># keys needed in settings.json</span>
    <span style="color:#86efac">"openweather_api_key"</span>
  ],
  <span style="color:#86efac">"external_apis"</span>: [            <span style="color:#94a3b8"># third-party services used</span>
    <span style="color:#86efac">"api.openweathermap.org"</span>
  ],
  <span style="color:#86efac">"min_ozy2_version"</span>: <span style="color:#86efac">"2.0.0"</span>    <span style="color:#94a3b8"># minimum compatible version</span>
}</code></pre>
      `)}

      ${mkDoc('test','🧪 Testing Locally',`
        <p>1. Place your skill file in <code style="${mkCode()}">skills/</code></p>
        <p>2. Import and call <code style="${mkCode()}">register_all()</code> in
           <code style="${mkCode()}">skills/tools_register.py</code>:</p>
        <pre style="${mkPre()}"><code><span style="color:#7dd3fc">from</span> skills.my_skill <span style="color:#7dd3fc">import</span> register_all <span style="color:#7dd3fc">as</span> reg_mine
reg_mine()</code></pre>
        <p>3. Start OZY2 and chat: <em>"Test my skill with X"</em></p>
        <p>4. Check the agent logs for tool calls and responses.</p>
        <div style="background:var(--bg2);border-radius:8px;padding:12px 16px;margin-top:12px;font-size:13px">
          <strong>🐛 Debug tip:</strong> All tool calls are logged.
          Watch the terminal — you'll see <code style="${mkCode()}">[Tools] Registered: my_tool</code>
          on startup and <code style="${mkCode()}">[Agent] tool_call: my_tool {...}</code> on execution.
        </div>
      `)}

      ${mkDoc('publish','🚀 Publishing to Marketplace',`
        <p>Submit via the <strong>Publish</strong> tab above, or directly via API:</p>
        <pre style="${mkPre()}"><code>POST /api/marketplace/skills

{
  <span style="color:#86efac">"name"</span>:             <span style="color:#86efac">"My Awesome Skill"</span>,
  <span style="color:#86efac">"description"</span>:      <span style="color:#86efac">"One-line summary for the marketplace card"</span>,
  <span style="color:#86efac">"long_description"</span>: <span style="color:#86efac">"Full details shown on the skill page"</span>,
  <span style="color:#86efac">"developer_id"</span>:     <span style="color:#86efac">"your-github-username"</span>,
  <span style="color:#86efac">"developer_name"</span>:   <span style="color:#86efac">"Your Name"</span>,
  <span style="color:#86efac">"category"</span>:         <span style="color:#86efac">"Productivity"</span>,
  <span style="color:#86efac">"price"</span>:            <span style="color:#fca5a5">4.99</span>,
  <span style="color:#86efac">"icon"</span>:             <span style="color:#86efac">"⚡"</span>,
  <span style="color:#86efac">"tags"</span>:             [<span style="color:#86efac">"automation"</span>, <span style="color:#86efac">"api"</span>],
  <span style="color:#86efac">"version"</span>:          <span style="color:#86efac">"1.0.0"</span>,
  <span style="color:#86efac">"manifest"</span>:         { <span style="color:#86efac">"tools"</span>: [<span style="color:#86efac">"my_tool"</span>] }
}</code></pre>
        <p>Status flow: <strong>pending</strong> → admin review → <strong>published</strong> or <strong>rejected</strong></p>
        <p>Rejected skills get feedback — fix and resubmit anytime.</p>
      `)}

      ${mkDoc('revenue','💰 Revenue & Payouts',`
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
          <tr style="background:var(--bg2);border-radius:8px">
            <td style="padding:16px;text-align:center;border-radius:8px 0 0 8px">
              <div style="font-size:28px;font-weight:700;color:#10b981">85%</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px">Developer payout</div>
            </td>
            <td style="padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:var(--accent)">15%</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px">Platform commission</div>
            </td>
            <td style="padding:16px;text-align:center;border-radius:0 8px 8px 0">
              <div style="font-size:28px;font-weight:700">$0</div>
              <div style="font-size:12px;color:var(--text-3);margin-top:2px">Free skills allowed</div>
            </td>
          </tr>
        </table>
        <p>Track your earnings in <strong>Revenue → Developer Revenue Lookup</strong> with your developer ID.
        Payouts are recorded per transaction in the platform database.</p>
        <p>Price range: <strong>$0 (free)</strong> to any amount. Recommended: $0.99 – $9.99 for single skills,
        $4.99 – $19.99 for skill bundles.</p>
      `)}

      ${mkDoc('categories','🗂️ Categories',`
        <p>Choose the most specific category for discoverability:</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
          ${['Productivity','Communication','Finance','Analytics','Developer Tools',
             'AI & ML','Smart Home','Social Media','Education','Utilities',
             'Health','Entertainment','E-commerce','Marketing'].map(c =>
            `<span style="background:var(--bg2);border:1px solid var(--card-border);
              border-radius:20px;padding:4px 12px;font-size:12px">${c}</span>`
          ).join('')}
        </div>
      `)}

      ${mkDoc('best','✅ Best Practices',`
        <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px">
          <li><strong>Always return a dict.</strong> Include <code style="${mkCode()}">"ok": True</code>
              on success, <code style="${mkCode()}">"error": "message"</code> on failure.</li>
          <li><strong>Use stdlib only</strong> for network calls (<code style="${mkCode()}">urllib.request</code>).
              Don't add pip dependencies unless absolutely necessary.</li>
          <li><strong>Read config from settings.json</strong> — never hardcode API keys.
              Use <code style="${mkCode()}">cfg.get("my_api_key")</code> and return a helpful error if missing.</li>
          <li><strong>Set a timeout</strong> on all HTTP calls:
              <code style="${mkCode()}">urlopen(req, timeout=10)</code></li>
          <li><strong>Be async.</strong> Always use <code style="${mkCode()}">async def</code> — OZY2's
              agent engine is fully async.</li>
          <li><strong>Write a clear description.</strong> The AI uses it to decide when to call your skill.
              Include example trigger phrases.</li>
          <li><strong>One skill = one responsibility.</strong> Prefer two focused skills over one
              that does too much.</li>
        </ul>
      `)}

      <!-- Footer -->
      <div style="text-align:center;padding:32px 0 16px;color:var(--text-3);font-size:13px">
        OZY2 Skill Marketplace · <a href="https://github.com/cabirpekdemir/ozy2"
          target="_blank" style="color:var(--accent);text-decoration:none">GitHub</a>
        · Built with ❤️ by Cabir Pekdemir
      </div>

    </div>`;
}

function mkDoc(id, title, body) {
  return `
    <div id="${id}" style="margin-bottom:28px">
      <div style="font-size:16px;font-weight:700;margin-bottom:12px;padding-bottom:8px;
        border-bottom:1px solid var(--card-border)">${title}</div>
      <div>${body}</div>
    </div>`;
}

function mkPre() {
  return 'background:#0f172a;color:#e2e8f0;border-radius:10px;padding:16px 18px;font-size:12.5px;overflow-x:auto;font-family:monospace;line-height:1.6;margin:10px 0';
}

function mkCode() {
  return 'background:var(--bg2);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:12px';
}
