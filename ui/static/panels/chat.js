/* OZY2 — Chat Panel */

function init_chat(el) {
  el.innerHTML = `
    <div id="chat-wrap" style="
      display:flex; flex-direction:column; height:100%;
      max-width:780px; margin:0 auto; gap:0;
    ">
      <!-- Messages -->
      <div id="chat-messages" style="
        flex:1; overflow-y:auto; padding:16px;
        display:flex; flex-direction:column; gap:14px;
      ">
        <div id="chat-empty" style="
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; height:100%; gap:12px; padding:40px;
          text-align:center;
        ">
          <div style="
            width:64px; height:64px; border-radius:20px;
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            display:flex; align-items:center; justify-content:center;
            font-size:30px; box-shadow:0 0 30px rgba(99,102,241,0.4);
          ">✦</div>
          <div>
            <div style="font-size:20px;font-weight:700;margin-bottom:6px">
              ${t('chat.empty','Start a conversation')}
            </div>
            <div style="color:var(--text-3);font-size:14px;max-width:320px">
              ${t('chat.empty_sub','Ask anything. OZY can browse, code, email, and more.')}
            </div>
          </div>
        </div>
      </div>

      <!-- Suggestions (shows when empty) -->
      <div id="chat-suggestions" style="padding:0 16px 12px;display:flex;gap:8px;flex-wrap:wrap">
        ${['What can you do?','Summarize my emails','What\'s on my calendar today?','Set a reminder']
          .map(s => `<button class="btn btn-ghost" style="font-size:12px;padding:6px 12px"
            onclick="sendMessage('${s}')">${s}</button>`).join('')}
      </div>

      <!-- Input area -->
      <div style="
        padding:12px 16px 16px;
        border-top:1px solid var(--card-border);
        background:var(--bg-layer1);
        border-radius:0 0 0 0;
      ">
        <div style="
          display:flex; gap:10px; align-items:flex-end;
          background:var(--card-bg); border:1px solid var(--card-border);
          border-radius:var(--r-lg); padding:10px 12px;
          transition:all 0.2s ease;
        " id="chat-input-wrap">
          <textarea
            id="chat-input"
            data-i18n-placeholder="chat.placeholder"
            placeholder="Message OZY..."
            rows="1"
            style="
              flex:1; background:none; border:none; outline:none;
              color:var(--text-1); font-size:15px; font-family:inherit;
              resize:none; line-height:1.5; max-height:160px;
              overflow-y:auto;
            "
          ></textarea>
          <button
            id="chat-send"
            onclick="sendMessage()"
            style="
              width:36px; height:36px; border-radius:12px;
              background:var(--accent); border:none; cursor:pointer;
              display:flex; align-items:center; justify-content:center;
              font-size:16px; flex-shrink:0; align-self:flex-end;
              transition:all 0.2s ease; box-shadow:0 0 16px var(--accent-glow);
            "
          >↑</button>
        </div>
        <div style="text-align:center;margin-top:8px;font-size:11px;color:var(--text-3)">
          OZY2 can make mistakes. Double-check important info.
        </div>
      </div>
    </div>
  `;

  // Auto-resize textarea
  const input = document.getElementById('chat-input');
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  });

  // Send on Enter (Shift+Enter = new line)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Focus input-wrap on focus
  input.addEventListener('focus', () => {
    document.getElementById('chat-input-wrap').style.borderColor = 'var(--accent)';
    document.getElementById('chat-input-wrap').style.boxShadow = '0 0 0 3px var(--accent-dim)';
  });
  input.addEventListener('blur', () => {
    document.getElementById('chat-input-wrap').style.borderColor = 'var(--card-border)';
    document.getElementById('chat-input-wrap').style.boxShadow = 'none';
  });

  // Load history
  loadHistory();
}

// ── Message rendering ──────────────────────────────────────────
function addMessage(role, text, id = null) {
  const messages = document.getElementById('chat-messages');
  const empty    = document.getElementById('chat-empty');
  const sugg     = document.getElementById('chat-suggestions');

  if (empty) empty.remove();
  if (sugg)  sugg.remove();

  const isUser    = role === 'user';
  const msgEl     = document.createElement('div');
  msgEl.id        = id || `msg-${Date.now()}`;
  msgEl.className = 'chat-msg';
  msgEl.style.cssText = `
    display:flex; gap:10px;
    ${isUser ? 'flex-direction:row-reverse' : ''};
    align-items:flex-start;
  `;

  const avatar = document.createElement('div');
  avatar.style.cssText = `
    width:32px; height:32px; border-radius:10px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:14px;
    ${isUser
      ? 'background:var(--accent-dim);color:var(--accent)'
      : 'background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 0 12px var(--accent-glow)'
    }
  `;
  avatar.textContent = isUser ? '👤' : '✦';

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    max-width:72%; padding:12px 16px; border-radius:${isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px'};
    font-size:14px; line-height:1.6; white-space:pre-wrap; word-break:break-word;
    ${isUser
      ? 'background:var(--accent);color:white'
      : 'background:var(--card-bg);border:1px solid var(--card-border);color:var(--text-1)'
    }
  `;
  bubble.textContent = text;

  msgEl.appendChild(avatar);
  msgEl.appendChild(bubble);
  messages.appendChild(msgEl);
  messages.scrollTop = messages.scrollHeight;
  return msgEl;
}

function addThinking() {
  const messages = document.getElementById('chat-messages');
  const el       = document.createElement('div');
  el.id          = 'thinking-bubble';
  el.style.cssText = 'display:flex;gap:10px;align-items:flex-start';
  el.innerHTML = `
    <div style="width:32px;height:32px;border-radius:10px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;font-size:14px;
      background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 0 12px var(--accent-glow)">✦</div>
    <div style="padding:12px 16px;border-radius:4px 18px 18px 18px;
      background:var(--card-bg);border:1px solid var(--card-border);
      display:flex;align-items:center;gap:6px">
      <span style="color:var(--text-3);font-size:13px">${t('chat.thinking','Thinking...')}</span>
      <div class="spinner" style="width:14px;height:14px;border-width:1.5px"></div>
    </div>
  `;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

// ── Send ───────────────────────────────────────────────────────
async function sendMessage(preset = null) {
  const input = document.getElementById('chat-input');
  const text  = (preset || input.value).trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  addMessage('user', text);
  const thinking = addThinking();

  // Stream response
  const messages = document.getElementById('chat-messages');
  let botEl = null;
  let full  = '';

  try {
    const url = `/api/chat/stream?message=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    thinking.remove();
    botEl = addMessage('assistant', '');
    const bubble = botEl.querySelector('div:last-child');

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
          if (obj.chunk) {
            full += obj.chunk;
            bubble.textContent = full;
            messages.scrollTop = messages.scrollHeight;
          }
        } catch {}
      }
    }
  } catch (e) {
    if (thinking.parentNode) thinking.remove();
    toast(t('chat.error', 'Something went wrong'), 'error');
  }
}

// ── Load history ───────────────────────────────────────────────
async function loadHistory() {
  try {
    const r = await fetch('/api/chat/history');
    const d = await r.json();
    if (d.ok && d.history?.length) {
      d.history.forEach(m => addMessage(m.role, m.content));
    }
  } catch {}
}
