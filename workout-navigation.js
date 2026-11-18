// View state is deliberately separate from workout/backup schema 1.
import {KEY} from './model.js';
export const NAV_KEY=KEY+'.navigation';
export const tabs=['train','history','progress','measure','settings'];
export function readNavigation(active,storage=globalThis.localStorage){
 const fallback={id:active?.id||null,minimized:false,tab:'train',scroll:0,drafts:{}};
 try{const raw=storage.getItem(NAV_KEY);if(raw?.length>2500000)return fallback;const value=JSON.parse(raw);if(!active||value?.id!==active.id)return fallback;
 const drafts={};for(const exercise of active.exercises||[])for(const set of exercise.sets||[])for(const field of ['weight','reps','duration','distance']){const key=set.id+':'+field,draft=value.drafts?.[key];if(draft&&typeof draft.value==='string'&&draft.value.length<=100)drafts[key]={value:draft.value,unit:draft.unit==='kg'?'kg':'lb',invalid:draft.invalid==='true'?'true':'false'};}
 return {...fallback,minimized:value.minimized===true,tab:tabs.includes(value.tab)?value.tab:'train',scroll:Number.isFinite(value.scroll)?Math.min(1000000,Math.max(0,value.scroll)):0,drafts};}catch{return fallback;}
}
export function writeNavigation(value,storage=globalThis.localStorage){try{storage.setItem(NAV_KEY,JSON.stringify(value));return true;}catch{return false;}}
export function discardWorkout(state,storage=globalThis.localStorage){
 const candidate={...state,active:null};
 try{storage.setItem(KEY,JSON.stringify(candidate));return {ok:true,state:candidate};}catch(error){return {ok:false,error,state};}
}
