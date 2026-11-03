(() => {
  const $ = id => document.getElementById(id);
  let initialized = false;
  let launching = false;
  let fallback;
  function isPreview() { return typeof iCUE !== 'undefined' && iCUE.isPreview === true; }
  function diagnosticsRequested() { return typeof showDiagnostics !== 'undefined' && showDiagnostics === true; }
  function hostDetected() {
    return initialized || typeof iCUE !== 'undefined' || typeof iCUE_initialized !== 'undefined';
  }
  function maybeOpen() {
    // iCUE can restore/recreate the document without sending initialization again.
    // Its injected globals identify the host even while the ready flag is false.
    if (hostDetected() && !diagnosticsRequested()) open();
  }
  function destination() {
    return typeof startPage !== 'undefined' && startPage === 'mobile' ? 'https://m.youtube.com/' : 'https://www.youtube.com/';
  }
  function update() {
    const size = typeof widgetLayout !== 'undefined' ? widgetLayout : 'auto';
    $('panel').dataset.size = ['auto', 'compact', 'medium', 'wide'].includes(size) ? size : 'auto';
    $('api').textContent = initialized ? 'Initialized' : 'Not initialized (manual navigation is available)';
    $('destination').textContent = destination();
    $('viewport').textContent = `${innerWidth} × ${innerHeight} CSS pixels`;
    $('fullscreen').textContent = document.fullscreenEnabled === true ? 'Enabled for this document; host acceptance still required' : 'Disabled or unavailable for this document';
    $('open').disabled = isPreview();
    if (isPreview()) $('status').textContent = 'Preview stays on diagnostics. Test on the real dashboard instance.';
  }
  function open() {
    if (isPreview() || launching) return;
    launching = true;
    $('attempt').textContent = new Date().toISOString();
    $('status').textContent = 'Requesting navigation in the same view…';
    clearTimeout(fallback);
    fallback = setTimeout(() => {
      launching = false;
      $('status').textContent = 'This page is still active. Navigation may have been blocked or stalled. Check iCUE network permissions and retry.';
    }, 10000);
    try {
      // Main-frame navigation, deliberately not an iframe, popup, or system-browser plugin.
      // No script injection into YouTube, header spoofing, or browser-security overrides.
      window.location.assign(destination());
    } catch {
      clearTimeout(fallback);
      launching = false;
      $('status').textContent = 'Navigation was rejected. Check iCUE permissions and retry.';
    }
  }
  $('open').addEventListener('click', open);
  window.addEventListener('resize', update);
  window.addEventListener('pageshow', event => {
    // A restored diagnostic document may still remember its previous launch.
    if (event.persisted) { launching = false; clearTimeout(fallback); }
    maybeOpen();
  });
  window.addEventListener('focus', maybeOpen);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') maybeOpen();
  });
  window.icueEvents = {
    onICUEInitialized() {
      initialized = true;
      update();
      maybeOpen();
    },
    onDataUpdated() { update(); maybeOpen(); },
  };
  update();
  const video = document.createElement('video');
  const audio = document.createElement('audio');
  const formats = [
    'video/mp4; codecs="avc1.42E01E"',
    'video/mp4; codecs="avc1.640028"',
    'audio/mp4; codecs="mp4a.40.2"',
    'video/webm; codecs="vp8"',
    'video/webm; codecs="vp9"',
    'audio/webm; codecs="opus"',
  ];
  const report = {
    build: '0.2.4', userAgent: navigator.userAgent,
    mediaSourceAvailable: typeof MediaSource !== 'undefined',
    formats: formats.map(type => {
      let mediaSource = 'unavailable';
      try { if (typeof MediaSource !== 'undefined' && typeof MediaSource.isTypeSupported === 'function') mediaSource = MediaSource.isTypeSupported(type); } catch { mediaSource = 'error'; }
      return { type, canPlayType: (type.startsWith('audio/') ? audio : video).canPlayType(type) || 'unsupported', mediaSource };
    }),
  };
  $('media-report').value = JSON.stringify(report, null, 2);
  if (typeof iCUE_initialized !== 'undefined' && iCUE_initialized) window.icueEvents.onICUEInitialized();
  else maybeOpen();
})();
