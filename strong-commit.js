import {KEY,validateState} from './model.js';
import {assertStrongImportCurrent,MAX_STRONG_BYTES} from './strong-import.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// The UI separately verifies a pre-import backup of this exact snapshot.
// Successful persistence is final; best-effort timers/rendering must not turn it into failure.
export function persistStrongImport(state,preview,{storage=globalThis.localStorage}={}) {
 try{
  if(state.active)throw new Error('Finish or discard your current workout before importing.');
  assertStrongImportCurrent(state,preview);
  const candidate=validateState(preview.state);
  for(const key of new Set([...Object.keys(state),...Object.keys(candidate)]))if(!['history','customExercises'].includes(key)&&!same(state[key],candidate[key]))throw new Error('Import cannot replace existing Reptide data.');
  const history=new Map(candidate.history.map(w=>[w.id,w]));
  if(state.history.some(w=>!same(w,history.get(w.id))))throw new Error('Import cannot replace existing workout history.');
  const custom=new Map(candidate.customExercises.map(e=>[e.id,e]));
  if(state.customExercises.some(e=>!same(e,custom.get(e.id))))throw new Error('Import cannot replace existing exercises.');
  if(new TextEncoder().encode(JSON.stringify(candidate,null,2)).length>MAX_STRONG_BYTES-4096)throw new Error('Merged history exceeds the backup size limit.');
  storage.setItem(KEY,JSON.stringify(candidate));
  return {ok:true,state:candidate};
 }catch(error){return {ok:false,error};}
}
