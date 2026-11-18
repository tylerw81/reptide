import {recordedWorkoutTime} from './history-dates.js';
import {KEY, validateState} from './model.js';

export const MAX_BACKUP_BYTES = 128 * 1024 * 1024;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const byteLength = text => new TextEncoder().encode(text).byteLength;
const validDate = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const dateLabel = value => new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const timeLabel = value => new Date(value).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const countLabel = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
const included = 'Full workout history and sets, notes, templates and targets, supersets, custom exercises and guide links, measurements, preferences, and any workout in progress.';

// Counts and labels are derived, never trusted from metadata supplied in a file.
export function backupSummary(state) {
  let firstWorkout = null, lastWorkout = null, sets = 0;
  for (const workout of state.history) {
    firstWorkout = firstWorkout === null ? recordedWorkoutTime(workout) : Math.min(firstWorkout,recordedWorkoutTime(workout));
    lastWorkout = lastWorkout === null ? recordedWorkoutTime(workout) : Math.max(lastWorkout,recordedWorkoutTime(workout));
    for (const entry of workout.exercises) sets += entry.sets.filter(set=>set.done).length;
  }
  const metadata = object(state._forgeBackup) ? state._forgeBackup : {};
  return {sessions:state.history.length,sets,templates:state.routines.length,customExercises:state.customExercises.length,
    measurements:state.measurements?.length || 0,active:Boolean(state.active),firstWorkout,lastWorkout,
    format:state.version,appVersion:typeof metadata.appVersion === 'string' && metadata.appVersion.length <= 40 ? metadata.appVersion : null,
    exportedAt:validDate(metadata.exportedAt) ? metadata.exportedAt : null};
}

export function inspectBackup(text, {fileName = '', size} = {}) {
  if (typeof text !== 'string') throw new Error('That file could not be read.');
  if ((size !== undefined && (!Number.isFinite(size) || size < 0)) || size > MAX_BACKUP_BYTES || byteLength(text) > MAX_BACKUP_BYTES) throw new Error('Choose a backup no larger than 128 MiB.');
  let state;
  try { state = JSON.parse(text.replace(/^\uFEFF/,'')); }
  catch { throw new Error('That file is not valid JSON. Choose a Reptide .json backup.'); }
  try { validateState(state); }
  catch (error) { throw new Error(error instanceof TypeError ? 'This is not a valid Reptide backup.' : error.message || 'This is not a valid Reptide backup.'); }
  return {state,summary:backupSummary(state),fileName:String(fileName).slice(0,200),bytes:byteLength(text)};
}

export function generateBackup(state, {appVersion, now = Date.now()} = {}) {
  validateState(state);
  const exportedAt = new Date(now).toISOString();
  // Preserve additive schema-v1 data. Restore still requires a version supporting
  // every referenced exercise ID; new catalog entries can prevent downgrading.
  const snapshot = {...state};
  // Do not erase an older/future extension that happens to use this key differently.
  if (state._forgeBackup === undefined || object(state._forgeBackup)) snapshot._forgeBackup = {...(state._forgeBackup || {}),appVersion:String(appVersion || 'unknown'),exportedAt};
  let text = JSON.stringify(snapshot,null,2);
  // Formatting must never prevent exporting an otherwise supported history.
  if (byteLength(text) > MAX_BACKUP_BYTES) text = JSON.stringify(snapshot);
  // Optional export metadata must not push an exact-limit snapshot over the cap.
  // Fall back to the original complete state, preserving all original extensions.
  if (byteLength(text) > MAX_BACKUP_BYTES) text = JSON.stringify(state);
  const inspected = inspectBackup(text);
  return {...inspected,text,exportedAt,fileName:`reptide-backup-${exportedAt.replace(/[:.]/g,'-')}.json`};
}

// localStorage.setItem is atomic: a rejected write leaves the previous value intact.
// Do not apply state or clear raw-data recovery until this returns ok:true.
export function persistRestoredState(state, {storage = globalThis.localStorage, key = KEY, prepare = value=>value} = {}) {
  try {
    const candidate = prepare(validateState(state));
    validateState(candidate);
    storage.setItem(key,JSON.stringify(candidate));
    return {ok:true,state:candidate};
  } catch (error) { return {ok:false,error}; }
}

function counts(summary) {
  return `<dl class="backup-counts"><div><dt>Sessions</dt><dd>${summary.sessions}</dd></div><div><dt>Logged sets</dt><dd>${summary.sets}</dd></div><div><dt>Templates</dt><dd>${summary.templates}</dd></div><div><dt>Custom exercises</dt><dd>${summary.customExercises}</dd></div><div><dt>Measurements</dt><dd>${summary.measurements}</dd></div><div><dt>In-progress workout</dt><dd>${summary.active ? 'Yes' : 'None'}</dd></div></dl>`;
}
function details(inspected) {
  const s = inspected.summary;
  return `${counts(s)}<dl class="backup-details">${inspected.fileName ? `<div><dt>File</dt><dd>${esc(inspected.fileName)}</dd></div>` : ''}<div><dt>Workout dates</dt><dd>${s.firstWorkout === null ? 'No completed workouts' : `${esc(dateLabel(s.firstWorkout))}${s.lastWorkout !== s.firstWorkout ? ` to ${esc(dateLabel(s.lastWorkout))}` : ''}`}</dd></div><div><dt>Backup created</dt><dd>${s.exportedAt ? esc(timeLabel(s.exportedAt)) : 'Not recorded in this older backup'}</dd></div><div><dt>Version</dt><dd>Data format ${s.format}${s.appVersion ? ` · Reptide ${esc(s.appVersion)}` : ' · App version not recorded'}</dd></div><div><dt>File size</dt><dd>${(inspected.bytes / 1024).toLocaleString(undefined,{maximumFractionDigits:1})} KiB · 128 MiB maximum</dd></div></dl>`;
}

export function backupSettings(state, status = {}) {
  const s = backupSummary(state);
  return `<section class="settings-section backup-section" aria-labelledby="backup-heading"><h2 id="backup-heading">Backup &amp; restore</h2><p class="backup-intro">Keep a complete copy of your Reptide data. Save the JSON file somewhere you can find it, then check it here.</p>${counts(s)}<p class="backup-includes">${included}</p><button class="setting-row setting-button" data-action="export"><span><strong>Export JSON backup</strong><small>Save all data using your device’s file picker</small></span><span aria-hidden="true">↓</span></button><button class="setting-row setting-button" data-action="check-backup"><span><strong>Check backup file</strong><small>Read and validate a saved file. Nothing is replaced.</small></span><span aria-hidden="true">✓</span></button><button class="setting-row setting-button" data-action="import"><span><strong>Restore backup</strong><small>Preview a file before replacing this device’s data</small></span><span aria-hidden="true">↑</span></button><div class="backup-status" aria-live="polite">${status.message ? `<p>${esc(status.message)}</p>` : '<p>No backup save confirmed in this app session.</p>'}${status.savedAt ? `<p>Last save confirmed this session: ${esc(timeLabel(status.savedAt))}.</p>` : ''}${status.checkedAt ? `<p>Last file checked this session: ${esc(timeLabel(status.checkedAt))}.</p>` : ''}</div><p class="backup-privacy">JSON files are not encrypted and include private notes and measurements. Exporting a JSON file does not upload it. Optional account sync is controlled separately in Settings. A valid file check does not test available device storage or guarantee a future restore.</p></section>`;
}

export function backupModal(modal, currentState, {currentStateKnown=true}={}) {
  if (!['backup-check','backup-restore'].includes(modal?.type)) return null;
  const restore = modal.type === 'backup-restore', current = backupSummary(currentState);
  const warning = restore ? `<div class="backup-warning"><strong>Replace, not merge</strong><p>${currentStateKnown?`This replaces ${countLabel(current.sessions,'session')}, ${countLabel(current.templates,'template')}, ${countLabel(current.measurements,'measurement entry','measurement entries')}, your custom exercises and preferences on this device.${current.active ? ' Your current in-progress workout will also be replaced.' : ''}`:'Reptide could not read this device’s saved data. Its contents and counts are unknown. This will replace whatever is currently saved on this device.'}</p><p>Export your current data first if you want to keep it. Cancel leaves it unchanged.</p></div>` : '';
  return {title:restore ? 'Restore this backup?' : 'Backup file checked',body:`<div class="backup-preview"><p class="backup-result">${restore ? 'This file is readable and its Reptide data passes validation.' : 'Valid Reptide backup. Nothing on this device was changed.'}</p>${warning}${restore ? '<h3 class="backup-file-heading">Inside the selected backup</h3>' : ''}${details(modal.inspected)}<p class="backup-includes">${included}</p>${restore ? '' : '<p class="backup-privacy">This check read only the file you selected. It did not restore data, write a test copy, test storage space, or confirm another file exists elsewhere.</p>'}</div>`,footer:restore ? '<button class="button secondary" data-action="close-modal">Cancel</button><button class="button primary" data-action="backup-restore-confirm">Replace device data</button>' : '<button class="button primary full" data-action="close-modal">Done</button>'};
}

// Dependencies keep file parsing, persistence and UI state independently testable.
export function createBackupTools({getState,isCurrentStateKnown=()=>true,getModal,openModal,closeModal,render,toast,commitRestore,downloadData,appVersion,
  getScope=()=>null,getNative = ()=>globalThis.window?.ForgeNative,documentRef = globalThis.document,now = ()=>Date.now()} = {}) {
  const status = {};
  let pendingExport = null, picking = false;
  const update = message => {status.message = message;render();toast(message);};
  async function choose(mode) {
    if (picking) return;
    picking = true;const selectedScope=getScope();
    const input = documentRef.createElement('input');input.type = 'file';input.accept = '.json,application/json';input.hidden = true;
    const finish = ()=>{picking = false;input.remove();};
    input.addEventListener('cancel',()=>{finish();toast('No file selected. Your data is unchanged.');},{once:true});
    input.addEventListener('change',async()=>{
      const file = input.files?.[0];
      if (!file) {finish();toast('No file selected. Your data is unchanged.');return;}
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error('Choose a backup no larger than 128 MiB.');
        const raw=await file.text();if(getScope()!==selectedScope){toast('Account changed. Choose the backup again for this account.');return;}const inspected = inspectBackup(raw,{fileName:file.name,size:file.size});
        if (mode === 'check') {status.checkedAt = now();status.message = 'Selected backup file checked. Device data was not changed.';}
        openModal({type:mode === 'check' ? 'backup-check' : 'backup-restore',inspected,accountScope:selectedScope});
      } catch (error) {toast(error.message || 'That file could not be read. Your data is unchanged.');}
      finally {finish();}
    },{once:true});
    try {documentRef.body.append(input);input.click();}
    catch {finish();toast('The file picker could not open. Your data is unchanged.');}
  }
  const actions = {
    'export':()=>{
      if (pendingExport) {toast('Finish or cancel the open backup save first.');return;}
      try {
        const backup = generateBackup(getState(),{appVersion,now:now()}), native = getNative();
        if (native?.exportBackup) {
          pendingExport = backup;
          status.message = 'Backup prepared. Choose a file location to finish saving.';
          render();native.exportBackup(backup.text,backup.fileName);
        } else {
          downloadData(backup.text,backup.fileName,'application/json');
          update('Backup download started. This browser cannot confirm it was saved. Use Check backup file to read the saved file.');
        }
      } catch (error) {pendingExport = null;update(error.message || 'Could not prepare the backup. Nothing was saved.');}
    },
    'check-backup':()=>choose('check'),
    'import':()=>choose('restore'),
    'backup-restore-confirm':()=>{
      const modal = getModal();
      if (modal?.type !== 'backup-restore') return;
      let saved = false;
      try {if(modal.accountScope!==undefined&&modal.accountScope!==getScope())throw new Error('Account changed. Review this backup again.');saved = commitRestore(modal.inspected.state) === true;}
      catch { /* A rejected restore must leave current state and raw recovery intact. */ }
      if (!saved) {toast('Restore could not be saved. Your current data is unchanged. Free device storage or try again.');return;}
      closeModal();status.message = 'Backup restored and saved on this device.';render();toast(status.message);
    }
  };
  return {actions,status,settings:()=>backupSettings(getState(),status),modal:value=>backupModal(value,getState(),{currentStateKnown:isCurrentStateKnown()}),
    exportResult:(success,reason)=>{
      if (!pendingExport) return false;
      pendingExport = null;
      if (success === true) {status.savedAt = now();update('Backup saved. Use Check backup file to read and validate the saved copy.');}
      else update(reason === 'cancelled' ? 'Backup save cancelled. No new backup was saved.' : 'Backup was not saved. Choose a location and try again.');
      return true;
    }};
}
