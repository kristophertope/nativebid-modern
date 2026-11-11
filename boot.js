(() => {
  const style = document.createElement('style');
  style.textContent = `
html.nbx body > :not(#nbx-root) {
  display: none !important;
}

html.nbx,
html.nbx body {
  margin: 0 !important;
  padding: 0 !important;
  background: #f7f7f5 !important;
}

html.nbx body.modal-open {
  overflow: visible !important;
  padding-right: 0 !important;
}

@media (prefers-color-scheme: dark) {
  html.nbx,
  html.nbx body {
    background: #111113 !important;
  }
}

#nbx-classic-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  padding: 10px 16px;
  border: 0;
  border-radius: 999px;
  background: #18181b;
  color: #fff;
  font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
`;
  document.documentElement.append(style);
  const path = location.pathname;
  const route = path === '/' || /^\/(?:browse(?:\/|$)|search(?:\/|$)|listing\/?$|listing\/details\/|event\/details\/|event\/lotdetails\/|account\/bidding\/(?:watching|active|won|lost)\/?$|account\/invoice\/purchases\/?$|page\/schedule-pick-up\/?$)/i.test(path);
  let off = false;
  try { off = localStorage.getItem('nbx-off') === '1'; } catch {}
  const waiting = [];
  let ready = false;
  const fire = () => {
    if (ready) return;
    ready = true;
    waiting.splice(0).forEach(fn => fn());
  };
  globalThis.nbxBoot = { route, off, ready: fn => (ready ? fn() : waiting.push(fn)) };
  document.addEventListener('DOMContentLoaded', fire, { once: true });
  if (!off && /^\/account(?:\/summary)?\/?$/i.test(path)) location.replace('/Account/Bidding/Active');
  if (route && !off) {
    document.documentElement.classList.add('nbx');
    const pre = document.createElement('link');
    pre.rel = 'preconnect';
    pre.href = 'https://nativebid1.blob.core.windows.net';
    (document.head || document.documentElement).append(pre);
    const hold = el => {
      if (el.hasAttribute('src')) { el.setAttribute('data-nbx-src', el.getAttribute('src')); el.removeAttribute('src'); }
      if (el.hasAttribute('srcset')) { el.setAttribute('data-nbx-srcset', el.getAttribute('srcset')); el.removeAttribute('srcset'); }
    };
    const watch = new MutationObserver(ms => {
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.tagName === 'IMG' || n.tagName === 'SOURCE') hold(n);
        else if (!ready && n.tagName === 'SCRIPT' && n.hasAttribute('src') && document.getElementById('Time')) fire();
      }
    });
    watch.observe(document, { childList: true, subtree: true });
    globalThis.nbxBoot.restore = () => {
      watch.disconnect();
      for (const el of document.querySelectorAll('[data-nbx-src], [data-nbx-srcset]')) {
        if (el.hasAttribute('data-nbx-srcset')) el.setAttribute('srcset', el.getAttribute('data-nbx-srcset'));
        if (el.hasAttribute('data-nbx-src')) el.setAttribute('src', el.getAttribute('data-nbx-src'));
      }
    };
  }
})();
