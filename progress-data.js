import {isWarmup} from './set-types.js';
import {recordedWorkoutTime} from './history-dates.js';
import {catalog, validSet} from './model.js';

export const escapeText = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export const trackingOf = value => value?.tracking || 'weight-reps';
export const definitionFor = (state, id) => catalog({...state, customExercises:state.customExercises || []}).find(item => item.id === id);
export const validCompletedSet = set => !!set && set.done === true && !isWarmup(set) && !(set?.setType==='failure'&&set.reps===0) && ['weight-reps','reps','duration','distance'].includes(trackingOf(set)) && validSet(set);
export const exceeds = (value, previous) => value - previous > Math.max(1e-6, Math.max(Math.abs(value), Math.abs(previous)) * 1e-9);
export const sameNumber = (a, b) => Number.isFinite(a) && Number.isFinite(b) && !exceeds(a,b) && !exceeds(b,a);
const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
export function finishedWorkouts(state) {
  return (state.history || []).filter(workout => workout && timestamp(workout.startedAt) && timestamp(workout.finishedAt)
    && workout.finishedAt >= workout.startedAt && workout.id !== state.active?.id && Array.isArray(workout.exercises))
    .slice().sort((a,b) => a.finishedAt-b.finishedAt || String(a.id).localeCompare(String(b.id)));
}
export function exerciseSessions(state, exerciseId) {
  return finishedWorkouts(state).flatMap(workout => {
    const entries = workout.exercises.filter(entry => entry?.exerciseId === exerciseId);
    if (!entries.length) return [];
    const raw = entries.flatMap(entry => Array.isArray(entry.sets) ? entry.sets : []);
    const working = raw.filter(set=>!isWarmup(set)&&!(set?.setType==='failure'&&set.reps===0));
    const sets = working.filter(validCompletedSet);
    if (!sets.length) return [];
    return [{workoutId:workout.id, name:workout.name, finishedAt:workout.finishedAt, recordedAt:recordedWorkoutTime(workout), sets,
      incomplete:Boolean(workout.strongImport?.unscoredRows?.length) || working.length !== sets.length || entries.some(entry => Number.isInteger(entry.plannedSetCount) && entry.plannedSetCount > (entry.sets || []).filter(set=>set?.done===true&&validSet(set)).length),
      duplicateEntries:entries.length > 1}];
  });
}
export const uncertainLoad = definition => definition?.strongImport?.comparableLoad === false || /\b(?:assisted|assistance)\b/i.test(`${definition?.name || ''} ${definition?.equipment || ''}`) || /band/i.test(definition?.equipment || '');
export const localDateLabel = milliseconds => new Date(milliseconds).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
