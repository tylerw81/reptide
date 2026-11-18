import {validateState} from './model.js';
function freeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;for(const child of Object.values(value))freeze(child);return Object.freeze(value);}
export function createIncrementalValidator(){
 let checked=new WeakSet(),definitions='';
 return state=>{
  const signature=JSON.stringify(state.customExercises);
  if(signature!==definitions){checked=new WeakSet();definitions=signature;}
  validateState({...state,history:[]});
  if(!Array.isArray(state.history)||state.history.length>10000)throw Error('Invalid or oversized history.');
  const ids=new Set();for(const workout of state.history){if(ids.has(workout.id)||workout.id===state.active?.id)throw Error('Duplicate workout.');ids.add(workout.id);if(!checked.has(workout)){validateState({...state,active:null,routines:[],history:[workout]});freeze(workout);checked.add(workout);}}
  Object.freeze(state.history);return state;
 };
}
