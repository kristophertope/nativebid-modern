(globalThis.nbxBoot?.ready || (fn => fn()))(() => {
  const boot = globalThis.nbxBoot || {};
  const html = document.documentElement;

  if (!html.classList.contains('nbx')) {
    if (boot.route && boot.off) {
      const b = document.createElement('button');
      b.id = 'nbx-classic-toggle';
      b.textContent = 'Modern view';
      b.onclick = () => { try { localStorage.removeItem('nbx-off'); } catch {} location.reload(); };
      document.body.append(b);
    }
    return;
  }

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const text = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const abs = (href, base = location.href) => { try { return href ? new URL(href, base).href : ''; } catch { return ''; } };
  const hidden = el => !el || !!el.closest('.awe-hidden, [style*="display: none"], [style*="display:none"]');
  const num = v => parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  const uniqBy = (list, key) => { const seen = new Set(); return list.filter(x => !seen.has(key(x)) && seen.add(key(x))); };
  const bidsLabel = n => (n ? `${n} bid${n === '1' ? '' : 's'}` : '');

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false || kid === '') continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  }

  function svg(path) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2.2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path);
    s.append(p);
    return s;
  }

  function img(src, fallback, props = {}) {
    return h('img', {
      src,
      alt: '',
      loading: 'lazy',
      decoding: 'async',
      ...props,
      onerror: e => { if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback; },
    });
  }

  function cardImg(src, thumb) {
    const el = img(src, thumb, { class: 'ph' });
    if (thumb && thumb !== src) el.style.backgroundImage = `url("${thumb}")`;
    el.addEventListener('load', () => { el.classList.remove('ph'); el.style.backgroundImage = ''; }, { once: true });
    return el;
  }

  const srcOf = el => el && (el.getAttribute('data-nbx-src') || el.getAttribute('src'));
  const medium = src => (src || '').replace(/_(thumbfit|thumbcrop|largesize)\.(jpe?g|png|webp)/i, '_fullsize.$2');
  const large = src => (src || '').replace(/_(thumbfit|thumbcrop|fullsize)\.(jpe?g|png|webp)/i, '_largesize.$2');

  function money(v) {
    const n = num(v);
    if (isNaN(n)) return '';
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }

  function splitTitle(raw) {
    let msrp = '';
    let title = raw.replace(/^Lot\s+\S+\s*-\s*/i, '').replace(/^DSM-\s*/, '');
    title = title.replace(/[\s,\-–]*\bM(?:SR|RS)P\s*:?\s*\$?\s*([\d,]+(?:\.\d+)?)?\s*$/i, (_, v) => { if (v) msrp = money(v); return ''; });
    return { title: title.trim() || raw, msrp };
  }

  const parseDttm = s => {
    const m = /(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+):(\d+)/.exec(s || '');
    return m ? new Date(+m[3], m[1] - 1, +m[2], +m[4], +m[5], +m[6]).getTime() : NaN;
  };

  function clockFor(doc) {
    const serverNow = parseDttm($('#Time', doc)?.getAttribute('data-initial-dttm'));
    const localNow = Date.now();
    return s => {
      const t = parseDttm(s);
      if (isNaN(t)) return NaN;
      return isNaN(serverNow) ? t : localNow + (t - serverNow);
    };
  }

  const docClock = clockFor(document);
  const endOf = (el, clock) => (el ? +el.getAttribute('data-nbx-end') || clock(el.getAttribute('data-action-time')) : NaN);

  const fmtDate = ms => (isNaN(ms) ? '' : new Date(ms).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));

  const parseCats = (sel, keep) => uniqBy($$(sel)
    .map(a => ({
      name: text($('.category-name__container', a) || a),
      count: num(text($('.badge', a))) || 0,
      href: abs(a.getAttribute('href')),
    }))
    .filter(c => c.href && !c.href.endsWith('#') && keep(c)), c => c.href);

  function remaining(ms) {
    if (ms <= 0) return 'Ended';
    const s = Math.ceil(ms / 1000);
    const d = Math.floor(s / 86400), hr = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d) return `${d}d ${hr}h left`;
    if (hr) return `${hr}h ${m}m left`;
    if (m) return `${m}m ${sec}s left`;
    return `${sec}s left`;
  }

  let everySecond = () => {};
  const host = h('div', { id: 'nbx-root' });
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(h('style', null, globalThis.NBX_CSS || ''));

  const sniperKey = 'nbx-sniper-bot';
  const sniperBot = () => { try { return localStorage.getItem(sniperKey) || ''; } catch { return ''; } };

  const extendedLots = new Map();
  const closedLots = new Set();
  const checking = new Map();

  const filters = (() => {
    const key = 'nbx-filters';
    const subs = new Set();
    let list = [];
    let re = null;
    const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
    function set(next, persist = true) {
      list = [...new Set(next.map(norm).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      re = list.length ? new RegExp(`(?<![a-z0-9])(?:${list.map(esc).join('|')})s?(?![a-z0-9])`, 'i') : null;
      if (persist) try { localStorage.setItem(key, JSON.stringify(list)); } catch {}
      subs.forEach(fn => fn());
    }
    function load() {
      let saved = [];
      try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
      set(Array.isArray(saved) ? saved : [], false);
    }
    load();
    addEventListener('storage', e => { if (e.key === key) load(); });
    addEventListener('pageshow', e => { if (e.persisted) load(); });
    return {
      get list() { return list; },
      add: s => set([...list, s]),
      remove: s => set(list.filter(x => x !== s)),
      test: s => !!re && re.test(s),
      on: fn => subs.add(fn),
    };
  })();

  function onScreen(el) {
    const card = el.closest('.card');
    if (!card) return true;
    const r = card.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  }

  async function verify(lid, el) {
    const now = Date.now();
    if ((checking.get(lid) || 0) > now || checking.size >= 4 && !checking.has(lid) || !onScreen(el)) return;
    checking.set(lid, Infinity);
    try {
      const res = await fetch('/RealTime/GetTimeRemaining', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: +lid }),
      });
      if (!res.ok) throw new Error(res.status);
      const ms = (+(await res.json()).secondsRemaining || 0) * 1000;
      if (ms > 1000) extendedLots.set(lid, Date.now() + ms);
      else closedLots.add(lid);
      checking.delete(lid);
    } catch {
      checking.set(lid, Date.now() + 5000);
    }
    everySecond();
    tick();
  }

  function tick() {
    const now = Date.now();
    for (const el of shadow.querySelectorAll('[data-deadline]')) {
      const lid = el.dataset.lid;
      if (lid && extendedLots.get(lid) > +el.dataset.deadline) el.dataset.deadline = extendedLots.get(lid);
      const left = +el.dataset.deadline - now;
      const done = left <= 0 && (!lid || closedLots.has(lid));
      if (left <= 0 && !done) verify(lid, el);
      const label = left > 0 ? remaining(left) : done ? 'Ended' : 'Ending…';
      el.classList.toggle('soon', !done && left < 5 * 60 * 1000);
      el.closest('.card')?.classList.toggle('ended', done);
      if (el.textContent !== label) el.textContent = label;
    }
  }

  function header() {
    const cats = parseCats('.browse-categories a[href], .categories--vertical a[href]', c => c.count > 0 || /all categories/i.test(c.name));

    const user = uniqBy($$('.user-nav a[href]')
      .filter(a => !a.closest('.visible-xs') && !/^#|^javascript/i.test(a.getAttribute('href')) && !/\/browse$/i.test(a.getAttribute('href')))
      .map(a => ({ label: text(a), href: abs(a.getAttribute('href')) }))
      .filter(l => l.label && !/^\/account(\/summary)?\/?$/i.test(new URL(l.href).pathname)), l => l.href);
    const signOut = user.filter(l => /\/account\/logoff/i.test(l.href));
    const userLinks = user.filter(l => !signOut.includes(l));
    const accountSection = $$('.myaccount__menu .nav-section-container').find(c => /^account$/i.test(text($('.nav-section-label', c))));
    const accountLinks = accountSection
      ? $$('a[href]', accountSection).map(a => ({ label: text(a), href: abs(a.getAttribute('href')) }))
      : signOut.length > 0
        ? [['Details', '/Account/AccountSettings'], ['Addresses', '/Account/AddressManagement'], ['Credit Cards', '/Account/StripeCardManagement'], ['Password', '/Account/ChangePassword']].map(([label, href]) => ({ label, href: abs(href) }))
        : [];
    if (accountLinks.length > 0 && !accountLinks.some(l => /\/page\/schedule-pick-up/i.test(l.href))) accountLinks.push({ label: 'Pick-up', href: abs('/page/schedule-pick-up') });
    const links = list => list.map(l => h('a', { href: l.href }, l.label));

    const q = new URL(location.href).searchParams.get('FullTextQuery') || '';
    const menu = (label, links) => h('details', { class: 'menu' },
      h('summary', null, label),
      h('div', { class: 'menu-panel' }, links));

    const userNav = [links(userLinks), accountLinks.length > 0 && menu('Account', links(accountLinks)), links(signOut)];

    const bar = h('header', { class: 'top' },
      h('div', { class: 'bar' },
        h('a', { class: 'logo', href: '/' }, 'Native', h('span', null, 'Bid')),
        h('form', { class: 'search', action: '/Browse', method: 'get' },
          h('input', { type: 'search', name: 'FullTextQuery', value: q, placeholder: 'Search all lots', 'aria-label': 'Search' })),
        h('nav', { class: 'nav' },
          h('a', { href: '/' }, 'Auctions'),
          cats.length ? menu('Browse', cats.map(c => h('a', { href: c.href }, c.name, c.count ? h('small', null, c.count.toLocaleString()) : null))) : h('a', { href: '/Browse' }, 'Browse'),
          userNav),
        h('details', { class: 'menu mobile-menu' },
          h('summary', { 'aria-label': 'Menu' }, svg('M4 7h16M4 12h16M4 17h16')),
          h('div', { class: 'menu-panel' },
            h('a', { href: '/' }, 'Auctions'),
            h('a', { href: '/Browse' }, 'All lots'),
            cats.filter(c => !/all categories/i.test(c.name)).map(c => h('a', { href: c.href }, c.name, c.count ? h('small', null, c.count.toLocaleString()) : null)),
            userLinks.length > 0 && h('hr'),
            links(userLinks),
            accountLinks.length > 0 && h('hr'),
            links(accountLinks),
            signOut.length > 0 && h('hr'),
            links(signOut)))));

    shadow.addEventListener('click', e => {
      for (const d of shadow.querySelectorAll('details.menu[open]')) if (!d.contains(e.target)) d.open = false;
    });
    return bar;
  }

  function parseListings(doc, base) {
    const clock = docClock;
    return $$('section[data-listingid]', doc).map(s => {
      const a = $('h2.title a', s) || $('a[href*="/LotDetails/"], a[href*="/Listing/Details/"]', s);
      if (!a) return null;
      const raw = text(a);
      const { title, msrp } = splitTitle(raw);
      const thumb = abs(srcOf($('.img-container img', s)), base);
      const endedLabel = $('.awe-rt-ShowOnEnd.status-type', s);
      const deadline = endOf($('[data-epoch="ending"]', s), clock);
      return {
        id: s.getAttribute('data-listingid'),
        href: abs(a.getAttribute('href'), base),
        title,
        msrp,
        lot: (/^Lot\s+(\S+)/i.exec(raw) || [])[1] || '',
        subtitle: text($('h3.subtitle', s)),
        thumb,
        image: medium(thumb),
        price: text($('.awe-rt-CurrentPrice.price .NumberPart', s) || $('.awe-rt-CurrentPrice .NumberPart', s)),
        bids: text($('.awe-rt-AcceptedListingActionCount', s)),
        type: text($('.status-type.label-primary', s)),
        sold: !hidden($('.sold', s)),
        deadline,
        ended: (endedLabel && !endedLabel.classList.contains('awe-hidden')) || (!isNaN(deadline) && deadline <= Date.now()),
      };
    }).filter(Boolean);
  }

  function listingCard(it) {
    const bids = bidsLabel(it.bids);
    return h('a', { class: 'card' + (it.ended ? ' ended' : ''), href: it.href },
      h('div', { class: 'well' },
        cardImg(it.image, it.thumb),
        isNaN(it.deadline)
          ? (it.ended ? h('span', { class: 'pill-time' }, it.sold ? 'Sold' : 'Ended') : null)
          : h('span', { class: 'pill-time', 'data-deadline': it.deadline, 'data-lid': it.id })),
      h('div', { class: 'price-row' },
        h('span', { class: 'price' }, money(it.price)),
        bids && h('span', { class: 'muted' }, bids)),
      h('div', { class: 'title' }, it.title),
      it.subtitle && h('div', { class: 'muted' }, it.subtitle),
      h('div', { class: 'chips' },
        it.msrp && h('span', { class: 'chip strong' }, `MSRP ${it.msrp}`),
        it.lot && h('span', { class: 'chip' }, `Lot ${it.lot}`),
        it.type && it.type !== 'Auction' && h('span', { class: 'chip' }, it.type)));
  }

  function skeletonCard() {
    return h('div', { class: 'card skel' },
      h('div', { class: 'well' }),
      h('div', { class: 'line short' }),
      h('div', { class: 'line' }));
  }

  function speculate() {
    if (!HTMLScriptElement.supports?.('speculationrules')) return;
    const safe = /^\/(?:$|browse|search|event\/details\/|event\/lotdetails\/|listing\/details\/)/i;
    let urls = [];
    let rules = null;
    let timer = 0;
    const target = e => {
      const a = e.target.closest?.('a[href]');
      if (!a) return '';
      const u = new URL(a.href, location.href);
      u.hash = '';
      return u.origin === location.origin && safe.test(u.pathname) && u.href !== location.href.split('#')[0] ? u.href : '';
    };
    const go = url => {
      if (!url || urls.includes(url)) return;
      urls = [url, ...urls].slice(0, 2);
      const el = h('script', { type: 'speculationrules' }, JSON.stringify({ prerender: [{ source: 'list', urls }] }));
      rules?.remove();
      (document.head || document.documentElement).append(el);
      rules = el;
    };
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem('nbx-recent-results') || '[]'); } catch {}
    const here = location.href.split('#')[0];
    const warm = [abs('/Browse'), ...recent].filter((u, i, a) => typeof u === 'string' && u !== here && a.indexOf(u) === i).slice(0, 2);
    if (warm.length) (document.head || document.documentElement).append(h('script', { type: 'speculationrules' }, JSON.stringify({ prerender: [{ source: 'list', urls: warm, eagerness: 'immediate' }] })));
    shadow.addEventListener('pointerover', e => {
      clearTimeout(timer);
      const url = target(e);
      if (url) timer = setTimeout(() => go(url), 150);
    });
    shadow.addEventListener('pointerout', () => clearTimeout(timer));
    shadow.addEventListener('pointerdown', e => go(target(e)));
  }

  function nextPage(doc, base) {
    const last = $$('.pagination li', doc).pop();
    if (!last || last.classList.contains('disabled')) return '';
    const a = $('a[href]', last);
    return a && /»|next/i.test(text(a)) ? abs(a.getAttribute('href'), base) : '';
  }

  function feed({ container, parse, render, firstDoc, empty, keep = () => true, hide, placeholder }) {
    const key = 'nbx:feed:' + location.href;
    const records = [];
    const byId = new Map();
    const loaded = [];
    const inflight = new Map();
    const status = h('div', { class: 'feed-status' });
    const sentinel = h('div');
    const skeletons = placeholder && h('div', { class: container.className + ' skeletons', 'aria-hidden': 'true' }, Array.from({ length: 8 }, placeholder));
    let hiddenCount = 0;
    let next = '';
    let busy = false;
    let restoring = false;
    let speed = 0;
    let lastY = scrollY;
    let lastT = performance.now();
    try { history.scrollRestoration = 'manual'; } catch {}

    const canonical = url => {
      const u = new URL(url, location.href);
      u.hash = '';
      u.searchParams.sort();
      return u.href;
    };
    const pageAfter = (url, k) => {
      const u = new URL(url);
      const n = +u.searchParams.get('page');
      if (!n) return '';
      u.searchParams.set('page', n + k);
      return canonical(u.href);
    };
    const depth = () => (speed > 2.5 ? 3 : 2);
    const same = (a, b) => Object.keys(b).every(k => (k === 'deadline' ? (isNaN(a[k]) && isNaN(b[k])) || Math.abs(a[k] - b[k]) < 5000 : a[k] === b[k]));
    const near = () => sentinel.getBoundingClientRect().top < innerHeight * 4 + speed * 1500;

    function build(rec, eager) {
      if (!rec.el) {
        rec.el = render(rec.item);
        rec.el.dataset.feedId = rec.item.id;
        if (eager) for (const im of rec.el.querySelectorAll('img')) { im.loading = 'eager'; im.fetchPriority = 'low'; }
      }
      return rec.el;
    }

    function addItems(entries, eager) {
      for (const { item, page } of entries) {
        if (byId.has(item.id)) continue;
        const rec = { item, el: null, page };
        records.push(rec);
        byId.set(item.id, rec);
        if (hide?.(item)) hiddenCount++;
        else container.append(build(rec, eager));
      }
      tick();
    }

    function add(doc, base, eager) {
      const items = parse(doc, base);
      const kept = items.filter(keep);
      const page = canonical(base);
      addItems(kept.map(item => ({ item, page })), eager);
      const n = kept.length < items.length ? '' : nextPage(doc, base);
      next = n && canonical(n);
      if (!next) stopAll();
    }

    function refilter() {
      let prev = null;
      hiddenCount = 0;
      for (const rec of records) {
        const off = hide(rec.item);
        if (off) hiddenCount++;
        else if (!rec.el) {
          build(rec, true);
          if (prev) prev.after(rec.el);
          else container.prepend(rec.el);
        }
        if (rec.el) {
          rec.el.classList.toggle('hidden', off);
          prev = rec.el;
        }
      }
      setStatus();
      tick();
    }

    function fetchPage(url) {
      let entry = inflight.get(url);
      if (!entry) {
        const ctrl = new AbortController();
        const p = fetch(url, { credentials: 'include', signal: ctrl.signal }).then(res => {
          if (!res.ok) throw new Error(res.status);
          return res.text();
        });
        entry = { p, ctrl };
        inflight.set(url, entry);
        p.catch(() => { if (inflight.get(url) === entry) inflight.delete(url); });
      }
      return entry.p;
    }

    function stopAll() {
      for (const { ctrl } of inflight.values()) ctrl.abort();
      inflight.clear();
    }

    function prefetch() {
      if (!next || restoring) return;
      fetchPage(next);
      for (let k = 1; k < depth(); k++) {
        const u = pageAfter(next, k);
        if (u) fetchPage(u);
      }
    }

    function snapshot() {
      const top = shadowTop();
      const anchor = Array.from(container.children).find(el => el.getBoundingClientRect().bottom > top);
      const state = { y: scrollY, next, pages: loaded, items: records.map(r => ({ page: r.page, item: r.item })) };
      if (anchor) Object.assign(state, { anchor: anchor.dataset.feedId, offset: anchor.getBoundingClientRect().top });
      return state;
    }

    function save() {
      if (restoring) return;
      try { sessionStorage.setItem(key, JSON.stringify(snapshot())); } catch {}
    }

    function shadowTop() {
      return container.getRootNode().querySelector('.top')?.getBoundingClientRect().bottom || 0;
    }

    function jump(state) {
      const el = state.anchor && byId.get(state.anchor)?.el;
      if (el && el.isConnected) scrollBy(0, el.getBoundingClientRect().top - state.offset);
      else scrollTo(0, state.y || 0);
    }

    function setStatus() {
      const note = hiddenCount ? ` ${hiddenCount} lot${hiddenCount === 1 ? '' : 's'} hidden by filters.` : '';
      skeletons?.classList.toggle('hidden', !next);
      status.replaceChildren(busy ? (skeletons ? '' : 'Loading more…') : next ? '' : (records.length > hiddenCount ? 'You’ve reached the end.' : empty) + note);
    }

    async function more() {
      if (busy || !next) return;
      busy = true;
      setStatus();
      const url = next;
      try {
        const html = await fetchPage(url);
        inflight.delete(url);
        add(new DOMParser().parseFromString(html, 'text/html'), url, true);
        loaded.push(url);
      } catch (e) {
        busy = false;
        if (e?.name === 'AbortError') { setStatus(); return; }
        status.replaceChildren('Couldn’t load more lots.', h('button', { class: 'btn', onclick: more }, 'Retry'));
        return;
      }
      busy = false;
      setStatus();
      save();
      prefetch();
      if (near()) more();
    }

    function refreshAll() {
      const top = shadowTop();
      const pages = [canonical(location.href), ...loaded.filter(u => u !== canonical(location.href))];
      const first = records.find(r => r.el?.isConnected && !r.el.classList.contains('hidden') && r.el.getBoundingClientRect().bottom > top);
      const at = Math.max(0, pages.indexOf(first?.page));
      refresh(pages.map((u, i) => [Math.abs(i - at) + (i < at ? 0.5 : 0), u]).sort((a, b) => a[0] - b[0]).map(x => x[1]));
    }

    async function refresh(pages) {
      for (const url of pages) {
        let doc;
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) continue;
          doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        } catch { continue; }
        let prev = null;
        for (const item of parse(doc, url).filter(keep)) {
          let rec = byId.get(item.id);
          if (!rec) {
            const at = prev ? records.indexOf(prev) + 1 : records.findIndex(r => r.page === url);
            if (at < 0) continue;
            rec = { item, el: null, page: url };
            records.splice(at, 0, rec);
            byId.set(item.id, rec);
            prev = rec;
            if (hide?.(item)) { hiddenCount++; continue; }
            const before = records.slice(0, at).reverse().find(r => r.el)?.el;
            if (before) before.after(build(rec, true));
            else container.prepend(build(rec, true));
            continue;
          }
          prev = rec;
          if (same(rec.item, item)) continue;
          rec.item = item;
          if (!rec.el) continue;
          const old = rec.el;
          rec.el = null;
          build(rec, false).classList.toggle('hidden', old.classList.contains('hidden'));
          old.replaceWith(rec.el);
        }
        tick();
      }
      setStatus();
      save();
    }

    if (hide) filters.on(refilter);
    add(firstDoc, location.href, true);
    $$('img', container).slice(0, 8).forEach(el => { el.fetchPriority = 'high'; });

    const nav = performance.getEntriesByType('navigation')[0];
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(key) || 'null', (k, v) => (k === 'deadline' && v === null ? NaN : v)); } catch {}
    if (saved && nav?.type === 'back_forward' && saved.items?.[0]?.item) {
      restoring = true;
      addItems(saved.items, false);
      next = saved.next || '';
      loaded.push(...(saved.pages || []));
      setStatus();
      const finish = () => {
        restoring = false;
        prefetch();
        setTimeout(refreshAll, 1500);
      };
      if (typeof GestureEvent !== 'undefined') {
        const started = performance.now();
        let touched = false;
        let calm = 0;
        let first = true;
        const stop = () => { touched = true; };
        const inputs = ['touchstart', 'wheel', 'keydown', 'pointerdown'];
        inputs.forEach(ev => addEventListener(ev, stop, { passive: true }));
        const hold = () => {
          const el = saved.anchor && byId.get(saved.anchor)?.el;
          const drift = el?.isConnected && el.getClientRects().length ? el.getBoundingClientRect().top - saved.offset : 0;
          const y = scrollY;
          if (!touched && (first || Math.abs(drift) > 1)) jump(saved);
          calm = scrollY === y && !first ? calm + 1 : 0;
          first = false;
          const settled = document.readyState === 'complete' && calm > 30;
          if (!touched && !settled && performance.now() - started < 3000) return requestAnimationFrame(hold);
          inputs.forEach(ev => removeEventListener(ev, stop));
          finish();
        };
        requestAnimationFrame(hold);
      } else {
        requestAnimationFrame(() => {
          jump(saved);
          requestAnimationFrame(() => {
            jump(saved);
            finish();
          });
        });
      }
    } else {
      try { sessionStorage.removeItem(key); } catch {}
      setStatus();
      if (document.prerendering) {
        document.addEventListener('prerenderingchange', () => {
          prefetch();
          if (performance.getEntriesByType('navigation')[0]?.activationStart > 15000) refreshAll();
        }, { once: true });
      } else prefetch();
    }

    let t;
    let frame = 0;
    addEventListener('scroll', () => {
      const now = performance.now();
      speed = speed * 0.6 + (Math.abs(scrollY - lastY) / Math.max(16, now - lastT)) * 0.4;
      lastY = scrollY;
      lastT = now;
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; prefetch(); if (near()) more(); });
      clearTimeout(t);
      t = setTimeout(() => { speed = 0; save(); }, 200);
    }, { passive: true });
    addEventListener('pagehide', () => { save(); stopAll(); });
    addEventListener('pageshow', e => {
      if (!e.persisted) return;
      tick();
      prefetch();
      if (near()) more();
      refreshAll();
    });
    new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) more(); }, { rootMargin: `0px 0px ${innerHeight * 4}px 0px` }).observe(sentinel);

    return [sentinel, skeletons, status];
  }

  function filterControl() {
    const input = h('input', { type: 'text', placeholder: 'Hide lots containing…', 'aria-label': 'Add filter', autocomplete: 'off', enterkeyhint: 'done' });
    const list = h('ul', { class: 'filter-list' });
    const count = h('span', { class: 'filter-count' });
    const dialog = h('dialog', { class: 'filters', 'aria-label': 'Filters', onclick: e => { if (e.target === dialog) dialog.close(); } },
      h('div', { class: 'filter-box' },
        h('form', { class: 'filter-add', onsubmit: e => { e.preventDefault(); filters.add(input.value); input.value = ''; } },
          input,
          h('button', { class: 'btn primary', type: 'submit' }, 'Add')),
        list,
        h('div', { class: 'filter-foot' },
          h('button', { class: 'btn', type: 'button', onclick: () => dialog.close() }, 'Done'))));

    function sync() {
      count.textContent = filters.list.length || '';
      list.replaceChildren(...(filters.list.length
        ? filters.list.map(f => h('li', null,
          h('span', null, f),
          h('button', { type: 'button', class: 'filter-del', 'aria-label': `Remove ${f}`, onclick: () => { filters.remove(f); input.focus(); } }, svg('M6 6l12 12M18 6L6 18'))))
        : [h('li', { class: 'filter-empty muted' }, 'Lots with a filtered word or phrase in the title are hidden.')]));
    }
    sync();
    filters.on(sync);

    return [
      h('button', { type: 'button', class: 'filter-btn', onclick: () => { dialog.showModal(); input.focus(); } }, svg('M3 5h18l-7 8v6l-4 2v-8z'), 'Filters', count),
      dialog,
    ];
  }

  function resultsPage() {
    const url = new URL(location.href);
    const remember = () => {
      try {
        const here = location.href.split('#')[0];
        const recent = JSON.parse(localStorage.getItem('nbx-recent-results') || '[]').filter(u => u !== here);
        localStorage.setItem('nbx-recent-results', JSON.stringify([here, ...recent].slice(0, 3)));
      } catch {}
    };
    if (document.prerendering) document.addEventListener('prerenderingchange', remember, { once: true });
    else remember();
    const q = url.searchParams.get('FullTextQuery');
    const eventH1 = $('h1.event-title');
    const crumb = text($$('.breadcrumb li').pop());
    const title = q ? `“${q}”` : eventH1 ? text(eventH1.childNodes[0]) || text(eventH1) : crumb && !/^home$/i.test(crumb) ? crumb.replace(/^Refine Search\s*/i, '') : 'All lots';
    const eventStatus = eventH1 ? text($('.label', eventH1)) : '';
    const lede = eventH1 ? text($('.EventToggleWrapper p')) : '';

    const tools = h('div', { class: 'tools' }, filterControl());
    const statusVal = $('#StatusFilter')?.value;
    const goWith = (k, v) => { url.searchParams.set(k, v); url.searchParams.delete('page'); location.href = url.href; };
    if (statusVal != null) {
      const completed = statusVal === 'completed_only';
      tools.append(h('div', { class: 'seg' },
        h('button', { class: completed ? '' : 'on', onclick: () => completed && goWith('StatusFilter', 'active_only') }, 'Active'),
        h('button', { class: completed ? 'on' : '', onclick: () => !completed && goWith('StatusFilter', 'completed_only') }, 'Completed')));
    }
    const sortSel = $('#SortFilterOptions');
    if (sortSel) {
      tools.append(h('select', {
        'aria-label': 'Sort',
        onchange: e => goWith('SortFilterOptions', e.target.value),
      }, $$('option', sortSel).map(o => h('option', { value: o.value, selected: o.selected }, text(o)))));
    }

    const grid = h('div', { class: 'grid' });
    return h('main', { class: 'page' },
      h('div', { class: 'head' },
        h('div', null,
          h('h1', null, title),
          (eventStatus || lede) && h('div', { class: 'lede' }, [eventStatus, lede].filter(Boolean).join(' · '))),
        tools),
      grid,
      feed({ container: grid, parse: parseListings, render: listingCard, firstDoc: document, empty: 'No lots found.', hide: it => filters.test(it.title), placeholder: skeletonCard }));
  }

  function parseEvents(doc, base) {
    const clock = docClock;
    return $$('.event-hp', doc).map(ev => {
      const a = $('.event-row__title a', ev) || $('a[href*="/Event/Details/"]', ev);
      if (!a) return null;
      const visible = sel => $$(sel, ev).find(el => !el.classList.contains('awe-hidden'));
      const timed = $('[data-action-time]', ev);
      const dated = $('[data-initial-dttm]', ev);
      const thumb = abs(srcOf($('.event-row__img img', ev)), base);
      return {
        id: ev.getAttribute('data-eventid') || a.getAttribute('href'),
        href: abs(a.getAttribute('href'), base),
        title: text(a),
        summary: text($('.event-row__summary', ev)),
        thumb,
        image: medium(thumb),
        status: text(visible('.event-row__status > div')),
        closed: !!visible('.event-row__status--closed'),
        label: text(visible('.event-row__time-label > div')),
        deadline: timed ? clock(timed.getAttribute('data-action-time')) : NaN,
        date: dated ? fmtDate(clock(dated.getAttribute('data-initial-dttm'))) : '',
      };
    }).filter(Boolean);
  }

  function eventCard(ev) {
    return h('article', { class: 'event' },
      h('a', { class: 'well', href: ev.href }, cardImg(ev.image, ev.thumb)),
      h('div', { class: 'event-body' },
        h('div', { class: 'status-line' },
          ev.status && h('span', { class: 'status' }, ev.status),
          !isNaN(ev.deadline) ? h('span', { class: 'clock', 'data-deadline': ev.deadline }) : (ev.label || ev.date) && h('span', { class: 'muted' }, [ev.label, ev.date].filter(Boolean).join(' '))),
        h('a', { href: ev.href }, h('h2', null, ev.title)),
        ev.summary && h('div', { class: 'muted' }, ev.summary),
        h('a', { class: 'view-lots', href: ev.href }, 'View all lots →')));
  }

  function homePage() {
    const viewFilter = href => (new URL(href).searchParams.get('ViewFilter') || 'Current').toLowerCase();
    const filter = viewFilter(location.href);
    const filterLinks = $$('.eFilter.hidden-xs a[href]');
    const tabs = uniqBy((filterLinks.length ? filterLinks : $$('.eFilter a[href]'))
      .map(a => ({ href: abs(a.getAttribute('href')), label: text(a).replace(/\s*auctions$/i, '').toLowerCase().replace(/^\w/, c => c.toUpperCase()) })), t => t.href);
    const cats = parseCats('.categories--vertical a[href]', c => c.count > 0);

    const list = h('div', { class: 'events' });
    return h('main', { class: 'page' },
      h('div', { class: 'head' },
        h('h1', null, 'Auctions'),
        tabs.length > 0 && h('div', { class: 'seg' }, tabs.map(t => h('a', { href: t.href, class: viewFilter(t.href) === filter ? 'on' : '' }, t.label)))),
      cats.length > 0 && h('div', { class: 'cats' },
        h('a', { href: '/Browse' }, 'All lots'),
        cats.map(c => h('a', { href: c.href }, c.name, h('small', null, c.count.toLocaleString())))),
      list,
      feed({ container: list, parse: parseEvents, render: eventCard, firstDoc: document, empty: 'No auctions here right now.', keep: ev => filter === 'closed' || !ev.closed }));
  }

  function parseBid(s, clock, base) {
    const a = $$('a[href*="/LotDetails/"], a[href*="/Listing/Details/"]', s).find(x => text(x));
    if (!a) return null;
    const raw = text(a);
    const { title, msrp } = splitTitle(raw);
    const thumb = abs(srcOf($('.img-container img, img', s)), base);
    const deadline = endOf($('[data-epoch="ending"]', s), clock);
    const ended = $$('.awe-rt-ShowOnEnd', s).some(el => !el.classList.contains('awe-hidden')) || closedLots.has(s.getAttribute('data-listingid'));
    const statusEl = $('.InlineContextualStatus', s);
    const priceEl = $('.awe-rt-CurrentPrice', s);
    let status = hidden(statusEl) ? '' : text(statusEl);
    if (!status && priceEl) {
      status = priceEl.classList.contains('not-winning') ? 'Outbid'
        : priceEl.classList.contains('winning-reserve') ? 'Reserve not met'
        : priceEl.classList.contains('winning') ? (ended ? 'Won' : 'Winning') : '';
    }
    status = status.toLowerCase() === 'not winning' ? 'Outbid' : status.toLowerCase().replace(/^\w/, c => c.toUpperCase());
    const unwatch = /\/Account\/RemoveWatch\/\d+/i.exec($$('[href*="RemoveWatch"], [onclick*="RemoveWatch"]', s).map(el => el.getAttribute('href') || el.getAttribute('onclick')).join(' '));
    return {
      id: s.getAttribute('data-listingid'),
      href: abs(a.getAttribute('href'), base),
      title,
      msrp,
      lot: (/^Lot\s+(\S+)/i.exec(raw) || [])[1] || '',
      thumb,
      image: medium(thumb),
      price: text($('.NumberPart', priceEl || s)),
      max: text($('.awe-rt-MaxBid .NumberPart', s)),
      min: text($('.Bidding_Listing_MinPrice .NumberPart', s)),
      status,
      tone: /outbid|lost|not won|reserve not met/i.test(status) ? 'losing' : /winning|won/i.test(status) ? 'winning' : '',
      deadline,
      ended,
      link: unwatch ? { href: abs(unwatch[0], base), label: 'Stop watching' } : null,
    };
  }

  function parsePurchase(row, base) {
    const a = $$('a[href*="/LotDetails/"], a[href*="/Listing/Details/"]', row).find(x => text(x));
    if (!a) return null;
    const raw = text(a);
    const { title, msrp } = splitTitle(raw);
    const thumb = abs(srcOf($('img', row)), base);
    const listingId = (/\/Listing\/Details\/(\d+)/i.exec($('a[href*="/Listing/Details/"]', row)?.getAttribute('href') || '') || [])[1];
    const sold = /(\d+\/\d+\/\d+)\s+(\d+:\d+)(?::\d+)?\s*(AM|PM)?/i.exec(text(a.closest('p')).replace(raw, ''));
    const amounts = $$(':scope > .row .row > div', row).map(text).filter(t => /\$/.test(t));
    const invoice = $('a[href*="/Account/Invoice/"]', row);
    const page = location.pathname.toLowerCase();
    return {
      id: $('input[name="LineItemIDs"]', row)?.value || listingId || a.getAttribute('href'),
      href: abs(a.getAttribute('href'), base),
      title,
      msrp,
      lot: (/^Lot\s+(\S+)/i.exec(raw) || [])[1] || '',
      thumb,
      image: medium(thumb),
      price: amounts.pop() || '',
      status: page.endsWith('/won') ? 'Won' : page.endsWith('/lost') ? 'Not won' : '',
      tone: page.endsWith('/won') ? 'winning' : '',
      when: sold ? [sold[1], sold[2], sold[3]].filter(Boolean).join(' ') : '',
      link: invoice ? { href: abs(invoice.getAttribute('href'), base), label: text(invoice) || 'Invoice' } : null,
      deadline: NaN,
      ended: true,
    };
  }

  function bidCard(it) {
    const card = bidTile(it);
    return it.link
      ? h('div', { class: 'card-wrap' }, card, h('a', { class: 'link', href: it.link.href }, it.link.label))
      : card;
  }

  function bidTile(it) {
    return h('a', { class: 'card', href: it.href },
      h('div', { class: 'well' },
        cardImg(it.image, it.thumb),
        it.status && h('span', { class: `pill-status ${it.tone}` }, it.status),
        it.ended || isNaN(it.deadline) ? null : h('span', { class: 'pill-time', 'data-deadline': it.deadline, 'data-lid': it.id })),
      h('div', { class: 'price-row' },
        h('span', { class: 'price' }, money(it.price)),
        it.max && h('span', { class: 'muted' }, `Your max ${money(it.max)}`),
        it.when && h('span', { class: 'muted' }, it.when)),
      it.tone !== 'winning' && !it.ended && it.min && h('div', { class: 'muted' }, `Next bid ${money(it.min)}`),
      h('div', { class: 'title' }, it.title),
      h('div', { class: 'chips' },
        it.msrp && h('span', { class: 'chip strong' }, `MSRP ${it.msrp}`),
        it.lot && h('span', { class: 'chip' }, `Lot ${it.lot}`)));
  }

  function accountTabs() {
    const section = $$('.myaccount__menu .nav-section-container').find(c => /bidding/i.test(text($('.nav-section-label', c))));
    const tabs = section ? $$('a[href]', section).map(a => ({ label: text(a), href: abs(a.getAttribute('href')), on: !!a.closest('li.active') })) : [];
    if (!tabs.length) return null;
    const seg = h('div', { class: 'seg' }, tabs.map(t => h('a', { href: t.href, class: t.on ? 'on' : '' }, t.label)));
    requestAnimationFrame(() => {
      const on = $('.on', seg);
      if (on) seg.scrollLeft = on.offsetLeft + on.offsetWidth / 2 - seg.clientWidth / 2;
    });
    return h('div', { class: 'head' }, seg);
  }

  function parseInvoice(row, base) {
    const a = $('a[href*="/Account/Invoice/"]', row);
    if (!a) return null;
    const cols = $$(':scope > .row > div', row);
    const label = $('.label', row);
    return {
      id: text(a),
      href: abs(a.getAttribute('href'), base),
      date: text(cols[0]),
      seller: text(cols[2]),
      status: text(label),
      tone: label?.classList.contains('label-success') ? 'winning' : label && /danger|warning/.test(label.className) ? 'losing' : '',
      total: (/\$[\d,]+(?:\.\d+)?/.exec(text(cols[3])) || [])[0] || '',
    };
  }

  function invoiceRow(it) {
    return h('a', { class: 'inv', href: it.href },
      h('div', null,
        h('div', { class: 'inv-id' }, `Invoice #${it.id}`),
        h('div', { class: 'muted' }, [it.date, it.seller].filter(Boolean).join(' · '))),
      it.status && h('span', { class: `pill ${it.tone}` }, it.status),
      h('span', { class: 'price' }, money(it.total)));
  }

  function invoicesPage() {
    const url = new URL(location.href);
    const cur = `${url.searchParams.get('sort') || 'CreatedDTTM'}:${(url.searchParams.get('descending') || 'True').toLowerCase()}`;
    const sorts = [['CreatedDTTM:true', 'Newest first'], ['CreatedDTTM:false', 'Oldest first'], ['Total:true', 'Total, highest'], ['Total:false', 'Total, lowest']];
    const sort = h('select', {
      'aria-label': 'Sort',
      onchange: e => {
        const [k, d] = e.target.value.split(':');
        url.searchParams.set('sort', k);
        url.searchParams.set('descending', d === 'true' ? 'True' : 'False');
        url.searchParams.delete('page');
        location.href = url.href;
      },
    }, sorts.map(([v, l]) => h('option', { value: v, selected: v === cur }, l)));

    const list = h('div', { class: 'inv-list' });
    return h('main', { class: 'page' },
      h('div', { class: 'head' }, h('h1', null, 'My bids'), h('div', { class: 'tools' }, sort)),
      accountTabs(),
      list,
      feed({ container: list, parse: (doc, base) => $$('.myaccount .list', doc).map(r => parseInvoice(r, base)).filter(Boolean), render: invoiceRow, firstDoc: document, empty: 'No invoices yet.' }));
  }

  function bidsPage() {
    const tools = h('div', { class: 'tools' });
    for (const [id, label] of [['ViewFilterOption', 'View'], ['SortFilterOptions', 'Sort']]) {
      const sel = $('#' + id);
      if (!sel?.form) continue;
      tools.append(h('select', {
        'aria-label': label,
        onchange: e => { sel.value = e.target.value; sel.form.submit(); },
      }, $$('option', sel).map(o => h('option', { value: o.value, selected: o.selected }, text(o)))));
    }

    const cards = new Map();
    const render = it => {
      const el = bidCard(it);
      if (it.live) cards.set(it.id, { el, json: JSON.stringify(it) });
      return el;
    };
    const parse = (doc, base) => $$('.myaccount [data-listingid], .myaccount .list', doc)
      .map(s => {
        if (!s.hasAttribute('data-listingid')) return parsePurchase(s, base);
        const it = parseBid(s, docClock, base);
        if (it) it.live = doc === document;
        return it;
      })
      .filter(Boolean);

    everySecond = () => {
      for (const s of $$('.myaccount [data-listingid]')) {
        const c = cards.get(s.getAttribute('data-listingid'));
        const it = c && parseBid(s, docClock, location.href);
        if (!it) continue;
        it.live = true;
        const json = JSON.stringify(it);
        if (json === c.json) continue;
        const el = bidCard(it);
        c.el.replaceWith(el);
        Object.assign(c, { el, json });
      }
    };

    const grid = h('div', { class: 'grid' });
    return h('main', { class: 'page' },
      h('div', { class: 'head' },
        h('h1', null, 'My bids'),
        tools),
      accountTabs(),
      grid,
      feed({ container: grid, parse, render, firstDoc: document, empty: 'Nothing here yet.' }));
  }

  function gallery(images) {
    const n = images.length;
    let cur = 0;
    const track = h('div', { class: 'track' }, images.map((im, i) => h('div', { class: 'slide' }, img(im.full, im.thumb, { loading: i < 2 ? 'eager' : 'lazy' }))));
    const counter = h('div', { class: 'counter' });
    const prev = h('button', { class: 'arrow prev', 'aria-label': 'Previous photo', onclick: () => go(cur - 1) }, svg('M15 18l-6-6 6-6'));
    const next = h('button', { class: 'arrow next', 'aria-label': 'Next photo', onclick: () => go(cur + 1) }, svg('M9 18l6-6-6-6'));
    const thumbs = h('div', { class: 'thumbs' }, images.map((im, i) => h('button', {
      class: 'thumb',
      'aria-label': `Photo ${i + 1}`,
      onmouseenter: () => go(i),
      onfocus: () => go(i),
      onclick: () => go(i),
    }, img(im.thumb, im.full))));

    function go(i) {
      i = Math.max(0, Math.min(n - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
      if (i !== cur) { cur = i; mark(); }
    }
    function mark() {
      Array.from(thumbs.children).forEach((t, i) => t.classList.toggle('on', i === cur));
      const t = thumbs.children[cur];
      if (t) {
        const tr = t.getBoundingClientRect(), cr = thumbs.getBoundingClientRect();
        if (tr.left < cr.left) thumbs.scrollBy({ left: tr.left - cr.left - 8, behavior: 'smooth' });
        else if (tr.right > cr.right) thumbs.scrollBy({ left: tr.right - cr.right + 8, behavior: 'smooth' });
      }
      counter.textContent = `${cur + 1} / ${n}`;
      prev.disabled = cur === 0;
      next.disabled = cur === n - 1;
    }
    let raf;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i !== cur) { cur = i; mark(); }
      });
    }, { passive: true });
    addEventListener('keydown', e => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.composedPath()[0];
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowLeft') { go(cur - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); }
    });
    mark();

    return h('div', { class: 'gallery' },
      h('div', { class: 'stage' }, track, n > 1 && [prev, next, counter]),
      n > 1 && thumbs);
  }

  function detailPage() {
    const clock = docClock;
    const box = $('.awe-rt-BuyBox') || document;
    const rawTitle = text($('h3.detail__title'));
    const { title, msrp } = splitTitle(rawTitle);
    const lotText = text($('.detail__next-prev-lot > span'));
    const listingId = $('#ListingID')?.value;
    const listingType = $('#ListingType')?.value || 'Auction';

    const thumbImgs = $$('#ListingImageThumbsCarousel img');
    const images = thumbImgs.length
      ? thumbImgs.map(t => {
        const li = t.closest('li');
        const full = abs($('a[data-lightbox]', li)?.getAttribute('href') || t.getAttribute('data-full-size-src') || srcOf(t));
        return { full: large(full), thumb: abs(srcOf(t)) };
      })
      : $('#previewimg') ? [{ full: large(abs(srcOf($('#previewimg')))), thumb: abs(srcOf($('#previewimg'))) }] : [];

    const read = () => {
      const maxEl = $('.detail__biddermax');
      const submit = $('#SubmitBid');
      const deadline = endOf($('[data-epoch="ending"]', box), clock);
      return {
        price: text($('.detail__price .awe-rt-CurrentPrice .NumberPart', box) || $('.closed-details .NumberPart') || $('.awe-rt-CurrentPrice .NumberPart')),
        sold: !hidden($('.closed-details .sold')),
        min: text($('.Bidding_Listing_MinPrice .NumberPart', box)),
        bids: text($('.awe-rt-AcceptedListingActionCount')) || (/(\d+)\s*Bid\(s\)/i.exec(text($('.closed-details'))) || [])[1] || '',
        status: text($('.detail__status-label .label')),
        reserve: text($('.awe-rt-ReserveStatus', box)),
        max: maxEl && !maxEl.classList.contains('awe-hidden') ? text($('#MaxBid .NumberPart')) : '',
        notice: [...new Set(
          $$('.awe-rt-ListingActionMessage, .ContextualStatus, main .alert, main .validation-summary-errors')
            .filter(el => !hidden(el) && !el.closest('.detail__biddermax, .modal') && !el.classList.contains('detail__biddermax'))
            .map(text)
            .filter(Boolean),
        )].join(' '),
        deadline,
        open: !!submit && !hidden(submit) && !closedLots.has(listingId),
      };
    };

    const statusEl = h('span', { class: 'status' });
    const clockEl = h('span', { class: 'clock', 'data-lid': listingId });
    const priceEl = h('div', { class: 'big' });
    const priceLabel = h('div', { class: 'label' }, 'Current bid');
    const historyHref = abs($('a.bid-history, a[href*="/Listing/History/"]')?.getAttribute('href'));
    const bidsEl = historyHref ? h('button', { class: 'link history-toggle', type: 'button', 'aria-expanded': 'false', onclick: () => toggleHistory() }) : h('span', { class: 'muted' });
    const historyEl = h('div', { class: 'history hidden' });
    let historyFor = null;

    const shortWhen = raw => {
      const m = /(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)(?::\d+)?\s*(AM|PM)/i.exec(raw);
      if (!m) return raw;
      const month = new Date(+m[3], +m[1] - 1, 1).toLocaleString(undefined, { month: 'short' });
      return `${month} ${+m[2]}, ${+m[4]}:${m[5]} ${m[6].toUpperCase()}`;
    };

    async function loadHistory() {
      historyFor = state.bids;
      historyEl.replaceChildren(h('div', { class: 'muted' }, 'Loading bid history…'));
      try {
        const res = await fetch(historyHref, { credentials: 'include' });
        if (!res.ok) throw new Error(res.status);
        if (/\/account\/logon/i.test(res.url)) {
          historyEl.replaceChildren(h('a', { class: 'link', href: abs('/Account/LogOn?returnUrl=' + encodeURIComponent(location.pathname)) }, 'Sign in to see bid history'));
          return;
        }
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const rows = $$('.table-bidHistory tbody tr', doc).map(tr => $$('td', tr).map(text)).filter(r => r.length >= 2);
        historyEl.replaceChildren(rows.length
          ? h('ol', { class: 'history-list' }, rows.map(([when, amount, kind], i) => h('li', { class: i === 0 ? 'top' : '' },
              h('span', { class: 'history-amount' }, money(amount) || amount),
              kind && !/^bid$/i.test(kind) && h('span', { class: 'chip' }, kind),
              h('span', { class: 'muted' }, shortWhen(when)))))
          : h('div', { class: 'muted' }, 'No bids yet.'));
      } catch {
        historyFor = null;
        historyEl.replaceChildren(h('span', { class: 'muted' }, 'Couldn’t load bid history. '), h('button', { class: 'link', type: 'button', onclick: loadHistory }, 'Retry'));
      }
    }

    function toggleHistory() {
      const open = historyEl.classList.toggle('hidden') === false;
      bidsEl.setAttribute('aria-expanded', String(open));
      if (open && historyFor !== state.bids) loadHistory();
    }
    const reserveEl = h('div', { class: 'note' });
    const mineEl = h('div', { class: 'mine hidden' });
    const noticeEl = h('div', { class: 'mine hidden' });
    const quick = h('button', { class: 'btn primary', type: 'button' });
    const input = h('input', { inputmode: 'decimal', autocomplete: 'off', placeholder: 'Your max bid', 'aria-label': 'Max bid amount' });
    const maxBtn = h('button', { class: 'btn', type: 'submit' }, 'Set max bid');
    const err = h('div', { class: 'err' });
    const feeEl = h('div', { class: 'note hidden' });
    const controls = h('div', { style: 'display:grid;gap:12px' },
      quick,
      h('form', { class: 'maxform', onsubmit: e => { e.preventDefault(); submitMax(); } },
        h('label', { class: 'money' }, '$', input), maxBtn),
      feeEl,
      err,
      h('div', { class: 'note' }, 'Proxy bidding: NativeBid bids for you up to your max. Tap once to see the total with fees, then tap again to place the bid.'),
      sniperBot() && listingId && h('a', {
        class: 'btn snipe',
        href: `https://t.me/${sniperBot()}?text=${encodeURIComponent(`/snipe ${listingId} `)}`,
        target: '_blank',
        rel: 'noopener',
      }, 'Snipe', svg('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3')));
    const closedEl = h('div', { class: 'closed hidden' }, 'Bidding is closed');

    let state = read();
    let pending = null;

    function clearPending() {
      if (pending) clearTimeout(pending.timer);
      pending = null;
    }
    const busy = () => pending?.phase === 'placing' || pending?.phase === 'placed';

    let messageCache;
    function messages() {
      if (!messageCache) {
        messageCache = {};
        for (const sc of $$('script:not([src])')) {
          for (const m of sc.textContent.matchAll(/contextMessageDictionary\["(\w+)"\]\s*=\s*"((?:[^"\\]|\\.)*)"/g)) {
            messageCache[m[1]] = m[2].replace(/\\(.)/g, '$1');
          }
        }
      }
      return messageCache;
    }

    function signInLink() {
      return h('a', { class: 'link', href: '/Account/LogOn?returnUrl=' + encodeURIComponent(location.pathname + location.search) }, 'Sign in');
    }

    async function placeBid(mine) {
      const url = new URL(mine.action, location.origin);
      url.search = mine.params;
      clearTimeout(mine.timer);
      mine.phase = 'placing';
      render();
      let res, result;
      try {
        res = await fetch(url, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' } });
        const body = (await res.text()).trim();
        try { result = JSON.parse(body); } catch { result = body; }
      } catch {
        clearPending();
        err.textContent = 'Couldn’t reach NativeBid, so your bid may not have gone through. Reload to check.';
        render();
        return;
      }
      if (result && typeof result === 'object') result = result.ReasonCode || result.Status || result.Message || JSON.stringify(result);
      result = String(result ?? '');
      if (res.ok && /^(ok|success|actionsuccess)$/i.test(result)) {
        mine.phase = 'placed';
        err.textContent = '';
        render();
        setTimeout(() => location.reload(), 900);
        return;
      }
      clearPending();
      const readable = result && !/[<{]/.test(result) ? result : '';
      err.textContent = messages()[result] || readable || `NativeBid didn’t accept that bid${res.ok ? '' : ` (error ${res.status})`}.`;
      render();
    }

    async function startBid(btn, amount) {
      if (busy()) return;
      if (pending?.btn === btn && pending.amount === amount) {
        if (pending.phase === 'ready') placeBid(pending);
        return;
      }
      clearPending();
      err.textContent = '';
      const mine = pending = { btn, amount, phase: 'checking' };
      render();
      try {
        const u = new URL('/Listing/ConfirmAction', location.origin);
        u.searchParams.set('ListingID', listingId);
        u.searchParams.set('ListingType', listingType);
        u.searchParams.set('BidAmount', amount.toFixed(2));
        const res = await fetch(u, { credentials: 'include' });
        if (!res.ok) throw new Error(res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        if (pending !== mine) return;
        const form = $('form[action*="/Listing/Action"]', doc);
        if ($('form[action*="/Account/LogOn"]', doc) || !form) {
          clearPending();
          if ($('form[action*="/Account/LogOn"]', doc)) err.replaceChildren(signInLink(), ' to place a bid.');
          else err.replaceChildren(text($('.validation-summary-errors, .alert-danger, .alert', doc)) || 'NativeBid didn’t accept that bid.', ' ', h('a', { class: 'link', href: u.href }, 'Details'));
          render();
          return;
        }
        const confirmed = num($('[name="BidAmount"]', form)?.value);
        if (isNaN(confirmed) || Math.abs(confirmed - amount) > 0.001 || $('[name="ListingID"]', form)?.value !== listingId) {
          clearPending();
          err.textContent = 'NativeBid’s confirmation didn’t match this bid, so nothing was placed. Reload and try again.';
          render();
          return;
        }
        mine.phase = 'ready';
        mine.action = form.getAttribute('action');
        mine.params = new URLSearchParams(new FormData(form)).toString();
        const lines = $$('.panel-body p', form).map(text).filter(t => t && !/^confirm your bid/i.test(t));
        mine.total = (/up to\s*(\$[\d,]+(?:\.\d+)?)/i.exec(lines.find(l => /including/i.test(l)) || '') || [])[1] || '';
        mine.fees = lines.filter(l => !/including/i.test(l)).join(' ');
        mine.timer = setTimeout(() => { if (pending === mine) { clearPending(); render(); } }, 10000);
      } catch {
        if (pending === mine) { clearPending(); err.textContent = 'Couldn’t reach NativeBid. Try again.'; }
      }
      render();
    }

    quick.addEventListener('click', () => {
      const min = num(state.min);
      if (!isNaN(min)) startBid(quick, min);
    });

    function currentMax() {
      const max = num(state.max);
      return !isNaN(max) && !(max < num(state.min)) ? max : NaN;
    }

    function submitMax() {
      const amount = num(input.value);
      const min = num(state.min);
      const max = currentMax();
      if (isNaN(amount)) { err.textContent = 'Enter an amount.'; return; }
      if (!isNaN(max) && amount <= max) { err.textContent = `Your new max bid must be more than ${money(max)}.`; return; }
      if (!isNaN(min) && amount < min) { err.textContent = `Your max bid must be at least ${money(min)}.`; return; }
      startBid(maxBtn, amount);
    }
    input.addEventListener('input', () => {
      err.textContent = '';
      if (pending?.btn === maxBtn && !busy()) { clearPending(); render(); }
    });

    function buttonLabel(btn, idle) {
      if (pending?.btn !== btn) return idle;
      if (pending.phase === 'checking') return 'Checking fees…';
      if (pending.phase === 'placing') return 'Placing bid…';
      if (pending.phase === 'placed') return 'Bid placed ✓';
      return `Confirm ${money(pending.amount)}` + (pending.total ? ` · up to ${pending.total} with fees` : '');
    }

    function render() {
      if (pending?.btn === quick && !busy() && state.min && num(state.min) !== pending.amount) clearPending();
      statusEl.textContent = state.status || (state.open ? 'Active' : 'Closed');
      if (isNaN(state.deadline)) {
        clockEl.removeAttribute('data-deadline');
        clockEl.textContent = state.open ? '' : 'Ended';
      } else clockEl.dataset.deadline = state.deadline;
      priceEl.textContent = money(state.price) || '—';
      priceLabel.textContent = state.open ? (state.bids && state.bids !== '0' ? 'Current bid' : 'Starting bid') : state.sold ? 'Sold for' : 'Final price';
      bidsEl.textContent = bidsLabel(state.bids);
      if (historyHref && historyFor !== null && historyFor !== state.bids && !historyEl.classList.contains('hidden')) loadHistory();
      reserveEl.textContent = state.reserve;
      const tone = /not the high bidder|not currently winning|did not win|beating your/i.test(state.notice) ? 'losing'
        : /currently winning|have won/i.test(state.notice) ? 'winning' : '';
      const maxLine = state.max ? `Your max bid is ${money(state.max)}` : '';
      noticeEl.className = 'banner ' + (tone || 'neutral') + (state.notice ? '' : ' hidden');
      noticeEl.replaceChildren(
        tone && svg(tone === 'winning' ? 'M20 6L9 17l-5-5' : 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'),
        h('div', null, state.notice, maxLine && h('small', null, maxLine)));
      mineEl.textContent = maxLine;
      mineEl.classList.toggle('hidden', !maxLine || !!state.notice);
      quick.textContent = buttonLabel(quick, !state.min ? 'Bid' : tone === 'winning' ? `Raise max to ${money(state.min)}` : `Bid ${money(state.min)}`);
      quick.classList.toggle('primary', tone !== 'winning');
      quick.classList.toggle('hidden', !isNaN(currentMax()) && pending?.btn !== quick);
      const ready = pending?.phase === 'ready';
      quick.classList.toggle('armed', ready && pending.btn === quick);
      maxBtn.textContent = buttonLabel(maxBtn, 'Set max bid');
      maxBtn.classList.toggle('armed', ready && pending.btn === maxBtn);
      quick.disabled = maxBtn.disabled = busy();
      feeEl.textContent = ready ? `${pending.fees} Tap again to place your bid.`.trim() : '';
      feeEl.classList.toggle('hidden', !ready);
      if (!input.value && state.min) input.placeholder = isNaN(currentMax()) ? `${money(state.min)} or more` : `More than ${money(state.max)}`;
      controls.classList.toggle('hidden', !state.open || !listingId);
      closedEl.classList.toggle('hidden', state.open || !!state.notice);
      tick();
    }

    let snapshot = JSON.stringify(state);
    everySecond = () => {
      const s = read();
      const json = JSON.stringify(s);
      if (json !== snapshot) { state = s; snapshot = json; render(); }
    };

    const watchA = $('.watching__wrapper a[href]');
    let watch = null;
    if (watchA) {
      const count = text($('.detail__action-link-count', watchA));
      const label = text(watchA).replace(count, '').trim();
      watch = h('div', { class: 'note' }, h('a', { class: 'link', href: abs(watchA.getAttribute('href')) }, label || 'Watch'), count && ` · ${count.toLowerCase()}`);
    }

    const fees = $$('.detail__buyer-premium').map(text).filter(Boolean);

    const specs = $$('.detail__data-panel .panel-body > .row').map(row => {
      const name = text($('.detail__field-name', row));
      const valEl = $('.detail__field-value', row);
      const dt = $('[data-initial-dttm]', valEl || row);
      let value = text(valEl);
      if (dt && !value) value = fmtDate(clock(dt.getAttribute('data-initial-dttm')));
      return name && value ? [name, value] : null;
    }).filter(Boolean);

    const descSrc = $('.detail__description-panel .panel-body');
    let desc = null;
    if (descSrc && text(descSrc)) {
      desc = descSrc.cloneNode(true);
      desc.className = 'desc';
      desc.querySelectorAll('script, style, iframe').forEach(n => n.remove());
      desc.querySelectorAll('[style]').forEach(n => n.removeAttribute('style'));
      desc.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    }

    const seller = text($('.detail__user-summary strong'));

    render();

    return h('main', { class: 'page' },
      h('div', { class: 'detail' },
        images.length ? gallery(images) : h('div', { class: 'gallery' }, h('div', { class: 'stage' }, h('div', { class: 'slide' }))),
        h('div', { class: 'info' },
          h('h1', null, title),
          text($('h4.detail__subtitle')) && h('div', { class: 'subtitle' }, text($('h4.detail__subtitle'))),
          h('div', { class: 'chips' },
            msrp && h('span', { class: 'chip strong' }, `MSRP ${msrp}`),
            lotText && h('span', { class: 'chip' }, lotText.replace(/#\s*/, '')),
            seller && h('span', { class: 'chip' }, `Seller: ${seller}`)),
          h('div', { class: 'buy' },
            h('div', { class: 'buy-top' }, statusEl, clockEl),
            h('div', { class: 'price-block' }, h('div', null, priceLabel, priceEl), bidsEl),
            historyEl,
            reserveEl,
            noticeEl,
            mineEl,
            controls,
            closedEl,
            watch,
            fees.length > 0 && h('div', { class: 'note' }, fees.join(' '))),
          specs.length > 0 && h('section', { class: 'section' },
            h('h2', null, 'Details'),
            h('dl', { class: 'specs' }, specs.map(([k, v]) => [h('dt', null, k), h('dd', null, v)]))),
          desc && h('section', { class: 'section' }, h('h2', null, 'Description'), desc))));
  }

  function sniperPage() {
    document.title = 'Sniper · NativeBid';
    const input = h('input', { type: 'text', value: sniperBot(), placeholder: 'MySniperBot', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Bot username' });
    const status = h('div', { class: 'note' });
    const show = () => {
      const bot = sniperBot();
      status.replaceChildren(bot ? ['Lot pages show a Snipe button that opens ', h('a', { class: 'link', href: `https://t.me/${bot}`, target: '_blank', rel: 'noopener' }, `@${bot}`), ' in Telegram.'] : 'Not set up. Lot pages won’t show a Snipe button.');
    };
    const save = () => {
      const bot = input.value.trim().replace(/^(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/)?@?/i, '').replace(/[/?#].*$/, '');
      if (bot && !/^[A-Za-z0-9_]{5,32}$/.test(bot)) { status.replaceChildren(h('span', { class: 'err' }, 'That doesn’t look like a Telegram username.')); return; }
      try { bot ? localStorage.setItem(sniperKey, bot) : localStorage.removeItem(sniperKey); } catch {}
      input.value = bot;
      show();
    };
    show();
    return h('main', { class: 'page' },
      h('div', { class: 'head' },
        h('div', null,
          h('h1', null, 'NativeBid Sniper'),
          h('div', { class: 'lede' }, 'Only useful if you run your own ', h('a', { class: 'link', href: 'https://github.com/kristophertope/nativebid-sniper', target: '_blank', rel: 'noopener' }, 'NativeBid Sniper'), ' with a Telegram bot. Enter that bot’s username to add a Snipe button to lot pages.'))),
      h('div', { class: 'sniper' },
        h('form', { class: 'filter-add', onsubmit: e => { e.preventDefault(); save(); } },
          input,
          h('button', { class: 'btn primary', type: 'submit' }, 'Save')),
        status));
  }

  function missingLotPage() {
    const stray = Array.from(document.body.childNodes).filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    const msg = text($$('main .alert, .validation-summary-errors, .alert').find(el => !hidden(el))) || stray.map(n => n.textContent.trim()).join(' ');
    stray.forEach(n => n.remove());
    return h('main', { class: 'page' },
      h('div', { class: 'head' },
        h('div', null,
          h('h1', null, 'This lot isn’t available'),
          h('div', { class: 'lede' }, msg || 'It may have been removed, or the link may be wrong.', ' ', h('a', { class: 'link', href: '/Browse' }, 'Browse all lots')))));
  }

  function pickupPage() {
    const body = $('main .row .col-xs-12') || $('main .container');
    const clean = el => text(el).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    const linkOf = (a, label) => {
      const href = abs(a.getAttribute('href'));
      const ext = new URL(href).origin !== location.origin;
      return h('a', { class: 'btn primary', href, ...(ext ? { target: '_blank', rel: 'noopener' } : {}) }, label || clean(a));
    };
    let title = '';
    const options = [];
    for (const p of $$('p', body)) {
      const t = clean(p);
      if (!t) continue;
      const a = $('a[href]', p);
      const num = /^\d+\)\s*(.*)$/.exec(t);
      const item = /^[a-z]\)\s*(.*)$/i.exec(t);
      if (num) {
        const hours = (/\(([^)]+)\)/.exec(num[1]) || [])[1] || '';
        const name = a ? clean(a) : num[1].replace(/\([^)]*\)/, '').trim();
        options.push({ name, hours: hours.replace(/\s*-\s*/g, '–').replace(/:\s*/, ': '), points: [], actions: a ? [linkOf(a, 'View instructions')] : [] });
      } else if (item && options.length) {
        const cur = options[options.length - 1];
        if (a) cur.actions.push(linkOf(a));
        else cur.points.push(item[1].replace(/\.$/, ''));
      } else if (!title && !options.length) title = t;
    }
    if (!options.length) throw new Error('Unrecognized pick-up page');
    return h('main', { class: 'page' },
      h('div', { class: 'head' }, h('h1', null, title || 'Pick-up')),
      h('div', { class: 'pickup' }, options.map(o => h('section', { class: 'pickup-card' },
        h('h2', null, o.name),
        o.hours && h('span', { class: 'chip strong' }, o.hours),
        o.points.length > 0 && h('ul', null, o.points.map(x => h('li', null, x))),
        o.actions.length > 0 && h('div', { class: 'pickup-actions' }, o.actions)))));
  }

  try {
    let main;
    if (/^\/sniper\/?$/i.test(location.pathname)) main = sniperPage();
    else if ($('h3.detail__title')) main = detailPage();
    else if (/^\/(listing\/details|event\/lotdetails)\//i.test(location.pathname)) main = missingLotPage();
    else if (/^\/account\/bidding\//i.test(location.pathname)) main = bidsPage();
    else if (/^\/account\/invoice\/purchases/i.test(location.pathname)) main = invoicesPage();
    else if (/^\/page\/schedule-pick-up\/?$/i.test(location.pathname)) main = pickupPage();
    else if ($('.event-hp') || location.pathname === '/') main = homePage();
    else if ($('section[data-listingid]') || $('#SortFilterOptions') || /^\/(browse|search|listing|event\/details)/i.test(location.pathname)) main = resultsPage();
    else throw new Error('Unrecognized page');

    const footer = h('footer', { class: 'foot' },
      h('button', { type: 'button', onclick: () => { try { localStorage.setItem('nbx-off', '1'); } catch {} location.reload(); } }, 'Switch to the classic NativeBid layout'));
    shadow.append(header(), main, footer);
    document.body.append(host);
    speculate();
    const icon = globalThis.chrome?.runtime?.getURL?.('icons/favicon.svg');
    if (icon) {
      $$('link[rel~="icon"]').forEach(l => l.remove());
      document.head.append(h('link', { rel: 'icon', type: 'image/svg+xml', href: icon }));
    }
    tick();
    const beat = () => {
      const el = shadow.querySelector('[data-deadline]');
      const wait = el ? ((+el.dataset.deadline - Date.now()) % 1000 + 1000) % 1000 + 25 : 1000;
      setTimeout(() => { everySecond(); tick(); beat(); }, wait);
    };
    beat();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { everySecond(); tick(); } });
  } catch (e) {
    console.error('[NativeBid Modern] falling back to original page', e);
    host.remove();
    html.classList.remove('nbx');
    globalThis.nbxBoot?.restore?.();
  }
});
