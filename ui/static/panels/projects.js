/* OZY2 — Projects Panel */

function init_projects(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">Projects</h2>
          <div style="color:var(--text-3);font-size:13px">Track your projects and goals</div>
        </div>
        <button class="btn btn-primary" onclick="toast('Coming soon in next update','info')">+ New Project</button>
      </div>

      <!-- Demo projects -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${[
          {name:'OZY2', desc:'Personal AI assistant rebuild', color:'#6366f1', progress:72, tasks:8},
          {name:'YouTube Channel', desc:'Content creation & analytics', color:'#ef4444', progress:45, tasks:12},
          {name:'Learning', desc:'Books, courses, and skills', color:'#10b981', progress:30, tasks:5},
        ].map(p => `
          <div class="card" style="padding:20px;border-left:3px solid ${p.color}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
              <div>
                <div style="font-weight:600;font-size:15px">${p.name}</div>
                <div style="font-size:12px;color:var(--text-3);margin-top:2px">${p.desc}</div>
              </div>
            </div>
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:11px;
                color:var(--text-3);margin-bottom:5px">
                <span>Progress</span><span>${p.progress}%</span>
              </div>
              <div style="height:4px;background:var(--card-border);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${p.progress}%;background:${p.color};
                  border-radius:2px;transition:width 0.5s ease"></div>
              </div>
            </div>
            <div style="font-size:12px;color:var(--text-3)">${p.tasks} tasks remaining</div>
          </div>
        `).join('')}

        <!-- Add more placeholder -->
        <div class="card" style="padding:20px;display:flex;align-items:center;justify-content:center;
          cursor:pointer;border-style:dashed;min-height:120px"
          onclick="toast('Project creation coming soon','info')"
          onmouseenter="this.style.borderColor='var(--accent)'"
          onmouseleave="this.style.borderColor='var(--card-border)'">
          <div style="text-align:center;color:var(--text-3)">
            <div style="font-size:28px;margin-bottom:6px">+</div>
            <div style="font-size:13px">New Project</div>
          </div>
        </div>
      </div>

    </div>
  `;
}
