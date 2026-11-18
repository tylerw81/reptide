import {isWalkingId} from './walking-units.js';
import {uid,validSet,fromKg,toKg,rounded} from './model.js';
import {historyExerciseGroups} from './history-groups.js';
import {recordedWorkoutTime} from './history-dates.js';
import {cleanGroups} from './training.js';
const copy=v=>structuredClone(v);
export const isWalking=(id,definition)=>isWalkingId(id,definition);
const logged=s=>s.done&&validSet(s);
export function groupHistoryMonths(history){
 const months=new Map();
 for(const w of [...history].sort((a,b)=>recordedWorkoutTime(b)-recordedWorkoutTime(a))){const d=new Date(recordedWorkoutTime(w)),key=`${d.getFullYear()}-${d.getMonth()}`;if(!months.has(key))months.set(key,{key,label:d.toLocaleDateString(undefined,{month:'long',year:'numeric'}),workouts:[]});months.get(key).workouts.push(w);}
 return [...months.values()];
}
const target=s=>({weightKg:s.weightKg??null,reps:s.reps??null,durationSeconds:s.durationSeconds??null,distanceKm:s.distanceKm??null,inclinePercent:s.inclinePercent??null,...(s.setType?{setType:s.setType}:{})});
export function repeatHistoricWorkout(state,w,now=Date.now()){
 if(state.active)throw Error('Finish your current workout before starting another.');
 const ids=new Map(),exercises=historyExerciseGroups(w).filter(e=>e.sets.some(logged)).map(e=>{const id=uid();for(const member of e.members)ids.set(member.id,id);return {id,exerciseId:e.exerciseId,notes:e.notes||'',sets:e.sets.filter(logged).map(s=>({id:uid(),...target(s),tracking:s.tracking||'weight-reps',done:false}))};});
 if(!exercises.length)throw Error('This workout has no completed sets to repeat.');
 if(exercises.some(e=>e.sets.length>100))throw Error('This workout has more than 100 sets for an exercise.');
 return {...state,active:{id:uid(),name:w.name,bodyParts:[...(w.bodyParts||[])],routineId:null,startedAt:now,restEndsAt:null,restTotal:state.settings.restSeconds,notes:'',exercises,supersets:cleanGroups((w.supersets||[]).map(g=>g.map(id=>ids.get(id))),exercises.map(e=>e.id))}};
}
export function historicTemplate(w,name=w.name,definitions=[]){
 if(!name.trim())throw Error('Enter a template name.');
 const entries=new Map();for(const e of w.exercises){const sets=e.sets.filter(logged);const def=definitions.find(d=>d.id===e.exerciseId);if(def&&sets.some(s=>(s.tracking||'weight-reps')!==(def.tracking||'weight-reps')))throw Error('An exercise’s tracking type has changed. Create its template from a new workout instead.');if(sets.length)entries.set(e.exerciseId,[...(entries.get(e.exerciseId)||[]),...sets]);}
 if(!entries.size)throw Error('This workout has no completed sets to save.');
 if([...entries.values()].some(sets=>sets.length>100))throw Error('A template can hold up to 100 sets per exercise.');
 const exerciseIds=[...entries.keys()];return {id:uid(),name:name.trim(),subtitle:'',sets:3,bodyParts:[...(w.bodyParts||[])],exerciseIds,prescriptions:Object.fromEntries([...entries].map(([id,sets])=>[id,sets.map(target)])),supersets:cleanGroups((w.supersets||[]).map(g=>g.map(id=>w.exercises.find(e=>e.id===id)?.exerciseId)),exerciseIds)};
}
const display=(s,key,id,settings,definition)=>{const value=s[key];if(value==null)return '';if(key==='weightKg')return String(rounded(fromKg(value,settings.unit)));if(isWalking(id,definition)&&key==='distanceKm')return String(Math.round((settings.distanceUnit==='km'?value:value/1.609344)*1000)/1000);if(isWalking(id,definition)&&key==='durationSeconds')return String(Math.round(value/60*1000)/1000);return String(value);};
const fields=['weightKg','reps','durationSeconds','distanceKm','inclinePercent'];
const dateValue=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function setFields(s,id,settings,definition){return {...Object.fromEntries(fields.map(key=>[key,display(s,key,id,settings,definition)])),setType:s.setType||'',rpe:s.rpe==null?'':String(s.rpe)};}
export function createHistoryEditor(w,settings,definitions=[]){const editor={workout:copy(w),settings:copy(settings),values:{name:w.name,date:dateValue(w.startedAt),notes:w.notes||'',exerciseNotes:{},sets:{}},baselineSets:{},entryTracking:{},entryCounts:{},walkingIds:w.exercises.filter(e=>isWalking(e.exerciseId,definitions.find(d=>d.id===e.exerciseId))).map(e=>e.exerciseId)};for(const e of w.exercises){editor.entryCounts[e.id]=e.sets.length;editor.entryTracking[e.id]=e.sets[0]?.tracking||'weight-reps';editor.values.exerciseNotes[e.id]=e.notes||'';for(const s of e.sets){editor.values.sets[s.id]=setFields(s,e.exerciseId,settings,definitions.find(d=>d.id===e.exerciseId));editor.baselineSets[s.id]=copy(editor.values.sets[s.id]);}}editor.baselineValues=copy(editor.values);editor.baseline=editorFingerprint(editor);return editor;}
function editorFingerprint(editor){return JSON.stringify({workout:editor.workout,values:editor.values});}
export const historyEditorDirty=editor=>editorFingerprint(editor)!==editor.baseline;
export function addHistorySet(editor,entryId){const entry=editor.workout.exercises.find(e=>e.id===entryId);if(!entry)throw Error('Exercise not found.');const group=historyExerciseGroups(editor.workout).find(g=>g.members.some(e=>e.id===entryId));if(group.sets.length>=100)throw Error('An exercise can hold up to 100 sets.');const prior=group.sets.at(-1),set={...(prior?target(prior):{weightKg:null,reps:null,durationSeconds:null,distanceKm:null,inclinePercent:null}),id:uid(),tracking:prior?.tracking||editor.entryTracking[entry.id]||'weight-reps',done:true};entry.sets.push(set);editor.values.sets[set.id]=prior?{...editor.values.sets[prior.id],rpe:''}:setFields(set,entry.exerciseId,editor.settings);editor.baselineSets[set.id]=prior?{...(editor.baselineSets[prior.id]||{}),rpe:''}:setFields(set,entry.exerciseId,editor.settings);return set.id;}
export function removeHistorySet(editor,setId){for(const e of editor.workout.exercises)e.sets=e.sets.filter(s=>s.id!==setId);delete editor.values.sets[setId];}
export function saveHistoryEditor(editor){
 const w=copy(editor.workout),v=editor.values;if(!v.name.trim())throw Error('Enter a workout name.');if(v.name!==editor.baselineValues.name)w.name=v.name.trim();if(v.notes!==editor.baselineValues.notes)w.notes=v.notes;
 if(v.date!==dateValue(w.startedAt)){const [year,month,day]=v.date.split('-').map(Number),d=new Date(w.startedAt),length=w.finishedAt-w.startedAt;d.setFullYear(year,month-1,day);if(!/^\d{4}-\d\d-\d\d$/.test(v.date)||!Number.isFinite(d.getTime())||d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day||d.getTime()<0)throw Error('Choose a valid workout date.');w.startedAt=d.getTime();w.finishedAt=w.startedAt+length;}
 for(const e of w.exercises){if(v.exerciseNotes[e.id]!==editor.baselineValues.exerciseNotes[e.id])e.notes=v.exerciseNotes[e.id];for(const s of e.sets){const raw=v.sets[s.id],baseline=editor.baselineSets[s.id]||{};for(const key of fields)if(raw[key]!==baseline[key]){let value=raw[key]===''?null:Number(raw[key]);if(value!==null){if(key==='weightKg')value=toKg(value,editor.settings.unit);if(editor.walkingIds.includes(e.exerciseId)&&key==='distanceKm'&&editor.settings.distanceUnit!=='km')value*=1.609344;if(editor.walkingIds.includes(e.exerciseId)&&key==='durationSeconds')value*=60;}s[key]=value;}if(raw.setType!==baseline.setType){if(raw.setType)s.setType=raw.setType;else delete s.setType;}if(raw.rpe!==baseline.rpe){if(raw.rpe!=='')s.rpe=Number(raw.rpe);else delete s.rpe;}if(!validSet(s)||(s.inclinePercent!=null&&(!Number.isFinite(s.inclinePercent)||s.inclinePercent<0||s.inclinePercent>100))||(s.rpe!=null&&(!Number.isFinite(s.rpe)||s.rpe<0||s.rpe>10))){const error=Error('Check the values in this set before saving.');error.setId=s.id;throw error;}}if(e.plannedSetCount!==undefined&&e.sets.length!==editor.entryCounts[e.id])e.plannedSetCount=e.sets.length;}
 w.exercises=w.exercises.filter(e=>e.sets.length||editor.entryCounts[e.id]===0);if(Object.values(editor.entryCounts).some(n=>n>0)&&!w.exercises.some(e=>e.sets.length))throw Error('Keep at least one completed set in this workout.');if(w.supersets!==undefined)w.supersets=cleanGroups(w.supersets,w.exercises.map(e=>e.id));return w;
}
