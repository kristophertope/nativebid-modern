(() => {
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

  function tick() {
    const now = Date.now();
    for (const el of shadow.querySelectorAll('[data-deadline]')) {
      const left = +el.dataset.deadline - now;
      const label = remaining(left);
      if (el.textContent === label) continue;
      el.textContent = label;
      el.classList.toggle('soon', left > 0 && left < 5 * 60 * 1000);
      el.closest('.card')?.classList.toggle('ended', left <= 0);
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
      const thumb = abs($('.img-container img', s)?.getAttribute('src'), base);
      const endedLabel = $('.awe-rt-ShowOnEnd.status-type', s);
      const deadline = clock($('[data-epoch="ending"]', s)?.getAttribute('data-action-time'));
      return {
        id: s.getAttribute('data-listingid'),
        href: abs(a.getAttribute('href'), base),
        title,
        msrp,
        lot: (/^Lot\s+(\S+)/i.exec(raw) || [])[1] || '',
        subtitle: text($('h3.subtitle', s)),
        thumb,
        image: large(thumb),
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
        img(it.image, it.thumb),
        isNaN(it.deadline)
          ? (it.ended ? h('span', { class: 'pill-time' }, it.sold ? 'Sold' : 'Ended') : null)
          : h('span', { class: 'pill-time', 'data-deadline': it.deadline })),
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

  function nextPage(doc, base) {
    const last = $$('.pagination li', doc).pop();
    if (!last || last.classList.contains('disabled')) return '';
    const a = $('a[href]', last);
    return a && /»|next/i.test(text(a)) ? abs(a.getAttribute('href'), base) : '';
  }

  function feed({ container, parse, render, firstDoc, empty, keep = () => true }) {
    const key = 'nbx:feed:' + location.href;
    const seen = new Set();
    const loaded = [];
    const status = h('div', { class: 'feed-status' });
    const sentinel = h('div');
    let next = '';
    let busy = false;

    function add(doc, base) {
      let stop = false;
      for (const item of parse(doc, base)) {
        if (!keep(item)) { stop = true; continue; }
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        container.append(render(item));
      }
      next = stop ? '' : nextPage(doc, base);
      tick();
    }

    function save() {
      try { sessionStorage.setItem(key, JSON.stringify({ pages: loaded, y: scrollY })); } catch {}
    }

    function setStatus() {
      status.replaceChildren(busy ? 'Loading more…' : next ? '' : seen.size ? 'You’ve reached the end.' : empty);
    }

    async function load(url) {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(res.status);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      add(doc, url);
      loaded.push(url);
    }

    async function more() {
      if (busy || !next) return;
      busy = true;
      setStatus();
      try {
        await load(next);
        save();
      } catch {
        busy = false;
        status.replaceChildren('Couldn’t load more lots.', h('button', { class: 'btn', onclick: more }, 'Retry'));
        return;
      }
      busy = false;
      setStatus();
      if (sentinel.getBoundingClientRect().top < innerHeight + 1600) more();
    }

    add(firstDoc, location.href);
    setStatus();

    const nav = performance.getEntriesByType('navigation')[0];
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch {}
    if (saved && nav?.type === 'back_forward' && saved.pages?.length) {
      (async () => {
        busy = true;
        setStatus();
        for (const url of saved.pages) {
          try { await load(url); } catch { break; }
        }
        busy = false;
        setStatus();
        requestAnimationFrame(() => scrollTo(0, saved.y || 0));
      })();
    } else {
      try { sessionStorage.removeItem(key); } catch {}
    }

    let t;
    addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(save, 200); }, { passive: true });
    addEventListener('pagehide', save);
    new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) more(); }, { rootMargin: '0px 0px 1600px 0px' }).observe(sentinel);

    return [sentinel, status];
  }

  function resultsPage() {
    const url = new URL(location.href);
    const q = url.searchParams.get('FullTextQuery');
    const eventH1 = $('h1.event-title');
    const crumb = text($$('.breadcrumb li').pop());
    const title = q ? `“${q}”` : eventH1 ? text(eventH1.childNodes[0]) || text(eventH1) : crumb && !/^home$/i.test(crumb) ? crumb.replace(/^Refine Search\s*/i, '') : 'All lots';
    const eventStatus = eventH1 ? text($('.label', eventH1)) : '';
    const lede = eventH1 ? text($('.EventToggleWrapper p')) : '';

    const tools = h('div', { class: 'tools' });
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
      feed({ container: grid, parse: parseListings, render: listingCard, firstDoc: document, empty: 'No lots found.' }));
  }

  function parseEvents(doc, base) {
    const clock = docClock;
    return $$('.event-hp', doc).map(ev => {
      const a = $('.event-row__title a', ev) || $('a[href*="/Event/Details/"]', ev);
      if (!a) return null;
      const visible = sel => $$(sel, ev).find(el => !el.classList.contains('awe-hidden'));
      const timed = $('[data-action-time]', ev);
      const dated = $('[data-initial-dttm]', ev);
      const thumb = abs($('.event-row__img img', ev)?.getAttribute('src'), base);
      return {
        id: ev.getAttribute('data-eventid') || a.getAttribute('href'),
        href: abs(a.getAttribute('href'), base),
        title: text(a),
        summary: text($('.event-row__summary', ev)),
        thumb,
        image: large(thumb),
        status: text(visible('.event-row__status > div')),
        closed: !!visible('.event-row__status--closed'),
        label: text(visible('.event-row__time-label > div')),
        deadline: timed ? clock(timed.getAttribute('data-action-time')) : NaN,
        date: dated ? fmtDate(clock(dated.getAttribute('data-initial-dttm'))) : '',
        lots: $$('.event-row__thumbnails a', ev).map(l => ({ href: abs(l.getAttribute('href'), base), src: abs($('img', l)?.getAttribute('src'), base) })),
      };
    }).filter(Boolean);
  }

  function eventCard(ev) {
    return h('article', { class: 'event' },
      h('a', { class: 'well', href: ev.href }, img(ev.image, ev.thumb)),
      h('div', { class: 'event-body' },
        h('div', { class: 'status-line' },
          ev.status && h('span', { class: 'status' }, ev.status),
          !isNaN(ev.deadline) ? h('span', { class: 'clock', 'data-deadline': ev.deadline }) : (ev.label || ev.date) && h('span', { class: 'muted' }, [ev.label, ev.date].filter(Boolean).join(' '))),
        h('a', { href: ev.href }, h('h2', null, ev.title)),
        ev.summary && h('div', { class: 'muted' }, ev.summary),
        ev.lots.length > 0 && h('div', { class: 'strip' }, ev.lots.map(l => h('a', { href: l.href }, img(l.src)))),
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
    const thumb = abs($('.img-container img, img', s)?.getAttribute('src'), base);
    const deadline = clock($('[data-epoch="ending"]', s)?.getAttribute('data-action-time'));
    const ended = $$('.awe-rt-ShowOnEnd', s).some(el => !el.classList.contains('awe-hidden')) || (!isNaN(deadline) && deadline <= Date.now());
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
      image: large(thumb),
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
    const thumb = abs($('img', row)?.getAttribute('src'), base);
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
      image: large(thumb),
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
        img(it.image, it.thumb),
        it.status && h('span', { class: `pill-status ${it.tone}` }, it.status),
        it.ended || isNaN(it.deadline) ? null : h('span', { class: 'pill-time', 'data-deadline': it.deadline })),
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
        const full = abs($('a[data-lightbox]', li)?.getAttribute('href') || t.getAttribute('data-full-size-src') || t.getAttribute('src'));
        return { full: large(full), thumb: abs(t.getAttribute('src')) };
      })
      : $('#previewimg') ? [{ full: large(abs($('#previewimg').getAttribute('src'))), thumb: abs($('#previewimg').getAttribute('src')) }] : [];

    const read = () => {
      const maxEl = $('.detail__biddermax');
      const submit = $('#SubmitBid');
      const deadline = clock($('[data-epoch="ending"]', box)?.getAttribute('data-action-time'));
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
        open: !!submit && !hidden(submit) && (isNaN(deadline) || deadline > Date.now()),
      };
    };

    const statusEl = h('span', { class: 'status' });
    const clockEl = h('span', { class: 'clock' });
    const priceEl = h('div', { class: 'big' });
    const priceLabel = h('div', { class: 'label' }, 'Current bid');
    const historyHref = abs($('a.bid-history, a[href*="/Listing/History/"]')?.getAttribute('href'));
    const bidsEl = historyHref ? h('a', { class: 'link', href: historyHref }) : h('span', { class: 'muted' });
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
      h('div', { class: 'note' }, 'Proxy bidding: NativeBid bids for you up to your max. Tap once to see the total with fees, then tap again to place the bid.'));
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

    function submitMax() {
      const amount = num(input.value);
      const min = num(state.min);
      if (isNaN(amount)) { err.textContent = 'Enter an amount.'; return; }
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
      if (isNaN(state.deadline)) clockEl.removeAttribute('data-deadline');
      else clockEl.dataset.deadline = state.deadline;
      priceEl.textContent = money(state.price) || '—';
      priceLabel.textContent = state.open ? (state.bids && state.bids !== '0' ? 'Current bid' : 'Starting bid') : state.sold ? 'Sold for' : 'Final price';
      bidsEl.textContent = bidsLabel(state.bids);
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
      const ready = pending?.phase === 'ready';
      quick.classList.toggle('armed', ready && pending.btn === quick);
      maxBtn.textContent = buttonLabel(maxBtn, 'Set max bid');
      maxBtn.classList.toggle('armed', ready && pending.btn === maxBtn);
      quick.disabled = maxBtn.disabled = busy();
      feeEl.textContent = ready ? `${pending.fees} Tap again to place your bid.`.trim() : '';
      feeEl.classList.toggle('hidden', !ready);
      if (!input.value && state.min) input.placeholder = `${money(state.min)} or more`;
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
    if ($('h3.detail__title')) main = detailPage();
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
  }
})();
