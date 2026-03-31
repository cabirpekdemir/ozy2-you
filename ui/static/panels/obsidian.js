/* OZY2 — Obsidian Panel */

function init_obsidian(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>💎 Obsidian</h2>
      </div>

      <!-- Info card -->
      <div class="card" style="padding:36px;text-align:center;max-width:520px;margin:0 auto">
        <div style="font-size:56px;margin-bottom:16px">💎</div>
        <div style="font-size:17px;font-weight:600;margin-bottom:10px">Obsidian Vault Access via AI</div>
        <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:24px;max-width:380px;margin-left:auto;margin-right:auto">
          Obsidian notes live locally on your machine and are accessed through the AI assistant.
          Ask me anything about your vault — search, summarize, or find connections.
        </div>
        <button class="btn btn-primary" onclick="showPanel('chat')" style="margin-bottom:24px">
          Open Chat →
        </button>

        <!-- Tips -->
        <div style="border-top:1px solid var(--card-border);padding-top:20px;text-align:left">
          <div style="font-size:12px;font-weight:600;color:var(--text-3);margin-bottom:10px;letter-spacing:0.05em">
            EXAMPLE PROMPTS
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              'Search my Obsidian notes for project ideas',
              'Summarize my daily notes from this week',
              'Find notes related to machine learning',
              'What did I write about goals last month?',
            ].map(tip => `
              <div class="card" style="padding:10px 14px;cursor:pointer;text-align:left;
                font-size:13px;color:var(--text-2);display:flex;align-items:center;gap:8px"
                onclick="obsidianSendTip(this.dataset.tip)" data-tip="${tip}">
                <span style="color:var(--accent);font-size:16px">✦</span>
                <span>"${tip}"</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function obsidianSendTip(tip) {
  // Navigate to chat and pre-fill the query
  showPanel('chat');
  // Give the chat panel a moment to initialize, then fill in the input
  setTimeout(() => {
    const chatInput = document.getElementById('chat-input') ||
                      document.querySelector('#panel-chat textarea') ||
                      document.querySelector('#panel-chat input[type="text"]');
    if (chatInput) {
      chatInput.value = tip;
      chatInput.focus();
    }
  }, 150);
}
