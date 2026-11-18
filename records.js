import {isWalkingExercise} from './walking-units.js';
import {isWarmup} from './set-types.js';
import {validSet, catalog} from './model.js';
import {uncertainLoad} from './progress-data.js';

// Values stay in canonical units. Display-unit rounding must not change records.
export const RECORD_METRICS = Object.freeze({
  weight: Object.freeze({label:'Heaviest weight', unit:'kg'}),
  volume: Object.freeze({label:'Best set volume', unit:'kg-reps'}),
  reps: Object.freeze({label:'Most reps', unit:'reps'}),
  duration: Object.freeze({label:'Longest hold', unit:'seconds'}),
  distance: Object.freeze({label:'Longest distance', unit:'km'})
});
const metricOrder = Object.keys(RECORD_METRICS);
const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
const completed = workout => workout && timestamp(workout.finishedAt)
  && timestamp(workout.startedAt) && workout.finishedAt >= workout.startedAt;
// Ignore floating-point conversion noise, without rounding genuine improvements.
const exceeds = (value, previous) => value - previous > Math.max(1e-6, Math.max(Math.abs(value), Math.abs(previous)) * 1e-9);
const sameWorkout = (a,b) => a === b || (a?.id != null && a.id === b?.id);
const compare = (a,b) => a.exerciseId.localeCompare(b.exerciseId) || metricOrder.indexOf(a.metric)-metricOrder.indexOf(b.metric);

function setMetrics(set, isCardio, hasUncertainLoad) {
  if (!set || set.done !== true || isWarmup(set) || (set.setType==='failure'&&set.reps===0) || !validSet(set)) return [];
  switch (set.tracking || 'weight-reps') {
    // More assistance is often easier; band load is not a comparable free-weight load.
    case 'weight-reps': return hasUncertainLoad ? [] : [['weight',set.weightKg],['volume',set.weightKg*set.reps]];
    case 'reps': return [['reps',set.reps]];
    case 'duration': return isCardio ? [] : [['duration',set.durationSeconds]];
    case 'distance': return [['distance',set.distanceKm]];
    default: return [];
  }
}

function bestRecords(workouts, state) {
  const cardio = new Set(catalog({...state,customExercises:state.customExercises || []}).filter(e=>e.muscle==='Cardio'||isWalkingExercise(e)).map(e=>e.id));
  const uncertain = new Set(catalog({...state,customExercises:state.customExercises || []}).filter(uncertainLoad).map(e=>e.id));
  const best = new Map();
  // Chronological traversal makes equal bests refer to their first achievement.
  for (const workout of [...workouts].filter(completed).sort((a,b)=>a.finishedAt-b.finishedAt)) {
    for (const entry of workout.exercises || []) {
      if (typeof entry?.exerciseId !== 'string') continue;
      for (const set of entry.sets || []) for (const [metric,value] of setMetrics(set, cardio.has(entry.exerciseId), uncertain.has(entry.exerciseId))) {
        const key = JSON.stringify([entry.exerciseId,metric]);
        const previous = best.get(key);
        if (!previous || value > previous.value) best.set(key, {
          exerciseId:entry.exerciseId, metric, label:RECORD_METRICS[metric].label,
          value, finishedAt:workout.finishedAt
        });
      }
    }
  }
  return [...best.values()].sort(compare);
}

/** Best valid completed set per metric, for Progress. Baselines are included here. */
export function exerciseRecords(state, exerciseId) {
  return bestRecords((state.history || []).filter(w=>!sameWorkout(w,state.active)), state)
    .filter(record=>record.exerciseId===exerciseId);
}

/** True improvements over earlier completed sessions; baselines and ties are excluded.
 * A historical workout is evaluated against its own past, never later sessions.
 * Supply the saved completed workout (before or after inserting it into history).
 */
export function workoutRecords(state, workout) {
  if (!completed(workout) || sameWorkout(workout,state.active)) return [];
  const prior = bestRecords((state.history || []).filter(w=>completed(w)
    && !sameWorkout(w,workout) && !sameWorkout(w,state.active) && w.finishedAt < workout.finishedAt), state);
  const lookup = new Map(prior.map(r=>[JSON.stringify([r.exerciseId,r.metric]),r]));
  return bestRecords([workout], state).flatMap(record=>{
    const previous = lookup.get(JSON.stringify([record.exerciseId,record.metric]));
    return previous && exceeds(record.value,previous.value)
      ? [{...record,previousValue:previous.value,previousFinishedAt:previous.finishedAt}]
      : [];
  });
}
