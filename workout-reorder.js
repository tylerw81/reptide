import {KEY} from './model.js';
// Only the exercise array changes. IDs, sets, supersets and timer deadlines retain identity.
export function reorderWorkout(state,id,to,storage=globalThis.localStorage){
 const entries=state.active?.exercises,from=entries?.findIndex(e=>e.id===id);
 if(!entries||from<0||!Number.isInteger(to)||to<0||to>=entries.length)return {ok:false,state};
 if(from===to)return {ok:true,state};
 const exercises=entries.slice();exercises.splice(to,0,exercises.splice(from,1)[0]);
 const candidate={...state,active:{...state.active,exercises}};
 try{storage.setItem(KEY,JSON.stringify(candidate));return {ok:true,state:candidate};}catch(error){return {ok:false,state,error};}
}
// The compact preview makes distant destinations reachable without dragging past tall set tables.
// Touch may scroll normally before the hold threshold; only an activated drag suppresses movement.
export function createWorkoutReorder({entries,onDrop,onStart=()=>{},announce=()=>{}}){
 let pending=null,drag=null,frame=0,suppressClickUntil=0;
 const clearPending=()=>{if(pending)clearTimeout(pending.timer);pending=null;};
 function cancel(){const existed=Boolean(drag||pending);clearPending();if(drag){for(const [node,wasInert] of drag.inert)node.inert=wasInert;drag.overlay.remove();drag.opener?.focus({preventScroll:true});document.body.classList.remove('exercise-reordering');drag=null;cancelAnimationFrame(frame);suppressClickUntil=Date.now()+500;}return existed;}
 function paint(){if(!drag)return;const {list,id,order}=drag;for(const [i,key] of order.entries()){const node=drag.nodes.get(key);node.textContent=`${i+1}. ${node.dataset.name}`;list.append(node);}drag.nodes.get(id).classList.add('reorder-selected');drag.overlay.querySelector('[role=status]').textContent=`Position ${order.indexOf(id)+1} of ${order.length}. Release to save, Escape or Back to cancel.`;}
 function locate(y){if(!drag)return;const {list,id,order}=drag;let index=order.indexOf(id);for(const node of list.children){const rect=node.getBoundingClientRect();if(y<rect.bottom){index=order.indexOf(node.dataset.id);break;}index=order.length-1;}
 const old=order.indexOf(id);if(index!==old){order.splice(index,0,order.splice(old,1)[0]);paint();}}
 function animate(){if(!drag)return;const rect=drag.list.getBoundingClientRect(),y=drag.y,edge=56;let delta=y<rect.top+edge?-Math.min(18,(rect.top+edge-y)/3):y>rect.bottom-edge?Math.min(18,(y-rect.bottom+edge)/3):0;if(delta&&drag.moved){drag.list.scrollTop+=delta;locate(y);}frame=requestAnimationFrame(animate);}
 function begin(p){if(pending!==p||entries().length<2)return;clearPending();onStart();const all=entries();if(!all.some(e=>e.id===p.id))return;
 const overlay=document.createElement('div');overlay.className='reorder-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Move exercise');
 const panel=document.createElement('div');panel.className='reorder-panel';const heading=document.createElement('h2');heading.textContent='Move exercise';const status=document.createElement('p');status.setAttribute('role','status');const list=document.createElement('div');list.className='reorder-list';const cancelButton=document.createElement('button');cancelButton.className='button secondary';cancelButton.textContent='Cancel move';cancelButton.onclick=cancel;panel.append(heading,status,list,cancelButton);overlay.append(panel);document.body.append(overlay);document.body.classList.add('exercise-reordering');const nodes=new Map();all.forEach((e,i)=>{const node=document.createElement('div');node.dataset.id=e.id;node.className='reorder-row';node.dataset.name=e.name;node.textContent=`${i+1}. ${e.name}`;list.append(node);nodes.set(e.id,node);});const opener=document.activeElement,inert=[...document.querySelectorAll('#app,#overlay-root')].map(node=>[node,node.inert]);for(const [node] of inert)node.inert=true;drag={overlay,list,nodes,id:p.id,order:all.map(e=>e.id),y:p.y,inert,opener,moved:false,startX:p.x,startY:p.y};paint();nodes.get(p.id).scrollIntoView({block:'center'});cancelButton.focus({preventScroll:true});frame=requestAnimationFrame(animate);navigator.vibrate?.(25);suppressClickUntil=Date.now()+500;
 }
 function start(event,x,y,type){const handle=event.target.closest('[data-reorder-handle]');if(!handle||drag||pending||entries().length<2)return;const p={id:handle.dataset.reorderHandle,x,y,type};pending=p;p.timer=setTimeout(()=>begin(p),380);}
 function move(event,x,y){if(drag){if(event.cancelable)event.preventDefault();if(!drag.moved&&Math.hypot(x-drag.startX,y-drag.startY)<4)return;drag.moved=true;drag.y=y;locate(y);}else if(pending&&Math.hypot(x-pending.x,y-pending.y)>9)clearPending();}
 function finish(event){if(!drag){clearPending();return;}if(event.cancelable)event.preventDefault();if(!drag.moved){cancel();return;}const point=event.changedTouches?.[0]||event,box=drag.overlay.querySelector('button').getBoundingClientRect();if(point.clientX>=box.left&&point.clientX<=box.right&&point.clientY>=box.top&&point.clientY<=box.bottom){cancel();announce('Move canceled.');return;}const {id,order}=drag,to=order.indexOf(id);cancel();onDrop(id,to);}
 document.addEventListener('mousedown',e=>{if(e.button===0)start(e,e.clientX,e.clientY,'mouse');});
 document.addEventListener('mousemove',e=>{if(pending?.type==='mouse'||drag)move(e,e.clientX,e.clientY);});
 document.addEventListener('mouseup',e=>{if(pending?.type==='mouse'||drag)finish(e);});
 document.addEventListener('touchstart',e=>{if(e.touches.length!==1){cancel();return;}const t=e.touches[0];start(e,t.clientX,t.clientY,'touch');},{passive:true});
 document.addEventListener('touchmove',e=>{if(e.touches.length!==1){cancel();return;}const t=e.touches[0];move(e,t.clientX,t.clientY);},{passive:false});
 document.addEventListener('touchend',finish,{passive:false});document.addEventListener('touchcancel',cancel);document.addEventListener('pointercancel',cancel);
 document.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('contextmenu',e=>{if(drag||e.target.closest('[data-reorder-handle]'))e.preventDefault();});
 document.addEventListener('keydown',e=>{if(!drag){const h=e.target.closest('[data-reorder-handle]');if(h&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const all=entries(),i=all.findIndex(x=>x.id===h.dataset.reorderHandle),to=i+(e.key==='ArrowUp'?-1:1);if(to>=0&&to<all.length)onDrop(h.dataset.reorderHandle,to);}return;}if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();announce('Move canceled.');}else if(e.key==='Tab'){e.preventDefault();drag.overlay.querySelector('button').focus();}},true);
 window.addEventListener('blur',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 return {cancel,get active(){return Boolean(drag);}};
}
