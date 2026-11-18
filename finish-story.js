// What a finished workout achieved, for the finish screen and the share images.
// Pure and read-only: it never changes history. Every line is computed from saved
// sets; nothing is invented. Order of headlines (first that is true wins):
// records > weekly goal / streak > lifetime milestone > lifts up > back at it >
// longest walk > new move > template count > matched best > first workout / sets done.
import {exercise, fromKg, rounded, completedSets} from './model.js';
import {selectBestSet} from './best-set.js';
import {workoutRecords} from './records.js';
import {recordedWorkoutTime, shareableWorkoutTime} from './history-dates.js';
import {isWalkingId} from './walking-units.js';
import {uncertainLoad} from './progress-data.js';
import {profileOf} from './profile.js';

const DAY = 86400000;
export const BACK_AFTER_DAYS = 10;
export const WORKOUT_MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
export const SET_MILESTONES = [500, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 50000];
export const TEMPLATE_MILESTONES = [10, 25, 50, 100];
const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const finished = w => w && Number.isFinite(w.finishedAt) && Number.isFinite(w.startedAt);
const plural = (n, one, many) => n === 1 ? one : many;
const fmtInt = n => n.toLocaleString('en-US');

// Monday 00:00 local time of the week containing `time`.
export function weekStart(time) {
  const d = new Date(time); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

// All of one exercise's sets in a workout, as one entry (duplicate entries merge, as in best sets).
function merged(workout, exerciseId) {
  const sets = [];
  for (const e of workout.exercises || []) if (e.exerciseId === exerciseId) sets.push(...(e.sets || []));
  return {exerciseId, sets};
}

function kindOf(set, def, exerciseId) {
  const tracking = set.tracking || 'weight-reps';
  if (tracking === 'weight-reps' && uncertainLoad(def)) return 'reps-only';
  if (tracking === 'duration' && isWalkingId(exerciseId, def)) return 'walk';
  return tracking;
}

function secondsText(seconds, walk) {
  if (walk || seconds >= 60) { const m = Math.round(seconds / 60 * 10) / 10; return `${m} MIN`; }
  return `${seconds} SEC`;
}

// Compare today's best set with the best set from the last session of the same exercise.
// Decided on the values people see (display units, rounded), so "+0 lb" never appears.
export function compareSets(today, previous, def, exerciseId, settings) {
  if (!previous) return {direction: 'new', delta: 'NEW', score: 0};
  const kind = kindOf(today, def, exerciseId);
  if ((previous.tracking || 'weight-reps') !== (today.tracking || 'weight-reps')) return {direction: 'new', delta: 'NEW', score: 0};
  const sign = n => (n > 0 ? '+' : '−') + Math.abs(n);
  const unit = settings?.unit === 'kg' ? 'kg' : 'lb';
  const result = (direction, delta, score) => ({direction, delta, score});
  if (kind === 'weight-reps') {
    const dw = rounded(rounded(fromKg(today.weightKg, unit)) - rounded(fromKg(previous.weightKg, unit))), dr = today.reps - previous.reps;
    const w = `${sign(dw)} ${unit.toUpperCase()}`, r = `${sign(dr)} ${plural(Math.abs(dr), 'REP', 'REPS')}`;
    if (dw === 0 && dr === 0) return result('same', '= SAME', 0);
    if (dw >= 0 && dr >= 0) return result('up', dw && dr ? `${w} · ${r}` : dw ? w : r, (dw > 0 ? dw / Math.max(1, previous.weightKg * (unit === 'lb' ? 2.2046226218 : 1)) : 0) + (dr > 0 ? dr / Math.max(1, previous.reps) / 4 : 0));
    if (dw <= 0 && dr <= 0) return result('down', dw && dr ? `${w} · ${r}` : dw ? w : r, 0);
    return result('mixed', `${w} · ${r}`, 0);
  }
  if (kind === 'reps' || kind === 'reps-only') {
    const dr = today.reps - previous.reps;
    if (!dr) return result('same', '= SAME', 0);
    return result(dr > 0 ? 'up' : 'down', `${sign(dr)} ${plural(Math.abs(dr), 'REP', 'REPS')}`, dr > 0 ? dr / Math.max(1, previous.reps) : 0);
  }
  if (kind === 'duration' || kind === 'walk') {
    const ds = (today.durationSeconds || 0) - (previous.durationSeconds || 0);
    if (!ds) return result('same', '= SAME', 0);
    return result(ds > 0 ? 'up' : 'down', `${ds > 0 ? '+' : '−'}${secondsText(Math.abs(ds), kind === 'walk')}`, ds > 0 ? ds / Math.max(1, previous.durationSeconds) : 0);
  }
  if (kind === 'distance') {
    const km = (today.distanceKm || 0) - (previous.distanceKm || 0), mi = settings?.distanceUnit !== 'km';
    const shown = Math.round((mi ? km / 1.609344 : km) * 100) / 100;
    if (!shown) return result('same', '= SAME', 0);
    return result(shown > 0 ? 'up' : 'down', `${shown > 0 ? '+' : '−'}${Math.abs(shown)} ${mi ? 'MI' : 'KM'}`, shown > 0 ? km / Math.max(0.01, previous.distanceKm) : 0);
  }
  return result('same', '= SAME', 0);
}

function sinceText(previousTime, nowTime) {
  if (!Number.isFinite(previousTime)) return '';
  const days = Math.round((weekStart(nowTime) - weekStart(previousTime)) / DAY);
  const d = new Date(previousTime);
  if (nowTime - previousTime < 7.5 * DAY && days <= 7) return `SINCE LAST ${WEEKDAYS[d.getDay()]}`;
  return `SINCE ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function walkingSeconds(state, workout) {
  let total = 0;
  for (const e of workout.exercises || []) {
    if (!isWalkingId(e.exerciseId, exercise(state, e.exerciseId))) continue;
    for (const s of e.sets || []) if (s.done && Number.isFinite(s.durationSeconds) && s.durationSeconds > 0 && s.setType !== 'warmup') total += s.durationSeconds;
  }
  return total;
}

// Consecutive Monday-based weeks, ending with this workout's week, that have at least one workout.
function weekStreak(times, at) {
  const weeks = new Set(times.map(weekStart));
  let streak = 0, week = weekStart(at);
  while (weeks.has(week)) { streak++; const d = new Date(week); d.setDate(d.getDate() - 7); week = d.getTime(); }
  return streak;
}

/**
 * The finished workout's story. `workout` must be a completed workout from state.history
 * (or one about to be saved). Earlier history is everything that finished before it.
 */
export function finishStory(state, workout) {
  const settings = state.settings || {};
  const at = recordedWorkoutTime(workout);
  const prior = (state.history || []).filter(w => finished(w) && w.id !== workout.id && w.finishedAt < workout.finishedAt)
    .sort((a, b) => b.finishedAt - a.finishedAt);
  const records = (() => { try { return workoutRecords(state, workout); } catch { return []; } })();
  const recordIds = new Set(records.map(r => r.exerciseId));

  // Per exercise: today's best set against the last session of that exercise, and against its all-time best.
  const ids = [...new Set((workout.exercises || []).map(e => e.exerciseId))];
  const rows = [];
  for (const id of ids) {
    const def = exercise(state, id) || {id, name: 'Exercise', muscle: 'Other'};
    const today = selectBestSet(merged(workout, id), def);
    if (!today) continue;
    let previous = null, previousTime = null, allTime = null;
    for (const w of prior) {
      const best = selectBestSet(merged(w, id), def);
      if (!best || (best.set.tracking || 'weight-reps') !== (today.set.tracking || 'weight-reps')) continue;
      if (!previous) { previous = best; previousTime = recordedWorkoutTime(w); }
      if (!allTime || better(best, allTime, def, id)) allTime = best;
    }
    const cmp = compareSets(today.set, previous?.set, def, id, settings);
    const name = (workout.exercises.find(e => e.exerciseId === id)?.strongImportName) || def.name;
    const matched = !!allTime && !recordIds.has(id) && cmp.direction !== 'up' && equalRank(today, allTime, def, id);
    rows.push({exerciseId: id, name, set: today.set, ...cmp, lift: !(def.muscle === 'Cardio' || isWalkingId(id, def)), star: recordIds.has(id), matched, since: sinceText(previousTime, at), everDone: prior.some(w => (w.exercises || []).some(e => e.exerciseId === id))});
  }
  const order = {up: 0, mixed: 1, same: 2, new: 3, down: 4};
  rows.sort((a, b) => (b.star - a.star) || (order[a.direction] - order[b.direction]) || (b.score - a.score));

  const sets = completedSets(workout).length;
  const number = prior.length + 1;
  const setsBefore = prior.reduce((n, w) => n + completedSets(w).length, 0);
  const weekTimes = [...prior.map(recordedWorkoutTime), at];
  const thisWeek = weekTimes.filter(t => weekStart(t) === weekStart(at) && t <= at).length;
  const goal = profileOf(state).weeklyGoal || 3;
  const streak = weekStreak(weekTimes, at);
  const firstOfWeek = thisWeek === 1;
  const up = rows.filter(r => r.direction === 'up' && r.lift);
  const compared = rows.filter(r => r.direction !== 'new');
  const lastBefore = prior[0];
  const gapDays = lastBefore ? (workout.startedAt - lastBefore.finishedAt) / DAY : 0;
  const walkToday = walkingSeconds(state, workout);
  const walkBest = prior.reduce((m, w) => Math.max(m, walkingSeconds(state, w)), 0);
  const newMoves = prior.length ? rows.filter(r => !r.everDone) : [];
  const templateCount = workout.routineId ? prior.filter(w => w.routineId === workout.routineId).length + 1 : 0;
  const setMilestone = SET_MILESTONES.find(m => setsBefore < m && setsBefore + sets >= m);

  // Candidates in priority order: [kind, headline lines, badge].
  const c = [];
  const recordCount = recordIds.size;
  if (recordCount) c.push(['records', [`${recordCount} NEW`, `${plural(recordCount, 'RECORD', 'RECORDS')}.`], `${recordCount} ${plural(recordCount, 'RECORD', 'RECORDS')}`]);
  if (thisWeek === goal && prior.length) c.push(['goal', ['WEEKLY', 'GOAL HIT.'], 'WEEKLY GOAL HIT']);
  if (firstOfWeek && streak >= 3) c.push(['streak', [`${streak} WEEKS`, 'STRAIGHT.'], `${streak}-WEEK STREAK`]);
  if (WORKOUT_MILESTONES.includes(number)) c.push(['milestone', ['WORKOUT', `#${number}.`], `WORKOUT #${number}`]);
  if (setMilestone) c.push(['sets-milestone', [`${fmtInt(setMilestone)} SETS`, 'LOGGED.'], `${fmtInt(setMilestone)} SETS LOGGED`]);
  // As a badge only when it adds something: lifts that went up without setting a record.
  const upWithoutRecord = up.filter(r => !r.star).length;
  if (up.length) c.push(['up', [`${up.length} ${plural(up.length, 'LIFT', 'LIFTS')}`, 'WENT UP.'], upWithoutRecord ? `${upWithoutRecord} MORE ${plural(upWithoutRecord, 'LIFT', 'LIFTS')} UP` : null]);
  if (gapDays >= BACK_AFTER_DAYS) c.push(['back', ['BACK', 'AT IT.'], 'BACK AT IT']);
  if (walkToday > 0 && walkBest > 0 && walkToday > walkBest) c.push(['walk', ['LONGEST', 'WALK YET.'], 'LONGEST WALK']);
  if (newMoves.length === 1) c.push(['new-move', ['NEW MOVE:', `${newMoves[0].name.toUpperCase()}.`], 'NEW MOVE']);
  else if (newMoves.length > 1) c.push(['new-move', [`${newMoves.length} NEW`, 'MOVES.'], `${newMoves.length} NEW MOVES`]);
  if (TEMPLATE_MILESTONES.includes(templateCount)) c.push(['template', [String(workout.name || 'WORKOUT').toUpperCase(), `×${templateCount}.`], `${String(workout.name || 'WORKOUT').toUpperCase()} ×${templateCount}`]);
  if (rows.some(r => r.matched)) c.push(['matched', ['MATCHED', 'YOUR BEST.'], 'MATCHED YOUR BEST']);
  if (!prior.length) c.push(['first', ['WORKOUT', '#1.'], null]);
  c.push(['done', [`${sets} ${plural(sets, 'SET', 'SETS')}.`, 'DONE.'], null]);

  const [kind, lines] = c[0];
  const badges = c.slice(1).filter(x => x[2] && x[0] !== 'done').slice(0, 2).map(x => x[2]);

  // Spotlight: the biggest improvement; on a first workout or with no comparison, the first baseline.
  let spotlight = null;
  const jump = rows.filter(r => r.direction === 'up').sort((a, b) => (b.star - a.star) || (b.lift - a.lift) || (b.score - a.score))[0];
  if (jump) spotlight = {label: jump.star ? 'NEW RECORD' : 'BIGGEST JUMP', row: jump, note: `▲ ${jump.delta}${jump.since ? ' ' + jump.since : ''}`};
  else if (!compared.length && rows.length) spotlight = {label: 'YOUR BASELINE', row: rows[0], note: 'BEAT IT NEXT TIME'};

  return {
    kind, headline: lines, badges, spotlight, rows,
    listTitle: compared.length ? (up.length ? `BEAT LAST TIME · ${up.length} OF ${compared.length}` : 'VS LAST TIME') : 'BASELINES SET',
    stats: {sets, exercises: rows.length, number, time: shareableWorkoutTime(workout)},
    week: {done: thisWeek, goal, streak},
    records: recordCount
  };
}

function rankOf(best, def, id) {
  const s = best.set, kind = kindOf(s, def, id);
  if (kind === 'weight-reps') return [s.weightKg, s.reps];
  if (kind === 'reps' || kind === 'reps-only') return [s.reps];
  if (kind === 'distance') return [s.distanceKm, -(s.durationSeconds || 0)];
  return [s.durationSeconds || 0];
}
function better(a, b, def, id) {
  const x = rankOf(a, def, id), y = rankOf(b, def, id);
  for (let i = 0; i < x.length; i++) if (Math.abs((x[i] || 0) - (y[i] || 0)) > 1e-9) return (x[i] || 0) > (y[i] || 0);
  return false;
}
function equalRank(a, b, def, id) { return !better(a, b, def, id) && !better(b, a, def, id); }
