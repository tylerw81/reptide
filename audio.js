// Native SoundPool avoids taking audio focus from workout music. The browser
// preview uses the same bundled WAV files and only plays after a user action.
import {IPHONE_EDITION} from './features.js';
const clips = new Map();
// On iPhone a web page that plays a sound takes over audio and stops other apps' music (Spotify) unless its
// audio session is "ambient", which mixes with music instead (Safari 16.4+). Returns false where that isn't possible.
export function mixWithMusic(nav = navigator) {
  const session = nav.audioSession;
  if (!session) return false;
  try { if (session.type !== 'ambient') session.type = 'ambient'; return session.type === 'ambient'; } catch { return false; }
}
export function playCompletionSound(kind, enabled = true) {
  if (!enabled || !['set', 'workout'].includes(kind) || document.hidden) return;
  try {
    if (window.ForgeNative?.playCompletionSound) {
      window.ForgeNative.playCompletionSound(kind);
      return;
    }
    // Older iPhones can't mix: stay silent rather than stop the lifter's music.
    if (!mixWithMusic() && IPHONE_EDITION) return;
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
