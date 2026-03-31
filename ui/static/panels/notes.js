/* OZY2 — Notes Panel */

let _notesData = [];
let _editingNoteId = null;

async function init_notes(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🗒️ Notes</h2>
        <button class="btn btn-primary btn-sm" onclick="notesOpenModal(null)">＋ New Note</button>
      </div>

      <!-- Search -->
      <input id="notes-search" class="input" placeholder="Search notes…"
        oninput="loadNotes(this.value)"
        style="width:100%;margin-bottom:16px">

      <!-- Notes grid -->
      <div id="notes-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
        <div class="spinner" style="margin:40px auto;grid-column:1/-1"></div>
      </div>

      <!-- Modal -->
      <div id="notes-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);
        z-index:1000;align-items:center;justify-content:center">
        <div style="background:var(--bg2);border-radius:16px;padding:28px;width:100%;
          max-width:500px;margin:16px;max-height:90vh;overflow-y:auto">
          <h3 id="notes-modal-title" style="margin:0 0 16px;font-size:17px;font-weight:600">New Note</h3>
          <input id="note-title-input" class="input" placeholder="Title" style="margin-bottom:10px">
          <textarea id="note-content-input" class="input" rows="6" placeholder="Write your note here…"
            style="resize:vertical;font-family:inherit;margin-bottom:10px"></textarea>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:16px;
            color:var(--text-2);font-size:14px">
            <input type="checkbox" id="note-pin-input" style="width:16px;height:16px;accent-color:var(--accent)">
            Pin this note
          </label>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-ghost" onclick="notesCloseModal()">Cancel</button>
            <button class="btn btn-primary" onclick="notesSave()">Save</button>
          </div>
        </div>
      </div>
    </div>`;

  await loadNotes('');
}

async function loadNotes(query) {
  const el = document.getElementById('notes-grid');
  if (!el) return;
  try {
    const url = query ? `/api/notes?q=${encodeURIComponent(query)}` : '/api/notes';
    const r = await fetch(url);
    const d = await r.json();
    _notesData = d.notes || [];
    notesRender();
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px;grid-column:1/-1">Failed to load notes.</div>`;
  }
}

function notesRender() {
  const el = document.getElementById('notes-grid');
  if (!el) return;
  if (!_notesData.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-3);grid-column:1/-1">
      <div style="font-size:44px;margin-bottom:12px">🗒️</div>
      <div>No notes yet. Create your first one!</div>
    </div>`;
    return;
  }
  // Pinned first
  const sorted = [..._notesData].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  el.innerHTML = sorted.map(n => {
    const preview = (n.content || '').slice(0, 100) + ((n.content || '').length > 100 ? '…' : '');
    const date = n.created_at ? new Date(n.created_at).toLocaleDateString() : '';
    return `
    <div class="card" style="padding:16px;display:flex;flex-direction:column;gap:8px;
      position:relative;${n.pinned ? 'border-color:var(--accent)' : ''}">
      ${n.pinned ? `<div style="position:absolute;top:10px;right:10px;font-size:14px">📌</div>` : ''}
      <div style="font-weight:600;font-size:14px;padding-right:${n.pinned ? '24px' : '0'}">${n.title || 'Untitled'}</div>
      ${preview ? `<div style="font-size:13px;color:var(--text-2);line-height:1.5">${preview}</div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:4px">
        <span style="font-size:11px;color:var(--text-3)">${date}</span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="notesOpenModal(${n.id})" title="Edit">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="notesDelete(${n.id})" title="Delete"
            style="color:var(--text-3)">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function notesOpenModal(id) {
  _editingNoteId = id;
  const note = id ? _notesData.find(n => n.id === id) : null;
  document.getElementById('notes-modal-title').textContent = id ? 'Edit Note' : 'New Note';
  document.getElementById('note-title-input').value   = note?.title   || '';
  document.getElementById('note-content-input').value = note?.content || '';
  document.getElementById('note-pin-input').checked   = note?.pinned  || false;
  document.getElementById('notes-modal').style.display = 'flex';
  document.getElementById('note-title-input').focus();
}

function notesCloseModal() {
  document.getElementById('notes-modal').style.display = 'none';
  _editingNoteId = null;
}

async function notesSave() {
  const title   = document.getElementById('note-title-input').value.trim();
  const content = document.getElementById('note-content-input').value.trim();
  const pinned  = document.getElementById('note-pin-input').checked;
  if (!title && !content) { toast('Note cannot be empty', 'error'); return; }
  try {
    if (_editingNoteId) {
      await fetch(`/api/notes/${_editingNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, pinned }),
      });
      toast('Note updated', 'success');
    } else {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, pinned }),
      });
      toast('Note created', 'success');
    }
    notesCloseModal();
    await loadNotes(document.getElementById('notes-search')?.value || '');
  } catch {
    toast('Failed to save note', 'error');
  }
}

async function notesDelete(id) {
  const note = _notesData.find(n => n.id === id);
  if (!confirm(`Delete "${note?.title || 'this note'}"?`)) return;
  try {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    toast('Note deleted', 'info');
    await loadNotes(document.getElementById('notes-search')?.value || '');
  } catch {
    toast('Failed to delete note', 'error');
  }
}
