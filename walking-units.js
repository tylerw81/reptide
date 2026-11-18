const builtin=new Set(['lib-walking','lib-walking-treadmill']);
const normalized=name=>String(name||'').normalize('NFKC').toLowerCase().replace(/[()_-]/g,' ').replace(/\s+/g,' ').trim();
export function isWalkingExercise(def){return !!def&&(builtin.has(def.id)||['walking','incline walk treadmill','incline walking treadmill','walking treadmill','treadmill walking','treadmill walk','outdoor walking'].includes(normalized(def.name)));}
export const isWalkingId=(id,def)=>builtin.has(id)||isWalkingExercise(def);
export function walkingTimeText(seconds){const n=new Intl.NumberFormat(undefined,{maximumFractionDigits:3});return seconds>=60?`${n.format(seconds/60)} min`:`${n.format(seconds)} sec`;}
