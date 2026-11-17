/* Page scale for sub-pages, the same as the home page's inline head script: on laptop and desktop screens the
   design is shown at 110%, and screens shorter than ~860px (measured at that size) scale down to 90% at most.
   Phones and tablets stay at 100%. Loaded without defer in the <head>, so it runs before the page is drawn. */
(function () {
  var r = document.documentElement;
  var BASE = 1.1;
  r.classList.add('js');
  function fit() {
    var z = innerWidth >= 1024 ? BASE * Math.max(0.9, Math.min(1, innerHeight / BASE / 860)) : 1;
    z = Math.round(z * 100) / 100;
    r.style.zoom = z === 1 ? '' : String(z);
    r.style.setProperty('--vz', String(z));
  }
  fit();
  addEventListener('resize', fit);
})();
