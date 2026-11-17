(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const conn = navigator.connection;
  const lite = Boolean(conn?.saveData || innerWidth < 820 || (navigator.hardwareConcurrency || 8) <= 4);

  /* ---------- Motion: always on, except when the OS asks for reduced motion ---------- */
  const motionOn = !reduced;
  const listeners = new Set();
  const applyMotion = () => {
    root.dataset.motion = motionOn ? 'on' : 'paused';
    listeners.forEach((fn) => fn(motionOn));
  };

  /* ---------- Intro ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));
  setTimeout(() => root.classList.add('is-loaded'), 400); // background tabs throttle rAF

  /* ---------- Page loader ----------
     A big logo on black while the page loads (at least MIN_SHOW ms). Then the logo flies to its spot in
     the hero while the black fades out, so the site appears around it. Reduced motion: just a short fade. */
  const loader = $('[data-loader]');
  const loaderLogo = $('[data-loader-logo]');
  const heroLogo = $('[data-hero-logo]');
  const MIN_SHOW = 1400;
  const MAX_WAIT = 6000;
  let pageReady = false;
  const whenReady = [];
  const onReady = (fn) => { if (pageReady) fn(); else whenReady.push(fn); };
  const finishLoader = () => {
    if (pageReady) return;
    pageReady = true;
    root.classList.remove('is-loading');
    root.classList.add('is-ready');            // logo rings start spinning
    loader?.remove();
    whenReady.forEach((fn) => fn());
  };
  const revealPage = () => {
    if (!loader || !loaderLogo || !heroLogo || reduced || !loaderLogo.animate) {
      loader?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).finished.then(finishLoader, finishLoader);
      if (!loader?.animate) finishLoader();
      return;
    }
    const from = loaderLogo.getBoundingClientRect();
    const to = heroLogo.getBoundingClientRect();
    // getBoundingClientRect and transforms can differ in units when the page is zoomed; convert via the element's own width.
    const k = loaderLogo.offsetWidth / from.width;
    const dx = (to.left + to.width / 2 - (from.left + from.width / 2)) * k;
    const dy = (to.top + to.height / 2 - (from.top + from.height / 2)) * k;
    const s = to.width / from.width;
    const current = getComputedStyle(loaderLogo).scale;
    loaderLogo.getAnimations().forEach((a) => a.cancel());
    const timing = { duration: 1000, easing: 'cubic-bezier(.65, 0, .25, 1)', fill: 'forwards' };
    loaderLogo.animate([
      { transform: 'translate(0, 0) scale(1)', scale: current === 'none' ? '1' : current },
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, scale: '1' },
    ], timing).finished.then(finishLoader, finishLoader);
    $('.loader-bg', loader).animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, duration: 900, delay: 100 });
  };
  const started = performance.now();
  let revealed = false;
  const tryReveal = () => {
    if (revealed) return;
    revealed = true;
    scrollTo(0, 0);
    setTimeout(() => requestAnimationFrame(revealPage), Math.max(0, MIN_SHOW - (performance.now() - started)));
  };
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (document.readyState === 'complete') tryReveal(); else addEventListener('load', tryReveal, { once: true });
  setTimeout(tryReveal, MAX_WAIT);

  /* ---------- Split headings into words ---------- */
  $$('.split').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });

  /* Statement words light up as it scrolls through. */
  $$('[data-words]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    const n = words.length;
    el.innerHTML = words.map((w, i) => `<span class="sw" style="--i:${i};--p:${(i / n).toFixed(3)}">${w}</span>`).join(' ');
  });

  /* ---------- Reveal on scroll (replays when content re-enters) ---------- */
  ['.pillars', '.service-grid', '.experiences', '.steps', '.faq-list', '.insight-grid'].forEach((sel) => {
    $$(`${sel} > .reveal`).forEach((el, i) => el.style.setProperty('--stagger', i % 4));
  });
  const revealTargets = $$('.reveal, .split, .statement');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const cls = e.target.classList.contains('statement') ? 'is-lit' : 'is-in';
        e.target.classList.toggle(cls, e.isIntersecting);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in', 'is-lit'));
  }

  /* ---------- GSAP ----------
     GSAP and ScrollTrigger are loaded in the <head>; register the plugin here so scroll animations can use it.
     Note: the page uses CSS zoom on laptops (see the <head> script), which scales the pixel values ScrollTrigger's
     pin writes, so a pinned section lands in the wrong place there. Hold sections in place by hand instead. */
  const { gsap, ScrollTrigger } = window;
  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* Hero logo marquee: loops left while you scroll down (and at rest), right while you scroll up. A fast scroll
     speeds it up briefly, then it eases back to its normal pace. */
  const mqTrack = $('[data-marquee]');
  if (mqTrack && gsap && ScrollTrigger && !reduced) {
    mqTrack.classList.add('is-gsap');
    const SPEED = 26;   // seconds for one full set at normal pace
    const loop = gsap.fromTo(mqTrack, { xPercent: 0 }, { xPercent: -50, duration: SPEED, ease: 'none', repeat: -1 });
    loop.totalTime(SPEED * 1000);   // start far into the repeats so it can also run backwards for a long time
    let dir = 1;
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (self.direction !== dir) dir = self.direction;
        const boost = Math.min(4, 1 + Math.abs(self.getVelocity()) / 800);
        gsap.to(loop, { timeScale: dir * boost, duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.3, ease: 'power2.out' });
      },
    });
  }

  /* ---------- Header: solid once scrolled, slides away as soon as you scroll down ----------
     Hides on any downward scroll past the first 120px. Comes back only after a deliberate scroll up
     (24px in total), so trackpad wobble and momentum don't keep pulling it back over the content. */
  const header = $('[data-header]');
  const hero = $('.hero');
  const SHOW_AFTER_UP = 24;
  let lastY = scrollY;
  let upRun = 0;
  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    const dy = y - lastY;
    header.classList.toggle('is-solid', y > 40);
    if (y < 120) { header.classList.remove('is-hidden'); upRun = 0; }
    else if (dy > 0) { header.classList.add('is-hidden'); upRun = 0; }
    else if (dy < 0) { upRun -= dy; if (upRun >= SHOW_AFTER_UP) header.classList.remove('is-hidden'); }
    lastY = y;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* Active nav link */
  const navLinks = $$('.nav a');
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.hash === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => navIO.observe(s));

  /* ---------- Dialog helpers ---------- */
  const lightDismissFallback = (dialog) => {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = r.top <= event.clientY && event.clientY <= r.bottom && r.left <= event.clientX && event.clientX <= r.right;
      if (!inside) dialog.close();
    });
  };
  $$('dialog').forEach((d) => {
    lightDismissFallback(d);
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
  });

  /* Drawer */
  const drawer = $('#drawer');
  const openBtn = $('[data-menu-open]');
  $$('.drawer-nav a', drawer).forEach((a, i) => a.style.setProperty('--n', i));
  openBtn?.addEventListener('click', () => { drawer.showModal(); openBtn.setAttribute('aria-expanded', 'true'); });
  $('[data-menu-close]', drawer)?.addEventListener('click', () => drawer.close());
  drawer?.addEventListener('close', () => openBtn?.setAttribute('aria-expanded', 'false'));
  $$('a', drawer).forEach((a) => a.addEventListener('click', () => drawer.close()));
  matchMedia('(min-width: 1081px)').addEventListener('change', (m) => { if (m.matches && drawer.open) drawer.close(); });

  /* Insight notes */
  const notes = {
    brunei: { label: 'Local products', title: 'Why Brunei-first digital products matter', body: ['When you know the place, you notice details that an off-the-shelf template will miss. You understand how people communicate, what slows them down, and what would make a new tool feel familiar rather than forced.', 'Starting in Brunei gives an idea a real community to learn from. If it earns trust and proves useful here, it has a much stronger base from which to grow.'] },
    msme: { label: 'Working together', title: 'What MSMEs need from a software partner', body: ['Most small businesses do not need more technology for its own sake. They need fewer repetitive jobs, fewer mistakes, and a smoother experience for their customers and staff.', 'A useful software partner should be easy to talk to. They should understand the budget, explain the trade-offs honestly, and focus first on the change that will make the biggest difference.'] },
    tourism: { label: 'Tourism', title: 'How tourism technology can lift local experiences', body: ['Some of Brunei’s best experiences are easy to miss unless someone tells you where to look. A thoughtful digital guide can help a local story, family business, favourite food spot or quiet place reach the people who would appreciate it.', 'The aim is to make exploring feel personal and to help people understand the character behind each place.'] },
  };
  const noteDialog = $('#insight-dialog');
  $$('[data-insight]').forEach((btn) => btn.addEventListener('click', () => {
    const n = notes[btn.dataset.insight];
    if (!n) return;
    $('[data-insight-label]', noteDialog).textContent = n.label;
    $('[data-insight-title]', noteDialog).textContent = n.title;
    const body = $('[data-insight-body]', noteDialog);
    body.replaceChildren(...n.body.map((t) => Object.assign(document.createElement('p'), { textContent: t })));
    noteDialog.showModal();
  }));

  /* Lightbox */
  // Opens fitted to the screen. Clicking the image toggles full size, keeping the clicked spot in view.
  const lightbox = $('#lightbox');
  const lbImg = $('[data-lightbox-img]', lightbox);
  const lbFrame = $('[data-lb-frame]', lightbox);
  const lbHint = $('[data-lb-hint]', lightbox);
  const verb = matchMedia('(hover: none)').matches ? 'Tap' : 'Click';
  const setZoom = (on, e) => {
    const r = lbImg.getBoundingClientRect();
    const fx = e ? (e.clientX - r.left) / r.width : 0;
    const fy = e ? (e.clientY - r.top) / r.height : 0;
    lightbox.classList.toggle('is-zoomed', on);
    lbHint.textContent = on ? `${verb} again to fit the screen` : `${verb} the image to zoom in`;
    lbFrame.scrollTo(on ? fx * lbImg.offsetWidth - lbFrame.clientWidth / 2 : 0, on ? fy * lbImg.offsetHeight - lbFrame.clientHeight / 2 : 0);
  };
  lbImg.addEventListener('click', (e) => setZoom(!lightbox.classList.contains('is-zoomed'), e));
  lbImg.addEventListener('load', () => lightbox.style.setProperty('--ar', lbImg.naturalWidth / lbImg.naturalHeight));
  $$('[data-lightbox]').forEach((btn) => btn.addEventListener('click', () => {
    lbImg.src = btn.dataset.lightbox;
    lbImg.alt = btn.dataset.lightboxAlt || '';
    setZoom(false);
    lightbox.showModal();
  }));

  /* ---------- Hero rotator: glitch + text decoding, looping through the words forever ----------
     Each swap: the word's box eases to the new word's width, the RGB glitch fires, and the letters decode
     out of random characters from left to right until the new word is spelled out. */
  const rot = $('[data-rotator] .rotator-word');
  if (rot && !reduced) {
    const words = ['digital products', 'websites', 'software', 'automation'];
    const DECODE = 900;   // ms from first scramble to the last letter landing
    const HOLD = 2200;    // ms a word stays put
    const TICK = 45;      // ms between random-letter changes
    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=/<>?';
    const rand = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    const esc = (c) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c);
    let i = 0;
    let timer = 0;
    let raf = 0;
    const widthOf = (word) => {
      const m = document.createElement('span');
      m.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap';
      m.textContent = word;
      rot.append(m);
      const w = m.offsetWidth;
      m.remove();
      return w;
    };
    const decodeTo = (from, to) => {
      const n = to.length;
      // Each letter lands at its own moment, left to right, with a little randomness.
      const lands = [...to].map((_, k) => 220 + (k / Math.max(1, n - 1)) * (DECODE - 320) + Math.random() * 100);
      const glyphs = [...to].map(rand);
      rot.style.width = `${rot.offsetWidth}px`;
      void rot.offsetWidth;
      rot.classList.add('is-decoding');
      rot.style.width = `${widthOf(to)}px`;
      rot.classList.remove('is-glitch');
      void rot.offsetWidth;
      rot.classList.add('is-glitch');
      const start = performance.now();
      let lastTick = 0;
      const frame = (now) => {
        const t = now - start;
        if (t >= DECODE + 100) {
          rot.textContent = to;
          rot.dataset.text = to;
          rot.classList.remove('is-decoding', 'is-glitch');
          rot.style.width = '';
          timer = setTimeout(next, HOLD);
          return;
        }
        if (t - lastTick >= TICK) {
          lastTick = t;
          // While decoding, the length slides from the old word's length to the new one's.
          const len = Math.round(from.length + (n - from.length) * Math.min(1, t / 300));
          let html = '';
          let plain = '';
          for (let k = 0; k < len; k += 1) {
            if (k < n && t >= lands[k]) { html += esc(to[k]); plain += to[k]; continue; }
            if (to[k] === ' ') { html += ' '; plain += ' '; continue; }
            glyphs[k] = Math.random() < 0.7 ? rand() : (glyphs[k] || rand());
            html += `<span class="dec">${esc(glyphs[k])}</span>`;
            plain += glyphs[k];
          }
          rot.innerHTML = html;
          rot.dataset.text = plain;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    const next = () => {
      if (!motionOn) return;
      const from = words[i];
      i = (i + 1) % words.length;
      decodeTo(from, words[i]);
    };
    rot.textContent = words[0];
    rot.dataset.text = words[0];
    onReady(() => { timer = setTimeout(next, HOLD); });
    listeners.add((on) => { if (!on) { clearTimeout(timer); cancelAnimationFrame(raf); rot.textContent = words[i]; rot.style.width = ''; } });
  }

  /* ---------- Pointer effects (fine pointers, motion allowed) ---------- */
  if (finePointer && !reduced) {
    // Card spotlight
    $$('[data-spot]').forEach((card) => card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));

    // Magnetic buttons
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        if (!motionOn) return;
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.32;
        btn.style.setProperty('--tx', `${Math.max(-8, Math.min(8, dx))}px`);
        btn.style.setProperty('--ty', `${Math.max(-6, Math.min(6, dy))}px`);
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); });
    });

    // Hero glow
    const glow = $('.hero-glow');
    hero?.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      glow?.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
      glow?.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
    });

    // Contact glow
    const contact = $('.contact');
    const cGlow = $('.contact-glow');
    contact?.addEventListener('pointermove', (e) => {
      const r = contact.getBoundingClientRect();
      cGlow.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
      cGlow.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
    });

    // Product shot tilt
    $$('.shot-btn').forEach((shot) => {
      shot.addEventListener('pointermove', (e) => {
        if (!motionOn) return;
        const r = shot.getBoundingClientRect();
        shot.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
        shot.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 6}deg`);
      });
      shot.addEventListener('pointerleave', () => { shot.style.setProperty('--rx', '0deg'); shot.style.setProperty('--ry', '0deg'); });
    });
  }


  /* ---------- Contact form: validates here, then posts to Web3Forms (same account as the old site) ---------- */
  const form = $('[data-form]');
  if (form) {
    const status = $('[data-form-status]', form);
    const submit = $('button[type="submit"]', form);
    const rules = {
      name: (v) => v.trim().length >= 2 || 'Please enter your name.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.',
      message: (v) => v.trim().length >= 20 || 'A sentence or two helps, at least 20 characters.',
    };
    const setError = (input, msg) => {
      const id = `${input.id}-err`;
      $(`#${id}`)?.remove();
      if (msg) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', id);
        input.closest('.field').insertAdjacentHTML('beforeend', `<span class="field-error" id="${id}"></span>`);
        $(`#${id}`).textContent = msg;
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    };
    Object.keys(rules).forEach((name) => form.elements[name].addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') {
        const ok = rules[name](e.target.value);
        setError(e.target, ok === true ? '' : ok);
      }
    }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.getAttribute('aria-busy') === 'true') return;
      let firstBad = null;
      Object.entries(rules).forEach(([name, test]) => {
        const input = form.elements[name];
        const ok = test(input.value);
        setError(input, ok === true ? '' : ok);
        if (ok !== true && !firstBad) firstBad = input;
      });
      status.classList.remove('is-ok');
      if (firstBad) { firstBad.focus(); status.textContent = 'Please check the highlighted fields.'; return; }
      submit.setAttribute('aria-busy', 'true');
      status.textContent = 'Sending…';
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.message || 'Send failed');
        form.reset();
        form.dispatchEvent(new Event('input'));
        status.classList.add('is-ok');
        status.textContent = 'Thank you. Your message has been sent and we will reply soon.';
      } catch {
        status.textContent = 'Sorry, your message could not be sent. Please email or WhatsApp us instead.';
      } finally {
        submit.removeAttribute('aria-busy');
      }
    });
  }

  /* ---------- Deck: stage tabs, HUD panels, wireframe globe with satellites ---------- */
  const deck = $('[data-deck]');
  if (deck) {
    const tabs = $$('.deck-tab', deck);
    const panels = $$('[data-panel]', deck);
    let phase = 0; let userChose = false; let deckVisible = false; let cycle = 0;

    panels.forEach((p) => $$('.hud-chips li', p).forEach((li, i) => li.style.setProperty('--n', i)));

    const setPhase = (i) => {
      phase = i;
      tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-pressed', String(k === i)); });
      panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
    };
    const choose = (i) => { userChose = true; clearInterval(cycle); cycle = 0; setPhase(i); };
    tabs.forEach((t) => t.addEventListener('click', () => choose(Number(t.dataset.phase))));
    panels.forEach((p) => {
      p.addEventListener('pointerenter', () => choose(Number(p.dataset.panel)));
      p.addEventListener('focusin', () => choose(Number(p.dataset.panel)));
    });
    // Until someone picks a stage, the deck steps through them on its own.
    const autoCycle = () => {
      clearInterval(cycle); cycle = 0;
      if (userChose || reduced || !motionOn || !deckVisible) return;
      cycle = setInterval(() => setPhase((phase + 1) % 3), 3600);
    };
    listeners.add(autoCycle);
    setPhase(0);

    /* Star field: drawn once per resize. */
    const stars = $('[data-stars]', deck);
    const drawStars = () => {
      const r = stars.getBoundingClientRect();
      const d = Math.min(devicePixelRatio || 1, 2);
      stars.width = Math.round(r.width * d); stars.height = Math.round(r.height * d);
      const c = stars.getContext('2d');
      c.setTransform(d, 0, 0, d, 0, 0);
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const count = Math.round((r.width * r.height) / 9000);
      for (let i = 0; i < count; i += 1) {
        const a = 0.15 + rnd() * 0.5;
        c.fillStyle = `rgba(247, 245, 241, ${a.toFixed(2)})`;
        const s = rnd() < 0.12 ? 1.8 : 1;
        c.fillRect(rnd() * r.width, rnd() * r.height * 0.75, s, s);
      }
    };

    new ResizeObserver(drawStars).observe(deck);
    new IntersectionObserver(([e]) => { deckVisible = e.isIntersecting; autoCycle(); }, { threshold: 0.15 }).observe(deck);
    drawStars();
  }

  /* ---------- Card stack: deck locks, About slides up over it ----------
     The deck sticks with its bottom edge on the bottom of the screen: --deck-top is the screen height minus the
     deck's height, in the page's (possibly zoomed) CSS px. The deck stays still while About covers it. */
  const stack = $('[data-stack]');
  const stackDeck = stack && $('.deck', stack);
  const stackAbout = stack && $('.about', stack);
  if (stackDeck && stackAbout && !reduced) {
    const placeDeck = () => {
      const z = parseFloat(root.style.zoom) || 1;
      stackDeck.style.setProperty('--deck-top', `${Math.round(innerHeight / z - stackDeck.offsetHeight)}px`);
    };
    placeDeck();
    addEventListener('resize', placeDeck);
    new ResizeObserver(placeDeck).observe(stackDeck);
  }

  /* ---------- Scroll-Drawn Curved Lines (SVG stroke + ScrollTrigger) ----------
     Each section from About to Insights (Contact and the footer have none) gets an SVG sized to the section with
     two curves across it, alternating direction from one section to the next. The drawn tip follows a line 70%
     down the screen: the stroke is drawn down to whatever height of the section is at that line, so drawing
     starts when the section's top reaches 70% and finishes when its bottom does, before it leaves the screen.
     ScrollTrigger supplies that progress (scrubbed, so the stroke glides after the scroll rather than jumping);
     each curve is sampled once so a height can be turned into a length along it. pathLength="1" keeps the dash
     on a 0-1 scale. Decorative only: aria-hidden, focusable="false", no pointer events, so keyboard and
     screen-reader use of the page is unchanged. */
  const flowFirst = $('#about');
  const flowSections = flowFirst ? [flowFirst, ...$$('main > section')].filter((el) => !el.matches('#contact') && (el === flowFirst || (flowFirst.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))) : [];
  if (flowSections.length) {
    const NS = 'http://www.w3.org/2000/svg';
    const { gsap: fg, ScrollTrigger: fST } = window;
    const animate = Boolean(fg && fST && !reduced);
    // Smooth curve through points (Catmull-Rom turned into cubic Beziers).
    const curve = (pts) => {
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i += 1) {
        const p0 = pts[i - 1] || pts[i]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[i + 2] || p2;
        d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}`
          + ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}`
          + ` ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d;
    };
    // Each line: a long, unhurried arc in from one side near the top and out the far side near the bottom, with
    // one large, generous loop about a third of the way along and a couple of broad, slow waves further down -
    // clean and geometric, not hand-drawn. The loop is a perfect oval that touches the line and closes exactly
    // where it began; the waves are even, regular swells; the line itself is perfectly smooth. Randomness
    // (seeded per section, so each section differs but is the same on every visit) only varies the arc's bow
    // and where the loop and waves sit. Built as points, then smoothed into one curve. s runs 0 -> 1 along it.
    const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const linePoints = (W, H, flip, seed) => {
      const rnd = seeded(seed * 7919 + 13);
      const x0 = -0.06 * W; const x1 = 1.06 * W; const y0 = 0.12 * H; const y1 = 0.9 * H;
      const bow = 0.1 + rnd() * 0.08;
      const base = (s) => [x0 + (x1 - x0) * s + bow * W * Math.sin(Math.PI * s), y0 + (y1 - y0) * s];
      const dirAt = (s) => {
        const [ax, ay] = base(s - 0.002); const [bx, by] = base(s + 0.002);
        const len = Math.hypot(bx - ax, by - ay) || 1;
        return [(bx - ax) / len, (by - ay) / len];
      };
      const r = Math.max(64, Math.min(150, W * 0.09));     // loop size: large and generous
      const amp = Math.max(20, Math.min(34, W * 0.022));    // wave height: gentle swells
      const LOOP_AT = 0.28 + rnd() * 0.06; const WAVE_FROM = 0.55 + rnd() * 0.03; const WAVE_TO = WAVE_FROM + 0.27 + rnd() * 0.03;
      // Waves spaced by real length, roughly one every 340px of line, so they read as long swells, not steps.
      const stretch = Math.hypot(x1 - x0, y1 - y0) * (WAVE_TO - WAVE_FROM);
      const WAVES = Math.max(1, Math.min(2.5, Math.round((stretch / 340) * 2) / 2));
      const step = 1 / Math.max(40, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
      const pts = [];
      for (let s = 0; s <= 1 + 1e-9; s += step) {
        let [x, y] = base(s);
        if (s > WAVE_FROM && s < WAVE_TO) {
          // Even swells across the direction of travel, easing in and out at the ends of the stretch.
          const u = (s - WAVE_FROM) / (WAVE_TO - WAVE_FROM);
          const [dx, dy] = dirAt(s);
          const off = amp * Math.sin(Math.PI * u * WAVES * 2) * Math.sin(Math.PI * u);
          x -= dy * off; y += dx * off;
        }
        pts.push([x, y]);
        if (Math.abs(s - LOOP_AT) < step / 2) {
          // The loop: a perfect oval on the upper side of the line, its long axis across the line, touching the
          // line here and going exactly once round so it closes where it began.
          const [dx, dy] = dirAt(s);
          const rx = r * 1.18; const ry = r * 0.88;
          const cx = x + dy * rx; const cy = y - dx * rx;     // centre, off to the left of travel (upwards)
          const a0 = Math.atan2(y - cy, x - cx);
          const turn = Math.PI * 2;
          const ca = Math.cos(a0); const sa = Math.sin(a0);
          const oval = (t) => {
            const b = -t * turn;
            const ex = rx * Math.cos(b); const ey = ry * Math.sin(b);
            return [cx + ex * ca - ey * sa, cy + ex * sa + ey * ca];
          };
          // Shift the whole oval so it starts exactly on the line here.
          const [sx, sy] = oval(0); const shx = x - sx; const shy = y - sy;
          const N = 64;   // plenty of points so the big loop stays perfectly smooth
          for (let k = 1; k <= N; k += 1) {
            const [ox, oy] = oval(k / N);
            pts.push([ox + shx, oy + shy]);
          }
        }
      }
      return flip ? pts.map(([x, y]) => [W - x, y]) : pts;
    };
    const items = flowSections.map((sec, k) => {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'flow-lines');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      const paths = ['fl-1', 'fl-2'].map((cls) => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('class', cls);
        path.setAttribute('pathLength', '1');
        svg.append(path);
        return path;
      });
      sec.prepend(svg);
      return { sec, svg, paths, flip: k % 2 === 1, seed: k + 1, H: 1, samples: [], y: { v: 0 } };
    });
    const shape = () => items.forEach((it) => {
      const { sec, svg, paths, flip, seed } = it;
      const W = sec.offsetWidth;
      const H = sec.offsetHeight;
      it.H = H;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const pts = linePoints(W, H, flip, seed);
      paths[0].setAttribute('d', curve(pts));
      const gap = Math.min(30, W * 0.025);
      paths[1].setAttribute('d', curve(pts.map(([x, y]) => [x, y + gap])));   // a parallel line just below
      // Drawing pace: a "depth" that only grows along each curve. It follows the curve's height, except where the
      // curve doubles back (the loop) - there it keeps growing slowly so the circle draws itself over a short
      // stretch of scrolling instead of all at once. Scaled so the end of the curve is the bottom of the section.
      it.samples = paths.map((path) => {
        const total = path.getTotalLength();
        const N = 600;
        let ymax = -Infinity; let extra = 0; let prev = null;
        const raw = Array.from({ length: N + 1 }, (_, i) => {
          const pt = path.getPointAtLength((total * i) / N);
          if (prev) {
            const seg = Math.hypot(pt.x - prev.x, pt.y - prev.y);
            if (pt.y <= ymax) extra += seg * 0.6;      // doubling back: still move on, at an unhurried pace
          }
          ymax = Math.max(ymax, pt.y);
          prev = pt;
          return { d: ymax + extra, f: i / N };
        });
        const d0 = raw[0].d; const d1 = raw[N].d;
        const top = 0.12 * H; const bottom = 0.9 * H;
        return raw.map(({ d, f }) => ({ y: top + ((d - d0) / ((d1 - d0) || 1)) * (bottom - top), f }));
      });
    });
    const shareAt = (sm, y) => {
      if (y <= sm[0].y) return 0;
      if (y >= sm[sm.length - 1].y) return 1;
      let lo = 0; let hi = sm.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (sm[mid].y < y) lo = mid; else hi = mid; }
      return sm[lo].f + ((sm[hi].f - sm[lo].f) * (y - sm[lo].y)) / ((sm[hi].y - sm[lo].y) || 1);
    };
    const paint = (it) => it.paths.forEach((path, i) => { path.style.strokeDashoffset = `${1 - shareAt(it.samples[i], it.y.v * it.H)}`; });
    shape();
    if (animate) {
      items.forEach((it) => {
        it.paths.forEach((path) => { path.style.strokeDashoffset = '1'; });
        // y.v runs 0 -> 1 down the section as the 70% line moves through it. scrub 2.6 lets the stroke glide after
        // the scroll and settle softly, so even a quick flick of the wheel draws as one calm, continuous motion.
        fg.fromTo(it.y, { v: 0 }, {
          v: 1,
          ease: 'none',
          onUpdate: () => paint(it),
          scrollTrigger: { trigger: it.sec, start: 'top 70%', end: 'bottom 70%', scrub: 2.6, invalidateOnRefresh: true },
        });
      });
      fST.addEventListener('refreshInit', shape);
      fST.addEventListener('refresh', () => items.forEach(paint));
    } else {
      let flowTimer = 0;
      addEventListener('resize', () => { clearTimeout(flowTimer); flowTimer = setTimeout(shape, 200); });
    }
  }

  /* ---------- Footer: one-time mirrored split entrance (GSAP ScrollTrigger) ----------
     Once the footer fills about 30% of the screen (its top edge at 70%), its content slides in from both sides
     like a mirror opening: everything on the left half comes in from the left, everything on the right half
     from the right, top rows first. The big line "Ideas into / digital reality." splits too, one line from each
     side. It is tied to the scroll and is fully in place by the time the footer's top edge reaches 35% (65% of
     the screen is footer). It only ever moves forward: scrolling back up doesn't undo it,
     and once finished it stays put until the page is reloaded. Skipped with reduced motion or without GSAP. */
  const footer = $('.footer');
  const { gsap: ftG, ScrollTrigger: ftST } = window;
  if (footer && ftG && ftST && !reduced) {
    const pieces = [
      ...$$('.footer-big .fb-line', footer),
      ...$$('.footer-cols > *', footer),
      ...$$('.footer-bottom > *', footer),
    ];
    // Hidden until it plays. Opacity rather than visibility, so the footer's links stay reachable by keyboard.
    ftG.set(pieces, { opacity: 0 });
    let tl = null;
    // Built when the entrance starts, so each piece's side matches the layout at that moment: left or right by
    // where it sits, and pieces spanning most of the width (stacked columns on phones) alternate sides.
    const build = () => {
      const fr = footer.getBoundingClientRect();
      const mid = fr.left + fr.width / 2;
      let alt = 0;
      const fromLeft = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width > fr.width * 0.6) { alt += 1; return alt % 2 === 1; }
        return r.left + r.width / 2 < mid;
      };
      const lines = $$('.fb-line', footer);
      tl = ftG.timeline({ paused: true });
      pieces.forEach((el, i) => {
        const left = lines.includes(el) ? lines.indexOf(el) % 2 === 0 : fromLeft(el);
        tl.fromTo(el, { x: left ? -140 : 140, opacity: 0 }, { x: 0, opacity: 1, duration: 1, ease: 'power3.out' }, i * 0.08);
      });
    };
    let reached = 0;
    const advance = (p, self) => {
      if (p <= reached) return;                            // never roll back
      if (!tl) build();
      reached = p;
      ftG.to(tl, { progress: reached, duration: 0.35, ease: 'power1.out', overwrite: true });
      if (reached >= 1) self?.kill();                      // done for this visit
    };
    const st = ftST.create({
      trigger: footer,
      start: 'top 70%',   // 30% of the screen is footer
      end: 'top 35%',     // 65% is footer: everything is in place
      onUpdate: (self) => advance(self.progress, self),
    });
    // Arriving already past the start (reload near the bottom): catch up straight away.
    if (st.progress > 0) advance(st.progress, st);
    // Tabbing into the footer before it has played: finish it at once so nothing focused is see-through.
    footer.addEventListener('focusin', () => {
      if (reached >= 1) return;
      reached = 1;
      if (tl) { ftG.killTweensOf(tl); tl.progress(1); } else ftG.set(pieces, { opacity: 1 });
      st.kill();
    });
  }

  /* Pillars: the navy fill grows from where the pointer enters and shrinks toward where it leaves. */
  $$('[data-wipe]').forEach((card) => {
    const at = (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--wx', `${e.clientX - r.left}px`);
      card.style.setProperty('--wy', `${e.clientY - r.top}px`);
    };
    card.addEventListener('pointerenter', at);
    card.addEventListener('pointerleave', at);
  });

  /* Insight cards tilt toward the pointer. */
  if (finePointer && !reduced) {
    $$('[data-tilt-card]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        if (!motionOn) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
        card.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 6}deg`);
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  /* Message meter: fills toward the 20-character minimum. */
  const meter = $('[data-meter]');
  const msg = $('#f-msg');
  if (meter && msg) {
    const label = $('em', meter);
    msg.addEventListener('input', () => {
      const len = msg.value.trim().length;
      meter.style.setProperty('--fill', Math.min(1, len / 20));
      meter.classList.toggle('is-done', len >= 20);
      label.textContent = len >= 20 ? 'Ready to send' : `${len} / 20 characters`;
    });
  }

  /* ---------- Critters: slide in from the right while their section is on screen ---------- */
  const critters = $$('[data-critter]');
  const critterHooks = new Map();
  if ('IntersectionObserver' in window) {
    // Watch the section, not the critter: the critter starts off-screen to the right.
    const owner = new Map(critters.map((c) => [c.parentElement, c]));
    const cio = new IntersectionObserver((entries) => entries.forEach((e) => {
      const c = owner.get(e.target);
      const on = e.isIntersecting;
      c.classList.toggle('is-on', on);
      critterHooks.get(c)?.(on);
    }), { rootMargin: '-20% 0px -30% 0px' });
    owner.forEach((_, section) => cio.observe(section));
  } else {
    critters.forEach((c) => c.classList.add('is-on'));
  }

  // Paper plane: flies along its dashed trail once, then idles with a small bob.
  const planeWrap = $('.critter-plane');
  if (planeWrap) {
    const trail = $('.trail', planeWrap);
    const plane = $('.plane', planeWrap);
    const len = trail.getTotalLength();
    trail.style.strokeDasharray = `6 8`;
    let raf = 0; let start = 0; let progress = reduced ? 1 : 0; let goal = reduced ? 1 : 0; let bobT = 0;
    const place = (p) => {
      const at = Math.max(0.001, Math.min(1, p)) * len;
      const a = trail.getPointAtLength(at);
      const b = trail.getPointAtLength(Math.max(0, at - 2));
      const ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
      const bob = p >= 1 ? Math.sin(bobT * 2) * 4 : 0;
      plane.setAttribute('transform', `translate(${a.x.toFixed(1)} ${(a.y + bob).toFixed(1)}) rotate(${ang.toFixed(1)})`);
      trail.style.opacity = String(Math.min(1, p * 1.4));
    };
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const loop = (now) => {
      if (!start) start = now;
      if (motionOn) bobT += 0.016;
      const dur = 2600;
      if (goal === 1 && progress < 1) progress = Math.min(1, progress + 16 / dur);
      if (goal === 0) progress = Math.max(0, progress - 16 / 900);
      place(ease(progress));
      const busy = (goal === 1 && (progress < 1 || motionOn)) || (goal === 0 && progress > 0);
      raf = busy ? requestAnimationFrame(loop) : 0;
    };
    place(progress);
    critterHooks.set(planeWrap, (on) => { goal = on ? 1 : 0; if (!raf && !reduced) raf = requestAnimationFrame(loop); });
    listeners.add(() => { if (!raf && !reduced && goal) raf = requestAnimationFrame(loop); });
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  applyMotion();
})();
