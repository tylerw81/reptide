// Optional additions to the v1 data format. Existing IDs and stored weights stay intact.
import {exerciseRestSeconds, defaultRestSeconds, MAX_REST_SECONDS} from './rest-settings.js';
export const muscles = ['Chest','Back','Legs','Shoulders','Arms','Core','Glutes','Calves','Full body','Cardio','Other'];
export const trackingTypes = ['weight-reps','reps','duration','distance'];
export const youtubeId = input => {
  if (!input) return null;
  if (/^[\w-]{11}$/.test(input)) return input;
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase();
    const id = host === 'youtu.be' ? u.pathname.slice(1) : ['youtube.com','www.youtube.com','m.youtube.com'].includes(host) ? (u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})\/?$/)?.[1]) : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
};
export const typeOf = e => e?.tracking || 'weight-reps';
export function cleanGroups(groups, ids) {
  const used = new Set();
  return (groups || []).map(g => g.filter(id => ids.includes(id) && !used.has(id) && used.add(id))).filter(g => g.length > 1);
}
// Mutates only the chosen session/template; a member belongs to at most one group.
export function linkGroup(groups, members, ids) {
  const selected = [...new Set(members)];
  if (selected.length < 2 || selected.some(id => !ids.includes(id))) throw new Error('Choose at least two exercises.');
  return [...cleanGroups((groups || []).map(g => g.filter(id => !selected.includes(id))), ids), selected];
}
export function groupLabel(groups, id) {
  const index = (groups || []).findIndex(g => g.includes(id));
  return index < 0 ? null : `${String.fromCharCode(65 + index)}${groups[index].indexOf(id) + 1}`;
}
export function stopRest(workout) {
  if (!workout) return;
  workout.restEndsAt = null; workout.restSourceSetId = null; workout.restTotal = 0;
}
export function startRest(workout, seconds, now = Date.now(), source = null) {
  if (!workout) return;
  stopRest(workout);
  if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 600 || !Number.isSafeInteger(now) || now < 0) return;
  workout.restTotal = seconds; workout.restEndsAt = now + seconds * 1000; workout.restSourceSetId = source;
}
export const remainingRest = (workout, now = Date.now()) => Number.isSafeInteger(workout?.restEndsAt) ? Math.max(0, Math.ceil((workout.restEndsAt - now) / 1000)) : 0;
export function extendRest(workout, seconds = 30, now = Date.now()) {
  if (!workout?.restEndsAt || remainingRest(workout, now) === 0) { stopRest(workout); return false; }
  if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 600 || !Number.isSafeInteger(workout.restTotal) || workout.restTotal + seconds > MAX_REST_SECONDS || workout.restEndsAt + seconds * 1000 - now > MAX_REST_SECONDS * 1000) return false;
  workout.restEndsAt += seconds * 1000; workout.restTotal = (workout.restTotal || 0) + seconds;
  return true;
}
// A "+30 sec" or "Skip rest" pressed on the Android rest notification while the page was not visible.
// `base` is the `${workout.id}:${restEndsAt}` the page last scheduled; endsAt 0 means skipped.
export function applyRestAdjustment(workout, adjustment) {
  if (!workout || !adjustment || !Number.isSafeInteger(workout.restEndsAt) || adjustment.base !== `${workout.id}:${workout.restEndsAt}`) return false;
  if (adjustment.endsAt === 0) { stopRest(workout); return true; }
  const added = adjustment.endsAt - workout.restEndsAt, total = Number.isSafeInteger(workout.restTotal) ? workout.restTotal : 0;
  if (!Number.isSafeInteger(adjustment.endsAt) || added <= 0 || added % 1000 !== 0 || added > 3600000 || total + added / 1000 > MAX_REST_SECONDS) return false;
  workout.restEndsAt = adjustment.endsAt; workout.restTotal = total + added / 1000;
  return true;
}
export function afterSet(workout, entry, set, settingsOrSeconds, now = Date.now()) {
  const settings = typeof settingsOrSeconds === 'number' ? {restSeconds:settingsOrSeconds} : settingsOrSeconds;
  const group = (workout.supersets || []).find(g => g.includes(entry.id));
  const round = entry.sets.indexOf(set);
  if (round < 0) return null;
  if (!set.done) {
    const source = workout.exercises.find(e => e.sets.some(s => s.id === workout.restSourceSetId));
    // Any member contributing to this round invalidates that round's rest on undo/edit.
    if (workout.restSourceSetId === set.id || (group?.includes(source?.id) && source.sets[round]?.id === workout.restSourceSetId)) stopRest(workout);
    return null;
  }
  let seconds = entry.exerciseId ? exerciseRestSeconds(settings, entry.exerciseId) : defaultRestSeconds(settings);
  if (group) {
    const entries = group.map(id => workout.exercises.find(e => e.id === id)).filter(Boolean);
    const pending = entries.find(e => e.sets[round] && !e.sets[round].done);
    if (pending) { stopRest(workout); return pending.id; }
    // A round uses its longest participating member's rest, independent of completion order.
    seconds = Math.max(0, ...entries.filter(e => e.sets[round]).map(e => exerciseRestSeconds(settings, e.exerciseId)));
  }
  startRest(workout, seconds, now, set.id);
  return null;
}
export function makeTemplate(workout, definitions, id) {
  const exerciseIds = [...new Set(workout.exercises.map(e => e.exerciseId))];
  const first = exerciseIds.map(eid => workout.exercises.find(e => e.exerciseId === eid));
  return {id, name: workout.name, subtitle:'', sets:3, exerciseIds, bodyParts:workout.bodyParts || [],
    prescriptions: Object.fromEntries(first.map(e => [e.exerciseId, e.sets.map(s => ({weightKg:s.weightKg, reps:s.reps, durationSeconds:s.durationSeconds ?? null, distanceKm:s.distanceKm ?? null, inclinePercent:s.inclinePercent ?? null}))])),
    supersets: cleanGroups((workout.supersets || []).map(g => g.map(eid => workout.exercises.find(e => e.id === eid)?.exerciseId)), exerciseIds)};
}
