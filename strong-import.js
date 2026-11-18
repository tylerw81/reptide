import {exercises,validateState,validSet,uid,toKg} from './model.js';
import {validateStrongMetadata} from './strong-import-meta.js';
export const MAX_STRONG_BYTES=10*1024*1024;
const bytes=s=>new TextEncoder().encode(s).length;
const fail=(message,row)=>{throw new Error(`${row?`Row ${row}: `:''}${message}`);};
const norm=s=>s.normalize('NFC').trim().toLocaleLowerCase('en-US');
// Length-delimited strings retain exact identity without hash collisions.
const signature=v=>JSON.stringify(v);
const auxiliary=tag=>/^(?:Rest Timer|Note)$/i.test(tag);
// Strong exports set positions, not stable set IDs. Names changing and the
// modern per-exercise Rest Timer row delimit source blocks; a reset alone does
// not prove a new block. Keep all ambiguous block rows, but do not score them.
function exerciseBlocks(records,modern){
 const blocks=[];let current=null;
 for(const record of records){
  const tag=record.r['Set Order'].trim(),name=record.r['Exercise Name'];
  if(auxiliary(tag)){if(modern&&/^Rest Timer$/i.test(tag))current=null;continue;}
  if(!current||current.name!==name){current={name,records:[],ordinals:new Set(),ambiguous:false};blocks.push(current);}
  record.block=blocks.length-1;current.records.push(record);
  if(modern&&/^\d+$/.test(tag)){
   const ordinal=tag.replace(/^0+(?=\d)/,'');
   if(current.ordinals.has(ordinal))current.ambiguous=true;
   current.ordinals.add(ordinal);
  }
 }
 for(const block of blocks)if(block.ambiguous)for(const record of block.records)record.ambiguousSetOrder=true;
}
function csv(text,delimiter){
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 const push=()=>{if(cell.length>100000)fail('A field exceeds 100,000 characters.');row.push(cell);cell='';closed=false;if(row.length>100)fail('Too many columns.');};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)fail('Malformed CSV quoting.');quoted=true;continue;}
  if(c===delimiter){push();continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;push();if(row.some(x=>x!==''))rows.push(row);row=[];if(rows.length>100001)fail('Too many CSV rows.');continue;}
  if(closed)fail('Unexpected text after a quoted field.');cell+=c;
 }
 if(quoted)fail('Unclosed CSV quote.');if(cell||row.length||closed){push();if(row.some(x=>x!==''))rows.push(row);}return rows;
}
function dateValue(raw,row){
 const m=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(raw.trim());
 if(!m)fail('Use an unambiguous YYYY-MM-DD HH:mm:ss date.',row);
 const [y,mo,d,h,mi,s]=m.slice(1).map(Number),dt=new Date(y,mo-1,d,h,mi,s);
 if(y<1970||dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d||dt.getHours()!==h||dt.getMinutes()!==mi||dt.getSeconds()!==s)fail('Invalid or nonexistent local date/time.',row);
 // A repeated fall-back hour has two valid instants. Never guess which one.
 for(const delta of [-120,-90,-60,-30,30,60,90,120]){const alt=new Date(+dt+delta*60000);if(alt.getFullYear()===y&&alt.getMonth()===mo-1&&alt.getDate()===d&&alt.getHours()===h&&alt.getMinutes()===mi&&alt.getSeconds()===s)fail('Ambiguous daylight-saving local time.',row);}
 return +dt;
}
function duration(raw,seconds,row){
 if(!raw.trim())return null;
 if(seconds){if(!/^\d+(?:\.\d+)?$/.test(raw.trim()))fail('Invalid duration.',row);const n=Number(raw);if(!Number.isSafeInteger(n)||n<0)fail('Duration is outside supported bounds.',row);return n>604800?null:n;}
 const m=/^(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?$/.exec(raw.trim());if(!m||!m.slice(1).some(v=>v!==undefined))fail('Invalid workout duration.',row);
 const n=Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0);return n>604800?null:n;
}
function number(raw,row){if(!raw.trim())return null;if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim()))return NaN;return Number(raw);}
export function inspectStrongImport(text,{weightUnit,distanceUnit,fileName='',size}={}){
 if(typeof text!=='string'||bytes(text)>MAX_STRONG_BYTES||(size!==undefined&&(!Number.isFinite(size)||size<0||size>MAX_STRONG_BYTES)))fail('Choose a CSV no larger than 10 MiB.');
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0],delimiter=first.includes(';')?';':',';
 const data=csv(text,delimiter),headers=data.shift();if(!headers||headers.length<4)fail('This is not a supported workout CSV export.');
 const names=headers.map(h=>h.trim());if(new Set(names).size!==names.length)fail('Duplicate CSV headers.');
 for(const h of ['Date','Workout Name','Exercise Name','Set Order'])if(!names.includes(h))fail(`Missing column: ${h}.`);
 for(const h of names)if(/^(?:Weight|Distance)\s*\(/i.test(h)&&!['Weight (kg)','Distance (meters)'].includes(h))fail(`Unsupported unit column: ${h}. Export a supported CSV format.`);
 for(const h of ['Reps','Seconds'])if(!names.includes(h))fail(`Missing column: ${h}.`);
 if(!names.some(h=>['Weight','Weight (kg)'].includes(h))||!names.some(h=>['Distance','Distance (meters)'].includes(h))||!names.some(h=>['Duration','Duration (sec)'].includes(h)))fail('Missing required metric or duration columns.');
 const explicitWeight=names.includes('Weight (kg)'),explicitDistance=names.includes('Distance (meters)');
 const needsUnits={weight:names.includes('Weight')&&!explicitWeight&&!['kg','lb'].includes(weightUnit),distance:names.includes('Distance')&&!explicitDistance&&!['km','mi','m'].includes(distanceUnit)};
 const groups=[],seenBoundaries=new Set();let current=null;
 for(let i=0;i<data.length;i++){
  const values=data[i],line=i+2;if(values.length!==headers.length)fail('Column count does not match the header.',line);
  const r=Object.fromEntries(names.map((h,j)=>[h,values[j]]));
  if(!r['Workout Name'].trim()||r['Workout Name'].length>500)fail('Invalid or oversized workout name.',line);
  const identity=signature([r.Date,r['Workout Name']]),boundary=signature([identity,r['Workout #']||'']);
  if(names.includes('Workout #')&&!r['Workout #'].trim())fail('Missing source workout identifier.',line);
  if(!current||current.boundary!==boundary){if(seenBoundaries.has(boundary))fail('Noncontiguous repeated workout boundary is ambiguous.',line);seenBoundaries.add(boundary);current={identity,boundary,rows:[],records:[],name:r['Workout Name'],localDate:r.Date,startedAt:dateValue(r.Date,line),durationRaw:r['Duration (sec)']??r.Duration??'',durationSeconds:duration(r['Duration (sec)']??r.Duration??'',names.includes('Duration (sec)'),line)};groups.push(current);}
  if(!names.includes('Workout #')&&r['Set Order'].trim()==='1'&&current.records.some(({r:old})=>old['Exercise Name']===r['Exercise Name']&&old['Set Order'].trim()==='1'))fail('Ambiguous repeated exercise/session boundary. Export with workout identifiers or separate these sessions.',line);
  const dur=duration(r['Duration (sec)']??r.Duration??'',names.includes('Duration (sec)'),line);if(dur!==current.durationSeconds||(r['Duration (sec)']??r.Duration??'')!==current.durationRaw)fail('Conflicting workout durations.',line);
  current.rows.push(values);current.records.push({r,line});
 }
 if(!groups.length)fail('No workout rows found.');
 for(const group of groups)exerciseBlocks(group.records,names.includes('Workout #'));
 return {groups,headers,needsUnits,inputRows:data.length,sourceFormat:delimiter===';'?'Semicolon CSV':'Comma CSV',firstDate:Math.min(...groups.map(g=>g.startedAt)),lastDate:Math.max(...groups.map(g=>g.startedAt)),fileName:String(fileName).slice(0,200),weightUnit:explicitWeight?'kg':weightUnit,distanceUnit:explicitDistance?'m':distanceUnit,explicitWeight,explicitDistance};
}
export function assertStrongImportCurrent(state,preview){if(JSON.stringify(state)!==preview.snapshot)fail('Your Reptide data changed. Review the import and save a fresh backup.');return true;}
export function prepareStrongImport(state,text,options={}){
 validateState(state);const source=inspectStrongImport(text,options),snapshot=JSON.stringify(state),candidate=structuredClone(state),summary={workouts:0,sets:0,unscoredRows:0,duplicates:0,customExercises:0,warnings:['Dates are interpreted in this device’s local time zone. The export does not include a time zone.','Supported set types and RPE are retained. Rest annotations and unsupported fields remain in original source details; they do not change current workout settings.']};
 if(source.needsUnits.weight||source.needsUnits.distance){const error=new Error('Choose the original export units before importing.');error.needsUnits=source.needsUnits;throw error;}
 Object.assign(summary,{inputRows:source.inputRows,sourceFormat:source.sourceFormat,firstDate:source.firstDate,lastDate:source.lastDate});
 const outOfRange=source.groups.filter(g=>g.durationSeconds===null&&g.durationRaw.trim()).length;
 if(outOfRange)summary.warnings.push(`${outOfRange} workout duration(s) exceeded the supported range and will be shown as unknown. Original values remain in the original import details.`);
 const existing=new Map(),identities=new Map();for(const w of state.history){const m=w.strongImport;if(!m)continue;validateStrongMetadata(m);existing.set(m.key,Math.max(existing.get(m.key)||0,m.occurrence));if(!identities.has(m.identity))identities.set(m.identity,new Set());identities.get(m.identity).add(m.key);}
 const sourceKeys=new Map();for(const g of source.groups){g.key=signature([g.records.map(({r})=>Object.keys(r).filter(k=>k!=='Workout #').sort().map(k=>[k,r[k]])),source.weightUnit||null,source.distanceUnit||null]);if(g.key.length>100000)fail('A workout’s source data exceeds supported metadata bounds.');if(!sourceKeys.has(g.identity))sourceKeys.set(g.identity,new Set());sourceKeys.get(g.identity).add(g.key);}
 for(const [identity,keys] of sourceKeys){const old=identities.get(identity);if(old&&[...keys].some(k=>!old.has(k))&&[...old].some(k=>!keys.has(k)))fail('A previously imported workout has changed. Nothing was overwritten.');}
 const occurrences=new Map(),newWorkouts=[];
 for(const g of source.groups){const occurrence=(occurrences.get(g.key)||0)+1;occurrences.set(g.key,occurrence);if(occurrence<=(existing.get(g.key)||0)){summary.duplicates++;continue;}
  const meta={source:'strong',version:1,key:g.key,identity:g.identity,occurrence,durationKnown:g.durationSeconds!==null,localDate:g.localDate,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'local',headers:source.headers,rows:g.rows,unscoredRows:[],auxiliaryRows:[],warnings:[]};
  const workout={id:uid(),name:g.name,startedAt:g.startedAt,finishedAt:g.startedAt+(g.durationSeconds??0)*1000,notes:'',routineId:null,restEndsAt:null,exercises:[],strongImport:meta};
  let previous=null,previousBlock=null;const workoutNotes=new Set(),ambiguousRows=[];
  for(let i=0;i<g.records.length;i++){
   const {r,line,block,ambiguousSetOrder}=g.records[i],name=r['Exercise Name'],tag=r['Set Order'].trim();if(r['Workout Notes'])workoutNotes.add(r['Workout Notes']);
   if(auxiliary(tag)){meta.auxiliaryRows.push(i);summary.auxiliaryRows=(summary.auxiliaryRows||0)+1;continue;}
   if(!name.trim()||name.length>500)fail('Invalid or oversized exercise name.',line);
   const weight=number(r[source.explicitWeight?'Weight (kg)':'Weight']??'',line),reps=number(r.Reps??'',line),seconds=number(r.Seconds??'',line),distance=number(r[source.explicitDistance?'Distance (meters)':'Distance']??'',line);
   const tracking=distance>0?'distance':seconds>0?'duration':weight!==null?'weight-reps':'reps';
   // New local-only catalog entries must not change prior CSV identity or known-load semantics.
   // Explicit opt-out retains the old built-ins plus custom entries; ambiguity rules stay strict.
   const named=[...exercises.filter(e=>e.strongImportMatch!==false),...candidate.customExercises].filter(e=>norm(e.name)===norm(name));
   const missingKnownLoad=weight===null&&named.some(e=>(e.tracking||'weight-reps')==='weight-reps');
   const ambiguousMetrics=(distance>0||seconds>0)&&(weight>0||reps>0);
   const matches=named.filter(e=>(e.tracking||'weight-reps')===tracking);
   let definition=matches.length===1?matches[0]:candidate.customExercises.find(e=>e.strongImport?.exerciseName===name&&e.strongImport.tracking===tracking);
   if(!definition){definition={id:uid(),name,muscle:'Other',equipment:'Unknown',tracking,strongImport:{source:'strong',version:1,exerciseName:name,tracking,comparableLoad:false}};candidate.customExercises.push(definition);summary.customExercises++;}
   if(!previous||previousBlock!==block||previous.exerciseId!==definition.id||previous.strongImportName!==name){previous={id:uid(),exerciseId:definition.id,strongImportName:name,notes:'',sets:[]};workout.exercises.push(previous);}previousBlock=block;
   if(r.Notes&&r.Notes.length<=500&&!previous.notes)previous.notes=r.Notes;
   const rpe=number(r.RPE??'',line);
   const set={id:uid(),...(rpe!==null&&Number.isFinite(rpe)&&rpe>=6&&rpe<=10&&rpe*2===Math.round(rpe*2)?{rpe}:{}),weightKg:weight===null?null:toKg(weight,source.weightUnit),reps,tracking,durationSeconds:seconds,distanceKm:distance===null?null:distance*(source.distanceUnit==='m'?0.001:source.distanceUnit==='mi'?1.609344:1),done:true,...(({W:'warmup',D:'drop',F:'failure'})[tag.toUpperCase()]?{setType:({W:'warmup',D:'drop',F:'failure'})[tag.toUpperCase()]}:{})};
   const performed=/^(?:\d+|W|D|F)$/i.test(tag);
   const bounded=(n,max)=>n===null||(Number.isFinite(n)&&n>=0&&n<=max);
   if(performed&&!ambiguousSetOrder&&!missingKnownLoad&&!ambiguousMetrics&&validSet(set)&&bounded(set.weightKg,5000)&&bounded(set.reps,999)&&(set.reps===null||Number.isInteger(set.reps))&&bounded(seconds,86400)&&bounded(set.distanceKm,2000)){previous.sets.push(set);summary.sets++;}else{meta.unscoredRows.push(i);summary.unscoredRows++;}
   if(ambiguousSetOrder)ambiguousRows.push(i);
  }
  const notes=[...workoutNotes].join('\n');if(notes.length<=500)workout.notes=notes;
  if(meta.unscoredRows.length)meta.warnings.push('Some source rows are preserved as unscored details, not completed Reptide sets.');
  if(ambiguousRows.length){
   summary.ambiguousRows=(summary.ambiguousRows||0)+ambiguousRows.length;
   // Source-detail row numbers are one-based within this workout, matching UI.
   const ranges=[];for(const i of ambiguousRows){const last=ranges.at(-1);if(last&&last[1]===i)last[1]=i+1;else ranges.push([i+1,i+1]);}
   const labels=ranges.map(([a,b])=>a===b?String(a):`${a}–${b}`);
   const listed=labels.join(', ');
   meta.warnings.push(`Repeated set numbers without a clear exercise boundary: ${ambiguousRows.length} source rows preserved unscored. ${listed.length<=600?`Workout source rows: ${listed}.`:'See the rows labeled Unscored in original source details.'} No sets in those ambiguous blocks contribute to totals or records.`);
  }
  if(g.durationSeconds===null)meta.warnings.push('Workout duration was not recorded or exceeded the supported range; the original value is preserved in source details.');
  validateStrongMetadata(meta);newWorkouts.push(workout);summary.workouts++;
 }
 if(summary.ambiguousRows)summary.warnings.push(`${summary.ambiguousRows} source rows have repeated set numbers without a clear exercise boundary. Every row is preserved, but all rows in those ambiguous exercise blocks remain unscored to avoid inflated totals or records. Open Original import details for the affected row numbers.`);
 if(newWorkouts.some(w=>w.exercises.some(e=>candidate.customExercises.some(d=>d.id===e.exerciseId&&d.strongImport?.comparableLoad===false))))summary.warnings.push('Some imported exercises have unverified equipment and load semantics. Weight and volume personal records are not awarded for those exercises.');
 candidate.history=[...state.history,...newWorkouts].sort((a,b)=>b.finishedAt-a.finishedAt);validateState(candidate);
 if(bytes(JSON.stringify(candidate,null,2))>MAX_STRONG_BYTES-4096)fail('Merged data would exceed the 10 MiB backup limit. Nothing was imported.');
 return {state:candidate,snapshot,summary,fileName:source.fileName};
}
