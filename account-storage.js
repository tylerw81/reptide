import {createHistoryPartitions} from './history-partitions.js';
import {createIncrementalValidator} from './incremental-validation.js';
import {KEY,validateState,initialState} from './model.js';
import {addFeaturedTemplates} from './featured-templates.js';
const copy=v=>structuredClone(v);
export function createWorkoutStorage({native=globalThis.ForgeNative,legacy=globalThis.localStorage}={}){
 const supported=(typeof native?.readWorkoutRecord==='function'||typeof native?.readWorkoutState==='function')&&typeof native?.writeWorkoutState==='function';
 const partitioned=typeof native?.readWorkoutParts==='function'&&typeof native?.writeWorkoutParts==='function',codec=createHistoryPartitions(),checkIncremental=createIncrementalValidator();let cached=null,cachedScope=null,migrated=false;
 let scope='guest';
 const status=()=>{try{return JSON.parse(native?.accountStatus?.()||'{}');}catch{return {};}};
 const selected=()=>{const s=status();return s.signedIn&&s.emailVerified&&s.uid?'user:'+s.uid:'guest';};scope=selected();
 const blank=()=>({format:1,snapshot:addFeaturedTemplates(initialState()),revision:0,generation:0,dirty:false,backup:null,pending:null,conflict:null,syncConsent:null});
 function readRaw(which){if(typeof native.readWorkoutRecord==='function'){const value=native.readWorkoutRecord(which);if(typeof value!=='string')throw Error('Cannot read saved account');if(value.startsWith('!error:'))throw Error(value.slice(7)||'Cannot read saved account');return value;}const r=JSON.parse(native.readWorkoutState(which));if(!r.ok)throw Error(r.error||'Cannot read saved account');return r.value;}
 function writeRecord(which,r,{cloneResult=true,validated=false}={}){if(partitioned){if(!validated)validateState(r.snapshot);try{const encoded=codec.encode({...r,format:1});if(typeof native.stageWorkoutParts==='function'){let batch={},length=0;const flush=()=>{if(!Object.keys(batch).length)return;const result=JSON.parse(native.stageWorkoutParts(which,JSON.stringify(batch)));if(!result.ok)throw Error('Could not stage workouts');batch={};length=0;};for(const [id,text] of Object.entries(encoded.parts)){if(length+text.length>1024*1024)flush();batch[id]=text;length+=text.length;}flush();encoded.parts={};}const result=JSON.parse(native.writeWorkoutParts(which,JSON.stringify(encoded.record),JSON.stringify(encoded.parts)));if(!result.ok)throw Error(result.error||'Cannot save account');codec.committed(encoded.record);cached=cloneRecord(r);cachedScope=which;migrated=true;return cloneResult?copy(r):undefined;}catch(error){invalidate();throw error;}}validateState(r.snapshot);const result=JSON.parse(native.writeWorkoutState(which,JSON.stringify({...r,format:1})));if(!result.ok)throw Error(result.error||'Cannot save account');return cloneResult?copy(r):undefined;}
 function cloneState(s){return s?{...copy({...s,history:[]}),history:s.history}:s;}
 function cloneRecord(r){const out={...r,snapshot:cloneState(r.snapshot)};for(const key of ['backup','pending','conflict'])if(r[key])out[key]={...r[key],snapshot:cloneState(r[key].snapshot)};return out;}
 function invalidate(){cached=null;cachedScope=null;migrated=false;codec.reset();}
 function setState(value){if(!partitioned){return api.setItem(KEY,JSON.stringify(value));}checkIncremental(value);const r=readRecord();if(!migrated)writeRecord(scope,r,{cloneResult:false});writeRecord(scope,{...r,backup:{snapshot:r.snapshot,at:Date.now()},snapshot:value,generation:r.generation+1,dirty:true},{cloneResult:false,validated:true});}
 function readRecord(which=scope){
  if(partitioned){if(cached&&cachedScope===which)return cached;invalidate();const chunked=typeof native.readWorkoutManifest==='function'&&typeof native.readWorkoutBatch==='function';const text=chunked?native.readWorkoutManifest(which):native.readWorkoutParts(which);if(typeof text!=='string'||text.startsWith('!error:'))throw Error('Cannot read saved account');if(text){const record=chunked?codec.decodeFrom(JSON.parse(text),ids=>{const batch=native.readWorkoutBatch(which,JSON.stringify(ids));if(typeof batch!=='string'||batch.startsWith('!error:'))throw Error('Cannot read saved workouts');return JSON.parse(batch);}):codec.decode(JSON.parse(text));validateState(record.snapshot);if(record.format!==1||!Number.isSafeInteger(record.generation)||!Number.isSafeInteger(record.revision))throw Error('Invalid saved account');cached=record;cachedScope=which;migrated=true;return record;}}

  const text=readRaw(which);if(text!==null&&text!==undefined&&text!==''){const r=JSON.parse(text);if(r.format!==1)throw Error('Unsupported account storage');validateState(r.snapshot);if(!Number.isSafeInteger(r.generation)||!Number.isSafeInteger(r.revision))throw Error('Invalid account metadata');if(partitioned){cached=cloneRecord(r);cachedScope=which;}return r;}
  const r=blank();if(which==='guest'){const old=legacy.getItem(KEY);if(old){r.snapshot=validateState(JSON.parse(old));r.generation=1;writeRecord(which,r);}}return r;
 }
 const api={supported,status,partitioned,invalidate,setState,getState(){const state=cloneState(readRecord().snapshot);if(partitioned)checkIncremental(state);return state;},get scope(){return scope;},get uid(){return scope==='guest'?null:scope.slice(5);},select(){invalidate();scope=selected();return scope;},
  getItem(key){if(key!==KEY)throw Error('Invalid storage key');if(!supported)return legacy.getItem(key);return JSON.stringify(readRecord().snapshot);},
  setItem(key,text){if(key!==KEY)throw Error('Invalid storage key');const value=JSON.parse(text);if(partitioned)return setState(value);if(!supported){validateState(value);legacy.setItem(key,text);return;}const r=readRecord();writeRecord(scope,{...r,backup:{snapshot:r.snapshot,at:Date.now()},snapshot:value,generation:r.generation+1,dirty:true},{cloneResult:false});},
  guest(){return supported?copy(readRecord('guest').snapshot):validateState(JSON.parse(legacy.getItem(KEY)||JSON.stringify(initialState())));},
  readRecord,writeRecord,
  database:{get:async key=>{if(!key.startsWith('user:'))throw Error('Invalid scope');return copy(readRecord(key));},update:async(key,fn)=>{if(!key.startsWith('user:'))throw Error('Invalid scope');const which=key;if(which!==scope||which==='guest')throw Error('Account changed');return writeRecord(which,fn(readRecord(which)));}}
 };return api;
}
