import {extraInstructions} from './exercise-instructions-extra.js';
// Original, concise cues for exact built-in movements. Unlisted exercises use video guides.
const cues={
 'bench-press':['Lie on a flat bench with your feet stable and grip the bar slightly wider than your shoulders.','Lower the bar under control toward your chest, then press it up without bouncing.'],
 'squat':['Set the bar securely on your upper back and stand with your feet comfortable for your hips.','Brace, bend your hips and knees, and lower under control. Drive through your feet to stand.'],
 'deadlift':['Stand close to the bar with your feet under your hips and grip it just outside your legs.','Brace and keep the bar close as you stand. Lower it under control and reset.'],
 'leg-press':['Sit with your back against the pad and place your feet securely on the platform.','Release the safety, bend your knees under control, then press the platform away without snapping your knees straight.'],
 'lat-pulldown':['Sit with your thighs secured and take a comfortable grip on the bar.','Pull the bar toward your upper chest, then return it slowly without swinging.'],
 'seated-row':['Sit tall with your feet supported and take the handle.','Pull toward your torso while keeping your body steady, then extend your arms under control.'],
 'lib-romanian-deadlift-barbell':['Stand holding the bar in front of your thighs with soft knees.','Move your hips back while keeping the bar close to your legs, then stand by bringing your hips forward.'],
 'lib-around-the-world':['Lie on a flat bench with a light dumbbell in each hand, palms facing upward and elbows softly bent.','Move the dumbbells in a wide, controlled arc from near your hips toward overhead, staying within a comfortable range. Reverse the arc to return.'],
 'shoulder-press':['Adjust the seat so the handles start near shoulder height, with your back supported.','Press the handles upward under control, then lower them back to shoulder height.'],
 'lateral-raise':['Stand with a dumbbell in each hand and keep a slight bend in your elbows.','Raise your arms out to the sides to a comfortable height, then lower slowly without swinging.'],
 'tricep-pushdown':['Stand facing the cable with your elbows close to your sides and hold the attachment.','Straighten your elbows to press the attachment downward, then return slowly without moving your upper arms.'],
 'hammer-curl':['Stand with a dumbbell in each hand, palms facing inward.','Keeping your upper arms close to your sides, curl the weights up and lower them slowly.'],
 'leg-extension':['Adjust the machine so your knees align with its pivot and the pad rests above your ankles.','Straighten your knees under control, then lower the pad slowly.'],
 'leg-curl':['Adjust the seated curl machine so your knees align with the pivot and the pad rests behind your lower legs.','Bend your knees to pull the pad down and back, then return it slowly.'],
 'lib-lying-leg-curl-machine':['Lie face down on the machine and adjust the pad above your heels.','Bend your knees to bring the pad toward you, then lower it under control.'],
 'lib-assault-bike':['Adjust the seat so your knee stays slightly bent at the bottom of the pedal stroke.','Pedal and move the handles at a sustainable pace. Record your time or distance.'],
 'lib-incline-bench-press-dumbbell':['Set the bench to a moderate incline and hold a dumbbell in each hand near your shoulders.','Press upward under control, then lower the weights toward the sides of your upper chest.'],
 'lib-bicep-curl-barbell':['Stand with a comfortable underhand grip on the bar and your arms by your sides.','Curl the bar upward without swinging your torso, then lower it slowly.'],
 'lib-triceps-pushdown-rope':['Face the cable and hold the rope with your elbows close to your sides.','Straighten your elbows to press the rope down, then return slowly with your upper arms steady.'],
 'pullup':['Hang from the bar with a comfortable grip and your arms extended.','Pull your body upward under control, then lower to a comfortable hang.'],
 'pushup':['Place your hands on the floor and extend your legs behind you, keeping your body in a straight line.','Bend your elbows to lower under control, then press the floor away.'],
 'crunch':['Kneel facing a cable with the rope held near your head.','Curl your torso down using your abdominal muscles, then return slowly without pulling with your arms.'],
 'lib-plank':['Place your forearms and toes on the floor and lift your body into a straight line.','Brace your midsection and hold the position while breathing normally.'],
 'lib-side-plank':['Lie on your side and support yourself on your forearm.','Lift your hips so your body forms a straight line, and hold while breathing normally. Repeat on the other side.'],
 'lib-reverse-crunch':['Lie on your back with your knees bent and feet raised.','Gently curl your pelvis toward your ribs, then lower under control without swinging.'],
 'lib-bench-press-dumbbell':['Lie on a flat bench with your feet stable and a dumbbell in each hand near chest level.','Press the weights upward under control, then lower them toward the sides of your chest.'],
 'lib-chest-fly-dumbbell':['Lie on a flat bench with a dumbbell in each hand above your chest and your elbows softly bent.','Open your arms in a controlled arc to a comfortable stretch, then bring the weights back together.'],
 'lib-hip-thrust-bodyweight':['Rest your upper back on a stable bench, place your feet on the floor and bend your knees.','Drive through your feet to raise your hips, then lower them under control.'],
 'lib-pullover-dumbbell':['Lie on a flat bench and hold one dumbbell securely with both hands above your chest.','With elbows softly bent, lower the weight back within a comfortable range, then return it above your chest.'],
 'lib-seated-calf-raise-plate-loaded':['Sit with the pads over your thighs and the balls of your feet on the platform.','Raise your heels, pause briefly, then lower them under control.'],
 'lib-leg-press':['Sit with your back against the pad and place your feet securely on the platform.','Release the safety, bend your knees under control, then press away without snapping your knees straight.'],
 'lib-walking':['Walk at a pace you can maintain and record your distance and time.'],
 'lib-walking-treadmill':['Set a comfortable speed and incline. Walk with a natural stride, then record the distance, time and incline setting.']
};
const aliases={'lib-bench-press-barbell':'bench-press','lib-pull-up':'pullup','lib-push-up':'pushup','lib-cable-crunch':'crunch','lib-seated-leg-curl-machine':'leg-curl','lib-shoulder-press-machine':'shoulder-press','lib-lateral-raise-dumbbell':'lateral-raise','lib-bicep-curl-barbell':'lib-bicep-curl-barbell','lib-hammer-curl-dumbbell':'hammer-curl','lib-incline-bench-press-dumbbell':'lib-incline-bench-press-dumbbell'};
export const exerciseInstructions=id=>cues[id]||cues[aliases[id]]||extraInstructions[id]||[];
