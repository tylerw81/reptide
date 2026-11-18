const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v,max=100000)=>typeof v==='string'&&v.length<=max;
export function validateStrongMetadata(value) {
 if(value&&Array.isArray(value.history)&&Array.isArray(value.customExercises)){
  for(const e of value.customExercises){validateStrongMetadata(e.strongImport);if(e.strongImport!==undefined&&e.strongImport.exerciseName===undefined)throw new Error('Invalid import exercise metadata.');}
  for(const w of [...value.history,...(value.active?[value.active]:[])]){validateStrongMetadata(w.strongImport);if(w.strongImport!==undefined&&w.strongImport.exerciseName!==undefined)throw new Error('Invalid import workout metadata.');for(const e of w.exercises||[])if(e.strongImportName!==undefined&&(!text(e.strongImportName,500)||!e.strongImportName.trim()))throw new Error('Invalid import source exercise name.');}
  return;
 }
 if(value===undefined)return;
 if(!plain(value)||value.source!=='strong'||value.version!==1)throw new Error('Invalid import import metadata.');
 if(value.exerciseName!==undefined){
  if(!text(value.exerciseName,500)||!['weight-reps','reps','duration','distance'].includes(value.tracking)||value.comparableLoad!==false)throw new Error('Invalid import exercise metadata.');
  return;
 }
 if(value.auxiliaryRows!==undefined&&(!Array.isArray(value.auxiliaryRows)||!Array.isArray(value.rows)||!value.auxiliaryRows.every(i=>Number.isInteger(i)&&i>=0&&i<value.rows.length)))throw new Error('Invalid import auxiliary rows.');
 if(Array.isArray(value.unscoredRows)){const indexes=[...value.unscoredRows,...(value.auxiliaryRows||[])];if(new Set(indexes).size!==indexes.length)throw new Error('Duplicate import source row labels.');}
 if(!text(value.key)||!text(value.identity,2000)||!Number.isSafeInteger(value.occurrence)||value.occurrence<1||typeof value.durationKnown!=='boolean'||!text(value.localDate,100)||!text(value.timeZone,100)||!Array.isArray(value.headers)||value.headers.length>100||!value.headers.every(h=>text(h,500))||!Array.isArray(value.rows)||value.rows.length>10000||!value.rows.every(r=>Array.isArray(r)&&r.length===value.headers.length&&r.every(c=>text(c)))||!Array.isArray(value.unscoredRows)||!value.unscoredRows.every(i=>Number.isInteger(i)&&i>=0&&i<value.rows.length)||!Array.isArray(value.warnings)||!value.warnings.every(w=>text(w,1000)))throw new Error('Invalid import workout metadata.');
}
