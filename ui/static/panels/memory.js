/* OZY2 — Memory Panel */

function init_memory(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:780px;margin:0 auto">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:20px;font-weight:700;margin:0">Memory</h2>
        <button class="btn btn-ghost btn-sm" onclick="clearAllHistory()"
          style="color:var(--text-3);font-size:12px">Clear History</button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:4px;margin-bottom:16px;background:var(--card-bg);
        padding:4px;border-radius:var(--r-md);border:1px solid var(--card-border);width:fit-content">
        <button id="mem-tab-facts" class="btn btn-ghost" style="font-size:12px;padding:5px 14px;
          background:var(--accent);color:white" onclick="showMemTab('facts')">Facts</button>
        <button id="mem-tab-history" class="btn btn-ghost" style="font-size:12px;padding:5px 14px"
          onclick="showMemTab('history')">Chat History</button>
      </div>

      <!-- Facts Tab -->
      <div id="mem-facts">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input id="fact-key"   class="input" placeholder="Key (e.g. user.hobby)" style="flex:1">
          <input id="fact-value" class="input" placeholder="Value"                 style="flex:2">
          <button class="btn btn-primary" onclick="saveFact()">Save</button>
        </div>
        <div id="facts-list"><div class="spinner" style="margin:30px auto"></div></div>
      </div>

      <!-- History Tab -->
      <div id="mem-history" style="display:none">
        <div id="history-list"><div class="spinner" style="margin:30px auto"></div></div>
      </div>

    </div>
  `;

  loadFacts();
}

function showMemTab(tab) {
  document.getElementById('mem-facts').style.display   = tab === 'facts'   ? '' : 'none';
  document.getElementById('mem-history').style.display = tab === 'history' ? '' : 'none';
  ['facts','history'].forEach(t => {
    const btn = document.getElementById(`mem-tab-${t}`);
    if (btn) { btn.style.background = t === tab ? 'var(--accent)' : ''; btn.style.color = t === tab ? 'white' : ''; }
  });
  if (tab === 'history') loadChatHistory();
}

async function loadFacts() {
  const el = document.getElementById('facts-list');
  if (!el) return;
  try {
    const r = await fetch('/api/memory/facts');
    const d = await r.json();
    if (d.ok && d.facts.length) {
      el.innerHTML = d.facts.map(f => `
        <div class="card" style="margin-bottom:8px;padding:12px 16px;
          display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:var(--accent);font-weight:600">${f.key}</div>
            <div style="font-size:14px;margin-top:2px">${f.value}</div>
          </div>
          <button class="btn btn-ghost btn-icon" onclick="deleteFact('${f.key}')"
            style="color:var(--text-3)">🗑</button>
        </div>
      `).join('');
    } else {
      el.innerHTML = `<div style="color:var(--text-3);padding:20px 0;font-size:14px">
        No facts stored yet. Facts help OZY remember things about you.</div>`;
    }
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px 0">Error loading facts</div>`;
  }
}

async function saveFact() {
  const key   = document.getElementById('fact-key')?.value.trim();
  const value = document.getElementById('fact-value')?.value.trim();
  if (!key || !value) { toast('Key and value required', 'error'); return; }
  await fetch('/api/memory/facts', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({key, value})
  });
  document.getElementById('fact-key').value   = '';
  document.getElementById('fact-value').value = '';
  loadFacts();
  toast('Fact saved', 'success');
}

async function deleteFact(key) {
  await fetch(`/api/memory/facts/${encodeURIComponent(key)}`, {method:'DELETE'});
  loadFacts();
}

async function loadChatHistory() {
  const el = document.getElementById('history-list');
  if (!el) return;
  try {
    const r = await fetch('/api/memory/history?limit=100');
    const d = await r.json();
    if (d.ok && d.history.length) {
      el.innerHTML = [...d.history].reverse().map(m => `
        <div style="display:flex;gap:10px;margin-bottom:10px;
          ${m.role==='user' ? 'flex-direction:row-reverse' : ''}">
          <div style="width:28px;height:28px;border-radius:8px;flex-shrink:0;
            display:flex;align-items:center;justify-content:center;font-size:12px;
            ${m.role==='user'
              ? 'background:var(--accent-dim);color:var(--accent)'
              : 'background:linear-gradient(135deg,#6366f1,#8b5cf6)'}">
            ${m.role==='user' ? '👤' : '✦'}
          </div>
          <div style="max-width:75%;padding:10px 14px;border-radius:${m.role==='user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px'};
            font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word;
            ${m.role==='user'
              ? 'background:var(--accent);color:white'
              : 'background:var(--card-bg);border:1px solid var(--card-border)'}">
            ${m.content}
          </div>
        </div>
      `).join('');
    } else {
      el.innerHTML = `<div style="color:var(--text-3);padding:20px 0">No chat history</div>`;
    }
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px 0">Error loading history</div>`;
  }
}

async function clearAllHistory() {
  if (!confirm('Clear all chat history?')) return;
  await fetch('/api/memory/history', {method:'DELETE'});
  toast('History cleared', 'success');
  if (document.getElementById('history-list').style.display !== 'none') loadChatHistory();
}
