# iCUE fullscreen and dashboard sizing audit

## Result

No supported widget-side implementation was found for either **fullscreen confined to the existing dashboard widget** or **changing the dashboard slot width after navigating to YouTube** in the public iCUE Widget API 1.9 documentation and Corsair's public examples examined here.

This is a documented-API boundary, not proof that an undisclosed API cannot exist. iCUE's native widget-host implementation was not available for inspection. No fullscreen or width fix is claimed, and no new binary is warranted by these findings.

## Scope and existing evidence

- Import-only installation remains required: one widget, no API key, no companion app.
- User confirms regular video/audio, mouse/touch browsing, permission handling, and automatic reopening on dashboard return work.
- Session reset on dashboard changes is accepted.
- Live playback is explicitly out of scope, per the user. Previous codec notes are historical evidence only.
- Fullscreen must fill the current widget viewport while preserving the video's aspect ratio and other dashboard widgets. Theater mode is not an acceptable substitute.
- The user reports that YouTube's fullscreen button does nothing. The exact native reason remains unconfirmed.

## Investigation performed

Retrieved all **31 widget-related pages** listed by the current [documentation sitemap](https://docs.elgato.com/sitemap.xml), including the specification, permissions, global/device objects, all controls, and all plugin interfaces. Inspected the relevant article contents and compared them with Corsair's public builder references and both public runner repositories.

| Surface examined | Exposed behavior | Consequence |
| --- | --- | --- |
| [Manifest specification](https://docs.elgato.com/icue/widgets/specification) | Metadata, devices, interaction, plugins, modules, permissions | No documented fullscreen-acceptance, persistent script-injection, or dashboard geometry declaration |
| [iCUE global object](https://docs.elgato.com/icue/widgets/references/icue-global-object) and [device object](https://docs.elgato.com/icue/widgets/references/device-object) | Locale, frame limit, preview flag, temperature units, device ID | No native window/view or slot-resizing method |
| [Permissions](https://docs.elgato.com/icue/widgets/references/permissions) | Network, files, audio, capture and other protected resources | No fullscreen permission; `screen` means capture, not acceptance of fullscreen requests |
| [Media provider](https://docs.elgato.com/icue/widgets/references/plugins/media-data-provider) | Metadata and play/pause/next/previous | No browser DOM, fullscreen, or dashboard-size operation |
| [Link provider](https://docs.elgato.com/icue/widgets/references/plugins/link-provider) | Open in the system browser | Does not provide an embedded view with persistent widget controls |
| [Stream Deck provider](https://docs.elgato.com/icue/widgets/references/plugins/stream-deck) | Virtual key-grid operations, including `updateVirtualDeviceSize` | The similarly named method resizes virtual key rows/columns, not an XENEON dashboard slot |
| Remaining providers and common tools | Sensors, FPS, file watching, notifications, device actions, local media presentation | No exposed persistent remote-page or native view control |
| [Responsive layout guidance](https://github.com/Corsair-Labs/icue-widget-builder/blob/4a3cb405997153295a50f288c543616b57bb6036/skills/icue-widget-builder/references/responsive-layout-scaling.md) | CSS tokens, media queries, viewport-aware rendering | Adapts content to a slot already assigned by iCUE; does not change that slot |

### Public runner findings

The [Windows runner](https://github.com/Corsair-Labs/iCUE-widget-runner-windows/tree/65da48593bc207c581bdaad3ca1816e84ffacdb3) is an **independent Electron application**. Its `main.js` creates an Electron BrowserWindow, and `preload.js` exposes `icueWindow` minimize/maximize/close operations for that application. These are not documented native-iCUE widget globals. Installing this runner would introduce another app and would not meet the user's import-only requirement.

Its `runner-v2.js` injects compatibility globals into an iframe shell to simulate widgets. It does not reveal iCUE's QtWebEngine fullscreen policy. The [Raspberry Pi runner](https://github.com/Corsair-Labs/iCUE-widget-runner-RaspberryPi/tree/1c3318533aa201f3d7a1b4b3526b8a2e2ca69630) likewise is a separate runner, not the Windows iCUE host. Neither was installed or used to claim native compatibility.

The [widget-builder snapshot](https://github.com/Corsair-Labs/icue-widget-builder/tree/4a3cb405997153295a50f288c543616b57bb6036) documents known dashboard sizes and responsive CSS strategies. Those known sizes are examples of host-assigned viewports, not a widget-callable size API. Styling the original landing page cannot control YouTube's later document.

## Why ordinary widget JavaScript cannot supply the missing behavior

Main-frame navigation replaces the original page and its event handlers. Existing automated tests confirm that behavior in Chromium. Therefore a fullscreen listener, CSS overlay, button override, or width selector installed only in our landing page cannot act on the subsequently loaded YouTube document.

No public interface examined supplies a persistent per-navigation script hook. Loading YouTube in an iframe would reintroduce its embedding restrictions for normal website browsing. Reverting to the old custom API browser or installing a separate host would change the user's requirements rather than resolve this implementation.

## Concrete host-side changes to request from Corsair

**Fullscreen within a widget:** enable QtWebEngine fullscreen support for the dashboard web view and handle fullscreen requests by accepting them while retaining that web view's assigned dashboard geometry. Do not maximize the iCUE application or move the view to another window. Handle exits and restore ordinary page layout; verify touch, focus, aspect ratio, and isolation from other widgets.

Qt's [fullscreen-request documentation in its 6.9.3 source](https://github.com/qt/qtwebengine/blob/v6.9.3/src/core/api/qwebenginepage.cpp) explicitly separates filling the viewport from making the application/view fullscreen. Its [settings source](https://github.com/qt/qtwebengine/blob/v6.9.3/src/core/web_engine_settings.cpp) defaults `FullScreenSupportEnabled` to false. These explain the available native mechanism; they do not prove iCUE's configured value or identify the actual rejection path.

**Width switching:** provide a supported host-managed dashboard size control accessible while a widget displays a remote document, or a documented widget/host API with lifecycle behavior that survives navigation. It must select supported dashboard layouts and account for space occupied by other widgets. An ordinary CSS `max-width` selector is not this operation.

### Ready-to-send support request

> An imported XENEON EDGE HTML widget can navigate its main view to YouTube. Browsing, regular video/audio, and touch/mouse interaction work, but YouTube's fullscreen button does nothing. We need the video to fill only its existing widget viewport, without changing the dashboard slot or making the iCUE application fullscreen. Does iCUE expose or support enabling QtWebEngine fullscreen and accepting its requests while retaining that view's bounds? If not, can this be added? Separately, is there a supported host-managed width/slot-size control that stays available after remote navigation? The observed browser engine is QtWebEngine 6.9.3 / Chromium 130. We found no such controls in the public Widget API 1.9 documentation. Live-video codec support is not part of this request.

No support message was sent. This note is ready for user review, not an assertion that Corsair has accepted or scheduled changes. The existing working 0.2.4 widget remains the latest build.
