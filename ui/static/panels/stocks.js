/* OZY2 — Stocks Panel */

const STOCKS_WATCHLIST_KEY = 'ozy2_stocks_watchlist';
const STOCKS_QUICK_CHIPS   = ['AAPL', 'TSLA', 'GOOG', 'MSFT', 'AMZN', 'BTC-USD', 'ETH-USD'];

let _stocksWatchlist = [];
let _stocksLastQuote = null;

async function init_stocks(el) {
  _stocksWatchlist = JSON.parse(localStorage.getItem(STOCKS_WATCHLIST_KEY) || '[]');

  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>📈 Stocks</h2>
      </div>

      <!-- Search bar -->
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <input id="stocks-symbol-input" class="input" placeholder="Enter symbol (e.g. AAPL, BTC-USD)"
          style="flex:1;text-transform:uppercase"
          onkeydown="if(event.key==='Enter') stocksSearch()"
          oninput="this.value=this.value.toUpperCase()">
        <button class="btn btn-primary" onclick="stocksSearch()">Search</button>
      </div>

      <!-- Quick chips -->
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px">
        ${STOCKS_QUICK_CHIPS.map(s => `
          <button class="btn btn-ghost btn-sm" onclick="stocksQuickSearch('${s}')"
            style="font-size:12px;font-family:monospace">${s}</button>`).join('')}
      </div>

      <!-- Quote result -->
      <div id="stocks-result" style="margin-bottom:24px"></div>

      <!-- Watchlist -->
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text-3);letter-spacing:0.05em;
          text-transform:uppercase;margin-bottom:10px">Watchlist</div>
        <div id="stocks-watchlist"></div>
      </div>
    </div>`;

  stocksRenderWatchlist();
}

function stocksQuickSearch(symbol) {
  const input = document.getElementById('stocks-symbol-input');
  if (input) input.value = symbol;
  stocksSearch();
}

async function stocksSearch() {
  const symbol = document.getElementById('stocks-symbol-input')?.value.trim().toUpperCase();
  if (!symbol) { toast('Enter a symbol', 'error'); return; }
  const el = document.getElementById('stocks-result');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:30px auto"></div>`;
  try {
    const r = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`);
    const d = await r.json();
    if (!d.ok) {
      el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-3)">
        <div style="font-size:32px;margin-bottom:8px">📉</div>
        <div>${d.error || 'Symbol not found.'}</div>
      </div>`;
      return;
    }
    _stocksLastQuote = d.quote;
    stocksRenderQuote(d.quote);
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to fetch quote.</div>`;
  }
}

function stocksRenderQuote(q) {
  const el = document.getElementById('stocks-result');
  if (!el) return;
  const changePos  = q.change >= 0;
  const changeColor = changePos ? '#10b981' : '#ef4444';
  const changeArrow = changePos ? '▲' : '▼';
  const inWatchlist = _stocksWatchlist.includes(q.symbol);
  const history     = q.history || [];

  el.innerHTML = `
    <div class="card" style="padding:20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:22px;font-weight:700">${q.symbol}</div>
          <div style="color:var(--text-2);font-size:13px">${q.name || ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:700">${q.currency || ''}${(q.price ?? '—').toLocaleString()}</div>
          <div style="font-size:14px;color:${changeColor};font-weight:600">
            ${changeArrow} ${Math.abs(q.change ?? 0).toFixed(2)}
            (${Math.abs(q.change_pct ?? 0).toFixed(2)}%)
          </div>
        </div>
      </div>

      <!-- OHLV stats -->
      <div style="border-top:1px solid var(--card-border);padding-top:14px;margin-top:4px;
        display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
        ${[
          ['Open',   q.open],
          ['High',   q.high],
          ['Low',    q.low],
          ['Volume', q.volume ? Number(q.volume).toLocaleString() : '—'],
        ].map(([label, val]) => `
          <div>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:2px">${label}</div>
            <div style="font-size:13px;font-weight:600;font-family:monospace">${val ?? '—'}</div>
          </div>`).join('')}
      </div>
      ${q.date ? `<div style="margin-top:10px;font-size:11px;color:var(--text-3);text-align:right">
        ${q.date} ${q.time || ''} · Stooq</div>` : ''}

      <!-- Watchlist button -->
      <div style="margin-top:14px">
        <button class="btn ${inWatchlist ? 'btn-ghost' : 'btn-primary'} btn-sm"
          onclick="stocksToggleWatchlist('${q.symbol}')">
          ${inWatchlist ? '★ In Watchlist' : '☆ Add to Watchlist'}
        </button>
      </div>
    </div>`;
}

function stocksToggleWatchlist(symbol) {
  if (_stocksWatchlist.includes(symbol)) {
    _stocksWatchlist = _stocksWatchlist.filter(s => s !== symbol);
    toast(`${symbol} removed from watchlist`, 'info');
  } else {
    _stocksWatchlist.push(symbol);
    toast(`${symbol} added to watchlist`, 'success');
  }
  localStorage.setItem(STOCKS_WATCHLIST_KEY, JSON.stringify(_stocksWatchlist));
  stocksRenderWatchlist();
  // Re-render quote card button state
  if (_stocksLastQuote?.symbol === symbol) stocksRenderQuote(_stocksLastQuote);
}

function stocksRenderWatchlist() {
  const el = document.getElementById('stocks-watchlist');
  if (!el) return;
  if (!_stocksWatchlist.length) {
    el.innerHTML = `<div style="color:var(--text-3);font-size:13px;padding:12px 0">
      No symbols in your watchlist yet. Search for a stock and click "Add to Watchlist".
    </div>`;
    return;
  }
  el.innerHTML = _stocksWatchlist.map(sym => `
    <div class="card" style="margin-bottom:8px;padding:12px 16px;display:flex;align-items:center;gap:12px">
      <span style="font-family:monospace;font-weight:600;font-size:14px;flex:1">${sym}</span>
      <button class="btn btn-ghost btn-sm" onclick="stocksQuickSearch('${sym}')">Quote</button>
      <button class="btn btn-ghost btn-sm" onclick="stocksToggleWatchlist('${sym}')"
        style="color:var(--text-3)">✕</button>
    </div>`).join('');
}
