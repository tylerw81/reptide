// Small offline logging conveniences. No external service or account required.
export const MAX_HOLD_MS=86400000;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function validateLoggingPreferences(state,ids){
 const notes=state.exerciseSetupNotes;
 if(notes!==undefined&&(!object(notes)||Object.keys(notes).length>ids.size||Object.entries(notes).some(([id,text])=>!ids.has(id)||typeof text!=='string'||text.length>500)))throw new Error('Invalid exercise setup notes.');
 if(state.settings.autoSupersetScroll!==undefined&&typeof state.settings.autoSupersetScroll!=='boolean')throw new Error('Invalid superset scrolling preference.');
 const timer=state.active?.setTimer;
 if(timer!=null){
  const entry=state.active.exercises.find(e=>e.id===timer.entryId),set=entry?.sets.find(s=>s.id===timer.setId);
  if(!object(timer)||!set||set.done||set.tracking!=='duration'||!Number.isSafeInteger(timer.elapsedMs)||timer.elapsedMs<0||timer.elapsedMs>MAX_HOLD_MS||(timer.startedAt!==null&&(!Number.isSafeInteger(timer.startedAt)||timer.startedAt<0||timer.startedAt>8640000000000000)))throw new Error('Invalid hold timer.');
 }
}
export function timerMilliseconds(timer,now=Date.now()){
 if(!timer)return 0;
 return Math.min(MAX_HOLD_MS,Math.max(0,timer.elapsedMs+(timer.startedAt===null?0:Math.max(0,now-timer.startedAt))));
}
export function timerSet(workout){const timer=workout?.setTimer;return timer?workout.exercises.find(e=>e.id===timer.entryId)?.sets.find(s=>s.id===timer.setId):null;}
export function pauseHold(workout,now=Date.now()){
 const timer=workout?.setTimer,set=timerSet(workout);if(!timer||!set)return;
 timer.elapsedMs=timerMilliseconds(timer,now);timer.startedAt=null;
 set.durationSeconds=timer.elapsedMs>=1000?Math.floor(timer.elapsedMs/1000):null;
}
export function toggleHold(workout,entryId,setId,now=Date.now()){
 const entry=workout?.exercises.find(e=>e.id===entryId),set=entry?.sets.find(s=>s.id===setId);
 if(!set||set.done||set.tracking!=='duration')throw new Error('Choose an unfinished duration set.');
 if(workout.setTimer?.setId===setId){
  if(workout.setTimer.startedAt!==null){pauseHold(workout,now);return;}
  if(workout.setTimer.elapsedMs>=MAX_HOLD_MS)throw new Error('Reset the timer to start again.');
  workout.setTimer.startedAt=now;return;
 }
 pauseHold(workout,now);
 // A new measured attempt starts at zero, not the last workout's prefilled target.
 workout.setTimer={entryId,setId,elapsedMs:0,startedAt:now};set.durationSeconds=null;
}
export function clearHold(workout,setId){if(workout?.setTimer?.setId===setId)delete workout.setTimer;}
export function restorePrevious(workout,entryId,setId,previous){
 const entry=workout?.exercises.find(e=>e.id===entryId),set=entry?.sets.find(s=>s.id===setId);
 if(!set||set.done||!previous)return false;
 if((set.tracking||'weight-reps')!==(previous.tracking||'weight-reps'))return false;
 clearHold(workout,setId);
 for(const field of ['weightKg','reps','durationSeconds','distanceKm','inclinePercent'])set[field]=previous[field]??null;
 return true;
}

export const setupNote=(state,id)=>Object.hasOwn(state.exerciseSetupNotes||{},id)?state.exerciseSetupNotes[id]:'';
