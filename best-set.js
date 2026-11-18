import {isWalkingId,isWalkingExercise,walkingTimeText} from './walking-units.js';
import {exercise, fromKg, rounded} from './model.js';
import {validCompletedSet, uncertainLoad, escapeText} from './progress-data.js';

// Display-only selection: never sort or mutate saved sets/history. Warmups are
// excluded when explicitly tagged; the current logger does not invent such tags.
const warmup=s=>s.warmup===true||s.warmUp===true||['warmup','warm-up'].includes(String(s.setType||s.type||'').toLowerCase());
function score(s,def){
 const tracking=s.tracking||'weight-reps';
 if(tracking==='duration')return [s.durationSeconds];
 if(tracking==='distance')return [s.distanceKm,-s.durationSeconds];
 if(tracking==='reps'||uncertainLoad(def))return [s.reps];
 return [s.weightKg,s.reps];
}
function better(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return false;}
export function selectBestSet(entry,def){
 let best=null;
 // Historical sets keep their own tracking type even if a catalog/custom
 // definition changes later. Compare only like-for-like values; for malformed
 // mixed-type entries use the most frequent completed type, ties first seen.
 const counts=new Map();for(const s of entry.sets||[]){if(validCompletedSet(s)&&!warmup(s)){const type=s.tracking||'weight-reps';counts.set(type,(counts.get(type)||0)+1);}}
 const tracking=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]||'weight-reps';
 for(const [index,set] of (entry.sets||[]).entries()){
  if(!validCompletedSet(set)||warmup(set)||(set.tracking||'weight-reps')!==tracking)continue;
  const rank=score(set,def);
  if(!best||better(rank,best.rank))best={set,number:index+1,rank};
 }
 return best;
}
export function bestSetText(set,unit='kg'){
 const tracking=set.tracking||'weight-reps';
 if(tracking==='duration')return `${set.durationSeconds} sec`;
 if(tracking==='distance')return `${set.distanceKm} km · ${set.durationSeconds} sec`;
 if(tracking==='reps')return `${set.reps} reps`;
 return `${rounded(fromKg(set.weightKg,unit))} ${unit} × ${set.reps}`;
}
export function historySetText(set, exerciseId, settings,definition){
 if(isWalkingId(exerciseId,definition)&&(set.tracking||'weight-reps')==='distance'){
  const unit=settings.distanceUnit==='km'?'km':'mi';
  const distance=unit==='km'?set.distanceKm:set.distanceKm/1.609344;
  return `${Math.round(distance*1000)/1000} ${unit} · ${Math.round(set.durationSeconds/60*1000)/1000} min${set.inclinePercent==null?'':` · ${set.inclinePercent}% incline`}`;
 }
 if(isWalkingId(exerciseId,definition)&&(set.tracking||'weight-reps')==='duration')return walkingTimeText(set.durationSeconds);
 return bestSetText(set,settings.unit);
}
export function workoutBestSets(state,workout){
 const groups=new Map();
 for(const entry of workout.exercises||[]){
  const def=exercise(state,entry.exerciseId), key=entry.exerciseId;
  if(!groups.has(key))groups.set(key,{...entry,sets:[...(entry.sets||[])],definition:def});
  else groups.get(key).sets.push(...(entry.sets||[]));
 }
 return [...groups.values()].flatMap(entry=>{
  const best=selectBestSet(entry,entry.definition);if(!best)return [];
  const tracking=best.set.tracking||'weight-reps';
  const criterion=tracking==='duration'?((entry.definition.muscle==='Cardio'||isWalkingExercise(entry.definition))?'Longest duration':'Longest hold'):tracking==='distance'?'Farthest distance':tracking==='reps'||uncertainLoad(entry.definition)?'Most reps':'Heaviest set';
  return [{exerciseId:entry.exerciseId,name:entry.strongImportName||entry.definition.name,...best,criterion,text:historySetText(best.set,entry.exerciseId,state.settings,entry.definition)}];
 });
}
export function bestSetsMarkup(state,workout){
 const rows=workoutBestSets(state,workout);
 return `<section class="completion-best-sets" aria-label="Best set per exercise"><h3>BEST SETS</h3>${rows.map(row=>`<div class="completion-best-row"><span>${escapeText(row.name)}<small>${row.criterion}</small></span><strong>${escapeText(row.text)}</strong></div>`).join('')}<p>One completed working set per exercise. All sets stay in History.</p></section>`;
}
