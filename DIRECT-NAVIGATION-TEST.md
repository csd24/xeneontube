# Import-only YouTube experiment

**Status: experimental, not a completed replacement.** This tests whether iCUE can host YouTube as its main document. It uses one `.icuewidget` import, without Google Cloud setup, an API key, Node.js, or a companion app on your PC. Node/npm are required only for developers building/testing the package.

## Install and test

1. Download **XeneonTube-Direct-Experimental.icuewidget**. Keep that exact extension. You do not need the old Windows ZIP, launcher, or `.env` file.
2. In iCUE, go to Widgets and use **+ above the available-widget list** to import it. The selector name is **XeneonTube Direct (Experimental)**. Add one instance to the actual XENEON EDGE dashboard. Requires iCUE 5.52+ with Widget API 1.9 support.
3. Approve its declared YouTube/network and speaker permissions. Permissions include YouTube's media, image, Google service, and advertising hosts, but no localhost, file, camera, or microphone access.
4. On the actual dashboard, YouTube opens automatically when the injected host globals identify an actual iCUE widget, even if the initialization callback is not repeated. No Open-button tap is needed, including when a dashboard switch recreates the widget. A preview intentionally stays on diagnostics. Verify that the page stays **inside the same widget**, rather than opening a browser elsewhere.
5. If it loads, search for a video, scroll through results, visit a channel, and play a video. Check touch input, video, audio, and ordinary navigation separately. A loaded home page alone does not establish playback.
6. While YouTube is visible, inspect the available iCUE settings. Try the dashboard's own size controls if offered. The **Diagnostic page width** control applies only to the original diagnostic page; it is not a solution to width toggling on YouTube. Record whether settings reload the original page, affect YouTube, or have no effect.
7. Switch away to another dashboard and return. If iCUE recreates the widget, it should reopen YouTube automatically. This does not promise restoring the same video, playback position, or uninterrupted audio. To inspect diagnostics, enable **Stay on diagnostics instead of opening YouTube** in iCUE settings, then reload/re-add the dashboard instance. Disable that setting for normal automatic startup. Try **YouTube interface: Mobile** if Desktop is unusable in the available space.

Network failures after navigation may replace the page with iCUE/Chromium's error screen. The original widget cannot reliably show a fallback after it has unloaded. If it remains visible, its ten-second message explains that navigation did not complete. Denied or revoked permissions require restoring permission before retrying. YouTube may request additional hosts at runtime.

## Report these results

- iCUE version and whether the package imported.
- Whether the real dashboard showed the diagnostic screen and initialized API.
- After tapping Open: stayed in widget / opened externally / unchanged / blank/error (include exact error).
- Search, scrolling, channel navigation, video, and audio: each works or fails.
- Whether iCUE settings and dashboard sizing still function while YouTube is visible.
- Whether removing/readding restores diagnostics; whether Desktop and Mobile differ.

## Changes in 0.2.4

The user reports the extra Open-button tap still occurs on dashboard return with the previous implementation. A missing/repeated initialization callback is a hypothesis, not a confirmed diagnosis. Old retained instances or an explicitly enabled diagnostics setting can also explain a visible landing page.

The launcher no longer requires initialization to finish before opening YouTube. It recognizes iCUE's injected globals even when the ready flag is false. Startup, page-show (including a restored diagnostic document), visibility-return, and focus all attempt navigation while preserving a guard against duplicate attempts. Previews and the explicit **Stay on diagnostics** setting still suppress automatic opening. No host globals means no automatic navigation in a plain-browser diagnostic test.

The landing page now displays **VERSION 0.2.4** to identify stale builds. Keep **Stay on diagnostics instead of opening YouTube** off for the dashboard-return test. The user subsequently confirms that dashboard return reopens YouTube without the green-button tap. The session is destroyed on dashboard switches; the user explicitly accepts that reset. Restoring the previous video/position is not implemented and is not an active requirement unless requested again.

A read-only media capability report helps investigate [the reported live-playback failure](LIVE-PLAYBACK-INVESTIGATION.md). This is not a live-video or fullscreen fix. It adds no permissions. In Chromium simulations, recreated documents with a false ready flag and no callbacks open automatically; page-show, visibility-return, and focus paths also pass. These simulations do not reproduce every iCUE lifecycle.

## Changes in 0.2.3

Declare the newly observed `csp.withgoogle.com` host on port 443. This is a different host from the image host covered in 0.2.2. Its name is consistent with Google's Content Security Policy reporting; the specific request path or payload was not inspected. The user reports that navigating and playing video continue while the prompt is ignored, so the prompt alone does not establish a playback failure.

The new permission is reviewed during import. If granted and applied by iCUE, it should avoid a separate runtime prompt for this host. It neither silently approves permission nor disables security checks. Only the exact observed host was added, not the entire `withgoogle.com` family or unrestricted networking. Actual prompt suppression remains unverified on hardware. Other, different hosts can still produce their own prompts. Reopening behavior and fullscreen limitations are unchanged.

## Changes in 0.2.2

- Declare `googleusercontent.com` on port 443, covering the observed `yt3.googleusercontent.com` prompt under iCUE's documented subdomain matching. The user still approves the permission during import. This should avoid the extra runtime prompt for that host when granted; enforcement needs a real-iCUE check. The unreadable second screenshot does not establish another hostname, so no guessed or unrestricted-host permission was added.
- Open YouTube by default after native initialization and on recreation of the widget. The old `autoOpen=false` value from earlier versions is no longer consulted. A newly named `showDiagnostics` setting defaults to false; it provides an explicit diagnostic pause.
- Automated tests recreate the document and confirm no tap is required. They do not emulate the actual iCUE dashboard lifecycle. Playback/session restoration after remote-document destruction is not implemented.
- Fullscreen remains unresolved. Theater mode has been rejected as a substitute for filling the widget and is not an acceptance criterion.

## Remaining requirements and completed audit

Live streaming is explicitly out of scope. Automatic reopening and the accepted session reset are confirmed by the user. Fullscreen inside the widget and custom width switching remain unresolved. The [completed host-control audit](HOST-CONTROL-AUDIT.md) found no supported public widget mechanism to implement those controls after remote navigation. No further diagnostic build is being requested for that API gap; the existing 0.2.4 package remains current.

## What is and is not established

**User hardware report:** navigation, video, audio, touch, and mouse input work. Clicking YouTube's fullscreen button does nothing. The 0.2.1 diagnostic page displays the standard browser fullscreen-support flag; it does not fix fullscreen. See [FULLSCREEN-INVESTIGATION.md](FULLSCREEN-INVESTIGATION.md) for the evidence, a Theater-mode workaround to try, and the suspected host-side dependency. Width toggling after navigation remains unverified.

The iCUE CLI validates and packages the widget. Automated Chromium tests use a locally served diagnostic page and a synthetic remote destination to verify manual/automatic main-frame navigation, preview suppression, and settings before navigation. They do not contact YouTube or emulate QtWebEngine/iCUE. This environment's network policy blocks youtube.com, and Windows/iCUE hardware is unavailable here.

Navigation replaces the original document and its scripts in an ordinary browser. This prototype neither injects scripts into YouTube nor bypasses iframe restrictions. There is no demonstrated SDK mechanism to preserve the custom width toggle on the remote site. **Browsing/playback and width switching remain separate acceptance requirements; success on one does not establish the other.**

If native navigation works, next investigate a documented iCUE sizing mechanism that survives navigation. If it fails, capture the exact behavior before changing the approach. A supported in-widget browser/sizing facility from Corsair may be required; a hosted search service is a separate architecture, not part of this import-only test.

## Developer checks

```sh
npm ci
npm run prototype:validate
npm run prototype:package
npm run test:prototype
```

Set `CHROMIUM_PATH` for a non-default Chromium executable. Output: `dist/XeneonTube-Direct-Experimental.icuewidget`. The previous API/companion source is retained for reference and is not a dependency of this prototype.
