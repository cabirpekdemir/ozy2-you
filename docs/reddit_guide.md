# 🤖 OZY2 Reddit Launch Guide

## Hedef Subredditler

### Tier 1 — En Yüksek Etki (ilk gün bunlara post at)
| Subreddit | Üye | Neden |
|-----------|-----|-------|
| r/selfhosted | 310K | Local-first AI → tam hedef kitle |
| r/MachineLearning | 2.8M | AI assistant açık kaynak → ilgi görür |
| r/productivity | 1.2M | Günlük asistan, diary, takvim |
| r/LocalLLaMA | 150K | Ollama desteği + yerel çalışma |
| r/opensource | 750K | MIT benzeri lisans, açık kaynak |

### Tier 2 — Niş ama Kaliteli
| Subreddit | Üye | Neden |
|-----------|-----|-------|
| r/MacApps | 400K | macOS DMG paketi |
| r/linuxapps | 50K | Linux .tar.gz desteği |
| r/ChatGPT | 5.5M | AI assistant alternatifi |
| r/Notion | 200K | Notion entegrasyonu var |
| r/homeautomation | 700K | Smart Home panel |

---

## Post Şablonları

### Şablon 1 — r/selfhosted (En önemli)

**Başlık:**
```
I built a local-first AI personal assistant that runs entirely on your machine — OZY2 [Open Source]
```

**İçerik:**
```markdown
Hey r/selfhosted!

After months of building, I'm sharing **OZY2** — a personal AI assistant designed for people who want 
the power of ChatGPT but without sending their data to the cloud.

**What makes it different:**
- 🏠 **Truly local-first** — all data stays on YOUR device (SQLite, no cloud sync)
- 🔌 **Multi-LLM** — works with Gemini, OpenAI, Anthropic, or Ollama (fully offline)
- 🧠 **Persistent memory** — remembers facts about you across conversations
- 📅 Connects to your Google Calendar, Gmail, Drive, GitHub, Notion, Telegram
- 📷 Voice-first mode for accessibility (WCAG 2.1 AAA)
- 🥗 Tracks nutrition, baby milestones, diary entries — all local

**No subscription. No telemetry. One download.**

Download: github.com/cabirpekdemir/ozy2-you
Try the demo: demo.ozy2.com

Happy to answer any questions! Built this as an alternative to cloud AI assistants for people who care about privacy.
```

---

### Şablon 2 — r/LocalLLaMA

**Başlık:**
```
OZY2 — Open source personal assistant with Ollama support (+ Gemini/OpenAI/Anthropic)
```

**İçerik:**
```markdown
Built a personal assistant that works with Ollama out of the box.

**Stack:**
- Backend: Python + FastAPI + SQLite
- Frontend: Vanilla JS (no React/Vue bloat)
- LLM: Gemini / OpenAI / Anthropic / **Ollama** (your choice, switchable in settings)
- TTS: Microsoft Edge Neural (free, 400+ voices)

**Why Ollama support matters:**
Switch to any local model in settings — llama3, mistral, phi3, etc. 
No API key needed. Full offline mode.

The whole thing runs as a tray app — no terminal, no Docker, just download and run.

GitHub: [github.com/cabirpekdemir/ozy2-you]
```

---

### Şablon 3 — r/productivity

**Başlık:**
```
I replaced 6 apps with one local AI assistant — here's what I built [OZY2]
```

**İçerik:**
```markdown
I got tired of context-switching between:
- ChatGPT (AI chat)
- Notion (notes/tasks)
- Google Calendar (scheduling)
- Cronometer (nutrition)
- A baby tracker app
- A diary app

So I built **OZY2** — one desktop app that does all of this with an AI assistant at the center.

**Key panels:**
✅ AI Chat with memory (remembers your preferences, health info, etc.)
✅ Tasks + Reminders with natural language input  
✅ Daily Diary with photo support
✅ Nutrition tracker (meals + water)
✅ Baby Tracker (feeds, sleep, diapers, vaccines)
✅ Google Calendar/Gmail/Drive integration
✅ Voice mode for hands-free use

**And it's all local** — no subscription, no cloud, your data stays on your computer.

Free download: github.com/cabirpekdemir/ozy2-you
```

---

## Reddit Kuralları Checklist

Gönderi öncesi her zaman kontrol et:

- [ ] Subreddit kurallarını oku (özellikle "no self-promotion" kuralları)
- [ ] Hesabın en az 30 günlük ve karma > 100 olsun
- [ ] İlk birkaç yoruma hızlı cevap ver (ilk 1 saat kritik)
- [ ] Başlığa "[Open Source]" veya "[OC]" tag ekle (self-promotion izni için)
- [ ] Flair kullan (her subredit farklı flair ister)
- [ ] Aynı içeriği aynı anda 2+ subreddite atma (spam sayılır, 24+ saat ara ver)
- [ ] Yorumlarda "upvote için teşekkürler" veya "bu harika değil mi?" yazma

## Zamanlama

**En iyi günler:** Salı–Perşembe  
**En iyi saatler:** 09:00–12:00 EST (ABD iş saatleri başlangıcı)  
**Türkiye saati:** 16:00–19:00 (TSİ)

## Cevap Vereceğin Muhtemel Sorular

| Soru | Hazır Cevap |
|------|-------------|
| "What's the license?" | Elastic License 2.0 — free for personal use, paid for commercial |
| "Docker support?" | Not yet, but it's on the roadmap |
| "Mobile app?" | Web UI works on mobile browser; native app planned |
| "How is it different from Open WebUI?" | OZY2 is a full personal assistant (calendar, diary, nutrition etc.), not just a chat UI |
| "Privacy?" | 100% local. No analytics, no telemetry, no cloud sync. Check PRIVACY.md |
