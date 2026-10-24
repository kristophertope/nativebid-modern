(() => {
  const path = location.pathname;
  const route = path === '/' || /^\/(?:browse(?:\/|$)|search(?:\/|$)|listing\/?$|listing\/details\/|event\/details\/|event\/lotdetails\/|account\/bidding\/(?:watching|active|won|lost)\/?$|account\/invoice\/purchases\/?$)/i.test(path);
  let off = false;
  try { off = localStorage.getItem('nbx-off') === '1'; } catch {}
  globalThis.nbxBoot = { route, off };
  if (route && !off) document.documentElement.classList.add('nbx');
})();
