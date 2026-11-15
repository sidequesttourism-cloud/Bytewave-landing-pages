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

  /* ---------- Hero rotator: one pass, lands on "digital products" ---------- */
  const rot = $('[data-rotator] .rotator-word');
  if (rot && !reduced) {
    const words = ['websites', 'software', 'automation', 'digital products'];
    let i = 0;
    let timer = 0;
    // Split-flap roll, like an airport departures board: each letter flips through a couple of random
    // letters before landing on the right one, left to right.
    const abc = 'abcdefghijklmnopqrstuvwxyz';
    const rand = () => abc[Math.floor(Math.random() * abc.length)];
    const flipTo = (word) => {
      rot.replaceChildren();
      [...word].forEach((ch, k) => {
        const s = document.createElement('span');
        s.className = 'flap is-pre';
        s.textContent = ch === ' ' ? ' ' : rand();
        rot.append(s);
        if (ch === ' ') { s.classList.remove('is-pre'); return; }
        let n = 0;
        const tick = () => {
          n += 1;
          s.classList.remove('is-pre', 'is-flip');
          void s.offsetWidth;                                 // restart the flip animation
          s.textContent = n < 3 ? rand() : ch;
          s.classList.add('is-flip');
          if (n === 3) s.classList.add('is-set');
          if (n < 3) timer = setTimeout(tick, 75);
        };
        setTimeout(tick, k * 45);
      });
    };
    // Glitch swap: the new word tears in through RGB-split slices while the old one jitters out.
    const glitchTo = (word) => {
      rot.dataset.text = word;
      rot.classList.remove('is-glitch');
      void rot.offsetWidth;
      rot.classList.add('is-glitch');
      setTimeout(() => { rot.textContent = word; }, 170);
      setTimeout(() => rot.classList.remove('is-glitch'), 520);
    };
    // Default is the glitch; add ?rotator=flap to the address to see the split-flap version.
    const style = new URLSearchParams(location.search).get('rotator') === 'flap' ? flipTo : glitchTo;
    const swap = () => {
      if (!motionOn) { rot.textContent = words.at(-1); return; }
      style(words[i]);
      i += 1;
      if (i < words.length) timer = setTimeout(swap, 1900);
    };
    timer = setTimeout(swap, 1700);
    listeners.add((on) => { if (!on) { clearTimeout(timer); rot.textContent = words.at(-1); } });
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

    // Hero glow + logo tilt
    const glow = $('.hero-glow');
    const coin = $('[data-coin]');
    hero?.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      glow?.style.setProperty('--gx', `${px * 100}%`);
      glow?.style.setProperty('--gy', `${py * 100}%`);
      if (motionOn && coin) {
        coin.style.setProperty('--ry', `${(px - 0.5) * 30}deg`);
        coin.style.setProperty('--rx', `${(0.5 - py) * 20}deg`);
        coin.style.setProperty('--tx', ((px - 0.5) * 2).toFixed(3));
        coin.nextElementSibling?.style.setProperty('--tx', ((px - 0.5) * 2).toFixed(3));
      }
    });
    hero?.addEventListener('pointerleave', () => {
      coin?.style.setProperty('--rx', '0deg');
      coin?.style.setProperty('--ry', '0deg');
      coin?.style.setProperty('--tx', '0');
      coin?.nextElementSibling?.style.setProperty('--tx', '0');
    });

    coin?.addEventListener('click', () => {
      if (!motionOn || coin.classList.contains('is-flipping')) return;
      coin.classList.add('is-flipping');
      coin.addEventListener('animationend', (e) => { if (e.animationName === 'coin-flip') coin.classList.remove('is-flipping'); });
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
