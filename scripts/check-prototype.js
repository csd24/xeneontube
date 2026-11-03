import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/styles/main.css', ['styles/main.css', 'text/css']],
  ['/scripts/main.js', ['scripts/main.js', 'text/javascript']],
  ['/resources/icon.svg', ['resources/icon.svg', 'image/svg+xml']],
]);
const server = createServer(async (req, res) => {
  const asset = assets.get(new URL(req.url, 'http://localhost').pathname);
  if (!asset) { res.writeHead(404); res.end(); return; }
  try {
    const data = await readFile(new URL(`../prototype/${asset[0]}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': asset[1] }); res.end(data);
  } catch { res.writeHead(500); res.end(); }
});
let browser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  async function scenario(globals = {}) {
    const context = await browser.newContext();
    context.setDefaultTimeout(10000);
    await context.addInitScript(values => Object.assign(window, values), globals);
    // Local fixtures test main-frame navigation only. No live YouTube access,
    // iCUE security policy, codecs, remote settings, or playback is simulated.
    await context.route('https://**.youtube.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html><title>Destination fixture</title><p id="remote">Navigation fixture, not YouTube playback</p>' }));
    const page = await context.newPage();
    await page.goto(base);
    return { context, page };
  }
  {
    const { context, page } = await scenario();
    assert.equal(await page.locator('iframe').count(), 0);
    assert.equal(await page.locator('#fullscreen').textContent(), await page.evaluate(() => document.fullscreenEnabled === true ? 'Enabled for this document; host acceptance still required' : 'Disabled or unavailable for this document'));
    await page.getByRole('button', { name: 'Open YouTube in this widget' }).click();
    await page.locator('#remote').waitFor();
    assert.equal(page.url(), 'https://www.youtube.com/');
    assert.equal(context.pages().length, 1);
    assert.equal(page.frames().length, 1);
    assert.equal(await page.evaluate(() => typeof window.icueEvents), 'undefined');
    await context.close();
    console.log('PASS: manual navigation replaces main document; no iframe or popup; original event handlers are gone');
  }
  {
    const { context, page } = await scenario({ startPage: 'mobile', widgetLayout: 'compact', iCUE_initialized: true, showDiagnostics: true });
    assert.equal(await page.locator('#panel').getAttribute('data-size'), 'compact');
    await page.evaluate(() => { window.widgetLayout = 'wide'; window.icueEvents.onDataUpdated(); });
    assert.equal(await page.locator('#panel').getAttribute('data-size'), 'wide');
    await page.getByRole('button', { name: 'Open YouTube in this widget' }).click();
    await page.locator('#remote').waitFor();
    assert.equal(page.url(), 'https://m.youtube.com/');
    await context.close();
    console.log('PASS: mobile destination and local diagnostic width updates');
  }
  {
    const { context, page } = await scenario({ iCUE_initialized: false });
    assert.equal(page.url(), `${base}/`);
    await page.evaluate(() => window.icueEvents.onICUEInitialized());
    await page.locator('#remote').waitFor();
    assert.equal(page.url(), 'https://www.youtube.com/');
    await context.close();
    console.log('PASS: automatic mode waits for iCUE initialization');
  }
  {
    // Existing installs may still inject the old autoOpen=false setting. It must
    // not prevent the new default behavior when the widget is recreated.
    const { context, page } = await scenario({ autoOpen: false, iCUE_initialized: true });
    await page.locator('#remote').waitFor();
    await page.goto(base);
    await page.locator('#remote').waitFor();
    await context.close();
    console.log('PASS: initialized host and recreated dashboard both reopen without a click, even with legacy autoOpen=false');
  }
  {
    const { context, page } = await scenario({ iCUE_initialized: true, iCUE: { isPreview: true } });
    assert.ok(await page.locator('#open').isDisabled());
    assert.equal(page.url(), `${base}/`);
    await page.evaluate(() => window.icueEvents.onDataUpdated());
    assert.equal(page.url(), `${base}/`);
    await context.close();
    console.log('PASS: preview suppresses navigation, including automatic mode');
  }
  {
    const { context, page } = await scenario({ showDiagnostics: true, iCUE_initialized: true });
    assert.equal(page.url(), `${base}/`);
    await page.evaluate(() => { window.showDiagnostics = false; window.icueEvents.onDataUpdated(); });
    await page.locator('#remote').waitFor();
    await context.close();
    console.log('PASS: explicit diagnostics setting pauses automatic navigation until disabled');
  }
  const manifest = JSON.parse(await readFile(new URL('../prototype/manifest.json', import.meta.url), 'utf8'));
  assert.ok(manifest.permissions.some(p => p.type === 'url' && p.domain === 'googleusercontent.com' && p.port === 443));
  assert.ok(!manifest.permissions.some(p => p.domain === 'any'));
  console.log('PASS: observed googleusercontent.com host family is declared without unrestricted host access');
} finally {
  await browser?.close(); server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
