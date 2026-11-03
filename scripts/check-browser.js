import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createApp } from '../server.js';
import { mkdir, readFile } from 'node:fs/promises';

const server = createApp({ apiKey: 'browser-test-only', fetcher: async url => {
  const params = new URL(url).searchParams;
  if (new URL(url).pathname.endsWith('/channels')) return Response.json({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' } } }] });
  const title = params.get('q') || (params.get('playlistId') ? 'Channel upload' : 'Popular video');
  const secondPage = params.has('pageToken');
  return Response.json({ items: Array.from({ length: 6 }, (_, n) => ({
    id: { videoId: `testvideo${secondPage ? 1 : 0}${n}` },
    contentDetails: params.get('playlistId') ? { videoId: `testvideo${secondPage ? 1 : 0}${n}` } : undefined,
    snippet: { title: `${title} ${n + 1}`, channelId: 'UCabcdefghijklmnopqrstuv', channelTitle: 'Test channel', thumbnails: {} },
  })), nextPageToken: secondPage ? undefined : 'page2' });
} });
let browser;
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4173, '127.0.0.1', resolve); });
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 2560, height: 720 } });
  context.setDefaultTimeout(12000);
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  // Keep tests deterministic and offline; actual YouTube playback is not exercised.
  await context.route('https://www.youtube.com/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Test player placeholder</p>' }));
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: 'Play Popular video 1', exact: true }).waitFor();
  await page.getByRole('searchbox').fill('space');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: 'Play space 1', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Load more' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.card').length === 12);
  await page.getByRole('button', { name: 'Play space 1', exact: true }).first().click();
  assert.match(await page.locator('#player iframe').getAttribute('src'), /youtube\.com\/embed\/testvideo00/);
  await page.locator('#save-video').click();
  await page.locator('nav').getByRole('button', { name: 'Watch later' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.card').length === 1);
  await page.locator('#playing-channel').click();
  await page.getByRole('button', { name: 'Play Channel upload 1', exact: true }).waitFor();
  // Browsing does not tear down the playing video.
  assert.match(await page.locator('#player iframe').getAttribute('src'), /testvideo00/);
  await page.getByRole('button', { name: 'Close player' }).click();
  assert.equal(await page.locator('#player iframe').count(), 0);
  await page.getByRole('button', { name: 'Layout', exact: true }).click();
  await mkdir(new URL('../build/screenshots/', import.meta.url), { recursive: true });
  for (const [size, width] of [['compact', 480], ['medium', 1024], ['wide', 2560]]) {
    await page.setViewportSize({ width, height: 720 });
    await page.locator('#size').selectOption(size);
    assert.equal(await page.locator('#widget').getAttribute('data-size'), size);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${size} must not overflow horizontally`);
    await page.screenshot({ path: new URL(`../build/screenshots/${size}.png`, import.meta.url).pathname });
  }
  console.log('PASS: search, pagination, playback selection, channel navigation, saved videos, and three responsive layouts');

  await context.addInitScript(() => { window.widgetLayout = 'compact'; window.uniqueId = 'test-instance'; window.iCUE_initialized = true; });
  // The managed browser prohibits file:// navigation. Serve only our three
  // wrapper assets through test routes; this simulates iCUE injection, not its
  // custom origin, Qt runtime, or actual file-loading policy.
  for (const [routePath, file, contentType] of [
    ['/widget-test', 'index.html', 'text/html'],
    ['/styles/widget.css', 'styles/widget.css', 'text/css'],
    ['/scripts/widget.js', 'scripts/widget.js', 'text/javascript'],
  ]) {
    await context.route(`http://127.0.0.1:4173${routePath}`, async route => route.fulfill({ contentType, body: await readFile(new URL(`../widget/${file}`, import.meta.url)) }));
  }
  await page.goto('http://127.0.0.1:4173/widget-test');
  await page.locator('#connection').waitFor({ state: 'hidden' });
  const app = page.frameLocator('#app');
  assert.equal(await app.locator('#widget').getAttribute('data-size'), 'compact');
  await page.evaluate(() => { window.widgetLayout = 'wide'; window.icueEvents.onDataUpdated(); });
  await app.locator('#widget[data-size="wide"]').waitFor();
  const src = await page.locator('#app').getAttribute('src');
  assert.equal(new URL(src).searchParams.get('instance'), 'test-instance');
  await app.getByRole('button', { name: 'Play Popular video 1', exact: true }).click();
  await app.locator('#save-video').click();
  await page.evaluate(() => { window.uniqueId = 'second-instance'; window.icueEvents.onDataUpdated(); });
  await page.locator('#connection').waitFor({ state: 'hidden' });
  await app.locator('nav').getByRole('button', { name: 'Watch later' }).click();
  await app.getByText('Save a video with', { exact: false }).waitFor();
  assert.equal(await app.locator('.card').count(), 0);
  await context.route('http://127.0.0.1:4173/**', route => route.abort());
  await page.evaluate(() => document.getElementById('retry').click());
  await page.getByText('The companion service did not respond.', { exact: false }).waitFor({ timeout: 12000 });
  await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: 'http://127.0.0.1:4173', source: window, data: { type: 'xeneontube:ready' } })));
  assert.ok(await page.locator('#connection').isVisible());
  await context.unroute('http://127.0.0.1:4173/**');
  await page.getByRole('button', { name: 'Reconnect' }).click();
  await page.locator('#connection').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, []);
  console.log('PASS: HTTP-served iCUE wrapper simulation, injected layout updates, per-instance storage, connection failure/recovery, and message source validation');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
