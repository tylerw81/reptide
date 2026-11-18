import {inspectStrongImport,prepareStrongImport,assertStrongImportCurrent,MAX_STRONG_BYTES} from './strong-import.js';
import {generateBackup} from './backup-tools.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,disabled=false)=>`<button class="button secondary" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const date=v=>Number.isFinite(v)?new Date(v).toLocaleString():'Not recorded';

// Only ephemeral source/preview/backup state lives here. Persistence belongs to onCommit.
export function createStrongImportUI({getState,getModal,openModal,closeModal,renderModal,render=()=>{},toast=()=>{},downloadData,appVersion,onCommit,unavailableReason=()=>'',host=globalThis,document=globalThis.document,bridge=()=>host.ForgeNative}={}) {
 let stage='intro',message='',source=null,report=null,preview=null,backup=null,verified=false,pending=null,busy=false,epoch=0,disposed=false,picker=null,selectedFile=null,messageError=false,sourceWorkout=null,rowIndex=0;
 let status={available:false,installed:false},units={};
 const owns=()=>!disposed&&getModal()?.type==='strong-import';
 const refresh=()=>{if(owns()||getModal()?.type==='strong-source')renderModal();};
 const reason=()=>unavailableReason()||(getState().active?'Finish or discard your current workout before importing.':'');
 function abandonPicker(){epoch++;picker?.remove();picker=null;}
 function reset(){abandonPicker();selectedFile=null;messageError=false;source=null;report=null;preview=null;backup=null;verified=false;pending=null;busy=false;units={};stage='intro';message='';}
 function current(){if(reason())throw new Error(reason());if(!preview)throw new Error('Choose and review a CSV first.');assertStrongImportCurrent(getState(),preview);}
 function error(e){message=e?.message||'The operation could not finish. Your workouts are unchanged.';messageError=true;refresh();}
 function requestStatus(){try{bridge()?.requestStrongStatus?.();}catch{status={available:false,installed:false};}refresh();}
 function review(){
  verified=false;pending=null;backup=null;preview=null;messageError=false;
  try{if(reason())throw new Error(reason());report=inspectStrongImport(source.text,{...units,fileName:source.name,size:source.size});
   if(report.needsUnits?.weight||report.needsUnits?.distance){stage='units';message='';refresh();return;}
   preview=prepareStrongImport(getState(),source.text,{...units,fileName:source.name,size:source.size});stage='review';message='';
  }catch(e){stage='error';error(e);}refresh();
 }
 function choose(mode){
  if(!owns()||busy||picker)return;
  if(mode==='backup'&&!backup)return;
  const ticket=++epoch,input=document.createElement('input');picker=input;input.type='file';input.accept=mode==='csv'?'.csv,text/csv,text/plain':'.json,application/json';input.hidden=true;
  const currentSelection=()=>ticket===epoch&&owns();
  const finish=()=>{input.remove();if(picker===input)picker=null;};
  messageError=false;
  if(mode==='csv'){stage='selecting';message='Choose your exported workout CSV in the file picker.';}
  else message='Choose the saved pre-import Reptide backup to verify it.';
  refresh();
  input.addEventListener('cancel',()=>{finish();if(currentSelection()){epoch++;if(mode==='csv')stage='intro';messageError=false;message='No file was returned by the picker. Nothing was imported. Choose the file again if you meant to select it.';refresh();}},{once:true});
  input.addEventListener('change',async()=>{
   if(!currentSelection()){finish();return;}
   const file=input.files?.[0];
   try{
    if(!file)throw new Error('No file was received from the picker. Choose the file again. Nothing was imported.');
    if(mode==='csv'){selectedFile={name:file.name||'Workout CSV',size:file.size};stage='reading';message='Reading your CSV on this device. Nothing has been imported.';}
    else message='Reading the saved backup to verify its exact contents.';
    refresh();
    if(file.size>MAX_STRONG_BYTES)throw new Error('Choose a file no larger than 10 MiB.');
    let text;
    if(mode==='csv'&&typeof file.arrayBuffer==='function'){
     let bytes;
     try{bytes=await file.arrayBuffer();}catch{throw new Error('Could not read the selected CSV. Try choosing it again. If needed, save a fresh copy in Downloads and choose that copy. Nothing was imported.');}
     if(!currentSelection())return;
     if(bytes.byteLength>MAX_STRONG_BYTES)throw new Error('Choose a file no larger than 10 MiB.');
     try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('This CSV is not valid UTF-8 text. Export a fresh CSV and try again. Nothing was imported.');}
    }else if(mode==='csv')throw new Error('This device cannot safely read the CSV encoding. Update Android System WebView or use a current browser. Nothing was imported.');
    else text=await file.text();
    if(!currentSelection())return;
    finish();
    if(mode==='csv'){source={text,name:selectedFile.name,size:file.size};units={};review();}
    else{current();if(text!==backup.text)throw new Error('This is not the exact pre-import backup just generated. Choose that saved JSON file.');verified=true;messageError=false;message='Saved backup verified. You can now add the reviewed workouts.';refresh();}
   }catch(e){if(currentSelection()){finish();if(mode==='csv')stage='error';error(e);}}finally{finish();}
  },{once:true});
  // Keep the input outside the rendered modal: native resume/status callbacks may redraw it.
  try{document.body.append(input);input.click();}catch(e){finish();if(mode==='csv')stage='error';error(e);}
 }

 function saveBackup(){
  if(!owns()||stage!=='review'||pending||busy)return;
  try{current();messageError=false;verified=false;backup=generateBackup(getState(),{appVersion});const native=bridge();
   if(typeof native?.exportStrongSafetyBackup==='function'){
    pending=host.crypto?.randomUUID?.()||`strong-${Date.now()}-${++epoch}-${Math.random().toString(36).slice(2)}`;
    message='Choose a location to save your pre-import Reptide backup.';refresh();native.exportStrongSafetyBackup(backup.text,backup.fileName,pending);
   }else{downloadData(backup.text,backup.fileName,'application/json');message='Download started, but saving is not confirmed. Select the downloaded backup below to verify its exact contents.';refresh();}
  }catch(e){pending=null;verified=false;error(e);}
 }
 function backupResult(value){
  if(!owns()||!pending||value?.requestId!==pending||stage!=='review')return;
  pending=null;messageError=false;
  try{current();verified=value.saved===true;message=verified?'Pre-import backup saved. You can now add the reviewed workouts.':value.reason==='cancelled'?'Backup save cancelled. Nothing was imported.':'Backup was not saved. Try saving again before importing.';}catch(e){verified=false;message=e.message;}
  refresh();
 }
 async function commit(){
  if(!owns()||stage!=='review'||!verified||busy||pending||picker||!preview?.summary.workouts)return;
  try{current();const count=preview.summary.workouts;busy=true;refresh();const success=await onCommit(preview);if(success!==true)throw new Error('Import could not be saved. Your existing data is unchanged. Free some storage and try again.');
   reset();closeModal();render();toast(`${count} workout${count===1?'':'s'} added.`);
  }catch(e){busy=false;error(e);}
 }
 function previewBody(){const s=preview.summary;return `<p><strong>${esc(preview.fileName)}</strong></p><dl class="strong-counts">${[['Workouts to add',s.workouts],['Completed sets',s.sets],['Unscored source rows',s.unscoredRows],['Already imported',s.duplicates],['New custom exercises',s.customExercises]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p>Source dates: ${esc(date(s.firstDate))} to ${esc(date(s.lastDate))}.</p><p>This adds history without replacing existing workouts, templates, measurements or settings. Imported completed sets can change progress charts, records and scores. Unknown exercises remain custom exercises; unsupported rows stay available as unscored source details.</p><ul>${(s.warnings||[]).map(w=>`<li>${esc(w)}</li>`).join('')}</ul><p>Before importing, save a full Reptide backup. It contains private notes and measurements and is not encrypted. Keep it somewhere private.</p>${button('strong-save-backup',pending?'Waiting for backup save…':verified?'Save a fresh pre-import backup':'Save pre-import Reptide backup',!!pending||busy)}${backup&&!verified&&!pending?button('strong-check-backup','Verify saved backup file',busy):''}<p role="status">${verified?'✓ Pre-import backup confirmed.':'A confirmed backup is required before adding workouts.'}</p>`;}
 function sourceDetails(workout,index=0){
  const m=workout?.strongImport;if(!m?.rows?.length)return '<p>No original import details are available.</p>';
  const i=Math.min(Math.max(index,0),m.rows.length-1),row=m.rows[i];
  const label=m.auxiliaryRows?.includes(i)?'Source annotation or rest timer: preserved, not counted as a completed set.':m.unscoredRows.includes(i)?'Unscored: preserved, not counted as a completed Reptide set.':'Imported as a completed Reptide set.';
  return `<div class="strong-import"><p>${esc(workout.name)} · ${esc(m.localDate)}</p><p>Original source row ${i+1} of ${m.rows.length}. <strong>${label}</strong></p><dl class="strong-source-fields">${m.headers.map((h,j)=>`<div><dt>${esc(h)}</dt><dd>${esc(row[j])||'（empty）'}</dd></div>`).join('')}</dl><p>Source time zone was not provided. Interpreted in ${esc(m.timeZone)}.</p>${(m.warnings||[]).map(w=>`<p>${esc(String(w).replace(/(Original )?Strong details/g,'the original import details').replace(/\bStrong\b/g,'the source app'))}</p>`).join('')}</div>`;
 }
 function modalContent(value){
  if(value?.type==='strong-source')return {title:'Original import details',body:sourceDetails(sourceWorkout,rowIndex),footer:`${button('strong-source-prev','Previous row',rowIndex===0)}${button('strong-source-next','Next row',rowIndex>=(sourceWorkout?.strongImport?.rows?.length||0)-1)}${button('close-modal','Done')}`};
  if(value?.type!=='strong-import')return null;
  let body,footer=button('close-modal','Cancel',busy);
  if(stage==='review'&&preview){body=previewBody()+`<p>Source annotations and rest timers preserved separately: ${esc(preview.summary.auxiliaryRows||0)}.</p>`;footer+=button('strong-choose','Choose another CSV',busy||!!pending)+button('strong-commit','Add workouts',!verified||busy||!!pending||!!reason()||preview.summary.workouts===0);}
  else if(['selecting','reading','error'].includes(stage)){body=`${selectedFile?`<p>Selected file: <strong>${esc(selectedFile.name)}</strong></p>`:''}<p>Your existing Reptide data is unchanged. The complete CSV must be read and reviewed before you can save a backup and add workouts.</p>${stage==='reading'?'<p>If reading does not finish, save the CSV to Downloads on your phone and choose that copy.</p>':''}`;footer+=button('strong-choose',stage==='selecting'?'Choose CSV again':'Choose another CSV');}
  else if(stage==='units'){body=`<p>This export has unitless headers. Choose the units used when it was exported. Reptide will not guess.</p>${report.needsUnits.weight?'<label for="strong-weight-unit">Weight unit</label><select id="strong-weight-unit"><option value="">Choose weight unit</option><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select>':''}${report.needsUnits.distance?'<label for="strong-distance-unit">Distance unit</label><select id="strong-distance-unit"><option value="">Choose distance unit</option><option value="km">Kilometers (km)</option><option value="mi">Miles (mi)</option><option value="m">Meters (m)</option></select>':''}`;footer+=button('strong-units','Review import');}
  else{body=`<p>Bring workout history exported from another tracker into Reptide. You choose the CSV file, and Reptide reads only that file.</p><ol><li>Export your workout history as a CSV file from your previous app.</li><li>Return here and choose that CSV to review every workout before anything is added.</li></ol><p>CSV exports contain workout history, not templates or body measurements. Only workouts present in the selected file can be imported.</p><p>Your selected CSV is processed on this device, held in memory, and never uploaded. Original source fields are preserved in imported history and Reptide backups.</p>`;footer+=button('strong-choose','Choose CSV file',!!reason());}
  return {title:stage==='review'?'Review import':stage==='units'?'Confirm export units':stage==='reading'?'Reading CSV':stage==='selecting'?'Choose CSV file':stage==='error'?'CSV could not be imported':'Import workout history',body:`<div class="strong-import"><p class="strong-message" role="${messageError?'alert':'status'}" aria-live="${messageError?'assertive':'polite'}">${esc(message||reason())}</p>${body}</div>`,footer:`<div class="strong-footer">${footer}</div>`};
 }
 const actions={
  'strong-import':()=>{reset();openModal({type:'strong-import'});requestStatus();},
  'strong-choose':()=>{if(!owns()||busy||pending)return;abandonPicker();selectedFile=null;source=null;report=null;verified=false;backup=null;preview=null;stage='intro';message='';messageError=false;choose('csv');},
  'strong-units':()=>{if(!owns()||stage!=='units')return;for(const [kind,id] of [['weight','strong-weight-unit'],['distance','strong-distance-unit']]){const el=document.getElementById(id);if(el)units[`${kind}Unit`]=el.value;}review();},
  'strong-open-app':()=>{if(!owns()||!status.installed)return;try{bridge()?.openStrong?.();}catch{error(new Error('That app could not open. Open it from your phone’s app launcher.'));}},
  'strong-save-backup':saveBackup,'strong-check-backup':()=>choose('backup'),'strong-commit':commit,
  'strong-source-prev':()=>{if(getModal()?.type==='strong-source'){rowIndex=Math.max(0,rowIndex-1);refresh();}},
  'strong-source-next':()=>{if(getModal()?.type==='strong-source'){rowIndex=Math.min((sourceWorkout?.strongImport?.rows?.length||1)-1,rowIndex+1);refresh();}}
 };
 const callbacks={forgeStrongStatus:v=>{if(disposed)return;status={available:v?.available===true,installed:v?.installed===true};refresh();},forgeStrongOpenResult:v=>{if(owns()&&v?.opened!==true)error(new Error('That app could not open. Open it from your phone’s app launcher.'));},forgeStrongBackupResult:backupResult};
 const old={};for(const [key,fn] of Object.entries(callbacks)){old[key]=host[key];host[key]=fn;}
 return {actions,modalContent,requestStatus,sourceDetails,openSource:workout=>{sourceWorkout=workout;rowIndex=0;openModal({type:'strong-source'});},
  settingsCard:()=>`<section class="settings-section strong-settings"><h2>Past workouts</h2><p>Add your exported workout history. Review every import and save a Reptide backup first.</p><button class="setting-row setting-button" data-action="strong-import"><span><strong>Import workout history</strong><small>Choose a CSV · add history without replacing data</small></span><span aria-hidden="true">↑</span></button></section>`,
  onModalClosed:(previous,next)=>{if(previous?.type==='strong-import'&&next?.type!=='strong-import')reset();if(previous?.type==='strong-source'&&next?.type!=='strong-source')sourceWorkout=null;},
  dispose:()=>{disposed=true;reset();for(const [key,fn] of Object.entries(callbacks))if(host[key]===fn){if(old[key]===undefined)delete host[key];else host[key]=old[key];}}
 };
}
