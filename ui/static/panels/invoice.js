/* OZY2 — Invoice Generator Panel */

let _invoiceRows = [];
let _invoiceCounter = 0;

async function init_invoice(el) {
  _invoiceRows = [];
  _invoiceCounter = 0;
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🧾 Invoice Generator</h2>
      </div>
      <div id="invoice-body">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card" style="padding:20px">
            <div style="font-size:14px;font-weight:600;margin-bottom:16px">Invoice Details</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div>
                <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Client Name *</label>
                <input id="invoice-client" class="input" placeholder="Acme Corp" style="width:100%">
              </div>
              <div>
                <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Currency</label>
                <select id="invoice-currency" class="input" style="width:100%">
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="TRY">TRY — Turkish Lira</option>
                </select>
              </div>
            </div>
          </div>

          <div class="card" style="padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <div style="font-size:14px;font-weight:600">Line Items</div>
              <button class="btn btn-ghost btn-sm" onclick="invoiceAddRow()">+ Add Row</button>
            </div>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                  <tr style="border-bottom:1px solid var(--card-border)">
                    <th style="text-align:left;padding:6px 8px;color:var(--text-3);font-weight:500">Description</th>
                    <th style="text-align:right;padding:6px 8px;color:var(--text-3);font-weight:500;width:80px">Qty</th>
                    <th style="text-align:right;padding:6px 8px;color:var(--text-3);font-weight:500;width:110px">Unit Price</th>
                    <th style="text-align:right;padding:6px 8px;color:var(--text-3);font-weight:500;width:90px">Total</th>
                    <th style="width:36px"></th>
                  </tr>
                </thead>
                <tbody id="invoice-rows"></tbody>
              </table>
            </div>
            <div style="text-align:right;margin-top:16px;padding-top:12px;border-top:1px solid var(--card-border)">
              <span style="font-size:13px;color:var(--text-3)">Total: </span>
              <span id="invoice-total-display" style="font-size:18px;font-weight:700;margin-left:8px">0.00</span>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-primary" onclick="invoiceGenerate()">Generate Invoice</button>
            </div>
          </div>

          <div id="invoice-preview" style="display:none"></div>
        </div>
      </div>
    </div>`;

  invoiceAddRow();
  invoiceAddRow();
}

function invoiceAddRow() {
  const id = ++_invoiceCounter;
  _invoiceRows.push(id);
  const tbody = document.getElementById('invoice-rows');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = `invoice-row-${id}`;
  tr.style.borderBottom = '1px solid var(--card-border)';
  tr.innerHTML = `
    <td style="padding:4px 8px">
      <input class="input" id="inv-desc-${id}" placeholder="Service or product description" style="width:100%;font-size:13px"
        oninput="invoiceUpdateTotal()">
    </td>
    <td style="padding:4px 8px">
      <input class="input" id="inv-qty-${id}" type="number" min="1" value="1" style="width:100%;font-size:13px;text-align:right"
        oninput="invoiceUpdateRowTotal(${id});invoiceUpdateTotal()">
    </td>
    <td style="padding:4px 8px">
      <input class="input" id="inv-price-${id}" type="number" min="0" step="0.01" placeholder="0.00"
        style="width:100%;font-size:13px;text-align:right"
        oninput="invoiceUpdateRowTotal(${id});invoiceUpdateTotal()">
    </td>
    <td style="padding:4px 8px;text-align:right;font-size:13px;font-weight:500" id="inv-rowtotal-${id}">0.00</td>
    <td style="padding:4px 8px;text-align:center">
      <button class="btn btn-ghost btn-sm" style="padding:4px 6px;color:var(--text-3)"
        onclick="invoiceRemoveRow(${id})">×</button>
    </td>`;
  tbody.appendChild(tr);
}

function invoiceRemoveRow(id) {
  _invoiceRows = _invoiceRows.filter(r => r !== id);
  document.getElementById(`invoice-row-${id}`)?.remove();
  invoiceUpdateTotal();
}

function invoiceUpdateRowTotal(id) {
  const qty = parseFloat(document.getElementById(`inv-qty-${id}`)?.value) || 0;
  const price = parseFloat(document.getElementById(`inv-price-${id}`)?.value) || 0;
  const total = qty * price;
  const el = document.getElementById(`inv-rowtotal-${id}`);
  if (el) el.textContent = total.toFixed(2);
}

function invoiceUpdateTotal() {
  let grand = 0;
  for (const id of _invoiceRows) {
    const qty = parseFloat(document.getElementById(`inv-qty-${id}`)?.value) || 0;
    const price = parseFloat(document.getElementById(`inv-price-${id}`)?.value) || 0;
    grand += qty * price;
  }
  const el = document.getElementById('invoice-total-display');
  if (el) el.textContent = grand.toFixed(2);
}

function invoiceGetItems() {
  return _invoiceRows.map(id => ({
    description: document.getElementById(`inv-desc-${id}`)?.value.trim() || '',
    qty: parseFloat(document.getElementById(`inv-qty-${id}`)?.value) || 0,
    unit_price: parseFloat(document.getElementById(`inv-price-${id}`)?.value) || 0,
  })).filter(item => item.description || item.unit_price > 0);
}

async function invoiceGenerate() {
  const client_name = document.getElementById('invoice-client')?.value.trim();
  const currency = document.getElementById('invoice-currency')?.value || 'USD';
  const items = invoiceGetItems();
  if (!client_name) { toast('Client name is required', 'error'); return; }
  if (!items.length) { toast('Add at least one line item', 'error'); return; }

  const previewEl = document.getElementById('invoice-preview');
  if (!previewEl) return;
  previewEl.style.display = 'block';
  previewEl.innerHTML = `<div class="card" style="padding:24px;display:flex;align-items:center;gap:12px">
    <div class="spinner"></div><div style="color:var(--text-2)">Generating invoice…</div>
  </div>`;

  try {
    const r = await fetch('/api/invoice/generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({client_name, items, currency})
    });
    const d = await r.json();
    if (d.ok || d.invoice_number) {
      invoiceRenderPreview(d, client_name, items, currency);
    } else {
      invoiceRenderLocalPreview(client_name, items, currency);
    }
  } catch {
    invoiceRenderLocalPreview(client_name, items, currency);
  }
}

function invoiceRenderLocalPreview(client_name, items, currency) {
  const invoiceNumber = 'INV-' + Date.now().toString().slice(-6);
  const date = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  invoiceRenderPreview({invoice_number: invoiceNumber, date}, client_name, items, currency);
}

const CURRENCY_SYMBOLS = {USD:'$', EUR:'€', GBP:'£', TRY:'₺'};

function invoiceRenderPreview(data, client_name, items, currency) {
  const previewEl = document.getElementById('invoice-preview');
  if (!previewEl) return;
  const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
  const invoiceNumber = data.invoice_number || ('INV-' + Date.now().toString().slice(-6));
  const date = data.date || new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  const grand = items.reduce((s, i) => s + (i.qty * i.unit_price), 0);

  const rowsHTML = items.map(item => `
    <tr style="border-bottom:1px solid #e5e7eb">
      <td style="padding:10px 12px">${item.description}</td>
      <td style="padding:10px 12px;text-align:right">${item.qty}</td>
      <td style="padding:10px 12px;text-align:right">${sym}${item.unit_price.toFixed(2)}</td>
      <td style="padding:10px 12px;text-align:right;font-weight:500">${sym}${(item.qty * item.unit_price).toFixed(2)}</td>
    </tr>`).join('');

  const plainText = [
    'OZY2 Business',
    '================',
    `Invoice #: ${invoiceNumber}`,
    `Date: ${date}`,
    `Bill To: ${client_name}`,
    '',
    'LINE ITEMS',
    '----------',
    ...items.map(i => `${i.description} × ${i.qty} @ ${sym}${i.unit_price.toFixed(2)} = ${sym}${(i.qty*i.unit_price).toFixed(2)}`),
    '',
    `TOTAL: ${sym}${grand.toFixed(2)} ${currency}`,
  ].join('\n');

  previewEl.innerHTML = `
    <div class="card" style="padding:32px;max-width:640px" id="invoice-preview-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
        <div>
          <div style="font-size:22px;font-weight:700;color:var(--accent)">OZY2 Business</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:4px">Professional Services</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:700">INVOICE</div>
          <div style="font-size:13px;color:var(--text-3);margin-top:4px">#${invoiceNumber}</div>
          <div style="font-size:13px;color:var(--text-3)">${date}</div>
        </div>
      </div>

      <div style="background:var(--bg2);border-radius:8px;padding:14px 16px;margin-bottom:24px">
        <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Bill To</div>
        <div style="font-size:15px;font-weight:600">${client_name}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <thead>
          <tr style="border-bottom:2px solid var(--card-border);background:var(--bg2)">
            <th style="text-align:left;padding:10px 12px;font-weight:600">Description</th>
            <th style="text-align:right;padding:10px 12px;font-weight:600">Qty</th>
            <th style="text-align:right;padding:10px 12px;font-weight:600">Unit Price</th>
            <th style="text-align:right;padding:10px 12px;font-weight:600">Amount</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-bottom:28px">
        <div style="min-width:200px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid var(--card-border)">
            <span style="font-size:14px;font-weight:600">Total (${currency})</span>
            <span style="font-size:18px;font-weight:700;color:var(--accent)">${sym}${grand.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="font-size:12px;color:var(--text-3);text-align:center;padding-top:16px;border-top:1px solid var(--card-border)">
        Thank you for your business — OZY2 Business
      </div>
    </div>

    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-ghost btn-sm" onclick="invoiceDownloadTxt(${JSON.stringify(plainText.replace(/"/g,'&quot;'))})">Download .txt</button>
      <button class="btn btn-ghost btn-sm" onclick="window.print()">Print</button>
    </div>`;

  previewEl._plainText = plainText;
  previewEl.scrollIntoView({behavior:'smooth', block:'start'});
}

function invoiceDownloadTxt(text) {
  const previewEl = document.getElementById('invoice-preview');
  const content = previewEl?._plainText || text || '';
  const blob = new Blob([content], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
