// Native SoundPool avoids taking audio focus from workout music. The browser
// preview uses the same bundled WAV files and only plays after a user action.
const clips = new Map();
export function playCompletionSound(kind, enabled = true) {
  if (!enabled || !['set', 'workout'].includes(kind) || document.hidden) return;
  try {
    if (window.ForgeNative?.playCompletionSound) {
      window.ForgeNative.playCompletionSound(kind);
      return;
    }
    let clip = clips.get(kind);
    if (!clip) {
      clip = new Audio(`audio/${kind}-complete.wav`);
      clip.volume = 0.5;
      clips.set(kind, clip);
    }
    clip.currentTime = 0;
    clip.play()?.catch(() => {});
  } catch { /* Audio failure must never interrupt logging or autosave. */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) for (const clip of clips.values()) clip.pause();
});
