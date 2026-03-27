/* OZY2 — YouTube Panel (channel following + feed via RSS) */

function init_youtube(el) {
  el.innerHTML = `
    <div style="padding:20px;max-width:960px;margin:0 auto">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 2px">YouTube</h2>
          <div style="color:var(--text-3);font-size:13px">Kanalları takip et · Son videoları izle</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="ytShowTab('feed')" id="yt-tab-feed">📺 Feed</button>
          <button class="btn btn-ghost btn-sm" onclick="ytShowTab('channels')" id="yt-tab-channels">📡 Kanallar</button>
          <button class="btn btn-ghost btn-sm" onclick="ytShowTab('search')" id="yt-tab-search">🔍 Ara</button>
        </div>
      </div>

      <div id="yt-feed" class="yt-tab">
        <div id="yt-feed-content"><div class="spinner" style="margin:60px auto"></div></div>
      </div>

      <div id="yt-channels" class="yt-tab" style="display:none">
        <div class="card" style="padding:16px;margin-bottom:16px">
          <div style="font-size:13px;font-weight:600;margin-bottom:10px">Kanal Ekle</div>
          <div style="display:flex;gap:8px">
            <input id="yt-channel-input" class="input" style="flex:1"
              placeholder="@kanaladi veya youtube.com/@... URL"
              onkeydown="if(event.key==='Enter') ytFollowChannel()">
            <button class="btn btn-primary" onclick="ytFollowChannel()">+ Takip Et</button>
          </div>
          <div id="yt-follow-msg" style="font-size:12px;margin-top:8px;min-height:16px"></div>
        </div>
        <div id="yt-channels-list"><div class="spinner" style="margin:40px auto"></div></div>
      </div>

      <div id="yt-search" class="yt-tab" style="display:none">
        <div class="card" style="padding:16px;margin-bottom:16px">
          <div style="display:flex;gap:8px">
            <input id="yt-search-input" class="input" style="flex:1"
              placeholder="Video ara..."
              onkeydown="if(event.key==='Enter') ytSearch()">
            <button class="btn btn-primary" onclick="ytSearch()">Ara</button>
          </div>
        </div>
        <div id="yt-search-results"></div>
      </div>

    </div>
  `;

  if (!document.getElementById('yt-styles')) {
    const s = document.createElement('style');
    s.id = 'yt-styles';
    s.textContent = `
      .yt-video-card {
        display:flex;gap:14px;padding:14px;margin-bottom:10px;
        background:var(--card-bg,#1a1a1a);border:1px solid var(--border,#2a2a2a);
        border-radius:12px;cursor:pointer;transition:background .15s;
        text-decoration:none;color:inherit;
      }
      .yt-video-card:hover { background:var(--card-hover,#222); }
      .yt-thumb { width:140px;min-width:140px;height:79px;object-fit:cover;border-radius:8px;background:#111; }
      .yt-title { font-size:14px;font-weight:600;margin-bottom:4px;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
      .yt-meta { font-size:12px;color:var(--text-3,#888); }
      .yt-channel-row {
        display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px;
        background:var(--card-bg,#1a1a1a);border:1px solid var(--border,#2a2a2a);border-radius:12px;
      }
      .yt-tab-active { background:var(--accent,#4f8ef7)!important;color:#fff!important; }
    `;
    document.head.appendChild(s);
  }

  ytShowTab('feed');
}

function ytShowTab(tab) {
  ['feed','channels','search'].forEach(t => {
    const el = document.getElementById('yt-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
    document.getElementById('yt-tab-' + t)?.classList.toggle('yt-tab-active', t === tab);
  });
  if (tab === 'feed')     ytLoadFeed();
  if (tab === 'channels') ytLoadChannels();
}

async function ytLoadFeed() {
  const el = document.getElementById('yt-feed-content');
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="margin:60px auto"></div>';
  try {
    const r = await fetch('/api/youtube/feed');
    const d = await r.json();
    if (!d.ok || !d.videos.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:80px 20px;color:var(--text-3)">
          <div style="font-size:44px;margin-bottom:14px">📡</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px">Takip edilen kanal yok</div>
          <div style="font-size:13px;margin-bottom:20px">Kanallar sekmesinden ekle, burada son videolar görünür.</div>
          <button class="btn btn-primary" onclick="ytShowTab('channels')">+ Kanal Ekle</button>
        </div>`;
      return;
    }
    el.innerHTML = d.videos.map(v => ytVideoCard(v, true)).join('');
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Yüklenemedi.</div>';
  }
}

async function ytLoadChannels() {
  const el = document.getElementById('yt-channels-list');
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';
  try {
    const r = await fetch('/api/youtube/channels');
    const d = await r.json();
    if (!d.channels.length) {
      el.innerHTML = '<div style="color:var(--text-3);padding:20px;text-align:center;font-size:13px">Henüz kanal yok. Yukarıdan ekle.</div>';
      return;
    }
    el.innerHTML = d.channels.map(ch => `
      <div class="yt-channel-row">
        <div style="font-size:28px">📺</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${ch.name}</div>
          <div style="font-size:12px;color:var(--text-3)">${ch.handle || ch.channel_id}</div>
        </div>
        <a href="${ch.url}" target="_blank" class="btn btn-ghost btn-sm">Aç ↗</a>
        <button class="btn btn-ghost btn-sm" style="color:#ef4444"
          onclick="ytUnfollow('${ch.channel_id}','${ch.name}')">Bırak</button>
      </div>
    `).join('');
  } catch {
    el.innerHTML = '<div style="color:var(--text-3);padding:20px">Yüklenemedi.</div>';
  }
}

async function ytFollowChannel() {
  const input = document.getElementById('yt-channel-input');
  const msg   = document.getElementById('yt-follow-msg');
  const url   = input?.value?.trim();
  if (!url) return;
  msg.textContent = 'Kanal aranıyor...';
  msg.style.color = 'var(--text-3)';
  try {
    const r = await fetch('/api/youtube/channels/follow', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({url}),
    });
    const d = await r.json();
    if (d.ok) {
      msg.textContent = '"' + d.channel.name + '" takip edildi!';
      msg.style.color = '#10b981';
      input.value = '';
      ytLoadChannels();
    } else {
      msg.textContent = d.error;
      msg.style.color = '#ef4444';
    }
  } catch (e) {
    msg.textContent = 'Hata: ' + e.message;
    msg.style.color = '#ef4444';
  }
}

async function ytUnfollow(channel_id, name) {
  if (!confirm('"' + name + '" takibini birak?')) return;
  await fetch('/api/youtube/channels/' + channel_id, {method:'DELETE'});
  ytLoadChannels();
}

async function ytSearch() {
  const q  = document.getElementById('yt-search-input')?.value?.trim();
  const el = document.getElementById('yt-search-results');
  if (!q || !el) return;
  el.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';
  try {
    const r = await fetch('/api/youtube/search?q=' + encodeURIComponent(q) + '&limit=10');
    const d = await r.json();
    if (d.ok && d.videos?.length) {
      el.innerHTML = d.videos.map(v => ytVideoCard(v, false)).join('');
    } else {
      el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-3);font-size:13px">
        YouTube API key gerekmektedir. Settings\'ten ekle ya da chat\'ten sor.<br>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="showPanel('chat')">Chat\'e Git</button>
      </div>`;
    }
  } catch {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-3);font-size:13px">
      Chat\'ten ara: "${q} youtube videosu bul"<br>
      <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="showPanel('chat')">Chat\'e Git</button>
    </div>`;
  }
}

function ytVideoCard(v, showChannel) {
  const views = v.views ? parseInt(v.views).toLocaleString() + ' görüntülenme · ' : '';
  return '<a href="' + v.url + '" target="_blank" class="yt-video-card">' +
    '<img class="yt-thumb" src="' + (v.thumbnail||'') + '" alt="" loading="lazy" onerror="this.style.background=\'#111\'">' +
    '<div style="flex:1;min-width:0">' +
      '<div class="yt-title">' + v.title + '</div>' +
      '<div class="yt-meta">' +
        (showChannel && v.channel_name ? '<span style="color:var(--accent)">' + v.channel_name + '</span> · ' : '') +
        views + (v.published||'') +
      '</div>' +
      (v.description ? '<div style="font-size:12px;color:var(--text-3);margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + v.description + '</div>' : '') +
    '</div>' +
    '<div style="font-size:20px;align-self:center;flex-shrink:0">▶️</div>' +
  '</a>';
}
