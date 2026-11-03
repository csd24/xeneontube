(() => {
  const $ = id => document.getElementById(id);
  let initialized = false;
  let launching = false;
  let fallback;
  function isPreview() { return typeof iCUE !== 'undefined' && iCUE.isPreview === true; }
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
  window.icueEvents = {
    onICUEInitialized() {
      initialized = true;
      update();
      if (typeof autoOpen !== 'undefined' && autoOpen === true) open();
    },
    onDataUpdated: update,
  };
  update();
  if (typeof iCUE_initialized !== 'undefined' && iCUE_initialized) window.icueEvents.onICUEInitialized();
})();
