// Floating prototype switcher (bottom-left). Load on every prototype page:
//   <script src="../proto-nav.js"></script>  from each prototype's folder
(() => {
  // Links resolve from this script's own location, so they work from any folder, on GitHub Pages or file://
  const root = new URL('.', document.currentScript.src);
  const PROTOS = [ // first entry is the default the site opens on
    { id: 'news', name: 'News app', sub: 'First-run coachmarks', path: 'news/index.html', color: '#e0567a',
      icon: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 12.5h8M8 16h5"/>' },
    { id: 'clock', name: 'Clock app', sub: 'Wake-up challenges', path: 'clock/index.html', color: '#3b32d8',
      icon: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13h3M5 3 2 6M22 6l-3-3"/>' },
  ];
  const here = new URL(location.href);
  here.hash = ''; here.search = '';
  const isCurrent = (p) => {
    const u = new URL(p.path, root).href;
    return here.href === u || here.href === u.replace(/index\.html$/, '');
  };

  const css = `
  .pnav { position: fixed; left: 18px; bottom: 18px; z-index: 2147483000; text-align: left; line-height: 1.4; font-family: "Poppins", system-ui, sans-serif;
    --pn-bg: #ffffff; --pn-text: #17172a; --pn-muted: #6b6b7d; --pn-line: #e7e7ef; --pn-hover: #f3f3f8; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .pnav { --pn-bg: #23232b; --pn-text: #ededf3; --pn-muted: #9a9aab; --pn-line: #33333d; --pn-hover: #2c2c35; }
  }
  :root[data-theme="dark"] .pnav { --pn-bg: #23232b; --pn-text: #ededf3; --pn-muted: #9a9aab; --pn-line: #33333d; --pn-hover: #2c2c35; }
  .pnav-btn { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px 0 11px; border-radius: 20px;
    background: var(--pn-bg); color: var(--pn-text); border: 1px solid var(--pn-line); cursor: pointer; font: inherit;
    font-size: 13px; font-weight: 500; box-shadow: 0 8px 24px -10px rgba(20,20,40,.35); transition: transform .15s, box-shadow .15s; }
  .pnav-btn:hover { transform: translateY(-1px); box-shadow: 0 12px 28px -10px rgba(20,20,40,.4); }
  .pnav-btn svg { flex: none; }
  .pnav-btn .chev { color: var(--pn-muted); transition: transform .2s; }
  .pnav.open .pnav-btn .chev { transform: rotate(180deg); }
  .pnav-menu { position: absolute; left: 0; bottom: 50px; width: 250px; padding: 8px; border-radius: 16px;
    background: var(--pn-bg); border: 1px solid var(--pn-line); box-shadow: 0 18px 40px -14px rgba(20,20,40,.45);
    opacity: 0; transform: translateY(6px) scale(.97); transform-origin: bottom left; pointer-events: none;
    transition: opacity .16s, transform .16s; }
  .pnav.open .pnav-menu { opacity: 1; transform: none; pointer-events: auto; }
  .pnav-title { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--pn-muted); padding: 6px 8px 8px; }
  .pnav-item { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; text-decoration: none; color: var(--pn-text); }
  .pnav-item:hover { background: var(--pn-hover); }
  .pnav-ico { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; color: #fff; flex: none; }
  .pnav-item .t { font-size: 13.5px; font-weight: 500; }
  .pnav-item .s { font-size: 11.5px; color: var(--pn-muted); }
  .pnav-item .tx { flex: 1; }
  .pnav-here { font-size: 10.5px; font-weight: 600; color: var(--pn-muted); border: 1px solid var(--pn-line); border-radius: 10px; padding: 2px 7px; }
  @media (prefers-reduced-motion: reduce) { .pnav-btn, .pnav-menu { transition: none; } }`;

  const svg = (inner, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const nav = document.createElement('div');
  nav.className = 'pnav';
  nav.innerHTML = `<style>${css}</style>
    <div class="pnav-menu" role="menu" aria-label="Prototypes">
      <div class="pnav-title">Prototypes</div>
      ${PROTOS.map(p => `<a class="pnav-item" role="menuitem" href="${new URL(p.path, root).href}" ${isCurrent(p) ? 'aria-current="page"' : ''}>
        <span class="pnav-ico" style="background:${p.color}">${svg(p.icon)}</span>
        <span class="tx"><div class="t">${p.name}</div><div class="s">${p.sub}</div></span>
        ${isCurrent(p) ? '<span class="pnav-here">Here</span>' : ''}</a>`).join('')}
    </div>
    <button class="pnav-btn" aria-expanded="false" aria-haspopup="menu">
      ${svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>', 17)}
      Prototypes
      <span class="chev">${svg('<path d="M6 15l6-6 6 6"/>', 14)}</span>
    </button>`;
  document.body.appendChild(nav);

  const btn = nav.querySelector('.pnav-btn');
  const setOpen = (open) => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); };
  btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!nav.classList.contains('open')); });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
})();
