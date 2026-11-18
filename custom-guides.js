import {exercises} from './model.js';
import {illustrationFor} from './illustrations.js';
import {demonstrations} from './videos.js';
import {youtubeId, typeOf} from './training.js';
import {applyGuideCorrection} from './guide-corrections.js';

// This is an offline identity lookup, not fuzzy search. Never infer artwork paths
// or video IDs from names. All media comes from the existing reviewed allowlists.
export function normalizeGuideName(value) {
  if (typeof value !== 'string' || value.length > 500) return '';
  return value.normalize('NFKC').toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\b(?:db|dbs|dumbbells)\b/g, 'dumbbell')
    .replace(/\b(?:bb|barbells)\b/g, 'barbell')
    .replace(/\b(?:kb|kettlebells)\b/g, 'kettlebell')
    .replace(/\bpushups?\b/g, 'push up')
    .replace(/\bpullups?\b/g, 'pull up')
    .replace(/\bchinups?\b/g, 'chin up')
    .replace(/\s+/g, ' ').trim();
}

const builtins = new Map(exercises.map(e => [e.id, e]));
// Only reviewed duplicate identities are collapsed. Shared artwork or video IDs
// alone are NOT evidence of equivalence (some videos cover several variations).
const duplicateGroups = [
  ['chest-press', 'lib-chest-press-machine'],
  ['incline-db', 'lib-incline-bench-press-dumbbell'],
  ['shoulder-press', 'lib-shoulder-press-machine'],
  ['lateral-raise', 'lib-lateral-raise-dumbbell'],
  ['tricep-pushdown', 'lib-triceps-pushdown-cable-straight-bar'],
  ['lat-pulldown', 'lib-lat-pulldown-cable'],
  ['seated-row', 'lib-seated-row-cable'],
  ['rear-delt', 'lib-reverse-fly-machine'],
  ['bicep-curl', 'lib-bicep-curl-dumbbell'],
  ['hammer-curl', 'lib-hammer-curl-dumbbell'],
  ['leg-press', 'lib-leg-press'],
  ['leg-extension', 'lib-leg-extension-machine'],
  ['leg-curl', 'lib-seated-leg-curl-machine'],
  ['romanian-deadlift', 'lib-romanian-deadlift-dumbbell'],
  ['goblet-squat', 'lib-goblet-squat-dumbbell'],
  ['bench-press', 'lib-bench-press-barbell'],
  ['squat', 'lib-squat-barbell'],
  ['deadlift', 'lib-deadlift-barbell'],
  ['pullup', 'lib-pull-up'],
  ['pushup', 'lib-push-up'],
  ['crunch', 'lib-cable-crunch'],
  ['lib-hack-squat', 'lib-hack-squat-machine'],
  ['lib-incline-bicep-curl-dumbbell', 'lib-incline-curl-dumbbell'],
  ['lib-t-bar-row', 'lib-t-bar-row-machine']
];
const identity = new Map(duplicateGroups.flatMap(ids => ids.map(id => [id, ids[0]])));
const identityOf = id => identity.get(id) || id;

// Explicit aliases preserve every meaningful variation: angle, assistance,
// load, arm count, attachment, stance and equipment are never dropped.
const aliases = {
  'chest-press': ['machine chest press'],
  'incline-db': ['incline dumbbell bench press', 'dumbbell incline press'],
  'shoulder-press': ['machine shoulder press'],
  'lateral-raise': ['dumbbell lateral raises', 'dumbbell side lateral raise'],
  'tricep-pushdown': ['straight bar triceps pushdown', 'straight bar tricep pushdown', 'cable straight bar pushdown'],
  'lat-pulldown': ['cable lat pull down', 'lat pull down'],
  'seated-row': ['seated cable row', 'seated cable rows'],
  'chest-row': ['machine chest supported row', 'chest supported machine row'],
  'rear-delt': ['reverse pec deck', 'reverse pec deck fly', 'machine reverse fly'],
  'bicep-curl': ['dumbbell biceps curl', 'dumbbell bicep curls', 'dumbbell curls'],
  'hammer-curl': ['dumbbell hammer curls'],
  'leg-curl': ['seated machine leg curl'],
  'romanian-deadlift': ['dumbbell rdl', 'rdl dumbbell', 'rdl'],
  'goblet-squat': ['dumbbell goblet squat'],
  'bench-press': ['flat barbell bench press'],
  'squat': ['barbell back squat', 'back squat barbell'],
  'pullup': ['pull ups'],
  'pushup': ['push ups', 'press up', 'press ups'],
  'lib-arnold-press-dumbbell': ['dumbbell arnold press'],
  'lib-bench-press-dumbbell': ['flat dumbbell bench press'],
  'lib-bench-press-close-grip-barbell': ['close grip barbell bench press', 'barbell close grip bench press'],
  'lib-bench-press-wide-grip-barbell': ['wide grip barbell bench press', 'barbell wide grip bench press'],
  'lib-bent-over-one-arm-row-dumbbell': ['single arm dumbbell row', 'one arm dumbbell row', 'dumbbell one arm row'],
  'lib-bent-over-row-barbell': ['barbell bent over row', 'bent over barbell row'],
  'lib-bent-over-row-dumbbell': ['dumbbell bent over row', 'bent over dumbbell row'],
  'lib-bicep-curl-barbell': ['barbell biceps curl', 'barbell bicep curls'],
  'lib-bicep-curl-cable': ['cable biceps curl', 'cable bicep curls'],
  'lib-bicep-curl-ez-bar': ['ez bar curl', 'ez bar biceps curl', 'ez curl bar curl'],
  'lib-chest-fly-dumbbell': ['dumbbell fly', 'dumbbell flyes', 'dumbbell chest fly'],
  'lib-chin-up': ['chin ups'],
  'lib-face-pull-cable': ['cable face pull', 'cable face pulls'],
  'lib-front-squat-barbell': ['barbell front squat'],
  'lib-goblet-squat-kettlebell': ['kettlebell goblet squat'],
  'lib-hip-abductor-machine': ['machine hip abduction', 'hip abduction machine'],
  'lib-hip-adductor-machine': ['machine hip adduction', 'hip adduction machine'],
  'lib-hip-thrust-barbell': ['barbell hip thrust'],
  'lib-incline-bench-press-barbell': ['incline barbell bench press', 'incline barbell press'],
  'lib-incline-bench-press-smith-machine': ['incline smith machine bench press', 'smith machine incline bench press'],
  'lib-incline-bicep-curl-dumbbell': ['incline dumbbell curl', 'incline dumbbell biceps curl'],
  'lib-lat-pulldown-underhand-cable': ['underhand cable lat pulldown', 'underhand lat pulldown cable'],
  'lib-lying-leg-curl-machine': ['lying machine leg curl', 'lying leg curl machine'],
  'lib-one-arm-row-cable': ['single arm cable row', 'one arm cable row', 'cable single arm row'],
  'lib-overhead-press-barbell': ['standing barbell overhead press'],
  'lib-overhead-press-dumbbell': ['standing dumbbell overhead press', 'standing dumbbell press'],
  'lib-plank': ['forearm plank'],
  'lib-pull-up-assisted': ['assisted pull up', 'assisted pull ups'],
  'lib-pull-up-weighted': ['weighted pull up', 'weighted pull ups'],
  'lib-push-up-weighted': ['weighted push up', 'weighted push ups'],
  'lib-romanian-deadlift-barbell': ['barbell rdl', 'rdl barbell', 'rdl'],
  'lib-running-treadmill': ['treadmill running', 'treadmill run'],
  'lib-running': ['outdoor running', 'outdoor run'],
  'lib-seated-overhead-press-barbell': ['seated barbell overhead press'],
  'lib-seated-overhead-press-dumbbell': ['seated dumbbell overhead press', 'seated dumbbell press'],
  'lib-skullcrusher-barbell': ['barbell skull crusher', 'barbell skull crushers'],
  'lib-skullcrusher-dumbbell': ['dumbbell skull crusher', 'dumbbell skull crushers'],
  'lib-squat-bodyweight': ['bodyweight squat', 'air squat', 'air squats'],
  'lib-squat-smith-machine': ['smith machine squat'],
  'lib-tricep-extension-overhead-cable': ['overhead cable triceps extension', 'overhead cable tricep extension'],
  'lib-triceps-pushdown-rope': ['rope triceps pushdown', 'rope tricep pushdown', 'cable rope pushdown'],
  'lib-chin-up-assisted': ['assisted chin up', 'assisted chin ups'],
  'lib-chin-up-weighted': ['weighted chin up', 'weighted chin ups'],
  'lib-hollow-hold': ['hollow body hold'],
  'lib-farmer-carry-dumbbell': ['dumbbell farmers carry', 'dumbbell farmers walk', 'dumbbell farmer carry'],
  'lib-rowing-machine': ['rowing machine', 'indoor rowing machine'],
  'lib-pec-deck-machine': ['pec deck machine']
};

const names = new Map();
function addName(name, exercise, kind, needsEquipment = false) {
  const key = normalizeGuideName(name);
  if (!key) return;
  const entries = names.get(key) || [];
  const old = entries.find(item => item.exercise.id === exercise.id);
  if (!old) entries.push({exercise, kind, needsEquipment});
  else if (!needsEquipment) { old.needsEquipment = false; if (kind === 'exact') old.kind = kind; }
  names.set(key, entries);
}
for (const e of exercises) {
  addName(e.name, e, 'exact');
  // Parentheses may contain a variation rather than equipment. Only strip a
  // final parenthesis that exactly equals this entry's equipment field.
  const suffix = e.name.match(/^(.*?)\s*\(([^()]+)\)$/);
  if (suffix && normalizeGuideName(suffix[2]) === normalizeGuideName(e.equipment)) {
    addName(suffix[1], e, 'equipment', true);
    addName(`${e.equipment} ${suffix[1]}`, e, 'alias');
  }
  for (const alias of aliases[e.id] || []) addName(alias, e, 'alias');
}

function lookup(draft) {
  const name = normalizeGuideName(draft?.name);
  if (!name) return {status:'empty', candidates:[]};
  const named = names.get(name) || [];
  if (!named.length) return {status:'no-match', candidates:[]};
  const constraints = ['muscle', 'equipment'].filter(key => draft[key] != null && draft[key] !== '');
  const compatible = named.filter(({exercise:e}) =>
    constraints.every(key => normalizeGuideName(draft[key]) === normalizeGuideName(e[key])) &&
    typeOf(draft) === typeOf(e));
  if (!compatible.length) return {status:'conflict', candidates:named.map(x => x.exercise)};
  const identities = new Set(compatible.map(x => identityOf(x.exercise.id)));
  if (identities.size !== 1 || compatible.every(x => x.needsEquipment) && !constraints.includes('equipment')) {
    return {status:'ambiguous', candidates:compatible.map(x => x.exercise)};
  }
  // Exact spelling is preferred only AFTER ambiguity and context checks. Do not
  // turn a generic exact name into a silent guess among equipment variants.
  const chosen = compatible.find(x => x.kind === 'exact') || compatible[0];
  return {status:'matched', candidates:compatible.map(x => x.exercise), matchedExercise:chosen.exercise, matchedBy:chosen.kind};
}

function describe(result) {
  const selected = result.matchedExercise;
  let message;
  if (result.status === 'empty') message = 'Enter a name to check the existing guide library.';
  else if (result.status === 'no-match') message = 'No matching guide found in the built-in library. Try a more specific exercise name.';
  else if (result.status === 'conflict') message = 'The name matches the library, but the muscle group, equipment or tracking differs. Check those details to use a guide.';
  else if (result.status === 'ambiguous') message = 'More detail is needed to choose a guide safely. Include the exact equipment or variation in the name.';
  else {
    message = `Matched: ${selected.name} · ${selected.equipment}. `;
    message += result.illustration ? 'Illustration available.' : 'No exact illustration is available.';
    if (result.videoSource === 'library') message += ' Video guide available.';
    else if (!result.video) message += ' No video guide is available.';
  }
  if (result.videoSource === 'manual') message += ' Your video link will be kept.';
  if (result.videoSource === 'invalid-manual') message += ' Your video link is invalid; enter a valid HTTPS YouTube video link.';
  return message;
}

function withMedia(result, draft) {
  const matchedExercise = result.matchedExercise || null;
  const guideExerciseId = matchedExercise?.id || null;
  const manual = typeof draft?.videoUrl === 'string' && draft.videoUrl.trim() !== '';
  const manualId = manual ? youtubeId(draft.videoUrl.trim()) : null;
  const libraryVideo = guideExerciseId && Object.hasOwn(demonstrations, guideExerciseId) ? demonstrations[guideExerciseId] : null;
  const video = manual ? (manualId ? {id:manualId, title:'Your selected demonstration', channel:'YouTube', url:draft.videoUrl} : null) : libraryVideo;
  const videoSource = manual ? (manualId ? 'manual' : 'invalid-manual') : libraryVideo ? 'library' : null;
  const resolved = {...result, guideExerciseId, matchedExercise, illustration:guideExerciseId ? illustrationFor(guideExerciseId) : null, video, videoSource};
  return {...resolved, message:describe(resolved)};
}

/** Preview a custom name plus its muscle/equipment/tracking without mutation. */
export function matchCustomGuide(draft = {}) {
  return withMedia(lookup(draft), draft);
}

/** Unified display hook for built-in and custom definitions.
 * Recompute custom identity even if a backup has a valid guideExerciseId, so a
 * renamed exercise or forged/stale association can never force the wrong media.
 */
export function guidesFor(exercise = {}, corrections = {}) {
  const builtin = builtins.get(exercise?.id);
  const guide = builtin
    ? withMedia({status:'builtin', matchedExercise:builtin, candidates:[builtin], matchedBy:'id'}, exercise)
    : matchCustomGuide(exercise);
  return applyGuideCorrection(guide, exercise, corrections);
}

/** Copy-on-save: only derive the association; all user fields remain authoritative. */
export function withCustomGuide(exercise) {
  const copy = {...exercise};
  const match = matchCustomGuide(copy);
  delete copy.guideExerciseId;
  if (match.guideExerciseId) copy.guideExerciseId = match.guideExerciseId;
  return copy;
}
