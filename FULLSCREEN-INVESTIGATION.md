# Fullscreen within the widget

## Observed on the user's iCUE/Edge setup

The user reports that navigation, video playback, audio, touch, and mouse input work. Clicking YouTube's fullscreen button does nothing. The exact iCUE version has not been supplied. This is a user report, not a locally reproduced hardware test.

The desired behavior is to fill the existing widget viewport while leaving its dashboard rectangle and the other widgets unchanged. The player should preserve the video's aspect ratio, with letterboxing where necessary. It should not make the whole Windows application fullscreen.

## Evidence

The documented widget engine is QtWebEngine 6.9.3. Qt's matching source shows:

- [FullScreenSupportEnabled defaults to false](https://github.com/qt/qtwebengine/blob/v6.9.3/src/core/web_engine_settings.cpp). This is Qt's default, not proof of iCUE's actual configured value.
- [QWebEnginePage::fullScreenRequested](https://github.com/qt/qtwebengine/blob/v6.9.3/src/core/api/qwebenginepage.cpp) requires the application to accept or reject the request. Its documentation explicitly says that acceptance fills the viewport, while making the actual view/window fullscreen is up to the application.
- [Qt Quick's request path](https://github.com/qt/qtwebengine/blob/v6.9.3/src/webenginequick/api/qquickwebengineview.cpp) also emits a request for the native host to handle.
- The current [iCUE widget permissions](https://docs.elgato.com/icue/widgets/references/permissions) and [iCUE global object](https://docs.elgato.com/icue/widgets/references/icue-global-object) expose no documented fullscreen control. The `screen` permission is screen capture, not fullscreen; adding it would not be a supported fix.

The nonresponsive button is consistent with host fullscreen support being disabled or the request not being accepted. It does not uniquely identify either condition; a YouTube-side issue is also possible. No native iCUE implementation or log was available to confirm the cause.

## Diagnostic change in 0.2.1

The initial diagnostic page now shows `document.fullscreenEnabled`. It reads the real flag, never patches it or reports a simulated success. Expand **Diagnostics and recovery** before opening YouTube.

- **Disabled or unavailable:** fullscreen cannot be requested through the standard API from this document. The flag alone does not distinguish the host setting from a document policy restriction.
- **Enabled:** fullscreen is advertised for this document, but a specific request can still fail or be declined. This is not evidence of acceptance on the navigated YouTube page.

No fullscreen fix is claimed. After main-frame navigation, the original scripts are gone and cannot restyle YouTube or intercept its player button. Injecting a handler into the initial page would not survive that navigation. No unsupported permission, YouTube source rewrite, or browser security override was added.

## Theater mode is not a solution

The user explicitly reports that Theater mode is not an adequate substitute. It changes YouTube's page layout and does not guarantee filling the widget height. The requirement remains a fullscreen player constrained to the current widget viewport. No fullscreen fix is claimed in 0.2.2.

## Next decision

Collect the exact iCUE version and the diagnostic fullscreen flag. If updating iCUE changes behavior, record the result; no available evidence establishes that a newer version fixes it.

If native fullscreen remains unavailable, ask Corsair whether dashboard widgets can enable fullscreen support and accept requests while retaining the current view bounds. The required host behavior is:

1. Enable QtWebEngine fullscreen support on the dashboard's web view.
2. Accept valid fullscreen requests from that widget's content, including exit requests.
3. Keep the web view at its existing dashboard geometry instead of resizing the app window.
4. Verify that entering/exiting restores the player and browsing page and that other widgets remain unchanged.

This is host-side guidance, not a patch to iCUE or a supported widget-manifest setting. No message has been sent to Corsair. Until a supported host control is identified, a reliable fill-widget implementation has not been established for the direct-navigation architecture.
