// Rest preferences are optional additions to the original v1 backup format.
export const REST_CHOICES = [0, 30, 60, 90, 120, 180, 300, 600];
export const MAX_REST_SECONDS = 86400;
export const validRestSeconds = value => Number.isInteger(value) && value >= 0 && value <= 600;
export const defaultRestSeconds = settings => validRestSeconds(settings?.restSeconds) ? settings.restSeconds : 90;
export function exerciseRestSeconds(settings, exerciseId) {
  const overrides = settings?.exerciseRestSeconds;
  return overrides && Object.hasOwn(overrides, exerciseId) && validRestSeconds(overrides[exerciseId])
    ? overrides[exerciseId] : defaultRestSeconds(settings);
}
export function validateRestSettings(settings, exerciseIds) {
  for (const field of ['restNotifications', 'restAlertSound']) {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') throw new Error('Invalid rest alert preference.');
  }
  const values = settings.exerciseRestSeconds;
  if (values === undefined) return true;
  if (!values || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).length > 1500 ||
      !Object.entries(values).every(([id, seconds]) => /^[A-Za-z0-9_-]{1,500}$/.test(id) &&
        (!exerciseIds || exerciseIds.has(id)) && validRestSeconds(seconds))) {
    throw new Error('Invalid per-exercise rest preferences.');
  }
  return true;
}
// No names, exercise details, or notes cross the native notification bridge.
export function restAlertPayload(state, now = Date.now()) {
  const workout = state?.active, end = workout?.restEndsAt;
  const enabled = state?.settings?.restNotifications === true;
  const valid = enabled && typeof workout?.id === 'string' && /^[A-Za-z0-9_-]{1,500}$/.test(workout.id) &&
    Number.isSafeInteger(end) && end > now && end - now <= MAX_REST_SECONDS * 1000;
  return {enabled, sound: state?.settings?.restAlertSound !== false,
    token: valid ? `${workout.id}:${end}` : null, endsAt: valid ? end : null};
}
export function createRestAlertController(bridge = globalThis.ForgeNative) {
  let previous = null;
  return {
    available: !!bridge?.syncRest,
    preciseTimingAvailable: typeof bridge?.openRestTimingSettings === 'function',
    sync(state, now = Date.now(), force = false) {
      // A resumed activity can still be behind the lock screen. Do not erase a due
      // native alarm until the visible UI can consume it or Android delivers it.
      if (state?.settings?.restNotifications===true && Number.isSafeInteger(state?.active?.restEndsAt) && state.active.restEndsAt<=now && typeof bridge?.isRestForeground==='function') {
        try { if (bridge.isRestForeground()!==true) return false; } catch { return false; }
      }
      const payload = JSON.stringify(restAlertPayload(state, now));
      if (!bridge?.syncRest || (!force && payload === previous)) return false;
      try { bridge.syncRest(payload); previous = payload; return true; } catch { previous = null; return false; }
    },
    // One-shot: a change made from the Android rest notification, or null.
    takeAdjustment() {
      try {
        const raw = bridge?.takeRestAdjustment?.();
        if (typeof raw !== 'string' || !raw || raw.length > 700) return null;
        const value = JSON.parse(raw);
        return typeof value?.base === 'string' && Number.isSafeInteger(value.endsAt) && value.endsAt >= 0 ? {base: value.base, endsAt: value.endsAt} : null;
      } catch { return null; }
    },
    requestStatus() { try { bridge?.requestRestAlertStatus?.(); } catch { /* The in-app timer still works. */ } },
    // Call true only from a user's explicit Enable button, never on load or restore.
    setEnabled(enabled) { previous = null; try { bridge?.setRestAlertsEnabled?.(enabled === true); } catch { return false; } return !!bridge?.setRestAlertsEnabled; },
    openSettings() { try { bridge?.openRestAlertSettings?.(); } catch { return false; } return !!bridge?.openRestAlertSettings; },
    openTimingSettings() { try { bridge?.openRestTimingSettings?.(); } catch { return false; } return !!bridge?.openRestTimingSettings; }
  };
}
export function restAlertStatusText(status) {
  if (!status?.available) return 'Background alerts are available in the Android app. The timer still works here.';
  if (!status.enabled) return 'Background alerts are off. Enable them to request notifications.';
  if (!status.permissionGranted || !status.notificationsAllowed) return 'Android notifications are blocked. Allow Reptide notifications in Android settings.';
  if (!status.channelEnabled) return 'This rest alert channel is blocked in Android settings.';
  if (status.schedulingError) return 'Android could not schedule this background alert. The in-app timer still works.';
  const blocked={
    'app-off':'Rest alert sound is off in Reptide.',
    'channel-muted':'Rest alert sound is muted in Android notification settings.',
    'phone-silent':'Your phone is in silent or vibrate mode.',
    'notification-volume':'Your notification volume is at zero. Raise notification volume to hear rest alerts.'
  };
  const sound = status.soundEnabled ? (status.dndActive ? 'Do Not Disturb may silence alerts.' : 'Sound follows Android notification volume and Do Not Disturb.') : blocked[status.soundBlockedReason]||'Rest alerts are silent. Check notification volume and Android notification settings.';
  const timing=status.exactAlarmAllowed===true?'Precise timing is enabled. Battery restrictions may still delay alerts.':'Precise timing is off; Android may delay locked-screen alerts.';
  return `Background alerts are on. ${sound} ${timing}`;
}
