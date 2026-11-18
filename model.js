import {isWarmup} from './set-types.js';
import {validateLoggingPreferences} from './simple-logging.js';
import {validateProfile} from './profile.js';
import {recordedWorkoutTime} from './history-dates.js';
import {validateStrongMetadata} from './strong-import-meta.js';
import {validateRestSettings} from './rest-settings.js';
import {validateGuideCorrections} from './guide-corrections.js';
import {validateMeasurements} from './measurements.js';
import {expandedExercises} from './catalog.js';
import {curatedExercises} from './catalog-curated.js';
import {muscles, trackingTypes, cleanGroups, youtubeId} from './training.js';
export const KEY = 'forge.workouts.v1';
export const LB_PER_KG = 2.2046226218;
export const uid = () => globalThis.crypto.randomUUID();
export const exercises = [
  ['chest-press','Chest press','Chest','Machine'],['incline-db','Incline dumbbell press','Chest','Dumbbell'],['cable-fly','Cable fly','Chest','Cable'],
  ['shoulder-press','Shoulder press','Shoulders','Machine'],['lateral-raise','Lateral raise','Shoulders','Dumbbell'],['tricep-pushdown','Triceps pushdown','Arms','Cable'],
  ['lat-pulldown','Lat pulldown','Back','Cable'],['seated-row','Seated row','Back','Cable'],['chest-row','Chest-supported row','Back','Machine'],
  ['rear-delt','Reverse fly','Shoulders','Machine'],['bicep-curl','Dumbbell curl','Arms','Dumbbell'],['hammer-curl','Hammer curl','Arms','Dumbbell'],
  ['leg-press','Leg press','Legs','Machine'],['leg-extension','Leg extension','Legs','Machine'],['leg-curl','Seated leg curl','Legs','Machine'],
  ['romanian-deadlift','Dumbbell Romanian deadlift','Legs','Dumbbell'],['calf-raise','Calf raise','Legs','Machine'],['goblet-squat','Goblet squat','Legs','Dumbbell'],
  ['bench-press','Bench press','Chest','Barbell'],['squat','Back squat','Legs','Barbell'],['deadlift','Deadlift','Back','Barbell'],
  ['pullup','Pull-up','Back','Bodyweight'],['pushup','Push-up','Chest','Bodyweight'],['crunch','Cable crunch','Core','Cable']
].map(([id,name,muscle,equipment])=>({id,name,muscle,equipment})).concat(expandedExercises,curatedExercises);
const template = (id,name,subtitle,ids) => ({id,name,subtitle,exerciseIds:ids,sets:3});
export function initialState() { return {version:1,measurements:[],guideCorrections:{},settings:{unit:'lb',distanceUnit:'mi',restSeconds:90,completionSounds:true,theme:'steel',exerciseRestSeconds:{},restNotifications:false,restAlertSound:true},customExercises:[],routines:[
  template('push','Upper push','Chest · shoulders · triceps',['chest-press','incline-db','shoulder-press','lateral-raise','tricep-pushdown']),
  template('pull','Upper pull','Back · rear delts · biceps',['lat-pulldown','seated-row','rear-delt','bicep-curl']),
  template('legs','Lower body','Quads · hamstrings · calves',['leg-press','romanian-deadlift','leg-curl','leg-extension','calf-raise'])
],history:[],active:null}; }
export const catalog = state => [...exercises,...state.customExercises];
export const exercise = (state,id) => catalog(state).find(e=>e.id===id);
export const toKg = (weight,unit) => unit==='lb' ? weight/LB_PER_KG : weight;
export const fromKg = (weight,unit) => unit==='lb' ? weight*LB_PER_KG : weight;
export const rounded = n => Math.round(n*10)/10;
// Strong's rest-timer rows can split one imported exercise into adjacent one-set
// entries. Read them back as one block (same rule as history-groups.js) so the
// previous values cover every set; stored history is never changed.
export function lastSets(state,id) {
 for (const w of state.history) {
  const i=w.exercises.findIndex(e=>e.exerciseId===id);if(i<0) continue;
  const first=w.exercises[i];let done=first.sets.filter(s=>s.done);
  if(w.strongImport&&!(w.supersets||[]).length) for(let j=i+1;j<w.exercises.length&&w.exercises[j].exerciseId===id&&w.exercises[j].strongImportName===first.strongImportName;j++) done=done.concat(w.exercises[j].sets.filter(s=>s.done));
  if(done.length) return done;
 }
 return [];
}
export function newExercise(state,id,count=3) {const prev=lastSets(state,id);return {id:uid(),exerciseId:id,notes:'',sets:Array.from({length:count},(_,i)=>({id:uid(),weightKg:prev[i]?.weightKg??null,reps:prev[i]?.reps??null,tracking:exercise(state,id)?.tracking||'weight-reps',durationSeconds:prev[i]?.durationSeconds??null,distanceKm:prev[i]?.distanceKm??null,inclinePercent:prev[i]?.inclinePercent??null,...(prev[i]?.setType==='warmup'?{setType:'warmup'}:{}),done:false}))};}
export function startWorkout(state,routine=null,now=Date.now()) {
 if(state.active) return state;
 const entries=(routine?.exerciseIds??[]).map(id=>{
   const targets=routine?.prescriptions?.[id];const entry=newExercise(state,id,targets?.length||routine?.sets||3);
   if(targets) entry.sets=entry.sets.map((s,i)=>({...s,...targets[i],id:s.id,done:false}));
   return entry;
 });
 const supersets=cleanGroups((routine?.supersets||[]).map(g=>g.map(id=>entries.find(e=>e.exerciseId===id)?.id)),entries.map(e=>e.id));
 return {...state,active:{id:uid(),name:routine?.name??'Open workout',bodyParts:[...(routine?.bodyParts||[])],routineId:routine?.id??null,startedAt:now,restEndsAt:null,restTotal:state.settings.restSeconds,notes:'',exercises:entries,supersets}};
}
export function validSet(set) {
 const tracking=set.tracking||'weight-reps';
 if(tracking==='duration'||tracking==='distance') return typeof set.durationSeconds==='number'&&Number.isFinite(set.durationSeconds)&&set.durationSeconds>0&&set.durationSeconds<=86400&&(tracking!=='distance'||(typeof set.distanceKm==='number'&&Number.isFinite(set.distanceKm)&&set.distanceKm>0&&set.distanceKm<=2000));
 return (tracking==='reps'||(typeof set.weightKg==='number'&&Number.isFinite(set.weightKg)&&set.weightKg>=0&&set.weightKg<=5000))&&Number.isInteger(set.reps)&&(set.reps>0||(set.reps===0&&set.setType==='failure'))&&set.reps<=999;
}
export const completedSets = workout => workout.exercises.flatMap(e=>e.sets.filter(s=>s.done&&validSet(s)));
export const volumeKg = workout => completedSets(workout).filter(s=>!isWarmup(s)).reduce((n,s)=>n+(s.tracking&&s.tracking!=='weight-reps'?0:s.weightKg*s.reps),0);
export function finishWorkout(state,now=Date.now()) {if(!state.active||!completedSets(state.active).length) throw new Error('Log at least one set before finishing.');const w={...state.active,finishedAt:now,restEndsAt:null,exercises:state.active.exercises.map(e=>({...e,plannedSetCount:e.sets.length,sets:e.sets.filter(s=>s.done&&validSet(s))})).filter(e=>e.sets.length)};delete w.setTimer;w.supersets=cleanGroups(w.supersets,w.exercises.map(e=>e.id));return {...state,active:null,history:[w,...state.history]};}
export function weeklyCount(state,now=new Date()) {const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7));return state.history.filter(w=>recordedWorkoutTime(w)>=start.getTime()&&recordedWorkoutTime(w)<=now.getTime()).length;}
export function personalBests(state,id) {const entries=state.history.flatMap(w=>w.exercises.filter(e=>e.exerciseId===id).flatMap(e=>e.sets.filter(s=>s.done&&!isWarmup(s)&&!(s.setType==='failure'&&s.reps===0)&&(!s.tracking||s.tracking==='weight-reps')).map(s=>({...s,date:w.finishedAt}))));return {weight:entries.length?Math.max(...entries.map(s=>s.weightKg)):0,volume:entries.length?Math.max(...entries.map(s=>s.weightKg*s.reps)):0,entries};}
export function validateState(value) {
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const text = s => typeof s === 'string' && s.length <= 500;
  const name = s => text(s) && s.trim().length > 0;
  const id = s => text(s) && /^[A-Za-z0-9_-]+$/.test(s);
  const optionalText = s => s == null || text(s);
  const timestamp = n => Number.isSafeInteger(n) && n >= 0 && n <= 8640000000000000;
  const uniqueIds = items => new Set(items.map(item => item.id)).size === items.length;
  if (!object(value) || value.version !== 1 || !object(value.settings) || !['lb','kg'].includes(value.settings.unit) || !Number.isInteger(value.settings.restSeconds) || value.settings.restSeconds < 0 || value.settings.restSeconds > 600) throw new Error('This is not a valid Reptide backup.');
  if (value.featuredTemplatesVersion !== undefined && (!Number.isSafeInteger(value.featuredTemplatesVersion) || value.featuredTemplatesVersion < 0 || value.featuredTemplatesVersion > 1000000)) throw new Error('Invalid featured template version.');
  if (value.settings.distanceUnit !== undefined && !['mi','km'].includes(value.settings.distanceUnit)) throw new Error('Invalid walking distance unit.');
  if (value.settings.theme !== undefined && !['steel','original','dark','magenta','carbon','ocean','daylight','blossom'].includes(value.settings.theme)) throw new Error('Invalid color theme preference.');
  if (value.settings.completionSounds !== undefined && typeof value.settings.completionSounds !== 'boolean') throw new Error('Invalid completion sound preference.');
  if (!Array.isArray(value.customExercises) || !Array.isArray(value.routines) || !Array.isArray(value.history) || value.history.length > 10000 || value.customExercises.length > 1000) throw new Error('Invalid or oversized backup.');
  if (!value.customExercises.every(e => object(e) && id(e.id) && name(e.name) && text(e.muscle) && text(e.equipment)) || !uniqueIds(catalog(value))) throw new Error('Invalid or duplicate exercise data.');
  const builtinIds = new Set(exercises.map(e => e.id));
  if (!value.customExercises.every(e => e.guideExerciseId == null || (typeof e.guideExerciseId === 'string' && builtinIds.has(e.guideExerciseId)))) throw new Error('Invalid built-in exercise guide reference.');
  const ids = new Set(catalog(value).map(e => e.id));
  validateRestSettings(value.settings,ids);
  validateGuideCorrections(value.guideCorrections,ids);
  const bodyParts = v => v == null || (Array.isArray(v) && v.length <= muscles.length && v.every(x=>muscles.includes(x)) && new Set(v).size===v.length);
  const groups = (g, refs) => g == null || (Array.isArray(g) && g.every(x=>Array.isArray(x)&&x.length>=2&&x.every(y=>refs.includes(y))) && new Set(g.flat()).size===g.flat().length);
  const target = t => object(t) && (t.inclinePercent==null||(typeof t.inclinePercent==='number'&&Number.isFinite(t.inclinePercent)&&t.inclinePercent>=0&&t.inclinePercent<=100)) && (t.weightKg==null || (typeof t.weightKg==='number'&&Number.isFinite(t.weightKg)&&t.weightKg>=0&&t.weightKg<=5000)) && (t.reps==null || (Number.isInteger(t.reps)&&t.reps>=0&&t.reps<=999)) && (t.durationSeconds==null||(Number.isFinite(t.durationSeconds)&&t.durationSeconds>=0&&t.durationSeconds<=86400)) && (t.distanceKm==null||(Number.isFinite(t.distanceKm)&&t.distanceKm>=0&&t.distanceKm<=2000));
  if (!value.customExercises.every(e => (e.tracking==null||trackingTypes.includes(e.tracking)) && (e.videoUrl==null||e.videoUrl===''||youtubeId(e.videoUrl)))) throw new Error('Invalid exercise type or YouTube link.');
  if (!value.routines.every(r=>bodyParts(r.bodyParts)&&groups(r.supersets,r.exerciseIds)&& (r.prescriptions==null||(object(r.prescriptions)&&Object.entries(r.prescriptions).every(([eid,sets])=>r.exerciseIds.includes(eid)&&Array.isArray(sets)&&sets.length>0&&sets.length<=100&&sets.every(target)))))) throw new Error('Invalid template settings.');
  if (!value.routines.every(r => object(r) && id(r.id) && name(r.name) && optionalText(r.subtitle) && Array.isArray(r.exerciseIds) && r.exerciseIds.length <= 100 && r.exerciseIds.every(exerciseId => ids.has(exerciseId)) && new Set(r.exerciseIds).size === r.exerciseIds.length && Number.isInteger(r.sets) && r.sets > 0 && r.sets <= 20) || !uniqueIds(value.routines)) throw new Error('Invalid or duplicate routine data.');
  const workout = (w, active = false) => {
    if (!object(w) || !id(w.id) || !name(w.name) || !timestamp(w.startedAt) || (!active && (!timestamp(w.finishedAt) || w.finishedAt < w.startedAt)) || (active && w.finishedAt != null && (!timestamp(w.finishedAt) || w.finishedAt < w.startedAt)) || !optionalText(w.notes) || !bodyParts(w.bodyParts) || (w.restSourceSetId!=null&&!id(w.restSourceSetId)) || (w.routineId != null && !id(w.routineId)) || (w.restEndsAt != null && !timestamp(w.restEndsAt)) || (w.restTotal != null && (!Number.isSafeInteger(w.restTotal) || w.restTotal < 0)) || !Array.isArray(w.exercises) || w.exercises.length > 100) return false;
    if(!groups(w.supersets,w.exercises.map(e=>e.id))) return false;
    const setIds = new Set();
    return w.exercises.every(e => object(e) && id(e.id) && ids.has(e.exerciseId) && optionalText(e.notes) && Array.isArray(e.sets) && e.sets.length <= 100 && (e.plannedSetCount==null||(Number.isInteger(e.plannedSetCount)&&e.plannedSetCount>=e.sets.length&&e.plannedSetCount<=100)) && e.sets.every(s => {
      if (!object(s) || !id(s.id) || setIds.has(s.id) || typeof s.done !== 'boolean' || (s.tracking!=null&&!trackingTypes.includes(s.tracking)) || !target(s) || !(s.weightKg === null || (typeof s.weightKg === 'number' && Number.isFinite(s.weightKg) && s.weightKg >= 0 && s.weightKg <= 5000)) || !(s.reps === null || (Number.isInteger(s.reps) && s.reps >= 0 && s.reps <= 999)) || (s.done && !validSet(s))) return false;
      setIds.add(s.id);
      return true;
    })) && uniqueIds(w.exercises);
  };
  if (!value.history.every(w => workout(w)) || !uniqueIds(value.history) || (value.active !== null && (!workout(value.active, true) || value.history.some(w => w.id === value.active.id)))) throw new Error('Invalid or duplicate workout data.');
  validateLoggingPreferences(value,ids);
  validateProfile(value.profile);
  validateMeasurements(value.measurements);
  validateStrongMetadata(value);
  return value;
}
