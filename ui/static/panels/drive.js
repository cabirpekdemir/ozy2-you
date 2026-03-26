/* OZY2 — Drive Panel */

function init_drive(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="font-size:20px;font-weight:700;margin:0">Google Drive</h2>
        <div style="display:flex;gap:8px">
          <input id="drive-search" class="input" placeholder="Search files..."
            style="width:200px;font-size:13px"
            onkeydown="if(event.key==='Enter') driveSearch()">
          <button class="btn btn-ghost btn-icon" onclick="driveSearch()">🔍</button>
        </div>
      </div>

      <div id="drive-files">
        <div class="spinner" style="margin:60px auto"></div>
      </div>

      <!-- File Content Modal -->
      <div id="drive-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
        z-index:200;align-items:center;justify-content:center">
        <div class="card" style="width:min(700px,95vw);max-height:80vh;display:flex;flex-direction:column;padding:0">
          <div style="padding:16px 20px;border-bottom:1px solid var(--card-border);
            display:flex;justify-content:space-between;align-items:center">
            <span id="drive-modal-title" style="font-size:16px;font-weight:600"></span>
            <button class="btn btn-ghost btn-icon" onclick="closeDriveModal()">✕</button>
          </div>
          <div id="drive-modal-body" style="flex:1;overflow-y:auto;padding:20px;
            font-size:13px;line-height:1.7;white-space:pre-wrap;font-family:monospace;
            color:var(--text-2)"></div>
        </div>
      </div>

    </div>
  `;

  loadDriveFiles();
}

async function loadDriveFiles(q = '') {
  const el  = document.getElementById('drive-files');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:60px auto"></div>`;
  try {
    const url = q ? `/api/drive/files?q=${encodeURIComponent(q)}` : '/api/drive/recent';
    const r   = await fetch(url);
    const d   = await r.json();
    if (d.ok) renderDriveFiles(d.files);
    else el.innerHTML = `<div style="color:var(--text-3);padding:20px">${d.error}</div>`;
  } catch (e) {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Error: ${e.message}</div>`;
  }
}

function renderDriveFiles(files) {
  const el = document.getElementById('drive-files');
  if (!files.length) {
    el.innerHTML = `<div style="text-align:center;padding:80px;color:var(--text-3)">
      <div style="font-size:40px;margin-bottom:12px">📁</div><div>No files found</div></div>`;
    return;
  }
  const mimeIcon = {
    'application/vnd.google-apps.folder':       '📁',
    'application/vnd.google-apps.document':     '📝',
    'application/vnd.google-apps.spreadsheet':  '📊',
    'application/vnd.google-apps.presentation': '📑',
    'application/pdf':                          '📄',
    'image/jpeg': '🖼', 'image/png': '🖼', 'image/gif': '🖼',
  };
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
      ${files.map(f => `
        <div class="card" style="padding:16px;cursor:pointer;transition:all 0.2s"
          onclick="openDriveFile('${f.id}','${encodeURIComponent(f.name)}','${f.mimeType}','${f.webViewLink||''}')"
          onmouseenter="this.style.borderColor='var(--accent)'"
          onmouseleave="this.style.borderColor='var(--card-border)'">
          <div style="font-size:32px;margin-bottom:8px">${mimeIcon[f.mimeType] || '📄'}</div>
          <div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;
            white-space:nowrap">${f.name}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:4px">
            ${f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function driveSearch() {
  const q = document.getElementById('drive-search')?.value.trim();
  loadDriveFiles(q);
}

async function openDriveFile(id, encodedName, mimeType, webViewLink) {
  const name = decodeURIComponent(encodedName);
  const isFolder = mimeType === 'application/vnd.google-apps.folder';
  if (isFolder) { return; }

  const canPreview = mimeType.startsWith('application/vnd.google-apps');
  if (!canPreview) {
    if (webViewLink) window.open(webViewLink, '_blank');
    return;
  }

  document.getElementById('drive-modal-title').textContent = name;
  document.getElementById('drive-modal-body').innerHTML    = `<div class="spinner" style="margin:40px auto"></div>`;
  document.getElementById('drive-modal').style.display     = 'flex';

  try {
    const r = await fetch(`/api/drive/files/${id}/content`);
    const d = await r.json();
    document.getElementById('drive-modal-body').textContent = d.content || '(empty)';
  } catch {
    document.getElementById('drive-modal-body').textContent = 'Could not load content';
  }
}

function closeDriveModal() {
  document.getElementById('drive-modal').style.display = 'none';
}
