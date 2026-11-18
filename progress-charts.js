import {isWalkingExercise} from './walking-units.js';
import {fromKg} from './model.js';
import {measurementFields, validDay} from './measurements.js';
import {definitionFor, escapeText as esc, exceeds, exerciseSessions, finishedWorkouts, localDateLabel, trackingOf, uncertainLoad, validCompletedSet} from './progress-data.js';

const METRICS = Object.freeze({
  weight:{label:'Heaviest logged weight',kind:'mass',tracking:'weight-reps',read:set=>set.weightKg},
  volume:{label:'Best single-set volume',kind:'volume',tracking:'weight-reps',read:set=>set.weightKg*set.reps},
  reps:{label:'Most reps in one set',kind:'reps',tracking:'reps',read:set=>set.reps},
  duration:{label:'Longest logged duration',kind:'sec',tracking:'duration',read:set=>set.durationSeconds},
  distance:{label:'Longest logged distance',kind:'km',tracking:'distance',read:set=>set.distanceKm}
});
const metricKeys = Object.keys(METRICS);
const displayUnit = (kind,unit) => kind === 'mass' ? unit : kind === 'length' ? unit === 'lb' ? 'in' : 'cm' : kind === 'volume' ? `${unit}·reps` : kind;
const converted = (value,kind,unit) => ['mass','volume'].includes(kind) ? fromKg(value,unit) : kind === 'length' && unit === 'lb' ? value/2.54 : value;
const unitFor = state => state.settings?.unit === 'lb' ? 'lb' : 'kg';
const number = value => new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(value);
const dateOnly = day => new Date(`${day}T12:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const clockLabel = time => new Date(time).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const valueLabel = (value,unit) => `${number(value)} ${unit}`;

/** One canonical point per finished session. Duplicate exercise entries are aggregated.
 * Record detection compares earlier timestamps only, and is recomputed after every edit,
 * deletion or restore. It never treats the first point, ties or roundoff as a PR.
 */
export function strengthSeries(state, exerciseId, metric='weight') {
  const definition = definitionFor(state,exerciseId), config = METRICS[metric];
  if (!config) return {exerciseId,metric,label:'Exercise history',unit:'',points:[],canMarkRecords:false};
  const unit = unitFor(state);
  const canMarkRecords = !(config.tracking === 'weight-reps' && uncertainLoad(definition)) && !(metric === 'duration' && (definition?.muscle === 'Cardio'||isWalkingExercise(definition)));
  const points = exerciseSessions(state,exerciseId).flatMap(session => {
    const sets = session.sets.filter(set => trackingOf(set) === config.tracking);
    if (!sets.length) return [];
    const canonical = sets.reduce((best,set) => Math.max(best,config.read(set)),-Infinity);
    return [{id:session.workoutId,name:session.name || 'Workout',timestamp:session.finishedAt,canonical,
      value:metric==='duration'&&isWalkingExercise(definition)?canonical/60:converted(canonical,config.kind,unit),date:localDateLabel(session.recordedAt??session.finishedAt),time:clockLabel(session.recordedAt??session.finishedAt),isPR:false,baseline:false}];
  });
  let previousBest = null;
  for (let index=0; index<points.length;) {
    let end=index+1;
    while (end<points.length && points[end].timestamp === points[index].timestamp) end++;
    // Equal-time sessions do not establish an order relative to one another.
    for (let i=index;i<end;i++) {
      points[i].baseline = previousBest === null;
      points[i].isPR = canMarkRecords && previousBest !== null && exceeds(points[i].canonical,previousBest);
      points[i].previousBest = previousBest;
    }
    previousBest = Math.max(previousBest ?? -Infinity,...points.slice(index,end).map(point=>point.canonical));
    index=end;
  }
  return {exerciseId,metric,label:config.label,unit:metric==='duration'&&isWalkingExercise(definition)?'min':displayUnit(config.kind,unit),points,canMarkRecords,
    note:!canMarkRecords ? (definition?.muscle === 'Cardio'||isWalkingExercise(definition)) && metric === 'duration'
      ? 'Longer time is not a speed or fitness record. No PR markers are awarded for cardio duration.'
      : definition?.strongImport?.comparableLoad === false ? 'This imported exercise has unverified equipment/load semantics. Values are preserved, but no load PR markers are awarded.' : 'This exercise uses assistance or bands. Logged load does not reliably indicate difficulty, so no load PR markers are awarded.'
      : metric === 'volume' ? 'Volume is weight × reps for one set, not the total workout. It is not an estimated one-rep max.'
      : metric === 'weight' ? 'Actual logged load, not an estimated one-rep max. Reps and equipment setup can differ between sessions.'
      : metric === 'distance' ? 'Distance is shown as logged in kilometers. Longer distance is not a faster pace.' : 'Each point is the best valid, completed set in that session.'};
}

export function measurementSeries(state, field='weightKg') {
  const definition = measurementFields.find(([key])=>key === field);
  if (!definition) return {field,label:'Measurements',unit:'',points:[],canMarkRecords:false};
  const [,label,max,kind] = definition, unit = unitFor(state);
  const points = (state.measurements || []).filter(row => row && validDay(row.date) && typeof row[field] === 'number'
    && Number.isFinite(row[field]) && row[field] >= 0 && row[field] <= max && (field === 'calories' || row[field] > 0))
    .slice().sort((a,b)=>a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)))
    .map(row=>({id:row.id,canonical:row[field],value:converted(row[field],kind,unit),timestamp:new Date(`${row.date}T12:00:00`).getTime(),date:dateOnly(row.date),day:row.date,isPR:false,baseline:false}));
  return {field,label,unit:displayUnit(kind,unit),points,canMarkRecords:false,
    note:'Each point is a value you entered. Changes are shown neutrally, without health targets or “better/worse” labels. Blank values are omitted.'};
}

/** Build coordinates from real dates, including separate same-day workout times. */
export function chartGeometry(points, {width=360,height=220}={}) {
  if (!points.length) return {points:[],ticks:[],width,height};
  const bounds = {left:76,right:width-16,top:20,bottom:height-36};
  const values = points.map(point=>point.value), minimum = Math.min(...values), maximum = Math.max(...values);
  const padding = maximum === minimum ? Math.max(Math.abs(maximum)*.05,1) : (maximum-minimum)*.1;
  const low = Math.max(0,minimum-padding), high = maximum+padding;
  const first = points[0].timestamp, last = points.at(-1).timestamp;
  return {width,height,bounds,minimum:low,maximum:high,
    points:points.map(point=>({...point,x:first === last ? (bounds.left+bounds.right)/2 : bounds.left+(point.timestamp-first)/(last-first)*(bounds.right-bounds.left),y:bounds.bottom-(point.value-low)/(high-low)*(bounds.bottom-bounds.top)})),
    ticks:[low,(low+high)/2,high].map(value=>({value,y:bounds.bottom-(value-low)/(high-low)*(bounds.bottom-bounds.top)}))};
}

function renderChart(series, key) {
  if (!series.points.length) return `<div class="chart-empty"><strong>No ${esc(series.label.toLowerCase())} logged yet.</strong><p>Log a completed set or measurement to start this chart. Nothing is filled in for you.</p></div>`;
  const points = series.points.slice(-60), latest=points.at(-1), first=series.points[0];
  const delta = latest.value-first.value, geometry=chartGeometry(points);
  const plot = geometry.points.map(point=>`${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const summary = `${series.label}: ${series.points.length} ${series.points.length === 1 ? 'entry' : 'entries'}. Latest ${valueLabel(latest.value,series.unit)} on ${latest.date}. ${series.points.length === 1 ? 'One point establishes a baseline, not a trend.' : `Change since first entry: ${delta > 0 ? '+' : ''}${valueLabel(delta,series.unit)}.`}`;
  const records=series.points.filter(point=>point.isPR), recentRecords=records.slice(-3).reverse();
  const compact = value => new Intl.NumberFormat(undefined,{notation:Math.abs(value)>=10000?'compact':'standard',maximumFractionDigits:Math.abs(value)<10?2:1}).format(value);
  return `<div class="chart-headline"><span>Latest logged</span><strong>${esc(valueLabel(latest.value,series.unit))}</strong><small>${esc(latest.date)}${series.points.length > 1 ? ` · ${delta > 0 ? '+' : ''}${esc(valueLabel(delta,series.unit))} since first` : ' · First entry'}</small></div>
    <svg class="progress-chart" viewBox="0 0 ${geometry.width} ${geometry.height}" role="img" aria-labelledby="${esc(key)}-title ${esc(key)}-description"><title id="${esc(key)}-title">${esc(series.label)} over time</title><desc id="${esc(key)}-description">${esc(summary)} Logged values are in the data list below. The vertical axis is fitted to the displayed values.</desc>
    ${geometry.ticks.map(tick=>`<line class="chart-grid" x1="${geometry.bounds.left}" y1="${tick.y}" x2="${geometry.bounds.right}" y2="${tick.y}"/><text class="chart-tick" x="${geometry.bounds.left-10}" y="${tick.y+4}" text-anchor="end">${esc(compact(tick.value))}</text>`).join('')}
    ${points.length>1 ? `<polyline class="chart-line" points="${plot}"/>` : ''}
    ${geometry.points.map(point=>`${point.isPR ? `<path class="chart-pr" d="M${point.x} ${point.y-7}l7 7-7 7-7-7Z"/>` : `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="4"/>`}`).join('')}
    <text class="chart-tick" x="${geometry.bounds.left}" y="${geometry.height-10}">${esc(new Date(points[0].timestamp).toLocaleDateString(undefined,{month:'short',day:'numeric'}))}</text>${points.length>1 ? `<text class="chart-tick" text-anchor="end" x="${geometry.bounds.right}" y="${geometry.height-10}">${esc(new Date(latest.timestamp).toLocaleDateString(undefined,{month:'short',day:'numeric'}))}</text>` : ''}</svg>
    <p class="chart-caption">${points.length === 1 ? 'One entry is a baseline, not a trend. ' : ''}${series.points.length > points.length ? `Showing the latest ${points.length} of ${series.points.length} entries. ` : 'All logged entries shown. '}Vertical axis fitted to values. Values are rounded for display.${series.canMarkRecords ? ' Stored precision determines PRs.' : ''}${series.canMarkRecords ? ' Diamond = a true improvement over earlier sessions. First entries and ties are not PRs.' : ''}</p>
    ${recentRecords.length ? `<section class="chart-milestones" aria-label="Recent PR milestones"><h3>PR milestones</h3><ul>${recentRecords.map(point=>`<li><strong>${esc(valueLabel(point.value,series.unit))}</strong><span>${esc(point.date)} · ${esc(point.name)}</span></li>`).join('')}</ul>${records.length>3 ? `<p>Latest 3 of ${records.length} improvements.</p>` : ''}</section>` : ''}
    <details class="chart-data"><summary>View ${points.length} logged ${points.length === 1 ? 'value' : 'values'}</summary><div class="chart-table-wrap" role="region" tabindex="0" aria-label="Scrollable logged values"><table><caption>${esc(series.label)} (${esc(series.unit)}), oldest to newest</caption><thead><tr><th scope="col">Date / session</th><th scope="col">Value</th></tr></thead><tbody>${points.map(point=>`<tr><th scope="row">${esc(point.date)}${point.time ? `<small>${esc(point.time)} · ${esc(point.name)}</small>` : ''}</th><td>${esc(number(point.value))}${point.isPR ? '<strong class="chart-record-label">PR</strong>' : point.baseline ? '<small>Baseline</small>' : ''}</td></tr>`).join('')}</tbody></table></div></details>`;
}

const selection = {exerciseId:'',metric:'',field:'weightKg'};
/** Parent's delegated change handler calls this, then render(), then restores focus. */
export function updateProgressChartSelection(target) {
  const kind=target?.dataset?.progressSelect, value=target?.value;
  if (!['exerciseId','metric','field'].includes(kind) || typeof value !== 'string') return false;
  if (kind === 'metric' && !metricKeys.includes(value)) return false;
  if (kind === 'field' && !measurementFields.some(([key])=>key === value)) return false;
  selection[kind]=value;
  if (kind === 'exerciseId') selection.metric='';
  return true;
}

function usedExercises(state) {
  const used = new Set();
  for (const workout of finishedWorkouts(state)) for (const entry of workout.exercises) {
    if ((entry?.sets || []).some(validCompletedSet)) used.add(entry.exerciseId);
  }
  return [...used].map(id=>definitionFor(state,id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
}

export function strengthChartPanel(state, options={}) {
  const exercises=usedExercises(state);
  if (!exercises.length) return `<section class="progress-chart-panel" aria-label="Exercise trends"><h2>Exercise trends</h2><div class="chart-empty"><strong>Your first session starts the chart.</strong><p>Finish a workout to see actual logged results and later PR milestones here.</p></div></section>`;
  const requested=options.exerciseId ?? selection.exerciseId, exercise=exercises.find(item=>item.id === requested) || exercises[0];
  const types = new Set(exerciseSessions(state,exercise.id).flatMap(session=>session.sets.map(trackingOf)));
  const metrics=metricKeys.filter(key=>types.has(METRICS[key].tracking));
  const metric=metrics.includes(options.metric ?? selection.metric) ? options.metric ?? selection.metric : metrics[0];
  const series=strengthSeries(state,exercise.id,metric);
  return `<section class="progress-chart-panel" aria-labelledby="strength-chart-heading"><div class="section-head"><h2 id="strength-chart-heading">Exercise trends</h2></div><div class="chart-controls"><label>Exercise<select data-progress-select="exerciseId" aria-label="Chart exercise">${exercises.map(item=>`<option value="${esc(item.id)}" ${item.id === exercise.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label><label>Metric<select data-progress-select="metric" aria-label="Chart metric">${metrics.map(key=>`<option value="${key}" ${key === metric ? 'selected' : ''}>${esc(METRICS[key].label)}</option>`).join('')}</select></label></div>${renderChart(series,'strength-chart')}<p class="chart-method">${esc(series.note)}</p></section>`;
}

export function measurementChartPanel(state, options={}) {
  const requested=options.field ?? selection.field;
  const field=measurementFields.some(([key])=>key === requested) ? requested : 'weightKg';
  const series=measurementSeries(state,field);
  return `<section class="progress-chart-panel measurement-chart-panel" aria-labelledby="measurement-chart-heading"><div class="section-head"><h2 id="measurement-chart-heading">Measurement trends</h2></div><div class="chart-controls"><label>Measurement<select data-progress-select="field" aria-label="Chart measurement">${measurementFields.map(([key,label])=>`<option value="${key}" ${key === field ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label></div>${renderChart(series,'measurement-chart')}<p class="chart-method">${esc(series.note)}</p></section>`;
}
