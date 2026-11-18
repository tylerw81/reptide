// Measurements are optional additive v1 data. Canonical mass/length units never change.
const LB = 2.2046226218;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const measurementFields = [
 ['weightKg','Weight',1000,'mass'],['bodyFatPct','Body fat',100,'%'],['calories','Caloric intake',50000,'kcal'],
 ['waistCm','Waist',500,'length'],['hipsCm','Hips',500,'length'],['chestCm','Chest',500,'length'],['armCm','Upper arm',500,'length'],['thighCm','Thigh',500,'length']
];
export function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function validDay(day) {
 if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day < '1900-01-01') return false;
 const date = new Date(`${day}T12:00:00`);
 return Number.isFinite(date.getTime()) && localDay(date) === day;
}
export function validateMeasurements(entries) {
 if (entries === undefined) return entries;
 if (!Array.isArray(entries) || entries.length > 10000) throw new Error('Invalid or oversized measurement history.');
 const ids = new Set(), days = new Set();
 for (const row of entries) {
  if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || !/^[A-Za-z0-9_-]{1,500}$/.test(row.id) || ids.has(row.id) || !validDay(row.date) || days.has(row.date) || (row.notes != null && (typeof row.notes !== 'string' || row.notes.length > 500))) throw new Error('Invalid or duplicate measurement entry.');
  let present = false;
  for (const [key,,max] of measurementFields) {
   if (row[key] == null) continue;
   if (typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] < 0 || row[key] > max || (key !== 'calories' && row[key] === 0)) throw new Error('Invalid measurement value.');
   present = true;
  }
  if (!present) throw new Error('Log at least one measurement.');
  ids.add(row.id); days.add(row.date);
 }
 return entries;
}
const unitFor = (kind, unit) => kind === 'mass' ? unit : kind === 'length' ? unit === 'lb' ? 'in' : 'cm' : kind;
const displayed = (value, kind, unit) => value == null ? '' : kind === 'mass' && unit === 'lb' ? value * LB : kind === 'length' && unit === 'lb' ? value / 2.54 : value;
const concise = value => value === '' ? '' : Math.round(value * 100) / 100;
const dayLabel = day => new Date(`${day}T12:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
export const sortedMeasurements = state => [...(state.measurements || [])].sort((a,b)=>b.date.localeCompare(a.date));
export function saveMeasurement(state, input, editId, newId = globalThis.crypto.randomUUID()) {
 if (!['lb','kg'].includes(state.settings.unit)) throw new Error('Choose a valid measurement unit.');
 if (!validDay(input.date) || input.date > localDay()) throw new Error('Choose a valid date, today or earlier.');
 const old = editId ? (state.measurements || []).find(row=>row.id === editId) : null;
 if (editId && !old) throw new Error('This measurement no longer exists.');
 if ((state.measurements || []).some(row=>row.date === input.date && row.id !== editId)) throw new Error('An entry already exists for this date. Edit it in your history.');
 const row = {id:old?.id || newId,date:input.date,notes:String(input.notes || '').trim()};
 for (const [key,label,max,kind] of measurementFields) {
  const raw = String(input[key] ?? '').trim();
  if (!raw) { row[key] = null; continue; }
  const number = Number(raw);
  let value = kind === 'mass' && state.settings.unit === 'lb' ? number / LB : kind === 'length' && state.settings.unit === 'lb' ? number * 2.54 : number;
  // Preserve exact stored precision when an edit leaves the displayed field unchanged.
  if (old?.[key] != null && number === concise(displayed(old[key],kind,state.settings.unit))) value = old[key];
  if (!Number.isFinite(number) || !Number.isFinite(value) || value < 0 || value > max || (key !== 'calories' && value === 0)) throw new Error(`Enter a valid ${label.toLowerCase()} (${key === 'calories' ? '0' : 'greater than 0'} to ${concise(displayed(max,kind,state.settings.unit))} ${unitFor(kind,state.settings.unit)}).`);
  row[key] = value;
 }
 const measurements = [row,...(state.measurements || []).filter(r=>r.id !== editId)];
 validateMeasurements(measurements);
 return {...state,measurements:sortedMeasurements({measurements})};
}
let historyLimit = 60;
export function measureView(state, brand = '', chart = '') {
 const rows = sortedMeasurements(state), unit = state.settings.unit;
 const cards = measurementFields.slice(0,3).map(([key,label,,kind])=>{
  const row = rows.find(r=>r[key] != null);
  return `<div class="measure-stat"><span>${label}</span><strong>${row ? esc(concise(displayed(row[key],kind,unit))) : '—'} <small>${unitFor(kind,unit)}</small></strong><small>${row ? dayLabel(row.date) : 'Not logged yet'}</small></div>`;
 }).join('');
 return `<header class="topbar">${brand}<span class="muted">Your body, your record.</span></header><main class="page measure-page"><div class="eyebrow">BEYOND THE WORKOUT</div><h1 class="slogan">Measure<span>.</span></h1><p class="measure-intro muted">Keep a dated record of your weight, body measurements and daily intake.</p><div class="measure-stats">${cards}</div><button class="button primary full" data-action="measurement-new">+ Log measurements</button>${chart}<div class="section-head"><h2>History <span class="count">${rows.length}</span></h2></div><p class="muted measure-help">One entry per day. Tap an entry to edit. Weight uses ${unit}; body measurements use ${unit === 'lb' ? 'inches' : 'centimeters'}. Change units in Settings.</p><div class="measure-history">${rows.slice(0,historyLimit).map(row=>`<button class="measure-entry" data-action="measurement-edit" data-id="${esc(row.id)}" aria-label="Edit measurements for ${esc(dayLabel(row.date))}"><strong>${dayLabel(row.date)}</strong><span class="measure-values">${measurementFields.filter(([key])=>row[key] != null).map(([key,label,,kind])=>`<span>${label}<b>${concise(displayed(row[key],kind,unit))} ${unitFor(kind,unit)}</b></span>`).join('')}</span>${row.notes?`<span class="measure-note">${esc(row.notes)}</span>`:''}<small class="measure-edit">Edit entry →</small></button>`).join('') || '<div class="measure-empty"><h3>Your first entry starts here.</h3><p class="muted">Log any measurement you want to track. Leave the rest blank.</p></div>'}</div>${rows.length > historyLimit ? '<button class="button secondary full spaced" data-action="measurement-more">Show older entries</button>' : ''}<p class="footnote">Stored only on your device. Included in your Reptide backup.</p></main>`;
}
export function measureModal(state, id) {
 const row = (state.measurements || []).find(r=>r.id === id), unit = state.settings.unit;
 return {title:row?'Edit measurements':'Log measurements',body:`<div id="measurement-form"><label class="field-label">Date<input id="measurement-date" type="date" min="1900-01-01" max="${localDay()}" value="${row?.date || localDay()}" autofocus></label><p class="muted measure-help">Enter at least one value. Calories are your total intake for this date, not an individual meal.</p><div class="measure-fields">${measurementFields.map(([key,label,max,kind])=>`<label class="field-label">${label} (${unitFor(kind,unit)})<input id="measurement-${key}" type="number" inputmode="decimal" min="${key === 'calories' ? 0 : 0.01}" max="${concise(displayed(max,kind,unit))}" step="any" value="${row ? concise(displayed(row[key],kind,unit)) : ''}" placeholder="Optional"></label>`).join('')}</div><label class="field-label">Notes (optional)<textarea aria-label="Notes (optional)" id="measurement-notes" maxlength="500" rows="2" placeholder="Context you want to remember">${esc(row?.notes || '')}</textarea></label></div>`,footer:`${row?`<button class="text-button danger" data-action="measurement-delete" data-id="${esc(row.id)}">Delete entry</button>`:''}<button class="button secondary" data-action="close-modal">Cancel</button><button class="button primary" data-action="measurement-save">Save measurements</button>`};
}
export function measurementActions({getState,setState,getModal,openModal,closeModal,save,render,toast,confirmAction}) {
 return {
  'measurement-new':()=>openModal({type:'measurement'}),
  'measurement-edit':button=>openModal({type:'measurement',id:button.dataset.id}),
  'measurement-more':()=>{historyLimit += 60;render();},
  'measurement-save':()=>{
   const input = {date:document.querySelector('#measurement-date').value,notes:document.querySelector('#measurement-notes').value};
   for (const [key] of measurementFields) input[key] = document.querySelector(`#measurement-${key}`).value;
   try {setState(saveMeasurement(getState(),input,getModal().id));} catch(error) {toast(error.message);return;}
   save();closeModal();render();
  },
  'measurement-delete':button=>{const id=button.dataset.id;confirmAction('Delete this entry?','This removes the measurements for this date. Export a backup first if you want to keep a copy.','Delete entry',()=>{setState({...getState(),measurements:(getState().measurements || []).filter(row=>row.id !== id)});save();render();});}
 };
}
