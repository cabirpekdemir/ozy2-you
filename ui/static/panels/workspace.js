/* OZY2 — Workspace Panel */

function init_workspace(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">
      <div style="margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">Workspace</h2>
        <div style="color:var(--text-3);font-size:13px">Files, notes, and documents</div>
      </div>

      <!-- Quick access grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:20px">
        ${[
          {icon:'📁', label:'Drive',    panel:'drive'},
          {icon:'📧', label:'Gmail',    panel:'gmail'},
          {icon:'📅', label:'Calendar', panel:'calendar'},
          {icon:'🐙', label:'GitHub',   panel:'github'},
        ].map(w => `
          <div class="card" style="padding:20px;text-align:center;cursor:pointer;transition:all 0.2s"
            onclick="showPanel('${w.panel}')"
            onmouseenter="this.style.borderColor='var(--accent)'"
            onmouseleave="this.style.borderColor='var(--card-border)'">
            <div style="font-size:32px;margin-bottom:8px">${w.icon}</div>
            <div style="font-size:13px;font-weight:500">${w.label}</div>
          </div>
        `).join('')}
      </div>

      <!-- Recent activity -->
      <div style="font-size:12px;font-weight:700;color:var(--text-3);
        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Recent Drive Files</div>
      <div id="workspace-recent">
        <div class="spinner" style="margin:30px auto"></div>
      </div>
    </div>
  `;

  loadWorkspaceRecent();
}

async function loadWorkspaceRecent() {
  const el = document.getElementById('workspace-recent');
  if (!el) return;
  try {
    const r = await fetch('/api/drive/recent?limit=6');
    const d = await r.json();
    if (d.ok && d.files.length) {
      const icons = {
        'application/vnd.google-apps.document':'📝',
        'application/vnd.google-apps.spreadsheet':'📊',
        'application/vnd.google-apps.presentation':'📑',
        'application/pdf':'📄',
      };
      el.innerHTML = d.files.map(f => `
        <div class="card" style="margin-bottom:8px;padding:12px 16px;
          display:flex;align-items:center;gap:12px">
          <span style="font-size:20px;flex-shrink:0">${icons[f.mimeType] || '📄'}</span>
          <div style="flex:1;overflow:hidden">
            <div style="font-size:13px;font-weight:500;overflow:hidden;
              text-overflow:ellipsis;white-space:nowrap">${f.name}</div>
            <div style="font-size:11px;color:var(--text-3)">
              ${f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : ''}
            </div>
          </div>
          ${f.webViewLink ? `<a href="${f.webViewLink}" target="_blank"
            class="btn btn-ghost btn-sm">Open</a>` : ''}
        </div>
      `).join('');
    } else {
      el.innerHTML = `<div style="color:var(--text-3);padding:16px 0;font-size:13px">No recent files</div>`;
    }
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:16px 0;font-size:13px">Could not load Drive files</div>`;
  }
}
