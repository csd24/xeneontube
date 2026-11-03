# Live-video playback investigation

## User observations

- Version 0.2.3 no longer produces the observed permission prompts on the user's setup.
- Ordinary YouTube videos play with sound; navigation, touch, and mouse work.
- Live content reports **Your browser can't play this video**.
- Reported failing livestream: https://www.youtube.com/watch?v=GotlA1KKWoo . Exact iCUE version and same-PC Chrome/Edge comparison remain unavailable.

These are user-reported hardware results. The live failure has not been reproduced in the cloud environment.

## Working hypotheses, not confirmed causes

An embedded browser can support one combination of media format, video codec, audio codec, and playback mechanism while rejecting another. Ordinary video playback therefore does not establish compatibility with a particular livestream. H.264/AAC versus WebM/VP9/Opus capability, Media Source support, and YouTube player selection are candidates. DRM is relevant only if the particular stream uses it; livestreaming alone does not establish a DRM requirement. Network failures and stream-specific restrictions also remain possible.

Qt's official [QtWebEngine 6.9.3 feature documentation](https://github.com/qt/qtwebengine/blob/v6.9.3/src/core/doc/src/qtwebengine-features.qdoc), under Audio and Video Codecs, says that MP4 requires the corresponding proprietary codecs to be enabled when Qt is built. Those are build/runtime capabilities of the host, not widget manifest permissions. This documents a possible explanation; it does not identify the codecs offered by the failing stream or the configuration of iCUE's build.

The direct-navigation widget does not fetch, transcode, or select YouTube streams. Its original scripts unload when navigation succeeds. Changing its initial page cannot force the remote YouTube player to use a different codec or install a missing codec in iCUE. No added permission, user-agent spoof, unsafe browser flag, or misleading compatibility shim is a supported codec fix.

## Next useful evidence

1. Identify one failing livestream and the exact iCUE version. Check the same URL in Edge/Chrome on the same PC to distinguish a stream/account/regional problem from an iCUE-specific one.
2. If necessary, collect format support from a controlled diagnostic page on the actual widget engine: `HTMLMediaElement.canPlayType()` and `MediaSource.isTypeSupported()` for relevant H.264/AAC and WebM/VP9/Opus MIME types. Capability reporting is not a playback test. Cloud Chromium's capabilities do not establish those of iCUE.
3. Compare evidence with the formats actually offered/selected for the failing livestream, if available. A generic error alone is insufficient to identify a missing codec.
4. If a host codec limitation is confirmed, establish whether Corsair supplies a supported iCUE update. Do not recommend copying codec DLLs or installing unrelated Windows codec packs as a widget fix.

Version 0.2.4 includes an optional read-only media report on the diagnostic page, alongside a separate dashboard-return fix. It records six common audio/video codec MIME types with their real `canPlayType()` and `MediaSource.isTypeSupported()` results, Media Source availability, and user agent. It makes no media, analytics, or clipboard requests and does not patch browser capability detection. Enable **Stay on diagnostics instead of opening YouTube** before the widget next loads, then expand Diagnostics and recovery to inspect the report. Turn the setting off for normal automatic startup.

The cloud request to the supplied video URL was rejected by the environment's egress proxy with HTTP 403 before reaching YouTube. That is not evidence about the video's availability or format. Its live formats have not been inspected. A normal browser comparison and the actual iCUE report are still needed; cloud Chromium codec support cannot establish iCUE codec support.

Live playback and fullscreen within the widget remain unresolved requirements. No codec compatibility fix is claimed.
