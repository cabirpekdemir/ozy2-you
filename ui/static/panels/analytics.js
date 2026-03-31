/* OZY2 — Analytics Panel */

let _analyticsDays = 7;

async function init_analytics(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>📊 Analytics</h2>
      </div>
      <div id="analytics-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const hasProp = d.ok && d.settings?.ga4_property_id;
    const hasSecret = d.ok && d.settings?.ga4_api_secret;
    if (hasProp && hasSecret) {
      analyticsLoad(7);
    } else {
      analyticsShowSetup(hasProp, hasSecret);
    }
  } catch {
    analyticsShowSetup(false, false);
  }
}

function analyticsShowSetup(hasProp, hasSecret) {
  const el = document.getElementById('analytics-body');
  if (!el) return;
  const missing = [];
  if (!hasProp) missing.push('<strong style="color:var(--text-1)">ga4_property_id</strong> — GA4 Property ID (e.g. 123456789)');
  if (!hasSecret) missing.push('<strong style="color:var(--text-1)">ga4_api_secret</strong> — Measurement Protocol API secret');
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">📊</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect Google Analytics</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        The following settings are required:
        <ul style="text-align:left;margin:12px 0 0;padding-left:20px">
          ${missing.map(m => `<li style="margin-bottom:6px;color:var(--text-2)">${m}</li>`).join('')}
        </ul>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

async function analyticsLoad(days) {
  _analyticsDays = days;
  const el = document.getElementById('analytics-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch(`/api/analytics/report?days=${days}`);
    const d = await r.json();
    analyticsRender(d, days);
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load analytics.</div>`;
  }
}

function analyticsRender(data, days) {
  const el = document.getElementById('analytics-body');
  if (!el) return;
  const totals = data.totals || {};
  const daily = data.daily || [];

  const statCards = [
    {label: 'Sessions', value: totals.sessions ?? '—', icon: '🖥️'},
    {label: 'Active Users', value: totals.active_users ?? totals.users ?? '—', icon: '👤'},
    {label: 'Page Views', value: totals.page_views ?? totals.pageviews ?? '—', icon: '👁️'},
  ];

  el.innerHTML = `
    <div class="tab-row" style="margin-bottom:24px">
      <button class="tab-btn${days===7?' active':''}" onclick="analyticsLoad(7)">7d</button>
      <button class="tab-btn${days===30?' active':''}" onclick="analyticsLoad(30)">30d</button>
      <button class="tab-btn${days===90?' active':''}" onclick="analyticsLoad(90)">90d</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px">
      ${statCards.map(s => `
        <div class="card" style="padding:20px;text-align:center">
          <div style="font-size:28px;margin-bottom:6px">${s.icon}</div>
          <div style="font-size:28px;font-weight:700;line-height:1;margin-bottom:6px">${typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
          <div style="font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">${s.label}</div>
        </div>`).join('')}
    </div>

    ${daily.length ? `
    <div class="card" style="padding:20px">
      <div style="font-size:13px;font-weight:600;margin-bottom:16px;color:var(--text-2)">Daily Breakdown</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:1px solid var(--card-border)">
              <th style="text-align:left;padding:6px 12px;color:var(--text-3);font-weight:500">Date</th>
              <th style="text-align:right;padding:6px 12px;color:var(--text-3);font-weight:500">Sessions</th>
              <th style="text-align:right;padding:6px 12px;color:var(--text-3);font-weight:500">Users</th>
              <th style="text-align:right;padding:6px 12px;color:var(--text-3);font-weight:500">Page Views</th>
            </tr>
          </thead>
          <tbody>
            ${daily.map(row => `
              <tr style="border-bottom:1px solid var(--card-border)44">
                <td style="padding:8px 12px;color:var(--text-2)">${row.date || '—'}</td>
                <td style="padding:8px 12px;text-align:right">${(row.sessions ?? '—').toLocaleString ? (row.sessions ?? 0).toLocaleString() : (row.sessions ?? '—')}</td>
                <td style="padding:8px 12px;text-align:right">${(row.users ?? row.active_users ?? '—').toLocaleString ? (row.users ?? row.active_users ?? 0).toLocaleString() : (row.users ?? '—')}</td>
                <td style="padding:8px 12px;text-align:right">${(row.page_views ?? row.pageviews ?? '—').toLocaleString ? (row.page_views ?? row.pageviews ?? 0).toLocaleString() : (row.page_views ?? '—')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}`;
}
