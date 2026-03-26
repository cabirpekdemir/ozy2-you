/* OZY2 — Skills Panel */

const SKILL_CATALOG = [
  {
    id: 'gmail',    name: 'Gmail',    icon: '📧',
    desc: 'Read, send, and manage your Gmail inbox',
    status: 'active', category: 'Communication',
  },
  {
    id: 'calendar', name: 'Calendar', icon: '📅',
    desc: 'View and create Google Calendar events',
    status: 'active', category: 'Communication',
  },
  {
    id: 'drive',    name: 'Google Drive', icon: '📁',
    desc: 'Browse and read files from Google Drive',
    status: 'active', category: 'Productivity',
  },
  {
    id: 'telegram', name: 'Telegram',  icon: '✈️',
    desc: 'Send and receive Telegram messages via bot',
    status: 'active', category: 'Communication',
  },
  {
    id: 'tasks',    name: 'Tasks',     icon: '✅',
    desc: 'Create and manage your personal task list',
    status: 'active', category: 'Productivity',
  },
  {
    id: 'briefing', name: 'Briefing',  icon: '☀️',
    desc: 'Daily morning briefing from all your data',
    status: 'active', category: 'Productivity',
  },
  {
    id: 'memory',   name: 'Memory',    icon: '🧠',
    desc: 'Persistent facts and conversation history',
    status: 'active', category: 'System',
  },
  {
    id: 'debate',   name: 'AI Debate', icon: '🤖',
    desc: 'Multi-AI debate arena — Gemini vs Claude vs ChatGPT',
    status: 'active', category: 'Creative',
  },
  {
    id: 'whatsapp', name: 'WhatsApp',  icon: '💬',
    desc: 'WhatsApp messaging via whatsapp-web.js bridge',
    status: 'coming_soon', category: 'Communication',
  },
  {
    id: 'github',   name: 'GitHub',    icon: '🐙',
    desc: 'Repos, issues, pull requests, code review',
    status: 'coming_soon', category: 'Productivity',
  },
  {
    id: 'youtube',  name: 'YouTube',   icon: '▶️',
    desc: 'Channel analytics and video management',
    status: 'coming_soon', category: 'Creative',
  },
  {
    id: 'content',  name: 'Content Studio', icon: '🎨',
    desc: 'AI-powered content creation and scheduling',
    status: 'coming_soon', category: 'Creative',
  },
];

function init_skills(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">

      <div style="margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">Skills</h2>
        <div style="color:var(--text-3);font-size:13px">
          ${SKILL_CATALOG.filter(s => s.status === 'active').length} active skills
        </div>
      </div>

      ${['Communication','Productivity','Creative','System'].map(cat => {
        const skills = SKILL_CATALOG.filter(s => s.category === cat);
        if (!skills.length) return '';
        return `
          <div style="margin-bottom:24px">
            <div style="font-size:12px;font-weight:700;color:var(--text-3);
              text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">${cat}</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
              ${skills.map(s => `
                <div class="card" style="padding:16px;${s.status==='coming_soon' ? 'opacity:0.6' : ''}">
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                    <div style="width:42px;height:42px;border-radius:14px;font-size:22px;
                      background:var(--card-border);display:flex;align-items:center;justify-content:center">
                      ${s.icon}
                    </div>
                    <div style="flex:1">
                      <div style="font-weight:600;font-size:14px">${s.name}</div>
                      <span style="font-size:11px;padding:2px 7px;border-radius:var(--r-full);
                        background:${s.status === 'active' ? 'rgba(16,185,129,0.15)' : 'var(--card-border)'};
                        color:${s.status === 'active' ? '#10b981' : 'var(--text-3)'}">
                        ${s.status === 'active' ? 'Active' : 'Coming soon'}
                      </span>
                    </div>
                  </div>
                  <div style="font-size:13px;color:var(--text-3);line-height:1.5">${s.desc}</div>
                  ${s.status === 'active' ? `
                    <button class="btn btn-ghost" style="margin-top:10px;font-size:12px;width:100%;
                      padding:6px" onclick="showPanel('${s.id}')">Open →</button>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}

    </div>
  `;
}
