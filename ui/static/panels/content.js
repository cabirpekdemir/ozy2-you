/* OZY2 — Content Studio Panel */

const CONTENT_TEMPLATES = [
  { name:'LinkedIn Post',  icon:'💼', prompt:'Write a LinkedIn post about: ' },
  { name:'Tweet Thread',   icon:'🐦', prompt:'Write a Twitter/X thread about: ' },
  { name:'Blog Article',   icon:'📝', prompt:'Write a blog article about: ' },
  { name:'YouTube Script', icon:'▶️', prompt:'Write a YouTube video script about: ' },
  { name:'Email Newsletter', icon:'📧', prompt:'Write an email newsletter about: ' },
  { name:'Instagram Caption', icon:'📸', prompt:'Write Instagram captions for: ' },
];

function init_content(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">

      <div style="margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">Content Studio</h2>
        <div style="color:var(--text-3);font-size:13px">AI-powered content creation for every platform</div>
      </div>

      <!-- Templates -->
      <div style="font-size:12px;font-weight:700;color:var(--text-3);
        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Templates</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:24px">
        ${CONTENT_TEMPLATES.map(t => `
          <div class="card" style="padding:16px;cursor:pointer;transition:all 0.2s"
            onclick="startContent('${encodeURIComponent(t.prompt)}','${t.name}')"
            onmouseenter="this.style.borderColor='var(--accent)'"
            onmouseleave="this.style.borderColor='var(--card-border)'">
            <div style="font-size:28px;margin-bottom:8px">${t.icon}</div>
            <div style="font-size:13px;font-weight:500">${t.name}</div>
          </div>
        `).join('')}
      </div>

      <!-- Custom prompt -->
      <div style="font-size:12px;font-weight:700;color:var(--text-3);
        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Custom Content</div>
      <div class="card" style="padding:16px">
        <textarea id="content-prompt" class="input" rows="3"
          placeholder="Describe what you want to create..."
          style="width:100%;resize:none;margin-bottom:10px;font-family:inherit"></textarea>
        <button class="btn btn-primary" onclick="generateContent()">Generate with OZY</button>
      </div>

      <!-- Output -->
      <div id="content-output" style="display:none;margin-top:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-weight:600" id="content-type-label"></span>
          <button class="btn btn-ghost btn-sm" onclick="copyContent()">Copy</button>
        </div>
        <div class="card" id="content-result" style="padding:20px;font-size:14px;
          line-height:1.7;white-space:pre-wrap"></div>
      </div>

    </div>
  `;
}

function startContent(encodedPrompt, name) {
  const prompt = decodeURIComponent(encodedPrompt);
  const topic  = window.prompt(`${name} — Enter your topic:`);
  if (!topic) return;
  document.getElementById('content-prompt').value = prompt + topic;
  generateContent(name);
}

async function generateContent(type = 'Content') {
  const prompt = document.getElementById('content-prompt')?.value.trim();
  if (!prompt) { toast('Enter a prompt first', 'error'); return; }

  const output = document.getElementById('content-output');
  const result = document.getElementById('content-result');
  const label  = document.getElementById('content-type-label');

  output.style.display = '';
  label.textContent    = type;
  result.textContent   = '';
  result.innerHTML     = `<div class="spinner" style="margin:20px auto"></div>`;

  try {
    const r       = await fetch(`/api/chat/stream?message=${encodeURIComponent(prompt)}`);
    const reader  = r.body.getReader();
    const decoder = new TextDecoder();
    let   full    = '';
    result.textContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') break;
        try {
          const obj = JSON.parse(data);
          if (obj.chunk) { full += obj.chunk; result.textContent = full; }
        } catch {}
      }
    }
  } catch (e) {
    result.textContent = 'Error: ' + e.message;
  }
}

function copyContent() {
  const text = document.getElementById('content-result')?.textContent;
  if (text) { navigator.clipboard.writeText(text); toast('Copied to clipboard', 'success'); }
}
