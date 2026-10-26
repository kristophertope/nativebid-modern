(() => {
  const path = location.pathname;
  const route = path === '/' || /^\/(?:browse(?:\/|$)|search(?:\/|$)|listing\/?$|listing\/details\/|event\/details\/|event\/lotdetails\/|account\/bidding\/(?:watching|active|won|lost)\/?$|account\/invoice\/purchases\/?$|page\/schedule-pick-up\/?$)/i.test(path);
  let off = false;
  try { off = localStorage.getItem('nbx-off') === '1'; } catch {}
  globalThis.nbxBoot = { route, off };
  if (!off && /^\/account(?:\/summary)?\/?$/i.test(path)) location.replace('/Account/Bidding/Active');
  if (route && !off) {
    document.documentElement.classList.add('nbx');
    const hold = el => {
      if (el.hasAttribute('src')) { el.setAttribute('data-nbx-src', el.getAttribute('src')); el.removeAttribute('src'); }
      if (el.hasAttribute('srcset')) { el.setAttribute('data-nbx-srcset', el.getAttribute('srcset')); el.removeAttribute('srcset'); }
    };
    const watch = new MutationObserver(ms => {
      for (const m of ms) for (const n of m.addedNodes) if (n.tagName === 'IMG' || n.tagName === 'SOURCE') hold(n);
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
