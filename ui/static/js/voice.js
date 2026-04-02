/* OZY2 — Voice-First Accessible Assistant  v3
   Strategy: mic permission requested on first mic-button click (user gesture).
   No permissions.query, no auto-requests — works in every browser.
*/
'use strict';

// ── State ─────────────────────────────────────────────────────────
let _recognition  = null;
let _listening    = false;
let _speaking     = false;
let _thinking     = false;
let _autoListen   = true;
let _micGranted   = false;   // true after getUserMedia succeeds once
let _aiName       = 'OZY';
let _aiAvatar     = '🤖';
let _currentAudio = null;
let _abortCtrl    = null;
let _audioCtx     = null;   // AudioContext unlocked on first mic click

// ── DOM refs ──────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const micBtn    = $('mic-btn');
const statusDot = $('status-dot');
const statusTxt = $('status-text');
const convo     = $('convo');
const srLive    = $('sr-live');
const langSel   = $('lang-select');

// ── Multilingual strings ──────────────────────────────────────────
const STRINGS = {
  ready:     { 'tr-TR':'Hazır — mikrofona tıklayın veya Boşluk tuşuna basın.',
               'en-US':'Ready — tap the microphone or press Space.',
               'de-DE':'Bereit — Mikrofon antippen oder Leertaste drücken.',
               'fr-FR':'Prêt — touchez le microphone ou appuyez sur Espace.',
               'es-ES':'Listo — toca el micrófono o presiona Espacio.',
               'pt-PT':'Pronto — toque o microfone ou pressione Espaço.',
               'it-IT':'Pronto — tocca il microfono o premi Spazio.',
               'ar-SA':'جاهز — انقر على المايكروفون أو اضغط المسافة.',
               'ja-JP':'準備完了 — マイクをタップするかスペースを押してください。',
               'zh-CN':'就绪 — 点击麦克风或按空格键。' },
  tap_mic:   { 'tr-TR':'🎤 Konuşmak için mikrofona tıklayın',
               'en-US':'🎤 Tap the microphone to start talking',
               'de-DE':'🎤 Mikrofon antippen um zu sprechen',
               'fr-FR':'🎤 Touchez le microphone pour parler',
               'es-ES':'🎤 Toca el micrófono para hablar',
               'pt-PT':'🎤 Toque o microfone para falar',
               'it-IT':'🎤 Tocca il microfono per parlare',
               'ar-SA':'🎤 انقر على المايكروفون للتحدث',
               'ja-JP':'🎤 マイクをタップして話してください',
               'zh-CN':'🎤 点击麦克风开始说话' },
  listening: { 'tr-TR':'Dinliyorum…','en-US':'Listening…','de-DE':'Ich höre…',
               'fr-FR':"J'écoute…",'es-ES':'Escuchando…','pt-PT':'Ouvindo…',
               'it-IT':'Ascolto…','ar-SA':'أستمع…','ja-JP':'聞いています…','zh-CN':'正在听…' },
  thinking:  { 'tr-TR':'Düşünüyorum…','en-US':'Thinking…','de-DE':'Denke nach…',
               'fr-FR':'Je réfléchis…','es-ES':'Pensando…','pt-PT':'Pensando…',
               'it-IT':'Sto pensando…','ar-SA':'أفكر…','ja-JP':'考え中…','zh-CN':'思考中…' },
  speaking:  { 'tr-TR':'Konuşuyorum…','en-US':'Speaking…','de-DE':'Ich spreche…',
               'fr-FR':'Je parle…','es-ES':'Hablando…','pt-PT':'Falando…',
               'it-IT':'Sto parlando…','ar-SA':'أتحدث…','ja-JP':'話しています…','zh-CN':'正在说话…' },
  no_speech: { 'tr-TR':'Ses algılanamadı, tekrar deneyin.',
               'en-US':'No speech detected, try again.',
               'de-DE':'Keine Sprache erkannt, erneut versuchen.',
               'fr-FR':'Aucune parole détectée, réessayez.',
               'es-ES':'No se detectó voz, inténtelo de nuevo.',
               'pt-PT':'Nenhuma fala detectada, tente novamente.',
               'it-IT':'Nessun parlato rilevato, riprova.',
               'ar-SA':'لم يُكتشف كلام، حاول مجدداً.',
               'ja-JP':'音声なし、もう一度お試しください。',
               'zh-CN':'未检测到语音，请重试。' },
};
function t(key) {
  const lang = langSel.value;
  return (STRINGS[key]||{})[lang] || (STRINGS[key]||{})['en-US'] || key;
}

function buildGreeting(userName) {
  const u = userName ? userName.split(' ')[0] : '';
  const n = _aiName;
  const l = langSel.value;
  const G = {
    'tr-TR': u ? `Merhaba ${u}! Ben ${n}. Mikrofona tıklayarak benimle konuşabilirsin.`
               : `Merhaba! Ben ${n}. Mikrofona tıklayarak konuşmaya başlayabilirsin.`,
    'en-US': u ? `Hey ${u}! I'm ${n}. Tap the microphone whenever you're ready to talk!`
               : `Hello! I'm ${n}. Tap the microphone to start — I'm all ears!`,
    'de-DE': u ? `Hallo ${u}! Ich bin ${n}. Tippe auf das Mikrofon, um zu sprechen!`
               : `Hallo! Ich bin ${n}. Tippe auf das Mikrofon, um zu sprechen!`,
    'fr-FR': u ? `Bonjour ${u}! Je suis ${n}. Touche le microphone pour me parler!`
               : `Bonjour! Je suis ${n}. Touche le microphone pour commencer!`,
    'es-ES': u ? `Hola ${u}! Soy ${n}. Toca el micrófono cuando estés listo!`
               : `Hola! Soy ${n}. Toca el micrófono para empezar!`,
  };
  return G[l] || G['en-US'];
}

// ── Init ──────────────────────────────────────────────────────────
async function initVoice() {
  // Load settings (single fetch)
  let userName = '';
  try {
    const d = await fetch('/api/settings').then(r => r.json());
    _aiName   = d.settings?.ai_name   || 'OZY';
    _aiAvatar = d.settings?.ai_avatar || '🤖';
    userName  = d.settings?.user_name  || '';

    const map = { tr:'tr-TR', en:'en-US', de:'de-DE', fr:'fr-FR', es:'es-ES',
                  pt:'pt-PT', it:'it-IT', ar:'ar-SA', ja:'ja-JP', zh:'zh-CN' };
    const lang = map[(d.settings?.language || navigator.language || 'en').slice(0,2)] || 'en-US';
    langSel.value = lang;
  } catch(_) {}

  $('ai-name').textContent = _aiName;
  $('avatar').textContent  = _aiAvatar;
  document.title = `${_aiName} — Voice`;

  // Check browser support
  const hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!hasSR) {
    $('no-stt-warn').style.display = 'block';
  }

  // Setup SpeechRecognition (but don't start yet)
  setupRecognition();

  // Play greeting via TTS — doesn't need mic permission
  setStatus('speaking', 'speaking', t('speaking'));
  const greeting = buildGreeting(userName);
  appendMsg(greeting, 'ai');
  await speak(greeting);

  // Show "tap mic" prompt — permission will be requested on first click
  setStatus('ready', '', t('tap_mic'));
  micBtn.focus();
}

// ── Speech Recognition ────────────────────────────────────────────
function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  _recognition = new SR();
  _recognition.continuous      = false;
  _recognition.interimResults  = true;
  _recognition.maxAlternatives = 1;
  _recognition.lang            = langSel.value;

  let _interimEl = null;

  _recognition.onstart = () => {
    _listening = true;
    micBtn.className = 'listening';
    micBtn.setAttribute('aria-pressed', 'true');
    setStatus('listening', 'listening', t('listening'));
    announce(t('listening'));
  };

  _recognition.onresult = e => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final   += e.results[i][0].transcript;
      else                       interim += e.results[i][0].transcript;
    }
    if (!_interimEl) {
      _interimEl = document.createElement('div');
      _interimEl.className = 'msg msg-interim';
      _interimEl.setAttribute('aria-hidden', 'true');
      convo.appendChild(_interimEl);
    }
    _interimEl.textContent = interim || final;
    convo.scrollTop = convo.scrollHeight;
    if (final.trim()) {
      _interimEl?.remove(); _interimEl = null;
      handleInput(final.trim());
    }
  };

  _recognition.onerror = e => {
    _listening = false;
    if (_interimEl) { _interimEl.remove(); _interimEl = null; }
    micBtn.className = '';
    micBtn.setAttribute('aria-pressed', 'false');

    if (e.error === 'no-speech') {
      setStatus('ready', '', t('no_speech'));
    } else if (e.error === 'not-allowed') {
      _micGranted = false;
      showMicDenied();
    } else {
      setStatus('ready', '', `Error: ${e.error} — try again`);
    }
  };

  _recognition.onend = () => {
    _listening = false;
    if (_interimEl) { _interimEl.remove(); _interimEl = null; }
    if (!_thinking && !_speaking) {
      micBtn.className = '';
      micBtn.setAttribute('aria-pressed', 'false');
      setStatus('ready', '', t('ready'));
    }
  };
}

// ── Mic toggle — permission requested HERE (user gesture) ─────────
async function toggleMic() {
  // Interrupt speech
  if (_speaking) { interrupt(); return; }
  // Stop listening
  if (_listening) { _recognition?.stop(); return; }
  if (_thinking) return;

  // Unlock AudioContext on every click (user gesture = no autoplay block)
  // This allows audio.play() to work even after long async chains (LLM latency)
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') await _audioCtx.resume();

  // Request mic permission on first use (user gesture = reliable Chrome popup)
  if (!_micGranted) {
    micBtn.innerHTML = '⏳';
    micBtn.style.borderColor = 'var(--accent,#FFD700)';
    setStatus('', '', 'Requesting microphone…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach(t => t.stop()); // release immediately
      _micGranted = true;
      micBtn.innerHTML = '🎤';
      micBtn.style.borderColor = 'var(--accent,#FFD700)';
    } catch(err) {
      micBtn.innerHTML = '🎤';
      micBtn.style.borderColor = 'var(--danger,#e74c3c)';
      showMicDenied();
      return;
    }
  }

  // Start recognition
  if (!_recognition) setupRecognition();
  _recognition.lang = langSel.value;
  try { _recognition.start(); } catch(_) {}
}

function interrupt() {
  if (_currentAudio) { try { _currentAudio.pause(); } catch(_){} _currentAudio = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (_abortCtrl) { _abortCtrl.abort(); _abortCtrl = null; }
  _speaking = false; _thinking = false;
  micBtn.className = '';
  setStatus('ready', '', t('ready'));
}

// ── Mic denied UI ─────────────────────────────────────────────────
function showMicDenied() {
  setStatus('error', '', 'Microphone blocked');
  micBtn.innerHTML = '🚫';
  micBtn.title = 'Microphone blocked — see instructions below';

  // Remove any existing denied card
  document.getElementById('mic-denied-card')?.remove();

  const div = document.createElement('div');
  div.id = 'mic-denied-card';
  div.style.cssText = 'margin-bottom:14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.35);border-radius:14px;padding:16px;font-size:.88rem;line-height:1.7';
  div.innerHTML = `
    <div style="font-weight:800;color:#f87171;font-size:1rem;margin-bottom:10px">🔇 Microphone is blocked</div>
    <div style="color:#ccc;margin-bottom:14px;font-size:.85rem">
      Chrome remembered a previous "Block". Reset it in 3 steps:
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);padding:8px 12px;border-radius:8px">
        <span style="font-size:1.3rem">🔒</span>
        <span>Click the <strong style="color:#fcd34d">lock icon</strong> in the address bar</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);padding:8px 12px;border-radius:8px">
        <span style="font-size:1.3rem">🎙️</span>
        <span>Find <strong style="color:#fcd34d">Microphone</strong> → set to <strong style="color:#86efac">Allow</strong></span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.05);padding:8px 12px;border-radius:8px">
        <span style="font-size:1.3rem">🔄</span>
        <span>Click <strong style="color:#86efac">Reload</strong> below</span>
      </div>
    </div>
    <button onclick="location.reload()"
      style="width:100%;padding:12px;border-radius:12px;border:none;
             background:#6366f1;color:#fff;font-size:.95rem;font-weight:700;cursor:pointer">
      🔄 Reload page
    </button>`;
  convo.appendChild(div);
  convo.scrollTop = convo.scrollHeight;
}

// ── Process input → AI ────────────────────────────────────────────
async function handleInput(text) {
  appendMsg(text, 'user');
  announce('You said: ' + text);
  _thinking = true;
  micBtn.className = 'thinking';
  setStatus('thinking', 'thinking', t('thinking'));

  try {
    _abortCtrl = new AbortController();
    const resp = await fetch(
      `/api/chat/stream?message=${encodeURIComponent(text)}`,
      { headers: { Accept: 'text/event-stream' }, signal: _abortCtrl.signal }
    );
    let full = '';
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try { const j = JSON.parse(data); if (j.chunk) full += j.chunk; } catch(_) {}
      }
    }
    _thinking = false; _abortCtrl = null;

    const clean = full.replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')
      .replace(/`{1,3}[^`]*`{1,3}/g,'').replace(/#{1,6}\s+/g,'').replace(/\n{2,}/g,'\n').trim();

    appendMsg(clean || '…', 'ai');
    setStatus('speaking', 'speaking', t('speaking'));
    micBtn.className = 'speaking';
    announce(`${_aiName}: ${clean.slice(0,160)}`);
    await speak(clean || full);

    if (_autoListen && _recognition && _micGranted) {
      setStatus('ready', '', t('ready'));
      micBtn.className = '';
      setTimeout(() => {
        if (!_listening && !_thinking && !_speaking) {
          _recognition.lang = langSel.value;
          try { _recognition.start(); } catch(_) {}
        }
      }, 500);
    } else {
      setStatus('ready', '', t('ready'));
      micBtn.className = '';
      micBtn.focus();
    }
  } catch(e) {
    if (e.name === 'AbortError') return;
    _thinking = false;
    const err = 'Something went wrong. Please try again.';
    appendMsg('⚠️ ' + err, 'ai');
    await speak(err);
    setStatus('ready', '', t('ready'));
    micBtn.className = '';
  }
}

// ── TTS ───────────────────────────────────────────────────────────
async function speak(text) {
  if (!text?.trim()) return;
  _speaking = true;
  const MAX = 1800;
  const chunks = [];
  let rem = text.trim();
  while (rem.length > MAX) {
    let cut = rem.lastIndexOf('. ', MAX);
    if (cut < MAX / 2) cut = MAX;
    chunks.push(rem.slice(0, cut + 1).trim());
    rem = rem.slice(cut + 1).trim();
  }
  if (rem) chunks.push(rem);
  for (const chunk of chunks) {
    if (!_speaking) break;
    await _speakChunk(chunk);
  }
  _speaking = false;
}

async function _speakChunk(text) {
  // Try server TTS (Microsoft Edge Neural voices)
  try {
    const r = await fetch('/api/tts/speak', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (r.ok && r.headers.get('content-type')?.includes('audio')) {
      const arrayBuf = await r.arrayBuffer();
      if (arrayBuf.byteLength > 100) {
        // Use AudioContext if available (unlocked by mic click → no autoplay block)
        if (_audioCtx) {
          try {
            const decoded = await _audioCtx.decodeAudioData(arrayBuf.slice(0));
            await new Promise((res, rej) => {
              const src = _audioCtx.createBufferSource();
              src.buffer = decoded;
              src.connect(_audioCtx.destination);
              src.onended = res;
              // store ref so interrupt() can stop it
              _currentAudio = { pause: () => { try { src.stop(); } catch(_){} } };
              src.start(0);
            });
            _currentAudio = null;
            return;
          } catch(_) { /* decoding failed — fall through */ }
        }
        // Fallback: HTMLAudio (works if page was recently interacted with)
        const url = URL.createObjectURL(new Blob([arrayBuf], { type: 'audio/mpeg' }));
        _currentAudio = new Audio(url);
        await new Promise(res => {
          _currentAudio.onended = res; _currentAudio.onerror = res;
          _currentAudio.play().catch(res);
        });
        URL.revokeObjectURL(url); _currentAudio = null;
        return;
      }
    }
  } catch(_) {}
  // Final fallback: browser Web Speech Synthesis
  await _webSynth(text);
}

function _webSynth(text) {
  if (!window.speechSynthesis) return Promise.resolve();
  speechSynthesis.cancel();
  return new Promise(res => {
    const utt = new SpeechSynthesisUtterance(text.slice(0, 2000));
    utt.lang = langSel.value; utt.rate = 0.95; utt.pitch = 1.05;
    const voices = speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(langSel.value.slice(0,2)) && !v.name.includes('compact'));
    if (match) utt.voice = match;
    utt.onend = res; utt.onerror = res;
    speechSynthesis.speak(utt);
  });
}

// ── UI helpers ────────────────────────────────────────────────────
function setStatus(key, dotClass, text) {
  if (statusDot) statusDot.className = dotClass;
  if (statusTxt) statusTxt.textContent = text;
}
function announce(text) {
  srLive.textContent = '';
  requestAnimationFrame(() => { srLive.textContent = text; });
}
function appendMsg(text, role) {
  const div = document.createElement('div');
  div.className = `msg msg-${role}`;
  if (role === 'ai') div.setAttribute('data-name', _aiName);
  div.textContent = text;
  convo.appendChild(div);
  convo.scrollTop = convo.scrollHeight;
}
function clearConvo() { convo.innerHTML = ''; announce('Conversation cleared'); }
function toggleAutoListen() {
  _autoListen = !_autoListen;
  const btn = $('auto-btn');
  btn.textContent = `🔄 Auto-listen: ${_autoListen ? 'ON' : 'OFF'}`;
  btn.setAttribute('aria-pressed', String(_autoListen));
  btn.classList.toggle('active', _autoListen);
}

// ── Keyboard ──────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
  if (e.code === 'Space')  { e.preventDefault(); toggleMic(); }
  if (e.code === 'Escape') { e.preventDefault(); interrupt(); }
  if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) clearConvo();
});

langSel.addEventListener('change', () => { if (_recognition) _recognition.lang = langSel.value; });
micBtn.addEventListener('click', toggleMic);

if (window.speechSynthesis) speechSynthesis.getVoices();

// ── Boot ──────────────────────────────────────────────────────────
initVoice();
