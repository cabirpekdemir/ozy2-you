/* OZY2 — YouTube Panel */

function init_youtube(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">
      <div style="margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">YouTube</h2>
        <div style="color:var(--text-3);font-size:13px">Channel analytics and content management</div>
      </div>

      <!-- Mock analytics -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
        ${[
          {label:'Subscribers', value:'—', icon:'👥', color:'#ef4444'},
          {label:'Total Views',  value:'—', icon:'👁', color:'#3b82f6'},
          {label:'Videos',       value:'—', icon:'▶️', color:'#10b981'},
          {label:'Watch Hours',  value:'—', icon:'⏱', color:'#f59e0b'},
        ].map(s => `
          <div class="card stat-card">
            <div style="font-size:24px;font-weight:700;color:${s.color}">${s.value}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:4px">${s.icon} ${s.label}</div>
          </div>
        `).join('')}
      </div>

      <div class="card" style="padding:40px;text-align:center">
        <div style="font-size:48px;margin-bottom:16px">▶️</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">YouTube Studio Integration</div>
        <div style="color:var(--text-3);font-size:13px;max-width:360px;margin:0 auto 20px">
          Connect your YouTube channel for analytics, video management, and comment monitoring.
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary" onclick="toast('YouTube API integration coming soon','info')">
            Connect Channel
          </button>
          <button class="btn btn-ghost" onclick="showPanel('chat')">
            Ask OZY about YouTube →
          </button>
        </div>
      </div>
    </div>
  `;
}
