// Independently adapted starter templates. Source facts and training changes live
// alongside the prescriptions so the UI can explain them without network access.
export const FEATURED_TEMPLATES_VERSION = 3;
const safety = 'Warm up first; these are working sets, not warm-up sets. Choose a load you can control and leave 1–3 reps in reserve. Rest 2–3 minutes for presses, squats and Romanian deadlifts, and 60–90 seconds for accessories. Use the Rest button during a workout to adjust the timer. Stop if a movement causes pain and use an appropriate alternative.';
const disclaimer = 'General Reptide starter templates, not personalized training advice. Rep targets are editable examples within the ranges below. Weights are intentionally blank.';
const definitions = [
  {
    id: 'featured-cutler-chest-v1',
    name: 'Chest Builder',
    subtitle: 'Chest · 12 working sets · adapted',
    bodyParts: ['Chest'],
    context: 'A chest-focused session combining flat and incline presses with flyes and a dumbbell pullover.',
    adaptation: 'Start with the presses, then use controlled accessory work. Incline flyes use a moderate 10–12-rep range. Cable fly is also known as a cable crossover. No drop sets are prescribed.',
    movements: [
      {id:'bench-press',name:'Bench press',sets:3,reps:8,range:[8,10],source:'3 sets of 8–10'},
      {id:'incline-db',name:'Incline dumbbell press',sets:3,reps:10,range:[10,12],source:'3 sets of 10–12'},
      {id:'cable-fly',name:'Cable fly',sets:2,reps:12,range:[10,12],source:'Cable crossover: 3 sets of 10–12'},
      {id:'lib-pullover-dumbbell',name:'Pullover (Dumbbell)',sets:2,reps:12,range:[10,12],source:'Dumbbell pullover: 3 sets of 10–12'},
      {id:'lib-incline-chest-fly-dumbbell',name:'Incline Chest Fly (Dumbbell)',sets:2,reps:12,range:[10,12],source:'Incline dumbbell fly: 3 sets of 6–10 plus a drop set'}
    ]
  },
  {
    id: 'featured-nippard-legs-v1',
    name: 'Complete Leg Day',
    subtitle: 'Legs · glutes · calves · 15 working sets',
    bodyParts: ['Legs','Glutes','Calves'],
    context: 'A balanced lower-body session for hamstrings, quads, glutes and calves.',
    adaptation: 'The session combines seated leg curls, a hack-squat machine, barbell Romanian deadlifts, leg extensions, hip abduction and Smith-machine calf raises. Hip abduction is the outward movement, not adduction. Adjust the targets to your experience and recovery.',
    movements: [
      {id:'leg-curl',name:'Seated leg curl',sets:2,reps:10,range:[8,12],source:'Lying leg curl; seated variation used here'},
      {id:'lib-hack-squat-machine',name:'Hack Squat (Machine)',sets:3,reps:8,range:[6,10],source:'Pendulum squat; hack-squat machine used here'},
      {id:'lib-romanian-deadlift-barbell',name:'Romanian Deadlift (Barbell)',sets:3,reps:8,range:[8,10],source:'Romanian deadlift; barbell variation used here'},
      {id:'leg-extension',name:'Leg extension',sets:2,reps:12,range:[10,15],source:'Leg extension'},
      {id:'lib-hip-abductor-machine',name:'Hip Abductor (Machine)',sets:2,reps:15,range:[12,15],source:'Hip abduction'},
      {id:'lib-standing-calf-raise-smith-machine',name:'Standing Calf Raise (Smith Machine)',sets:3,reps:12,range:[10,15],source:'Standing calf raise; Smith-machine variation used here'}
    ]
  },
  {
  "id": "featured-training-push-a-v1",
  "name": "Push A",
  "subtitle": "Editable training template",
  "bodyParts": [
    "Chest",
    "Shoulders",
    "Arms"
  ],
  "context": "A simple starter session for a push, pull and leg rotation.",
  "adaptation": "Move through the six sessions at your own pace. Adjust the exercises, sets and reps to suit you.",
  "movements": [
    {
      "id": "lib-incline-bench-press-barbell",
      "name": "Incline Bench Press (Barbell)",
      "sets": 3,
      "reps": 8,
      "range": [
        6,
        10
      ]
    },
    {
      "id": "bench-press",
      "name": "Bench press",
      "sets": 3,
      "reps": 8,
      "range": [
        6,
        10
      ]
    },
    {
      "id": "lib-lateral-raise-cable",
      "name": "Lateral Raise (Cable)",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    },
    {
      "id": "tricep-pushdown",
      "name": "Triceps pushdown",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    },
    {
      "id": "lib-chest-fly-dumbbell",
      "name": "Chest Fly (Dumbbell)",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    }
  ]
},
  {
  "id": "featured-training-legs-a-v1",
  "name": "Legs A",
  "subtitle": "Editable training template",
  "bodyParts": [
    "Legs",
    "Glutes",
    "Calves"
  ],
  "context": "A simple starter session for a push, pull and leg rotation.",
  "adaptation": "Move through the six sessions at your own pace. Adjust the exercises, sets and reps to suit you.",
  "movements": [
    {
      "id": "squat",
      "name": "Back squat",
      "sets": 3,
      "reps": 8,
      "range": [
        6,
        10
      ]
    },
    {
      "id": "leg-curl",
      "name": "Seated leg curl",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "lib-romanian-deadlift-barbell",
      "name": "Romanian Deadlift (Barbell)",
      "sets": 3,
      "reps": 8,
      "range": [
        6,
        10
      ]
    },
    {
      "id": "leg-extension",
      "name": "Leg extension",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    },
    {
      "id": "lib-seated-calf-raise-plate-loaded",
      "name": "Seated Calf Raise (Plate Loaded)",
      "sets": 3,
      "reps": 12,
      "range": [
        10,
        14
      ]
    }
  ]
},
  {
  "id": "featured-training-pull-a-v1",
  "name": "Pull A",
  "subtitle": "Editable training template",
  "bodyParts": [
    "Back",
    "Arms"
  ],
  "context": "A simple starter session for a push, pull and leg rotation.",
  "adaptation": "Move through the six sessions at your own pace. Adjust the exercises, sets and reps to suit you.",
  "movements": [
    {
      "id": "lat-pulldown",
      "name": "Lat pulldown",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "lib-bent-over-one-arm-row-dumbbell",
      "name": "Bent Over One Arm Row (Dumbbell)",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "lib-pullover-dumbbell",
      "name": "Pullover (Dumbbell)",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    },
    {
      "id": "lib-shrug-barbell",
      "name": "Shrug (Barbell)",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    },
    {
      "id": "hammer-curl",
      "name": "Hammer curl",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    }
  ]
},
  {
  "id": "featured-training-push-b-v1",
  "name": "Push B",
  "subtitle": "Editable training template",
  "bodyParts": [
    "Chest",
    "Shoulders",
    "Arms"
  ],
  "context": "A simple starter session for a push, pull and leg rotation.",
  "adaptation": "Move through the six sessions at your own pace. Adjust the exercises, sets and reps to suit you.",
  "movements": [
    {
      "id": "lib-bench-press-dumbbell",
      "name": "Bench Press (Dumbbell)",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "shoulder-press",
      "name": "Shoulder press",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "cable-fly",
      "name": "Cable fly",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    },
    {
      "id": "lateral-raise",
      "name": "Lateral raise",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    },
    {
      "id": "tricep-pushdown",
      "name": "Triceps pushdown",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    }
  ]
},
  {
  "id": "featured-training-legs-b-v1",
  "name": "Legs B",
  "subtitle": "Editable training template",
  "bodyParts": [
    "Legs",
    "Glutes",
    "Calves"
  ],
  "context": "A simple starter session for a push, pull and leg rotation.",
  "adaptation": "Move through the six sessions at your own pace. Adjust the exercises, sets and reps to suit you.",
  "movements": [
    {
      "id": "leg-press",
      "name": "Leg press",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "lib-lying-leg-curl-machine",
      "name": "Lying Leg Curl (Machine)",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "romanian-deadlift",
      "name": "Dumbbell Romanian deadlift",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "lib-split-squat-dumbbell",
      "name": "Split squat (Dumbbell)",
      "sets": 2,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "lib-standing-calf-raise-bodyweight",
      "name": "Standing Calf Raise (Bodyweight)",
      "sets": 3,
      "reps": 12,
      "range": [
        10,
        14
      ]
    }
  ]
},
  {
  "id": "featured-training-pull-b-v1",
  "name": "Pull B",
  "subtitle": "Editable training template",
  "bodyParts": [
    "Back",
    "Arms"
  ],
  "context": "A simple starter session for a push, pull and leg rotation.",
  "adaptation": "Move through the six sessions at your own pace. Adjust the exercises, sets and reps to suit you.",
  "movements": [
    {
      "id": "lat-pulldown",
      "name": "Lat pulldown",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "lib-pendlay-row-barbell",
      "name": "Pendlay Row (Barbell)",
      "sets": 3,
      "reps": 8,
      "range": [
        6,
        10
      ]
    },
    {
      "id": "seated-row",
      "name": "Seated row",
      "sets": 3,
      "reps": 10,
      "range": [
        8,
        12
      ]
    },
    {
      "id": "rear-delt",
      "name": "Reverse fly",
      "sets": 2,
      "reps": 12,
      "range": [
        10,
        14
      ]
    },
    {
      "id": "lib-bicep-curl-barbell",
      "name": "Bicep Curl (Barbell)",
      "sets": 2,
      "reps": 10,
      "range": [
        8,
        12
      ]
    }
  ]
}
];
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const featuredTemplateDefinitions = freeze(definitions);
export const featuredTemplateInfo = routine => definitions.find(d => d.id === (typeof routine === 'string' ? routine : routine?.id)) || null;

export function createFeaturedTemplates() {
  return definitions.map(d => ({
    id:d.id,name:d.name,subtitle:d.subtitle,bodyParts:[...d.bodyParts],sets:3,
    exerciseIds:d.movements.map(m=>m.id),supersets:[],
    prescriptions:Object.fromEntries(d.movements.map(m=>[m.id,Array.from({length:m.sets},()=>({weightKg:null,reps:m.reps}))]))
  }));
}

// Call only after a backup has been validated. The marker travels in backups,
// rather than depending on local-only flags, so deliberate deletions stay deleted.
// Initial seeding preserves collisions; version2 only updates recognized default
// titles. Do not run migration against a corrupt/recovery state.
// Stable internal IDs retain saved links; legacy titles are used only for migration.
const legacyNames = {'featured-cutler-chest-v1':'Jay Cutler-Inspired Chest','featured-nippard-legs-v1':'Jeff Nippard-Inspired Leg Day'};
export function addFeaturedTemplates(state) {
  const version=state.featuredTemplatesVersion??0;
  if(version>=FEATURED_TEMPLATES_VERSION)return state;
  if(version>=1){
    const routines=state.routines.map(r=>{
      const d=definitions.find(d=>d.id===r.id);
      // Only a recognized built-in ID with its exact untouched title/subtitle.
      // User-selected names and user-created IDs are never renamed. Targets,
      // exercise choices, history and an in-progress workout are untouched.
      return d&&r.name===legacyNames[r.id]&&r.subtitle===d.subtitle?{...r,name:d.name}:r;
    });
    const ids = new Set(routines.map(r => r.id));
    const additions = createFeaturedTemplates().filter(r => r.id.startsWith('featured-training-') && !ids.has(r.id));
    return {...state,routines:[...routines,...additions],featuredTemplatesVersion:FEATURED_TEMPLATES_VERSION};
  }
  const ids=new Set(state.routines.map(r=>r.id));
  const additions=createFeaturedTemplates().filter(r=>!ids.has(r.id));
  return {...state,routines:[...state.routines,...additions],featuredTemplatesVersion:FEATURED_TEMPLATES_VERSION};
}

const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Static attribution describes the original Reptide starter, even after the user
// edits their copy. Only the routine ID is read; user text never becomes HTML.
export function featuredTemplateNotes(routine) {
  const d = featuredTemplateInfo(routine);
  if (!d) return '';
  return `<details class="featured-template-notes"><summary>Training notes</summary><div class="featured-template-notes-body"><p>${escape(d.context)}</p><p>${escape(d.adaptation)}</p><h4>Original Reptide starter targets</h4><p>These notes describe the supplied template. Your saved edits may differ.</p><ul>${d.movements.map(m=>`<li><strong>${escape(m.name)}</strong>: ${m.sets} × ${m.reps} reps; range ${m.range[0]}–${m.range[1]}. </li>`).join('')}</ul><p>${escape(safety)}</p><p>${escape(disclaimer)}</p></div></details>`;
}
