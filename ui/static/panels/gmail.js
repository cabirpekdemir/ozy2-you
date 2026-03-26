/* OZY2 — Gmail Panel */

function init_gmail(el) {
  el.innerHTML = `
    <div style="display:flex;height:100%;overflow:hidden">

      <!-- Message List -->
      <div id="gmail-list-pane" style="width:340px;flex-shrink:0;border-right:1px solid var(--card-border);
        overflow-y:auto;display:flex;flex-direction:column">

        <div style="padding:16px;border-bottom:1px solid var(--card-border);
          display:flex;gap:8px;align-items:center">
          <input id="gmail-search" class="input" placeholder="Search emails..." style="flex:1;font-size:13px"
            onkeydown="if(event.key==='Enter') gmailSearch()">
          <button class="btn btn-ghost btn-icon" onclick="gmailSearch()">🔍</button>
          <button class="btn btn-primary btn-sm" onclick="openCompose()">✏️</button>
        </div>

        <div id="gmail-messages" style="flex:1">
          <div class="spinner" style="margin:40px auto"></div>
        </div>
      </div>

      <!-- Detail Pane -->
      <div id="gmail-detail" style="flex:1;overflow-y:auto;padding:24px">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
          height:100%;gap:12px;color:var(--text-3)">
          <div style="font-size:40px">📧</div>
          <div>Select an email to read</div>
        </div>
      </div>

    </div>

    <!-- Compose Modal -->
    <div id="compose-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:200;align-items:center;justify-content:center">
      <div class="card" style="width:min(540px,90vw);padding:24px">
        <div style="font-size:18px;font-weight:600;margin-bottom:16px">New Email</div>
        <input id="compose-to"      class="input" placeholder="To"      style="width:100%;margin-bottom:8px">
        <input id="compose-subject" class="input" placeholder="Subject" style="width:100%;margin-bottom:8px">
        <textarea id="compose-body" class="input" placeholder="Message..." rows="8"
          style="width:100%;resize:none;font-family:inherit;margin-bottom:16px"></textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost" onclick="closeCompose()">Cancel</button>
          <button class="btn btn-primary" onclick="sendEmail()">Send</button>
        </div>
      </div>
    </div>
  `;

  loadGmailMessages();
}

async function loadGmailMessages(q = '') {
  const el = document.getElementById('gmail-messages');
  if (!el) return;
  try {
    const url = q ? `/api/gmail/messages?q=${encodeURIComponent(q)}` : '/api/gmail/messages';
    const r   = await fetch(url);
    const d   = await r.json();
    if (d.ok && d.messages.length) {
      el.innerHTML = d.messages.map(m => `
        <div class="gmail-row" onclick="loadEmailDetail('${m.id}')"
          style="padding:12px 16px;cursor:pointer;border-bottom:1px solid var(--card-border);
            transition:background 0.15s;${m.unread ? 'background:rgba(99,102,241,0.05)' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;font-weight:${m.unread ? '700' : '500'};
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">
              ${_senderName(m.from)}</span>
            <span style="font-size:11px;color:var(--text-3);flex-shrink:0;margin-left:8px">
              ${_formatDate(m.date)}</span>
          </div>
          <div style="font-size:13px;font-weight:${m.unread ? '600' : '400'};
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.subject}</div>
          <div style="font-size:12px;color:var(--text-3);white-space:nowrap;
            overflow:hidden;text-overflow:ellipsis;margin-top:2px">${m.snippet}</div>
        </div>
      `).join('');
    } else {
      el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-3)">
        <div style="font-size:32px;margin-bottom:8px">📭</div>No emails</div>`;
    }
  } catch (e) {
    el.innerHTML = `<div style="padding:20px;color:var(--text-3)">Failed to load: ${e.message}</div>`;
  }
}

async function loadEmailDetail(id) {
  const el = document.getElementById('gmail-detail');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:80px auto"></div>`;
  try {
    const r = await fetch(`/api/gmail/messages/${id}`);
    const d = await r.json();
    if (!d.ok) throw new Error(d.error);
    const m = d.message;
    const isHtml = m.body_mime === 'text/html';
    el.innerHTML = `
      <div style="max-width:700px">
        <div style="margin-bottom:20px">
          <h2 style="font-size:20px;font-weight:600;margin-bottom:8px">${_esc(m.subject)}</h2>
          <div style="font-size:13px;color:var(--text-3)">
            <span><b>From:</b> ${_esc(m.from)}</span><br>
            <span><b>To:</b> ${_esc(m.to)}</span><br>
            <span><b>Date:</b> ${_esc(m.date)}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-ghost btn-sm" onclick="replyEmail('${encodeURIComponent(m.from)}','${encodeURIComponent('Re: ' + m.subject)}')">↩ Reply</button>
            <button class="btn btn-ghost btn-sm" onclick="trashEmail('${m.id}')">🗑 Delete</button>
          </div>
        </div>
        <div style="border-top:1px solid var(--card-border);padding-top:20px">
          ${isHtml
            ? `<iframe id="email-frame" sandbox="allow-same-origin allow-popups"
                style="width:100%;min-height:500px;border:none;border-radius:8px;
                       background:white;display:block"></iframe>`
            : `<div style="font-size:14px;line-height:1.7;white-space:pre-wrap;
                color:var(--text-2)">${_esc(m.body || '(no body)')}</div>`
          }
        </div>
      </div>
    `;

    // Inject HTML into iframe so external styles/images render properly
    if (isHtml) {
      const frame = el.querySelector('#email-frame');
      if (frame) {
        const doc = frame.contentDocument || frame.contentWindow.document;
        doc.open();
        doc.write(`<!DOCTYPE html><html><head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <style>
            body { margin:12px 16px; font-family:-apple-system,sans-serif;
                   font-size:14px; line-height:1.6; color:#1a1a1a; }
            img  { max-width:100%; height:auto; }
            a    { color:#6366f1; }
          </style>
        </head><body>${m.body}</body></html>`);
        doc.close();
        // Auto-resize iframe to content height
        frame.onload = () => {
          frame.style.height = (frame.contentDocument.body.scrollHeight + 32) + 'px';
        };
      }
    }
    // Mark as read
    fetch(`/api/gmail/messages/${id}/read`, {method:'POST'});
  } catch (e) {
    el.innerHTML = `<div style="color:var(--text-3);padding:40px">Error: ${e.message}</div>`;
  }
}

function gmailSearch() {
  const q = document.getElementById('gmail-search')?.value.trim();
  loadGmailMessages(q);
}

function openCompose() {
  const m = document.getElementById('compose-modal');
  if (m) { m.style.display = 'flex'; document.getElementById('compose-to').focus(); }
}

function closeCompose() {
  const m = document.getElementById('compose-modal');
  if (m) m.style.display = 'none';
}

function replyEmail(to, subject) {
  document.getElementById('compose-to').value      = decodeURIComponent(to);
  document.getElementById('compose-subject').value = decodeURIComponent(subject);
  openCompose();
}

async function sendEmail() {
  const to      = document.getElementById('compose-to')?.value.trim();
  const subject = document.getElementById('compose-subject')?.value.trim();
  const body    = document.getElementById('compose-body')?.value.trim();
  if (!to || !subject || !body) { toast('Fill all fields', 'error'); return; }
  const r = await fetch('/api/gmail/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({to, subject, body})
  });
  const d = await r.json();
  if (d.ok) { closeCompose(); toast('Email sent', 'success'); }
  else toast('Send failed: ' + (d.error || ''), 'error');
}

async function trashEmail(id) {
  await fetch(`/api/gmail/messages/${id}`, {method:'DELETE'});
  document.getElementById('gmail-detail').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100%;gap:12px;color:var(--text-3)">
      <div style="font-size:40px">🗑</div><div>Moved to trash</div>
    </div>`;
  loadGmailMessages();
  toast('Moved to trash', 'success');
}

function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _senderName(from) {
  const m = from.match(/^(.+?)\s*</);
  return m ? m[1].replace(/"/g,'') : from.split('@')[0];
}

function _formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d   = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString([], {month:'short',day:'numeric'});
  } catch { return ''; }
}
