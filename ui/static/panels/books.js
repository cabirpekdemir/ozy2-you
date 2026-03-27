/* OZY2 — Book Tracker Panel */

let _booksData = [];
let _booksStats = {};
let _booksFilter = 'reading';
let _activeBook = null;

async function init_books(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>📖 Book Tracker</h2>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="booksShowAdd()">+ Add Book</button>
        </div>
      </div>

      <!-- Stats bar -->
      <div id="books-stats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px"></div>

      <!-- Filter tabs -->
      <div class="tab-row" style="margin-bottom:16px">
        <button class="tab-btn active" onclick="booksSetFilter('reading',this)">📚 Reading</button>
        <button class="tab-btn" onclick="booksSetFilter('want_to_read',this)">🔖 Want to Read</button>
        <button class="tab-btn" onclick="booksSetFilter('completed',this)">✅ Completed</button>
        <button class="tab-btn" onclick="booksSetFilter('all',this)">All</button>
      </div>

      <!-- Book list -->
      <div id="books-list"></div>

      <!-- Add Book Modal -->
      <div id="books-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;align-items:center;justify-content:center">
        <div style="background:var(--bg2);border-radius:16px;padding:28px;width:100%;max-width:480px;margin:16px">
          <h3 style="margin:0 0 16px">Add Book</h3>

          <input id="bk-search-input" class="input" placeholder="Search book title..." oninput="booksSearchOL(this.value)" style="margin-bottom:8px">
          <div id="bk-search-results" style="margin-bottom:12px"></div>

          <div style="display:grid;gap:10px">
            <input id="bk-title"  class="input" placeholder="Title *">
            <input id="bk-author" class="input" placeholder="Author">
            <input id="bk-pages"  class="input" type="number" placeholder="Total pages">
            <select id="bk-status" class="input">
              <option value="reading">📚 Currently Reading</option>
              <option value="want_to_read">🔖 Want to Read</option>
              <option value="completed">✅ Completed</option>
            </select>
            <input id="bk-cover" class="input" placeholder="Cover URL (optional)">
          </div>

          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-primary" onclick="booksAddBook()">Add Book</button>
            <button class="btn btn-ghost" onclick="booksCloseModal()">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Notes Modal -->
      <div id="notes-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;align-items:center;justify-content:center">
        <div style="background:var(--bg2);border-radius:16px;padding:28px;width:100%;max-width:560px;margin:16px;max-height:80vh;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 id="notes-modal-title" style="margin:0"></h3>
            <button class="btn btn-ghost btn-icon" onclick="booksCloseNotes()">✕</button>
          </div>

          <div id="notes-list" style="margin-bottom:16px"></div>

          <div style="display:grid;gap:8px;border-top:1px solid var(--border);padding-top:16px">
            <textarea id="note-text" class="input" rows="3" placeholder="Add a note, quote or highlight..."></textarea>
            <div style="display:flex;gap:8px">
              <input id="note-page" class="input" type="number" placeholder="Page #" style="width:100px">
              <select id="note-type" class="input" style="flex:1">
                <option value="note">📝 Note</option>
                <option value="quote">💬 Quote</option>
                <option value="highlight">✨ Highlight</option>
              </select>
              <button class="btn btn-primary" onclick="booksSaveNote()">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  await booksLoad();
}

async function booksLoad() {
  const r = await fetch(`/api/books/?status=${_booksFilter}`);
  const d = await r.json();
  _booksData  = d.books || [];
  _booksStats = d.stats || {};
  booksRenderStats();
  booksRenderList();
}

function booksRenderStats() {
  const el = document.getElementById('books-stats');
  if (!el) return;
  const s = _booksStats;
  el.innerHTML = `
    <div class="stat-chip">📚 <strong>${s.reading||0}</strong> Reading</div>
    <div class="stat-chip">✅ <strong>${s.completed||0}</strong> Completed</div>
    <div class="stat-chip">🔖 <strong>${s.want_to_read||0}</strong> Want to Read</div>
    <div class="stat-chip">📦 <strong>${s.total||0}</strong> Total</div>
  `;
}

function booksRenderList() {
  const el = document.getElementById('books-list');
  if (!el) return;
  if (!_booksData.length) {
    el.innerHTML = `<div class="empty-state">
      <div style="font-size:48px;margin-bottom:12px">📚</div>
      <p class="text-2">No books here yet. Add your first book!</p>
    </div>`;
    return;
  }
  el.innerHTML = _booksData.map(b => bookCard(b)).join('');
}

function bookCard(b) {
  const pct = b.progress_pct || 0;
  const stars = b.rating ? '⭐'.repeat(b.rating) : '';
  const coverBg = b.cover_url
    ? `background:url('${b.cover_url}') center/cover no-repeat`
    : `background:linear-gradient(135deg,#4f8ef7,#a855f7)`;
  return `
  <div class="card" style="display:flex;gap:16px;margin-bottom:12px;padding:16px">
    <div style="width:64px;height:88px;border-radius:8px;flex-shrink:0;${coverBg};display:flex;align-items:center;justify-content:center;font-size:28px">
      ${b.cover_url ? '' : '📖'}
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.title}</div>
      <div class="text-2" style="margin-bottom:6px">${b.author || 'Unknown author'} ${stars}</div>
      ${b.status === 'reading' && b.total_pages ? `
        <div style="background:var(--bg3);border-radius:4px;height:6px;margin-bottom:4px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:4px"></div>
        </div>
        <div class="text-3">${b.current_page}/${b.total_pages} pages · ${pct}%</div>
      ` : `<div class="text-3">${statusLabel(b.status)}</div>`}
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        ${b.status === 'reading' ? `<button class="btn btn-ghost btn-sm" onclick="booksUpdateProgress(${b.id})">Update Progress</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="booksOpenNotes(${b.id})">Notes (${(b.notes||[]).length})</button>
        <button class="btn btn-ghost btn-sm" onclick="booksMarkDone(${b.id})" ${b.status==='completed'?'disabled':''}>Mark Done</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="booksDelete(${b.id})">Delete</button>
      </div>
    </div>
  </div>`;
}

function statusLabel(s) {
  return { reading: '📚 Reading', want_to_read: '🔖 Want to Read', completed: '✅ Completed' }[s] || s;
}

function booksSetFilter(f, btn) {
  _booksFilter = f;
  document.querySelectorAll('#panel-books .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  booksLoad();
}

// ── Add Book Modal ─────────────────────────────────────────────────────────

function booksShowAdd() {
  document.getElementById('books-modal').style.display = 'flex';
}

function booksCloseModal() {
  document.getElementById('books-modal').style.display = 'none';
  ['bk-title','bk-author','bk-pages','bk-cover','bk-search-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('bk-search-results').innerHTML = '';
}

let _olTimer = null;
async function booksSearchOL(q) {
  clearTimeout(_olTimer);
  if (q.length < 3) {
    document.getElementById('bk-search-results').innerHTML = '';
    return;
  }
  _olTimer = setTimeout(async () => {
    const r = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    const el = document.getElementById('bk-search-results');
    if (!d.results?.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div style="display:grid;gap:6px">` +
      d.results.map(item => `
        <div class="card" style="display:flex;gap:10px;padding:10px;cursor:pointer"
             onclick="booksFillFromOL(${JSON.stringify(item).replace(/"/g,'&quot;')})">
          ${item.cover_url ? `<img src="${item.cover_url}" style="width:36px;height:50px;object-fit:cover;border-radius:4px">` : '<div style="width:36px;height:50px;background:var(--bg3);border-radius:4px;display:flex;align-items:center;justify-content:center">📖</div>'}
          <div>
            <div style="font-weight:600;font-size:13px">${item.title}</div>
            <div class="text-2">${item.author} ${item.pages ? '· '+item.pages+' pages' : ''}</div>
          </div>
        </div>
      `).join('') + '</div>';
  }, 400);
}

function booksFillFromOL(item) {
  document.getElementById('bk-title').value  = item.title;
  document.getElementById('bk-author').value = item.author;
  document.getElementById('bk-pages').value  = item.pages || '';
  document.getElementById('bk-cover').value  = item.cover_url || '';
  document.getElementById('bk-search-results').innerHTML = '';
  document.getElementById('bk-search-input').value = item.title;
}

async function booksAddBook() {
  const title  = document.getElementById('bk-title').value.trim();
  const author = document.getElementById('bk-author').value.trim();
  const pages  = parseInt(document.getElementById('bk-pages').value) || 0;
  const status = document.getElementById('bk-status').value;
  const cover  = document.getElementById('bk-cover').value.trim();
  if (!title) { toast('Please enter a book title', 'error'); return; }
  const r = await fetch('/api/books/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, author, total_pages: pages, status, cover_url: cover }),
  });
  const d = await r.json();
  if (d.ok) {
    toast(`"${title}" added!`, 'success');
    booksCloseModal();
    booksLoad();
  } else {
    toast(d.error || 'Failed to add book', 'error');
  }
}

// ── Progress Update ────────────────────────────────────────────────────────

async function booksUpdateProgress(bookId) {
  const book = _booksData.find(b => b.id === bookId);
  if (!book) return;
  const page = prompt(`Current page for "${book.title}"?\n(Total: ${book.total_pages || '?'} pages)`,
                      book.current_page || '');
  if (page === null) return;
  const r = await fetch(`/api/books/${bookId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_page: parseInt(page) || 0 }),
  });
  const d = await r.json();
  if (d.ok) { toast('Progress updated!', 'success'); booksLoad(); }
}

async function booksMarkDone(bookId) {
  const book = _booksData.find(b => b.id === bookId);
  if (!book) return;
  const rating = prompt(`Rate "${book.title}" (1-5 stars):`, '5');
  if (rating === null) return;
  const r = await fetch(`/api/books/${bookId}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed', rating: parseInt(rating) || 0 }),
  });
  const d = await r.json();
  if (d.ok) { toast('Book marked as completed! 🎉', 'success'); booksLoad(); }
}

async function booksDelete(bookId) {
  const book = _booksData.find(b => b.id === bookId);
  if (!confirm(`Remove "${book?.title}" from your library?`)) return;
  await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
  toast('Book removed', 'info');
  booksLoad();
}

// ── Notes Modal ────────────────────────────────────────────────────────────

function booksOpenNotes(bookId) {
  _activeBook = _booksData.find(b => b.id === bookId);
  if (!_activeBook) return;
  document.getElementById('notes-modal-title').textContent = `📝 ${_activeBook.title}`;
  booksRenderNotes();
  document.getElementById('notes-modal').style.display = 'flex';
}

function booksCloseNotes() {
  document.getElementById('notes-modal').style.display = 'none';
  _activeBook = null;
}

function booksRenderNotes() {
  const el = document.getElementById('notes-list');
  const notes = _activeBook?.notes || [];
  if (!notes.length) {
    el.innerHTML = '<p class="text-2">No notes yet. Add your first note below!</p>';
    return;
  }
  const typeIcon = { note: '📝', quote: '💬', highlight: '✨' };
  el.innerHTML = notes.map((n, i) => `
    <div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:8px;position:relative">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;color:var(--text3)">${typeIcon[n.type]||'📝'} ${n.type} ${n.page ? '· p.'+n.page : ''} · ${n.date}</span>
        <button class="btn btn-ghost btn-icon" style="font-size:11px;padding:2px 6px"
                onclick="booksDeleteNote(${_activeBook.id},${i})">✕</button>
      </div>
      <div style="font-size:14px;line-height:1.5">${n.text}</div>
    </div>
  `).join('');
}

async function booksSaveNote() {
  if (!_activeBook) return;
  const text = document.getElementById('note-text').value.trim();
  if (!text) { toast('Please enter a note', 'error'); return; }
  const page = parseInt(document.getElementById('note-page').value) || 0;
  const type = document.getElementById('note-type').value;
  const r = await fetch(`/api/books/${_activeBook.id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, page, type }),
  });
  const d = await r.json();
  if (d.ok) {
    toast('Note saved!', 'success');
    document.getElementById('note-text').value = '';
    document.getElementById('note-page').value = '';
    // Refresh the active book data
    await booksLoad();
    _activeBook = _booksData.find(b => b.id === _activeBook.id) || _activeBook;
    booksRenderNotes();
  }
}

async function booksDeleteNote(bookId, noteIndex) {
  if (!confirm('Delete this note?')) return;
  await fetch(`/api/books/${bookId}/notes/${noteIndex}`, { method: 'DELETE' });
  await booksLoad();
  _activeBook = _booksData.find(b => b.id === bookId) || _activeBook;
  booksRenderNotes();
  toast('Note deleted', 'info');
}
