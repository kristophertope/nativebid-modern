(() => {
  const path = location.pathname;
  const route = path === '/' || /^\/(?:browse(?:\/|$)|search(?:\/|$)|listing\/?$|listing\/details\/|event\/details\/|event\/lotdetails\/|account\/bidding\/(?:watching|active|won|lost)\/?$|account\/invoice\/purchases\/?$|page\/schedule-pick-up\/?$)/i.test(path);
  let off = false;
  try { off = localStorage.getItem('nbx-off') === '1'; } catch {}
  globalThis.nbxBoot = { route, off };
  if (!off && /^\/account(?:\/summary)?\/?$/i.test(path)) location.replace('/Account/Bidding/Active');
  if (route && !off) document.documentElement.classList.add('nbx');
})();
