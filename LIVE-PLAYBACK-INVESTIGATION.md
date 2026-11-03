# Live-video playback investigation (historical; out of scope)

The user explicitly dropped live-stream support from the project scope. This file preserves prior findings only. Its investigation steps and codec support request are not active work items.

## User observations

- Version 0.2.3 no longer produces the observed permission prompts on the user's setup.
- Ordinary YouTube videos play with sound; navigation, touch, and mouse work.
- Live content reports **Your browser can't play this video**.
- Reported failing livestream: https://www.youtube.com/watch?v=GotlA1KKWoo . The user confirms that the same stream works in both Edge and Chrome on the same PC. The exact iCUE version remains unavailable; the actual widget report now identifies QtWebEngine 6.9.3 / Chromium 130 and missing advertised H.264/AAC support.

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

The cloud request to the supplied video URL was rejected by the environment's egress proxy with HTTP 403 before reaching YouTube. That is not evidence about the video's availability or format. Its live formats have not been inspected. The normal-browser comparison now succeeds on the same PC, narrowing the failure to iCUE's browser environment or its YouTube playback path. This does not by itself establish a codec cause or rule out iCUE-specific network behavior. The actual iCUE report is now recorded below. Cloud Chromium codec support cannot establish iCUE codec support.

Live playback is out of scope; fullscreen within the widget remains unresolved. No codec compatibility fix is claimed.


## Actual device capability report supplied by the user

Build 0.2.4 reports `QtWebEngine/6.9.3 Chrome/130.0.0.0` on Windows 10-compatible user agent. Media Source Extensions are present.

| MIME/codec | canPlayType | MediaSource.isTypeSupported |
| --- | --- | --- |
| video/mp4, avc1.42E01E (H.264) | unsupported | false |
| video/mp4, avc1.640028 (H.264) | unsupported | false |
| audio/mp4, mp4a.40.2 (AAC) | unsupported | false |
| video/webm, vp8 | probably | true |
| video/webm, vp9 | probably | true |
| audio/webm, opus | probably | true |

This is direct evidence that this iCUE browser does not advertise playback of the tested H.264/AAC formats. It is consistent with proprietary codecs not being included/enabled in the host runtime, but the report alone does not distinguish the exact build/configuration cause. It does not establish the selected/offered formats of the reported livestream.

A livestream requiring the tested H.264/AAC combinations would have no supported playback path in this engine. That is a strong explanation for working WebM-compatible ordinary video alongside failing live content; it is not proof that every livestream uses those formats. Media Source support itself is present.

There is no supported widget-manifest or JavaScript change that installs the missing decoder support. Capability spoofing would mislead YouTube without enabling decoding. Windows codec packs or copied browser DLLs are not established fixes for QtWebEngine's bundled media support. A compatible alternative stream could help only if YouTube actually offers and selects it; no such alternative has been verified for the supplied URL.

### Concrete host-side request

Ask Corsair whether the iCUE dashboard's QtWebEngine build can be supplied with supported H.264/AAC decoding, including Media Source Extensions playback, and whether a supported iCUE release provides it. Supply the table above and the failing livestream URL, noting successful playback in Edge and Chrome on the same PC. No support message has been sent by this agent. There is no evidence yet that an available update resolves the issue.

Until host codec compatibility is available or a compatible live representation is demonstrated, reliable live playback remains blocked under the import-only/no-companion constraint. No new package is warranted by this diagnostic evidence alone.
