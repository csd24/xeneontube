# Import-only YouTube experiment

**Status: experimental, not a completed replacement.** This tests whether iCUE can host YouTube as its main document. It uses one `.icuewidget` import, without Google Cloud setup, an API key, Node.js, or a companion app on your PC. Node/npm are required only for developers building/testing the package.

## Install and test

1. Download **XeneonTube-Direct-Experimental.icuewidget**. Keep that exact extension. You do not need the old Windows ZIP, launcher, or `.env` file.
2. In iCUE, go to Widgets and use **+ above the available-widget list** to import it. The selector name is **XeneonTube Direct (Experimental)**. Add one instance to the actual XENEON EDGE dashboard. Requires iCUE 5.52+ with Widget API 1.9 support.
3. Approve its declared YouTube/network and speaker permissions. Permissions include YouTube's media, image, Google service, and advertising hosts, but no localhost, file, camera, or microphone access.
4. On the actual dashboard, tap **Open YouTube in this widget**. A preview intentionally stays on diagnostics. The first question is whether YouTube replaces that page **inside the same widget**, rather than opening a browser elsewhere.
5. If it loads, search for a video, scroll through results, visit a channel, and play a video. Check touch input, video, audio, and ordinary navigation separately. A loaded home page alone does not establish playback.
6. While YouTube is visible, inspect the available iCUE settings. Try the dashboard's own size controls if offered. The **Diagnostic page width** control applies only to the original diagnostic page; it is not a solution to width toggling on YouTube. Record whether settings reload the original page, affect YouTube, or have no effect.
7. Remove the dashboard instance and add it again. If necessary, remove/reimport the experimental widget to restore diagnostics. Try **YouTube interface: Mobile** if Desktop is unusable in the available space. Optionally enable **Open automatically after iCUE initializes** to test reopening behavior; disable it for diagnostics.

Network failures after navigation may replace the page with iCUE/Chromium's error screen. The original widget cannot reliably show a fallback after it has unloaded. If it remains visible, its ten-second message explains that navigation did not complete. Denied or revoked permissions require restoring permission before retrying. YouTube may request additional hosts at runtime.

## Report these results

- iCUE version and whether the package imported.
- Whether the real dashboard showed the diagnostic screen and initialized API.
- After tapping Open: stayed in widget / opened externally / unchanged / blank/error (include exact error).
- Search, scrolling, channel navigation, video, and audio: each works or fails.
- Whether iCUE settings and dashboard sizing still function while YouTube is visible.
- Whether removing/readding restores diagnostics; whether Desktop and Mobile differ.

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
