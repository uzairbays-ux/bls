/* Thin progress bar under the swipe rows on phones (Intimissimi style): a light track with a dark
   thumb sized to the visible share of the row and moved with its scroll. Phones only (CSS). */
(function () {
  if (window.blsScrollbar) return;
  var SEL = '.wac-featured__track, .wac-styles__list, .wac-tiles--mobile-swipe, .bls-edit__row, .wac-pdp__slider, .wac-pdp__match-list, .wac-similar__list';

  function attach(el) {
    if (el.__blsBar) return;
    var bar = document.createElement('div');
    bar.className = 'bls-scrollbar';
    bar.setAttribute('aria-hidden', 'true');
    var thumb = document.createElement('span');
    thumb.className = 'bls-scrollbar__thumb';
    bar.appendChild(thumb);
    el.insertAdjacentElement('afterend', bar);
    el.__blsBar = bar;
    var queued = false;
    function update() {
      queued = false;
      var max = el.scrollWidth - el.clientWidth;
      bar.hidden = max <= 1;
      if (max <= 1) return;
      var w = Math.max((el.clientWidth / el.scrollWidth) * 100, 12);
      var p = Math.min(1, Math.max(0, el.scrollLeft / max));
      thumb.style.width = w + '%';
      thumb.style.transform = 'translateX(' + (p * (100 - w) / w) * 100 + '%)';
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    el.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    if (window.ResizeObserver) new ResizeObserver(queue).observe(el);
    update();
  }

  function init() { document.querySelectorAll(SEL).forEach(attach); }
  window.blsScrollbar = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.addEventListener('load', init);
  document.addEventListener('shopify:section:load', init);
  /* rows that arrive later (product recommendations, infinite loads) */
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; init(); }, 300);
  }).observe(document.body, { childList: true, subtree: true });
})();
