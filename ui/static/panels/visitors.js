/* OZY2 — Demo Visitors (admin only) */

async function init_visitors(el) {
  el.innerHTML = `
    <div style="max-width:860px;margin:0 auto;padding:20px 16px">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:20px;font-weight:700">👥 Demo Visitors</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px">
            Encrypted · Visible to admin only
          </div>
        </div>
        <button onclick="visitorsRefresh()"
          style="background:var(--card-bg);border:1px solid var(--card-border);
                 border-radius:10px;padding:8px 16px;font-size:13px;
                 color:var(--text-2);cursor:pointer">↻ Refresh</button>
      </div>

      <!-- Stats bar -->
      <div id="vis-stats"
        style="background:var(--card-bg);border:1px solid var(--card-border);
               border-radius:var(--r-lg);padding:16px 20px;margin-bottom:16px;
               display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-3)">
        <span class="spinner" style="width:14px;height:14px;border-width:2px"></span>
        Loading…
      </div>

      <!-- Search -->
      <div style="position:relative;margin-bottom:12px">
        <input id="vis-search" type="text" placeholder="🔍  Search name or email…"
          oninput="visitorsFilter()"
          style="width:100%;box-sizing:border-box;background:var(--card-bg);
                 border:1px solid var(--card-border);border-radius:10px;
                 padding:10px 14px;color:var(--text-1);font-size:13px;outline:none">
      </div>

      <!-- Table -->
      <div style="background:var(--card-bg);border:1px solid var(--card-border);
                  border-radius:var(--r-lg);overflow:hidden">
        <div id="vis-table">
          <div style="padding:48px;text-align:center;color:var(--text-3)">
            <span class="spinner"></span>
          </div>
        </div>
      </div>

    </div>`;

  visitorsLoad();
}

let _visLeads = [];

async function visitorsLoad() {
  try {
    const d = await fetch('/api/auth/leads').then(r => r.json());
    if (!d.ok) {
      visShowError(d.error || 'Could not load visitors.');
      return;
    }
    _visLeads = d.leads || [];
    visUpdateStats(d.count || 0);
    visitorsFilter();
  } catch (e) {
    visShowError('Network error.');
  }
}

function visitorsRefresh() {
  document.getElementById('vis-stats').innerHTML =
    `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Loading…`;
  document.getElementById('vis-table').innerHTML =
    `<div style="padding:48px;text-align:center;color:var(--text-3)"><span class="spinner"></span></div>`;
  visitorsLoad();
}

function visUpdateStats(count) {
  const el = document.getElementById('vis-stats');
  if (!el) return;
  el.innerHTML = count
    ? `<span style="font-size:22px;font-weight:700;color:var(--accent)">${count}</span>
       <span style="color:var(--text-3)">demo sign-up${count !== 1 ? 's' : ''} total</span>
       <span style="margin-left:auto;font-size:11px;background:rgba(16,185,129,.1);
                    color:#10b981;border:1px solid rgba(16,185,129,.25);
                    border-radius:999px;padding:2px 10px">🔒 Encrypted at rest</span>`
    : `<span style="color:var(--text-3)">No visitors yet — share the demo link to get started!</span>`;
}

function visitorsFilter() {
  const q = (document.getElementById('vis-search')?.value || '').toLowerCase();
  const filtered = q
    ? _visLeads.filter(l =>
        (l.first_name + ' ' + l.last_name + ' ' + l.email).toLowerCase().includes(q))
    : _visLeads;
  visRender(filtered);
}

function visRender(leads) {
  const el = document.getElementById('vis-table');
  if (!el) return;

  if (!leads.length) {
    el.innerHTML = `
      <div style="padding:56px 24px;text-align:center">
        <div style="font-size:44px;margin-bottom:12px">🕵️</div>
        <div style="font-size:15px;font-weight:600;color:var(--text-2);margin-bottom:6px">
          ${_visLeads.length ? 'No results match your search' : 'No visitors yet'}
        </div>
        <div style="font-size:13px;color:var(--text-3)">
          ${_visLeads.length
            ? 'Try a different name or email'
            : 'When someone signs up for the demo, they\'ll appear here'}
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <!-- Table header -->
    <div style="display:grid;grid-template-columns:1fr 1fr 2fr 1fr auto;
                gap:0;border-bottom:1px solid var(--card-border);
                padding:10px 16px;font-size:11px;font-weight:600;
                color:var(--text-3);text-transform:uppercase;letter-spacing:.6px">
      <div>First</div>
      <div>Last</div>
      <div>Email</div>
      <div>Signed up</div>
      <div></div>
    </div>
    ${leads.map((l, i) => {
      const ts  = l.ts ? new Date(l.ts + (l.ts.endsWith('Z') ? '' : 'Z')) : null;
      const day = ts  ? ts.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'}) : '—';
      const time = ts ? ts.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : '';
      const bg  = i % 2 === 0 ? '' : 'background:rgba(255,255,255,.02)';
      return `
        <div style="display:grid;grid-template-columns:1fr 1fr 2fr 1fr auto;
                    gap:0;padding:12px 16px;border-bottom:1px solid var(--card-border);
                    ${bg};align-items:center;font-size:13px" id="vis-row-${i}">
          <div style="font-weight:500">${esc(l.first_name)}</div>
          <div style="color:var(--text-2)">${esc(l.last_name || '—')}</div>
          <div>
            <a href="mailto:${esc(l.email)}"
              style="color:var(--accent);text-decoration:none"
              title="Send email">${esc(l.email)}</a>
          </div>
          <div style="color:var(--text-3);font-size:12px">
            <div>${day}</div>
            <div style="color:var(--text-3);font-size:11px">${time}</div>
          </div>
          <div>
            <button onclick="visCopyEmail('${esc(l.email)}',${i})"
              title="Copy email"
              style="background:none;border:none;cursor:pointer;
                     color:var(--text-3);font-size:14px;padding:4px 8px">📋</button>
          </div>
        </div>`;
    }).join('')}`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function visCopyEmail(email, rowIdx) {
  navigator.clipboard.writeText(email).then(() => {
    const btn = document.querySelector(`#vis-row-${rowIdx} button`);
    if (btn) { btn.textContent = '✅'; setTimeout(() => btn.textContent = '📋', 1500); }
  }).catch(() => {});
}

function visShowError(msg) {
  const el = document.getElementById('vis-table');
  if (el) el.innerHTML = `<div style="padding:32px;text-align:center;color:#f43f5e;font-size:14px">⚠️ ${msg}</div>`;
  const st = document.getElementById('vis-stats');
  if (st) st.innerHTML = `<span style="color:#f43f5e">Error loading data</span>`;
}
