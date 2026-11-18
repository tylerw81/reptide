// Strong's exported wall-time date is preserved as its displayed workout date.
// A missing duration stays unknown; required internal timestamps are not a claim of zero training.
export const recordedWorkoutTime = workout => workout?.strongImport ? workout.startedAt : workout?.finishedAt;
export function recordedWorkoutDuration(workout) {
 if(workout?.strongImport?.durationKnown===false)return null;
 const value=workout?.finishedAt-workout?.startedAt;
 return Number.isFinite(value)&&value>=0?value:null;
}
// Time to show on the finish screen and share image. Unknown, under a minute, or over five hours
// (usually a forgotten Finish) returns null so the screens lead with sets instead of a wrong time.
export function shareableWorkoutTime(workout) {
 const ms=recordedWorkoutDuration(workout);
 if(ms===null||ms<60000||ms>5*3600000)return null;
 const minutes=Math.round(ms/60000),h=Math.floor(minutes/60),m=minutes%60;
 return {minutes,short:h?`${h}H ${m}M`:`${minutes} MIN`,text:h?`${h}h ${m}m`:`${minutes} min`};
}
export function recordedTrainingTime(history) {
 let milliseconds=0,known=0,unknown=0;
 for(const workout of history){const value=recordedWorkoutDuration(workout);if(value===null)unknown++;else{milliseconds+=value;known++;}}
 return {milliseconds,known,unknown};
}
