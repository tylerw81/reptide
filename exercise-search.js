import {exerciseAlternativeNames} from './exercise-aliases.js';
export {exerciseAlternativeNames} from './exercise-aliases.js';

// Typographical normalization is separate from researched alternative names.
// Do not reuse search matching as exercise identity resolution.
export function normalizeExerciseSearch(value='') {
 return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim()
  .replace(/\bdb\b/g,'dumbbell').replace(/\bbb\b/g,'barbell').replace(/\bkb\b/g,'kettlebell')
  .replace(/\btricep\b/g,'triceps').replace(/\bbicep\b/g,'biceps')
  .replace(/\b(push|pull|chin|sit|step|press)\s+up(s?)\b/g,'$1up$2')
  .replace(/\s+/g,' ');
}

export function exerciseSearchMatch(exercise,query='') {
 const terms=normalizeExerciseSearch(query).split(' ').filter(Boolean);
 const metadata=`${exercise.equipment||''} ${exerciseDisplayMuscle(exercise)||''}`;
 const matches=name=>{const haystack=normalizeExerciseSearch(`${name} ${metadata}`),words=haystack.split(' ');return terms.every(t=>t.length===1?words.includes(t):haystack.includes(t));};
 if(matches(exercise.name))return {kind:'canonical',label:'',matchedName:exercise.name};
 const names=exerciseAlternativeNames(exercise);
 const alias=names.aliases.find(matches);
 if(alias)return {kind:'alias',label:`Also known as: ${alias}`,matchedName:alias};
 const related=names.related.find(item=>matches(item.name));
 if(related)return {kind:'related',label:`Related variation: ${related.name}`,matchedName:related.name,reason:related.reason};
 return null;
}

// Keep the stored category stable while exposing both familiar equipment names.
export const equipmentLabel = value => value==='Trap bar' ? 'Trap bar (Hex bar)' : value;

export function equipmentOptions(exercises) {
 const preferred=['Machine','Cable','Dumbbell','Barbell','Trap bar','Bodyweight','Smith machine','Kettlebell','Band','Plate','EZ bar','Other'];
 const available=new Set(exercises.map(e=>e.equipment).filter(Boolean));
 return [...preferred.filter(x=>available.has(x)),...[...available].filter(x=>!preferred.includes(x)).sort((a,b)=>a.localeCompare(b))];
}
export function filterExercises(exercises,{muscle='All',equipment='All',query=''}={}) {
 return exercises.filter(e=>(muscle==='All'||matchesMuscleFilter(e,muscle))&&(equipment==='All'||e.equipment===equipment)&&exerciseSearchMatch(e,query));
}

const discoveryMuscleOverrides = Object.freeze({'lib-lying-leg-curl-machine':'Legs','lib-seated-leg-curl-machine':'Legs','lib-narrow-grip-push-up':'Chest'});
export const exerciseDisplayMuscle = exercise => discoveryMuscleOverrides[exercise.id] || exercise.muscle;

// Search-only subgroups; never change stored muscle categories or exercise IDs.
export function matchesMuscleFilter(exercise, muscle) {
 if (muscle === 'Biceps' || muscle === 'Triceps') {
  const name = normalizeExerciseSearch(exercise.name);
  if (muscle === 'Biceps') return !/\b(leg|wrist|palms)\b/.test(name) && /\b(biceps|curl|curls)\b/.test(name);
  return (/\b(triceps|tricep|pushdown|skullcrusher)\b/.test(name) || exercise.id === 'lib-triceps-kickback-dumbbell');
 }
 return exerciseDisplayMuscle(exercise) === muscle;
}
