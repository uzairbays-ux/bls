/* Store locator (sections/bls-store-locator.liquid): the city filters and the one map that follows the chosen store. */
(function () {
  function init(root) {
    if (root.dataset.blsReady) return;
    root.dataset.blsReady = 'true';
    var map = root.querySelector('[data-bls-map]');
    var mapBox = root.querySelector('[data-bls-map-box]');
    var picks = Array.prototype.slice.call(root.querySelectorAll('[data-bls-pick]'));
    var cities = Array.prototype.slice.call(root.querySelectorAll('[data-bls-city]'));
    var groups = Array.prototype.slice.call(root.querySelectorAll('[data-bls-group]'));
    var phone = window.matchMedia('(max-width: 749px)');

    function select(pick) {
      picks.forEach(function (p) {
        var on = p === pick;
        p.setAttribute('aria-pressed', on ? 'true' : 'false');
        p.closest('.bls-stores__store').classList.toggle('is-active', on);
      });
      map.src = pick.getAttribute('data-bls-pick');
      map.title = 'Map: ' + pick.getAttribute('data-bls-name');
    }

    picks.forEach(function (pick) {
      pick.addEventListener('click', function () {
        select(pick);
        if (phone.matches) mapBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    cities.forEach(function (button) {
      button.addEventListener('click', function () {
        var city = button.getAttribute('data-bls-city');
        cities.forEach(function (b) {
          var on = b === button;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        groups.forEach(function (group) {
          group.hidden = city !== '' && group.getAttribute('data-bls-group') !== city;
        });
        var first = root.querySelector('[data-bls-group]:not([hidden]) [data-bls-pick]');
        if (first) select(first);
      });
    });
  }

  function start() {
    document.querySelectorAll('[data-bls-stores]').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  document.addEventListener('shopify:section:load', start);
})();
