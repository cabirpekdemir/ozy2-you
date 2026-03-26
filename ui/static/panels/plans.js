/**
 * OZY2 — Plans & Models Panel
 * Shows the three tiers: YOU / PRO / SOCIAL
 * Lets the user activate a tier (saved to settings)
 */

const PlansPanel = (() => {

  let packages = null;
  let currentPkg = "full";

  async function load() {
    const container = document.getElementById("panel-plans");
    if (!container) return;

    container.innerHTML = `<div class="panel-loading">Loading plans…</div>`;

    // Fetch packages.json
    try {
      const [pkgsRes, settingsRes] = await Promise.all([
        fetch("/static/../../config/packages.json"),
        fetch("/api/settings"),
      ]);
      packages   = await pkgsRes.json().catch(() => null);
      const cfg  = await settingsRes.json().catch(() => ({}));
      currentPkg = cfg.package || "full";
    } catch (e) {
      // If config/packages.json isn't served as static, try the API
      try {
        const r  = await fetch("/api/packages");
        packages = await r.json();
      } catch (_) {
        container.innerHTML = `<p class="error">Could not load plan data.</p>`;
        return;
      }
    }

    render(container);
  }

  function render(container) {
    if (!packages) { container.innerHTML = `<p>No plan data.</p>`; return; }

    const tiers = Object.values(packages);

    container.innerHTML = `
      <div class="plans-header">
        <h2>Choose Your Plan</h2>
        <p class="plans-subtitle">All tiers include everything from the tier below. Switch anytime.</p>
      </div>
      <div class="plans-grid" id="plans-grid"></div>
    `;

    const grid = container.querySelector("#plans-grid");

    tiers.forEach(tier => {
      const isActive  = tier.id === currentPkg || currentPkg === "full";
      const isCurrent = tier.id === currentPkg;

      const card = document.createElement("div");
      card.className = `plan-card ${isCurrent ? "plan-active" : ""}`;
      card.style.setProperty("--tier-color", tier.color);

      const skillsHtml = tier.skills.map(s =>
        `<li class="plan-skill">
          <span class="plan-skill-icon">${s.icon}</span>
          <span>
            <strong>${s.label}</strong>
            <small>${s.desc}</small>
          </span>
        </li>`
      ).join("");

      const includesNote = tier.includes
        ? `<div class="plan-includes">✅ Everything in <strong>${packages[tier.includes]?.label || tier.includes}</strong>, plus:</div>`
        : "";

      card.innerHTML = `
        <div class="plan-header">
          <span class="plan-icon">${tier.icon}</span>
          <div>
            <h3 class="plan-name">${tier.label}</h3>
            <p class="plan-tagline">${tier.tagline}</p>
          </div>
          <span class="plan-badge" style="background:${tier.color}">${tier.price}</span>
        </div>
        ${includesNote}
        <ul class="plan-skills">${skillsHtml}</ul>
        <button class="plan-btn ${isCurrent ? 'plan-btn-active' : ''}"
                data-tier="${tier.id}"
                ${isCurrent ? "disabled" : ""}>
          ${isCurrent ? "✓ Active" : "Activate"}
        </button>
      `;

      card.querySelector(".plan-btn").addEventListener("click", () => activateTier(tier.id));
      grid.appendChild(card);
    });
  }

  async function activateTier(tierId) {
    try {
      const res = await fetch("/api/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ package: tierId }),
      });
      if (res.ok) {
        currentPkg = tierId;
        const container = document.getElementById("panel-plans");
        render(container);
        window.ozy?.toast?.(`Plan activated: ${packages[tierId]?.label}`, "success");
      }
    } catch (e) {
      window.ozy?.toast?.("Failed to save plan setting", "error");
    }
  }

  return { load };
})();


/* ── CSS (injected once) ──────────────────────────────────────────────────── */
(function injectStyles() {
  if (document.getElementById("plans-styles")) return;
  const style = document.createElement("style");
  style.id = "plans-styles";
  style.textContent = `
    .plans-header {
      text-align: center;
      padding: 32px 0 16px;
    }
    .plans-header h2 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 6px;
    }
    .plans-subtitle {
      color: var(--text-muted, #888);
      font-size: 0.95rem;
    }
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      padding: 16px 0 40px;
    }
    .plan-card {
      background: var(--card-bg, #1a1a1a);
      border: 1px solid var(--border, #2a2a2a);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: transform .15s, box-shadow .15s;
    }
    .plan-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 30px rgba(0,0,0,.4);
    }
    .plan-card.plan-active {
      border-color: var(--tier-color);
      box-shadow: 0 0 0 2px var(--tier-color, #4f8ef7)33;
    }
    .plan-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .plan-icon { font-size: 2rem; }
    .plan-name {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0 0 2px;
    }
    .plan-tagline {
      font-size: 0.82rem;
      color: var(--text-muted, #888);
      margin: 0;
    }
    .plan-badge {
      margin-left: auto;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
    }
    .plan-includes {
      font-size: 0.82rem;
      color: var(--text-muted, #888);
      padding: 8px 10px;
      background: var(--bg-subtle, #111);
      border-radius: 8px;
    }
    .plan-skills {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .plan-skill {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.85rem;
    }
    .plan-skill-icon { font-size: 1.1rem; min-width: 24px; }
    .plan-skill strong { display: block; font-weight: 600; }
    .plan-skill small { color: var(--text-muted, #888); }
    .plan-btn {
      margin-top: auto;
      width: 100%;
      padding: 10px 0;
      border: none;
      border-radius: 10px;
      background: var(--tier-color, #4f8ef7);
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
    }
    .plan-btn:hover:not(:disabled) { opacity: 0.85; }
    .plan-btn.plan-btn-active,
    .plan-btn:disabled {
      background: var(--bg-subtle, #2a2a2a);
      color: var(--text-muted, #888);
      cursor: default;
    }
  `;
  document.head.appendChild(style);
})();
