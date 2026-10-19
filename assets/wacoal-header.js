/* Header hide-on-scroll: Horizon keeps the header sticky ('always'); this slides it up out of view
   when scrolling down and back when scrolling up. A 12px threshold ignores trackpad jitter, the top
   200px always shows it, and it never hides while a mega menu is open. */
(function () {
  var section = document.querySelector('.header-section');
  if (!section) return;
  var root = document.documentElement;
  var last = window.scrollY;
  var travel = 0;
  var hidden = false;
  var queued = false;

  function set(hide) {
    if (hide === hidden) return;
    hidden = hide;
    section.classList.toggle('is-wac-hidden', hide);
    root.classList.toggle('wac-header-hidden', hide);
  }

  function menuOpen() {
    return !!section.querySelector('.menu-list__link[aria-expanded="true"], .header__icon--summary[aria-expanded="true"]');
  }

  function update() {
    queued = false;
    var y = window.scrollY;
    var delta = y - last;
    last = y;
    if (y < 200 || menuOpen()) {
      travel = 0;
      set(false);
      return;
    }
    if (delta === 0) return;
    if ((delta > 0) !== (travel > 0)) travel = 0;
    travel += delta;
    if (travel > 12) set(true);
    else if (travel < -12) set(false);
  }

  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
})();
