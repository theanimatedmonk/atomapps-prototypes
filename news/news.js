(() => {
  const $ = (s) => document.querySelector(s);
  const screen = $('#screen'), coach = $('#coach'), hole = $('#hole'), text = $('#cmText');
  const card = $('#cmCard');
  const tapPos = $('#tapPos'), dot = $('#tapDot'), done = $('#cmDone'), ring = $('#ring'), winTick = $('#winTick');
  const DONE_KEY = 'news-coach-done';

  // Positions are in screen pixels (360 wide); the design images start below the 32px status bar.
  const SB = 32;
  const STEPS = [
    { screen: 'feed', hole: { x: 28, y: SB + 51, w: 0, h: 0, r: 999 },
      tap: { x: 180, y: 815, mode: 'swipe' },
      card: { title: 'You now have access<br>to news feed', sub: 'Swipe up for more news.', y: 528 } },
    { screen: 'feed', hole: { x: 5, y: SB + 28, w: 46, h: 46, r: 999 },
      card: { title: 'Tap Menu', sub: 'to choose what<br>interests you.', x: 8, y: SB + 92, w: 218, tail: 31 } },   // notch clear of the 20px corner
    // Spotlight Business → Technology (menu rows 2–8); tapping one opens that topic
    { screen: 'menu', hole: { x: 8, y: SB + 130, w: 344, h: 368, r: 16 }, pick: true,
      card: { title: 'Choose a topic', sub: 'To see more stories<br>about that subject.', y: SB + 518, tail: 32 } },
    { screen: 'feed', hole: { x: 180, y: SB + 158, w: 0, h: 0, r: 999 }, done: true },
  ];

  let step = -1;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };
  const reflow = (el) => void el.offsetWidth;

  function setMenu(open) {
    screen.classList.toggle('menu-open', open);
    $('.scr.feed').inert = open;                // keep focus on the screen that's showing
    $('#menuScr').inert = !open;
  }

  // Menu and topic pages are built from TOPICS / STORIES (news-data.js)
  const feedList = $('#feedList');
  const icon = (id) => `<svg class="ti" width="20" height="20"><use href="#t-${id}"/></svg>`;
  $('#topics').innerHTML = TOPICS.map((t) => `<button class="topic" data-topic="${t.id}">${icon(t.id)}${t.name}</button>`).join('');
  const topics = [...document.querySelectorAll('.topic')];

  // The topic pill only appears on Top Stories, where stories from different topics mix
  const storyCard = (s, pill) => `<article class="card">
      <div class="card-media"><img src="${s.image}" alt="" draggable="false">${pill ? `<span class="chip">${s.tag}</span>` : ''}</div>
      <div class="card-body">
        <h2 class="card-title">${s.title}</h2>
        <p class="card-excerpt">${s.excerpt}</p>
        <div class="card-source"><b>${s.source}</b><span class="sep"></span><span>${s.time}</span></div>
        <a class="card-more" href="#" onclick="return false">Read full story<img src="assets/icon-arrow-right.svg" alt="" width="18" height="18"></a>
      </div>
    </article>`;

  // Swipe-up story stack. `pos` is a fractional card index: card i sits fully in place when pos = i,
  // has flown off the top when pos = i + 1, and waits in the peeking pose behind when pos = i - 1.
  const OFF = 700, PEEK_Y = 56, PEEK_S = 304 / 328;   // peeking pose from the design: top 140, 304 wide
  let cards = [], cur = 0;
  function layout(pos) {
    cards.forEach((el, i) => {
      const d = Math.max(-1, Math.min(2, i - pos));
      el.style.transform = d <= 0
        ? `translateY(${d * OFF}px)`
        : `translateY(${Math.min(d, 1) * PEEK_Y}px) scale(${1 - Math.min(d, 1) * (1 - PEEK_S)})`;
      el.style.opacity = d > 1 ? 2 - d : 1;          // only the next card peeks out
    });
  }
  function goCard(i) { cur = Math.max(0, Math.min(cards.length - 1, i)); layout(cur); }

  let drag = null, dragged = false;
  feedList.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const scale = feedList.getBoundingClientRect().width / 360;   // the phone is scaled to fit the window
    drag = { y: e.clientY, scale, lastY: e.clientY, lastT: e.timeStamp, v: 0 };
    dragged = false;
  });
  feedList.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = (e.clientY - drag.y) / drag.scale;
    if (!dragged && Math.abs(dy) < 6) return;
    if (!dragged) { dragged = true; try { feedList.setPointerCapture(e.pointerId); } catch (_) {} feedList.classList.add('dragging'); }
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.v = (e.clientY - drag.lastY) / drag.scale / dt;
    drag.lastY = e.clientY; drag.lastT = e.timeStamp;
    let p = -dy / OFF;
    if ((p > 0 && cur === cards.length - 1) || (p < 0 && cur === 0)) p *= 0.25;   // rubber band at the ends
    drag.p = p;
    layout(cur + p);
  });
  function endDrag() {
    if (!drag) return;
    const { p = 0, v } = drag;
    drag = null;
    feedList.classList.remove('dragging');
    if (!dragged) return;
    if (p > 0.15 || v < -0.5) goCard(cur + 1);       // far enough, or a quick flick
    else if (p < -0.15 || v > 0.5) goCard(cur - 1);
    else goCard(cur);
  }
  feedList.addEventListener('pointerup', endDrag);
  feedList.addEventListener('pointercancel', endDrag);
  feedList.addEventListener('click', (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);

  // Desktop: one card per wheel gesture, and the arrow keys
  let wheelAcc = 0, wheelLock = 0;
  feedList.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.timeStamp < wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 40) { goCard(cur + Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = e.timeStamp + 600; }
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (!coach.hidden || screen.classList.contains('menu-open')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goCard(cur + 1); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goCard(cur - 1); }
  });

  // A topic page is the feed under that topic's name, with that topic's stories
  function openTopic(btn) {
    const t = TOPICS.find((x) => x.id === btn.dataset.topic);
    topics.forEach((b) => {
      b.classList.toggle('active', b === btn);
      if (b === btn) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('.feed-title').textContent = t.name;
    $('.scr.feed').setAttribute('aria-label', t.name);
    feedList.innerHTML = t.stories.map((id) => storyCard(STORIES[id], t.id === 'top-stories')).join('');
    cards = [...feedList.children];
    cards.forEach((el, i) => { el.style.zIndex = cards.length - i; });   // earlier cards on top
    feedList.classList.add('dragging');               // place the new stack without animating
    goCard(0);
    void feedList.offsetWidth;
    feedList.classList.remove('dragging');
    setMenu(false);
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
    clearTimers();                            // drop the last step's pending reveals on a quick tap
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

    // White card with a cyan glow (step 1)
    // Fade out, then move and refill, so the card never jumps while visible
    card.classList.remove('show');
    if (s.card) {
      later(() => {
        $('#cmCardTitle').innerHTML = s.card.title;
        $('#cmCardSub').innerHTML = s.card.sub;
        Object.assign(card.style, {
          top: s.card.y + 'px', left: (s.card.x ?? 14) + 'px',
          right: s.card.w ? 'auto' : '14px', width: s.card.w ? s.card.w + 'px' : '',
        });
        card.classList.toggle('tail', s.card.tail != null);   // speech-bubble pointer toward the target
        if (s.card.tail != null) card.style.setProperty('--tail-x', s.card.tail + 'px');
        card.classList.add('show');
      }, prev ? 260 : 60);
    }

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
    openTopic(topics[0]);
    done.classList.remove('show');
    winTick.classList.remove('show');
    card.classList.remove('show');
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

  // Tap anywhere moves to the next step; "Explore Now" (or a tap on the last step) finishes
  coach.addEventListener('click', (e) => {
    if (e.target.closest('#cmGot') || step >= STEPS.length - 1) return finish();
    if (STEPS[step].pick) {                   // a tap on a lit topic row opens that topic
      const hit = topics.slice(1).find((b) => {
        const r = b.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      });
      if (hit) openTopic(hit);
    }
    go(step + 1);
  });
  document.addEventListener('keydown', (e) => {
    if (coach.hidden) return;
    if (e.key === 'Escape') finish();
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); coach.click(); }
  });

  // Outside the tour, the menu still opens and closes
  $('#openMenu').onclick = () => setMenu(true);
  $('#closeMenu').onclick = () => setMenu(false);
  $('#topics').onclick = (e) => { const t = e.target.closest('.topic'); if (t) openTopic(t); };
  openTopic(topics[0]);
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
