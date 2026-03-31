/* OZY2 — Lesson Planner Panel */

let _lessonResult = null;

function init_lesson(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🎓 Lesson Planner</h2>
      </div>

      <!-- Generator form -->
      <div class="card" style="padding:20px;margin-bottom:20px">
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:end;flex-wrap:wrap"
          class="lesson-form-grid">
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Topic *</label>
            <input id="lesson-topic" class="input" placeholder="e.g. Photosynthesis, Binary Search, World War II"
              onkeydown="if(event.key==='Enter') lessonGenerate()">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Level</label>
            <select id="lesson-level" class="input">
              <option value="Beginner">Beginner</option>
              <option value="Intermediate" selected>Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Type</label>
            <select id="lesson-type" class="input">
              <option value="Lesson Notes">📝 Lesson Notes</option>
              <option value="Quiz">❓ Quiz</option>
              <option value="Flashcards">🃏 Flashcards</option>
            </select>
          </div>
        </div>
        <div style="margin-top:14px;display:flex;justify-content:flex-end">
          <button id="lesson-generate-btn" class="btn btn-primary" onclick="lessonGenerate()">Generate</button>
        </div>
      </div>

      <!-- Result area -->
      <div id="lesson-result"></div>
    </div>

    <style>
      @media (max-width: 600px) {
        .lesson-form-grid { grid-template-columns: 1fr !important; }
      }
    </style>`;
}

async function lessonGenerate() {
  const topic = document.getElementById('lesson-topic')?.value.trim();
  const level = document.getElementById('lesson-level')?.value;
  const type  = document.getElementById('lesson-type')?.value;

  if (!topic) { toast('Please enter a topic', 'error'); return; }

  const btn = document.getElementById('lesson-generate-btn');
  const el  = document.getElementById('lesson-result');
  if (!el) return;

  if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
  el.innerHTML = `
    <div style="text-align:center;padding:48px 20px;color:var(--text-3)">
      <div class="spinner" style="margin:0 auto 16px"></div>
      <div>Generating ${type} for <strong style="color:var(--text-2)">${topic}</strong>…</div>
    </div>`;

  try {
    const r = await fetch('/api/lesson/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level, type }),
    });
    const d = await r.json();
    if (d.ok && d.content) {
      _lessonResult = { topic, level, type, content: d.content };
      lessonRenderResult(_lessonResult);
    } else {
      el.innerHTML = `<div style="color:var(--text-3);padding:20px">${d.error || 'Generation failed.'}</div>`;
    }
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to generate content.</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Generate'; }
  }
}

function lessonRenderResult({ topic, level, type, content }) {
  const el = document.getElementById('lesson-result');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="padding:24px">
      <!-- Meta bar -->
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <span style="font-weight:600;font-size:15px">${lessonTypeIcon(type)} ${type}: ${topic}</span>
        <span style="font-size:12px;background:var(--card-bg);border:1px solid var(--card-border);
          padding:2px 10px;border-radius:20px;color:var(--text-2)">${level}</span>
        <div style="margin-left:auto;display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="lessonCopy()">Copy</button>
          <button class="btn btn-ghost btn-sm" onclick="lessonDownload()">Download .txt</button>
        </div>
      </div>
      <!-- Content -->
      <div id="lesson-content" style="line-height:1.7;font-size:14px;color:var(--text-1)">
        ${lessonRenderMarkdown(content)}
      </div>
    </div>`;
}

function lessonTypeIcon(type) {
  return { 'Lesson Notes': '📝', 'Quiz': '❓', 'Flashcards': '🃏' }[type] || '📝';
}

function lessonRenderMarkdown(text) {
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings: ## Heading
  html = html.replace(/^### (.+)$/gm,
    '<h4 style="font-size:14px;font-weight:700;margin:18px 0 6px;color:var(--text-1)">$1</h4>');
  html = html.replace(/^## (.+)$/gm,
    '<h3 style="font-size:16px;font-weight:700;margin:20px 0 8px;color:var(--text-1)">$1</h3>');
  html = html.replace(/^# (.+)$/gm,
    '<h2 style="font-size:18px;font-weight:700;margin:20px 0 8px;color:var(--text-1)">$1</h2>');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g,
    '<strong style="font-weight:600;color:var(--text-1)">$1</strong>');

  // Italic: *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Bullet points: lines starting with - or *
  html = html.replace(/^[\-\*] (.+)$/gm,
    '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent);flex-shrink:0">•</span><span>$1</span></div>');

  // Numbered list: 1. item
  html = html.replace(/^(\d+)\. (.+)$/gm,
    '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:var(--accent);flex-shrink:0;min-width:20px">$1.</span><span>$2</span></div>');

  // Horizontal rule: ---
  html = html.replace(/^---$/gm,
    '<hr style="border:none;border-top:1px solid var(--card-border);margin:16px 0">');

  // Line breaks: double newline → paragraph break
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function lessonCopy() {
  if (!_lessonResult) return;
  navigator.clipboard.writeText(_lessonResult.content)
    .then(() => toast('Copied to clipboard', 'success'))
    .catch(() => toast('Failed to copy', 'error'));
}

function lessonDownload() {
  if (!_lessonResult) return;
  const { topic, level, type, content } = _lessonResult;
  const filename = `${type.replace(/\s+/g,'-')}_${topic.replace(/\s+/g,'-')}_${level}.txt`;
  const blob = new Blob([`${type}: ${topic} (${level})\n${'='.repeat(50)}\n\n${content}`],
    { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast('Downloaded', 'success');
}
