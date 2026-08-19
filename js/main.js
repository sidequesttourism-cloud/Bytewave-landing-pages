(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = window.matchMedia('(max-width: 820px)');
  const desktopSnapLayout = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const performanceLite = Boolean(
    connection?.saveData ||
    mobileLayout.matches ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
  );
  const sectionSnapEnabled = () => !performanceLite && !reducedMotion.matches && desktopSnapLayout.matches;
  document.documentElement.classList.toggle('performance-lite', performanceLite);
  const header = $('[data-header]');
  const toggle = $('.menu-toggle');
  const menu = $('#site-menu');
  const menuClose = $('.menu-close');

  const setMenu = (open) => {
    if (!toggle || !menu || !header) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    menu.setAttribute('aria-hidden', String(!open));
    menu.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('nav-open', open);
    if (open) window.setTimeout(() => menuClose?.focus({ preventScroll: true }), 30);
    else if (document.activeElement && menu.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu?.addEventListener('click', (event) => { if (event.target.closest('a') || event.target.closest('[data-menu-close]')) setMenu(false); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') setMenu(false); });

  const navLinks = $$('.nav-links a');
  const sections = $$('main section[id]');
  if (sectionSnapEnabled()) {
    sections[0]?.classList.add('is-section-active');
    sections.forEach((section, index) => section.classList.toggle('is-section-future', index > 0));
    document.documentElement.classList.add('section-snap-motion');
  }
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-section-active', entry.isIntersecting || reducedMotion.matches);
        if (!entry.isIntersecting) return;
        const activeIndex = sections.indexOf(entry.target);
        sections.forEach((section, index) => {
          section.classList.toggle('is-section-past', index < activeIndex);
          section.classList.toggle('is-section-future', index > activeIndex);
        });
        navLinks.forEach((link) => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
      });
    }, { rootMargin: '-35% 0px -58%', threshold: 0 });
    sections.forEach((section) => sectionObserver.observe(section));
  }
  const onSectionMotionChange = () => {
    const naturalScroll = !sectionSnapEnabled();
    document.documentElement.classList.toggle('section-snap-motion', !naturalScroll);
    if (naturalScroll) sections.forEach((section) => {
      section.classList.add('is-section-active');
      section.classList.remove('is-section-past', 'is-section-future');
    });
  };
  reducedMotion.addEventListener?.('change', onSectionMotionChange);
  mobileLayout.addEventListener?.('change', onSectionMotionChange);
  desktopSnapLayout.addEventListener?.('change', onSectionMotionChange);

  const sectionStops = [...sections, $('.site-footer')].filter(Boolean);
  let sectionSnapLocked = false;
  let sectionSnapTimer = 0;
  let sectionSettleTimer = 0;
  let sectionGestureActive = false;
  let sectionGestureStart = 0;
  let sectionGestureDirection = 0;
  let lastSectionScrollY = window.scrollY;
  let touchStartY = 0;
  let touchStartIndex = 0;
  let touchScrollPanel = null;
  const currentSectionIndex = () => {
    const snapPadding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const position = window.scrollY + snapPadding;
    return sectionStops.reduce((nearest, section, index) => Math.abs(section.offsetTop - position) < Math.abs(sectionStops[nearest].offsetTop - position) ? index : nearest, 0);
  };
  const moveToSection = (index) => {
    const target = sectionStops[Math.max(0, Math.min(sectionStops.length - 1, index))];
    if (!target) return;
    sectionSnapLocked = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.clearTimeout(sectionSnapTimer);
    sectionSnapTimer = window.setTimeout(() => { sectionSnapLocked = false; }, 900);
  };
  const sectionSnapBlocked = (target) => !sectionSnapEnabled() || document.body.classList.contains('dialog-open') || document.body.classList.contains('nav-open') || Boolean(target?.closest('input,select,textarea,[contenteditable=true],dialog'));
  const panelCanScroll = (panel, direction) => {
    if (!panel || panel.scrollHeight <= panel.clientHeight + 2) return false;
    return direction > 0 ? panel.scrollTop < panel.scrollHeight - panel.clientHeight - 2 : panel.scrollTop > 2;
  };
  const onSectionWheel = (event) => {
    if (sectionSnapBlocked(event.target) || event.ctrlKey || Math.abs(event.deltaY) < 12) return;
    const scrollPanel = event.target.closest?.('[data-product-slide].is-active,main>section>.wrap');
    if (panelCanScroll(scrollPanel, event.deltaY > 0 ? 1 : -1)) return;
    event.preventDefault();
    if (sectionSnapLocked) return;
    const current = currentSectionIndex();
    const nextIndex = Math.max(0, Math.min(sectionStops.length - 1, current + (event.deltaY > 0 ? 1 : -1)));
    if (nextIndex !== current) moveToSection(nextIndex);
  };
  const onSectionTouchStart = (event) => {
    if (sectionSnapBlocked(event.target) || event.touches.length !== 1) return;
    touchStartY = event.touches[0].clientY;
    touchStartIndex = currentSectionIndex();
    touchScrollPanel = event.target.closest?.('[data-product-slide].is-active,main>section>.wrap') || null;
  };
  const onSectionTouchEnd = (event) => {
    if (sectionSnapBlocked(event.target) || !touchStartY || !event.changedTouches.length) return;
    const distance = touchStartY - event.changedTouches[0].clientY;
    touchStartY = 0;
    if (panelCanScroll(touchScrollPanel, distance > 0 ? 1 : -1)) { touchScrollPanel = null; return; }
    touchScrollPanel = null;
    if (Math.abs(distance) < 54 || sectionSnapLocked) return;
    moveToSection(touchStartIndex + (distance > 0 ? 1 : -1));
  };
  const onSectionScroll = () => {
    const position = window.scrollY;
    const delta = position - lastSectionScrollY;
    lastSectionScrollY = position;
    if (sectionSnapLocked || !sectionSnapEnabled() || Math.abs(delta) < 1) return;
    if (!sectionGestureActive) {
      sectionGestureActive = true;
      sectionGestureStart = currentSectionIndex();
    }
    sectionGestureDirection = delta > 0 ? 1 : -1;
    window.clearTimeout(sectionSettleTimer);
    sectionSettleTimer = window.setTimeout(() => {
      sectionGestureActive = false;
      if (!sectionSnapLocked) moveToSection(sectionGestureStart + sectionGestureDirection);
    }, 150);
  };
  const onSectionAnchorClick = (event) => {
    const anchor = event.target.closest?.('a[href^="#"]');
    if (!anchor) return;
    sectionSnapLocked = true;
    window.clearTimeout(sectionSnapTimer);
    sectionSnapTimer = window.setTimeout(() => { sectionSnapLocked = false; }, 900);
  };
  window.addEventListener('wheel', onSectionWheel, { passive: false });
  window.addEventListener('scroll', onSectionScroll, { passive: true });
  window.addEventListener('touchstart', onSectionTouchStart, { passive: true });
  window.addEventListener('touchend', onSectionTouchEnd, { passive: true });
  document.addEventListener('click', onSectionAnchorClick, true);

  const reveals = $$('.reveal');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) reveals.forEach((el) => el.classList.add('is-visible'));
  else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .12 });
    reveals.forEach((el) => revealObserver.observe(el));
  }

  const pillarCarousel = $('[data-pillar-carousel]');
  if (pillarCarousel) {
    const viewport = $('[data-pillar-viewport]', pillarCarousel);
    const cards = $$('.pillar', pillarCarousel);
    const previous = $('[data-pillar-prev]', pillarCarousel);
    const next = $('[data-pillar-next]', pillarCarousel);
    let pillarIndex = 0;
    let carouselVisible = true;
    let interactionPause = false;
    let carouselTimer = 0;
    let scrollTimer = 0;

    const updateCarouselState = () => {
      cards.forEach((card, index) => card.setAttribute('aria-hidden', String(index !== pillarIndex)));
      viewport?.setAttribute('aria-label', `Business pillar ${pillarIndex + 1} of ${cards.length}`);
    };
    const stopCarouselTimer = () => { window.clearTimeout(carouselTimer); carouselTimer = 0; };
    const scheduleCarousel = () => {
      stopCarouselTimer();
      if (reducedMotion.matches || interactionPause || !carouselVisible || document.hidden || cards.length < 2) return;
      carouselTimer = window.setTimeout(() => {
        goToPillar((pillarIndex + 1) % cards.length);
        scheduleCarousel();
      }, 5000);
    };
    const goToPillar = (requestedIndex, immediate = false) => {
      if (!viewport || !cards.length) return;
      pillarIndex = (requestedIndex + cards.length) % cards.length;
      const target = cards[pillarIndex];
      viewport.scrollTo({ left: target.offsetLeft, behavior: immediate || reducedMotion.matches ? 'auto' : 'smooth' });
      updateCarouselState();
    };
    const resumeAfterInteraction = () => { interactionPause = false; scheduleCarousel(); };

    previous?.addEventListener('click', () => { goToPillar(pillarIndex - 1); scheduleCarousel(); });
    next?.addEventListener('click', () => { goToPillar(pillarIndex + 1); scheduleCarousel(); });
    viewport?.addEventListener('pointerenter', () => { interactionPause = true; stopCarouselTimer(); });
    viewport?.addEventListener('pointerleave', resumeAfterInteraction);
    pillarCarousel.addEventListener('focusin', () => { interactionPause = true; stopCarouselTimer(); });
    pillarCarousel.addEventListener('focusout', (event) => { if (!pillarCarousel.contains(event.relatedTarget)) resumeAfterInteraction(); });
    viewport?.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        goToPillar(pillarIndex + (event.key === 'ArrowRight' ? 1 : -1));
        scheduleCarousel();
      }
    });
    viewport?.addEventListener('scroll', () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        const nearest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - viewport.scrollLeft) < Math.abs(cards[best].offsetLeft - viewport.scrollLeft) ? index : best, 0);
        pillarIndex = nearest; updateCarouselState();
      }, 100);
    }, { passive: true });
    const carouselObserver = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => { carouselVisible = entry.isIntersecting; scheduleCarousel(); }, { threshold: .35 }) : null;
    carouselObserver?.observe(pillarCarousel);
    const onCarouselVisibility = () => scheduleCarousel();
    const onCarouselMotion = () => { updateCarouselState(); scheduleCarousel(); };
    const onCarouselResize = () => goToPillar(pillarIndex, true);
    document.addEventListener('visibilitychange', onCarouselVisibility);
    reducedMotion.addEventListener?.('change', onCarouselMotion);
    window.addEventListener('resize', onCarouselResize, { passive: true });
    updateCarouselState(); scheduleCarousel();
    window.addEventListener('pagehide', () => {
      stopCarouselTimer(); window.clearTimeout(scrollTimer); carouselObserver?.disconnect();
      document.removeEventListener('visibilitychange', onCarouselVisibility);
      reducedMotion.removeEventListener?.('change', onCarouselMotion);
      window.removeEventListener('resize', onCarouselResize);
    }, { once: true });
  }

  const serviceCarousel = $('[data-service-carousel]');
  if (serviceCarousel) {
    const viewport = $('[data-service-viewport]', serviceCarousel);
    const cards = $$('.service-card', serviceCarousel);
    const previous = $('[data-service-prev]', serviceCarousel);
    const next = $('[data-service-next]', serviceCarousel);
    let serviceIndex = 0;
    let carouselVisible = true;
    let interactionPause = false;
    let serviceTimer = 0;
    let serviceScrollTimer = 0;

    const updateServiceState = () => {
      cards.forEach((card, index) => card.setAttribute('aria-hidden', String(index !== serviceIndex)));
      viewport?.setAttribute('aria-label', `Capability ${serviceIndex + 1} of ${cards.length}`);
    };
    const stopServiceTimer = () => { window.clearTimeout(serviceTimer); serviceTimer = 0; };
    const scheduleServiceCarousel = () => {
      stopServiceTimer();
      if (reducedMotion.matches || interactionPause || !carouselVisible || document.hidden || cards.length < 2) return;
      serviceTimer = window.setTimeout(() => {
        goToService(serviceIndex + 1);
        scheduleServiceCarousel();
      }, 5200);
    };
    const goToService = (requestedIndex, immediate = false) => {
      if (!viewport || !cards.length) return;
      serviceIndex = (requestedIndex + cards.length) % cards.length;
      viewport.scrollTo({ top: cards[serviceIndex].offsetTop, behavior: immediate || reducedMotion.matches ? 'auto' : 'smooth' });
      updateServiceState();
    };
    const resumeServiceCarousel = () => { interactionPause = false; scheduleServiceCarousel(); };

    previous?.addEventListener('click', () => { goToService(serviceIndex - 1); scheduleServiceCarousel(); });
    next?.addEventListener('click', () => { goToService(serviceIndex + 1); scheduleServiceCarousel(); });
    viewport?.addEventListener('pointerenter', () => { interactionPause = true; stopServiceTimer(); });
    viewport?.addEventListener('pointerleave', resumeServiceCarousel);
    serviceCarousel.addEventListener('focusin', () => { interactionPause = true; stopServiceTimer(); });
    serviceCarousel.addEventListener('focusout', (event) => { if (!serviceCarousel.contains(event.relatedTarget)) resumeServiceCarousel(); });
    viewport?.addEventListener('keydown', (event) => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') goToService(0);
      else if (event.key === 'End') goToService(cards.length - 1);
      else goToService(serviceIndex + (event.key === 'ArrowDown' ? 1 : -1));
      scheduleServiceCarousel();
    });
    viewport?.addEventListener('scroll', () => {
      window.clearTimeout(serviceScrollTimer);
      serviceScrollTimer = window.setTimeout(() => {
        serviceIndex = cards.reduce((best, card, index) => Math.abs(card.offsetTop - viewport.scrollTop) < Math.abs(cards[best].offsetTop - viewport.scrollTop) ? index : best, 0);
        updateServiceState();
      }, 100);
    }, { passive: true });
    const serviceObserver = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => { carouselVisible = entry.isIntersecting; scheduleServiceCarousel(); }, { threshold: .35 }) : null;
    serviceObserver?.observe(serviceCarousel);
    const onServiceVisibility = () => scheduleServiceCarousel();
    const onServiceMotion = () => { updateServiceState(); scheduleServiceCarousel(); };
    const onServiceResize = () => goToService(serviceIndex, true);
    document.addEventListener('visibilitychange', onServiceVisibility);
    reducedMotion.addEventListener?.('change', onServiceMotion);
    window.addEventListener('resize', onServiceResize, { passive: true });
    updateServiceState(); scheduleServiceCarousel();
    window.addEventListener('pagehide', () => {
      stopServiceTimer(); window.clearTimeout(serviceScrollTimer); serviceObserver?.disconnect();
      document.removeEventListener('visibilitychange', onServiceVisibility);
      reducedMotion.removeEventListener?.('change', onServiceMotion);
      window.removeEventListener('resize', onServiceResize);
    }, { once: true });
  }

  const productCarousel = $('[data-product-carousel]');
  if (productCarousel) {
    const viewport = $('[data-product-viewport]', productCarousel);
    const cards = $$('[data-product-slide]', productCarousel);
    const previous = $('[data-product-prev]', productCarousel);
    const next = $('[data-product-next]', productCarousel);
    const controls = $('[data-product-controls]', productCarousel);
    const dots = $$('[data-product-dot]', productCarousel);
    const status = $('[data-product-status]', productCarousel);
    let productIndex = Math.max(0, cards.findIndex((card) => card.classList.contains('is-active')));
    let pointerStartX = 0;
    let productTransitionTimer = 0;

    const productName = (card) => $('h3', card)?.textContent?.replace(/\s+/g, ' ').trim() || 'Featured product';
    const updateProductState = (announce = true) => {
      cards.forEach((card, index) => {
        const active = index === productIndex;
        card.classList.toggle('is-active', active);
        card.setAttribute('aria-hidden', String(!active));
        if ('inert' in card) card.inert = !active;
      });
      dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === productIndex)));
      if (status && announce) status.textContent = `Showing ${productName(cards[productIndex])}, product ${productIndex + 1} of ${cards.length}`;
    };
    const goToProduct = (requestedIndex, direction) => {
      if (cards.length < 2) return;
      const nextIndex = (requestedIndex + cards.length) % cards.length;
      if (nextIndex === productIndex) return;
      window.clearTimeout(productTransitionTimer);
      cards.forEach((card) => card.classList.remove('is-entering', 'is-leaving'));
      const outgoing = cards[productIndex];
      const incoming = cards[nextIndex];
      productCarousel.dataset.direction = direction || (nextIndex > productIndex ? 'next' : 'prev');
      incoming.classList.add('is-entering');
      void incoming.offsetWidth;
      outgoing.classList.remove('is-active');
      outgoing.classList.add('is-leaving');
      incoming.classList.add('is-active');
      incoming.classList.remove('is-entering');
      incoming.scrollTop = 0;
      productIndex = nextIndex;
      updateProductState();
      productTransitionTimer = window.setTimeout(() => outgoing.classList.remove('is-leaving'), reducedMotion.matches ? 0 : 760);
    };
    const holdProductSection = () => {
      sectionSnapLocked = true;
      window.clearTimeout(sectionSnapTimer);
      sectionSnapTimer = window.setTimeout(() => { sectionSnapLocked = false; }, reducedMotion.matches ? 0 : 900);
    };

    productCarousel.classList.add('is-enhanced');
    productCarousel.closest('.wrap')?.classList.add('has-product-carousel');
    if (controls) controls.hidden = false;
    [previous, next, ...dots].filter(Boolean).forEach((control) => {
      control.addEventListener('pointerdown', (event) => {
        holdProductSection();
        if (event.pointerType === 'mouse') event.preventDefault();
      });
    });
    previous?.addEventListener('click', () => { holdProductSection(); goToProduct(productIndex - 1, 'prev'); });
    next?.addEventListener('click', () => { holdProductSection(); goToProduct(productIndex + 1, 'next'); });
    dots.forEach((dot, index) => dot.addEventListener('click', () => { holdProductSection(); goToProduct(index, index > productIndex ? 'next' : 'prev'); }));
    viewport?.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      holdProductSection();
      if (event.key === 'Home') goToProduct(0, 'prev');
      else if (event.key === 'End') goToProduct(cards.length - 1, 'next');
      else goToProduct(productIndex + (event.key === 'ArrowRight' ? 1 : -1), event.key === 'ArrowRight' ? 'next' : 'prev');
    });
    viewport?.addEventListener('pointerdown', (event) => { pointerStartX = event.clientX; });
    viewport?.addEventListener('pointerup', (event) => {
      const distance = event.clientX - pointerStartX;
      pointerStartX = 0;
      if (Math.abs(distance) < 52) return;
      goToProduct(productIndex + (distance < 0 ? 1 : -1), distance < 0 ? 'next' : 'prev');
    });
    viewport?.addEventListener('pointercancel', () => { pointerStartX = 0; });
    updateProductState(false);
  }

  const processLine = $('.process-line');
  if (processLine && 'IntersectionObserver' in window && !reducedMotion.matches) {
    new IntersectionObserver(([entry], observer) => { if (entry.isIntersecting) { processLine.classList.add('is-visible'); observer.disconnect(); } }, { threshold: .25 }).observe(processLine);
  }

  const insights = {
    brunei: { label: 'Local products', title: 'Why Brunei-first digital products matter', body: '<p>When you know the place, you notice details that an off-the-shelf template will miss. You understand how people communicate, what slows them down, and what would make a new tool feel familiar rather than forced.</p><p>Starting in Brunei is not about limiting an idea. It is about giving it a real community to learn from. If it earns trust and proves useful here, it has a much stronger base from which to grow.</p>' },
    msme: { label: 'Working together', title: 'What MSMEs need from a software partner', body: '<p>Most small businesses do not need more technology for its own sake. They need fewer repetitive jobs, fewer mistakes, and a smoother experience for their customers and staff.</p><p>A useful software partner should be easy to talk to. They should understand the budget, explain the trade-offs honestly, and focus on the change that will make the biggest difference first.</p>' },
    tourism: { label: 'Tourism', title: 'How tourism technology can lift local experiences', body: '<p>Some of Brunei’s best experiences are easy to miss unless someone tells you where to look. A thoughtful digital guide can help a local story, family business, favourite food spot, or quiet place reach the people who would appreciate it.</p><p>The aim is not to put another brochure on a screen. It is to make exploring feel personal and help people understand the character behind each place.</p>' }
  };
  const dialog = $('.insight-dialog');
  $$('[data-insight]').forEach((button) => button.addEventListener('click', () => {
    const item = insights[button.dataset.insight];
    if (!dialog || !item) return;
    $('[data-dialog-label]', dialog).textContent = item.label;
    $('[data-dialog-title]', dialog).textContent = item.title;
    $('[data-dialog-body]', dialog).innerHTML = item.body;
    document.body.classList.add('dialog-open');
    dialog.showModal();
  }));
  const closeDialog = () => { if (dialog?.open) dialog.close(); document.body.classList.remove('dialog-open'); };
  $('[data-dialog-close]')?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog?.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); closeDialog(); } });
  dialog?.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); });
  dialog?.addEventListener('close', () => document.body.classList.remove('dialog-open'));

  const form = $('.inquiry-form');
  const status = $('.form-status');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = $$('input, select, textarea', form);
    fields.forEach((field) => field.removeAttribute('aria-invalid'));
    if (!form.checkValidity()) {
      const invalid = fields.find((field) => !field.validity.valid);
      invalid?.setAttribute('aria-invalid', 'true'); invalid?.focus();
      if (status) status.textContent = 'Please complete the required fields.';
      return;
    }
    form.classList.add('is-busy');
    const submit = $('button[type="submit"]', form); if (submit) submit.disabled = true;
    if (status) status.textContent = 'Sending your inquiry…';
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'We could not send your inquiry. Please try again.');
      form.reset(); if (status) status.textContent = data.message || 'Thank you. We will be in touch soon.';
    } catch (error) { if (status) status.textContent = error.message || 'Something went wrong. Please email us directly.'; }
    finally { form.classList.remove('is-busy'); if (submit) submit.disabled = false; }
  });
  $('[data-year]').textContent = String(new Date().getFullYear());

  const initLogo = () => {
    const stage = $('[data-logo-stage]');
    if (!stage || !window.THREE || !window.WebGLRenderingContext) return;
    let renderer;
    try {
      const mobile = window.matchMedia('(max-width: 700px)').matches;
      const lite = performanceLite || mobile;
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0xf1f4f2, .028);
      const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
      camera.position.z = 12;
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !lite, precision: lite ? 'mediump' : 'highp', powerPreference: lite ? 'low-power' : 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.35));
      renderer.setClearColor(0xf1f4f2, 1);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;

      const root = new THREE.Group();
      const backgroundGroup = new THREE.Group();
      root.add(backgroundGroup); scene.add(root);

    const logoClearRadius = mobile ? 2.92 : 3.08;

      const nodePositions = [];
      const nodeStep = lite ? 1.55 : .9;
      for (let x = -4.2; x <= 4.2; x += nodeStep) for (let y = -4.2; y <= 4.2; y += nodeStep) {
        if (Math.hypot(x, y) > logoClearRadius + .12 && (Math.round((x + y) * 10) % 3) === 0) nodePositions.push(x, y, -1.42);
      }
      const nodeGeometry = new THREE.BufferGeometry(); nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
      const nodeField = new THREE.Points(nodeGeometry, new THREE.PointsMaterial({ color: 0x0b6f91, size: mobile ? .022 : .032, transparent: true, opacity: .3, sizeAttenuation: true, depthWrite: false }));
      backgroundGroup.add(nodeField);

      scene.add(new THREE.HemisphereLight(0xffffff, 0x8fb8c5, 1.2));
      const keyLight = new THREE.PointLight(0xd8f6ff, 1.15, 18);
      keyLight.position.set(-3.8, 4.2, 5.5);
      scene.add(keyLight);
      const signalLight = new THREE.PointLight(0x78c8dd, .72, 16);
      signalLight.position.set(4.2, -2.8, 4.2);
      scene.add(signalLight);

      const glossyGroup = new THREE.Group();
      const floatingObjects = [];
      const glossyGeometries = [
        new THREE.SphereGeometry(.12, lite ? 8 : 16, lite ? 6 : 12),
        new THREE.SphereGeometry(.08, lite ? 7 : 14, lite ? 5 : 10),
        new THREE.IcosahedronGeometry(.1, 0)
      ];
      const glossyMaterials = [0x0b6f91, 0x2a9fbd, 0x0b5273, 0x65bfd3].map((color) => new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: .18,
        transparent: true,
        opacity: .78,
        roughness: .12,
        metalness: .08,
        clearcoat: 1,
        clearcoatRoughness: .08,
        depthWrite: false,
        blending: THREE.NormalBlending
      }));
      const objectSpecs = [
        [-4.1, -.65, -1.3, .75], [-3.05, -.28, -1.15, .58], [-1.95, -.58, -1.05, .7],
        [-.7, -.08, -.95, .95], [.75, -.4, -1.05, .62], [1.8, .05, -1.2, .85],
        [2.85, -.32, -1.08, .68], [4.05, -.62, -1.22, .8], [3.45, .48, -1.38, .48]
      ];
      objectSpecs.slice(0, lite ? 4 : objectSpecs.length).forEach(([x, y, z, scale], index) => {
        const object = new THREE.Mesh(glossyGeometries[index % glossyGeometries.length], glossyMaterials[index % glossyMaterials.length]);
        object.position.set(x, y, z);
        object.scale.setScalar(scale);
        object.userData = { baseY: y, phase: index * .83, speed: .00018 + (index % 3) * .000035 };
        floatingObjects.push(object);
        glossyGroup.add(object);
      });
      backgroundGroup.add(glossyGroup);

      const createWaveLayer = (color, lineColor, opacity, lineOpacity, z, phase, rotation) => {
        const geometry = new THREE.PlaneGeometry(18, 6, lite ? 12 : 28, lite ? 4 : 9);
        const positions = geometry.attributes.position;
        const base = new Float32Array(positions.count * 2);
        for (let index = 0; index < positions.count; index++) {
          base[index * 2] = positions.getX(index);
          base[index * 2 + 1] = positions.getY(index);
        }
        const material = new THREE.MeshPhysicalMaterial({
          color,
          transparent: true,
          opacity,
          roughness: .3,
          metalness: .04,
          clearcoat: 1,
          clearcoatRoughness: .18,
          emissive: color,
          emissiveIntensity: .14,
          flatShading: true,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        const wire = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
          color: lineColor,
          transparent: true,
          opacity: lineOpacity,
          wireframe: true,
          blending: THREE.NormalBlending,
          depthWrite: false
        }));
        wire.position.z = .012;
        mesh.add(wire);
        mesh.position.set(0, -1.7, z);
        mesh.rotation.set(-.72, 0, rotation);
        mesh.userData = { base, phase };
        backgroundGroup.add(mesh);
        return mesh;
      };
      const waveLayers = [
        createWaveLayer(0xadd6df, 0x176f8f, lite ? .18 : .26, lite ? .16 : .23, -2.65, 0, -.025),
        createWaveLayer(0xc7dce1, 0x4a8da4, lite ? .11 : .17, lite ? .07 : .11, -3.2, 2.1, .045)
      ];

      renderer.domElement.className = 'webgl-background';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(renderer.domElement, document.body.firstChild);

      let width = 0, height = 0, raf = 0, visible = true, scrollTarget = 0, scrollCurrent = 0;
      let pointerX = 0, pointerY = 0, pointerTargetX = 0, pointerTargetY = 0;
      let frameCount = 0, lastFrameTime = 0;
      const frameInterval = 1000 / (lite ? 24 : 50);
      const requestRender = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(render); };
      const render = (time = 0) => {
        raf = 0;
        if (!visible || document.hidden) return;
        if (!reducedMotion.matches && time - lastFrameTime < frameInterval) { requestRender(); return; }
        lastFrameTime = time;
        if (reducedMotion.matches) {
          backgroundGroup.position.z = 0; backgroundGroup.rotation.set(0, 0, 0);
          glossyGroup.rotation.set(0, 0, 0);
          floatingObjects.forEach((object) => { object.position.y = object.userData.baseY; object.rotation.set(0, 0, 0); });
        } else {
          frameCount += 1;
          scrollCurrent += (scrollTarget - scrollCurrent) * .065;
          pointerX += (pointerTargetX - pointerX) * .045;
          pointerY += (pointerTargetY - pointerY) * .045;
          backgroundGroup.position.z = scrollCurrent * .55;
          backgroundGroup.rotation.x = scrollCurrent * .035 + pointerY * .026;
          backgroundGroup.rotation.y = pointerX * .035;
          backgroundGroup.rotation.z = Math.sin(time * .00012) * .012 + scrollCurrent * .035;
          nodeField.rotation.z = time * .000008;
          glossyGroup.rotation.z = Math.sin(time * .00009) * .018;
          floatingObjects.forEach((object) => {
            object.position.y = object.userData.baseY + Math.sin(time * .00032 + object.userData.phase) * .12;
            object.rotation.x = time * object.userData.speed;
            object.rotation.y = time * object.userData.speed * .72;
          });
          waveLayers.forEach((wave, layerIndex) => {
            const positions = wave.geometry.attributes.position;
            const { base, phase } = wave.userData;
            for (let index = 0; index < positions.count; index++) {
              const x = base[index * 2];
              const y = base[index * 2 + 1];
              const displacement = Math.sin(x * .68 + time * .00036 + phase + scrollCurrent * 5.5) * .38 + Math.cos(y * .92 - time * .00024 + phase) * .18 + Math.sin((x + y) * .34 + scrollCurrent * 8) * .1;
              positions.setZ(index, displacement);
            }
            positions.needsUpdate = true;
            if (!lite && frameCount % 2 === layerIndex) wave.geometry.computeVertexNormals();
            wave.position.y = -1.8 + Math.sin(time * .00014 + phase) * .14 - scrollCurrent * .32;
            wave.rotation.z += ((layerIndex ? .055 : -.035) + scrollCurrent * (layerIndex ? -.08 : .1) - wave.rotation.z) * .035;
          });
        }
        renderer.render(scene, camera);
        if (!reducedMotion.matches) requestRender();
      };
      const resize = () => {
        const nextWidth = window.innerWidth;
        const nextHeight = window.innerHeight;
        if (nextWidth === width && nextHeight === height) return;
        width = Math.max(1, nextWidth); height = Math.max(1, nextHeight);
        renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); requestRender();
      };
      const onScroll = () => {
        if (reducedMotion.matches || lite) return;
        const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollTarget = Math.max(0, Math.min(1, window.scrollY / scrollRange));
        requestRender();
      };
      const onMotionChange = () => { scrollTarget = 0; scrollCurrent = 0; requestRender(); };
      const onPointerMove = (event) => {
        if (reducedMotion.matches || lite) return;
        pointerTargetX = (event.clientX / Math.max(1, window.innerWidth) - .5) * 2;
        pointerTargetY = (event.clientY / Math.max(1, window.innerHeight) - .5) * 2;
        requestRender();
      };
      const onPointerLeave = () => { pointerTargetX = 0; pointerTargetY = 0; requestRender(); };
      const onVisibility = () => { if (!document.hidden) requestRender(); };
      window.addEventListener('resize', resize, { passive: true });
      if (!lite) {
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerleave', onPointerLeave);
      }
      reducedMotion.addEventListener?.('change', onMotionChange); document.addEventListener('visibilitychange', onVisibility);
      resize(); onScroll();
      requestRender();
      window.addEventListener('pagehide', () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize); window.removeEventListener('scroll', onScroll);
        window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerleave', onPointerLeave);
        reducedMotion.removeEventListener?.('change', onMotionChange); document.removeEventListener('visibilitychange', onVisibility);
        scene.traverse((object) => { object.geometry?.dispose(); if (object.material) { const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => { material.map?.dispose(); material.dispose(); }); } });
        renderer.dispose();
        renderer.domElement.remove();
      }, { once: true });
    } catch (error) { renderer?.dispose(); }
  };
  if (document.fonts?.ready) document.fonts.ready.then(initLogo); else window.addEventListener('load', initLogo, { once: true });
})();
