// The History tab: saved workouts list and totals.
import {app} from './app-context.js';
import {historyMonthsMarkup} from './history-ui.js';
import {groupHistoryMonths} from './history-workflows.js';
import {completedSets, volumeKg} from './model.js';
import {brand, empty, fmt} from './ui-kit.js';

export function historyView(){let totals=app.historyTotals.get(app.state.history);if(!totals){totals={months:groupHistoryMonths(app.state.history),sets:app.state.history.reduce((n,w)=>n+completedSets(w).length,0),volume:app.state.history.reduce((n,w)=>n+volumeKg(w),0)};app.historyTotals.set(app.state.history,totals);}return `<header class="topbar">${brand()}</header><main class="page history-page"><div class="history-page-title"><div><p class="eyebrow">YOUR TRAINING LOG</p><h1>History</h1></div></div><div class="mini-stats history-stats"><div><b>${app.state.history.length}</b><span>workouts</span></div><div><b>${totals.sets}</b><span>sets logged</span></div><div><b>${fmt(Math.round(totals.volume*(app.state.settings.unit==='lb'?2.2046226218:1)))}</b><span>${app.state.settings.unit} lifted</span></div></div>${app.state.history.length?historyMonthsMarkup(app.state,totals.months,app.historyPageSize)+(app.state.history.length>app.historyPageSize?'<button class="button secondary full history-load-more" data-action="more-history">Show more workouts</button>':''):empty('history','Your first session starts here.','Finish a workout and every set will be waiting here.','Start training','go-train')}</main>`;}
