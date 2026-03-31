/* OZY2 — Meeting Summarizer Panel */

async function init_meeting(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🎙️ Meeting Summarizer</h2>
      </div>
      <div id="meeting-body">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card" style="padding:20px">
            <div style="font-size:13px;color:var(--text-3);margin-bottom:8px">Paste meeting transcript</div>
            <textarea id="meeting-transcript" class="input"
              placeholder="Paste your meeting transcript here…"
              style="width:100%;min-height:200px;resize:vertical;font-family:inherit;font-size:13px;line-height:1.6"></textarea>
            <div style="display:flex;justify-content:flex-end;margin-top:12px">
              <button class="btn btn-primary" onclick="meetingSummarize()">✨ Summarize</button>
            </div>
          </div>
          <div id="meeting-output" style="display:none"></div>
        </div>
      </div>
    </div>`;
}

async function meetingSummarize() {
  const textarea = document.getElementById('meeting-transcript');
  const transcript = textarea?.value.trim();
  if (!transcript) { toast('Paste a transcript first', 'error'); return; }

  const outputEl = document.getElementById('meeting-output');
  if (!outputEl) return;
  outputEl.style.display = 'block';
  outputEl.innerHTML = `
    <div class="card" style="padding:24px;display:flex;align-items:center;gap:12px">
      <div class="spinner"></div>
      <div style="color:var(--text-2);font-size:14px">Summarizing meeting…</div>
    </div>`;

  const btn = document.querySelector('#meeting-body .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Summarizing…'; }

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        message: `Please summarize this meeting transcript and extract: 1) Brief summary 2) Key decisions 3) Action items with owners:\n\n${transcript}`
      })
    });
    const d = await r.json();
    const result = d.response || d.content || d.message || d.text || '';
    if (!result) throw new Error('Empty response');
    meetingRenderResult(result, transcript);
  } catch (e) {
    outputEl.innerHTML = `<div class="card" style="padding:20px;color:var(--text-3)">Failed to summarize. ${e.message || ''}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✨ Summarize'; }
  }
}

function meetingRenderResult(text, transcript) {
  const outputEl = document.getElementById('meeting-output');
  if (!outputEl) return;
  const formatted = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/^#{1,3} (.+)$/gm,'<div style="font-size:15px;font-weight:600;margin:16px 0 6px;color:var(--text-1)">$1</div>')
    .replace(/^[-•] (.+)$/gm,'<div style="padding:3px 0 3px 16px;color:var(--text-2);position:relative"><span style="position:absolute;left:0;color:var(--accent)">•</span>$1</div>')
    .replace(/\n\n/g,'<br><br>')
    .replace(/\n/g,'<br>');

  outputEl.innerHTML = `
    <div class="card" style="padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:15px;font-weight:600">Meeting Summary</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="meetingCopy()" id="meeting-copy-btn">Copy</button>
          <button class="btn btn-ghost btn-sm" onclick="meetingDownload()">Download .txt</button>
        </div>
      </div>
      <div id="meeting-result-text" style="font-size:14px;line-height:1.7;color:var(--text-2)">${formatted}</div>
    </div>`;
  outputEl.scrollIntoView({behavior:'smooth', block:'start'});
  outputEl._rawText = text;
}

function meetingCopy() {
  const outputEl = document.getElementById('meeting-output');
  const text = outputEl?._rawText || document.getElementById('meeting-result-text')?.innerText || '';
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('meeting-copy-btn');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 1500); }
  }).catch(() => toast('Failed to copy', 'error'));
}

function meetingDownload() {
  const outputEl = document.getElementById('meeting-output');
  const text = outputEl?._rawText || document.getElementById('meeting-result-text')?.innerText || '';
  const blob = new Blob([text], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meeting-summary-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
