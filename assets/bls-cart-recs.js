/* Cart drawer: the "You may also like" row. The products load when the drawer opens and again when the
   bag changes (sections/bls-cart-recommendations.liquid), so pages where it stays shut fetch nothing. */
(function () {
  function initArrows(box) {
    var list = box.querySelector('[data-bls-recs-list]');
    var prev = box.querySelector('[data-bls-recs-prev]');
    var next = box.querySelector('[data-bls-recs-next]');
    if (!list || !prev || !next) return;

    function update() {
      prev.disabled = list.scrollLeft <= 1;
      next.disabled = list.scrollLeft >= list.scrollWidth - list.clientWidth - 1;
    }

    prev.addEventListener('click', function () {
      list.scrollBy({ left: -list.clientWidth * 0.8, behavior: 'smooth' });
    });
    next.addEventListener('click', function () {
      list.scrollBy({ left: list.clientWidth * 0.8, behavior: 'smooth' });
    });
    list.addEventListener('scroll', update, { passive: true });
    update();
  }

  function load(dialog) {
    var box = dialog.querySelector('[data-bls-cart-recs]');
    if (!box || !dialog.open || box.blsBag === box.dataset.bag) return;
    var bag = box.dataset.bag;
    box.blsBag = bag;

    fetch(box.dataset.url)
      .then(function (response) {
        return response.ok ? response.text() : '';
      })
      .then(function (html) {
        if (box.dataset.bag !== bag) return;
        var inner = new DOMParser().parseFromString(html, 'text/html').querySelector('.bls-cart-recs__inner');
        box.replaceChildren();
        if (!inner) return;
        box.appendChild(inner);
        initArrows(inner);
      })
      .catch(function () {
        box.blsBag = '';
      });
  }

  function start() {
    var dialog = document.querySelector('dialog.cart-drawer__dialog');
    if (!dialog || dialog.blsRecsReady) return;
    dialog.blsRecsReady = true;

    new MutationObserver(function () {
      load(dialog);
    }).observe(dialog, { attributes: true, attributeFilter: ['open', 'data-bag'], childList: true, subtree: true });
    load(dialog);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  document.addEventListener('shopify:section:load', start);
})();
