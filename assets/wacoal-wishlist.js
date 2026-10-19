/* Wishlist (heart buttons, header count, wishlist page) and product share buttons.
   Saved handles live in localStorage "items", the same key the old Belle_Doll theme used,
   so wishlists customers built on the old theme carry over. */
(function () {
  var KEY = 'items';

  function read() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(list) ? list.filter(function (h) { return typeof h === 'string' && h; }) : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  function sync() {
    var list = read();
    document.querySelectorAll('[data-wac-wishlist]').forEach(function (btn) {
      var on = list.indexOf(btn.dataset.productHandle) > -1;
      btn.classList.toggle('is-added', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var label = on ? btn.dataset.labelRemove : btn.dataset.labelAdd;
      if (label) btn.setAttribute('aria-label', label);
    });
    document.querySelectorAll('[data-wac-wishlist-count]').forEach(function (el) {
      el.textContent = list.length ? String(list.length) : '';
      el.hidden = !list.length;
    });
  }

  function toggle(handle) {
    var list = read();
    var i = list.indexOf(handle);
    if (i > -1) list.splice(i, 1); else list.push(handle);
    write(list);
    sync();
    return i === -1;
  }

  /* ---- wishlist page ------------------------------------------------ */
  function money(cents, format) {
    var n = (cents || 0) / 100;
    function fmt(value, decimals, thousands, point) {
      var parts = value.toFixed(decimals).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return parts.join(point);
    }
    return (format || 'Rs.{{amount}}').replace(/\{\{\s*(\w+)\s*\}\}/, function (_, kind) {
      if (kind === 'amount_no_decimals') return fmt(n, 0, ',', '.');
      if (kind === 'amount_with_comma_separator') return fmt(n, 2, '.', ',');
      if (kind === 'amount_no_decimals_with_comma_separator') return fmt(n, 0, '.', ',');
      return fmt(n, 2, ',', '.');
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function card(p, root) {
    var img = p.featured_image ? p.featured_image + (p.featured_image.indexOf('?') > -1 ? '&' : '?') + 'width=600' : '';
    var title = String(p.title || '').replace(/^BLS\s*-\s*/, '');
    var compare = p.compare_at_price > p.price ? '<s>' + esc(money(p.compare_at_price, root.dataset.moneyFormat)) + '</s>' : '';
    return '<li class="wac-wl__item" data-wac-wl-item="' + esc(p.handle) + '">' +
      '<a class="wac-wl__image" href="' + esc(p.url) + '" tabindex="-1" aria-hidden="true">' +
        (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" width="600" height="800">' : '') + '</a>' +
      '<button type="button" class="wac-wish-btn wac-wl__remove is-added" data-wac-wishlist data-product-handle="' + esc(p.handle) + '"' +
        ' data-label-add="Add to wishlist" data-label-remove="Remove from wishlist" aria-pressed="true" aria-label="Remove from wishlist">' +
        root.querySelector('[data-wac-wl-heart]').innerHTML + '</button>' +
      '<a class="wac-wl__title" href="' + esc(p.url) + '">' + esc(title) + '</a>' +
      '<span class="wac-wl__price"><span>' + esc(money(p.price, root.dataset.moneyFormat)) + '</span>' + compare + '</span>' +
      (p.available ? '' : '<span class="wac-wl__soldout">Sold out</span>') +
      '<a class="wac-wl__view" href="' + esc(p.url) + '">View product</a>' +
    '</li>';
  }

  function renderPage(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    var grid = root.querySelector('[data-wac-wl-grid]');
    var empty = root.querySelector('[data-wac-wl-empty]');
    var list = read();
    var base = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
    function done() {
      var has = !!grid.children.length;
      grid.hidden = !has;
      empty.hidden = has;
      root.classList.remove('is-loading');
    }
    if (!list.length) { done(); return; }
    Promise.all(list.map(function (handle) {
      return fetch(base + 'products/' + encodeURIComponent(handle) + '.js', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    })).then(function (products) {
      var gone = [];
      grid.innerHTML = products.map(function (p, i) {
        if (!p) { gone.push(list[i]); return ''; }
        return card(p, root);
      }).join('');
      if (gone.length) write(read().filter(function (h) { return gone.indexOf(h) === -1; }));
      sync();
      done();
    });
  }

  /* ---- share -------------------------------------------------------- */
  function copy(btn) {
    var url = btn.dataset.url || location.href;
    var label = btn.querySelector('[data-wac-share-status]');
    function shown() {
      btn.classList.add('is-copied');
      if (label) label.textContent = 'Link copied';
      setTimeout(function () {
        btn.classList.remove('is-copied');
        if (label) label.textContent = '';
      }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(shown, function () { window.prompt('Copy this link', url); });
    } else {
      window.prompt('Copy this link', url);
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-wac-wishlist]');
    if (btn) {
      e.preventDefault();
      var added = toggle(btn.dataset.productHandle);
      var item = !added && btn.closest('[data-wac-wl-item]');
      if (item) {
        var root = item.closest('[data-wac-wishlist-page]');
        item.remove();
        if (root && !root.querySelector('[data-wac-wl-item]')) {
          root.querySelector('[data-wac-wl-grid]').hidden = true;
          root.querySelector('[data-wac-wl-empty]').hidden = false;
        }
      }
      return;
    }
    var share = e.target.closest('[data-wac-share-copy]');
    if (share) {
      e.preventDefault();
      copy(share);
    }
  });

  window.addEventListener('storage', function (e) { if (e.key === KEY) sync(); });

  function init() {
    sync();
    document.querySelectorAll('[data-wac-wishlist-page]').forEach(renderPage);
  }

  // product details are re-rendered on variant change; re-mark any new heart buttons
  var queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; init(); });
  }

  function start() {
    init();
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var nodes = records[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType === 1 && (n.matches('[data-wac-wishlist], [data-wac-wishlist-page]') || n.querySelector('[data-wac-wishlist], [data-wac-wishlist-page]'))) {
            queue();
            return;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('shopify:section:load', init);
})();
