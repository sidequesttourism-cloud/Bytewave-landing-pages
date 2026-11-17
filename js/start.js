/* Start a project (start.html): the page's motion. The form itself is handled by js/inquiry.js.
   Motion matches the home page: a mirrored entrance (intro from the left, form from the right), a
   mint-and-marigold line with a loop drawn across the scene, a star field and a glow that follows the pointer.
   Everything still works, and shows in place, with reduced motion or without GSAP. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { gsap } = window;

  // The logo ring in the header spins, as on the home page.
  root.classList.add('is-ready');

  /* ---------- Star field: drawn once per resize ---------- */
  const stars = $('[data-stars]');
  if (stars) {
    const draw = () => {
      const r = stars.getBoundingClientRect();
      const d = Math.min(devicePixelRatio || 1, 2);
      stars.width = Math.round(r.width * d); stars.height = Math.round(r.height * d);
      const c = stars.getContext('2d');
      c.setTransform(d, 0, 0, d, 0, 0);
      let seed = 11;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const count = Math.round((r.width * r.height) / 11000);
      for (let i = 0; i < count; i += 1) {
        c.fillStyle = `rgba(247, 245, 241, ${(0.12 + rnd() * 0.45).toFixed(2)})`;
        const s = rnd() < 0.1 ? 1.8 : 1;
        c.fillRect(rnd() * r.width, rnd() * r.height, s, s);
      }
    };
    new ResizeObserver(draw).observe(stars);
    draw();
  }

  /* ---------- Entrance: mirrored split, then the line draws itself ---------- */
  if (gsap && !reduced) {
    const intro = $('[data-from="left"]');
    const card = $('[data-from="right"]');
    const lines = $$('.start-title .st-line');
    const introRest = intro ? [...intro.children].filter((el) => !el.matches('.start-title')) : [];
    const fields = $$('.inquiry > :not([type="hidden"]):not(.honeypot)');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(lines, { x: (i) => (i % 2 ? 120 : -120), opacity: 0 }, { x: 0, opacity: 1, duration: 1.1, stagger: 0.12 }, 0.05)
      .fromTo(introRest, { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, stagger: 0.08 }, 0.25)
      .fromTo(card, { x: 90, opacity: 0 }, { x: 0, opacity: 1, duration: 1.1 }, 0.15)
      .fromTo(fields, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05 }, 0.5)
      .fromTo('[data-start-line] path', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', stagger: 0.15, autoRound: false }, 0.2);
  }
})();
