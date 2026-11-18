// Account snapshots are transactionally isolated. No auth credentials belong here.
export const LEGACY_KEY='forge.workouts.v1';
export const scopeFor = uid => {if(typeof uid!=='string'||!uid||uid.length>128||/[\u0000-\u0020\u007f]/u.test(uid))throw Error('Invalid account');return 'user:'+uid;};
const copy=v=>structuredClone(v);
const bytes=v=>new TextEncoder().encode(JSON.stringify(v)).length;
export function createAccountStore(db,{validate,initialState,now=()=>Date.now()}){
 const checked=value=>{validate(value);if(bytes(value)>128*1024*1024)throw Error('Snapshot too large');return copy(value);};
 const blank=()=>({snapshot:checked(initialState()),revision:0,generation:0,dirty:false,backup:null,pending:null,conflict:null,syncConsent:null});
 async function read(uid){return copy(await db.get(scopeFor(uid))||blank());}
 async function change(uid,fn){return db.update(scopeFor(uid),v=>fn(v||blank()));}
 return {
  read,
  async save(uid,snapshot){const s=checked(snapshot);return change(uid,r=>({...r,backup:{snapshot:r.snapshot,at:now()},snapshot:s,generation:r.generation+1,dirty:true}));},
  // Source is retained. Explicit approval applies to these exact data and account.
  async importGuest(uid,guest,{approved=false}={}){if(!approved)throw Error('Import approval required');const s=checked(guest);return change(uid,r=>{if(r.dirty||r.revision||r.generation)throw Error('Account already contains data');return {...r,backup:{snapshot:r.snapshot,at:now()},snapshot:s,generation:1,dirty:true};});},
  async consent(uid,{approved=false,recipient,version=1}={}){if(!approved||typeof recipient!=='string'||!recipient||version!==1)throw Error('Sync consent required');return change(uid,r=>({...r,syncConsent:{version,recipient,at:now()}}));},
  async revokeConsent(uid){return change(uid,r=>({...r,syncConsent:null}));},
  async preparePush(uid,{recipient,requestId}){if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(requestId))throw Error('Invalid request ID');return change(uid,r=>{if(r.syncConsent?.recipient!==recipient)throw Error('Sync consent required');if(r.conflict)throw Error('Resolve conflict first');if(r.pending)return r;return {...r,pending:{requestId,baseRevision:r.revision,snapshot:copy(r.snapshot),generation:r.generation}};});},
  async acknowledge(uid,requestId,revision){if(!Number.isSafeInteger(revision)||revision<1)throw Error('Invalid revision');return change(uid,r=>{if(r.pending?.requestId!==requestId)throw Error('Stale acknowledgement');if(revision<=r.pending.baseRevision)throw Error('Invalid revision');return {...r,revision,dirty:r.generation!==r.pending.generation,pending:null};});},
  async receive(uid,{revision,snapshot}){if(!Number.isSafeInteger(revision)||revision<0||snapshot===null&&revision!==0)throw Error('Invalid cloud state');const s=snapshot===null?null:checked(snapshot);return change(uid,r=>{if(revision<r.revision)throw Error('Cloud revision regressed');if(revision===r.revision)return r;if(r.dirty||r.pending)return {...r,conflict:{revision,snapshot:s}};return {...r,backup:{snapshot:r.snapshot,at:now()},snapshot:s,revision,generation:r.generation+1,dirty:false,conflict:null};});},
  async resolve(uid,choice,{approved=false}={}){if(!approved||!['local','cloud'].includes(choice))throw Error('Conflict decision required');return change(uid,r=>{if(!r.conflict)throw Error('No conflict');const c=r.conflict;return {...r,backup:{snapshot:choice==='cloud'?r.snapshot:c.snapshot,at:now()},snapshot:choice==='cloud'?c.snapshot:r.snapshot,revision:c.revision,generation:r.generation+1,dirty:choice==='local',pending:null,conflict:null};});}
 };
}
// IDB transaction completion, not a successful request, is the commit boundary.
// Browsers may use relaxed disk durability; strict option is requested when available.
export async function openAccountDatabase(indexedDB=globalThis.indexedDB){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('forge.accounts.v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('accounts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close other Reptide windows to finish storage setup'));});
 db.onversionchange=()=>db.close();
 const transaction=(mode)=>{try{return db.transaction('accounts',mode,{durability:'strict'});}catch{return db.transaction('accounts',mode);}};
 return {close:()=>db.close(),get:key=>new Promise((resolve,reject)=>{const tx=transaction('readonly');let value;const r=tx.objectStore('accounts').get(key);r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage read aborted'));}),update:(key,fn)=>new Promise((resolve,reject)=>{const tx=transaction('readwrite'),store=tx.objectStore('accounts');let result,failure;const r=store.get(key);r.onsuccess=()=>{try{result=fn(r.result);store.put(result,key);}catch(e){failure=e;tx.abort();}};tx.oncomplete=()=>resolve(copy(result));tx.onerror=()=>reject(failure||tx.error);tx.onabort=()=>reject(failure||tx.error||Error('Storage commit aborted'));})};
}
