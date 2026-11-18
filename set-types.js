// Reconcile only when the imported sets still match every original source value.
export const isWarmup = set => set?.setType === 'warmup' || set?.warmup === true || set?.warmUp === true;
export function reconcileStrongSetTypes(state) {
 if(state.strongSetTypesVersion===1||!state.history.some(w=>w.strongImport))return state;
 let changed = false;
 const history = state.history.map(workout => {
  const meta=workout.strongImport;
  if(!meta || !Array.isArray(meta.rows)) return workout;
  const index=Object.fromEntries(meta.headers.map((h,i)=>[h,i]));
  if(index['Exercise Name']===undefined || index['Set Order']===undefined)return workout;
  let units;try{units=JSON.parse(meta.key);}catch{return workout;}
  const weightUnit=units[1],distanceUnit=units[2],skip=new Set([...(meta.unscoredRows||[]),...(meta.auxiliaryRows||[])]),groups=new Map();
  meta.rows.forEach((r,i)=>{if(skip.has(i))return;const name=r[index['Exercise Name']],tag=r[index['Set Order']].trim();if(!/^(?:\d+|W|D|F)$/i.test(tag))return;if(!groups.has(name))groups.set(name,[]);groups.get(name).push({r,tag});});
  const number=(row,key)=>{const v=index[key]===undefined?'':row[index[key]].trim();return v===''?null:Number(v);};
  const near=(a,b)=>a===null&&b==null || Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-7;
  const updates=new Map();
  for(const [name,rows] of groups){
   const entries=workout.exercises.filter(e=>e.strongImportName===name),sets=entries.flatMap(e=>e.sets);
   if(!entries.length||sets.length!==rows.length)continue;
   const compatible=rows.every(({r},i)=>{
    const weight=number(r,index['Weight (kg)']!==undefined?'Weight (kg)':'Weight'),reps=number(r,'Reps'),seconds=number(r,'Seconds'),distance=number(r,index['Distance (meters)']!==undefined?'Distance (meters)':'Distance');
    const kg=weight===null?null:weightUnit==='lb'?weight/2.2046226218:weight;
    const km=distance===null?null:distance*(distanceUnit==='m'?.001:distanceUnit==='mi'?1.609344:1),set=sets[i];
    return near(set.weightKg,kg)&&near(set.reps,reps)&&near(set.durationSeconds,seconds)&&near(set.distanceKm,km);
   });
   if(!compatible)continue;
   rows.forEach(({tag,r},i)=>{const type=({W:'warmup',D:'drop',F:'failure'})[tag.toUpperCase()],rpe=number(r,'RPE'),value={};if(type&&sets[i].setType==null)value.setType=type;if(rpe!==null&&rpe>=6&&rpe<=10&&rpe*2===Math.round(rpe*2)&&sets[i].rpe==null)value.rpe=rpe;if(Object.keys(value).length)updates.set(sets[i].id,value);});
  }
  if(!updates.size)return workout;
  changed=true;return {...workout,exercises:workout.exercises.map(entry=>({...entry,sets:entry.sets.map(set=>updates.has(set.id)?{...set,...updates.get(set.id)}:set)}))};
 });
 return {...state,history:changed?history:state.history,strongSetTypesVersion:1};
}
