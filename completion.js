// Original encouragement inspired by familiar training principles, not attributed quotes.
export const completionPhrases=Object.freeze([
 'Great work today. You showed up.',
 'You put in the work. Be proud.',
 'One session at a time. Nice work.',
 'Your effort counts. Great job today.',
 'Solid effort today. Keep building.'
]);
export const completionPhrase=completedCount=>completionPhrases[Math.max(0,completedCount-1)%completionPhrases.length];
