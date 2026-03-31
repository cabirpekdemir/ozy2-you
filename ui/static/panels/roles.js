/* OZY2 — Role Management Panel */

let _rolesData = [];
let _allPermissions = [];

async function init_roles(el) {
  el.innerHTML = `
    <div class="panel-wrap">
      <div class="panel-header">
        <h2>🛡️ Role Management</h2>
      </div>
      <div id="roles-body">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
    </div>`;

  try {
    const r = await fetch('/api/auth/me');
    const d = await r.json();
    const isAdmin = d.ok && d.role === 'admin';
    if (isAdmin) {
      rolesLoad();
    } else {
      rolesShowAccessDenied();
    }
  } catch {
    rolesShowAccessDenied();
  }
}

function rolesShowAccessDenied() {
  const el = document.getElementById('roles-body');
  if (!el) return;
  el.innerHTML = `
    <div class="card" style="padding:36px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:52px;margin-bottom:16px">🔒</div>
      <div style="font-size:17px;font-weight:600;margin-bottom:10px">Admin Access Required</div>
      <div style="color:var(--text-2);font-size:14px;line-height:1.7">
        Role management is only available to administrators.<br>
        Contact your admin to request access.
      </div>
    </div>`;
}

async function rolesLoad() {
  const el = document.getElementById('roles-body');
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="margin:40px auto"></div>`;
  try {
    const r = await fetch('/api/roles');
    const d = await r.json();
    _rolesData = d.roles || [];
    _allPermissions = d.all_permissions || [];
    rolesRender();
  } catch {
    el.innerHTML = `<div style="color:var(--text-3);padding:20px">Failed to load roles.</div>`;
  }
}

function rolesRender() {
  const el = document.getElementById('roles-body');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="font-size:13px;color:var(--text-3)">${_rolesData.length} roles</div>
      <button class="btn btn-primary btn-sm" onclick="rolesShowCreateModal()">+ Create Role</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${_rolesData.map(role => rolesCardHTML(role)).join('')}
    </div>
    <div id="roles-modal-overlay" style="display:none"></div>`;
}

function rolesCardHTML(role) {
  const color = role.color || 'var(--accent)';
  const perms = role.permissions || [];
  return `
    <div class="card" style="padding:16px 20px;border-left:4px solid ${color}">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="font-size:28px;flex-shrink:0">${role.icon || '👤'}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:15px;font-weight:600">${role.name || role.id}</span>
            <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${color}22;color:${color};
              border:1px solid ${color}44;font-weight:500">Level ${role.level ?? '—'}</span>
            ${role.has_pin ? `<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:var(--bg2);
              color:var(--text-3);border:1px solid var(--card-border)">🔐 PIN set</span>` : ''}
            <span style="font-size:11px;color:var(--text-3)">${perms.length} permission${perms.length!==1?'s':''}</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${perms.slice(0,8).map(p => `
              <span style="font-size:11px;padding:2px 7px;border-radius:4px;background:var(--bg2);
                color:var(--text-2);border:1px solid var(--card-border);font-family:monospace">${p}</span>`).join('')}
            ${perms.length > 8 ? `<span style="font-size:11px;color:var(--text-3);padding:2px 4px">+${perms.length-8} more</span>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="rolesShowEditModal('${role.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="rolesShowPinModal('${role.id}','${(role.name||role.id).replace(/'/g,"\\'")}')">Set PIN</button>
          ${role.id !== 'admin' ? `<button class="btn btn-ghost btn-sm" style="color:#dc2626"
            onclick="rolesConfirmDelete('${role.id}','${(role.name||role.id).replace(/'/g,"\\'")}')">Delete</button>` : ''}
        </div>
      </div>
    </div>`;
}

const ROLES_PERM_GROUPS = [
  'email', 'calendar', 'drive', 'task', 'slack', 'teams',
  'jira', 'linear', 'asana', 'hubspot', 'analytics', 'meeting', 'invoice', 'memory'
];

function rolesGroupPermissions(perms) {
  const groups = {};
  const ungrouped = [];
  for (const p of perms) {
    const dot = p.indexOf('.');
    const prefix = dot !== -1 ? p.slice(0, dot) : null;
    if (prefix && ROLES_PERM_GROUPS.includes(prefix)) {
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(p);
    } else {
      ungrouped.push(p);
    }
  }
  return {groups, ungrouped};
}

function rolesGetPermissionsHTML(selectedPerms) {
  if (!_allPermissions.length) {
    return `<textarea id="roles-perms-manual" class="input" placeholder="Enter permissions comma-separated…"
      style="width:100%;min-height:60px;resize:vertical;font-family:monospace;font-size:12px"
      >${selectedPerms.join(', ')}</textarea>`;
  }
  const {groups, ungrouped} = rolesGroupPermissions(_allPermissions);
  let html = `<div style="max-height:260px;overflow-y:auto;padding:8px;background:var(--bg2);
    border-radius:8px;border:1px solid var(--card-border);display:flex;flex-direction:column;gap:10px">`;

  const renderPerms = (perms) => perms.map(p => `
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:2px 4px;
      border-radius:4px;color:var(--text-2)" class="roles-perm-label">
      <input type="checkbox" value="${p}" ${selectedPerms.includes(p)?'checked':''}
        style="accent-color:var(--accent)">
      <span style="font-family:monospace">${p}</span>
    </label>`).join('');

  for (const prefix of ROLES_PERM_GROUPS) {
    if (!groups[prefix]?.length) continue;
    html += `
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;
          letter-spacing:.06em;margin-bottom:4px">${prefix}</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px">
          ${renderPerms(groups[prefix])}
        </div>
      </div>`;
  }

  if (ungrouped.length) {
    html += `
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;
          letter-spacing:.06em;margin-bottom:4px">other</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px">
          ${renderPerms(ungrouped)}
        </div>
      </div>`;
  }

  html += `</div>`;
  return html;
}

function rolesGetSelectedPermissions() {
  const manual = document.getElementById('roles-perms-manual');
  if (manual) return manual.value.split(',').map(p=>p.trim()).filter(Boolean);
  const checks = document.querySelectorAll('.roles-perm-label input[type=checkbox]:checked');
  return Array.from(checks).map(c => c.value);
}

function rolesShowCreateModal() {
  rolesShowModal(null);
}

function rolesShowEditModal(roleId) {
  const role = _rolesData.find(r => r.id === roleId);
  rolesShowModal(role);
}

function rolesShowModal(role) {
  const overlay = document.getElementById('roles-modal-overlay');
  if (!overlay) return;
  const isEdit = !!role;
  const perms = role?.permissions || [];
  overlay.style.display = 'block';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;
      justify-content:center;overflow-y:auto;padding:20px">
      <div class="card" style="width:520px;max-width:95vw;padding:28px">
        <div style="font-size:16px;font-weight:600;margin-bottom:20px">${isEdit ? 'Edit Role' : 'Create Role'}</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Role ID *</label>
              <input id="roles-field-id" class="input" placeholder="e.g. editor" style="width:100%"
                value="${role?.id||''}" ${isEdit?'readonly':''}>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Name *</label>
              <input id="roles-field-name" class="input" placeholder="e.g. Editor" style="width:100%"
                value="${role?.name||''}">
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div>
              <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Level</label>
              <input id="roles-field-level" class="input" type="number" min="1" max="10" placeholder="5"
                style="width:100%" value="${role?.level??''}">
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Color</label>
              <input id="roles-field-color" class="input" type="color" style="width:100%;height:38px;padding:4px"
                value="${role?.color||'#6366f1'}">
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Icon (emoji)</label>
              <input id="roles-field-icon" class="input" placeholder="👤" style="width:100%;font-size:18px"
                value="${role?.icon||''}">
            </div>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:6px">Permissions</label>
            ${rolesGetPermissionsHTML(perms)}
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button class="btn btn-ghost" onclick="rolesCloseModal()">Cancel</button>
          <button class="btn btn-primary" onclick="rolesSaveRole(${isEdit?`'${role?.id}'`:'null'})">${isEdit?'Save Changes':'Create Role'}</button>
        </div>
      </div>
    </div>`;
}

function rolesCloseModal() {
  const overlay = document.getElementById('roles-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function rolesSaveRole(existingId) {
  const id = document.getElementById('roles-field-id')?.value.trim();
  const name = document.getElementById('roles-field-name')?.value.trim();
  const level = parseInt(document.getElementById('roles-field-level')?.value) || 0;
  const color = document.getElementById('roles-field-color')?.value || '#6366f1';
  const icon = document.getElementById('roles-field-icon')?.value.trim() || '👤';
  const permissions = rolesGetSelectedPermissions();
  if (!id || !name) { toast('Role ID and name are required', 'error'); return; }

  const isEdit = !!existingId;
  const url = isEdit ? `/api/roles/${existingId}` : '/api/roles';
  const method = isEdit ? 'PATCH' : 'POST';

  try {
    const r = await fetch(url, {
      method,
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({id, name, level, color, icon, permissions})
    });
    const d = await r.json();
    if (d.ok) {
      toast(isEdit ? 'Role updated' : 'Role created', 'success');
      rolesCloseModal();
      rolesLoad();
    } else {
      toast(d.error || 'Failed to save role', 'error');
    }
  } catch {
    toast('Failed to save role', 'error');
  }
}

function rolesShowPinModal(roleId, roleName) {
  const overlay = document.getElementById('roles-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:360px;max-width:95vw;padding:28px">
        <div style="font-size:16px;font-weight:600;margin-bottom:6px">Set PIN</div>
        <div style="font-size:13px;color:var(--text-3);margin-bottom:20px">For role: <strong>${roleName}</strong></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">New PIN (min 4 characters)</label>
            <input id="roles-pin-input" class="input" type="password" placeholder="Enter PIN…" style="width:100%"
              minlength="4" autocomplete="new-password">
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-3);display:block;margin-bottom:4px">Confirm PIN</label>
            <input id="roles-pin-confirm" class="input" type="password" placeholder="Confirm PIN…" style="width:100%"
              autocomplete="new-password">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button class="btn btn-ghost" onclick="rolesCloseModal()">Cancel</button>
          <button class="btn btn-primary" onclick="rolesSetPin('${roleId}')">Set PIN</button>
        </div>
      </div>
    </div>`;
}

async function rolesSetPin(roleId) {
  const pin = document.getElementById('roles-pin-input')?.value;
  const confirm = document.getElementById('roles-pin-confirm')?.value;
  if (!pin || pin.length < 4) { toast('PIN must be at least 4 characters', 'error'); return; }
  if (pin !== confirm) { toast('PINs do not match', 'error'); return; }
  try {
    const r = await fetch(`/api/roles/${roleId}/pin`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({pin})
    });
    const d = await r.json();
    if (d.ok) {
      toast('PIN updated', 'success');
      rolesCloseModal();
      rolesLoad();
    } else {
      toast(d.error || 'Failed to set PIN', 'error');
    }
  } catch {
    toast('Failed to set PIN', 'error');
  }
}

function rolesConfirmDelete(roleId, roleName) {
  const overlay = document.getElementById('roles-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:360px;max-width:95vw;padding:28px;text-align:center">
        <div style="font-size:36px;margin-bottom:12px">⚠️</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Delete Role?</div>
        <div style="font-size:14px;color:var(--text-2);margin-bottom:20px">
          Are you sure you want to delete <strong>${roleName}</strong>?<br>
          This action cannot be undone.
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-ghost" onclick="rolesCloseModal()">Cancel</button>
          <button class="btn btn-primary" style="background:#dc2626;border-color:#dc2626"
            onclick="rolesDeleteRole('${roleId}')">Delete</button>
        </div>
      </div>
    </div>`;
}

async function rolesDeleteRole(roleId) {
  if (roleId === 'admin') { toast('Cannot delete admin role', 'error'); return; }
  try {
    const r = await fetch(`/api/roles/${roleId}`, {method: 'DELETE'});
    const d = await r.json();
    if (d.ok) {
      toast('Role deleted', 'success');
      rolesCloseModal();
      rolesLoad();
    } else {
      toast(d.error || 'Failed to delete role', 'error');
    }
  } catch {
    toast('Failed to delete role', 'error');
  }
}
