export const MAX_SYNC_BYTES=10*1024*1024;
// transport is native authenticated HTTPS. Tokens never enter this module or WebView.
export function createSyncClient({store,transport,currentUid,recipient,randomId=()=>crypto.randomUUID()}){
 const running=new Set();
 function assertCurrent(uid){if(currentUid()!==uid)throw Error('Account changed; sync stopped');}
 const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
 return {async sync(uid){
  assertCurrent(uid);if(running.has(uid))throw Error('Sync already running');running.add(uid);
  try{
   let record=await store.read(uid);assertCurrent(uid);
   if(record.syncConsent?.recipient!==recipient)throw Error('Enable cloud sync first');
   if(record.conflict)return {status:'conflict'};
   // Retry a pending exact request before fetching. A prior lost HTTP response may
   // have committed server-side; requestId gives a single logical operation.
   if(!record.pending){const cloud=await transport(uid,'GET','/v1/snapshot');assertCurrent(uid);record=await store.receive(uid,cloud);}
   if(record.conflict)return {status:'conflict'};
   if(!record.dirty&&!record.pending)return {status:'synced'};
   if(bytes(record.pending?.snapshot||record.snapshot)>MAX_SYNC_BYTES)throw Error('This backup exceeds the 10 MiB cloud limit. Your local data is unchanged; export a JSON backup.');
   record=await store.preparePush(uid,{recipient,requestId:randomId()});assertCurrent(uid);const pending=record.pending;
   try{const response=await transport(uid,'PUT','/v1/snapshot',{requestId:pending.requestId,baseRevision:pending.baseRevision,snapshot:pending.snapshot,consent:{version:1,scope:'full-workout-backup'}});assertCurrent(uid);const updated=await store.acknowledge(uid,pending.requestId,response.revision);return {status:updated.dirty?'changes-pending':'synced'};}
   catch(error){assertCurrent(uid);if(error.status!==409||error.code&&error.code!=='conflict')throw error;const cloud=await transport(uid,'GET','/v1/snapshot');assertCurrent(uid);await store.receive(uid,cloud);return {status:'conflict'};}
  }finally{running.delete(uid);}
 }};
}
