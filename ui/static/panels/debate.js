/* OZY2 — AI Debate Panel */

const DEBATE_MODELS = [
  { id:'gemini',    name:'Gemini',   color:'#4285F4', icon:'G' },
  { id:'openai',    name:'ChatGPT',  color:'#10b981', icon:'C' },
  { id:'anthropic', name:'Claude',   color:'#8b5cf6', icon:'A' },
];

let _debateHistory = [];

function init_debate(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:900px;margin:0 auto">

      <div style="margin-bottom:20px">
        <h2 style="font-size:20px;font-weight:700;margin:0 0 4px">AI Debate</h2>
        <div style="color:var(--text-3);font-size:13px">Watch multiple AI models discuss a topic simultaneously</div>
      </div>

      <!-- Topic input -->
      <div class="card" style="padding:16px;margin-bottom:16px">
        <div style="display:flex;gap:10px;align-items:flex-end">
          <div style="flex:1">
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:6px">Debate Topic</label>
            <textarea id="debate-topic" class="input" rows="2"
              placeholder="e.g. Is AGI possible within the next 10 years?"
              style="width:100%;resize:none;font-family:inherit"></textarea>
          </div>
          <button class="btn btn-primary" onclick="startDebate()" id="debate-btn"
            style="height:40px;white-space:nowrap">Start Debate</button>
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          ${['Is AGI possible in 10 years?','Does free will exist?','Is remote work better?','Will crypto replace fiat?'].map(t =>
            `<button class="btn btn-ghost" style="font-size:12px;padding:5px 10px"
              onclick="document.getElementById('debate-topic').value='${t}'">${t}</button>`
          ).join('')}
        </div>
      </div>

      <!-- Debate area -->
      <div id="debate-area" style="display:none">

        <!-- Participants -->
        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
          ${DEBATE_MODELS.map(m => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;
              border-radius:var(--r-full);background:var(--card-bg);border:1px solid var(--card-border)">
              <div style="width:28px;height:28px;border-radius:8px;
                background:${m.color};color:white;display:flex;align-items:center;
                justify-content:center;font-size:13px;font-weight:700">${m.icon}</div>
              <span style="font-size:13px;font-weight:500">${m.name}</span>
              <div id="debate-dot-${m.id}" style="width:7px;height:7px;border-radius:50%;background:#6b7280"></div>
            </div>
          `).join('')}
        </div>

        <!-- Messages -->
        <div id="debate-messages" style="display:flex;flex-direction:column;gap:12px"></div>

      </div>

    </div>
  `;
}

async function startDebate() {
  const topic = document.getElementById('debate-topic')?.value.trim();
  if (!topic) { toast('Enter a topic first', 'error'); return; }

  const area = document.getElementById('debate-area');
  const msgs = document.getElementById('debate-messages');
  const btn  = document.getElementById('debate-btn');

  area.style.display = '';
  msgs.innerHTML     = '';
  btn.disabled       = true;
  btn.textContent    = 'Debating...';
  _debateHistory     = [];

  // Add topic card
  msgs.innerHTML = `
    <div class="card" style="padding:14px 16px;border-left:3px solid var(--accent)">
      <div style="font-size:12px;color:var(--text-3);margin-bottom:4px">TOPIC</div>
      <div style="font-size:15px;font-weight:500">${topic}</div>
    </div>
  `;

  // Each model responds in turn (2 rounds)
  for (let round = 0; round < 2; round++) {
    for (const model of DEBATE_MODELS) {
      const dot = document.getElementById(`debate-dot-${model.id}`);
      if (dot) dot.style.background = '#f59e0b';

      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = `padding:16px;border-left:3px solid ${model.color};animation:fadeIn 0.3s ease`;
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:28px;height:28px;border-radius:8px;background:${model.color};
            color:white;display:flex;align-items:center;justify-content:center;
            font-size:13px;font-weight:700">${model.icon}</div>
          <span style="font-weight:600;font-size:13px">${model.name}</span>
          <span style="font-size:11px;color:var(--text-3)">Round ${round+1}</span>
          <div class="spinner" style="width:14px;height:14px;border-width:1.5px;margin-left:auto"></div>
        </div>
        <div id="debate-response-${model.id}-${round}" style="font-size:14px;line-height:1.6;color:var(--text-2)"></div>
      `;
      msgs.appendChild(card);
      msgs.scrollTop = msgs.scrollHeight;

      await _streamDebateResponse(model, topic, round, card);

      if (dot) dot.style.background = '#10b981';
      await _sleep(300);
    }
  }

  btn.disabled    = false;
  btn.textContent = 'Start Debate';
}

async function _streamDebateResponse(model, topic, round, card) {
  const responseEl = card.querySelector(`[id^="debate-response-${model.id}-"]`);
  const spinner    = card.querySelector('.spinner');

  const systemPrompt = round === 0
    ? `You are ${model.name}. Give your opening position on the topic. Be direct and opinionated. Max 120 words.`
    : `You are ${model.name}. You've heard other perspectives. Give your response/rebuttal. Max 100 words.`;

  const messages = [
    ...(_debateHistory.length ? [{role:'user', content:`Context so far:\n${_debateHistory.join('\n\n')}\n\nNow give your response.`}] : []),
    {role:'user', content: `Topic: "${topic}"\n\n${systemPrompt}`}
  ];

  try {
    const r   = await fetch(`/api/chat/stream?message=${encodeURIComponent(
      `[DEBATE] Topic: "${topic}" | Round ${round+1} | You are ${model.name}. ${systemPrompt}`
    )}`);
    const reader  = r.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    if (spinner) spinner.remove();

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
          if (obj.chunk) { full += obj.chunk; if (responseEl) responseEl.textContent = full; }
        } catch {}
      }
    }
    _debateHistory.push(`**${model.name}:** ${full}`);
  } catch (e) {
    if (spinner) spinner.remove();
    if (responseEl) responseEl.textContent = `Error: ${e.message}`;
  }
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
