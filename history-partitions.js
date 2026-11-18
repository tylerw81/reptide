// Only completed workouts are partitioned. Public backup/cloud schema stays v1.
const slots=['snapshot','backup','pending','conflict'];
export function createHistoryPartitions(){
 let objects=new WeakMap(),arrays=new WeakMap();let known=new Set();
 function remember(key,text){const workout=JSON.parse(text);objects.set(workout,key);known.add(key);return workout;}
 function mapRecord(record,fn){const out={...record};for(const slot of slots){if(slot==='snapshot'){out.snapshot=fn(record.snapshot);}else if(record[slot]?.snapshot)out[slot]={...record[slot],snapshot:fn(record[slot].snapshot)};}return out;}
 function encode(record){const additions={};const packed=mapRecord(record,s=>{if(!s)return s;let refs=arrays.get(s.history);if(!refs||refs.some(key=>!known.has(key)&&!Object.hasOwn(additions,key))){refs=s.history.map(w=>{let key=objects.get(w);if(!key||(!known.has(key)&&!Object.hasOwn(additions,key))){key=crypto.randomUUID();const text=JSON.stringify(w);objects.set(w,key);known.add(key);additions[key]=text;}return key;});arrays.set(s.history,refs);}return {...s,history:{__forgeWorkouts:refs}};});return {record:packed,parts:additions};}
 function decode(payload){const parts=new Map(Object.entries(payload.parts).map(([key,text])=>[key,remember(key,text)]));return mapRecord(payload.record,s=>{if(!s)return s;const refs=s.history?.__forgeWorkouts;if(!Array.isArray(refs))throw Error('Invalid saved workout index');const history=refs.map(key=>{if(!parts.has(key))throw Error('Missing saved workout');return parts.get(key)});arrays.set(history,refs);return {...s,history};});}
 // Failed transactions must not leave references to parts that never committed.
 function reset(){objects=new WeakMap();arrays=new WeakMap();known.clear();}
 function committed(packed){known=new Set();mapRecord(packed,s=>{for(const key of s?.history?.__forgeWorkouts||[])known.add(key);return s;});}
 function decodeFrom(record,reader){const refs=new Set();mapRecord(record,s=>{if(!Array.isArray(s?.history?.__forgeWorkouts))throw Error('Invalid saved workout index');for(const id of s.history.__forgeWorkouts)refs.add(id);return s;});const keys=[...refs],parts=new Map();for(let at=0;at<keys.length;){const wanted=keys.slice(at,at+32),batch=reader(wanted);let count=0;for(const id of wanted){if(!Object.hasOwn(batch,id))break;parts.set(id,remember(id,batch[id]));count++;}if(!count)throw Error('Missing saved workout');at+=count;}return mapRecord(record,s=>{const ids=s.history.__forgeWorkouts,history=ids.map(id=>parts.get(id));arrays.set(history,ids);return {...s,history};});}
 return {encode,decode,decodeFrom,reset,committed};
}
