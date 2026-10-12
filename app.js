(() => {
  const $ = (s) => document.querySelector(s);
  const DAY_LETTERS = ['S','M','T','W','T','F','S'];
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MON_FIRST = [1,2,3,4,5,6,0];
  const SOUNDS = ['Argon','Carbon','Helium','Oxygen'];
  const SNOOZE_LENGTHS = [5,10,15,20];
  const ITEM = 76;
  const STORE_KEY = 'alarm-flow-v1';
  const CC_DEFAULTS = {
    math: { level: 'medium', count: 3 }, retype: { level: 'medium', count: 1 },
    steps: { level: 'medium', count: 20 }, shake: { level: 'medium', count: 25 }, scan: { count: 1 },
  };

  // ---------- State ----------
  const defaults = () => [
    alarm({ label: 'Gym', h: 6, m: 0, days: [0,1,0,1,0,1,0] }),
    alarm({ label: 'Weekend', h: 8, m: 30, days: [1,0,0,0,0,0,1] }),
    alarm({ label: 'Take meds', h: 21, m: 0, days: [1,1,1,1,1,1,1] }),
  ];
  function alarm(p) {
    const a = Object.assign({
      id: Math.random().toString(36).slice(2, 9), label: '', h: 7, m: 30,
      days: [0,1,1,1,1,1,0], enabled: false, volume: 70, gradual: true,
      snooze: true, snoozeMin: 5, sound: 'Argon', vibrate: true, snoozeUntil: null,
      challenge: 'none',
    }, p, { days: (p.days || [0,1,1,1,1,1,0]).map(Boolean), cc: {} });
    // Per-challenge settings, so switching type keeps what you picked for each
    for (const k in CC_DEFAULTS) a.cc[k] = { ...CC_DEFAULTS[k], ...(p.cc && p.cc[k]) };
    if (p.mathLevel) a.cc.math = { level: p.mathLevel, count: p.mathCount || 3 }; // older saves
    delete a.mathLevel; delete a.mathCount;
    return a;
  }
  let alarms;
  try { alarms = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
  alarms = Array.isArray(alarms) ? alarms.map(a => alarm(a)) : defaults();
  const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(alarms)); } catch (e) {} };

  let draft = null;      // alarm being created/edited
  let editingId = null;

  // ---------- Time helpers ----------
  const pad = (n) => String(n).padStart(2, '0');
  const to12 = (h) => ({ h12: h % 12 || 12, ap: h < 12 ? 'AM' : 'PM' });
  const fmt = (h, m) => { const { h12, ap } = to12(h); return { t: `${h12}:${pad(m)}`, ap }; };

  function repeatLabel(days) {
    const n = days.filter(Boolean).length;
    if (!n) return 'Once';
    if (n === 7) return 'Every day';
    if (n === 5 && [1,2,3,4,5].every(i => days[i])) return 'Weekdays';
    if (n === 2 && days[0] && days[6]) return 'Weekends';
    return MON_FIRST.filter(i => days[i]).map(i => DAY_NAMES[i]).join(', ');
  }
  function nextAt(a, from = new Date()) {
    if (a.snoozeUntil && a.snoozeUntil > from.getTime()) return new Date(a.snoozeUntil);
    const any = a.days.some(Boolean);
    for (let d = 0; d <= 7; d++) {
      const c = new Date(from);
      c.setDate(from.getDate() + d);
      c.setHours(a.h, a.m, 0, 0);
      if (c <= from) continue;
      if (!any || a.days[c.getDay()]) return c;
    }
    return null;
  }
  function fmtIn(ms) {
    const mins = Math.ceil(ms / 60000);
    if (mins < 1) return 'less than a minute';
    const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    const parts = [];
    if (d) parts.push(`${d} day${d > 1 ? 's' : ''}`);
    if (h) parts.push(`${h} hr`);
    if (m && !d) parts.push(`${m} min`);
    return parts.join(' ');
  }

  // ---------- Toast ----------
  let toastT;
  function toast(msg, action) {
    const el = $('#toast'), btn = $('#toastAction');
    $('#toastMsg').textContent = msg;
    btn.hidden = !action;
    el.classList.toggle('has-action', !!action);
    btn.textContent = action ? action.label : '';
    btn.onclick = action ? () => { el.classList.remove('show'); action.run(); } : null;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), action ? 4500 : 2600);
  }

  // ---------- List view ----------
  function renderClock() {
    const now = new Date();
    const { t, ap } = fmt(now.getHours(), now.getMinutes());
    $('#sbTime').textContent = t;
    const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    $('#nowLabel').textContent = `${date}, ${pad(now.getHours() % 12 || 12)}:${pad(now.getMinutes())} ${ap}`;
  }

  function renderList() {
    const now = new Date();
    const upcoming = alarms.filter(a => a.enabled)
      .map(a => ({ a, at: nextAt(a, now) })).filter(x => x.at)
      .sort((x, y) => x.at - y.at);

    const hero = $('#hero');
    if (!upcoming.length) {
      hero.innerHTML = `<h2>No alarms on</h2><p>Turn one on below, or add a new alarm.</p>`;
    } else {
      const { a, at } = upcoming[0];
      const { t, ap } = fmt(at.getHours(), at.getMinutes());
      hero.innerHTML = `<h2>Rings in ${fmtIn(at - now)}</h2><p>${esc(a.label || 'Alarm')} · ${DAY_NAMES[at.getDay()]}, ${t} ${ap}${a.snoozeUntil ? ' · Snoozed' : ''}</p>`;
    }

    const list = $('#alarmList');
    if (!alarms.length) {
      list.innerHTML = `<div class="empty">Your alarms will show up here.</div>`;
      return;
    }
    const sorted = [...alarms].sort((x, y) => (x.h * 60 + x.m) - (y.h * 60 + y.m));
    list.innerHTML = sorted.map(a => {
      const { t, ap } = fmt(a.h, a.m);
      const at = a.enabled ? nextAt(a, now) : null;
      const status = a.enabled ? (at ? `in ${fmtIn(at - now)}` : 'On') : 'Off';
      return `<article class="alarm ${a.enabled ? 'on' : ''}" data-id="${a.id}" tabindex="0">
        <div>
          <div class="lbl">${esc(a.label || 'Alarm')}</div>
          <div class="time">${t}<span>${ap}</span></div>
          <div class="sub">${repeatLabel(a.days)} · ${status}</div>
        </div>
        <button class="switch" role="switch" aria-checked="${a.enabled}" aria-label="Turn ${esc(a.label || 'alarm')} ${a.enabled ? 'off' : 'on'}"></button>
      </article>`;
    }).join('');
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  $('#alarmList').addEventListener('click', (e) => {
    const card = e.target.closest('.alarm');
    if (!card) return;
    const a = alarms.find(x => x.id === card.dataset.id);
    if (e.target.closest('.switch')) {
      a.enabled = !a.enabled;
      a.snoozeUntil = null;
      persist(); renderList();
      if (a.enabled) { const at = nextAt(a); toast(`Alarm set for ${fmtIn(at - new Date())} from now`); }
      return;
    }
    openEditor(a);
  });
  $('#alarmList').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('alarm')) e.target.click();
  });

  // ---------- Editor ----------
  const screen = $('#screen');

  function openEditor(existing) {
    editingId = existing ? existing.id : null;
    draft = existing ? JSON.parse(JSON.stringify(existing)) : alarm({});
    $('#editTitle').textContent = existing ? 'Edit alarm' : 'New alarm';
    $('#deleteBtn').hidden = !existing;
    $('#more').classList.remove('open');
    $('#moreHead').setAttribute('aria-expanded', 'false');
    $('#editScroll').scrollTop = 0;
    screen.classList.add('editing');
    syncEditor(true);
  }
  function closeEditor() {
    endNudge();
    stopSound();
    screen.classList.remove('editing', 'choosing', 'setting');
    draft = null; editingId = null;
  }

  // Wheels
  function buildWheel(el, values) {
    el.innerHTML = '<div class="pad"></div>' +
      values.map((v, i) => `<div class="item" data-i="${i}">${v}</div>`).join('') +
      '<div class="pad"></div>';
    let settleT;
    const items = () => el.querySelectorAll('.item');
    const highlight = () => {
      const idx = Math.round(el.scrollTop / ITEM);
      items().forEach((it, i) => it.classList.toggle('active', i === idx));
      return idx;
    };
    el.addEventListener('scroll', () => {
      const idx = highlight();
      clearTimeout(settleT);
      settleT = setTimeout(() => el.dispatchEvent(new CustomEvent('settle', { detail: idx })), 90);
    });
    el.addEventListener('click', (e) => {
      const it = e.target.closest('.item');
      if (it && !el._dragged) el.scrollTo({ top: +it.dataset.i * ITEM, behavior: 'smooth' });
    });
    // Mouse drag support (touch scrolls natively)
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      const y0 = e.clientY, top0 = el.scrollTop;
      el._dragged = false;
      el.classList.add('dragging');
      const move = (ev) => {
        if (Math.abs(ev.clientY - y0) > 3) el._dragged = true;
        el.scrollTop = top0 - (ev.clientY - y0);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        el.classList.remove('dragging');
        el.scrollTo({ top: Math.round(el.scrollTop / ITEM) * ITEM, behavior: 'smooth' });
        setTimeout(() => (el._dragged = false), 0);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
    el.setIndex = (i) => { el.scrollTop = i * ITEM; highlight(); };
  }
  const hourWheel = $('#hourWheel'), minWheel = $('#minWheel');
  buildWheel(hourWheel, Array.from({ length: 12 }, (_, i) => i + 1));
  buildWheel(minWheel, Array.from({ length: 60 }, (_, i) => pad(i)));

  const isPM = () => draft.h >= 12;
  hourWheel.addEventListener('settle', (e) => {
    if (!draft) return;
    const h12 = e.detail + 1;
    draft.h = (h12 % 12) + (isPM() ? 12 : 0);
    syncEditor();
  });
  minWheel.addEventListener('settle', (e) => {
    if (!draft) return;
    draft.m = e.detail;
    syncEditor();
  });
  $('#amBtn').onclick = () => { if (isPM()) { draft.h -= 12; syncEditor(); } };
  $('#pmBtn').onclick = () => { if (!isPM()) { draft.h += 12; syncEditor(); } };

  // Days
  $('#days').innerHTML = DAY_LETTERS.map((l, i) =>
    `<button class="day ${i === 0 ? 'sun' : ''}" data-i="${i}" aria-label="${DAY_NAMES[i]}">${l}</button>`).join('');
  $('#days').addEventListener('click', (e) => {
    const b = e.target.closest('.day');
    if (!b) return;
    draft.days[+b.dataset.i] = !draft.days[+b.dataset.i];
    syncEditor();
  });

  // Volume
  const volume = $('#volume');
  volume.addEventListener('input', () => {
    draft.volume = +volume.value;
    setLiveVolume(draft.volume);
    syncEditor();
  });
  const PLAY_ICON = '<svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor"><path d="M2.5 1l8.5 5-8.5 5z"/></svg>';
  const STOP_ICON = '<svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>';
  const playBtn = $('#playBtn');
  playBtn.innerHTML = PLAY_ICON;
  playBtn.onclick = () => {
    if (playing === 'sample') return stopSound();
    startSound(draft.sound, draft.volume, { duration: 4000, kind: 'sample' });
  };

  // Switches
  const bindSwitch = (id, key) => $(id).onclick = () => { draft[key] = !draft[key]; syncEditor(); };
  bindSwitch('#gradualSw', 'gradual');
  bindSwitch('#snoozeSw', 'snooze');
  bindSwitch('#vibrateSw', 'vibrate');

  // More options
  $('#moreHead').onclick = () => {
    const open = $('#more').classList.toggle('open');
    $('#moreHead').setAttribute('aria-expanded', open);
    if (open) setTimeout(() => $('#more').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 280);
  };
  $('#soundChips').innerHTML = SOUNDS.map(s => `<button class="chip" data-v="${s}">${s}</button>`).join('');
  $('#soundChips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    draft.sound = c.dataset.v;
    syncEditor();
    startSound(draft.sound, draft.volume, { duration: 2500, kind: 'sample' });
  });
  $('#snoozeChips').innerHTML = SNOOZE_LENGTHS.map(n => `<button class="chip" data-v="${n}">${n} min</button>`).join('');
  $('#snoozeChips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    draft.snoozeMin = +c.dataset.v;
    draft.snooze = true;
    syncEditor();
  });
  $('#labelInput').addEventListener('input', (e) => { draft.label = e.target.value; syncEditor(); });

  function syncEditor(initial) {
    if (!draft) return;
    const { h12, ap } = to12(draft.h);
    if (initial) {
      hourWheel.setIndex(h12 - 1);
      minWheel.setIndex(draft.m);
      $('#labelInput').value = draft.label;
    }
    $('#amBtn').setAttribute('aria-pressed', ap === 'AM');
    $('#pmBtn').setAttribute('aria-pressed', ap === 'PM');

    const at = nextAt({ ...draft, snoozeUntil: null });
    $('#ringsIn').textContent = at ? `Rings in ${fmtIn(at - new Date())}` : '';

    $('#repeatLabel').textContent = repeatLabel(draft.days);
    document.querySelectorAll('#days .day').forEach((b, i) => b.setAttribute('aria-pressed', !!draft.days[i]));

    volume.value = draft.volume;
    volume.style.setProperty('--p', draft.volume + '%');
    $('#volPct').textContent = draft.volume + '%';

    $('#gradualSw').setAttribute('aria-checked', draft.gradual);
    $('#snoozeSw').setAttribute('aria-checked', draft.snooze);
    $('#vibrateSw').setAttribute('aria-checked', draft.vibrate);
    $('#snoozeSub').textContent = draft.snooze ? `${draft.snoozeMin} minutes` : 'Off';

    document.querySelectorAll('#soundChips .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.v === draft.sound));
    document.querySelectorAll('#snoozeChips .chip').forEach(c => c.setAttribute('aria-pressed', draft.snooze && +c.dataset.v === draft.snoozeMin));
    $('#moreSummary').textContent = `${draft.sound} · Vibrate ${draft.vibrate ? 'on' : 'off'} · ${draft.label.trim() ? esc(draft.label.trim()) : 'No label'}`;

    $('#thumbTime').textContent = `${h12}:${pad(draft.m)}`;

    if (nudging) return; // the card is mid-animation; it resyncs when the nudge ends
    const T = CH[draft.challenge];
    $('#challengeTileIcon').innerHTML = colorIcon(T ? draft.challenge : 'none');
    $('#challengeTileSub').textContent = T ? challengeSummary(draft) : 'Off · Dismiss stops the alarm';
    $('#challengeRemove').hidden = !T;
  }

  // ---------- Wake-up challenges ----------
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (str) => str[rnd(0, str.length - 1)];
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const fmtSecs = (n) => n < 60 ? plural(n, 'second') : `${Math.floor(n / 60)} min ${n % 60} sec`;
  const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const LV = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;
  // Footprint: sole + heel, drawn filled so it reads at small sizes
  const foot = (x, y, cls = '') => `<g transform="translate(${x} ${y})"><g class="${cls}" fill="currentColor" stroke="none"><path d="M3 0C4.7 0 5.6 1.9 5.6 4.3c0 1.9-.7 3.3-.9 4.9H1.5C1.2 7.6.4 6.2.4 4.3.4 1.9 1.4 0 3 0z"/><path d="M1.6 10.3h3.1v1.4a1.55 1.55 0 0 1-3.1 0z"/></g></g>`;
  const ICONS = {
    none: svg('<circle cx="12" cy="12" r="9"/><path d="M5.6 18.4 18.4 5.6"/>'),
    math: svg('<path d="M12 4v8M8 8h8M7 18h10"/>', 'stroke-width="2.4"'),
    retype: '<svg viewBox="0 0 30 24" fill="currentColor"><text x="0" y="19" font-family="Poppins, sans-serif" font-size="18" font-weight="500">Aa</text></svg>',
    steps: svg(foot(4.2, 2) + foot(13.4, 8.6)),
    shake: svg('<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 9v6M20 9v6"/>'),
    scan: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1" fill="currentColor"/>'),
    camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    bell: svg('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>'),
    back: svg('<path d="M15 4 7 12l8 8"/>', 'width="22" height="22" stroke-width="1.8"'),
    shift: svg('<path d="M12 4 4 12h4v7h8v-7h4z"/>', 'width="20" height="20" stroke-width="1.8"'),
    del: svg('<path d="M9 5h11v14H9l-6-7z"/><path d="m12 9 5 6M17 9l-5 6"/>', 'width="20" height="20" stroke-width="1.8"'),
    minus: '<svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 7h8"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 7h8M7 3v8"/></svg>',
  };

  // Colourful, gently animated icons for the picker and the editor card
  const CIC = {
    none: svg('<circle cx="12" cy="12" r="8"/><path d="M6.4 17.6 17.6 6.4"/>'),
    math: svg('<path class="a-plus" d="M12 4v8M8 8h8"/><path d="M7 18h10"/>', 'stroke-width="2.4"'),
    retype: '<svg viewBox="0 0 30 24"><text x="1" y="18" font-family="Poppins, sans-serif" font-size="16" font-weight="600" fill="currentColor">Aa</text><rect class="a-caret" x="25" y="5" width="2" height="15" rx="1" fill="currentColor"/></svg>',
    steps: svg(foot(4.2, 2, 'a-f1') + foot(13.4, 8.6, 'a-f2')),
    perm: svg('<path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z"/><path d="m9 12 2 2 4-4"/>'),
    hook: svg('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    shake: svg('<g class="a-phone"><rect x="8.5" y="4" width="7" height="16" rx="2"/><path d="M11 17h2"/></g><path class="a-wave" d="M4.5 9v6M19.5 9v6"/>'),
    scan: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1" fill="currentColor"/><path class="a-scan" d="M2.5 12h19" stroke-width="1.6"/>'),
  };
  const colorIcon = (t) => `<span class="cic cic-${t}" aria-hidden="true">${CIC[t]}</span>`;

  // Math problems
  const MATH = {
    easy:   { desc: 'Easy: single-digit sums', hint: 'Enter the sum',
              gen: () => { const a = rnd(2, 9), b = rnd(2, 9); return { text: `${a} + ${b}`, ans: a + b }; } },
    medium: { desc: 'Medium: two-digit sums', hint: 'Enter the sum',
              gen: () => { const a = rnd(12, 89), b = rnd(12, 89); return { text: `${a} + ${b}`, ans: a + b }; } },
    hard:   { desc: 'Hard: two-digit × one-digit', hint: 'Enter the product',
              gen: () => { const a = rnd(13, 49), b = rnd(3, 9); return { text: `${a} × ${b}`, ans: a * b }; } },
  };

  // Retype codes (no look-alike characters such as l/I/1, O/0)
  const LOWER = 'abcdefghjkmnpqrstuvwxyz', UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ', DIGITS = '23456789';
  function makeCode(n, mixed) {
    const pool = mixed ? LOWER + UPPER + DIGITS : LOWER + DIGITS;
    for (;;) {
      let c = '';
      for (let i = 0; i < n; i++) c += pick(pool);
      if (!mixed || (/[a-z]/.test(c) && /[A-Z]/.test(c))) return c;
    }
  }
  const RETYPE = {
    easy:   { desc: 'Easy: 4 characters, lowercase', sub: 'Lowercase letters and numbers', gen: () => makeCode(4, false) },
    medium: { desc: 'Medium: 6 characters, mixed case', sub: 'Match upper and lower case', gen: () => makeCode(6, true) },
    hard:   { desc: 'Hard: 8 characters, mixed case', sub: 'Match upper and lower case', gen: () => makeCode(8, true) },
  };

  // Saved barcode / QR code for the Scan challenge (lives on this phone, shared by all alarms)
  const CODE_KEY = 'alarm-code-v1';
  let savedCode = null;
  try { savedCode = JSON.parse(localStorage.getItem(CODE_KEY)); } catch (e) {}
  const persistCode = () => { try { localStorage.setItem(CODE_KEY, JSON.stringify(savedCode)); } catch (e) {} };

  const CH = {
    math: {
      title: 'Math', sub: 'Solve a few sums', icon: ICONS.math, levels: true, keepSpace: true,
      countLabel: 'Problems', min: 1, max: 10, step: 1, ringLabel: 'Solve to dismiss',
      sample: (c) => MATH[c.level].gen().text,
      card: (c) => `<div class="m-cap">Preview</div><div class="m-problem">${c._sample}</div><div class="m-desc">${MATH[c.level].desc}</div>`,
      summary: (c) => `Math · ${LV[c.level]} · ${plural(c.count, 'problem')}`,
      doneText: (c, s) => `${c.count} of ${c.count} solved in ${fmtSecs(s)}`,
      mount: mountMath,
    },
    retype: {
      title: 'Retype', sub: 'Copy a short code', icon: ICONS.retype, levels: true, keepSpace: true,
      countLabel: 'Codes', min: 1, max: 5, step: 1, ringLabel: 'Type to dismiss',
      sample: (c) => RETYPE[c.level].gen(),
      card: (c) => `<div class="m-cap">Preview</div><div class="m-problem code">${c._sample}</div><div class="m-desc">${RETYPE[c.level].desc}</div>`,
      summary: (c) => `Retype · ${LV[c.level]} · ${plural(c.count, 'code')}`,
      doneText: (c, s) => `${c.count === 1 ? 'Code' : plural(c.count, 'code')} typed correctly in ${fmtSecs(s)}`,
      mount: mountRetype,
    },
    steps: {
      title: 'Steps', sub: 'Walk to switch it off', icon: ICONS.steps, levels: true, perm: 'activity',
      levelCounts: { easy: 10, medium: 20, hard: 40 },
      countLabel: 'Steps to walk', min: 5, max: 200, step: 5, ringLabel: 'Walk to dismiss',
      ready: () => hasPerm('activity'),
      card: (c) => hasPerm('activity')
        ? `<div class="m-cap">Preview</div><div class="m-ico">${ICONS.steps}</div><div class="m-problem tight">${c.count} steps</div><div class="m-desc">${LV[c.level]}: about ${fmtSecs(c.count)}</div>`
        : `<div class="pc-head"><span class="pc-ico">${ICONS.steps}</span><div class="pc-title">Steps needs physical<br>activity access</div></div>
           <div class="pc-sub">Only your step count is used, on your phone.</div>
           <button class="btn-chip" data-act="allow-activity">Allow access</button>`,
      summary: (c) => `Steps · ${LV[c.level]} · ${plural(c.count, 'step')}`,
      doneText: (c, s) => `${c.count} of ${c.count} steps in ${fmtSecs(s)}`,
      mount: (el, ctx) => mountMotion(el, ctx, 'steps'),
    },
    shake: {
      title: 'Shake', sub: 'Shake your phone', icon: ICONS.shake, levels: true,
      levelCounts: { easy: 15, medium: 25, hard: 40 },
      countLabel: 'Shakes', min: 5, max: 100, step: 5, ringLabel: 'Shake to dismiss',
      card: (c) => `<div class="m-cap">Preview</div><div class="m-ico">${ICONS.shake}</div><div class="m-problem tight">${c.count} shakes</div><div class="m-desc">${LV[c.level]}: about ${fmtSecs(Math.max(1, Math.round(c.count * 0.6)))}</div>`,
      summary: (c) => `Shake · ${LV[c.level]} · ${plural(c.count, 'shake')}`,
      doneText: (c, s) => `${plural(c.count, 'shake')} in ${fmtSecs(s)}`,
      mount: (el, ctx) => mountMotion(el, ctx, 'shake'),
    },
    scan: {
      title: 'Scan code', sub: 'Scan a code you saved', icon: ICONS.scan, levels: false, perm: 'camera',
      countLabel: 'Codes to scan', min: 1, max: 3, step: 1, ringLabel: 'Scan to dismiss',
      ready: () => !!savedCode,
      card: () => savedCode
        ? `<div class="sc-row"><span class="pc-ico">${ICONS.scan}</span>
             <div class="grow"><div class="pc-title">${esc(savedCode.name)}</div><div class="pc-sub">Saved on this phone</div></div>
             <button class="link" data-act="save-code">Change</button></div>
           <div class="pc-sub" style="margin-top:14px">Scan this code to switch the alarm off</div>`
        : `<div class="pc-head"><span class="pc-ico">${ICONS.scan}</span><div class="pc-title">No code saved yet</div></div>
           <div class="pc-sub">Save a barcode or QR code away from your bed, like the one on your shampoo bottle.</div>
           <button class="btn-chip" data-act="save-code">Save a code</button>`,
      summary: (c) => `Scan code · ${plural(c.count, 'code')}`,
      doneText: (c, s) => `Scanned ${savedCode ? savedCode.name : 'your code'}${c.count > 1 ? ` ${c.count} times` : ''} in ${fmtSecs(s)}`,
      mount: mountScan,
    },
  };
  const cfgFor = (a, type) => ({ ...CC_DEFAULTS[type], ...(a.cc && a.cc[type]) });
  function challengeSummary(a) {
    const T = CH[a.challenge];
    return T ? T.summary(cfgFor(a, a.challenge)) : '';
  }

  // ---------- Android permissions (simulated system dialogs) ----------
  const PERM_KEY = 'alarm-perms-v1';
  let perms = {};
  try { perms = JSON.parse(localStorage.getItem(PERM_KEY)) || {}; } catch (e) {}
  const sessionPerms = {};
  const hasPerm = (k) => perms[k] === 'granted' || sessionPerms[k] === 'granted';
  const PERM_TEXT = {
    activity: { icon: ICONS.steps, text: 'access your physical activity?', buttons: [['granted', 'Allow'], ['denied', 'Don’t allow']] },
    camera: { icon: ICONS.camera, text: 'take pictures and record video?', buttons: [['granted', 'While using the app'], ['once', 'Only this time'], ['denied', 'Don’t allow']] },
    notifications: { icon: ICONS.bell, text: 'send you notifications?', buttons: [['granted', 'Allow'], ['denied', 'Don’t allow']] },
  };
  function askPermission(kind) {
    if (hasPerm(kind)) return Promise.resolve(true);
    const p = PERM_TEXT[kind];
    return showDialog(`<div class="pd-icon">${p.icon}</div>
      <div class="pd-title">Allow <b>Alarm</b> to ${p.text}</div>
      <div class="pd-buttons">${p.buttons.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')}</div>`)
      .then((v) => {
        if (v === 'once') sessionPerms[kind] = 'granted';
        else if (v) { perms[kind] = v; try { localStorage.setItem(PERM_KEY, JSON.stringify(perms)); } catch (e) {} }
        const ok = v === 'granted' || v === 'once';
        // iOS Safari gates motion sensors behind its own prompt
        if (ok && kind === 'activity' && window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) {
          DeviceMotionEvent.requestPermission().catch(() => {});
        }
        return ok;
      });
  }
  // Resolves with the clicked button's data-v, or null when the scrim is tapped
  function showDialog(html, onMount, cls = '') {
    const el = $('#dialog');
    el.innerHTML = `<div class="pd-card ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    screen.classList.add('dialog-on');
    const ret = onMount ? onMount(el) : null;
    return new Promise((res) => {
      el.onclick = (e) => {
        const b = e.target.closest('button[data-v]');
        if (!b && e.target !== el) return;
        screen.classList.remove('dialog-on');
        el.onclick = null;
        res(b ? (ret ? ret(b.dataset.v) : b.dataset.v) : null);
      };
    });
  }
  function askCodeName() {
    return showDialog(`<div class="pd-title left">Name this code</div>
      <div class="pd-sub">You’ll scan it to turn off the alarm.</div>
      <input class="pd-input" maxlength="24" placeholder="e.g. Shampoo bottle" aria-label="Code name">
      <div class="pd-actions"><button data-v="cancel">Cancel</button><button data-v="save">Save</button></div>`, (el) => {
      const input = el.querySelector('input');
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.querySelector('[data-v=save]').click(); });
      setTimeout(() => input.focus(), 60);
      return (v) => v === 'save' ? (input.value.trim() || 'Saved code') : null;
    });
  }

  // ---------- Picker ----------
  const PICKER = [{ id: 'none', title: 'No challenge', sub: 'Alarm stops with Dismiss' },
    ...Object.entries(CH).map(([id, T]) => ({ id, title: T.title, sub: T.sub }))];
  let pickedChallenge = 'none';

  $('#challengeList').innerHTML = PICKER.map(c => `
    <button class="ch-opt" role="radio" data-id="${c.id}">
      <span class="ico">${colorIcon(c.id)}</span>
      <span class="txt"><div class="t">${c.title}</div><div class="s">${c.sub}</div></span>
      <span class="radio"></span>
    </button>`).join('');
  function renderChallengeList() {
    document.querySelectorAll('.ch-opt').forEach(b => b.setAttribute('aria-checked', b.dataset.id === pickedChallenge));
  }
  $('#challengeList').addEventListener('click', (e) => {
    const b = e.target.closest('.ch-opt');
    if (!b) return;
    pickedChallenge = b.dataset.id;
    renderChallengeList();
  });
  $('#challengeTile').onclick = () => {
    endNudge();
    stopSound();
    pickedChallenge = draft.challenge || 'none';
    renderChallengeList();
    screen.classList.add('choosing');
  };
  $('#challengeBack').onclick = () => screen.classList.remove('choosing');
  $('#challengeContinue').onclick = () => {
    if (pickedChallenge !== 'none') return openSetup(pickedChallenge);
    const target = draft, prev = draft.challenge;
    draft.challenge = 'none';
    syncEditor();
    screen.classList.remove('choosing');
    if (prev !== 'none') toast('Challenge removed', { label: 'Undo', run: () => { if (draft === target) { draft.challenge = prev; syncEditor(); } } });
  };
  $('#challengeRemove').onclick = () => {
    showDialog(`<div class="ap-title">Remove challenge?</div>
      <div class="ap-body">This alarm will ring with a normal Dismiss button.</div>
      <div class="ap-actions"><button class="ap-keep" data-v="keep">Keep</button><button class="ap-remove" data-v="remove">Remove</button></div>`, null, 'app')
      .then((v) => {
        if (v !== 'remove' || !draft) return;
        draft.challenge = 'none';
        syncEditor();
        toast('Challenge removed');
      });
  };

  // ---------- Setup screen ----------
  let setupType = 'math', setupCfg = {};
  function openSetup(type) {
    setupType = type;
    setupCfg = cfgFor(draft, type);
    resample();
    renderSetup();
    $('#setupView .scroll').scrollTop = 0;
    screen.classList.add('setting');
  }
  const resample = () => { const T = CH[setupType]; if (T.sample) setupCfg._sample = T.sample(setupCfg); };
  function renderSetup() {
    const T = CH[setupType], c = setupCfg;
    $('#setupTitle').textContent = T.title;
    let html = '';
    if (T.levels) {
      html += `<div class="m-label">Difficulty</div><div class="seg" role="radiogroup" aria-label="Difficulty">${
        Object.keys(LV).map(l => `<button role="radio" data-level="${l}" aria-checked="${c.level === l}">${LV[l]}</button>`).join('')}</div>`;
    }
    html += `<div class="m-card">${T.card(c)}</div>
      <div class="m-card row"><span style="font-size:15px">${T.countLabel}</span>
        <div class="stepper">
          <button data-step="-1" aria-label="Fewer" ${c.count <= T.min ? 'disabled' : ''}>${ICONS.minus}</button>
          <span>${c.count}</span>
          <button data-step="1" aria-label="More" ${c.count >= T.max ? 'disabled' : ''}>${ICONS.plus}</button>
        </div></div>`;
    $('#setupBody').innerHTML = html;
    const ready = T.ready ? T.ready(c) : true;
    $('#setupTest').disabled = $('#setupSet').disabled = !ready;
  }
  $('#setupBody').addEventListener('click', (e) => {
    const T = CH[setupType], c = setupCfg;
    const lvl = e.target.closest('[data-level]'), step = e.target.closest('[data-step]'), act = e.target.closest('[data-act]');
    if (lvl) {
      c.level = lvl.dataset.level;
      if (T.levelCounts) c.count = T.levelCounts[c.level];
      resample();
      renderSetup();
    } else if (step) {
      c.count = Math.min(T.max, Math.max(T.min, c.count + T.step * +step.dataset.step));
      renderSetup();
    } else if (act && act.dataset.act === 'allow-activity') {
      askPermission('activity').then((ok) => {
        renderSetup();
        if (!ok) toast('Steps can’t count without activity access');
      });
    } else if (act && act.dataset.act === 'save-code') {
      saveCodeFlow().then(renderSetup);
    }
  });
  $('#setupBack').onclick = () => screen.classList.remove('setting');
  $('#setupTest').onclick = () => openSolver(setupType, setupCfg, 'test');
  $('#setupSet').onclick = setChallenge;

  function setChallenge() {
    const target = draft;
    const prev = { challenge: draft.challenge, cc: JSON.parse(JSON.stringify(draft.cc)) };
    const { _sample, ...cfg } = setupCfg;
    draft.challenge = setupType;
    draft.cc[setupType] = cfg;
    lsSet(USED_KEY, '1');
    closePanel(true);
    screen.classList.remove('choosing', 'setting');
    syncEditor();
    toast('Wake-up challenge set', { label: 'Undo', run: () => { if (draft === target) { Object.assign(draft, prev); syncEditor(); } } });
  }

  // ---------- Full-screen panel (solver, save a code) ----------
  let panel = null; // { ctx, cleanup, onClose }
  function openPanel({ banner, mount, onClose }) {
    closePanel(true);
    $('#svSolve').hidden = false;
    $('#svDone').hidden = true;
    const b = $('#svBanner');
    b.classList.toggle('off', banner === '');
    b.classList.toggle('gone', banner == null);
    if (banner) b.textContent = banner;
    $('#svTitle').textContent = '';
    const body = $('#svBody');
    body.innerHTML = '';
    const ctx = { title: (t) => { $('#svTitle').textContent = t; }, onKey: null };
    panel = { ctx, onClose };
    panel.cleanup = mount(body, ctx) || null;
    screen.classList.add('solving');
    $('#solver').setAttribute('aria-hidden', 'false');
    return ctx;
  }
  function stopPanel() {
    if (panel && panel.cleanup) { panel.cleanup(); panel.cleanup = null; }
  }
  function closePanel(silent) {
    const p = panel;
    stopPanel();
    panel = null;
    screen.classList.remove('solving');
    $('#solver').setAttribute('aria-hidden', 'true');
    if (p && !silent && p.onClose) p.onClose();
  }
  $('#svClose').onclick = () => closePanel(); // live: back to the ringing screen
  document.addEventListener('keydown', (e) => {
    if (screen.classList.contains('dialog-on') || !panel || !panel.ctx.onKey || $('#svSolve').hidden) return;
    panel.ctx.onKey(e);
  });

  // Solver — mode is 'test' (from setup), 'preview' (editor preview) or 'live' (real alarm)
  let solveState = null;
  function openSolver(type, cfg, mode, onSolved) {
    const T = CH[type];
    solveState = { type, cfg: { ...cfg }, mode, onSolved, start: Date.now() };
    const banner = mode === 'test' ? 'Test mode: your alarm isn’t affected'
      : mode === 'preview' ? 'Preview: your alarm isn’t affected' : (T.keepSpace ? '' : null);
    const state = solveState;
    openPanel({
      banner,
      mount: (el, ctx) => {
        ctx.cfg = state.cfg;
        ctx.mode = mode;
        ctx.finish = () => finishSolve(ctx);
        return T.mount(el, ctx);
      },
    });
  }
  function finishSolve(ctx) {
    if (!panel || panel.ctx !== ctx) return;
    const s = solveState, T = CH[s.type];
    const secs = Math.max(1, Math.round((Date.now() - s.start) / 1000));
    if (s.mode !== 'test') {
      // Silence the alarm right away, celebrate for a moment, then dismiss
      stopPanel();
      stopSound();
      $('#winSub').textContent = s.mode === 'preview' ? 'Preview complete. Your alarm isn’t affected.' : 'Good morning! Your alarm is off.';
      $('#winTick').innerHTML = TICK;
      $('#win').classList.add('show');
      screen.classList.add('win-on');
      confetti($('#winTick'));
      playSuccessPop();
      setTimeout(() => {
        closePanel(true);
        if (s.onSolved) s.onSolved();
        $('#win').classList.remove('show');
        screen.classList.remove('win-on');
      }, 2200);
      return;
    }
    stopPanel();
    $('#doneStats').textContent = T.doneText(s.cfg, secs);
    $('#doneSummary').textContent = T.summary(s.cfg);
    $('#doneTick').innerHTML = TICK; // fresh markup restarts the animation
    $('#svSolve').hidden = true;
    $('#svDone').hidden = false;
    confetti($('#doneTick'));
    playSuccessPop();
  }

  // Glowing tick: circle pops, check draws, rings burst, glow breathes
  const TICK = `<div class="tick"><span class="tick-glow"></span><span class="tick-ring"></span><span class="tick-ring r2"></span>
    <svg viewBox="0 0 96 96" aria-hidden="true"><circle class="tick-bg" cx="48" cy="48" r="46"/><path class="tick-path" d="M29 49.5l13 13L68 36"/></svg></div>`;

  // Light confetti burst from an element, drawn on a throwaway canvas
  function confetti(from) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    screen.appendChild(cv);
    const W = screen.clientWidth, H = screen.clientHeight, dpr = 2;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    const sr = screen.getBoundingClientRect(), r = from.getBoundingClientRect();
    const ox = ((r.left + r.width / 2 - sr.left) / sr.width) * W;
    const oy = ((r.top + r.height / 2 - sr.top) / sr.height) * H;
    const COLORS = ['#3b32d8', '#7b73ff', '#f0ad2b', '#4fc28d', '#e46c3c', '#8d72ee', '#5f9df0', '#ffc0d6'];
    const parts = Array.from({ length: 64 }, () => {
      const ang = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.3, sp = 4 + Math.random() * 6;
      return {
        x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.5,
        w: 4 + Math.random() * 4, h: 6 + Math.random() * 5, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .3,
        c: COLORS[rnd(0, COLORS.length - 1)], round: Math.random() < .3, wob: Math.random() * 6.28,
      };
    });
    const t0 = performance.now(), LIFE = 2600;
    const frame = (now) => {
      const t = now - t0;
      g.clearRect(0, 0, W, H);
      g.globalAlpha = t > LIFE - 700 ? Math.max(0, (LIFE - t) / 700) : 1;
      for (const p of parts) {
        p.vx *= .985; p.vy = p.vy * .985 + .22;
        p.wob += .12;
        p.x += p.vx + Math.sin(p.wob) * .6; p.y += p.vy; p.rot += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.c;
        if (p.round) { g.beginPath(); g.arc(0, 0, p.w / 2, 0, 6.28); g.fill(); }
        else g.fillRect(-p.w / 2, -p.h / 2 * Math.abs(Math.cos(p.wob)), p.w, p.h * Math.abs(Math.cos(p.wob)));
        g.restore();
      }
      if (t < LIFE) requestAnimationFrame(frame); else cv.remove();
    };
    requestAnimationFrame(frame);
  }
  $('#doneBack').onclick = () => closePanel(true);
  $('#doneChange').onclick = () => closePanel(true);
  $('#doneAgain').onclick = () => openSolver(setupType, setupCfg, 'test');
  $('#doneSet').onclick = setChallenge;

  const retrigger = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };

  // ----- Math -----
  function mountMath(el, ctx) {
    const { level, count } = ctx.cfg, M = MATH[level];
    let i = 0, input = '', error = false, p = M.gen();
    el.innerHTML = `
      <div class="sv-problem"></div>
      <div class="sv-eq">= ?</div>
      <div class="sv-answer" aria-live="polite"></div>
      <div class="sv-hint"></div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}
        <button data-k="back" aria-label="Delete">${ICONS.back}</button><button data-k="0">0</button><button data-k="ok" class="ok">OK</button></div>
      <div class="sv-foot">Solve ${plural(count, 'problem')} to finish</div>`;
    const q = (s) => el.querySelector(s);
    const render = (animate) => {
      ctx.title(`Problem ${i + 1} of ${count}`);
      q('.sv-problem').textContent = p.text;
      if (animate) retrigger(q('.sv-problem'), 'next');
      q('.sv-answer').textContent = input;
      q('.sv-answer').classList.toggle('error', error);
      q('.sv-hint').textContent = error ? 'Not quite. Try again' : M.hint;
      q('.sv-hint').classList.toggle('error', error);
    };
    const key = (k) => {
      if (k === 'ok') {
        if (!input) return retrigger(q('.sv-answer'), 'shake');
        if (+input === p.ans) {
          if (++i >= count) return ctx.finish();
          p = M.gen();
          input = '';
          return render(true);
        }
        error = true;
        render();
        return retrigger(q('.sv-answer'), 'shake');
      }
      // Typing after a wrong answer starts fresh
      if (error) { input = ''; error = false; }
      if (k === 'back') input = input.slice(0, -1);
      else if (input.length < 4) input += k;
      render();
    };
    q('.keypad').onclick = (e) => { const b = e.target.closest('button'); if (b) key(b.dataset.k); };
    ctx.onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) key(e.key);
      else if (e.key === 'Backspace') key('back');
      else if (e.key === 'Enter') { e.preventDefault(); key('ok'); }
    };
    render();
  }

  // ----- Retype -----
  function mountRetype(el, ctx) {
    const { level, count } = ctx.cfg, R = RETYPE[level];
    let i = 0, code = R.gen(), input = '', errAt = -1, msg = '', shift = false;
    el.innerHTML = `
      <div class="rt-code" aria-label="Code to type"></div>
      <div class="rt-sub">${R.sub}</div>
      <div class="rt-input" aria-live="polite"></div>
      <div class="sv-hint"></div>
      <div class="kb"></div>
      <div class="sv-foot">${count === 1 ? 'Copy the code to finish' : `Copy ${count} codes to finish`}</div>`;
    const q = (s) => el.querySelector(s);
    const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    const drawKb = () => {
      q('.kb').innerHTML = ROWS.map((r, ri) => `<div class="kb-row">${
        ri === 3 ? `<button class="kb-wide kb-shift ${shift ? 'on' : ''}" data-k="shift" aria-label="Shift">${ICONS.shift}</button>` : ''}${
        [...r].map(ch => { const c = shift ? ch.toUpperCase() : ch; return `<button data-k="${c}">${c}</button>`; }).join('')}${
        ri === 3 ? `<button class="kb-wide" data-k="back" aria-label="Delete">${ICONS.del}</button>` : ''}</div>`).join('') +
        `<div class="kb-row"><button class="kb-space" data-k=" ">space</button><button class="kb-ok" data-k="ok">OK</button></div>`;
    };
    const spans = (str, bad = -1) => [...str].map((ch, j) => `<span class="${j === bad ? 'bad' : ''}">${ch === ' ' ? '␣' : esc(ch)}</span>`).join('');
    const render = (animate) => {
      ctx.title(`Code ${i + 1} of ${count}`);
      q('.rt-code').innerHTML = spans(code);
      if (animate) retrigger(q('.rt-code'), 'next');
      q('.rt-input').innerHTML = input ? spans(input, errAt) : '<i class="caret"></i>';
      q('.rt-input').classList.toggle('error', errAt >= 0 || !!msg);
      q('.sv-hint').textContent = msg || 'Type the code exactly as shown';
      q('.sv-hint').classList.toggle('error', !!msg);
    };
    const check = () => {
      if (input === code) {
        if (++i >= count) return ctx.finish();
        code = R.gen();
        input = '';
        return render(true);
      }
      let at = [...code].findIndex((ch, j) => input[j] !== ch);
      if (at === -1) at = code.length;
      if (at < input.length && at < code.length && input[at].toLowerCase() === code[at].toLowerCase()) msg = `Case doesn’t match: check the ${ordinal(at + 1)} letter`;
      else if (at >= input.length) msg = `Too short: the code has ${code.length} characters`;
      else if (at >= code.length) msg = `Too long: the code has ${code.length} characters`;
      else msg = `Not quite: check the ${ordinal(at + 1)} character`;
      errAt = at < input.length ? at : -1;
      render();
      retrigger(q('.rt-input'), 'shake');
    };
    const key = (k, physical) => {
      if (k === 'shift') { shift = !shift; return drawKb(); }
      if (k === 'ok') return check();
      errAt = -1; msg = '';
      if (k === 'back') input = input.slice(0, -1);
      else if (input.length < code.length + 2) {
        input += k;
        if (shift && !physical) { shift = false; drawKb(); } // one-shot shift, like Gboard
      }
      render();
    };
    q('.kb').onclick = (e) => { const b = e.target.closest('button'); if (b) key(b.dataset.k); };
    ctx.onKey = (e) => {
      if (/^[a-zA-Z0-9 ]$/.test(e.key)) { e.preventDefault(); key(e.key, true); }
      else if (e.key === 'Backspace') key('back');
      else if (e.key === 'Enter') { e.preventDefault(); key('ok'); }
    };
    drawKb();
    render();
  }

  // ----- Steps + Shake (device motion, with a hold-to-simulate fallback) -----
  function mountMotion(el, ctx, kind) {
    const total = ctx.cfg.count, isSteps = kind === 'steps', live = ctx.mode === 'live';
    ctx.title(isSteps ? (live ? 'Walk to dismiss' : 'Walk to test') : (live ? 'Shake to dismiss' : 'Shake to test'));
    const R = 98, C = 2 * Math.PI * R;
    el.innerHTML = `
      <div class="mo-ring">
        <svg viewBox="0 0 224 224"><circle cx="112" cy="112" r="${R}" class="trk"/><circle cx="112" cy="112" r="${R}" class="prg" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
        <div class="mo-num"><b aria-live="polite">0</b><span>of ${plural(total, isSteps ? 'step' : 'shake')}</span></div>
      </div>
      <div class="mo-instr">${isSteps ? 'Keep walking with your phone in hand' : 'Shake your phone up and down'}</div>
      <div class="mo-warn" hidden>
        <div class="t">${isSteps ? 'We can’t detect steps' : 'Shake a bit harder'}</div>
        <div class="s">${isSteps ? 'Hold your phone while you walk.' : 'Gentle movements don’t count.'}</div>
      </div>
      <button class="sim" type="button">${isSteps ? 'No sensor? Hold to simulate walking' : 'No sensor? Tap or hold to simulate'}</button>
      <div class="sv-foot pinned">${isSteps ? 'Step counting stays on your phone' : 'Motion data stays on your phone'}</div>`;
    const q = (s) => el.querySelector(s);
    const num = q('.mo-num b'), prg = q('.prg'), warn = q('.mo-warn');
    let n = 0, last = Date.now(), done = false;
    const bump = () => {
      if (done) return;
      n++;
      last = Date.now();
      warn.hidden = true;
      num.textContent = n;
      retrigger(num, 'bump');
      prg.style.strokeDashoffset = C * (1 - n / total);
      if (n >= total) { done = true; clearInterval(simT); setTimeout(ctx.finish, 450); }
    };

    // Sensors: steps = peaks in total acceleration; shakes = hard jolts
    let avg = 9.8, above = false, lastHit = 0, gentleAt = 0;
    const onMotion = (e) => {
      const now = Date.now();
      if (isSteps) {
        const g = e.accelerationIncludingGravity;
        if (!g || g.x == null) return;
        const mag = Math.hypot(g.x, g.y, g.z);
        avg = avg * 0.9 + mag * 0.1;
        if (!above && mag > avg + 1.6 && now - lastHit > 300) { above = true; lastHit = now; bump(); }
        else if (above && mag < avg) above = false;
      } else {
        const a = e.acceleration && e.acceleration.x != null ? e.acceleration : null;
        const g = e.accelerationIncludingGravity;
        const mag = a ? Math.hypot(a.x, a.y, a.z) : g && g.x != null ? Math.abs(Math.hypot(g.x, g.y, g.z) - 9.8) : 0;
        if (mag > 14 && now - lastHit > 250) { lastHit = now; bump(); }
        else if (mag > 5) gentleAt = now;
      }
    };
    window.addEventListener('devicemotion', onMotion);
    const watch = setInterval(() => {
      if (done) return;
      const now = Date.now(), idle = now - last;
      warn.hidden = isSteps ? idle < 5000 : !((now - gentleAt < 1500 && idle > 1500) || idle > 5000);
    }, 500);

    const sim = q('.sim');
    let simT;
    sim.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      bump();
      clearInterval(simT);
      simT = setInterval(bump, isSteps ? 450 : 220);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => sim.addEventListener(ev, () => clearInterval(simT)));
    ctx.onKey = (e) => { if (e.key === ' ') { e.preventDefault(); bump(); } };
    return () => { window.removeEventListener('devicemotion', onMotion); clearInterval(watch); clearInterval(simT); };
  }

  // ----- Scan code -----
  const VIEWFINDER = `<div class="vf"><video playsinline muted></video>
    <div class="vf-glyph"><svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="5" y="5" width="5" height="5" rx=".6"/><rect x="14" y="5" width="5" height="5" rx=".6"/><rect x="5" y="14" width="5" height="5" rx=".6"/></svg></div>
    <div class="vf-scanline"></div><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>`;
  // Starts the real camera (and BarcodeDetector where the browser has it). Returns a stop function.
  function startCamera(el, onCode) {
    const vf = el.querySelector('.vf'), video = vf.querySelector('video');
    let stream = null, stopped = false;
    (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) return stream.getTracks().forEach(t => t.stop());
        video.srcObject = stream;
        await video.play();
        vf.classList.add('live');
        if (!('BarcodeDetector' in window)) return;
        const det = new BarcodeDetector();
        const loop = async () => {
          if (stopped) return;
          try { const r = await det.detect(video); if (r[0]) onCode(r[0].rawValue); } catch (e) {}
          setTimeout(loop, 350);
        };
        loop();
      } catch (e) { /* no camera: the simulate buttons still work */ }
    })();
    return () => { stopped = true; if (stream) stream.getTracks().forEach(t => t.stop()); };
  }
  function withCamera(el, onCode) {
    let stop = null, alive = true;
    const go = () => { if (alive) stop = startCamera(el, onCode); };
    if (hasPerm('camera')) go();
    else askPermission('camera').then(ok => ok ? go() : toast('Camera access is needed to scan'));
    return () => { alive = false; if (stop) stop(); };
  }

  function mountScan(el, ctx) {
    const total = ctx.cfg.count, code = savedCode || { name: 'your code', value: '' };
    ctx.title('Scan code');
    el.innerHTML = `${VIEWFINDER}
      <div class="sc-err" hidden><div class="t">That’s not your saved code</div><div class="s">Try again</div></div>
      <div class="sc-cap"></div>
      <div class="sims"><button class="sim" data-sim="ok">Simulate: ${esc(code.name)}</button><button class="sim" data-sim="bad">Simulate: other code</button></div>`;
    const q = (s) => el.querySelector(s);
    const vf = q('.vf'), err = q('.sc-err');
    let n = 0, lastAt = 0, lastVal = '', done = false;
    const caption = () => {
      q('.sc-cap').textContent = total > 1 && n > 0 ? `Scan ${code.name} again (${n} of ${total})` : `Scan ${code.name} to finish`;
    };
    const onCode = (v) => {
      const now = Date.now();
      if (done || (v === lastVal && now - lastAt < 1500)) return; // same code held in view
      lastVal = v; lastAt = now;
      if (v === code.value) {
        n++;
        err.hidden = true;
        vf.classList.remove('error');
        vf.classList.add('ok');
        if (n >= total) { done = true; setTimeout(ctx.finish, 400); }
        else setTimeout(() => vf.classList.remove('ok'), 600);
        caption();
      } else {
        vf.classList.remove('ok');
        vf.classList.add('error');
        err.hidden = false;
      }
    };
    q('.sims').onclick = (e) => {
      const b = e.target.closest('[data-sim]');
      if (b) { lastVal = ''; onCode(b.dataset.sim === 'ok' ? code.value : 'OTHER-' + rnd(1000, 9999)); }
    };
    caption();
    return withCamera(el, onCode);
  }

  // Save a code: camera access → viewfinder → name it
  function saveCodeFlow() {
    return askPermission('camera').then((ok) => {
      if (!ok) { toast('Camera access is needed to save a code'); return false; }
      return new Promise((res) => {
        openPanel({
          banner: null,
          onClose: () => res(false),
          mount: (el, ctx) => {
            ctx.title('Save a code');
            el.innerHTML = `${VIEWFINDER}
              <div class="sc-cap">Point your camera at a barcode or QR code</div>
              <div class="sims"><button class="sim" data-sim="new">Simulate a scan</button></div>
              <button class="btn-outline sv-cancel" data-act="cancel">Cancel</button>`;
            let got = false;
            const onCode = (v) => {
              if (got) return;
              got = true;
              el.querySelector('.vf').classList.add('ok');
              setTimeout(() => {
                stopPanel();
                askCodeName().then((name) => {
                  if (name == null) return closePanel();
                  savedCode = { name, value: v };
                  persistCode();
                  closePanel(true);
                  toast(`Saved “${name}”`);
                  res(true);
                });
              }, 350);
            };
            el.onclick = (e) => {
              if (e.target.closest('[data-sim]')) onCode('CODE-' + Date.now().toString(36));
              else if (e.target.closest('[data-act=cancel]')) closePanel();
            };
            return startCamera(el, onCode);
          },
        });
      });
    });
  }

  // ---------- First-time nudge on the challenge card ----------
  // Until a challenge has ever been set, the card cycles through every challenge once a day
  // when it scrolls into view, then settles back to "Off".
  const NUDGE = [
    ['math',   'Do quick math first',  'Math · wake your brain up',     'rgba(228,108,60,.5)'],
    ['retype', 'Retype a short code',  'Retype · no sleepy dismissing', 'rgba(95,157,240,.55)'],
    ['steps',  'Walk it off',          'Steps · get out of bed',        'rgba(79,194,141,.55)'],
    ['shake',  'Shake it off',         'Shake · a few hard shakes',     'rgba(141,114,238,.55)'],
    ['scan',   'Scan to switch it off','Scan · keep it in the bathroom','rgba(240,173,43,.6)'],
  ];
  const USED_KEY = 'alarm-ch-used', NUDGE_KEY = 'alarm-nudge-day';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  const challengeEverUsed = () => lsGet(USED_KEY) === '1' || alarms.some(a => CH[a.challenge]);
  let nudging = false, nudgeTimers = [];
  const later = (fn, ms) => nudgeTimers.push(setTimeout(fn, ms));

  function cardFullyVisible() {
    const r = $('#challengeCard').getBoundingClientRect();
    const s = $('#editScroll').getBoundingClientRect(), f = $('#editView .footer').getBoundingClientRect();
    return r.top >= s.top && r.bottom <= f.top + 4;
  }
  let forceNudge = false; // prototype sidebar: replay ignoring the once-ever / once-a-day rules
  function maybeNudge() {
    if (nudging || !draft || CH[draft.challenge] || (challengeEverUsed() && !forceNudge)) return;
    if (!screen.classList.contains('editing') || screen.classList.contains('choosing')) return;
    const today = new Date().toDateString();
    if ((lsGet(NUDGE_KEY) === today && !forceNudge) || !cardFullyVisible()) return;
    forceNudge = false;
    lsSet(NUDGE_KEY, today);
    nudging = true;
    const card = $('#challengeCard');
    card.classList.add('nudging');
    const step = (i) => {
      if (i < NUDGE.length) {
        const [type, title, sub, glow] = NUDGE[i];
        card.style.setProperty('--ng', glow);
        swapTile(type, title, sub);
        return later(() => step(i + 1), 1500);
      }
      card.classList.remove('nudging');
      swapTile('none', 'Wake-up challenge', 'Off · Dismiss stops the alarm');
      later(endNudge, 450);
    };
    later(() => step(0), 200);
  }
  function swapTile(type, title, sub) {
    const els = [$('#challengeTileTitle'), $('#challengeTileSub'), $('#challengeTileIcon')];
    els.forEach(el => { el.classList.remove('swap-in'); el.classList.add('swap-out'); });
    later(() => {
      els[0].textContent = title;
      els[1].textContent = sub;
      els[2].innerHTML = colorIcon(type);
      els.forEach(el => { el.classList.remove('swap-out'); retrigger(el, 'swap-in'); });
    }, 180);
  }
  function endNudge() {
    nudgeTimers.forEach(clearTimeout);
    nudgeTimers = [];
    if (!nudging) return;
    nudging = false;
    $('#challengeCard').classList.remove('nudging');
    ['#challengeTileTitle', '#challengeTileSub', '#challengeTileIcon'].forEach(s => $(s).classList.remove('swap-in', 'swap-out'));
    $('#challengeTileTitle').textContent = 'Wake-up challenge';
    syncEditor();
  }
  let nudgeWait = 0;
  $('#editScroll').addEventListener('scroll', () => {
    if (nudgeWait) return;
    nudgeWait = setTimeout(() => { nudgeWait = 0; maybeNudge(); }, 120);
  });

  $('#createBtn').onclick = () => openEditor(null);
  $('#backBtn').onclick = closeEditor;
  $('#deleteBtn').onclick = () => {
    const a = alarms.find(x => x.id === editingId);
    alarms = alarms.filter(x => x.id !== editingId);
    persist(); closeEditor(); renderList();
    toast(`Deleted “${a.label || 'Alarm'}”`);
  };
  $('#saveBtn').onclick = () => {
    // Android 13+ asks for notification access the first time an alarm is set
    if (!perms.notifications) return askPermission('notifications').then(saveAlarm);
    saveAlarm();
  };
  function saveAlarm() {
    if (!draft) return;
    draft.label = draft.label.trim();
    draft.enabled = true;
    draft.snoozeUntil = null;
    const idx = alarms.findIndex(x => x.id === editingId);
    if (idx >= 0) alarms[idx] = draft; else alarms.push(draft);
    const at = nextAt(draft);
    persist(); closeEditor(); renderList();
    toast(`Alarm set for ${fmtIn(at - new Date())} from now`);
  }
  $('#previewBtn').onclick = () => showRing(draft, true);

  // ---------- Ringing ----------
  let ringing = null; // { alarm, preview }
  function showRing(a, preview) {
    const { t, ap } = fmt(a.h, a.m);
    $('#rTime').innerHTML = `${t}<small>${ap}</small>`;
    $('#rLabel').textContent = a.label?.trim() || 'Alarm';
    $('#rDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    $('#rTag').hidden = !preview;
    $('#snoozeBtn').hidden = !a.snooze;
    const sum = challengeSummary(a);
    $('#dismissBtn').textContent = sum ? CH[a.challenge].ringLabel : 'Dismiss';
    $('#rCaption').textContent = sum;
    $('#rCaption').hidden = !sum;
    if (panel) closePanel(true);
    $('#toast').classList.remove('show');
    $('#ringing').setAttribute('aria-hidden', 'false');
    screen.classList.add('ring-on');
    ringing = { alarm: a, preview };
    startSound(a.sound, a.volume, { gradual: a.gradual, kind: 'ring', duration: preview ? 15000 : 0 });
    if (a.vibrate && navigator.vibrate) navigator.vibrate([400, 300, 400, 300, 400]);
  }
  function hideRing() {
    stopSound();
    if (navigator.vibrate) navigator.vibrate(0);
    screen.classList.remove('ring-on');
    $('#ringing').setAttribute('aria-hidden', 'true');
    ringing = null;
  }
  $('#dismissBtn').onclick = () => {
    if (!ringing) return;
    const a = ringing.alarm;
    const usable = CH[a.challenge] && !(a.challenge === 'scan' && !savedCode);
    if (usable) {
      return openSolver(a.challenge, cfgFor(a, a.challenge), ringing.preview ? 'preview' : 'live', () => {
        dismissAlarm();
      });
    }
    dismissAlarm();
  };
  function dismissAlarm() {
    if (!ringing) return;
    const { alarm: a, preview } = ringing;
    if (!preview) {
      const live = alarms.find(x => x.id === a.id);
      if (live) {
        live.snoozeUntil = null;
        if (!live.days.some(Boolean)) live.enabled = false;
        persist(); renderList();
      }
    }
    hideRing();
  }
  $('#snoozeBtn').onclick = () => {
    if (!ringing) return;
    const { alarm: a, preview } = ringing;
    if (!preview) {
      const live = alarms.find(x => x.id === a.id);
      if (live) { live.snoozeUntil = Date.now() + live.snoozeMin * 60000; persist(); renderList(); }
    }
    hideRing();
    toast(`Snoozed for ${a.snoozeMin} minutes${preview ? ' (preview)' : ''}`);
  };

  // ---------- Sound (Web Audio, no assets) ----------
  const PATTERNS = {
    Argon:  { len: 1.0, notes: [[0, 880, .12, 'square'], [.18, 880, .12, 'square']] },
    Carbon: { len: 1.6, notes: [[0, 523, .35, 'triangle'], [.2, 659, .35, 'triangle'], [.4, 784, .6, 'triangle']] },
    Helium: { len: 0.9, notes: [[0, 1320, .08, 'sine'], [.13, 1320, .08, 'sine'], [.26, 1320, .08, 'sine']] },
    Oxygen: { len: 2.2, notes: [[0, 440, 1.6, 'sine'], [0, 554, 1.6, 'sine'], [0, 659, 1.6, 'sine']] },
  };
  let ac, master, schedT, stopT, playing = null;
  function note(t, f, d, type) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(type === 'square' ? .12 : .3, t + .01);
    g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + d + .05);
  }
  function startSound(sound, vol, { gradual = false, duration = 0, kind = 'sample' } = {}) {
    stopSound();
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return; }
    master = ac.createGain();
    master.connect(ac.destination);
    const target = Math.max(.0001, (vol / 100) ** 1.5);
    const now = ac.currentTime;
    if (gradual) {
      master.gain.setValueAtTime(target * .08, now);
      master.gain.linearRampToValueAtTime(target, now + 30);
    } else master.gain.setValueAtTime(target, now);
    const p = PATTERNS[sound] || PATTERNS.Argon;
    let next = now + .05;
    const sched = () => {
      while (next < ac.currentTime + .5) {
        p.notes.forEach(([o, f, d, ty]) => note(next + o, f, d, ty));
        next += p.len;
      }
    };
    sched();
    schedT = setInterval(sched, 200);
    if (duration) stopT = setTimeout(stopSound, duration);
    playing = kind;
    if (kind === 'sample') { playBtn.innerHTML = STOP_ICON; playBtn.setAttribute('aria-label', 'Stop sound'); }
  }
  // Success sound for the tick: a soft bubble pop as the circle appears,
  // then a quiet two-note sparkle as the check finishes drawing
  function playSuccessPop() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { return; }
    const t = ac.currentTime + 0.02;
    const out = ac.createGain();
    out.gain.value = 0.35;
    out.connect(ac.destination);
    const pop = ac.createOscillator(), pg = ac.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(520, t);
    pop.frequency.exponentialRampToValueAtTime(140, t + 0.09);
    pg.gain.setValueAtTime(0.0001, t);
    pg.gain.exponentialRampToValueAtTime(0.9, t + 0.005);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    pop.connect(pg).connect(out);
    pop.start(t); pop.stop(t + 0.14);
    [[1046.5, 0.55], [1568, 0.63]].forEach(([f, d]) => {
      const s = ac.createOscillator(), sg = ac.createGain();
      s.type = 'triangle';
      s.frequency.value = f;
      sg.gain.setValueAtTime(0.0001, t + d);
      sg.gain.exponentialRampToValueAtTime(0.16, t + d + 0.01);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35);
      s.connect(sg).connect(out);
      s.start(t + d); s.stop(t + d + 0.4);
    });
    setTimeout(() => out.disconnect(), 1300);
  }
  function setLiveVolume(vol) {
    if (master && playing === 'sample') master.gain.setTargetAtTime(Math.max(.0001, (vol / 100) ** 1.5), ac.currentTime, .05);
  }
  function stopSound() {
    clearInterval(schedT); clearTimeout(stopT);
    if (master) {
      const m = master;
      m.gain.cancelScheduledValues(ac.currentTime);
      m.gain.setTargetAtTime(0, ac.currentTime, .03);
      setTimeout(() => m.disconnect(), 250);
      master = null;
    }
    playing = null;
    playBtn.innerHTML = PLAY_ICON; playBtn.setAttribute('aria-label', 'Play sound');
  }

  // ---------- Misc ----------
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    if (t.dataset.tab === 'Alarm') { if (screen.classList.contains('editing')) closeEditor(); return; }
    toast(`${t.dataset.tab} isn't part of this prototype — alarm flow only`);
  });
  $('#menuBtn').onclick = () => toast('Settings aren’t part of this prototype');

  // Fit the device to the window
  const phone = $('#phone'), stage = $('#stage');
  function fit() {
    const wrap = $('#stagewrap');
    const narrow = innerWidth <= 860;
    const availH = narrow ? innerHeight - 32 : wrap.clientHeight - 40;
    const availW = (narrow ? innerWidth : wrap.clientWidth) - 32;
    const s = Math.min(1, availH / 900, availW / 428);
    phone.style.transform = `scale(${s})`;
    stage.style.width = 428 * s + 'px';
    stage.style.height = 900 * s + 'px';
  }
  addEventListener('resize', fit);
  fit();

  // Tick: clock, live "rings in" text, and firing alarms
  let lastMinute = -1;
  const fired = new Set();
  function tick() {
    const now = new Date();
    const minuteKey = Math.floor(now.getTime() / 60000);
    if (minuteKey !== lastMinute) {
      lastMinute = minuteKey;
      renderClock(); renderList(); syncEditor();
    }
    if (ringing) return;
    for (const a of alarms) {
      if (!a.enabled) continue;
      const snoozeDue = a.snoozeUntil && now.getTime() >= a.snoozeUntil;
      const key = a.id + ':' + minuteKey;
      const due = now.getHours() === a.h && now.getMinutes() === a.m &&
        (!a.days.some(Boolean) || a.days[now.getDay()]) && !fired.has(key);
      if (snoozeDue || due) {
        fired.add(key);
        if (snoozeDue) { a.snoozeUntil = null; persist(); }
        showRing(a, false);
        break;
      }
    }
  }
  setInterval(tick, 1000);
  tick();

  // ---------- Prototype controls (used by the sidebar in sidebar.js) ----------
  function resetScreens() {
    if (screen.classList.contains('dialog-on')) $('#dialog').click();
    $('#win').classList.remove('show');
    screen.classList.remove('win-on');
    if (ringing) hideRing();
    closePanel(true);
    if (draft) closeEditor();
    $('#toast').classList.remove('show');
  }
  function openSetupFor(type) {
    resetScreens();
    openEditor(null);
    pickedChallenge = type;
    renderChallengeList();
    screen.classList.add('choosing');
    openSetup(type);
  }
  function scrollToCard(smooth) {
    const sc = $('#editScroll'), top = Math.max(0, $('#challengeCard').offsetTop - 300);
    sc.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  }
  window.proto = {
    icon: (t) => colorIcon(t),
    setup: openSetupFor,
    test(type) {
      openSetupFor(type);
      if (CH[type].ready && !CH[type].ready(setupCfg)) return toast('Turn on Permissions in the sidebar to test this');
      setTimeout(() => openSolver(type, setupCfg, 'test'), 350);
    },
    edit(type) {
      resetScreens();
      openEditor(null);
      draft.challenge = type;
      syncEditor();
      setTimeout(() => scrollToCard(true), 400);
    },
    ring(type) {
      resetScreens();
      const now = new Date();
      const a = alarm({ label: 'Alarm', h: now.getHours(), m: now.getMinutes(), challenge: type, gradual: true });
      if (type === 'scan' && !savedCode) toast('No saved code yet: turn on Permissions to scan');
      showRing(a, false);
    },
    permsOn: () => ['activity', 'camera', 'notifications'].every(k => perms[k] === 'granted') && !!savedCode,
    setPerms(on) {
      perms = on ? { activity: 'granted', camera: 'granted', notifications: 'granted' } : {};
      for (const k in sessionPerms) delete sessionPerms[k];
      savedCode = on ? { name: 'Shampoo bottle', value: 'DEMO-SHAMPOO' } : null;
      try { localStorage.setItem(PERM_KEY, JSON.stringify(perms)); } catch (e) {}
      persistCode();
      if (screen.classList.contains('setting')) renderSetup();
    },
    permDialog(kind) {
      const p = PERM_TEXT[kind];
      showDialog(`<div class="pd-icon">${p.icon}</div><div class="pd-title">Allow <b>Alarm</b> to ${p.text}</div>
        <div class="pd-buttons">${p.buttons.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')}</div>`);
    },
    saveCode() { openSetupFor('scan'); setTimeout(() => saveCodeFlow().then(renderSetup), 400); },
    newAlarm() { resetScreens(); openEditor(null); },
    nudgeState: () => ({ used: challengeEverUsed(), shownToday: lsGet(NUDGE_KEY) === new Date().toDateString() }),
    playNudge() {
      resetScreens();
      forceNudge = true;
      openEditor(null);
      setTimeout(() => scrollToCard(true), 450);
      setTimeout(() => { scrollToCard(false); maybeNudge(); }, 1300); // in case smooth scrolling is unavailable
    },
    realNudge() { resetScreens(); openEditor(null); toast('Scroll down to the Wake-up challenge card'); },
    resetNudge() {
      try { localStorage.removeItem(NUDGE_KEY); localStorage.removeItem(USED_KEY); } catch (e) {}
      alarms.forEach(a => { a.challenge = 'none'; });
      persist(); renderList();
    },
    resetAll() { try { localStorage.clear(); } catch (e) {} location.reload(); },
  };
})();
