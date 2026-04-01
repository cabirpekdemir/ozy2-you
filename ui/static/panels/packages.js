/**
 * OZY2 — Diğer Paketler / Other Packages Panel
 * Shows Professional, Social, Business and Full package details
 * with feature listings and upgrade CTA.
 */

const PackagesPanel = (() => {

  const PACKAGES = [
    {
      key: "you",
      name: "OZY You",
      icon: "👤",
      color: "#6366f1",
      badge: "FREE · Open Source",
      badgeClass: "badge-free",
      description: "Personal AI assistant — free & open source. Your data stays on your device.",
      price: "Free",
      cta: "Currently active",
      ctaDisabled: true,
      features: [
        { icon: "💬", text: "AI Chat (Gemini / GPT / Claude / Ollama)" },
        { icon: "✅", text: "Tasks & Reminders" },
        { icon: "🧠", text: "Memory & Notes" },
        { icon: "📰", text: "Daily Briefing" },
        { icon: "📧", text: "Gmail & Calendar" },
        { icon: "📱", text: "Telegram bot" },
        { icon: "📁", text: "Google Drive (browse & read)" },
        { icon: "🐙", text: "GitHub (repos, issues, PRs)" },
        { icon: "▶️", text: "YouTube (summaries & search)" },
        { icon: "🎓", text: "Lesson Planner" },
        { icon: "🗺️", text: "Plans & Goals" },
        { icon: "📈", text: "Stocks & market tracking" },
        { icon: "📚", text: "Books & reading tracker" },
        { icon: "⚡", text: "Skills — install community connectors" },
        { icon: "🛍️", text: "Marketplace — browse & share skills" },
      ],
    },
    {
      key: "professional",
      name: "OZY Professional",
      icon: "💼",
      color: "#0ea5e9",
      badge: "COMING SOON",
      badgeClass: "badge-pro",
      description: "Advanced AI automations, multi-agent workflows and deep integrations for power users.",
      price: "$9.99 / mo",
      cta: "Join Waitlist",
      ctaDisabled: false,
      features: [
        { icon: "🤖", text: "Multi-agent workflows & pipelines" },
        { icon: "🚀", text: "Priority model access (GPT-4o, Claude Opus)" },
        { icon: "📝", text: "Notion & Obsidian sync" },
        { icon: "📋", text: "Trello & project management" },
        { icon: "🗂️", text: "Advanced Projects & Workspace" },
        { icon: "🗣️", text: "AI Debate & reasoning assistant" },
        { icon: "🎛️", text: "Advanced automations (n workflows)" },
        { icon: "📊", text: "Personal analytics & insights" },
        { icon: "🔌", text: "All You features included" },
      ],
    },
    {
      key: "social",
      name: "OZY Social",
      icon: "🌐",
      color: "#10b981",
      badge: "COMING SOON",
      badgeClass: "badge-social",
      description: "Social media management, content creation and lifestyle features.",
      price: "$9.99 / mo",
      cta: "Join Waitlist",
      ctaDisabled: false,
      features: [
        { icon: "📱", text: "WhatsApp integration" },
        { icon: "✍️", text: "Content creator (blog, social media)" },
        { icon: "📣", text: "Multi-platform social media posting" },
        { icon: "🏠", text: "Smart home control" },
        { icon: "🎵", text: "Music & media recommendations" },
        { icon: "📊", text: "Audience & engagement analytics" },
        { icon: "🔔", text: "Social media notifications" },
        { icon: "🔌", text: "All You features included" },
      ],
    },
    {
      key: "business",
      name: "OZY Business",
      icon: "🏢",
      color: "#f59e0b",
      badge: "COMING SOON",
      badgeClass: "badge-business",
      description: "Team collaboration, CRM and enterprise tools for growing businesses.",
      price: "$19.99 / mo",
      cta: "Contact Us",
      ctaDisabled: false,
      features: [
        { icon: "👥", text: "Team management & role-based access" },
        { icon: "💼", text: "Jira / Linear / Asana integration" },
        { icon: "💬", text: "Slack & Microsoft Teams" },
        { icon: "🤝", text: "HubSpot CRM" },
        { icon: "🎥", text: "Meeting assistant (notes & action items)" },
        { icon: "🧾", text: "Invoicing & expense tracking" },
        { icon: "📊", text: "Business analytics dashboard" },
        { icon: "🔌", text: "All You + Professional features included" },
      ],
    },
  ];

  function load() {
    const container = document.getElementById("panel-packages");
    if (!container) return;
    render(container);
  }

  function render(container) {
    // ── Tabs ──────────────────────────────────────────────────────────────────
    const tabButtons = PACKAGES.map((p, i) =>
      `<button class="pkg-tab-btn${i === 1 ? " active" : ""}"
               data-key="${p.key}"
               onclick="PackagesPanel.switchTab('${p.key}')"
               style="--pkg-color:${p.color}">
        ${p.icon} ${p.name}
        <span class="pkg-badge ${p.badgeClass}">${p.badge}</span>
      </button>`
    ).join("");

    // ── Cards ─────────────────────────────────────────────────────────────────
    const cards = PACKAGES.map((p, i) =>
      `<div class="pkg-card${i === 1 ? " active" : ""}" id="pkg-card-${p.key}">
        <div class="pkg-card-header" style="background: linear-gradient(135deg, ${p.color}22 0%, ${p.color}11 100%); border-left: 4px solid ${p.color}">
          <div class="pkg-title-row">
            <span class="pkg-icon">${p.icon}</span>
            <div>
              <h2 class="pkg-name">${p.name}</h2>
              <p class="pkg-desc">${p.description}</p>
            </div>
            <div class="pkg-price-tag" style="background:${p.color}22; border:1px solid ${p.color}44">
              <span class="pkg-price">${p.price}</span>
            </div>
          </div>
        </div>

        <div class="pkg-features-grid">
          ${p.features.map(f =>
            `<div class="pkg-feature-item">
              <span class="pkg-feature-icon">${f.icon}</span>
              <span class="pkg-feature-text">${f.text}</span>
            </div>`
          ).join("")}
        </div>

        <div class="pkg-footer">
          ${p.ctaDisabled
            ? `<button class="pkg-cta-btn pkg-cta-current" disabled>${p.cta} ✓</button>`
            : `<button class="pkg-cta-btn" style="background:${p.color}"
                       onclick="PackagesPanel.requestAccess('${p.key}', '${p.name}')">
                ${p.cta} →
               </button>`
          }
          ${p.key !== "you"
            ? `<p class="pkg-note">Erişim için <a href="https://github.com/cabirpekdemir/ozy2" target="_blank">GitHub</a>'dan iletişime geçin veya <a href="mailto:contact@ozy2.com">e-posta gönderin</a>.</p>`
            : `<p class="pkg-note">Kaynak koda <a href="https://github.com/cabirpekdemir/ozy2" target="_blank" style="color:${p.color}">GitHub</a>'dan ulaşın.</p>`
          }
        </div>
      </div>`
    ).join("");

    container.innerHTML = `
      <div class="packages-panel">
        <div class="packages-header">
          <h1>📦 OZY2 Paketleri</h1>
          <p class="packages-subtitle">
            OZY2 <strong>You</strong> paketi tamamen ücretsiz ve açık kaynak.<br>
            Daha fazlası için diğer paketlerimizi inceleyin.
          </p>
        </div>

        <div class="pkg-tabs-row">
          ${tabButtons}
        </div>

        <div class="pkg-cards-container">
          ${cards}
        </div>
      </div>

      <style>
        .packages-panel { padding: 1.5rem; max-width: 860px; margin: 0 auto; }
        .packages-header { text-align: center; margin-bottom: 2rem; }
        .packages-header h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.4rem; }
        .packages-subtitle { color: var(--text-muted, #888); line-height: 1.6; }

        /* Tab buttons */
        .pkg-tabs-row {
          display: flex; gap: 0.5rem; flex-wrap: wrap;
          margin-bottom: 1.5rem; justify-content: center;
        }
        .pkg-tab-btn {
          padding: 0.5rem 1rem; border-radius: 999px; border: 2px solid transparent;
          background: var(--card-bg, #1e1e2e); color: var(--text, #ccc);
          cursor: pointer; font-size: 0.85rem; font-weight: 500;
          transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem;
        }
        .pkg-tab-btn.active, .pkg-tab-btn:hover {
          border-color: var(--pkg-color, #6366f1);
          color: var(--pkg-color, #6366f1);
          background: color-mix(in srgb, var(--pkg-color, #6366f1) 12%, transparent);
        }
        .pkg-badge {
          font-size: 0.65rem; padding: 0.1rem 0.5rem;
          border-radius: 999px; font-weight: 700; letter-spacing: 0.05em;
        }
        .badge-free { background: #6366f122; color: #6366f1; }
        .badge-pro  { background: #0ea5e922; color: #0ea5e9; }
        .badge-social { background: #10b98122; color: #10b981; }
        .badge-business { background: #f59e0b22; color: #f59e0b; }
        .badge-full { background: #a855f722; color: #a855f7; }

        /* Cards */
        .pkg-cards-container { position: relative; }
        .pkg-card { display: none; animation: fadeIn 0.2s ease; }
        .pkg-card.active { display: block; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }

        .pkg-card-header {
          border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.25rem;
        }
        .pkg-title-row {
          display: flex; align-items: flex-start; gap: 1rem;
        }
        .pkg-icon { font-size: 2.2rem; flex-shrink: 0; }
        .pkg-name { font-size: 1.4rem; font-weight: 700; margin: 0 0 0.2rem; }
        .pkg-desc { color: var(--text-muted, #888); margin: 0; font-size: 0.9rem; }
        .pkg-price-tag {
          margin-left: auto; border-radius: 8px; padding: 0.4rem 0.9rem;
          white-space: nowrap; flex-shrink: 0;
        }
        .pkg-price { font-weight: 700; font-size: 1rem; }

        /* Features */
        .pkg-features-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 0.6rem; margin-bottom: 1.5rem;
        }
        .pkg-feature-item {
          display: flex; align-items: center; gap: 0.6rem;
          background: var(--card-bg, #1e1e2e); border-radius: 8px;
          padding: 0.6rem 0.9rem; font-size: 0.88rem;
        }
        .pkg-feature-icon { font-size: 1.1rem; flex-shrink: 0; }

        /* Footer */
        .pkg-footer { text-align: center; }
        .pkg-cta-btn {
          padding: 0.7rem 2rem; border-radius: 8px; border: none;
          color: white; font-size: 1rem; font-weight: 600;
          cursor: pointer; transition: opacity 0.2s; margin-bottom: 0.75rem;
        }
        .pkg-cta-btn:hover:not(:disabled) { opacity: 0.85; }
        .pkg-cta-current { background: var(--card-bg, #333) !important; color: var(--text-muted, #888) !important; cursor: default; }
        .pkg-note { color: var(--text-muted, #888); font-size: 0.82rem; margin-top: 0.5rem; }
        .pkg-note a { color: inherit; text-decoration: underline; }
      </style>
    `;
  }

  function switchTab(key) {
    // Update tab buttons
    document.querySelectorAll(".pkg-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.key === key);
    });
    // Show correct card
    document.querySelectorAll(".pkg-card").forEach(card => {
      card.classList.toggle("active", card.id === `pkg-card-${key}`);
    });
  }

  function requestAccess(key, name) {
    const subject = encodeURIComponent(`OZY2 ${name} Paketi Erişim Talebi`);
    const body    = encodeURIComponent(`Merhaba,\n\nOZY2 ${name} paketine erişmek istiyorum.\n\nAdım:\nKurum/Proje:\n`);
    const url     = `https://github.com/cabirpekdemir/ozy2/issues/new?title=${subject}&body=${body}`;
    window.open(url, "_blank");
  }

  return { load, switchTab, requestAccess };
})();

// Panel loader entry point
function init_packages(el) {
  PackagesPanel.load();
}
