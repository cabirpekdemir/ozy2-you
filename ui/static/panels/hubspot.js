/* OZY2 — HubSpot CRM Panel */

let _hubspotAllContacts = [];

async function init_hubspot(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🟠 HubSpot CRM</h2>
      </div>
      <div id="hubspot-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/settings');
    const d = await r.json();
    const hasToken = d.ok && d.settings?.hubspot_token;
    if (hasToken) {
      hubspotLoadContacts();
    } else {
      hubspotShowSetup();
    }
  } catch {
    hubspotShowSetup();
  }
}

function hubspotShowSetup() {
  const el = document.getElementById('hubspot-body');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">🟠</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Connect HubSpot</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7;margin-bottom:20px">
        Add your HubSpot Private App token to access your CRM contacts.<br>
        <ol style="text-align:left;margin:12px 0 0;padding-left:20px;color:var(--text-2)">
          <li>Go to <strong style="color:var(--text-1)">app.hubspot.com</strong> → Settings</li>
          <li>Navigate to <strong style="color:var(--text-1)">Integrations → Private Apps</strong></li>
          <li>Create a new private app with CRM scopes</li>
          <li>Copy the access token and paste it in Settings</li>
        </ol>
        <div style="margin-top:10px">Required setting: <strong style="color:var(--text-1)">hubspot_token</strong></div>
      </div>
      <button class="btn btn-primary" onclick="showPanel('settings')">Open Settings →</button>
    </div>`;
}

async function hubspotLoadContacts() {
  const el = document.getElementById('hubspot-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch('/api/hubspot/contacts');
    const d = await r.json();
    _hubspotAllContacts = d.contacts || [];
    hubspotRenderContacts(_hubspotAllContacts);
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load contacts.</div>`;
  }
}

function hubspotRenderContacts(contacts) {
  const el = document.getElementById('hubspot-body');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px">
      <input id="hubspot-search" class="input" placeholder="Search contacts…" style="flex:1"
        oninput="hubspotFilterContacts(this.value)">
      <button class="btn btn-primary btn-sm" onclick="hubspotShowAddModal()" style="flex-shrink:0">+ Add Contact</button>
    </div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--text-3)">${contacts.length} contacts</div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px" id="hubspot-table">
        <thead>
          <tr style="border-bottom:1px solid var(--card-border)">
            <th style="text-align:left;padding:8px 12px;color:var(--text-3);font-weight:500">Name</th>
            <th style="text-align:left;padding:8px 12px;color:var(--text-3);font-weight:500">Email</th>
            <th style="text-align:left;padding:8px 12px;color:var(--text-3);font-weight:500">Phone</th>
          </tr>
        </thead>
        <tbody id="hubspot-tbody">
          ${hubspotRowsHTML(contacts)}
        </tbody>
      </table>
      ${!contacts.length ? `<div style="text-align:center;padding:40px;color:var(--text-3)">
        <div style="font-size:36px;margin-bottom:10px">👥</div>
        <div>No contacts found</div>
      </div>` : ''}
    </div>
    <div id="hubspot-modal-overlay" style="display:none"></div>`;
}

function hubspotRowsHTML(contacts) {
  return contacts.map(c => {
    const name = [c.firstname || c.properties?.firstname, c.lastname || c.properties?.lastname].filter(Boolean).join(' ') || 'Unknown';
    const email = c.email || c.properties?.email || '—';
    const phone = c.phone || c.properties?.phone || '—';
    return `
      <tr style="border-bottom:1px solid var(--card-border);transition:background .15s"
        onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
        <td style="padding:10px 12px;font-weight:500">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;
              justify-content:center;font-size:12px;font-weight:600;color:#fff;flex-shrink:0">
              ${name[0]?.toUpperCase() || '?'}
            </div>
            ${name}
          </div>
        </td>
        <td style="padding:10px 12px;color:var(--text-2)">${email}</td>
        <td style="padding:10px 12px;color:var(--text-2)">${phone}</td>
      </tr>`;
  }).join('');
}

function hubspotFilterContacts(query) {
  const q = query.toLowerCase();
  const filtered = _hubspotAllContacts.filter(c => {
    const name = [c.firstname || c.properties?.firstname, c.lastname || c.properties?.lastname].filter(Boolean).join(' ').toLowerCase();
    const email = (c.email || c.properties?.email || '').toLowerCase();
    const phone = (c.phone || c.properties?.phone || '').toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });
  const tbody = document.getElementById('hubspot-tbody');
  if (tbody) tbody.innerHTML = hubspotRowsHTML(filtered);
}

function hubspotShowAddModal() {
  const overlay = document.getElementById('hubspot-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:440px;max-width:95vw;padding:28px">
        <div style="font-size:16px;font-weight:600;margin-bottom:20px">Add HubSpot Contact</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">First Name *</label>
              <input id="hubspot-new-first" class="input" placeholder="First name" style="width:100%">
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Last Name</label>
              <input id="hubspot-new-last" class="input" placeholder="Last name" style="width:100%">
            </div>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Email *</label>
            <input id="hubspot-new-email" class="input" type="email" placeholder="email@example.com" style="width:100%">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Phone</label>
            <input id="hubspot-new-phone" class="input" type="tel" placeholder="+1 555 000 0000" style="width:100%">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button class="btn btn-ghost" onclick="hubspotCloseModal()">Cancel</button>
          <button class="btn btn-primary" onclick="hubspotAddContact()">Add Contact</button>
        </div>
      </div>
    </div>`;
}

function hubspotCloseModal() {
  const overlay = document.getElementById('hubspot-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function hubspotAddContact() {
  const firstname = document.getElementById('hubspot-new-first')?.value.trim();
  const lastname = document.getElementById('hubspot-new-last')?.value.trim();
  const email = document.getElementById('hubspot-new-email')?.value.trim();
  const phone = document.getElementById('hubspot-new-phone')?.value.trim();
  if (!firstname || !email) { toast('First name and email are required', 'error'); return; }
  try {
    const r = await fetch('/api/hubspot/contacts', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({firstname, lastname, email, phone: phone || undefined})
    });
    const d = await r.json();
    if (d.ok || d.id) {
      toast('Contact added', 'success');
      hubspotCloseModal();
      hubspotLoadContacts();
    } else {
      toast(d.error || 'Failed to add contact', 'error');
    }
  } catch {
    toast('Failed to add contact', 'error');
  }
}
