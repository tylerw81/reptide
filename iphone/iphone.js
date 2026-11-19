// iPhone edition only: loaded by the index.html that scripts/build-iphone.mjs writes. The Android app never loads it.
// 1) Works offline: registers the service worker (sw.js) that keeps a copy of every app file on the phone.
// 2) Install screen: when the app is opened in Safari instead of from the Home Screen icon, explain how to add it.
//    Safari and the Home Screen app keep separate storage on iPhone, so workouts logged in a Safari tab would not
//    appear in the Home Screen app. The screen can be dismissed to look around first.

const DISMISS_KEY = 'reptide.installHint.dismissed';

export function isStandalone(win = window) {
  return win.navigator.standalone === true || win.matchMedia?.('(display-mode: standalone)').matches === true;
}

function isIOS(win = window) {
  const nav = win.navigator;
  return /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

const shareIcon = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>';

function installScreen(ios) {
  const steps = ios
    ? `<li><span>1</span><p>Tap <b>Share</b> <i>${shareIcon}</i> at the bottom of Safari.</p></li>
       <li><span>2</span><p>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</p></li>
       <li><span>3</span><p>Open <b>Reptide</b> from your Home Screen.</p></li>`
    : `<li><span>1</span><p>Open this page in <b>Safari</b> on your iPhone.</p></li>
       <li><span>2</span><p>Tap <b>Share</b> <i>${shareIcon}</i>, then <b>Add to Home Screen</b>.</p></li>
       <li><span>3</span><p>Open <b>Reptide</b> from your Home Screen.</p></li>`;
  const el = document.createElement('div');
  el.id = 'install-gate';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'install-title');
  el.innerHTML = `<style>
#install-gate{position:fixed;inset:0;z-index:100;overflow-y:auto;background:#0b0c0e;color:#f2f4f6;font-family:Inter,"Segoe UI",Arial,sans-serif;
  padding:calc(28px + env(safe-area-inset-top)) 26px calc(28px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center}
#install-gate .ig-wrap{max-width:420px;width:100%;margin:auto 0;display:flex;flex-direction:column;align-items:center;text-align:center}
#install-gate img{width:112px;height:112px;border-radius:25px;box-shadow:0 0 0 1px #2c3036,0 0 50px #ffffff1a}
#install-gate h1:focus{outline:none}
#install-gate h1{font-size:30px;line-height:1.15;letter-spacing:-1px;margin:26px 0 10px;font-weight:800}
#install-gate .ig-lead{color:#a3a9b1;font-size:15px;line-height:1.55;margin:0 0 24px}
#install-gate ol{list-style:none;padding:0;margin:0 0 22px;width:100%;display:grid;gap:10px;text-align:left}
#install-gate li{display:flex;gap:14px;align-items:center;background:#17191c;border:1px solid #30343a;border-radius:16px;padding:14px 16px}
#install-gate li span{flex:none;width:28px;height:28px;border-radius:50%;background:#e8ebef;color:#0b0c0e;display:grid;place-items:center;font-weight:800;font-size:14px}
#install-gate li p{margin:0;font-size:15px;line-height:1.45}
#install-gate li i{display:inline-flex;vertical-align:-5px;color:#e8ebef}
#install-gate .ig-note{color:#a3a9b1;font-size:13px;line-height:1.55;margin:0 0 20px}
#install-gate button{background:transparent;border:0;color:#e8ebef;font:inherit;font-size:15px;text-decoration:underline;text-underline-offset:5px;min-height:44px;padding:8px 12px;cursor:pointer}
</style>
<div class="ig-wrap">
  <img src="iphone/icon-180.png" alt="">
  <h1 id="install-title" tabindex="-1">Add Reptide to your Home Screen</h1>
  <p class="ig-lead">It opens full screen like an app and works without internet.</p>
  <ol>${steps}</ol>
  <p class="ig-note">Your workouts are saved inside the Home Screen app, on your phone only. Anything you log here in Safari stays in Safari.</p>
  <button type="button" data-install-dismiss>Look around in Safari first</button>
</div>`;
  el.querySelector('[data-install-dismiss]').addEventListener('click', () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode: just close */ }
    el.remove();
  });
  return el;
}

function showInstallHint() {
  if (isStandalone()) return;
  try { if (sessionStorage.getItem(DISMISS_KEY) === '1') return; } catch { /* ignore */ }
  document.body.append(installScreen(isIOS()));
  document.getElementById('install-title')?.focus();
}

// iPhone zooms the page into any text box under 16px, which made search and set logging jump around.
// styles.css sizes inputs at 16px under html.ios.
if (isIOS()) document.documentElement.classList.add('ios');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline copy is a bonus; the app still works online */ });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showInstallHint);
else showInstallHint();
