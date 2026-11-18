// One persisted choice drives the interface and every exported workout page.
// `share` colors the workout image and finish screen: a deep ground, a bright accent,
// light text, and the dark text used on top of the accent.
export const themes = [
  {id:'steel',label:'Steel',description:'Black, gunmetal & lightning silver',dark:true,chrome:'#0b0c0e',share:{background:'#0b0c0e',center:'#30353c',edge:'#000000',text:'#f5f6f8',accent:'#e8ebef',onAccent:'#0b0c0e',muted:'#a3a9b1',line:'#2c3036',star:'#0b0c0e'}},
  {id:'original',label:'Original',description:'Warm ivory, deep forest & neon lime',dark:false,chrome:'#f7f2e8',share:{background:'#05291d',center:'#0e4a33',edge:'#021a12',text:'#f5f1e6',accent:'#b9f522',onAccent:'#05291d',muted:'#9fb79c',line:'#1d4a37'}},
  {id:'dark',label:'Midnight Red',description:'Near-black, charcoal & vivid red',dark:true,chrome:'#050404',share:{background:'#0b0606',center:'#3a100d',edge:'#000000',text:'#fafafa',accent:'#ff3d33',onAccent:'#0b0606',muted:'#c2a9a6',line:'#3a1b19'}},
  {id:'magenta',label:'Magenta',description:'Soft pink, plum & electric magenta',dark:false,chrome:'#fff3fa',share:{background:'#2a0f33',center:'#5a1f63',edge:'#170720',text:'#fff4fc',accent:'#ff80d5',onAccent:'#2a0f33',muted:'#cfaacb',line:'#4d2757'}},
  {id:'carbon',label:'Carbon Gold',description:'True black, graphite & gold',dark:true,chrome:'#0a0a0a',share:{background:'#0a0a0a',center:'#3a2f10',edge:'#000000',text:'#f6f3ea',accent:'#ffc233',onAccent:'#0a0a0a',muted:'#bdb6a5',line:'#332d1f'}},
  {id:'ocean',label:'Deep Ocean',description:'Midnight navy, slate & electric cyan',dark:true,chrome:'#061321',share:{background:'#061321',center:'#0f3a57',edge:'#020a13',text:'#eef6ff',accent:'#35d6ff',onAccent:'#04121f',muted:'#a3b9cf',line:'#1b3550'}},
  {id:'daylight',label:'Daylight',description:'Clean white, navy & sunshine yellow',dark:false,chrome:'#f7f9fc',share:{background:'#14213d',center:'#28427c',edge:'#0b1426',text:'#f7f9fc',accent:'#ffd60a',onAccent:'#14213d',muted:'#adb9d3',line:'#2b3c63'}},
  {id:'blossom',label:'Blossom',description:'Soft cream, dusty rose & deep berry',dark:false,chrome:'#fff8f4',share:{background:'#4b1d33',center:'#7a3154',edge:'#30111f',text:'#fff8f4',accent:'#f9a8b8',onAccent:'#4b1d33',muted:'#d7adba',line:'#6a3049'}}
];
export const normalizeTheme = id => themes.some(theme=>theme.id===id)?id:'original';
export const getTheme = id => themes.find(theme=>theme.id===normalizeTheme(id));
export function applyTheme(id,root=document.documentElement) {
  const theme=getTheme(id);root.dataset.theme=theme.id;
  root.style.colorScheme=theme.dark?'dark':'light';
  root.ownerDocument?.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme.chrome);
  // The optional native bridge keeps Android's surrounding surfaces in sync.
  globalThis.ForgeNative?.setTheme?.(theme.id);
  return theme;
}
export function themePicker(id) {
  return `<section class="theme-settings" aria-labelledby="theme-heading"><h2 id="theme-heading">Appearance</h2><p class="theme-help">Your colors, everywhere. Workout share images match too.</p><div class="theme-options" role="group" aria-label="Color theme">${themes.map(theme=>`<button class="theme-option theme-${theme.id}" data-action="theme" data-theme="${theme.id}" aria-pressed="${normalizeTheme(id)===theme.id}"><span class="theme-swatches" aria-hidden="true"><i></i><i></i><i></i></span><span class="theme-copy"><strong>${theme.label}</strong><small>${theme.description}</small></span><span class="theme-check" aria-hidden="true">${normalizeTheme(id)===theme.id?'✓':''}</span></button>`).join('')}</div></section>`;
}
