const browserApi = globalThis.browser;
const AMBROSIA_WEB = 'https://ambrosia-web.fly.dev';
const BTN_ID = 'ambrosia-save-fab';

function platformOf(href) {
  try {
    const host = new URL(href).hostname.replace(/^www\./, '').toLowerCase();
    if (host.endsWith('tiktok.com')) return 'TikTok';
    if (host.endsWith('instagram.com')) return 'Instagram';
    if (host === 'x.com' || host === 'twitter.com') return 'X';
    if (host.endsWith('reddit.com')) return 'Reddit';
    if (host.endsWith('bsky.app')) return 'Bluesky';
    if (host.endsWith('vimeo.com')) return 'Vimeo';
    if (host.endsWith('twitch.tv')) return 'Twitch';
    if (host.endsWith('facebook.com')) return 'Facebook';
    return null;
  } catch {
    return null;
  }
}

function inject() {
  if (document.getElementById(BTN_ID)) return;
  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.type = 'button';
  btn.className = 'ambrosia-fab';
  btn.title = 'Save to Ambrosia';
  btn.innerHTML = `
    <span class="ambrosia-fab-icon">📚</span>
    <span class="ambrosia-fab-label">Save to Ambrosia</span>
  `;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = window.location.href;
    browserApi.runtime.sendMessage({ type: 'open-ambrosia-with', url });
    flashSaved(btn);
  });
  document.body.appendChild(btn);
}

function flashSaved(btn) {
  btn.classList.add('saving');
  const labelEl = btn.querySelector('.ambrosia-fab-label');
  const orig = labelEl.textContent;
  labelEl.textContent = 'Opening Ambrosia…';
  setTimeout(() => {
    btn.classList.remove('saving');
    labelEl.textContent = orig;
  }, 1500);
}

const observer = new MutationObserver(() => {
  if (!document.getElementById(BTN_ID)) inject();
});

function start() {
  if (!platformOf(window.location.href)) return;
  inject();
  observer.observe(document.body, { childList: true, subtree: false });
}

if (document.body) {
  start();
} else {
  document.addEventListener('DOMContentLoaded', start, { once: true });
}
