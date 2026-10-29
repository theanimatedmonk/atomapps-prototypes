// Prototype sidebar: jumps the phone to starting points for each part of the flow.
(() => {
  const $ = (s) => document.querySelector(s);
  const P = window.proto;
  const ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  const CHALLENGES = {
    math:   { title: 'Math', sub: 'Solve a few sums', desc: 'Difficulty changes the sums. Wrong answers shake and ask to try again.', solve: 'Solve to dismiss' },
    retype: { title: 'Retype', sub: 'Copy a short code', desc: 'Codes skip look-alike characters. Errors point at the exact letter, including case.', solve: 'Type to dismiss' },
    steps:  { title: 'Steps', sub: 'Walk to switch it off', desc: 'Needs physical activity access. Uses the motion sensor on a phone; hold the dashed button on desktop.', solve: 'Walk to dismiss' },
    shake:  { title: 'Shake', sub: 'Shake your phone', desc: 'Hard jolts count; gentle ones show “Shake a bit harder”. Press Space or hold the dashed button on desktop.', solve: 'Shake to dismiss' },
    scan:   { title: 'Scan code', sub: 'Scan a code you saved', desc: 'Needs camera access and a saved code. Uses the real camera where available, plus simulate buttons.', solve: 'Scan to dismiss' },
  };
  const OTHER = {
    perms: { title: 'Permissions', sub: 'With and without access' },
    hook:  { title: 'Intro hook', sub: 'First-time card animation' },
    banner: { title: 'Challenge banner', sub: 'The pitch on the alarm list' },
  };

  const ICON_ID = { perms: 'perm', banner: 'target' };
  const item = (id, t, s) => `<button class="sb-item" data-tab="${id}">${P.icon(ICON_ID[id] || id)}<span><div class="t">${t}</div><div class="s">${s}</div></span></button>`;
  $('#sbNav').innerHTML =
    Object.entries(CHALLENGES).map(([id, c]) => item(id, c.title, c.sub)).join('') +
    '<div class="sb-label gap">Prototype</div>' +
    Object.entries(OTHER).map(([id, c]) => item(id, c.title, c.sub)).join('');

  const link = (n, act, t, s) => `<button class="sbp-link" data-act="${act}"><span class="n">${n}</span><span class="tx"><div class="t">${t}</div><div class="s">${s}</div></span>${ARROW}</button>`;

  const panels = {
    challenge(id) {
      const c = CHALLENGES[id];
      return `<div class="sbp-head"><div class="sbp-title">${c.title}</div></div>
        <div class="sbp-desc">${c.desc}</div>
        <div class="sbp-links">
          ${link(1, `setup:${id}`, 'Set up', 'Difficulty, preview and count')}
          ${link(2, `test:${id}`, 'Test mode', 'Try it; the alarm isn’t affected')}
          ${link(3, `edit:${id}`, 'Edit alarm, challenge set', 'The card with Remove Challenge')}
          ${link(4, `ring:${id}`, 'Alarm ringing', `${c.solve}, then the success screen`)}
        </div>`;
    },
    perms() {
      const on = P.permsOn();
      return `<div class="sbp-head"><div class="sbp-title">Permissions</div>
          <label class="sbp-toggle">${on ? 'Granted' : 'Not granted'}<button class="switch" role="switch" id="permToggle" aria-checked="${on}" aria-label="Grant all permissions"></button></label></div>
        <div class="sbp-desc">${on
          ? 'Everything is allowed and “Shampoo bottle” is saved. Steps and Scan code are ready to test.'
          : 'First-run state: nothing granted and no saved code. Steps and Scan code show their access cards, and the buttons stay disabled.'}</div>
        <div class="sbp-links">
          ${link(1, 'setup:steps', 'Steps setup', on ? 'Preview: 20 steps' : 'Physical activity access card')}
          ${link(2, 'setup:scan', 'Scan code setup', on ? 'Saved code: Shampoo bottle' : 'No code saved yet')}
          ${link(3, 'savecode', 'Save a code', 'Camera access, viewfinder, name it')}
          ${link(4, 'newalarm', 'Save a new alarm', on ? 'Notifications already allowed' : 'Asks for notifications on first save')}
        </div>
        <div class="sbp-sub">System dialogs</div>
        <div class="sbp-links">
          ${link('A', 'dlg:activity', 'Physical activity', 'Allow · Don’t allow')}
          ${link('B', 'dlg:camera', 'Camera', 'While using the app · Only this time · Don’t allow')}
          ${link('C', 'dlg:notifications', 'Notifications', 'Allow · Don’t allow')}
        </div>`;
    },
    hook() {
      const st = P.nudgeState();
      const rule = (ok, txt) => `<li><span class="dot ${ok === null ? 'info' : ok ? 'ok' : 'no'}">${ok === null ? 'i' : ok ? '✓' : '✕'}</span><span>${txt}</span></li>`;
      return `<div class="sbp-head"><div class="sbp-title">Intro hook</div></div>
        <div class="sbp-desc">Until someone sets up a wake-up challenge, the card on the New alarm screen cycles through every challenge once, with a matching glow, then settles back to “Off”.</div>
        <ul class="sbp-rules">
          ${rule(!st.used, `No challenge set up yet <b>${st.used ? '(already set up: won’t show)' : ''}</b>`)}
          ${rule(!st.shownToday, `Not shown today <b>${st.shownToday ? '(already shown today)' : ''}</b>`)}
          ${rule(null, 'Starts when the card is fully scrolled into view, above the Save button')}
          ${rule(null, 'Math → Retype → Steps → Shake → Scan code, 1.5 s each, then back to Off')}
          ${rule(null, 'Stops at once if the card is tapped, or the screen closes')}
        </ul>
        <button class="sbp-btn" data-act="playnudge">Play the hook now</button>
        <button class="sbp-btn ghost" data-act="realnudge">Try it with the real rules</button>
        <button class="sbp-btn ghost" data-act="resetnudge">Reset rules (forget it was shown/used)</button>`;
    },
    banner() {
      const on = P.bannerShown();
      return `<div class="sbp-head"><div class="sbp-title">Challenge banner</div>
          <label class="sbp-toggle">${on ? 'Showing' : 'Hidden'}<button class="switch" role="switch" id="bannerToggle" aria-checked="${on}" aria-label="Show the challenge banner"></button></label></div>
        <div class="sbp-desc">“Set a challenge to dismiss the alarm” sits under the first alarm until a challenge is set up once, then goes away for good. Turn it on here to see it again; setting up a challenge from it hides it again.</div>`;
    },
  };

  let tab = null;
  function show(id, run = true) {
    tab = id;
    document.querySelectorAll('.sb-item').forEach(b => b.setAttribute('aria-current', b.dataset.tab === id));
    $('#sbPanel').innerHTML = CHALLENGES[id] ? panels.challenge(id) : panels[id]();
    if (!run) return;
    // Selecting a tab also takes the phone to its first starting point
    if (CHALLENGES[id]) P.setup(id);
    else if (id === 'hook') P.playNudge();
  }
  const refresh = () => { if (tab) show(tab, false); };

  $('#sbNav').addEventListener('click', (e) => {
    const b = e.target.closest('.sb-item');
    if (b) show(b.dataset.tab);
  });
  $('#sbPanel').addEventListener('click', (e) => {
    if (e.target.closest('#permToggle')) {
      P.setPerms(!P.permsOn());
      return refresh();
    }
    if (e.target.closest('#bannerToggle')) {
      P.setBanner(!P.bannerShown());
      return refresh();
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const [act, arg] = b.dataset.act.split(':');
    const actions = {
      setup: () => P.setup(arg), test: () => P.test(arg), edit: () => P.edit(arg), ring: () => P.ring(arg),
      savecode: () => P.saveCode(), newalarm: () => P.newAlarm(), dlg: () => P.permDialog(arg),
      playnudge: () => P.playNudge(), realnudge: () => P.realNudge(), resetnudge: () => { P.resetNudge(); refresh(); },
    };
    actions[act]();
  });
  $('#sbReset').onclick = () => P.resetAll();

  // Keep live states (permission toggle, hook rules) in sync with what happens on the phone
  let lastKey = '';
  setInterval(() => {
    const key = tab === 'perms' ? String(P.permsOn()) : tab === 'hook' ? JSON.stringify(P.nudgeState())
      : tab === 'banner' ? String(P.bannerShown()) : '';
    if (key && key !== lastKey) refresh();
    lastKey = key;
  }, 1000);

  show('math', false);
})();
