(() => {
  const origin = 'http://127.0.0.1:4173';
  const frame = document.getElementById('app');
  const connection = document.getElementById('connection');
  const message = document.getElementById('message');
  let activeUrl = '';
  let timeout;
  let lastHeartbeat = 0;

  function settings() {
    // iCUE may expose properties as lexical globals rather than window properties.
    const layout = typeof widgetLayout !== 'undefined' ? widgetLayout : 'auto';
    const instance = typeof uniqueId !== 'undefined' ? String(uniqueId) : 'default';
    return { layout: ['auto', 'compact', 'medium', 'wide'].includes(layout) ? layout : 'auto', instance };
  }
  function connect(force = false) {
    const { layout, instance } = settings();
    const url = new URL('/', origin);
    url.searchParams.set('size', layout);
    url.searchParams.set('instance', instance);
    url.searchParams.set('host', 'icue');
    if (!force && url.href === activeUrl) return;
    activeUrl = url.href;
    connection.hidden = false;
    message.textContent = 'Connecting to the companion service…';
    lastHeartbeat = 0;
    clearTimeout(timeout);
    frame.src = activeUrl;
    timeout = setTimeout(() => {
      message.textContent = 'The companion service did not respond. Check that it is running and that iCUE network permission is allowed.';
    }, 8000);
  }
  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== frame.contentWindow || event.data?.type !== 'xeneontube:ready') return;
    clearTimeout(timeout);
    lastHeartbeat = Date.now();
    connection.hidden = true;
  });
  setInterval(() => {
    if (lastHeartbeat && Date.now() - lastHeartbeat > 16000) {
      connection.hidden = false;
      message.textContent = 'The companion service connection was lost. Restart it, restore the local network permission, then reconnect.';
    }
  }, 5000);
  document.getElementById('retry').addEventListener('click', () => connect(true));
  window.icueEvents = { onICUEInitialized: () => connect(), onDataUpdated: () => connect() };
  connect();
})();
