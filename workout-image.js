import {recordedWorkoutTime, shareableWorkoutTime} from './history-dates.js';
import {getTheme} from './themes.js';
import {drawPlateMark} from './brand-mark.js';
import {completedSets, exercise} from './model.js';
import {finishStory} from './finish-story.js';
import {historySetText, workoutBestSets} from './best-set.js';
import {workoutRecords} from './records.js';

const WIDTH=1080, HEIGHT=1350, STORY_HEIGHT=1920, LEFT=60, RIGHT=1020, FOOTER=126;
const DISPLAY='Forge Share Display', DATA='Forge Share Data';
const QUOTE='SHOWED UP. PUT IN WORK.', BRAND='REPTIDE';
const font=(size,family=DISPLAY)=>`${size}px "${family}", sans-serif`;
let fontsReady;
// Bundle both OFL fonts. Never depend on a connection, the phone's font, or an
// image-generator's invented text. The same loaded fonts measure and draw.
export async function loadWorkoutImageFonts() {
  if(!fontsReady) fontsReady=Promise.all([
    new FontFace(DISPLAY,'url("./fonts/Anton-Regular.ttf")'),
    new FontFace(DATA,'url("./fonts/BarlowCondensed-Bold.ttf")')
  ].map(async face=>{await face.load();document.fonts.add(face);})).catch(error=>{fontsReady=null;throw new Error('Could not load the workout image fonts. Please try again.');});
  await fontsReady;
}
export function workoutImageDate(workout) {
  return new Date(recordedWorkoutTime(workout)).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}
export function imageLines(state, workout) {
  return workoutBestSets(state,workout).flatMap(row=>[
    {kind:'exercise',text:row.name,exerciseId:row.exerciseId},
    {kind:'set',number:row.number,text:row.text.toUpperCase(),criterion:row.criterion}
  ]);
}
function wrap(ctx,text,width,type) {
  ctx.font=type;const result=[];let line='';
  for(const word of String(text).split(/\s+/)) {
    if(line&&ctx.measureText(line+' '+word).width>width){result.push(line);line='';}
    if(ctx.measureText(word).width>width){for(const ch of word){if(line&&ctx.measureText(line+ch).width>width){result.push(line);line='';}line+=ch;}}
    else line+=(line?' ':'')+word;
  }
  if(line)result.push(line);return result;
}
function recordIds(state,workout){try{return new Set(workoutRecords(state,workout).map(r=>r.exerciseId));}catch{return new Set();}}
// Totals shown in the stat tiles. Sets done is the big tile; workout time shows when it is
// known and plausible. Total weight lifted is deliberately not shown (Tyler, 16 Nov 2026).
export function workoutImageStats(state,workout){
  const sets=completedSets(workout).length,records=recordIds(state,workout).size,time=shareableWorkoutTime(workout);
  const exercises=new Set((workout.exercises||[]).filter(e=>(e.sets||[]).some(s=>s.done)).map(e=>e.exerciseId)).size;
  return {sets,records,exercises,time};
}
// The rows of "best sets vs last time": name on the left; the set and how it compares on the right.
function shareRows(state,story){
  return story.rows.map(r=>({exerciseId:r.exerciseId,name:r.name,star:r.star,direction:r.direction,
    delta:r.direction==='up'?'▲ '+r.delta:r.delta,
    value:historySetText(r.set,r.exerciseId,state.settings||{},exercise(state,r.exerciseId)||{id:r.exerciseId}).toUpperCase()}));
}
/**
 * Layout for one share image. `format` is 'post' (1080 wide, 4:5, grows taller so no exercise is
 * left out; refuses above 6400px) or 'story' (1080×1920, fixed: rows that do not fit become "+N more").
 * Rows are exercise/set pairs; a set sits on its name's line when the name fits beside it.
 */
export function layoutWorkoutImages(state,workout,ctx,format='post') {
  const story=finishStory(state,workout),isStory=format==='story',date=workoutImageDate(workout);
  const rows=shareRows(state,story),stats=workoutImageStats(state,workout);
  // Headline: two lines, as large as fits the width.
  let headSize=isStory?176:150;
  ctx.font=font(headSize);const widest=Math.max(...story.headline.map(l=>ctx.measureText(l).width),1);
  headSize=Math.max(64,Math.min(headSize,Math.floor(headSize*(RIGHT-LEFT-12)/widest)));
  const lineHeight=Math.round(headSize*.9),headTop=isStory?262:228;
  let y=headTop+2*lineHeight+10;
  const badgesTop=story.badges.length?y+16:null;if(badgesTop)y=badgesTop+50;
  const statsTop=y+(isStory?40:26),statsHeight=isStory?172:140;y=statsTop+statsHeight;
  const spotTop=isStory&&story.spotlight?y+44:null;if(spotTop)y=spotTop+316;
  const labelTop=y+(isStory?44:26),top=labelTop+44;
  const limit=h=>h-FOOTER-30;
  let nameSize=rows.length<=5?40:36,valueSize=rows.length<=5?44:40,band=rows.length<=5?76:64;
  let placed=[],end=top,more=0;
  const place=list=>{placed=[];end=top;
    for(const r of list){
      const pr=r.star,indent=pr?52:0;
      ctx.font=font(valueSize,DATA);const valueText=ctx.measureText(r.value).width;
      ctx.font=font(Math.round(valueSize*.64),DATA);const pill=ctx.measureText(r.delta).width+28;
      const natural=valueText+18+pill,valueWidth=Math.min(natural,RIGHT-LEFT);
      const scale=Math.min(1,(RIGHT-LEFT)/natural);
      const upper=r.name.toUpperCase(),beside=RIGHT-LEFT-indent-valueWidth-36;
      let texts=beside>=240?wrap(ctx,upper,beside,font(nameSize,DATA)):[upper,upper];
      const inline=texts.length===1;
      if(!inline)texts=wrap(ctx,upper,RIGHT-LEFT-indent,font(nameSize,DATA));
      const nameHeight=inline?band:texts.length*(nameSize+8)+14;
      placed.push({kind:'exercise',text:r.name,texts,size:nameSize,x:LEFT+indent,y:end,height:nameHeight,pr,inline,continued:false});
      const valueY=inline?end:end+nameHeight;
      placed.push({kind:'set',text:r.value,delta:r.delta,direction:r.direction,x:RIGHT-valueWidth,y:valueY,size:Math.floor(valueSize*scale),valueWidth:valueText*scale,pillWidth:pill*scale,width:valueWidth,height:inline?band:62,pr,inline});
      end=inline?end+band:valueY+70;
    }};
  place(rows);
  let height;
  if(isStory){
    height=STORY_HEIGHT;
    // Keep the most important rows (records and improvements come first) and say how many more there were.
    let keep=rows.length;while(keep>0&&end>limit(height)-(keep<rows.length?60:0)){keep--;place(rows.slice(0,keep));}
    more=rows.length-keep;
  }else{
    const spare=limit(HEIGHT)-end;
    if(rows.length&&spare>0&&placed.every(r=>r.inline)){const roomy=Math.min(104,Math.floor((limit(HEIGHT)-top)/rows.length));if(roomy>band){band=roomy;if(band>=92){nameSize=44;valueSize=50;}place(rows);}}
    height=Math.max(HEIGHT,Math.ceil(end+30+FOOTER));
    if(height>6400)throw new Error('This workout is too long for one readable image. Your full workout remains saved in History.');
  }
  return {format,story,stats,date,headline:story.headline,headSize,lineHeight,headTop,badgesTop,statsTop,statsHeight,spotTop,labelTop,top,
    pages:placed.length?[placed]:[],bottom:end,more,height,band,title:[String(workout.name||'Workout').toUpperCase()],total:stats.sets};
}
const alpha=(hex,a)=>hex+Math.round(a*255).toString(16).padStart(2,'0');
function box(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function background(ctx,p,height) {
  ctx.fillStyle=p.background;ctx.fillRect(0,0,WIDTH,height);
  const glow=ctx.createRadialGradient(950,110,40,950,110,880);glow.addColorStop(0,alpha(p.accent,.36));glow.addColorStop(.45,alpha(p.center,.5));glow.addColorStop(1,alpha(p.background,0));ctx.fillStyle=glow;ctx.fillRect(0,0,WIDTH,height);
  const low=ctx.createRadialGradient(0,height,40,0,height,700);low.addColorStop(0,alpha(p.accent,.16));low.addColorStop(1,alpha(p.accent,0));ctx.fillStyle=low;ctx.fillRect(0,0,WIDTH,height);
  // Tide lines behind the header (the Reptide wave), fading out toward the left and downward.
  ctx.save();ctx.lineCap='round';
  for(let k=0;k<7;k++){const y=40+k*44,shift=k*37;const fade=ctx.createLinearGradient(380,0,WIDTH,0);fade.addColorStop(0,alpha(p.accent,0));fade.addColorStop(1,alpha(p.accent,Math.max(.03,.2-k*.025)));
    ctx.beginPath();for(let x=380;x<=WIDTH+20;x+=8){const yy=y+Math.sin((x+shift)/62)*9;x===380?ctx.moveTo(x,yy):ctx.lineTo(x,yy);}ctx.lineWidth=5;ctx.strokeStyle=fade;ctx.stroke();}
  ctx.restore();
}
// The Reptide mark: the bolt-bore plate (same drawing as web/icon.svg).
function mark(ctx,x,y,size){drawPlateMark(ctx,x,y,size);}
function drawCard(ctx,state,workout,layout,p,type,tilt){
  const {story,stats}=layout,height=layout.height;
  background(ctx,p,height);
  // Brand and date
  mark(ctx,LEFT,54,64,p);
  const brandWidth=type(BRAND,LEFT+82,103,48,p.text,360,DATA,'left',1);type('.',LEFT+84+brandWidth,103,48,p.accent,30,DATA);
  ctx.font=font(26,DATA);const dateWidth=Math.min(420,ctx.measureText(layout.date.toUpperCase()).width)+44;
  box(ctx,RIGHT-dateWidth,62,dateWidth,48,24);ctx.lineWidth=2;ctx.strokeStyle=p.line;ctx.fillStyle=alpha(p.edge,.45);ctx.fill();ctx.stroke();
  type(layout.date.toUpperCase(),RIGHT-22,95,26,p.muted,420,DATA,'right',1);
  // Sticker: what was finished
  const stickerTop=layout.headTop-80,label=`WORKOUT COMPLETE · ${String(workout.name||'Workout').toUpperCase()}`;
  ctx.font=font(30,DATA);const sw=Math.min(RIGHT-LEFT-20,ctx.measureText(label).width+44+label.length*3);
  tilt(LEFT+sw/2,stickerTop+28,-3,()=>{box(ctx,LEFT+8,stickerTop+8,sw,56,12);ctx.fillStyle=p.accent;ctx.fill();box(ctx,LEFT,stickerTop,sw,56,12);ctx.fillStyle=p.text;ctx.fill();type(label,LEFT+22,stickerTop+39,30,p.onAccent,sw-44,DATA,'left',3);});
  // Headline: the real win. First line in the accent, with a hard shadow.
  layout.headline.forEach((line,i)=>{const baseline=layout.headTop+layout.headSize*.86+i*layout.lineHeight;type(line,LEFT+7,baseline+7,layout.headSize,p.edge);type(line,LEFT,baseline,layout.headSize,i===0?p.accent:p.text);});
  // Other true things today, as small badges
  if(layout.badgesTop){let x=LEFT;for(const b of story.badges){ctx.font=font(26,DATA);const w=ctx.measureText(b).width+30+b.length*1.5;if(x+w>RIGHT)break;box(ctx,x,layout.badgesTop,w,46,12);ctx.fillStyle=alpha(p.accent,.18);ctx.fill();type(b,x+15,layout.badgesTop+32,26,p.text,w-30,DATA,'left',1.5);x+=w+12;}}
  // Stat tiles: sets done (filled), workout time or exercises, workout number
  const t=layout.statsTop,h=layout.statsHeight,gap=20,tw=(RIGHT-LEFT-2*gap)/3;
  const tiles=[[String(stats.sets),stats.sets===1?'SET DONE':'SETS DONE',true],
    stats.time?[stats.time.short,'WORKOUT TIME',false]:[String(stats.exercises),stats.exercises===1?'EXERCISE':'EXERCISES',false],
    ['#'+story.stats.number,'WORKOUT',false]];
  tiles.forEach(([value,label,filled],i)=>{const x=LEFT+i*(tw+gap);
    if(filled){box(ctx,x+9,t+9,tw,h,28);ctx.fillStyle=p.edge;ctx.fill();box(ctx,x,t,tw,h,28);ctx.fillStyle=p.accent;ctx.fill();}
    else{box(ctx,x,t,tw,h,28);ctx.fillStyle=alpha(p.edge,.6);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=p.line;ctx.stroke();}
    type(value,x+24,t+h*.6,filled?Math.round(h*.6):Math.round(h*.42),filled?p.onAccent:p.text,tw-48);
    type(label,x+24,t+h-24,26,filled?p.onAccent:p.muted,tw-48,DATA,'left',2.5);});
  // Story only: the biggest jump
  if(layout.spotTop&&story.spotlight){const s=story.spotlight,st=layout.spotTop,sh=290;
    box(ctx,LEFT+10,st+10,RIGHT-LEFT,sh,34);ctx.fillStyle=p.accent;ctx.fill();box(ctx,LEFT,st,RIGHT-LEFT,sh,34);ctx.fillStyle=p.text;ctx.fill();
    type(s.label,LEFT+34,st+50,28,alpha(p.onAccent,.72),600,DATA,'left',4);
    type(s.row.name.toUpperCase(),LEFT+34,st+110,54,p.onAccent,RIGHT-LEFT-140);
    const value=historySetText(s.row.set,s.row.exerciseId,state.settings||{},exercise(state,s.row.exerciseId)||{id:s.row.exerciseId}).toUpperCase();
    type(value,LEFT+34,st+202,92,p.onAccent,RIGHT-LEFT-68);
    ctx.font=font(30,DATA);const nw=Math.min(RIGHT-LEFT-68,ctx.measureText(s.note).width+48);box(ctx,LEFT+34,st+222,nw,50,25);ctx.fillStyle=p.onAccent;ctx.fill();type(s.note,LEFT+58,st+257,30,p.accent,nw-48,DATA,'left',1);
    if(s.row.star)star(ctx,RIGHT-64,st+64,34,p.star||p.accent,p.onAccent);}
  // Best sets, each against last time
  const listLabel=story.rows.some(r=>r.direction!=='new')?'BEST SETS · VS LAST TIME':'BEST SETS · BASELINES';
  type(listLabel,LEFT,layout.labelTop+28,28,p.accent,700,DATA,'left',4);
  ctx.font=font(28,DATA);if('letterSpacing' in ctx)ctx.letterSpacing='4px';const lw=ctx.measureText(listLabel).width+24;if('letterSpacing' in ctx)ctx.letterSpacing='0px';
  ctx.fillStyle=p.line;ctx.fillRect(LEFT+lw,layout.labelTop+18,Math.max(0,RIGHT-LEFT-lw),3);
  const rows=layout.pages[0]||[];
  for(let i=0;i<rows.length;i++){const row=rows[i];
    if(row.kind==='exercise'){
      if(row.pr)star(ctx,LEFT+18,row.y+(row.inline?layout.band/2:row.size*.62+7),19,p.accent);
      row.texts.forEach((line,j)=>type(line,row.x,row.inline?row.y+layout.band/2+row.size*.36:row.y+row.size+7+j*(row.size+8),row.size,p.text,RIGHT-row.x,DATA,'left',.5));
    }else{
      const baseline=row.inline?row.y+layout.band/2+row.size*.36:row.y+46,ps=Math.round(row.size*.64),ph=Math.round(ps*1.5);
      const px=RIGHT-row.pillWidth,py=baseline-row.size*.36-ph/2;
      const up=row.direction==='up',isNew=row.direction==='new';
      box(ctx,px,py,row.pillWidth,ph,10);
      if(up){ctx.fillStyle=p.accent;ctx.fill();}else if(isNew){ctx.lineWidth=2.5;ctx.strokeStyle=p.accent;ctx.stroke();}else{ctx.fillStyle=alpha(p.text,.08);ctx.fill();}
      type(row.delta,px+row.pillWidth/2-0,py+ph*.68,ps,up?p.onAccent:isNew?p.accent:p.muted,row.pillWidth-20,DATA,'center',1);
      type(row.text,px-18,baseline,row.size,row.direction==='down'?p.muted:p.text,row.valueWidth,DATA,'right');
      const end=row.y+row.height+(row.inline?0:8);if(i<rows.length-1){ctx.fillStyle=p.line;ctx.fillRect(LEFT,end-1,RIGHT-LEFT,2);}
    }
  }
  if(layout.more)type(`+${layout.more} MORE ${layout.more===1?'EXERCISE':'EXERCISES'} IN REPTIDE`,LEFT,layout.bottom+48,28,p.muted,RIGHT-LEFT,DATA,'left',3);
  // Quote band: a rolling tide like the logo's sea, with a lighter swell above it.
  const tide=(base,amp,phase)=>{ctx.beginPath();ctx.moveTo(0,height);for(let x=0;x<=WIDTH;x+=6)ctx.lineTo(x,base+Math.sin((x+phase)/86)*amp);ctx.lineTo(WIDTH,height);ctx.closePath();};
  tide(height-FOOTER-14,10,40);ctx.fillStyle=alpha(p.accent,.28);ctx.fill();
  tide(height-FOOTER+2,11,0);ctx.fillStyle=p.accent;ctx.fill();
  type(QUOTE,LEFT,height-FOOTER+86,62,p.onAccent,700);
  type(BRAND,RIGHT,height-FOOTER+76,32,p.onAccent,220,DATA,'right',5);
}
function star(ctx,cx,cy,r,fill,stroke){ctx.save();ctx.translate(cx,cy);ctx.beginPath();for(let k=0;k<10;k++){const rr=k%2?r*.42:r,a=-Math.PI/2+k*Math.PI/5;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.lineWidth=2.5;ctx.strokeStyle=stroke;ctx.stroke();}ctx.restore();}
async function renderOne(state,workout,format){
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image creation is unavailable on this device.');
  const layout=layoutWorkoutImages(state,workout,ctx,format);canvas.height=layout.height;
  if(!layout.pages.length)throw new Error('Complete a set before creating an image.');
  const p=getTheme(state.settings.theme).share;
  // Draw text scaled down to a maximum width instead of ever clipping it.
  const type=(text,x,baseline,size,color,maxWidth=RIGHT-LEFT,family=DISPLAY,align='left',spacing=0)=>{
    ctx.save();ctx.font=font(size,family);ctx.fillStyle=color;if('letterSpacing' in ctx)ctx.letterSpacing=spacing+'px';
    const width=ctx.measureText(String(text)).width,scale=Math.min(1,maxWidth/Math.max(1,width));
    ctx.translate(align==='right'?x-width*scale:align==='center'?x-width*scale/2:x,baseline);ctx.scale(scale,1);ctx.fillText(String(text),0,0);ctx.restore();return width*scale;
  };
  const tilt=(cx,cy,degrees,draw)=>{ctx.save();ctx.translate(cx,cy);ctx.rotate(degrees*Math.PI/180);ctx.translate(-cx,-cy);draw();ctx.restore();};
  drawCard(ctx,state,workout,layout,p,type,tilt);
  return canvas.toDataURL('image/jpeg',0.94);
}
/** The feed post image (4:5, taller for long workouts), as a one-item list. */
export async function renderWorkoutImages(state,workout,isCancelled=()=>false) {
  await loadWorkoutImageFonts();
  if(isCancelled())return [];
  return [await renderOne(state,workout,'post')];
}
/** Both share formats: the feed post and the 9:16 story. */
export async function renderShareImages(state,workout,isCancelled=()=>false) {
  await loadWorkoutImageFonts();
  if(isCancelled())return null;
  const post=await renderOne(state,workout,'post');
  if(isCancelled())return null;
  await new Promise(resolve=>setTimeout(resolve,0));
  return {post,story:await renderOne(state,workout,'story')};
}
