import {getTheme} from './themes.js';
import {plateMark} from './brand-mark.js';
import {historySetText} from './best-set.js';
import {exercise} from './model.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WEEKDAY=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],MONTH=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// The Reptide mark (the bolt-bore plate, same as web/icon.svg).
const markSvg=(cls,label='')=>plateMark(cls,{label});
const wave=(w,h,y,amp,cls='')=>{let d=`M0 ${y}`;for(let x=0;x<w;x+=w/8){d+=` C${x+w/24} ${y-amp} ${x+w/12} ${y+amp} ${x+w/8} ${y}`;}return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} V${h} H0Z"/></svg>`;};
export function weekNote(week){
 if(!week||!week.goal)return '';
 if(week.done>=week.goal)return week.done===week.goal?"Tide's in. Weekly goal hit.":'Past your weekly goal.';
 const left=week.goal-week.done;return left===1?"One more and the tide's in.":`${left} more to reach your weekly goal.`;
}
export function finishDate(workout,time){const d=new Date(time);return `${esc(workout.name||'Workout')} · ${WEEKDAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}`;}
/**
 * The finish screen. `story` comes from finishStory(): one headline, up to two badges,
 * the biggest jump, every exercise against last time, stats and the weekly tide.
 * `animate` is true only the first time it is shown, so re-renders never replay it.
 */
export function completionScreen({theme,story,state,workout,time,saved,prDetails='',icon,animate=false}){
 const p=getTheme(theme).share,settings=state.settings||{};
 const spotId=story.spotlight?.row.exerciseId,rows=story.rows.filter(r=>r.exerciseId!==spotId);
 const valueOf=row=>historySetText(row.set,row.exerciseId,settings,exercise(state,row.exerciseId)||{id:row.exerciseId});
 const pct=story.week.goal?Math.min(100,Math.round(100*story.week.done/story.week.goal)):0;
 const timeText=story.stats.time?` · ${story.stats.time.short}`:'';
 const stat=(name,value,label,count=true)=>`<div class="fin-stat" data-stat="${name}"><strong ${count?`data-count="${value}"`:''}>${esc(value)}</strong><span>${esc(label)}</span></div>`;
 const spot=story.spotlight?`<div class="fin-spot" style="--i:0"><span class="fin-spot-label">${esc(story.spotlight.label)}</span><strong class="fin-spot-name">${esc(story.spotlight.row.name)}</strong><span class="fin-spot-value">${esc(valueOf(story.spotlight.row))}</span><span class="fin-spot-note">${esc(story.spotlight.note)}</span>${story.spotlight.row.star?`<svg class="fin-star" viewBox="0 0 24 24" role="img" aria-label="New record"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg>`:''}</div>`:'';
 const list=rows.map((r,i)=>`<li class="fin-row is-${r.direction}" style="--i:${i+1}"><span class="fin-row-name">${r.star?`<svg class="fin-row-star" viewBox="0 0 24 24" role="img" aria-label="New record"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg>`:''}${esc(r.name)}</span><span class="fin-row-value">${esc(valueOf(r))}</span><span class="fin-row-delta">${r.direction==='up'?'▲ ':''}${esc(r.delta)}</span></li>`).join('');
 const streak=story.week.streak>=2?` <span class="fin-accent">${story.week.streak}-week streak.</span>`:'';
 return `<div class="modal-scrim completion-scrim" style="--celebrate-bg:${p.background};--celebrate-glow:${p.center};--celebrate-edge:${p.edge};--celebrate-accent:${p.accent};--celebrate-text:${p.text};--celebrate-on:${p.onAccent};--celebrate-muted:${p.muted};--celebrate-line:${p.line};--celebrate-star:${p.star||p.accent}"><section class="modal completion-screen ${saved?'is-saved':'is-unsaved'} ${animate?'fin-animate':''}" role="dialog" aria-modal="true" aria-label="${saved?'Workout saved.':'Workout finished'}">
<div class="fin-tide" aria-hidden="true">${wave(780,520,40,26,'fin-wave fin-wave-back')}${wave(780,480,30,24,'fin-wave fin-wave-front')}</div>
<div class="modal-body completion-body fin">
<div class="fin-top"><div class="fin-brand">${markSvg('fin-mark')}<span>REPTIDE<i>.</i></span></div><button class="icon-button completion-close" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button></div>
<p class="fin-kicker">WORKOUT COMPLETE${esc(timeText)}</p>
<h2 class="fin-headline completion-title"><span>${esc(story.headline[0])}</span>${esc(story.headline[1])}</h2>
<p class="fin-sub completion-message">${finishDate(workout,time)}</p>
${story.badges.length?`<ul class="fin-badges" aria-label="Also today">${story.badges.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:''}
<p class="dialog-copy completion-save-status" ${saved?'':'role="alert"'}>${saved?'Workout saved to History.':'Device storage could not save your workout. Export a backup before leaving.'}</p>
${spot}
${rows.length?`<h3 class="fin-section">${esc(story.listTitle)}</h3><ul class="fin-rows">${list}</ul>`:''}
<div class="fin-stats completion-stats" aria-label="Workout summary">${stat('sets',story.stats.sets,story.stats.sets===1?'set':'sets')}${stat('exercises',story.stats.exercises,story.stats.exercises===1?'exercise':'exercises')}${stat('number','#'+story.stats.number,'workout',false)}</div>
${story.records?`<details class="completion-records"><summary>View personal records</summary>${prDetails}</details>`:''}
<div class="fin-week"><span class="fin-week-label">THIS WEEK</span><strong class="fin-week-count"><span class="fin-accent" data-count="${story.week.done}">${story.week.done}</span> OF ${story.week.goal} ${story.week.goal===1?'WORKOUT':'WORKOUTS'}</strong><div class="fin-meter" role="img" aria-label="${story.week.done} of ${story.week.goal} workouts this week"><div class="fin-meter-fill" style="--fill:${pct}%">${wave(680,40,14,8,'fin-wave fin-meter-wave')}</div></div><p class="fin-week-note">${esc(weekNote(story.week))}${streak}</p></div>
<div class="fin-actions completion-actions"><button class="button primary fin-share completion-share" aria-label="Share workout" data-action="workout-image" data-id="${esc(workout.id)}"><span class="fin-thumb" aria-hidden="true"></span><span>Share workout<small>POST · STORY · SAVE</small></span></button><button class="button secondary completion-done" data-action="close-modal">Done</button></div>
</div></section></div>`;
}
// Count numbers up once, after the screen is in the page. Skipped when the system asks for reduced motion.
export function animateCompletion(root,win=window){
 const screen=root?.querySelector('.completion-screen.fin-animate');if(!screen)return;
 let reduce=false;try{reduce=win.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{}
 if(reduce)return;
 const items=[...screen.querySelectorAll('[data-count]')].map(el=>({el,target:Number(el.dataset.count)})).filter(x=>Number.isFinite(x.target)&&x.target>0);
 const start=win.performance.now()+500,ms=1200;
 const tick=now=>{const t=Math.max(0,Math.min(1,(now-start)/ms)),e=1-Math.pow(1-t,3);for(const x of items)x.el.textContent=String(Math.round(x.target*e));if(t<1&&screen.isConnected)win.requestAnimationFrame(tick);};
 for(const x of items)x.el.textContent='0';win.requestAnimationFrame(tick);
}
