// Local guided meal preview. The list is deliberately ingredient-based, not AI.
export const ingredients = Object.freeze([
 {id:'rice',label:'Rice'}, {id:'beef',label:'Beef'}, {id:'beans',label:'Beans'},
 {id:'oats',label:'Oats'}, {id:'eggs',label:'Eggs'}, {id:'vanilla-protein',label:'Vanilla protein powder'},
]);
const ideas = Object.freeze([
 {name:'Beef and rice',needs:['beef','rice'],description:'Cook the beef and serve it with rice. Add seasonings or vegetables you enjoy and can eat.'},
 {name:'Rice and beans',needs:['rice','beans'],description:'Serve cooked rice and beans together. Add seasonings or vegetables you enjoy and can eat.'},
 {name:'Protein waffles',needs:['oats','eggs','vanilla-protein'],description:'Blend oats, one scoop of vanilla protein powder and three eggs into batter. Cook in a waffle maker; Tyler’s example makes about 3–4 waffles.'},
]);
export function mealIdeas(selected){const chosen=new Set(Array.isArray(selected)?selected:[]);return ideas.filter(m=>m.needs.every(id=>chosen.has(id)));}
export function ingredientLabel(id){return ingredients.find(x=>x.id===id)?.label??id;}
