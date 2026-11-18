import {isWalkingExercise} from './walking-units.js';
import {historySetText} from './best-set.js';
import {fromKg} from './model.js';
import {definitionFor, escapeText as esc, exerciseSessions, localDateLabel, sameNumber, trackingOf, uncertainLoad} from './progress-data.js';

const DAY = 86400000;
const values = set => ({tracking:trackingOf(set), weightKg:set.weightKg ?? null, reps:set.reps ?? null,
  durationSeconds:set.durationSeconds ?? null, distanceKm:set.distanceKm ?? null, inclinePercent:set.inclinePercent ?? null});
const relevantFields = tracking => tracking === 'weight-reps' ? ['weightKg','reps'] : tracking === 'reps' ? ['reps'] : tracking === 'distance' ? ['distanceKm','durationSeconds'] : ['durationSeconds'];
const equalSet = (a,b,tracking) => relevantFields(tracking).every(field => sameNumber(a[field],b[field]));
const number = value => new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(value);

export function formatProgressSet(set, unit='kg') {
  const tracking = trackingOf(set);
  if (tracking === 'reps') return `${set.reps} reps`;
  if (tracking === 'duration') return `${number(set.durationSeconds)} sec`;
  if (tracking === 'distance') return `${number(set.distanceKm)} km · ${number(set.durationSeconds)} sec`;
  return `${number(fromKg(set.weightKg,unit))} ${unit} × ${set.reps}`;
}

/** Read-only options, never prescriptions. No inferred increments, readiness or RIR. */
export function progressionSuggestion(state, exerciseId, {now=Date.now(), targets}={}) {
  const definition = definitionFor(state, exerciseId), tracking = trackingOf(definition);
  const sessions = exerciseSessions(state, exerciseId).filter(session => session.finishedAt <= now);
  const latest = sessions.at(-1), previous = sessions.at(-2);
  const result = {exerciseId, tracking, status:'no-history', title:'Start with a comfortable baseline',
    rationale:'No completed sets are saved for this exercise yet. Choose your own starting values.',
    last:null, proposedSets:[], options:[], caveat:'Optional ideas from your log, not a personalized training plan. Nothing is applied automatically.'};
  if (!latest) return result;
  result.last = {...latest, sets:latest.sets.map(values)};
  result.proposedSets = latest.sets.map(values);
  result.options = [{kind:'repeat',label:'Repeat your last logged sets',sets:latest.sets.map(values)},
    {kind:'reduce',label:'Use fewer reps or a lighter effort if needed',sets:[]}];
  const repeat = (status,rationale) => ({...result,status,title:'Repeat or ease back',rationale});
  if (now-latest.finishedAt > 28*DAY) return repeat('stale','Your last saved session is more than four weeks old. Re-establish a comfortable baseline before increasing.');
  if (latest.incomplete || latest.duplicateEntries) return repeat('incomplete','The latest session has unfinished, invalid or duplicate exercise entries. There is not enough comparable data to suggest an increase.');
  if (latest.sets.some(set => trackingOf(set) !== tracking)) return repeat('tracking-changed','The exercise tracking type differs from the last logged sets. Use the old values as reference only.');
  // Templates and deliberate edits take priority. A blank target is not evidence of readiness.
  if (Array.isArray(targets) && (targets.length !== latest.sets.length || targets.some((set,index) => !equalSet(set,latest.sets[index],tracking)))) {
    return {...repeat('existing-targets','Your current targets differ from the last logged sets. Keep or adjust your chosen plan rather than adding another increase.'),title:'Review your current targets',proposedSets:[]};
  }
  if (tracking === 'duration' || tracking === 'distance') return repeat('timed','Use the last logged time or distance as a reference. Duration and pace alone do not show readiness for a harder session.');
  if (!previous || now-previous.finishedAt > 56*DAY) return repeat('baseline','One recent session establishes a baseline. Repeat it to build a comparison before considering an increase.');
  if (previous.finishedAt === latest.finishedAt) return repeat('ambiguous-order','Two sessions have the same finish time. Their order is unclear, so no increase is suggested.');
  if (previous.incomplete || previous.duplicateEntries || previous.sets.length !== latest.sets.length || previous.sets.some(set => trackingOf(set) !== tracking)) return repeat('not-comparable','Your two latest sessions do not have matching logged sets. Repeat the last values or ease back to establish a consistent comparison.');
  if (tracking === 'weight-reps' && latest.sets.some((set,index) => !sameNumber(set.weightKg,previous.sets[index].weightKg))) return repeat('load-changed','Your load changed between the two latest sessions. Repeat the current load before adding another increase.');
  if (latest.sets.some((set,index) => set.reps < previous.sets[index].reps)) return repeat('reps-decreased','Some logged reps decreased at the same load. Repeating or easing back is more useful than automatically increasing.');
  const index = latest.sets.findIndex(set => set.reps < 999);
  if (index < 0) return repeat('limit','The logged reps are at the app limit. Review the entries instead of increasing them.');
  const proposed = latest.sets.map(values);
  proposed[index].reps += 1;
  result.options.unshift({kind:'one-rep',label:`Try one extra rep on set ${index+1}`,sets:proposed});
  return {...result,status:'one-rep',title:`Optional next step: +1 rep on set ${index+1}`,proposedSets:proposed,
    rationale:`Your two latest sessions have the same number of logged sets${tracking === 'weight-reps' ? ' at the same load' : ''}, with no rep decrease. If you feel ready, try one extra rep on just one set and repeat the others.${uncertainLoad(definition) ? ' Keep the same assistance or band setup; a higher logged weight is not necessarily harder.' : ''}`};
}

/** Drop into a session exercise card. It does not add handlers or change state. */
export function progressionHint(state, entry, options={}) {
  const unit = state.settings?.unit === 'lb' ? 'lb' : 'kg';
  const suggestion = progressionSuggestion(state, entry.exerciseId, {targets:entry.sets,...options});
  const last = suggestion.last;
  const setList = sets => sets.map((set,index)=>`<li><span>Set ${index+1}</span><strong>${esc(isWalkingExercise(definitionFor(state,entry.exerciseId))?historySetText(set,entry.exerciseId,state.settings,definitionFor(state,entry.exerciseId)):formatProgressSet(set,unit))}</strong></li>`).join('');
  return `<details class="progression-hint" data-progression-status="${esc(suggestion.status)}"><summary><span><strong>${esc(suggestion.title)}</strong><small>${last ? `Last logged ${esc(localDateLabel(last.finishedAt))} · ${last.sets.length} completed ${last.sets.length === 1 ? 'set' : 'sets'}` : 'Based only on your saved workout history'}</small></span><span aria-hidden="true">+</span></summary><div class="progression-body"><p>${esc(suggestion.rationale)}</p>${last ? `<h3>Last completed values</h3><ol class="progression-values">${setList(last.sets)}</ol>` : ''}${suggestion.status === 'one-rep' ? `<h3>Optional rep target</h3><ol class="progression-values">${setList(suggestion.proposedSets)}</ol>` : ''}${last ? `<p class="progression-alternative"><strong>Repeating is an option.</strong> Use fewer reps or a lighter effort if needed. Choose weight changes yourself to match the equipment available.</p><p class="progression-note">Only logged sets are compared. Older sessions may not include unfinished planned sets. The log does not tell us your form, recovery or effort.</p>` : ''}<p class="progression-note">${esc(suggestion.caveat)}</p></div></details>`;
}
