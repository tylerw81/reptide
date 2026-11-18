import {youtubeId} from './training.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,500}$/.test(id);
const own = (value, key) => object(value) && Object.hasOwn(value, key);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Corrections may choose a YouTube video, never an image path or arbitrary URL. */
export function correctionVideoUrl(input) {
  if (typeof input !== 'string' || input.length > 500 || !input.trim()) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname)) return null;
    const isShort = url.hostname === 'youtu.be';
    if (!(isShort ? /^\/[\w-]{11}\/?$/.test(url.pathname) :
      url.pathname === '/watch' || /^\/(?:embed|shorts)\/[\w-]{11}\/?$/.test(url.pathname))) return null;
    const id = youtubeId(url.href);
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch { return null; }
}

function validCorrection(value) {
  return object(value) && Object.keys(value).every(key => ['hideIllustration','videoUrl'].includes(key)) &&
    (value.hideIllustration === undefined || typeof value.hideIllustration === 'boolean') &&
    (value.videoUrl === undefined || value.videoUrl === '' || correctionVideoUrl(value.videoUrl) !== null);
}

/** Validate backup data. Unknown fields and exercise IDs are not media authority. */
export function validateGuideCorrections(value, allowedIds) {
  if (value === undefined) return;
  if (!object(value) || Object.keys(value).length > 1284) throw new Error('Invalid exercise guide corrections.');
  const allowed = allowedIds instanceof Set ? allowedIds : new Set(allowedIds || []);
  for (const [id, correction] of Object.entries(value)) {
    if (!safeId(id) || !allowed.has(id) || !validCorrection(correction)) throw new Error('Invalid exercise guide correction or YouTube link.');
  }
}

export function guideCorrectionFor(exercise, corrections = {}) {
  const id = exercise?.id;
  if (!safeId(id) || !own(corrections, id) || !validCorrection(corrections[id])) return null;
  const value = corrections[id];
  const videoUrl = correctionVideoUrl(value.videoUrl) || '';
  return value.hideIllustration || videoUrl ? {hideIllustration:value.hideIllustration === true, videoUrl} : null;
}

/** Return new data without changing the exercise, media manifest or other entries. */
export function setGuideCorrection(corrections, exercise, patch) {
  if (!safeId(exercise?.id) || !validCorrection(patch)) throw new Error('Use a valid HTTPS YouTube video link.');
  const next = {...(object(corrections) ? corrections : {})};
  const videoUrl = correctionVideoUrl(patch.videoUrl) || '';
  // A custom exercise's saved manual video is authoritative. To change it, use
  // Edit custom exercise. Hiding an illustration never modifies that URL.
  if (videoUrl && typeof exercise.videoUrl === 'string' && exercise.videoUrl.trim()) {
    throw new Error('Edit the custom exercise to change its saved video link.');
  }
  const correction = {hideIllustration:patch.hideIllustration === true, videoUrl};
  // Computed object-literal keys create own data properties, including a legacy
  // custom ID named __proto__. Never assign untrusted IDs with next[id] = value.
  if (correction.hideIllustration || correction.videoUrl) return {...next, [exercise.id]:correction};
  delete next[exercise.id];
  return next;
}

export function resetGuideCorrection(corrections, id) {
  const next = {...(object(corrections) ? corrections : {})};
  if (safeId(id)) delete next[id];
  return next;
}

export function applyGuideCorrection(result, exercise, corrections = {}) {
  const correction = guideCorrectionFor(exercise, corrections);
  if (!correction) return result;
  const manual = typeof exercise?.videoUrl === 'string' && exercise.videoUrl.trim() !== '';
  const useVideo = correction.videoUrl && !manual;
  const messages = [];
  if (correction.hideIllustration) messages.push('Illustration hidden by your local correction.');
  if (useVideo) messages.push('Using your custom correction video.');
  if (correction.videoUrl && manual) messages.push('Your saved custom-exercise video takes priority.');
  return {...result, correction, corrected:true,
    illustration:correction.hideIllustration ? null : result.illustration,
    illustrationHidden:correction.hideIllustration,
    video:useVideo ? {id:youtubeId(correction.videoUrl),title:'Your custom correction',channel:'YouTube',url:correction.videoUrl} : result.video,
    videoSource:useVideo ? 'correction' : result.videoSource,
    correctionMessage:messages.join(' '),
    message:`${result.message} ${messages.join(' ')}`.trim()};
}

/** Pure markup; the app owns local persistence, cancel/navigation and toasts. */
export function guideCorrectionForm(exercise, corrections = {}, baseGuide = {}) {
  const correction = guideCorrectionFor(exercise, corrections);
  const manual = typeof exercise?.videoUrl === 'string' && exercise.videoUrl.trim() !== '';
  const hasArt = Boolean(baseGuide.illustration || correction?.hideIllustration);
  return `<section class="guide-correction" aria-label="Correct exercise guidance">
    <p class="dialog-copy">Hide an illustration that looks wrong or choose your own YouTube demonstration. Changes stay on this device and in your backups. Nothing is reported or uploaded.</p>
    ${correction ? '<p class="guide-correction-badge">Custom correction saved</p>' : ''}
    <label class="guide-correction-check"><input id="guide-hide-illustration" type="checkbox" ${correction?.hideIllustration ? 'checked' : ''} ${hasArt ? '' : 'disabled'}><span>Hide this illustration</span></label>
    ${hasArt ? '' : '<p class="muted">No verified illustration is available for this exact variation.</p>'}
    <label class="field" for="guide-video-url">Your YouTube demonstration</label>
    <input class="input" id="guide-video-url" type="url" inputmode="url" autocomplete="off" maxlength="500" aria-describedby="guide-video-help" placeholder="https://www.youtube.com/watch?v=…" value="${esc(manual ? exercise.videoUrl : correction?.videoUrl || '')}" ${manual ? 'disabled' : ''}>
    <p id="guide-video-help" class="muted">${manual ? 'This custom exercise already has your video link. Use Edit custom exercise to change it; guide corrections will not replace it.' : 'Use a specific HTTPS YouTube video link. Clear this field to use the default video.'}</p>
    <button class="button primary full" data-action="save-guide-correction" data-id="${esc(exercise.id)}">Save correction</button>
    ${correction ? `<button class="button secondary full spaced" data-action="reset-guide-correction" data-id="${esc(exercise.id)}">Reset to default guide</button>` : ''}
    <p class="muted guide-correction-footnote">Reset restores the bundled guide and keeps any saved custom-exercise video. Hidden artwork and its attribution remain bundled.</p>
  </section>`;
}
