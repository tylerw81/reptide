// Product switches. Accounts and cloud sync are paused (Tyler, 16 Nov 2026): while this is false, signed-out
// people are only offered "Get started" on the welcome screen and no sign-in in Settings. Anyone already
// signed in keeps their account panel. Set to true to offer accounts again; nothing else needs changing.
export const ACCOUNTS_OFFERED = false;

// iPhone edition (web app added to the iPhone Home Screen). Always false in this source and in the Android app;
// scripts/build-iphone.mjs flips it to true in the iPhone copy only. When true, the app hides features that
// need the Android app (lock-screen rest alerts) and saves files through the iPhone share sheet.
export const IPHONE_EDITION = true;
