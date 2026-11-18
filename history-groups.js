// A presentation-only grouping for consecutive imported entries. Strong's rest
// timer rows can split a single exercise into one-entry-per-set. Keep the stored
// entries, IDs, source rows and notes intact; never group different exercises,
// separated occurrences, ordinary Reptide workouts, or supersets.
export function historyExerciseGroups(workout){
 const out=[];
 for(const entry of workout.exercises||[]){
  const previous=out.at(-1);
  if(workout.strongImport && !(workout.supersets||[]).length && previous &&
     previous.exerciseId===entry.exerciseId && previous.strongImportName===entry.strongImportName){
   previous.members.push(entry);
   previous.sets.push(...entry.sets);
   const notes=previous.members.map(e=>e.notes).filter(Boolean);
   previous.notes=[...new Set(notes)].join('\n');
  }else out.push({...entry,sets:[...entry.sets],members:[entry]});
 }
 return out;
}
