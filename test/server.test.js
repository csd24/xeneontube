import test from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import { createApp } from '../server.js';

async function serve(t, options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}`;
}
const item = { id: { videoId: 'abcdefghijk' }, snippet: { title: 'A video', channelId: 'UCabcdefghijklmnopqrstuv', channelTitle: 'Channel', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' } } } };
test('serves the app and reports missing API setup without making upstream requests', async t => {
  const base = await serve(t, { apiKey: '', fetcher: () => assert.fail('Unexpected API call') });
  assert.equal((await fetch(base)).status, 200);
  assert.match(await (await fetch(base)).text(), /Search YouTube/);
  assert.deepEqual(await (await fetch(`${base}/api/status`)).json(), { configured: false });
  assert.equal((await fetch(`${base}/api/videos`)).status, 503);
  assert.equal((await fetch(`${base}/.env`)).status, 404);
});
test('search requests embeddable videos, normalizes results, caches, and paginates', async t => {
  const calls = [];
  const base = await serve(t, { apiKey: 'test-only-key', fetcher: async url => { calls.push(new URL(url)); return Response.json({ items: [item], nextPageToken: 'page2' }); } });
  const data = await (await fetch(`${base}/api/videos?q=cats`)).json();
  assert.equal(data.items[0].id, 'abcdefghijk'); assert.equal(data.nextPage, 'page2');
  assert.equal(calls[0].pathname, '/youtube/v3/search'); assert.equal(calls[0].searchParams.get('videoEmbeddable'), 'true');
  assert.equal(calls[0].searchParams.get('q'), 'cats');
  await fetch(`${base}/api/videos?q=cats`); assert.equal(calls.length, 1);
  await fetch(`${base}/api/videos?q=cats&page=page2`); assert.equal(calls[1].searchParams.get('pageToken'), 'page2');
  assert.ok(!JSON.stringify(data).includes('test-only-key'));
});
test('category browsing and channel navigation use appropriate endpoints', async t => {
  const calls = [];
  const base = await serve(t, { apiKey: 'test', fetcher: async url => {
    const target = new URL(url); calls.push(target);
    if (target.pathname.endsWith('/channels')) return Response.json({ items: [{ contentDetails: { relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' } } }] });
    if (target.pathname.endsWith('/playlistItems')) return Response.json({ items: [{ ...item, id: 'playlist-item-id', contentDetails: { videoId: 'abcdefghijk' } }], nextPageToken: 'next' });
    return Response.json({ items: [{ ...item, id: 'abcdefghijk' }] });
  } });
  await fetch(`${base}/api/videos?category=20`);
  assert.equal(calls[0].pathname, '/youtube/v3/videos'); assert.equal(calls[0].searchParams.get('videoCategoryId'), '20');
  const data = await (await fetch(`${base}/api/videos?channel=UCabcdefghijklmnopqrstuv`)).json();
  assert.equal(calls[1].pathname, '/youtube/v3/channels'); assert.equal(calls[1].searchParams.get('id'), 'UCabcdefghijklmnopqrstuv');
  assert.equal(calls[2].pathname, '/youtube/v3/playlistItems'); assert.equal(calls[2].searchParams.get('playlistId'), 'UUabcdefghijklmnopqrstuv');
  assert.equal(data.items[0].id, 'abcdefghijk');
  await fetch(`${base}/api/videos?channel=UCabcdefghijklmnopqrstuv&page=next`);
  assert.equal(calls.length, 4); assert.equal(calls[3].searchParams.get('pageToken'), 'next');
});
test('rejects invalid input and cross-origin API access', async t => {
  const base = await serve(t, { apiKey: 'test', fetcher: () => assert.fail('Unexpected API call') });
  for (const query of ['channel=invalid', 'category=99', 'page=%3Cscript%3E', `q=${'a'.repeat(201)}`]) assert.equal((await fetch(`${base}/api/videos?${query}`)).status, 400);
  assert.equal((await fetch(`${base}/api/videos`, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  const hostStatus = await new Promise((resolve, reject) => {
    get(`${base}/api/videos`, { headers: { Host: 'untrusted.example' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
  });
  assert.equal(hostStatus, 403);
});
test('quota failures are actionable and credentials are not returned', async t => {
  const base = await serve(t, { apiKey: 'secret-test-key', fetcher: async () => Response.json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, { status: 403 }) });
  const response = await fetch(`${base}/api/videos`); assert.equal(response.status, 502);
  const text = await response.text(); assert.match(text, /quota exhausted/); assert.ok(!text.includes('secret-test-key'));
});
