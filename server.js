import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const publicRoot = new URL('./public/', import.meta.url);
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
const videoId = /^[\w-]{11}$/;
const channelId = /^UC[\w-]{22}$/;
const categories = new Set(['', '10', '20', '28']);

export function createApp({ apiKey = process.env.YOUTUBE_API_KEY, fetcher = fetch } = {}) {
  const cache = new Map();
  const pending = new Map();
  const calls = [];
  async function youtube(path, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    for (const [key, value] of Object.entries(params)) if (value !== '') url.searchParams.set(key, value);
    const cacheKey = url.href;
    const cached = cache.get(cacheKey);
    if (cached && cached.until > Date.now()) return cached.data;
    if (pending.has(cacheKey)) return pending.get(cacheKey);
    const task = (async () => {
      while (calls.length && calls[0] < Date.now() - 60_000) calls.shift();
      if (calls.length >= 20) throw Object.assign(new Error('Too many requests. Please wait a minute.'), { status: 429 });
      calls.push(Date.now());
      url.searchParams.set('key', apiKey);
      const response = await fetcher(url, { signal: AbortSignal.timeout(12_000) });
      const data = await response.json();
      if (!response.ok) {
        const reason = data.error?.errors?.[0]?.reason;
        throw Object.assign(new Error(reason === 'quotaExceeded' ? 'YouTube API quota exhausted. Try again after the daily reset.' : 'YouTube rejected the request. Check the server API key and API restrictions.'), { status: 502 });
      }
      if (cache.size >= 200) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, { until: Date.now() + 300_000, data });
      return data;
    })();
    pending.set(cacheKey, task);
    try { return await task; } finally { pending.delete(cacheKey); }
  }
  return http.createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    try {
      const requestHost = new URL(`http://${req.headers.host || 'invalid'}`).hostname;
      if (!['127.0.0.1', 'localhost'].includes(requestHost)) return send(403, { error: 'Only local hostnames are allowed.' });
      const url = new URL(req.url, 'http://localhost');
      // Local API keys must not be usable by arbitrary browser origins.
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'Cross-origin requests are disabled.' });
      if (req.method !== 'GET') return send(405, { error: 'Method not allowed.' });
      if (url.pathname === '/api/status') return send(200, { configured: Boolean(apiKey) });
      if (url.pathname === '/api/videos') {
        if (!apiKey) return send(503, { error: 'Add YOUTUBE_API_KEY to .env and restart the server to browse YouTube.' });
        const q = (url.searchParams.get('q') || '').trim();
        const channel = url.searchParams.get('channel') || '';
        const category = url.searchParams.get('category') || '';
        const pageToken = url.searchParams.get('page') || '';
        if (q.length > 200 || !categories.has(category) || (channel && !channelId.test(channel)) || pageToken.length > 512 || !/^[\w=-]*$/.test(pageToken)) return send(400, { error: 'Invalid browsing parameters.' });
        const params = { part: 'snippet', maxResults: '12', pageToken };
        let data;
        if (q) {
          data = await youtube('search', { ...params, type: 'video', q, channelId: channel, order: channel && !q ? 'date' : 'relevance', videoEmbeddable: 'true', videoSyndicated: 'true' });
        } else if (channel) {
          // channels.list + playlistItems.list each cost 1 unit, versus 100 for
          // search.list. Cache the uploads playlist lookup across pages.
          const details = await youtube('channels', { part: 'contentDetails', id: channel });
          const playlistId = details.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
          if (!playlistId) return send(404, { error: 'This channel has no available uploads playlist.' });
          data = await youtube('playlistItems', { ...params, part: 'snippet,contentDetails', playlistId });
        } else {
          data = await youtube('videos', { ...params, chart: 'mostPopular', regionCode: 'US', videoCategoryId: category });
        }
        const items = (data.items || []).map(item => ({ id: item.contentDetails?.videoId || item.snippet.resourceId?.videoId || (typeof item.id === 'string' ? item.id : item.id.videoId), title: item.snippet.title, channelId: item.snippet.channelId, channelTitle: item.snippet.channelTitle, thumbnail: item.snippet.thumbnails?.medium?.url || '', publishedAt: item.snippet.publishedAt })).filter(item => videoId.test(item.id));
        return send(200, { items, nextPage: data.nextPageToken || null });
      }
      const file = files[url.pathname];
      if (!file) return send(404, { error: 'Not found.' });
      const body = await readFile(new URL(file[0], publicRoot));
      res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://i.ytimg.com; frame-src https://www.youtube.com; connect-src 'self'; base-uri 'none'; object-src 'none'" });
      res.end(body);
    } catch (error) {
      send(error.status || 502, { error: error.status ? error.message : 'Cannot reach YouTube. Check network access and try again.' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  createApp().listen(port, '127.0.0.1', () => console.log(`XeneonTube listening on port ${port}`));
}
