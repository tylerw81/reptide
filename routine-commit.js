import {KEY,validateState,startWorkout} from './model.js';

// Save a reviewed template (and optionally start it) as one local transaction.
// A failed write never swaps the caller's state or drops an active workout.
export function commitRoutine(state,routine,{replace=false,start=false,storage=globalThis.localStorage,now=Date.now()}={}) {
 try {
  if(start&&state.active)throw new Error('Finish or discard your current workout before starting another.');
  const saved=structuredClone(routine),exists=state.routines.some(item=>item.id===saved.id);
  if(replace&&!exists)throw new Error('This template is no longer available.');
  if(!replace&&exists)throw new Error('This template is already saved.');
  let candidate={...state,routines:replace?state.routines.map(item=>item.id===saved.id?saved:item):[...state.routines,saved]};
  validateState(candidate);
  if(start)candidate=startWorkout(candidate,saved,now);
  validateState(candidate);
  storage.setItem(KEY,JSON.stringify(candidate));
  return {ok:true,state:candidate};
 } catch(error) {return {ok:false,error};}
}
