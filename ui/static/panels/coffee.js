/* OZY2 — Support / Buy Me a Coffee Panel */

function init_coffee(el) {
  el.innerHTML = `
    <div style="max-width:640px;margin:0 auto;padding:24px 16px">

      <!-- Hero -->
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:64px;margin-bottom:12px">☕</div>
        <div style="font-size:24px;font-weight:800;margin-bottom:8px">Support OZY</div>
        <div style="font-size:14px;color:var(--text-3);max-width:400px;margin:0 auto;line-height:1.6">
          OZY is built by a solo developer and runs 100% locally — your data never leaves your device.
          If it saves you time, consider buying me a coffee! ☕
        </div>
      </div>

      <!-- Tiers -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:32px">
        ${[
          {emoji:'☕', label:'One Coffee', amount:'$3', note:'Keep the caffeine flowing', url:'https://buymeacoffee.com/cabirpekdemir'},
          {emoji:'☕☕', label:'Double Shot', amount:'$6', note:'Extra energy = more features!', url:'https://buymeacoffee.com/cabirpekdemir'},
          {emoji:'🫶', label:'Big Thanks', amount:'$12', note:'You\'re amazing, thank you!', url:'https://buymeacoffee.com/cabirpekdemir'},
        ].map(t => `
          <a href="${t.url}" target="_blank" rel="noopener"
            style="display:block;text-decoration:none;background:var(--card-bg);
                   border:1px solid var(--card-border);border-radius:var(--r-lg);
                   padding:20px;text-align:center;cursor:pointer;transition:transform .15s;
                   color:var(--text-1)"
            onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='var(--accent)'"
            onmouseout="this.style.transform='';this.style.borderColor='var(--card-border)'">
            <div style="font-size:32px;margin-bottom:8px">${t.emoji}</div>
            <div style="font-size:16px;font-weight:700;margin-bottom:4px">${t.amount}</div>
            <div style="font-size:13px;font-weight:600;color:var(--text-2);margin-bottom:4px">${t.label}</div>
            <div style="font-size:11px;color:var(--text-3)">${t.note}</div>
          </a>`).join('')}
      </div>

      <!-- Other ways to support -->
      <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--r-lg);padding:20px;margin-bottom:20px">
        <div style="font-size:14px;font-weight:600;margin-bottom:14px">Other ways to support 🙏</div>
        <div style="display:flex;flex-direction:column;gap:10px">

          <a href="https://github.com/cabirpekdemir/ozy2-you" target="_blank" rel="noopener"
            style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                   background:var(--bg-base,#0e1018);border:1px solid var(--card-border);
                   border-radius:10px;text-decoration:none;color:var(--text-1);transition:border-color .2s"
            onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <span style="font-size:22px">⭐</span>
            <div>
              <div style="font-size:13px;font-weight:600">Star on GitHub</div>
              <div style="font-size:11px;color:var(--text-3)">github.com/cabirpekdemir/ozy2-you — free & really helps!</div>
            </div>
            <span style="margin-left:auto;color:var(--text-3);font-size:14px">→</span>
          </a>

          <button onclick="coffeeShare()"
            style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                   background:var(--bg-base,#0e1018);border:1px solid var(--card-border);
                   border-radius:10px;cursor:pointer;color:var(--text-1);width:100%;text-align:left;
                   transition:border-color .2s"
            onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <span style="font-size:22px">🔗</span>
            <div>
              <div style="font-size:13px;font-weight:600">Share OZY</div>
              <div style="font-size:11px;color:var(--text-3)">Tell a friend or share on social media</div>
            </div>
            <span style="margin-left:auto;color:var(--text-3);font-size:14px">↗</span>
          </button>

          <a href="mailto:cabir@pekdemir.com?subject=OZY%20Feedback"
            style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                   background:var(--bg-base,#0e1018);border:1px solid var(--card-border);
                   border-radius:10px;text-decoration:none;color:var(--text-1);transition:border-color .2s"
            onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--card-border)'">
            <span style="font-size:22px">💌</span>
            <div>
              <div style="font-size:13px;font-weight:600">Send Feedback</div>
              <div style="font-size:11px;color:var(--text-3)">Feature requests, bugs, ideas — I read every email</div>
            </div>
            <span style="margin-left:auto;color:var(--text-3);font-size:14px">→</span>
          </a>
        </div>
      </div>

      <!-- Message -->
      <div style="background:linear-gradient(135deg,rgba(245,158,11,.1),rgba(249,115,22,.07));
           border:1px solid rgba(245,158,11,.25);border-radius:var(--r-lg);padding:20px;text-align:center">
        <div style="font-size:18px;margin-bottom:8px">🤍</div>
        <div style="font-size:13px;color:var(--text-2);line-height:1.7">
          Every coffee funds server costs, new features, and late-night coding sessions.<br>
          <strong>Thank you for using OZY — it means the world!</strong>
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-top:10px">— Cabir, maker of OZY</div>
      </div>
    </div>`;
}

function coffeeShare() {
  const text = 'Check out OZY — a personal AI assistant that runs locally with no cloud sync. Really useful! https://ozy2.com';
  if (navigator.share) {
    navigator.share({ title: 'OZY — Personal AI Assistant', text, url: 'https://ozy2.com' }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(text).then(() => {
      const btn = event.currentTarget;
      const orig = btn.querySelector('div:first-child').textContent;
      btn.querySelector('div:first-child').textContent = '✅ Copied to clipboard!';
      setTimeout(() => { btn.querySelector('div:first-child').textContent = orig; }, 2000);
    }).catch(() => { window.open('https://ozy2.com', '_blank'); });
  }
}
