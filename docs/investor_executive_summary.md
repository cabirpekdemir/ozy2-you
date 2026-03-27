# OZY2 — Executive Summary
**Confidential · Pre-Seed Round · $250,000**

---

## Overview

OZY2 is an open-source, local-first AI assistant that runs entirely on the user's computer and connects to 38+ real-world tools and services. Unlike cloud-based AI assistants, OZY2 stores no user data, requires no account, and works with any AI provider — Gemini, GPT-4o, Claude, or fully offline via Ollama.

The product is live, installable, and free. We are raising $250,000 to fund the team, complete the premium tiers, and execute a public launch.

---

## Problem

The AI assistant market has a fundamental tension: the most capable tools (ChatGPT, Claude, Gemini) require users to hand over their data, conversations, and API keys to third-party servers. Meanwhile, privacy-first alternatives (Jan.ai, LM Studio, GPT4All) are powerful for chat but have no integrations — they can't read your email, manage your calendar, or talk to your Slack.

The result: professionals who want AI to actually *automate* their work are forced to choose between capability and privacy. No one has solved both.

Beyond privacy, there's a deeper gap. AI assistants today are sophisticated autocomplete tools — they respond, but they don't *do*. OZY2 is built around the premise that the value of AI is not in conversation, but in action.

---

## Solution

OZY2 bridges the gap between powerful AI and real-world tool use — without sacrificing privacy.

**How it works:**
1. User installs OZY2 with a double-click (Mac/Windows/Linux native installer)
2. User adds their AI API key (or points to local Ollama)
3. OZY2 starts a local server on `localhost:8082` and opens a browser UI
4. The AI can now read emails, manage tasks, check the calendar, search GitHub, control smart home devices, track books, suggest outfits based on weather, and 30+ more actions — all from a single natural-language interface

**Key differentiators:**
- **100% local** — conversations and data never leave the machine
- **Provider-agnostic** — switch between Gemini, GPT-4o, Claude, or Ollama in one click
- **Real integrations** — Gmail, Calendar, Drive, GitHub, Notion, Trello, Slack, Spotify, YouTube, Home Assistant, and more
- **Open source** — MIT licensed, fully auditable, community-driven
- **Zero friction install** — no terminal, no Docker, no Python environment needed

---

## Market

The global AI assistant market was valued at $8.4B in 2025 and is projected to reach $50B by 2030 (23% CAGR). Within this, three overlapping segments are especially relevant to OZY2:

**1. Privacy-first software** ($25B+, growing 18% YoY)
Post-GDPR, post-Cambridge Analytica, and increasingly post-AI-scraping, a significant and growing segment of professionals actively choose local or auditable tools. This segment over-indexes on willingness to pay and word-of-mouth referrals.

**2. Developer & power-user tools**
45M+ active developers globally. This audience finds, adopts, and evangelizes open-source tools organically. OZY2's GitHub presence and MIT license are native growth vectors here.

**3. SMB & enterprise AI productivity**
The Business tier targets small teams and companies that want AI automation across Slack, Jira, Teams, and CRM — without routing sensitive business data through a third-party AI service. This is a legally and reputationally motivated segment, especially in Europe (GDPR) and regulated industries.

**OZY2's addressable market is at the intersection of all three.**

---

## Business Model

OZY2 uses an open-core model: the core product is free and open source, driving adoption and community trust. Premium tiers unlock integrations that professional and business users need.

| Tier | Price | Integrations |
|---|---|---|
| YOU (Free) | $0 | Weather, Search, News, Notes, Calendar, Book Tracker, Smart Home, Outfit/Recipe AI |
| Pro | $3.99/mo | Gmail, Drive, GitHub, Notion, Obsidian, Trello, Stocks, Daily Briefing |
| Social | $5.99/mo | Discord, Spotify, YouTube, WhatsApp, Telegram, Debate Mode |
| Business | $12.99/mo | Slack, Teams, Jira, Linear, Asana, HubSpot, Salesforce, Analytics, Meeting Summary |

**Unit Economics:**
- Average revenue per paying user (blended): ~$5.50/mo
- Assumed churn: 5%/mo (conservative for utility software)
- CAC target: <$15 (open source / community-led growth)
- LTV at 5% churn: ~$110 per user

**Revenue Projections:**

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Registered Users | 5,000 | 50,000 | 200,000 |
| Paying Users | 500 (10%) | 8,000 (16%) | 40,000 (20%) |
| Blended ARPU | $5.50/mo | $5.80/mo | $6.20/mo |
| MRR | $2,750 | $46,400 | $248,000 |
| ARR | **~$33K** | **~$557K** | **~$2.97M** |

Conversion from free to paid is driven by integration depth — users who connect Gmail or GitHub see immediate, repeatable value and convert at higher rates.

---

## Go-to-Market

OZY2's distribution strategy is community-led, designed for zero paid CAC in Year 1:

**Phase 1 — Launch (Month 1-3):**
- ProductHunt launch (targeting Top 5 of the day)
- Hacker News "Show HN" post
- Reddit: r/selfhosted, r/LocalLLaMA, r/MacApps, r/privacy
- GitHub trending (open source visibility)

**Phase 2 — Community (Month 3-9):**
- YouTube tutorial series (local AI, privacy tools niche)
- Twitter/X developer community
- Discord server + integration partners
- Power user → advocate flywheel

**Phase 3 — B2B (Month 9-18):**
- Business tier outreach (SMBs, agencies, regulated industries)
- Integration partnerships (Notion, Trello, Home Assistant ecosystems)
- Reseller / white-label conversations

---

## Competitive Landscape

OZY2's positioning is unique: no competitor combines local execution, deep integrations, and provider-agnosticism at this level.

| Competitor | Local | Integrations | Any LLM | Open Source | Business Tier |
|---|---|---|---|---|---|
| **OZY2** | ✅ | **38+** | ✅ | ✅ | ✅ |
| ChatGPT Plus | ❌ | ~5 plugins | ❌ | ❌ | ❌ |
| Claude | ❌ | Limited | ❌ | ❌ | ❌ |
| Jan.ai | ✅ | ❌ | ✅ | ✅ | ❌ |
| LM Studio | ✅ | ❌ | ✅ | Partial | ❌ |
| Raycast AI | Partial | ~10 | Partial | ❌ | ❌ |

The closest conceptual competitor is Raycast — but it's Mac-only, closed source, and not truly local. OZY2 is cross-platform, open, and provider-agnostic.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| OpenAI/Google builds local version | Platform risk exists; OZY2's moat is open source community + integration depth, not AI model quality |
| Low conversion from free to paid | Integration quality drives conversion; Business tier has higher urgency and lower price sensitivity |
| Pre-launch, no traction yet | Raising to execute launch; product is fully functional and installable today |
| Solo founder | Hiring is a priority use of funds; advisor conversations in progress |

---

## Team

**Cabir Pekdemir** — Founder & CEO
*[2-3 sentences: your background, relevant experience, why you built this]*

**Key hires planned (Year 1):**
- 1× Senior Full-Stack Engineer (FastAPI + JS)
- 1× Full-Stack Engineer (integrations focus)
- 1× Growth Marketer (dev community / open source)

---

## The Ask

**Raising:** $250,000
**Instrument:** SAFE (Simple Agreement for Future Equity) or Convertible Note
**Pre-money valuation cap:** [TBD — discuss]
**Minimum check:** $25,000

### Use of Funds

| Category | Amount | Detail |
|---|---|---|
| Team | $150,000 | 2 engineers + 1 marketer, 18 months |
| Development | $50,000 | Infrastructure, packaging, CI/CD, API costs |
| Marketing | $50,000 | Launch campaigns, community, content |

### Milestones at end of runway (18 months)
- 50,000+ registered users
- 8,000+ paying subscribers
- $45,000+ MRR
- Series A ready

---

## Why Invest Now

1. **Working product** — not a deck, not a prototype. Install it at [ozy2.com](https://ozy2.com) today.
2. **Perfect timing** — AI assistant market is exploding; privacy-first niche is undercapitalized
3. **Open source moat** — community trust is hard to buy and easy to lose; we're building it from day one
4. **Platform, not product** — 38 integrations today, extensible to hundreds. Each integration deepens retention and opens new verticals.
5. **Clear B2B path** — Business tier targets a segment with genuine budget, legal motivation, and low churn

---

**Live demo:** [ozy2.com](https://ozy2.com)
**GitHub:** [github.com/cabirpekdemir/ozy2](https://github.com/cabirpekdemir/ozy2)
**Contact:** [your@email.com] · [your phone]

---
*This document is confidential and intended solely for the recipient. OZY2 · Pre-Seed · 2026*
