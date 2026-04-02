/* OZY2 — Local Photo Album Panel */

let _photoFiles  = [];
let _photoIndex  = -1;
let _photoSearch = '';
const _PHOTO_EXTS = new Set(['jpg','jpeg','png','gif','webp','heic','heif','avif','bmp']);

function init_photos(el) {
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;
                  border-bottom:1px solid var(--card-border);flex-shrink:0">
        <button onclick="photosOpenFolder()"
          style="background:var(--accent);color:#fff;border:none;border-radius:10px;
                 padding:8px 18px;font-size:13px;font-weight:600;cursor:pointer">
          📂 Open Folder
        </button>
        <input id="photos-search" placeholder="Search by filename…" type="text"
          style="flex:1;max-width:280px;background:var(--card-bg);border:1px solid var(--card-border);
                 border-radius:8px;padding:7px 12px;color:var(--text-1);font-size:13px;outline:none"
          oninput="photosFilter(this.value)">
        <span id="photos-count" style="font-size:12px;color:var(--text-3);margin-left:auto"></span>
      </div>
      <div id="photos-grid" style="flex:1;overflow-y:auto;padding:16px">
        <div id="photos-empty" style="display:flex;flex-direction:column;align-items:center;
             justify-content:center;height:100%;gap:16px;color:var(--text-3);text-align:center">
          <div style="font-size:64px">🖼️</div>
          <div style="font-size:18px;font-weight:600;color:var(--text-2)">Your photo album</div>
          <div style="font-size:13px;max-width:300px">
            Click "Open Folder" to browse photos on your device.<br>
            <span style="font-size:12px">Photos stay local — nothing is uploaded.</span>
          </div>
          <div id="photos-no-support" style="display:none;background:#f43f5e22;border:1px solid #f43f5e44;
               border-radius:10px;padding:12px 16px;font-size:13px;color:#f43f5e">
            ⚠️ Your browser doesn't support folder access. Please use Chrome or Edge.
          </div>
        </div>
        <div id="photos-items"
          style="display:none;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px"></div>
      </div>
    </div>
    <div id="photos-lightbox" onclick="photosCloseLb()"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:9999;
             align-items:center;justify-content:center">
      <div style="position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:12px"
           onclick="event.stopPropagation()">
        <span id="lb-filename" style="color:rgba(255,255,255,.6);font-size:13px"></span>
        <button onclick="photosCloseLb()"
          style="background:rgba(255,255,255,.1);border:none;color:#fff;border-radius:8px;
                 width:36px;height:36px;font-size:18px;cursor:pointer">✕</button>
      </div>
      <button onclick="event.stopPropagation();photosNav(-1)"
        style="position:absolute;left:16px;background:rgba(255,255,255,.1);border:none;color:#fff;
               border-radius:50%;width:48px;height:48px;font-size:24px;cursor:pointer">‹</button>
      <img id="lb-img" style="max-width:90vw;max-height:85vh;object-fit:contain;border-radius:8px"
           onclick="event.stopPropagation()">
      <button onclick="event.stopPropagation();photosNav(1)"
        style="position:absolute;right:16px;background:rgba(255,255,255,.1);border:none;color:#fff;
               border-radius:50%;width:48px;height:48px;font-size:24px;cursor:pointer">›</button>
      <div id="lb-counter" style="position:absolute;bottom:16px;color:rgba(255,255,255,.4);font-size:12px"
           onclick="event.stopPropagation()"></div>
    </div>`;

  document.addEventListener('keydown', e => {
    if (document.getElementById('photos-lightbox').style.display === 'none') return;
    if (e.key === 'ArrowLeft')  photosNav(-1);
    if (e.key === 'ArrowRight') photosNav(1);
    if (e.key === 'Escape')     photosCloseLb();
  });
}

async function photosOpenFolder() {
  if (!window.showDirectoryPicker) {
    document.getElementById('photos-no-support').style.display = '';
    return;
  }
  try {
    const dir = await window.showDirectoryPicker({ mode: 'read' });
    _photoFiles = [];
    await _photosReadDir(dir, 0);
    _photoFiles.sort((a,b) => b.lastModified - a.lastModified);
    photosRender(_photoFiles);
  } catch(e) { if (e.name !== 'AbortError') console.error(e); }
}

async function _photosReadDir(dir, depth) {
  if (depth > 3) return;
  for await (const [name, handle] of dir) {
    if (handle.kind === 'file') {
      const ext = name.split('.').pop().toLowerCase();
      if (_PHOTO_EXTS.has(ext)) {
        const file = await handle.getFile();
        _photoFiles.push({ name, file, url: URL.createObjectURL(file), lastModified: file.lastModified });
      }
    } else if (handle.kind === 'directory') {
      await _photosReadDir(handle, depth + 1);
    }
  }
}

function photosRender(files) {
  const filtered = _photoSearch
    ? files.filter(f => f.name.toLowerCase().includes(_photoSearch.toLowerCase()))
    : files;
  window._photosFiltered = filtered;
  document.getElementById('photos-count').textContent = filtered.length + ' photo' + (filtered.length!==1?'s':'');
  const empty = document.getElementById('photos-empty');
  const grid  = document.getElementById('photos-items');
  if (!filtered.length) { empty.style.display='flex'; grid.style.display='none'; return; }
  empty.style.display = 'none';
  grid.style.display  = 'grid';
  grid.innerHTML = filtered.map((f,i) => `
    <div onclick="photosOpenLb(${i})"
      style="cursor:pointer;border-radius:10px;overflow:hidden;background:var(--card-bg);
             border:1px solid var(--card-border);aspect-ratio:1;position:relative;transition:transform .15s"
      onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
      <img src="${f.url}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.65));
                  padding:16px 6px 5px;font-size:9px;color:#fff;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
    </div>`).join('');
}

function photosFilter(q) { _photoSearch = q; photosRender(_photoFiles); }

function photosOpenLb(idx) {
  const files = window._photosFiltered || _photoFiles;
  _photoIndex = idx;
  const f = files[idx];
  document.getElementById('lb-img').src = f.url;
  document.getElementById('lb-filename').textContent = f.name;
  document.getElementById('lb-counter').textContent  = (idx+1) + ' / ' + files.length;
  const lb = document.getElementById('photos-lightbox');
  lb.style.display = 'flex';
}

function photosNav(dir) {
  const files = window._photosFiltered || _photoFiles;
  _photoIndex = (_photoIndex + dir + files.length) % files.length;
  photosOpenLb(_photoIndex);
}

function photosCloseLb() {
  document.getElementById('photos-lightbox').style.display = 'none';
}
