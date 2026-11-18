export function calculatePlates(total,bar,unit){
 if(!Number.isFinite(total)||!Number.isFinite(bar)||total<0||bar<0||total<bar)return {error:'Enter a total weight at least as heavy as the bar.'};
 const perSide=(total-bar)/2, denoms=unit==='lb'?[45,35,25,10,5,2.5,1.25]:[25,20,15,10,5,2.5,1.25,.5];let remainder=perSide;const plates=[];
 for(const d of denoms){const n=Math.floor((remainder+1e-8)/d);if(n){plates.push({weight:d,count:n});remainder-=d*n;}}
 if(remainder>1e-6)return {error:'That weight cannot be made evenly with the listed plates.'};
 return {plates,perSide};
}
export function warmupTargets(target,unit){
 if(!Number.isFinite(target)||target<=0)return [];
 const step=unit==='lb'?5:2.5;
 return [[.4,8],[.6,5],[.8,3]].map(([fraction,reps])=>({weight:Math.round(target*fraction/step)*step,reps})).filter(x=>x.weight>0);
}
