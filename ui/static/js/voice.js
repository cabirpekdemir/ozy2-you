/* OZY — Voice-First Accessible Assistant
   WCAG 2.1 AAA compliant · SpeechRecognition + TTS
   Keyboard: Space=mic, Esc=interrupt, C=clear
*/
'use strict';

// ── State ─────────────────────────────────────────────────────────
let _recognition  = null;
let _listening    = false;
let _speaking     = false;
let _thinking     = false;
let _autoListen   = true;
let _aiName       = 'OZY';
let _aiAvatar     = '🤖';
let _currentAudio = null;
let _abortCtrl    = null;

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
  ready:     { 'tr-TR':'Dinlemeye hazır — Boşluk tuşuna veya mikrofona dokunun.',
                'en-US':'Ready — press Space or tap the microphone.',
                'de-DE':'Bereit — Leertaste drücken oder Mikrofon antippen.',
                'fr-FR':'Prêt — appuyez sur Espace ou touchez le microphone.',
                'es-ES':'Listo — presiona Espacio o toca el micrófono.',
                'pt-PT':'Pronto — pressione Espaço ou toque no microfone.',
                'it-IT':'Pronto — premi Spazio o tocca il microfono.',
                'ar-SA':'جاهز — اضغط المسافة أو المايكروفون.',
                'ja-JP':'準備完了 — スペースキーかマイクをタップしてください。',
                'zh-CN':'就绪 — 按空格键或点击麦克风。' },
  listening: { 'tr-TR':'Dinliyorum…', 'en-US':'Listening…', 'de-DE':'Ich höre…',
                'fr-FR':'J\'écoute…', 'es-ES':'Escuchando…', 'pt-PT':'Ouvindo…',
                'it-IT':'Ascolto…', 'ar-SA':'أستمع…', 'ja-JP':'聞いています…', 'zh-CN':'正在听…' },
  thinking:  { 'tr-TR':'Düşünüyorum…', 'en-US':'Thinking…', 'de-DE':'Denke nach…',
                'fr-FR':'Je réfléchis…', 'es-ES':'Pensando…', 'pt-PT':'Pensando…',
                'it-IT':'Sto pensando…', 'ar-SA':'أفكر…', 'ja-JP':'考え中…', 'zh-CN':'思考中…' },
  speaking:  { 'tr-TR':'Konuşuyorum…', 'en-US':'Speaking…', 'de-DE':'Ich spreche…',
                'fr-FR':'Je parle…', 'es-ES':'Hablando…', 'pt-PT':'Falando…',
                'it-IT':'Sto parlando…', 'ar-SA':'أتحدث…', 'ja-JP':'話しています…', 'zh-CN':'正在说话…' },
  no_speech: { 'tr-TR':'Ses algılanamadı. Tekrar deneyin.',
                'en-US':'No speech detected. Try again.',
                'de-DE':'Keine Sprache erkannt. Erneut versuchen.',
                'fr-FR':'Aucune parole détectée. Réessayez.',
                'es-ES':'No se detectó voz. Inténtelo de nuevo.',
                'pt-PT':'Nenhuma fala detectada. Tente novamente.',
                'it-IT':'Nessun parlato rilevato. Riprova.',
                'ar-SA':'لم يُكتشف كلام. حاول مجدداً.',
                'ja-JP':'音声が検出されませんでした。もう一度お試しください。',
                'zh-CN':'未检测到语音，请重试。' },
};

function t(key) {
  const lang = langSel.value;
  return (STRINGS[key] || {})[lang] || (STRINGS[key] || {})['en-US'] || key;
}

// Greetings by language (uses AI name + user name)
function buildGreeting(userName) {
  const aiN = _aiName;
  const uN  = userName ? userName.split(' ')[0] : '';
  const lang = langSel.value;
  const G = {
    'tr-TR': uN ? `Merhaba ${uN}! Ben ${aiN}. Boşluk tuşuna basarak veya mikrofon düğmesine dokunarak benimle konuşabilirsin. Nasıl yardımcı olabilirim?`
                : `Merhaba! Ben ${aiN}, yapay zeka asistanın. Boşluk tuşuna basarak seninle konuşabilirim. Ne öğrenmek ya da yapmak istiyorsun?`,
    'en-US': uN ? `Hey ${uN}! I'm ${aiN}, your personal AI assistant. Press Space or tap the microphone anytime to talk to me. How can I help you today?`
                : `Hello! I'm ${aiN}, your personal AI assistant. Press Space or tap the microphone to start talking. I'm here for you — what's on your mind?`,
    'de-DE': uN ? `Hallo ${uN}! Ich bin ${aiN}. Drücke die Leertaste oder tippe auf das Mikrofon, um mit mir zu sprechen. Wie kann ich dir helfen?`
                : `Hallo! Ich bin ${aiN}, dein KI-Assistent. Drücke die Leertaste, um zu sprechen. Wie kann ich helfen?`,
    'fr-FR': uN ? `Bonjour ${uN}! Je suis ${aiN}. Appuie sur Espace ou touche le microphone pour me parler. Comment puis-je t'aider?`
                : `Bonjour! Je suis ${aiN}. Appuie sur Espace pour commencer à parler. Comment puis-je t'aider?`,
    'es-ES': uN ? `Hola ${uN}! Soy ${aiN}. Presiona Espacio o toca el micrófono para hablar conmigo. ¿En qué puedo ayudarte?`
                : `Hola! Soy ${aiN}. Presiona Espacio para empezar a hablar. ¿En qué puedo ayudarte?`,
    'pt-PT': uN ? `Olá ${uN}! Sou ${aiN}. Pressione Espaço ou toque no microfone para falar comigo. Como posso ajudar?`
                : `Olá! Sou ${aiN}. Pressione Espaço para começar. Como posso ajudar?`,
    'it-IT': uN ? `Ciao ${uN}! Sono ${aiN}. Premi Spazio o tocca il microfono per parlarmi. Come posso aiutarti?`
                : `Ciao! Sono ${aiN}. Premi Spazio per iniziare. Come posso aiutarti?`,
    'ar-SA': uN ? `مرحباً ${uN}! أنا ${aiN}. اضغط المسافة أو المايكروفون للتحدث معي. كيف يمكنني مساعدتك؟`
                : `مرحباً! أنا ${aiN}. اضغط على مفتاح المسافة للبدء. كيف يمكنني مساعدتك؟`,
    'ja-JP': uN ? `こんにちは、${uN}さん！私は${aiN}です。スペースキーかマイクボタンを押して話しかけてください。`
                : `こんにちは！私は${aiN}です。スペースキーを押して話しかけてください。`,
    'zh-CN': uN ? `你好，${uN}！我是${aiN}。按空格键或点击麦克风按钮与我交流。我能帮你什么？`
                : `你好！我是${aiN}。按空格键开始说话。我能帮你什么？`,
  };
  return G[lang] || G['en-US'];
}

// ── Init ──────────────────────────────────────────────────────────
async function initVoice() {
  // 1. Load AI persona from settings
  let userName = '';
  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    _aiName   = d.settings?.ai_name   || 'OZY';
    _aiAvatar = d.settings?.ai_avatar || '🤖';
    userName  = d.settings?.user_name  || '';
  } catch(_) {}

  $('ai-name').textContent = _aiName;
  $('avatar').textContent  = _aiAvatar;
  document.title = `${_aiName} — Voice`;

  // 2. Match language from settings
  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const appLang = d.settings?.language || navigator.language?.slice(0,2) || 'en';
    const map = { tr:'tr-TR', en:'en-US', de:'de-DE', fr:'fr-FR', es:'es-ES',
                  pt:'pt-PT', it:'it-IT', ar:'ar-SA', ja:'ja-JP', zh:'zh-CN' };
    const lc = map[appLang] || 'en-US';
    langSel.value = lc;
  } catch(_) {}

  // 3. Check speech recognition support
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    $('no-stt-warn').style.display = 'block';
    setStatus('error', '', 'Speech recognition unavailable — use Chrome or Edge');
  }

  // 4. Proactively request mic permission via getUserMedia
  //    This triggers the browser's native permission popup immediately
  let micGranted = false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach(t => t.stop()); // stop immediately — we just needed the permission
    micGranted = true;
  } catch(permErr) {
    // Permission denied or no mic — show visual guide
    _showMicDenied();
  }

  // 5. Setup recognition (even if mic denied — user might fix it later)
  setupRecognition();

  // 6. Play welcome greeting
  setStatus('speaking', 'speaking', t('speaking'));
  const greeting = buildGreeting(userName);
  appendMsg(greeting, 'ai');
  await speak(greeting);

  // 7. After greeting, focus mic
  if (micGranted) {
    setStatus('ready', '', t('ready'));
    micBtn.focus();
  }
}

// ── Mic denied: visual guide ──────────────────────────────────────
function _showMicDenied() {
  setStatus('error', '', 'Microphone access denied');

  // Show a visual how-to in the conversation log
  const div = document.createElement('div');
  div.style.cssText = 'margin-bottom:14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:14px 16px;font-size:.88rem;line-height:1.7';
  div.innerHTML = `
    <div style="font-weight:700;color:#f87171;margin-bottom:8px">🎙️ Microphone access needed</div>
    <div style="color:#ddd;margin-bottom:10px">
      To talk to me, please allow microphone access:<br>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="background:#222;border:1px solid #444;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;font-weight:700">1</span>
        <span>Click the <strong style="color:#fcd34d">🔒 lock icon</strong> in the address bar (top left)</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="background:#222;border:1px solid #444;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;font-weight:700">2</span>
        <span>Find <strong style="color:#fcd34d">Microphone</strong> → change to <strong style="color:#86efac">Allow</strong></span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="background:#222;border:1px solid #444;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;font-weight:700">3</span>
        <span>Click the button below to reload</span>
      </div>
    </div>
    <button onclick="location.reload()"
      style="width:100%;padding:10px;border-radius:10px;border:none;
             background:#6366f1;color:#fff;font-size:.9rem;font-weight:700;cursor:pointer">
      🔄 Reload & try again
    </button>`;
  convo.appendChild(div);
  convo.scrollTop = convo.scrollHeight;

  // Update mic button to show it's blocked
  micBtn.innerHTML = '🚫';
  micBtn.style.borderColor = 'var(--danger)';
  micBtn.onclick = () => {
    // Re-request permission on click
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(s => { s.getTracks().forEach(t=>t.stop()); location.reload(); })
      .catch(() => {});
  };
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
    micBtn.setAttribute('aria-label', 'Stop listening — press Space');
    setStatus('listening', 'listening', t('listening'));
    announce(t('listening'));
  };

  _recognition.onresult = e => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final   += e.results[i][0].transcript;
      else                       interim += e.results[i][0].transcript;
    }
    // Interim display
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

  let _micDeniedShown = false;
  _recognition.onerror = e => {
    _listening = false;
    if (_interimEl) { _interimEl.remove(); _interimEl = null; }
    if (e.error === 'no-speech') {
      setStatus('ready', '', t('no_speech'));
    } else if (e.error === 'not-allowed') {
      // Only show the guide once to avoid duplicates
      if (!_micDeniedShown) {
        _micDeniedShown = true;
        _showMicDenied();
      }
    } else {
      setStatus('ready', '', `Error: ${e.error}`);
    }
    micBtn.className = '';
    micBtn.setAttribute('aria-pressed', 'false');
    micBtn.setAttribute('aria-label', 'Start listening — press Space');
  };

  _recognition.onend = () => {
    _listening = false;
    if (_interimEl) { _interimEl.remove(); _interimEl = null; }
    if (!_thinking && !_speaking) {
      micBtn.className = '';
      micBtn.setAttribute('aria-pressed', 'false');
      micBtn.setAttribute('aria-label', 'Start listening — press Space');
      setStatus('ready', '', t('ready'));
    }
  };
}

// ── Mic toggle ────────────────────────────────────────────────────
function toggleMic() {
  // Interrupt speech
  if (_speaking) {
    interrupt();
    return;
  }
  // Stop listening
  if (_listening) {
    _recognition?.stop();
    return;
  }
  // Don't start while thinking
  if (_thinking) return;

  // Start
  if (!_recognition) setupRecognition();
  if (!_recognition) return;
  _recognition.lang = langSel.value;
  try { _recognition.start(); }
  catch(_) { /* already started */ }
}

function interrupt() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.src = '';
    _currentAudio = null;
  }
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (_abortCtrl) { _abortCtrl.abort(); _abortCtrl = null; }
  _speaking = false;
  _thinking = false;
  micBtn.className = '';
  setStatus('ready', '', t('ready'));
}

// ── Process user input → AI ───────────────────────────────────────
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
    const dec    = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const raw = dec.decode(value);
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try { const j = JSON.parse(data); if (j.chunk) full += j.chunk; } catch(_) {}
      }
    }

    _thinking = false;
    _abortCtrl = null;

    // Strip markdown for cleaner display and speech
    const clean = full
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();

    appendMsg(clean || '…', 'ai');

    // Speak the response
    setStatus('speaking', 'speaking', t('speaking'));
    micBtn.className = 'speaking';
    announce(`${_aiName}: ${clean.slice(0, 160)}`);
    await speak(clean || full);

    // Auto-listen loop
    if (_autoListen && _recognition && !_listening) {
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

// ── TTS (server + browser fallback) ──────────────────────────────
async function speak(text) {
  if (!text?.trim()) return;
  _speaking = true;

  // Split long text into chunks (TTS has 2000 char limit)
  const MAX = 1800;
  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > MAX) {
    // Try to split at sentence boundary
    let cut = remaining.lastIndexOf('. ', MAX);
    if (cut < MAX / 2) cut = MAX;
    chunks.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }
  if (remaining) chunks.push(remaining);

  for (const chunk of chunks) {
    if (!_speaking) break; // interrupted
    await _speakChunk(chunk);
  }

  _speaking = false;
}

async function _speakChunk(text) {
  // Try server TTS first
  try {
    const r = await fetch('/api/tts/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (r.ok && r.headers.get('content-type')?.includes('audio')) {
      const blob = await r.blob();
      if (blob.size > 100) {
        const url = URL.createObjectURL(blob);
        _currentAudio = new Audio(url);
        _currentAudio.volume = 1.0;
        await new Promise(resolve => {
          _currentAudio.onended  = resolve;
          _currentAudio.onerror  = resolve;
          _currentAudio.play().catch(resolve);
        });
        URL.revokeObjectURL(url);
        _currentAudio = null;
        return;
      }
    }
  } catch(_) {}

  // Fallback: Web Speech Synthesis (always available in browser)
  await _webSynthFallback(text);
}

function _webSynthFallback(text) {
  if (!window.speechSynthesis) return Promise.resolve();
  speechSynthesis.cancel();
  return new Promise(resolve => {
    const utt  = new SpeechSynthesisUtterance(text.slice(0, 2000));
    utt.lang   = langSel.value;
    utt.rate   = 0.95;
    utt.pitch  = 1.05;
    utt.volume = 1;
    // Pick a natural-sounding voice if available
    const voices = speechSynthesis.getVoices();
    const match  = voices.find(v => v.lang.startsWith(langSel.value.slice(0,2)) && !v.name.includes('compact'));
    if (match) utt.voice = match;
    utt.onend   = resolve;
    utt.onerror = resolve;
    speechSynthesis.speak(utt);
  });
}

// ── UI helpers ────────────────────────────────────────────────────
function setStatus(key, dotClass, text) {
  statusDot.className = dotClass;
  statusTxt.textContent = text;
  micBtn.setAttribute('aria-label',
    _listening ? `Stop listening — press Space` : `Start listening — press Space`
  );
}

function announce(text) {
  // Force screen reader re-read by toggling content
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

function clearConvo() {
  convo.innerHTML = '';
  announce('Conversation cleared');
}

// ── Controls ──────────────────────────────────────────────────────
function toggleAutoListen() {
  _autoListen = !_autoListen;
  const btn = $('auto-btn');
  btn.textContent = `🔄 Auto-listen: ${_autoListen ? 'ON' : 'OFF'}`;
  btn.setAttribute('aria-pressed', String(_autoListen));
  btn.classList.toggle('active', _autoListen);
  announce(`Auto-listen ${_autoListen ? 'enabled' : 'disabled'}`);
}

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  // Don't intercept if user is in a control
  if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;

  if (e.code === 'Space') {
    e.preventDefault();
    toggleMic();
  }
  if (e.code === 'Escape') {
    e.preventDefault();
    interrupt();
  }
  if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) {
    clearConvo();
  }
});

// ── Language change ───────────────────────────────────────────────
langSel.addEventListener('change', () => {
  if (_recognition) _recognition.lang = langSel.value;
  announce(`Language changed`);
});

// ── Mic button ────────────────────────────────────────────────────
micBtn.addEventListener('click', toggleMic);

// ── Voices load (for fallback) ────────────────────────────────────
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => {};
  speechSynthesis.getVoices(); // preload
}

// ── Boot ──────────────────────────────────────────────────────────
initVoice();
