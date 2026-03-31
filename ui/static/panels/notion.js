/* OZY2 — Notion Panel */

async function init_notion(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🔲 Notion</h2>
      </div>
      <div id="notion-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const token = d.ok && d.settings?.notion_token;
    if (token) {
      notionShowSearch();
    } else {
      notionShowSetup();
    }
  } catch {
    notionShowSetup();
  }
}

function notionShowSetup() {
  const el = document.getElementById('notion-body');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">🔲</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect Notion</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        To search your Notion workspace, you need to add an integration token.<br>
        <ol style="text-align:left;margin:12px 0 0;padding-left:20px;color:var(--text-2)">
          <li>Go to <strong style="color:var(--text-1)">notion.so/my-integrations</strong></li>
          <li>Click <strong style="color:var(--text-1)">+ New integration</strong> and create one</li>
          <li>Copy the <strong style="color:var(--text-1)">Internal Integration Token</strong></li>
          <li>Paste it in Settings → Notion Token</li>
        </ol>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

function notionShowSearch() {
  const el = document.getElementById('notion-body');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:20px">
      <input id="notion-query" class="input" placeholder="Search Notion pages and databases…"
        style="flex:1" onkeydown="if(event.key==='Enter') notionSearch()">
      <button class="btn btn-primary" onclick="notionSearch()">Search</button>
    </div>
    <div id="notion-results"></div>`;
}

async function notionSearch() {
  const query = document.getElementById('notion-query')?.value.trim();
  if (!query) { toast('Enter a search term', 'error'); return; }
  const el = document.getElementById('notion-results');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:30px auto"></div>`;
  try {
    const r = await fetch(`/api/notion/search?q=${encodeURIComponent(query)}`);
    const d = await r.json();
    const results = d.results || [];
    if (!results.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-3)">
        <div style="font-size:36px;margin-bottom:10px">🔍</div>
        <div>No results for "${query}"</div>
      </div>`;
      return;
    }
    el.innerHTML = results.map(item => {
      const typeColor = item.type === 'database' ? 'var(--accent)' : 'var(--text-3)';
      const typeLabel = item.type === 'database' ? 'Database' : 'Page';
      return `
      <div class="card" style="margin-bottom:8px;padding:14px 16px;display:flex;align-items:center;gap:12px">
        <div style="font-size:22px;flex-shrink:0">${item.type === 'database' ? '🗄️' : '📄'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${item.title || 'Untitled'}
          </div>
          <span style="font-size:11px;color:${typeColor};background:var(--card-bg);
            border:1px solid var(--card-border);padding:2px 8px;border-radius:20px;display:inline-block;margin-top:4px">
            ${typeLabel}
          </span>
        </div>
        ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer"
          class="btn btn-ghost btn-sm" style="flex-shrink:0">Open ↗</a>` : ''}
      </div>`;
    }).join('');
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to search Notion.</div>`;
  }
}
