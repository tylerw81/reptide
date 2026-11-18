// The Progress tab: records, recorded training time and charts.
import {app} from './app-context.js';
import {recordedTrainingTime} from './history-dates.js';
import {catalog} from './model.js';
import {strengthChartPanel} from './progress-charts.js';
import {exerciseRecords} from './records.js';
import {brand, empty, esc, fmt, icon} from './ui-kit.js';
import {walkingTimeText} from './walking-units.js';

export function recordedTimePanel(){const totals=recordedTrainingTime(app.state.history);return `<div class="progress-feature"><div class="eyebrow">RECORDED TRAINING TIME</div><strong>${Math.round(totals.milliseconds/60000)}<small> min</small></strong><span>Across ${totals.known} sessions with recorded duration${totals.unknown?' · '+totals.unknown+' duration'+(totals.unknown===1?'':'s')+' not recorded':''}</span></div>`;}
export function progressView(){const used=catalog(app.state).filter(e=>app.state.history.some(w=>w.exercises.some(x=>x.exerciseId===e.id&&x.sets.some(s=>s.done))));return `<header class="topbar">${brand()}<span class="muted">One rep at a time.</span></header><main class="page"><div class="eyebrow">PROOF OF PROGRESS</div><h1 class="slogan">Built by<br><span>consistency.</span></h1>${strengthChartPanel(app.state)}${used.length?`${recordedTimePanel()}<div class="section-head"><h2>Personal records</h2><span class="muted">Best logged results</span></div>${used.map(e=>`<button class="record-row" data-action="exercise-history" data-id="${esc(e.id)}"><span class="exercise-symbol">${icon('train',21)}</span><span><strong>${esc(e.name)}</strong><small>${esc(e.muscle)} · ${esc(e.equipment)}</small></span><b>${bestMetric(e)}<small class="record-metric-label">${esc(bestMetricLabel(e))}</small></b>${icon('chevron',16)}</button>`).join('')}`:empty('chart','Let your progress take shape.','Log a session to see exercise history, personal records, and your training totals.','Start training','go-train')}</main>`;}
export function recordValue(record){if(record.metric==='weight')return `${fmt(app.weight(record.value))} ${app.state.settings.unit}`;if(record.metric==='volume')return `${fmt(app.weight(record.value))} ${app.state.settings.unit} × reps`;if(record.metric==='duration')return app.walking(record.exerciseId)?walkingTimeText(record.value):`${record.value} sec`;if(record.metric==='distance')return app.walking(record.exerciseId)?`${app.distanceDisplay(record.value)} ${app.distanceUnit()}`:`${record.value} km`;return `${record.value} reps`;}
export function bestMetric(e){const record=exerciseRecords(app.state,e.id)[0];return record?recordValue(record):'—';}
export function bestMetricLabel(e){return exerciseRecords(app.state,e.id)[0]?.label||'Session history';}
