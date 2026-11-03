# Current direction: import-only experiment

The current goal is one imported iCUE widget with no Google project, API key, or companion app. The direct-navigation prototype is in `prototype/`. Version 0.2.2 opens YouTube automatically when the widget is recreated and declares the observed Google user-content image host at import. Download [XeneonTube-Direct-Experimental.icuewidget](XeneonTube-Direct-Experimental.icuewidget) using GitHub’s Download raw file button. Read [the test instructions](DIRECT-NAVIGATION-TEST.md) and build it with `npm run prototype:package`.

It is **experimental**. The user reports working in-widget navigation, video, sound, touch, and mouse input. YouTube's fullscreen button does nothing. Fullscreen within the widget and custom width controls remain unresolved. See [the fullscreen investigation](FULLSCREEN-INVESTIGATION.md). These hardware results are user-reported, not reproduced in the cloud environment.

The documentation below describes the **previous API/companion implementation**, retained for reference. It is not the installation process for the import-only prototype.

---

# XeneonTube

Browse and watch YouTube on a Corsair XENEON EDGE: search, popular/category feeds, channel navigation, pagination, in-widget playback, and a local Watch Later list. One iCUE widget includes Compact, Medium, Wide, and Automatic width options, available through its Layout menu and native iCUE setting. No Google login or subscription access is implemented.

## Install on your Windows PC

Requires **iCUE 5.52+ with Widget API 1.9.0 support**, an XENEON EDGE, and **Node.js 24.5+**. These packages use the specification supplied from [iCUE's widget documentation](https://docs.elgato.com/icue/widgets/).

1. Copy the XeneonTube folder onto the Windows PC connected to your Edge. Keep `server.js`, `public/`, `package.json`, `.env.example`, and `Start-XeneonTube.cmd` together. The companion has no runtime npm dependencies.
2. Enable **YouTube Data API v3** in a Google Cloud project and create an API key. Restrict it to YouTube Data API v3; optionally restrict by IP if your public outbound IP is stable. This is a server-side key, so browser HTTP-referrer restrictions are inappropriate.
3. Double-click **Start-XeneonTube.cmd**. On first use it creates `.env` from `.env.example` and opens Notepad. Set `YOUTUBE_API_KEY` there, save, and run the launcher again. Never share or commit the key. Keep the companion window open while using the widget.
4. In iCUE, navigate to **Widgets**, click the **+ above the available-widget list**, and select `dist/XeneonTube.icuewidget`. Only one widget import is needed.
5. Review the declared permissions: local companion access, YouTube/media/thumbnail/advertising hosts, and audio output. Add the widget to your Edge dashboard. Set its layout in iCUE settings or in the widget's **Layout** menu.

The widget loads the browsing interface from a companion server on **the same PC**, bound only to `127.0.0.1:4173`. The API key remains in the server process and is never placed in the `.icuewidget` file or sent to its browser. An ordinary HTTP origin also supplies the YouTube iframe with a referrer. No cloud-hosted service or database is required. Do not change `PORT` for native iCUE use: the package's URL and local permission declare port 4173.

The launcher does not install a Windows background service or start automatically at login. Native iCUE import, codec/audio support, player referrer behavior, and touch input require testing on the actual Windows/iCUE/Edge hardware; CLI and Chromium validation alone cannot establish those capabilities.

## Layouts and sizes

| Width setting | Content layout |
| --- | --- |
| Compact | Up to 540 CSS pixels wide, player above a two-column browse grid |
| Medium | Up to 1050 pixels wide, player above browsing |
| Wide | Available width, player beside browsing when the viewport is wide enough |

The native layout setting also offers **Automatic**, which follows the available viewport. All presets adapt down to narrow panels. They change content layout **inside the dashboard slot**; they do not force a physical panel size or invent unsupported manifest dimensions. Choose the available dashboard slot size in iCUE separately. The supplied SDK specification does not document fixed-size declarations.

Settings changes in iCUE reload the companion frame only when layout/instance changes, which stops current playback. In-widget layout changes preserve playback. Each iCUE instance uses its injected `uniqueId` to namespace Watch Later and layout preferences in the companion origin's local storage.

## Develop and package

```sh
npm ci
npm test
npm run widget:validate
npm run widget:package
npm start
```

`npm ci` installs pinned **development** tools (`icuewidget-cli` and `playwright-core`). Running the companion itself requires no dependency installation or build. Packaging uses the documented CLI, not a renamed ZIP file, and produces the single `dist/XeneonTube.icuewidget` file. The source is in `widget/`, with one stable widget ID and all width options in its settings. The package contains no API key or `.env` file.

For a browser-only check, open `http://127.0.0.1:4173` locally. URL presets include `/?size=compact`, `/?size=medium`, and `/?size=wide`. Startup honors inherited HTTP/HTTPS proxy settings. The server needs HTTPS access to `www.googleapis.com`; iCUE needs access to the media domains declared in the manifest. If YouTube uses an additional host, iCUE may request permission at runtime.

With Chromium installed, run `npm run test:browser` (set `CHROMIUM_PATH` to its executable on non-Linux systems). This test owns port 4173, so stop the companion first. It uses mocked API responses and an iframe placeholder, not a real API key or YouTube media. Screenshots are saved under `build/screenshots/`.

## Troubleshooting and YouTube limitations

- **Companion did not respond / connection lost:** start the launcher on the Edge's Windows PC, allow the local network permission, then tap **Reconnect**. The cloud development server cannot serve your PC's loopback address. Revoked permissions and stopped services show the same recovery screen.
- **API key needed / rejected:** set the key in `.env`, enable YouTube Data API v3 for that project, verify its restrictions, and restart the companion. The status indicator confirms only that a key exists; successful search confirms it is usable.
- **Quota exhausted:** wait for Google's daily quota reset or adjust the project's quota. Search API calls are relatively expensive. The server caches for five minutes, coalesces duplicate in-flight requests, and limits upstream requests to 20 per minute. Searches run only on submission.
- **Video unavailable or silent:** some videos prohibit embedding or require age/account/region checks. Search filters for embeddable videos, but playback restrictions may still apply. Autoplay with audio can require another tap. QtWebEngine codec/DRM support and YouTube's referrer checks must be tested in iCUE. Ads, branding, and standard YouTube controls remain intact.
- **Open on YouTube:** the web app provides an external link for restricted videos. Whether iCUE handles that link through the system browser is unverified; native Link Provider integration is not implemented.

This is a custom browser using official API results, not an embedded copy of the navigable youtube.com website. Explore uses US popular videos, with Music, Gaming, and Science & Technology category feeds. Watch Later is device-local and separate from your YouTube account. Storage restrictions in a host can prevent persistence.

## Free API quota

No paid service or billing integration is used. YouTube Data API normally provides 10,000 free quota units per project per day; confirm your actual allocation in Google Cloud. `search.list` costs 100 units per request (including each next-results page). Popular/category requests cost 1 unit. Channel browsing uses `channels.list` plus `playlistItems.list`: normally 2 units for an initial load and 1 for each subsequent page while the channel lookup is cached. Cached results need no API call. Embedded video watching does not consume Data API quota.

Around 100 uncached search requests/pages can consume the usual daily quota. Reaching the quota makes browsing requests fail; this application does not purchase additional quota or trigger usage charges. Google's daily quota resets at midnight Pacific time. Your own key/project quota is separate from other users' keys. Standard internet/data-plan charges, if any, still come from your internet provider.

## Validation boundaries

Service tests exercise HTTP serving, missing-key behavior, search parameters, pagination, category/channel endpoints, input validation, origin protection, caching, and quota errors with mocked YouTube responses. Browser checks exercise browsing, player iframe selection, saving, responsive layouts, the HTTP-served widget wrapper simulation, injected setting updates, instance isolation, and reconnect behavior with simulated data. The CLI validates and packages the single widget. The managed Chromium policy blocks file-scheme navigation, so wrapper tests use local HTTP; iCUE custom-origin behavior remains untested. Real API requests, real YouTube audio/video, Windows launcher execution, and iCUE hardware behavior remain unverified until tested on your PC with your key.
