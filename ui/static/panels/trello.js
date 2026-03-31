/* OZY2 — Trello Panel */

let _trelloBoards = [];
let _trelloView   = 'boards'; // 'boards' | 'cards'
let _trelloActive = null;     // { id, name }

async function init_trello(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>📋 Trello</h2>
      </div>
      <div id="trello-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const configured = d.ok && d.settings?.trello_key && d.settings?.trello_token;
    if (configured) {
      await trelloLoadBoards();
    } else {
      trelloShowSetup();
    }
  } catch {
    trelloShowSetup();
  }
}

function trelloShowSetup() {
  const el = document.getElementById('trello-body');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">📋</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect Trello</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        Add your Trello credentials to view boards and cards.
        <ol style="text-align:left;margin:12px 0 0;padding-left:20px;color:var(--text-2)">
          <li>Visit <strong style="color:var(--text-1)">trello.com/app-key</strong> to get your API key</li>
          <li>On the same page, click <strong style="color:var(--text-1)">Generate a Token</strong></li>
          <li>Paste both into <strong style="color:var(--text-1)">Settings → Trello</strong></li>
        </ol>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

async function trelloLoadBoards() {
  const el = document.getElementById('trello-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch('/api/trello/boards');
    const d = await r.json();
    _trelloBoards = d.boards || [];
    _trelloView   = 'boards';
    trelloRenderBoards();
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load boards.</div>`;
  }
}

function trelloRenderBoards() {
  const el = document.getElementById('trello-body');
  if (!el) return;
  if (!_trelloBoards.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-3)">
      <div style="font-size:44px;margin-bottom:12px">📋</div>
      <div>No boards found in your Trello account.</div>
    </div>`;
    return;
  }
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
      ${_trelloBoards.map(b => `
        <div class="card" style="padding:20px;cursor:pointer;transition:transform 0.15s"
          onclick="trelloOpenBoard('${b.id}', ${JSON.stringify(b.name).replace(/'/g,"\\'")})"
          onmouseenter="this.style.transform='translateY(-2px)'"
          onmouseleave="this.style.transform=''">
          <div style="width:100%;height:8px;border-radius:4px;margin-bottom:12px;
            background:${b.prefs?.backgroundColor || b.prefs?.backgroundTopColor || 'var(--accent)'}"></div>
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${b.name}</div>
          ${b.desc ? `<div style="font-size:12px;color:var(--text-3);line-height:1.4;
            overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
            ${b.desc}</div>` : ''}
          <div style="margin-top:10px;font-size:12px;color:var(--accent)">View cards →</div>
        </div>`).join('')}
    </div>`;
}

async function trelloOpenBoard(boardId, boardName) {
  const el = document.getElementById('trello-body');
  if (!el) return;
  _trelloActive = { id: boardId, name: boardName };
  _trelloView   = 'cards';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button class="btn btn-ghost btn-sm" onclick="trelloLoadBoards()">← Boards</button>
      <span style="font-weight:600;font-size:15px">${boardName}</span>
    </div>
    <div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch(`/api/trello/boards/${boardId}/cards`);
    const d = await r.json();
    trelloRenderCards(d.cards || []);
  } catch {
    el.innerHTML += `<div style="color:var(--text-3);padding:20px">Failed to load cards.</div>`;
  }
}

function trelloRenderCards(cards) {
  const el = document.getElementById('trello-body');
  if (!el) return;
  const backBtn = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button class="btn btn-ghost btn-sm" onclick="trelloLoadBoards()">← Boards</button>
      <span style="font-weight:600;font-size:15px">${_trelloActive?.name || ''}</span>
    </div>`;
  if (!cards.length) {
    el.innerHTML = backBtn + `<div style="text-align:center;padding:50px 20px;color:var(--text-3)">
      <div style="font-size:36px;margin-bottom:10px">📋</div>
      <div>No cards in this board.</div>
    </div>`;
    return;
  }
  el.innerHTML = backBtn + cards.map(c => {
    const due = c.due ? new Date(c.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;
    const isOverdue = c.due && !c.dueComplete && new Date(c.due) < new Date();
    return `
    <div class="card" style="margin-bottom:8px;padding:14px 16px;display:flex;align-items:center;gap:12px">
      <div style="font-size:18px;flex-shrink:0">${c.dueComplete ? '✅' : '🟦'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:14px">${c.name}</div>
        ${c.desc ? `<div style="font-size:12px;color:var(--text-2);margin-top:2px;
          overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${c.desc}</div>` : ''}
      </div>
      ${due ? `<span style="font-size:12px;flex-shrink:0;color:${isOverdue ? '#ef4444' : 'var(--text-3)'}">
        ${isOverdue ? '⚠️ ' : ''}${due}</span>` : ''}
      ${c.url ? `<a href="${c.url}" target="_blank" rel="noopener noreferrer"
        class="btn btn-ghost btn-sm" style="flex-shrink:0">↗</a>` : ''}
    </div>`;
  }).join('');
}
