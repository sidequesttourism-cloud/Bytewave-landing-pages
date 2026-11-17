/* Perspective Portal Fold (see css/portal.css): names each cross-document view transition so the CSS knows which
   way to fold. Going to Start a project is "portal"; leaving it for the home page is "portal-back".
   Loaded without defer in the <head>, because "pagereveal" fires before the new page's first frame. */
(() => {
  const isStart = (url) => /\/start(\.html)?$/.test(new URL(url, location.href).pathname);
  const typeFor = (from, to) => {
    if (isStart(to) && !isStart(from)) return 'portal';
    if (isStart(from) && !isStart(to)) return 'portal-back';
    return null;
  };
  // Outgoing page: decide the type from where we are and where we're going.
  addEventListener('pageswap', (e) => {
    if (!e.viewTransition || !e.activation) return;
    const t = typeFor(location.href, e.activation.entry.url);
    if (t) e.viewTransition.types.add(t);
  });
  // Incoming page: decide it again from the page we came from.
  const from = window.navigation?.activation?.from?.url;
  const arriving = from ? typeFor(from, location.href) : null;
  // Back on the home page through the portal: skip the logo loader so the portal opens onto the page itself
  // (site.js checks this class), but only when a view transition is actually going to play.
  addEventListener('pagereveal', (e) => {
    if (!e.viewTransition || !arriving) return;
    e.viewTransition.types.add(arriving);
  });
  if (arriving === 'portal-back' && 'CSSViewTransitionRule' in window
      && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('portal-return');
  }
})();
