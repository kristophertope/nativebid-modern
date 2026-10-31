(() => {
  if (!document.documentElement.classList.contains('nbx')) return;
  const mirror = () => {
    const $ = window.jQuery;
    const server = window.rwx_serverDateTime;
    const synced = window.rwx_lastSyncTimeStamp;
    if (!$ || !server || !synced) return;
    for (const el of document.querySelectorAll('[data-action-time]')) {
      const ms = +$(el).data('actionMilliseconds') || new Date($(el).data('actionTime')).getTime();
      if (!ms) continue;
      const end = String(Math.round(ms - server.getTime() + synced));
      if (el.getAttribute('data-nbx-end') !== end) el.setAttribute('data-nbx-end', end);
    }
  };
  mirror();
  setInterval(mirror, 250);
})();
