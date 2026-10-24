globalThis.NBX_CSS = `
:host {
  all: initial;
  display: block;
  min-height: 100vh;
  overflow-x: clip;
  --bg: #f7f7f5;
  --surface: #ffffff;
  --ink: #18181b;
  --muted: #6b6b72;
  --line: #e6e6e3;
  --well: #ffffff;
  --accent: #0f766e;
  --accent-ink: #ffffff;
  --accent-soft: #e3f2ef;
  --warn: #c2410c;
  --warn-ink: #ffffff;
  --win: #15803d;
  --win-ink: #ffffff;
  --radius: 14px;
  background: var(--bg);
  color: var(--ink);
  font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  :host {
    --bg: #111113;
    --surface: #1a1a1d;
    --ink: #ececee;
    --muted: #9a9aa3;
    --line: #2a2a2e;
    --well: #f2f2f0;
    --accent: #2dd4bf;
    --accent-ink: #062320;
    --accent-soft: #12302c;
    --warn: #fb923c;
    --warn-ink: #1f0d02;
    --win: #22c55e;
    --win-ink: #052e16;
  }
}
*, *::before, *::after { box-sizing: border-box; }
a { color: inherit; text-decoration: none; }
button, input, select { font: inherit; color: inherit; }
img { display: block; }

.top {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--bg) 86%, transparent);
  backdrop-filter: saturate(1.4) blur(14px);
  -webkit-backdrop-filter: saturate(1.4) blur(14px);
  border-bottom: 1px solid var(--line);
}
.bar {
  max-width: 1440px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.logo { font-weight: 800; font-size: 20px; letter-spacing: -0.03em; white-space: nowrap; }
.logo span { color: var(--accent); }
.search { flex: 1; max-width: 560px; margin: 0; }
.search input {
  width: 100%;
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.search input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.nav { display: flex; align-items: center; gap: 2px; margin-left: auto; }
.nav > a, .nav summary, .nav > button {
  display: block;
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--muted);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  list-style: none;
}
.nav > a:hover, .nav summary:hover, .nav > button:hover, .menu[open] summary { color: var(--ink); background: var(--surface); }
summary::-webkit-details-marker { display: none; }
.menu { position: relative; }
.menu-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  min-width: 240px;
  max-height: 70vh;
  overflow: auto;
  display: grid;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, .14);
}
.menu-panel a { display: flex; justify-content: space-between; gap: 16px; padding: 9px 12px; border-radius: 9px; }
.menu-panel a:hover { background: var(--bg); }
.menu-panel small { color: var(--muted); font-variant-numeric: tabular-nums; }
.menu-panel hr { width: 100%; margin: 6px 0; border: 0; border-top: 1px solid var(--line); }
.mobile-menu { display: none; }
.mobile-menu summary { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: var(--ink); cursor: pointer; list-style: none; }
.mobile-menu summary svg { width: 22px; height: 22px; }
.mobile-menu[open] summary { background: var(--surface); }
.mobile-menu .menu-panel { width: min(320px, calc(100vw - 32px)); }
.mobile-menu .menu-panel a { padding: 12px; font-size: 16px; }

.page { max-width: 1440px; margin: 0 auto; padding: 28px 24px 96px; }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
h1 { margin: 0; font-size: 30px; line-height: 1.15; letter-spacing: -0.025em; overflow-wrap: anywhere; }
.lede { margin-top: 6px; color: var(--muted); max-width: 70ch; }
.tools { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.seg { position: relative; display: inline-flex; max-width: 100%; overflow-x: auto; scrollbar-width: none; padding: 3px; background: var(--surface); border: 1px solid var(--line); border-radius: 999px; }
.seg a, .seg button { flex: none; white-space: nowrap; padding: 6px 14px; border: 0; border-radius: 999px; background: none; color: var(--muted); cursor: pointer; font-weight: 500; }
.seg .on { background: var(--ink); color: var(--bg); }
select { height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 32px 20px; }
.card { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.inv-list { display: grid; gap: 10px; max-width: 820px; }
.inv { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 16px; padding: 16px 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; transition: border-color .15s; }
.inv:hover { border-color: var(--muted); }
.inv-id { font-weight: 650; margin-bottom: 2px; }
.pill { padding: 4px 10px; border-radius: 999px; background: var(--line); font-size: 12px; font-weight: 700; white-space: nowrap; }
.pill.winning { background: var(--win); color: var(--win-ink); }
.pill.losing { background: var(--warn); color: var(--warn-ink); }
.card-wrap { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.card-wrap > .link { align-self: flex-start; font-size: 13px; }
.well { position: relative; aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; background: var(--well); border-radius: var(--radius); }
.well img { width: 100%; height: 100%; object-fit: contain; transition: transform .4s cubic-bezier(.2, .7, .2, 1); }
.card:hover .well img { transform: scale(1.04); }
.pill-time {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(17, 17, 19, .78);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.pill-time.soon { background: var(--warn); }
.pill-status { position: absolute; left: 10px; top: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(17, 17, 19, .78); color: #fff; font-size: 12px; font-weight: 700; }
.pill-status.winning { background: var(--win); color: var(--win-ink); }
.pill-status.losing { background: var(--warn); color: var(--warn-ink); }
.pill-time:empty { display: none; }
.price-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.price { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
.muted { color: var(--muted); font-size: 13px; }
.title { font-weight: 500; line-height: 1.35; overflow-wrap: anywhere; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 2px 9px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); font-size: 12px; white-space: nowrap; }
.chip.strong { border-color: transparent; background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.card.ended .well { opacity: .5; }
.feed-status { padding: 48px 0; text-align: center; color: var(--muted); }
.feed-status button { margin-left: 8px; }

.cats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 28px; }
.cats a { padding: 7px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); font-weight: 500; }
.cats a:hover { border-color: var(--accent); }
.cats small { margin-left: 6px; color: var(--muted); }
.events { display: grid; gap: 20px; }
.event { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 24px; padding: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 20px; }
.event .well { border-radius: 12px; }
.event h2 { margin: 6px 0 4px; font-size: 21px; letter-spacing: -0.02em; }
.event-body { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.status-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.strip { display: flex; gap: 8px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 6px; scrollbar-width: thin; }
.strip a { flex: 0 0 92px; aspect-ratio: 1; overflow: hidden; background: var(--well); border-radius: 10px; scroll-snap-align: start; }
.strip img { width: 100%; height: 100%; object-fit: cover; }
.view-lots { align-self: flex-start; color: var(--accent); font-weight: 600; }

.crumbs { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; color: var(--muted); font-size: 14px; }
.crumbs a:hover { color: var(--ink); }
.crumbs .spacer { flex: 1; }
.lotnav { display: inline-flex; gap: 6px; }
.lotnav button { padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); cursor: pointer; }
.detail { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, 1fr); gap: 44px; align-items: start; }
.gallery { position: sticky; top: 84px; min-width: 0; }
.stage { position: relative; overflow: hidden; background: var(--well); border-radius: 20px; }
.track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain; }
.track::-webkit-scrollbar { display: none; }
.slide { flex: 0 0 100%; height: min(72vh, 720px); display: grid; place-items: center; scroll-snap-align: center; scroll-snap-stop: always; }
.slide { position: relative; }
.slide img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.arrow {
  position: absolute;
  top: 50%;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .92);
  color: #111;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .16);
  cursor: pointer;
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity .2s;
}
.arrow svg { width: 20px; height: 20px; }
.stage:hover .arrow:not([disabled]) { opacity: 1; }
.arrow[disabled] { pointer-events: none; }
.arrow.prev { left: 14px; }
.arrow.next { right: 14px; }
.counter { position: absolute; right: 14px; bottom: 14px; padding: 4px 10px; border-radius: 999px; background: rgba(17, 17, 19, .72); color: #fff; font-size: 12px; font-variant-numeric: tabular-nums; }
.thumbs { display: flex; gap: 10px; margin-top: 12px; padding: 3px; overflow-x: auto; scrollbar-width: thin; }
.thumb { flex: 0 0 76px; aspect-ratio: 1; padding: 0; overflow: hidden; background: var(--well); border: 2px solid transparent; border-radius: 12px; cursor: pointer; opacity: .55; transition: opacity .15s, border-color .15s, transform .15s; }
.thumb img { width: 100%; height: 100%; object-fit: contain; }
.thumb:hover { opacity: 1; transform: translateY(-1px); }
.thumb.on { opacity: 1; border-color: var(--accent); }

.info h1 { font-size: 30px; }
.subtitle { margin-top: 6px; color: var(--muted); font-size: 17px; }
.info .chips { margin-top: 12px; }
.buy { display: grid; gap: 16px; margin-top: 24px; padding: 22px; background: var(--surface); border: 1px solid var(--line); border-radius: 20px; }
.buy-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.status { padding: 4px 10px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.clock { font-weight: 600; font-variant-numeric: tabular-nums; }
.clock.soon { color: var(--warn); }
.price-block { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.label { color: var(--muted); font-size: 13px; margin-bottom: 4px; }
.big { font-size: 42px; font-weight: 750; line-height: 1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.link { color: var(--accent); font-weight: 600; }
.mine { padding: 10px 14px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.banner { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px; font-weight: 700; line-height: 1.3; }
.banner svg { flex: 0 0 24px; width: 24px; height: 24px; stroke-width: 2.6; }
.banner small { display: block; margin-top: 2px; font-size: 13px; font-weight: 500; opacity: .88; }
.banner.neutral { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
.banner.winning { background: var(--win); color: var(--win-ink); }
.banner.losing { background: var(--warn); color: var(--warn-ink); }
.btn { height: 50px; padding: 0 18px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); font-weight: 650; cursor: pointer; transition: background .15s, transform .1s; }
.btn:active { transform: scale(.985); }
.btn.primary { background: var(--accent); border-color: transparent; color: var(--accent-ink); }
.btn.armed { background: var(--warn); border-color: transparent; color: var(--warn-ink); }
.maxform { display: flex; gap: 8px; margin: 0; }
.money { flex: 1; display: flex; align-items: center; gap: 4px; padding: 0 14px; background: var(--bg); border: 1px solid var(--line); border-radius: 14px; }
.money:focus-within { border-color: var(--accent); }
.money input { width: 100%; height: 48px; border: 0; background: none; outline: none; font-size: 16px; font-variant-numeric: tabular-nums; }
.err { color: var(--warn); font-size: 13px; }
.err:empty { display: none; }
.note { color: var(--muted); font-size: 13px; }
.closed { padding: 14px; border-radius: 12px; background: var(--bg); color: var(--muted); text-align: center; font-weight: 600; }
.section { margin-top: 32px; }
.section h2 { margin: 0 0 12px; color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.specs { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 10px 24px; margin: 0; }
.specs dt { color: var(--muted); }
.specs dd { margin: 0; overflow-wrap: anywhere; }
.desc { line-height: 1.65; overflow-wrap: anywhere; }
.desc p { margin: 0 0 .9em; }
.desc a { color: var(--accent); text-decoration: underline; }
.hidden { display: none !important; }
.foot { max-width: 1440px; margin: 0 auto; padding: 0 24px 40px; text-align: center; }
.foot button { border: 0; background: none; color: var(--muted); font-size: 13px; text-decoration: underline; cursor: pointer; }

@media (max-width: 960px) {
  .nav { display: none; }
  .mobile-menu { display: block; margin-left: auto; }
}
@media (max-width: 900px) {
  .detail { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .gallery { position: static; }
  .slide { height: auto; aspect-ratio: 1; }
}
@media (max-width: 720px) {
  .bar { flex-wrap: wrap; gap: 10px; padding: 10px 16px; }
  .search { order: 3; flex-basis: 100%; max-width: none; }
  .crumbs { gap: 8px; margin-bottom: 14px; }
  .page { padding: 20px 16px 80px; }
  h1, .info h1 { font-size: 24px; }
  .event { grid-template-columns: 96px minmax(0, 1fr); gap: 14px; padding: 12px; }
  .event h2 { font-size: 17px; }
}
@media (max-width: 560px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 12px; }
  .price { font-size: 16px; }
  .title { font-size: 14px; }
}
@media (hover: none) {
  .arrow { display: none; }
}
`;
