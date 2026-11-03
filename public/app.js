const $ = id => document.getElementById(id);
const launchParams = new URLSearchParams(location.search);
const instanceId = launchParams.get('instance');
function storageKey(key) { return instanceId ? `${key}:${instanceId}` : key; }
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(storageKey(key))) ?? fallback; } catch { return fallback; } }
function persist(key, value) { try { localStorage.setItem(storageKey(key), JSON.stringify(value)); } catch { /* Browser storage may be disabled by the host. */ } }
let saved = read('xeneontube.saved', []);
if (!Array.isArray(saved)) saved = [];
saved = saved.filter(v => v && /^[\w-]{11}$/.test(v.id));
let current = null;
let state = { title: 'Popular on YouTube', category: '', q: '', channel: '', saved: false };
let nextPage = null;
let controller;
const history = [];
const entities = document.createElement('textarea');
function plain(value) { entities.innerHTML = String(value); return entities.value; }
function safeThumbnail(value) { try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'i.ytimg.com' ? u.href : ''; } catch { return ''; } }
function button(text, action, className) { const el = document.createElement('button'); el.textContent = text; el.addEventListener('click', action); if (className) el.className = className; return el; }
function render(items, append = false) {
  if (!append) $('results').replaceChildren();
  for (const item of items) {
    const card = document.createElement('article'); card.className = 'card';
    const play = button('', () => watch(item), 'play');
    play.setAttribute('aria-label', `Play ${plain(item.title)}`);
    const img = document.createElement('img');
    const thumbnail = safeThumbnail(item.thumbnail);
    if (thumbnail) img.src = thumbnail; else img.className = 'missing-thumbnail';
    img.alt = ''; img.loading = 'lazy';
    const title = document.createElement('strong'); title.textContent = plain(item.title);
    play.append(img, title);
    const channel = button(plain(item.channelTitle), () => navigate({ title: plain(item.channelTitle), channel: item.channelId, q: '', category: '', saved: false }), 'channel');
    channel.disabled = !/^UC[\w-]{22}$/.test(item.channelId);
    card.append(play, channel); $('results').append(card);
  }
  $('count').textContent = `${$('results').childElementCount} videos`;
}
async function load(append = false) {
  controller?.abort(); controller = new AbortController();
  const thisController = controller;
  $('feed-title').textContent = state.title; $('back').hidden = history.length === 0;
  $('more').hidden = true; $('more').disabled = true;
  document.querySelectorAll('[data-feed]').forEach(el => el.classList.toggle('active', state.saved ? el.dataset.feed === 'saved' : !state.q && !state.channel && el.dataset.feed === (state.category || 'home')));
  if (state.saved) { render(saved); $('status').textContent = saved.length ? '' : 'Save a video with “Watch later” while playing it. Videos are stored on this device.'; return; }
  if (!append) render([]);
  $('status').textContent = 'Loading videos…';
  try {
    const params = new URLSearchParams({ q: state.q, channel: state.channel, category: state.category });
    if (append && nextPage) params.set('page', nextPage);
    const response = await fetch(`/api/videos?${params}`, { signal: thisController.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load videos.');
    render(data.items, append); nextPage = data.nextPage;
    $('status').textContent = data.items.length ? '' : 'No videos found. Try another search.';
    $('more').hidden = !nextPage; $('more').disabled = false;
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('status').textContent = error.message;
    $('status').append(' ', button('Retry', () => load(append)));
  }
}
function navigate(next) { history.push({ ...state }); state = next; nextPage = null; load(); }
function updateSave() { $('save-video').textContent = saved.some(v => v.id === current?.id) ? 'Remove from saved' : 'Watch later'; }
function watch(item) {
  current = item; $('watch').hidden = false;
  const frame = document.createElement('iframe');
  // Standard HTTPS embed supplies the player with an origin/referrer, unlike file:// pages.
  frame.src = `https://www.youtube.com/embed/${encodeURIComponent(item.id)}?playsinline=1&autoplay=1`;
  frame.title = plain(item.title); frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  $('player').replaceChildren(frame); $('playing-title').textContent = plain(item.title);
  $('youtube-link').href = `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`;
  $('playing-channel').textContent = plain(item.channelTitle); updateSave();
  $('watch').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
$('search').addEventListener('submit', event => { event.preventDefault(); const q = $('query').value.trim(); if (q) navigate({ title: `Results for “${q}”`, q, category: '', channel: '', saved: false }); });
document.querySelectorAll('[data-feed]').forEach(el => el.addEventListener('click', () => { const feed = el.dataset.feed; $('query').value = ''; navigate({ title: feed === 'saved' ? 'Watch later' : feed === 'home' ? 'Popular on YouTube' : el.textContent, q: '', channel: '', category: /^\d+$/.test(feed) ? feed : '', saved: feed === 'saved' }); }));
$('back').addEventListener('click', () => { if (!history.length) return; state = history.pop(); $('query').value = state.q; nextPage = null; load(); });
$('more').addEventListener('click', () => load(true));
$('close-player').addEventListener('click', () => { $('player').replaceChildren(); $('watch').hidden = true; current = null; });
$('playing-channel').addEventListener('click', () => { if (current) navigate({ title: plain(current.channelTitle), channel: current.channelId, q: '', category: '', saved: false }); });
$('save-video').addEventListener('click', () => { if (!current) return; saved = saved.some(v => v.id === current.id) ? saved.filter(v => v.id !== current.id) : [current, ...saved].slice(0, 100); persist('xeneontube.saved', saved); updateSave(); if (state.saved) load(); });
$('settings-toggle').addEventListener('click', () => { $('settings').hidden = !$('settings').hidden; $('settings-toggle').setAttribute('aria-expanded', String(!$('settings').hidden)); });
const requestedSize = launchParams.get('size') || read('xeneontube.size', 'auto');
$('size').value = ['auto', 'compact', 'medium', 'wide'].includes(requestedSize) ? requestedSize : 'auto';
function applySize() { $('widget').dataset.size = $('size').value; }
$('size').addEventListener('change', () => { applySize(); persist('xeneontube.size', $('size').value); }); applySize();
async function checkConnection() {
  try {
    const response = await fetch('/api/status', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Service unavailable');
    const data = await response.json();
    $('connection').textContent = data.configured ? 'API configured' : 'API key needed · see README';
    if (launchParams.get('host') === 'icue' && parent !== window) {
      // A file/custom-scheme iCUE parent has an opaque origin. This heartbeat carries
      // no credentials or user data; the parent verifies our origin and window.
      parent.postMessage({ type: 'xeneontube:ready' }, '*');
    }
  } catch { $('connection').textContent = 'Server unavailable'; }
}
checkConnection();
if (launchParams.get('host') === 'icue') setInterval(checkConnection, 5000);
load();
