(() => {
  const $ = (s) => document.querySelector(s);
  const screen = $('#screen'), coach = $('#coach'), hole = $('#hole'), text = $('#cmText');
  const tapPos = $('#tapPos'), dot = $('#tapDot'), done = $('#cmDone'), ring = $('#ring'), winTick = $('#winTick');
  const DONE_KEY = 'news-coach-done';

  // Positions are in screen pixels (360 wide); the design images start below the 32px status bar.
  const SB = 32;
  const STEPS = [
    { screen: 'feed', hole: { x: 28, y: SB + 51, w: 0, h: 0, r: 999 },
      tap: { x: 180, y: 815, mode: 'swipe' }, text: 'Swipe up for more news', textY: 628, center: true },
    { screen: 'feed', hole: { x: 5, y: SB + 28, w: 46, h: 46, r: 999 },
      text: 'Tap Menu to choose what<br>interests you', textY: SB + 96 },
    { screen: 'menu', hole: { x: 14, y: SB + 134, w: 332, h: 48, r: 16 },
      text: 'Choose a topic to see more<br>stories about that subject', textY: SB + 204 },
    { screen: 'feed', hole: { x: 180, y: SB + 158, w: 0, h: 0, r: 999 }, done: true },
  ];

  let step = -1;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };
  const reflow = (el) => void el.offsetWidth;

  function setMenu(open) {
    screen.classList.toggle('menu-open', open);
    $('#hotMenu').hidden = open;
    $('#hotBack').hidden = $('#hotTopics').hidden = !open;
  }
  // The spotlight hole and its neon ring share the same geometry and transitions
  function placeHole(h) {
    const geo = { left: h.x + 'px', top: h.y + 'px', width: h.w + 'px', height: h.h + 'px', borderRadius: h.r + 'px' };
    Object.assign(hole.style, geo);
    Object.assign(ring.style, geo);
    ring.classList.toggle('on', h.w > 0);
  }
  function placeTap(t, animate) {
    if (!animate) tapPos.style.transition = 'none';
    tapPos.style.transform = `translate(${t.x}px, ${t.y}px)`;
    dot.className = 'tap-dot ' + t.mode;
    tapPos.classList.toggle('swipe', t.mode === 'swipe');
    if (!animate) { reflow(tapPos); tapPos.style.transition = ''; }
  }

  function go(i) {
    const s = STEPS[i], prev = STEPS[step];
    step = i;
    setMenu(s.screen === 'menu');
    placeHole(s.hole);

    // Copy: fade the old line out, then bring the new one in
    text.classList.add('out');
    later(() => {
      if (!s.text) return;
      text.innerHTML = s.text;
      text.style.top = s.textY + 'px';
      text.classList.toggle('center', !!s.center);
      text.classList.remove('out');
    }, prev ? 230 : 60);

    // The swipe circle only lives on step 1; later steps glow around the spotlight instead
    if (s.tap) { placeTap(s.tap, false); tapPos.style.opacity = 1; }
    else tapPos.style.opacity = 0;

    done.classList.toggle('show', !!s.done);
    if (s.done) {
      winTick.classList.remove('show');
      reflow(winTick);
      later(() => winTick.classList.add('show'), 250);
      later(() => confetti(180, 610), 470); // as the disc lands
    }
  }

  function start() {
    clearTimers();
    step = -1;
    coach.hidden = false;
    done.classList.remove('show');
    winTick.classList.remove('show');
    text.classList.add('out');
    tapPos.style.opacity = 1;
    reflow(coach);
    coach.classList.add('show');
    go(0);
  }
  function finish() {
    clearTimers();
    coach.classList.remove('show');
    try { localStorage.setItem(DONE_KEY, '1'); } catch (e) {}
    later(() => {
      coach.hidden = true;
      dot.className = 'tap-dot';
      tapPos.classList.remove('swipe');
      winTick.classList.remove('show');
      setMenu(false);
    }, 360);
  }

  // Fluffy confetti: soft puffs that bloom and fade, plus confetti that bursts out, slows and floats down
  function confetti(ox, oy) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const W = 360, H = 852, dpr = 2;
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    cv.width = W * dpr; cv.height = H * dpr;
    screen.appendChild(cv);
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    const COLORS = ['#1ee86b', '#00e0ff', '#ffd400', '#ff2e88', '#9b4dff', '#ff7a00', '#2f7bff', '#5dff9e'];
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const parts = [];
    for (let i = 0; i < 16; i++) {          // puffs
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3.5;
      parts.push({ puff: true, x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 8 + Math.random() * 10,
        grow: .5 + Math.random() * .6, c: pick(['63,213,123', '90,225,145', '130,240,175', '40,190,100']), life: 700 + Math.random() * 400 });
    }
    for (let i = 0; i < 78; i++) {          // confetti
      const a = Math.random() * Math.PI * 2, sp = 5 + Math.random() * 9;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, w: 5 + Math.random() * 5, h: 7 + Math.random() * 6,
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * .35, wob: Math.random() * 6.28, round: Math.random() < .35,
        c: pick(COLORS), life: 2000 + Math.random() * 900 });
    }
    const t0 = performance.now();
    const frame = (now) => {
      const t = now - t0;
      g.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        if (t > p.life) continue;
        alive = true;
        const k = t / p.life;
        if (p.puff) {
          p.vx *= .9; p.vy *= .9; p.x += p.vx; p.y += p.vy; p.r += p.grow;
          const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          grad.addColorStop(0, `rgba(${p.c},${.55 * (1 - k)})`);
          grad.addColorStop(1, `rgba(${p.c},0)`);
          g.fillStyle = grad;
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.28); g.fill();
          continue;
        }
        p.vx *= .93; p.vy = p.vy * .93 + .16; p.wob += .14;
        p.x += p.vx + Math.sin(p.wob) * .7; p.y += p.vy; p.rot += p.vr;
        g.globalAlpha = k > .75 ? (1 - k) / .25 : 1;
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c;
        if (p.round) { g.beginPath(); g.arc(0, 0, p.w / 2, 0, 6.28); g.fill(); }
        else { const s = Math.abs(Math.cos(p.wob)); g.fillRect(-p.w / 2, -p.h / 2 * s, p.w, p.h * s); }
        g.restore();
        g.globalAlpha = 1;
      }
      if (alive && cv.isConnected) requestAnimationFrame(frame); else cv.remove();
    };
    requestAnimationFrame(frame);
  }

  // Tap anywhere moves to the next step; "Got it" (or a tap on the last step) finishes
  coach.addEventListener('click', (e) => {
    if (e.target.closest('#cmGot') || step >= STEPS.length - 1) return finish();
    go(step + 1);
  });
  document.addEventListener('keydown', (e) => {
    if (coach.hidden) return;
    if (e.key === 'Escape') finish();
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); coach.click(); }
  });

  // Outside the tour, the menu still opens and closes
  $('#hotMenu').onclick = () => setMenu(true);
  $('#hotBack').onclick = () => setMenu(false);
  $('#hotTopics').onclick = () => setMenu(false);
  $('#replay').onclick = start;

  // Fit the device to the window
  const phone = $('#phone'), stage = $('#stage');
  function fit() {
    const room = innerWidth < 900 ? 120 : 40; // keep the floating page buttons clear of the phone
    const s = Math.min(1, (innerHeight - room) / 878, (innerWidth - 32) / 386);
    phone.style.transform = `scale(${s})`;
    stage.style.width = 386 * s + 'px';
    stage.style.height = 878 * s + 'px';
  }
  addEventListener('resize', fit);
  fit();

  // First-time users get the tour automatically
  let seen = false;
  try { seen = localStorage.getItem(DONE_KEY) === '1'; } catch (e) {}
  if (!seen) setTimeout(start, 700);
})();
