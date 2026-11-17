/* Project inquiry form on the Start a project page (works for any [data-inquiry] form).
   Fields: name, contact number, email, organisation (optional), the services needed (several can be picked), a
   description of the idea, an estimated budget, and a tick to confirm that pricing is agreed after a discussion.
   It checks itself here, then posts to Web3Forms. On success the form is swapped for its thank-you panel
   (the [data-inquiry-done] element next to it). */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MIN = 20;

  $$('[data-inquiry]').forEach((form) => {
    const status = $('[data-inquiry-status]', form);
    const submit = $('button[type="submit"]', form);
    const done = form.parentElement.querySelector('[data-inquiry-done]');
    const servicesOut = $('[data-services-out]', form);
    const servicesBox = $('[data-group="services"]', form);
    const budgetBox = $('[data-group="budget"]', form);
    const agree = $('input[name="pricing_acknowledged"]', form);
    const agreeLabel = agree.closest('.agree');
    const idea = form.elements.message;

    // Idea length meter.
    const meter = $('[data-meter]', form);
    const paintMeter = () => {
      if (!meter) return;
      const n = idea.value.trim().length;
      meter.style.setProperty('--fill', Math.min(1, n / MIN));
      meter.classList.toggle('is-done', n >= MIN);
      $('em', meter).textContent = n >= MIN ? 'Thanks, that helps' : `${n} / ${MIN} characters`;
    };
    idea.addEventListener('input', paintMeter);
    paintMeter();

    const picked = (name) => $$(`input[name="${name}"]:checked`, form).map((i) => i.value);

    // Each rule returns true or the message to show. Groups (chips, the tick box) report on their container.
    const rules = [
      { el: form.elements.name, test: (el) => el.value.trim().length >= 2 || 'Please enter your name.' },
      {
        el: form.elements.phone,
        test: (el) => {
          const v = el.value.trim();
          const digits = v.replace(/\D/g, '');
          return (/^\+?[\d\s()-]+$/.test(v) && digits.length >= 7 && digits.length <= 15) || 'Please enter a contact number we can reach you on.';
        },
      },
      // Email: Web3Forms uses a field named "email" as the reply-to address, so replying to the inquiry
      // in the inbox goes straight back to the client.
      { el: form.elements.email, test: (el) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) || 'Please enter an email address we can reply to.' },
      { el: servicesBox, group: true, test: () => picked('svc').length > 0 || 'Please choose at least one service, or "Not sure yet".' },
      { el: idea, test: (el) => el.value.trim().length >= MIN || 'A sentence or two helps, at least 20 characters.' },
      { el: budgetBox, group: true, test: () => picked('budget').length > 0 || 'Please choose an estimated budget, or "Not sure yet".' },
      { el: agreeLabel, group: true, test: () => agree.checked || 'Please confirm you understand how pricing is agreed.' },
    ];

    const errId = (rule) => `${rule.el === agreeLabel ? agree.id : rule.el.id}-err`;
    const setError = (rule, msg) => {
      const { el } = rule;
      const id = errId(rule);
      $(`#${CSS.escape(id)}`)?.remove();
      const target = el === agreeLabel ? agree : el;
      if (msg) {
        el.setAttribute('aria-invalid', 'true');
        if (target !== el) target.setAttribute('aria-invalid', 'true');
        target.setAttribute('aria-describedby', id);
        const holder = el === agreeLabel ? agreeLabel.parentElement : (rule.group ? el : el.closest('.field'));
        const span = document.createElement('span');
        span.className = 'field-error';
        span.id = id;
        span.textContent = msg;
        holder.append(span);
      } else {
        el.removeAttribute('aria-invalid');
        target.removeAttribute('aria-invalid');
        target.removeAttribute('aria-describedby');
      }
    };
    const check = (rule) => { const ok = rule.test(rule.el); setError(rule, ok === true ? '' : ok); return ok === true; };

    // Once a field has been flagged, re-check it as the visitor fixes it.
    rules.forEach((rule) => {
      const watch = rule.group ? $$('input', rule.el) : [rule.el];
      watch.forEach((input) => input.addEventListener(rule.group ? 'change' : 'input', () => {
        if (rule.el.getAttribute('aria-invalid') === 'true') check(rule);
      }));
    });

    // "Not sure yet" in services stands alone: picking it clears the others, picking another clears it.
    const svcInputs = $$('input[name="svc"]', form);
    const unsure = svcInputs.find((i) => i.value === 'Not sure yet');
    svcInputs.forEach((input) => input.addEventListener('change', () => {
      if (!input.checked) return;
      if (input === unsure) svcInputs.forEach((i) => { if (i !== unsure) i.checked = false; });
      else if (unsure) unsure.checked = false;
    }));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submit.getAttribute('aria-busy') === 'true') return;
      let firstBad = null;
      rules.forEach((rule) => { if (!check(rule) && !firstBad) firstBad = rule; });
      status.classList.remove('is-ok');
      if (firstBad) {
        const focusEl = firstBad.el === agreeLabel ? agree : (firstBad.group ? $('input', firstBad.el) : firstBad.el);
        focusEl.focus();
        status.textContent = 'Please check the highlighted fields.';
        return;
      }
      servicesOut.value = picked('svc').join(', ');
      const data = new FormData(form);
      data.delete('svc');                       // sent once, as the joined "services" line
      submit.setAttribute('aria-busy', 'true');
      status.textContent = 'Sending…';
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || 'Send failed');
        form.reset();
        paintMeter();
        // Swap the form for the thank-you panel and move focus there so screen readers announce it.
        if (done) {
          form.hidden = true;
          done.hidden = false;
          done.focus();
          if (window.gsap && !reduced) window.gsap.fromTo(done, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
        } else {
          status.classList.add('is-ok');
          status.textContent = 'Thank you. Your inquiry has been sent and we will be in touch soon.';
        }
      } catch {
        status.textContent = 'Sorry, your inquiry could not be sent. Please WhatsApp or email us instead.';
      } finally {
        submit.removeAttribute('aria-busy');
      }
    });
  });
})();
