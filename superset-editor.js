import {exercise, newExercise} from './model.js';
import {linkGroup, stopRest} from './training.js';
// Browsing and selections stay in memory until Save; Cancel changes no data.
export function createSupersetDraft(owner,anchorId,template=false) {
 return {ownerId:owner.id,anchorId,template,selected:[...((owner.supersets||[]).find(g=>g.includes(anchorId))||[anchorId])],added:[]};
}
export function supersetChoices(owner,draft) {
 const existing=draft.template?owner.exerciseIds.map(id=>({id,exerciseId:id})):owner.exercises;
 return [...existing.map(e=>({...e,pending:false})),...draft.added.map(e=>({...e,pending:true}))];
}
export function selectSupersetExercise(state,owner,draft,exerciseId) {
 if(owner.id!==draft.ownerId||!exercise(state,exerciseId))throw new Error('This exercise is no longer available.');
 const choices=supersetChoices(owner,draft);
 let entry=choices.find(e=>e.exerciseId===exerciseId&&draft.selected.includes(e.id))||choices.find(e=>e.exerciseId===exerciseId);
 if(!entry){
  const count=(draft.template?owner.exerciseIds:owner.exercises).length+draft.added.filter(e=>draft.selected.includes(e.id)).length;
  if(count>=100)throw new Error('This session or template has reached 100 exercises.');
  entry=draft.template?{id:exerciseId,exerciseId}:newExercise(state,exerciseId);draft.added.push(entry);
 }
 if(!draft.selected.includes(entry.id))draft.selected.push(entry.id);
 return entry.id;
}
export function applySupersetDraft(owner,draft) {
 if(owner.id!==draft.ownerId)throw new Error('This workout or template has changed. Please reopen the superset.');
 const choices=supersetChoices(owner,draft).filter(e=>!e.pending||draft.selected.includes(e.id));
 if(choices.length>100)throw new Error('This session or template has reached 100 exercises.');
 const ids=choices.map(e=>e.id),members=ids.filter(id=>draft.selected.includes(id));
 const supersets=linkGroup(owner.supersets,members,ids),ordered=ids.filter(id=>!members.includes(id));ordered.splice(ids.indexOf(members[0]),0,...members);
 if(draft.template)return {...owner,exerciseIds:ordered,supersets};
 const entries=[...owner.exercises,...draft.added.filter(e=>draft.selected.includes(e.id))];
 const result={...owner,exercises:ordered.map(id=>entries.find(e=>e.id===id)),supersets};stopRest(result);return result;
}
