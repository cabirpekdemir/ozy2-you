/* OZY2 — Nutrition & Recipe Panel */

function init_nutrition(el) {
  el.innerHTML = `
    <div style="max-width:720px;margin:0 auto;padding:16px">
      <div style="display:flex;gap:6px;background:var(--card-bg);border:1px solid var(--card-border);
                  border-radius:var(--r-lg);padding:4px;margin-bottom:20px">
        <button id="nt-tab-track" onclick="ntTab('track')"
          style="flex:1;padding:8px;border:none;border-radius:8px;font-size:13px;font-weight:600;
                 cursor:pointer;background:var(--accent);color:#fff;transition:all .15s">
          🥗 Tracker
        </button>
        <button id="nt-tab-recipe" onclick="ntTab('recipe')"
          style="flex:1;padding:8px;border:none;border-radius:8px;font-size:13px;font-weight:600;
                 cursor:pointer;background:transparent;color:var(--text-3);transition:all .15s">
          🍳 Recipes
        </button>
      </div>

      <!-- TRACKER -->
      <div id="nt-track">
        <div style="display:flex;gap:12px;margin-bottom:20px">
          <div style="flex:1;background:var(--card-bg);border:1px solid var(--card-border);
                      border-radius:var(--r-lg);padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:700;color:var(--accent)" id="nt-cal-total">0</div>
            <div style="font-size:12px;color:var(--text-3)">kcal today</div>
          </div>
          <div style="flex:1;background:var(--card-bg);border:1px solid var(--card-border);
                      border-radius:var(--r-lg);padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:700;color:#38bdf8" id="nt-water-total">0</div>
            <div style="font-size:12px;color:var(--text-3)">ml water</div>
          </div>
        </div>

        ${[['breakfast','🌅','Breakfast'],['lunch','☀️','Lunch'],['dinner','🌙','Dinner'],['snack','🍎','Snacks']]
          .map(([type,icon,label]) => `
          <div style="background:var(--card-bg);border:1px solid var(--card-border);
                      border-radius:var(--r-lg);padding:16px;margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div style="font-size:15px;font-weight:600">${icon} ${label}</div>
              <button onclick="ntAddMeal('${type}')"
                style="background:var(--accent-dim);color:var(--accent);border:none;
                       border-radius:8px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer">+ Add</button>
            </div>
            <div id="nt-meals-${type}" style="display:flex;flex-direction:column;gap:6px">
              <div style="color:var(--text-3);font-size:13px;padding:4px 0">— empty —</div>
            </div>
            <div id="nt-form-${type}" style="display:none;margin-top:10px;
                  background:var(--bg-base,#0e1018);border-radius:8px;padding:10px">
              <div style="display:flex;gap:8px;align-items:center">
                <input id="nt-name-${type}" placeholder="Food name" type="text"
                  style="flex:2;background:var(--card-bg);border:1px solid var(--card-border);
                         border-radius:8px;padding:7px 10px;color:var(--text-1);font-size:13px;outline:none">
                <input id="nt-cal-${type}" placeholder="kcal" type="number" min="0"
                  style="flex:1;background:var(--card-bg);border:1px solid var(--card-border);
                         border-radius:8px;padding:7px 10px;color:var(--text-1);font-size:13px;outline:none">
                <button onclick="ntSaveMeal('${type}')"
                  style="background:var(--accent);color:#fff;border:none;border-radius:8px;
                         padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer">Save</button>
                <button onclick="ntHideForm('${type}')"
                  style="background:transparent;color:var(--text-3);border:none;font-size:18px;cursor:pointer">✕</button>
              </div>
            </div>
          </div>`).join('')}

        <div style="background:var(--card-bg);border:1px solid var(--card-border);
                    border-radius:var(--r-lg);padding:16px">
          <div style="font-size:15px;font-weight:600;margin-bottom:12px">💧 Water</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${[200,350,500].map(ml => `
              <button onclick="ntWater(${ml})"
                style="background:rgba(56,189,248,0.1);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);
                       border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">
                +${ml} ml
              </button>`).join('')}
            <button onclick="ntWaterCustom()"
              style="background:var(--card-bg);color:var(--text-3);border:1px solid var(--card-border);
                     border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">Custom</button>
          </div>
        </div>
      </div>

      <!-- RECIPES -->
      <div id="nt-recipe" style="display:none">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          ${['High protein breakfast','Quick 15-min dinner','Vegetarian meal plan','Low calorie snacks']
            .map(s=>`<button onclick="ntRecipeAsk('${s}')"
              style="background:var(--card-bg);border:1px solid var(--card-border);
                     border-radius:999px;padding:6px 14px;font-size:12px;color:var(--text-2);cursor:pointer">${s}</button>`).join('')}
        </div>
        <div id="nt-recipe-msgs" style="display:flex;flex-direction:column;gap:12px;
              margin-bottom:16px;min-height:160px"></div>
        <div style="display:flex;gap:8px">
          <input id="nt-recipe-input" placeholder="Ask OZY for a recipe or meal idea…"
            style="flex:1;background:var(--card-bg);border:1px solid var(--card-border);
                   border-radius:10px;padding:10px 14px;color:var(--text-1);font-size:14px;outline:none"
            onkeydown="if(event.key==='Enter') ntRecipeSend()">
          <button onclick="ntRecipeSend()"
            style="background:var(--accent);border:none;border-radius:10px;
                   width:42px;cursor:pointer;font-size:18px;color:#fff">↑</button>
        </div>
      </div>
    </div>`;
  ntLoad();
}

let _ntData = { meals: [], water_ml: 0 };

function ntTab(tab) {
  document.getElementById('nt-track').style.display  = tab==='track'  ? '' : 'none';
  document.getElementById('nt-recipe').style.display = tab==='recipe' ? '' : 'none';
  const on = 'var(--accent)', off = 'transparent';
  document.getElementById('nt-tab-track').style.background  = tab==='track'  ? on : off;
  document.getElementById('nt-tab-track').style.color       = tab==='track'  ? '#fff' : 'var(--text-3)';
  document.getElementById('nt-tab-recipe').style.background = tab==='recipe' ? on : off;
  document.getElementById('nt-tab-recipe').style.color      = tab==='recipe' ? '#fff' : 'var(--text-3)';
}

async function ntLoad() {
  try {
    const d = await (await fetch('/api/nutrition/today')).json();
    if (!d.ok) return;
    _ntData = d;
    ntRender();
  } catch {}
}

function ntRender() {
  let totalCal = 0;
  ['breakfast','lunch','dinner','snack'].forEach(type => {
    const meals = (_ntData.meals||[]).filter(m => m.meal_type === type);
    const el = document.getElementById('nt-meals-' + type);
    if (!el) return;
    if (!meals.length) {
      el.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:4px 0">— empty —</div>';
    } else {
      el.innerHTML = meals.map(m => `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:6px 10px;background:var(--bg-base,#0e1018);border-radius:8px">
          <span style="font-size:13px">${m.name}</span>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:12px;color:var(--text-3)">${m.calories?m.calories+' kcal':''}</span>
            <button onclick="ntDeleteMeal(${m.id})"
              style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:14px">✕</button>
          </div>
        </div>`).join('');
      totalCal += meals.reduce((s,m)=>s+(m.calories||0),0);
    }
  });
  document.getElementById('nt-cal-total').textContent = totalCal;
  document.getElementById('nt-water-total').textContent = _ntData.water_ml || 0;
}

function ntAddMeal(type) {
  ['breakfast','lunch','dinner','snack'].forEach(t => { if(t!==type) ntHideForm(t); });
  const f = document.getElementById('nt-form-'+type);
  f.style.display = f.style.display === 'none' ? '' : 'none';
  if (f.style.display !== 'none') document.getElementById('nt-name-'+type).focus();
}
function ntHideForm(type) { document.getElementById('nt-form-'+type).style.display='none'; }

async function ntSaveMeal(type) {
  const name = document.getElementById('nt-name-'+type).value.trim();
  const cal  = parseInt(document.getElementById('nt-cal-'+type).value)||0;
  if (!name) return;
  const r = await fetch('/api/nutrition/meal',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({meal_type:type,name,calories:cal})});
  if ((await r.json()).ok) {
    document.getElementById('nt-name-'+type).value='';
    document.getElementById('nt-cal-'+type).value='';
    ntHideForm(type); ntLoad();
  }
}

async function ntDeleteMeal(id) {
  await fetch('/api/nutrition/meal/'+id,{method:'DELETE'});
  ntLoad();
}

async function ntWater(ml) {
  await fetch('/api/nutrition/water',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({amount_ml:ml})});
  ntLoad();
}
function ntWaterCustom() {
  const ml=parseInt(prompt('How many ml?'));
  if(ml>0) ntWater(ml);
}

async function ntRecipeSend() {
  const input=document.getElementById('nt-recipe-input');
  const text=input.value.trim(); if(!text)return;
  input.value=''; ntRecipeAsk(text);
}

async function ntRecipeAsk(prompt) {
  const msgs=document.getElementById('nt-recipe-msgs');
  msgs.innerHTML+=`<div style="align-self:flex-end;background:var(--accent);color:#fff;
    border-radius:14px 4px 14px 14px;padding:10px 14px;font-size:13px;max-width:85%">${prompt}</div>`;
  const id='recipe-'+Date.now();
  msgs.innerHTML+=`<div id="${id}" style="background:var(--card-bg);border:1px solid var(--card-border);
    border-radius:4px 14px 14px 14px;padding:10px 14px;font-size:13px;max-width:90%;color:var(--text-1)">
    <span style="color:var(--text-3)">Thinking…</span></div>`;
  msgs.scrollTop=msgs.scrollHeight;
  const bubble=document.getElementById(id);
  let full='';
  try {
    const res=await fetch(`/api/chat/stream?message=${encodeURIComponent('Recipe request: '+prompt)}`);
    const reader=res.body.getReader(); const dec=new TextDecoder();
    bubble.innerHTML='';
    let done=false;
    while(!done){
      const{done:d,value}=await reader.read(); if(d)break;
      for(const line of dec.decode(value).split('\n')){
        if(!line.startsWith('data:'))continue;
        const data=line.slice(5).trim();
        if(data==='[DONE]'){done=true;break;}
        try{const o=JSON.parse(data);if(o.chunk){full+=o.chunk;bubble.innerHTML=renderMarkdown(full);}}catch{}
      }
    }
  } catch { bubble.innerHTML='<span style="color:#f43f5e">Error. Please try again.</span>'; }
  msgs.scrollTop=msgs.scrollHeight;
}
