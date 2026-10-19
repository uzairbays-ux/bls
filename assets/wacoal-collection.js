/* Collection and search grids (sections/wacoal-main-collection.liquid, sections/wacoal-search.liquid):
   inline filter drop-downs, filter drawer, sort, infinite load. Works off data-wac-* attributes. */
(function () {
  // leave empty price boxes out of the address
  function cleanSubmit(form) {
    form.querySelectorAll('input[type="number"]').forEach(function (i) { i.disabled = i.value === ''; });
    form.submit();
  }
  function init(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    var inline = root.querySelector('[data-wac-inline-form]');
    var drawer = root.querySelector('[data-wac-drawer]');
    var dform = root.querySelector('[data-wac-drawer-form]');

    // inline drop-downs: open one at a time, apply on change
    var dds = Array.prototype.slice.call(root.querySelectorAll('[data-wac-dd]'));
    function closeAll(except) {
      dds.forEach(function (d) {
        if (d === except) return;
        var p = d.querySelector('[data-wac-dd-panel]'); var t = d.querySelector('[data-wac-dd-trigger]');
        p.hidden = true; t.setAttribute('aria-expanded', 'false'); d.classList.remove('is-open');
      });
    }
    dds.forEach(function (d) {
      var t = d.querySelector('[data-wac-dd-trigger]'); var p = d.querySelector('[data-wac-dd-panel]');
      t.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = p.hidden;
        closeAll(d);
        p.hidden = !open; t.setAttribute('aria-expanded', open ? 'true' : 'false'); d.classList.toggle('is-open', open);
      });
      p.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    document.addEventListener('click', function () { closeAll(null); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(null); closeDrawer(); } });
    if (inline) {
      inline.addEventListener('change', function (e) {
        if (e.target.matches('input[type="checkbox"], select')) cleanSubmit(inline);
      });
      inline.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.matches('input[type="number"]')) { e.preventDefault(); cleanSubmit(inline); }
      });
      inline.querySelectorAll('input[type="number"]').forEach(function (i) { i.addEventListener('change', function () { cleanSubmit(inline); }); });
    }

    // drawer
    var opener = null;
    function openDrawer() {
      opener = document.activeElement;
      drawer.hidden = false;
      document.documentElement.classList.add('wac-drawer-open');
      requestAnimationFrame(function () { drawer.classList.add('is-open'); });
      var c = drawer.querySelector('.wac-drawer__close'); if (c) c.focus();
    }
    function closeDrawer() {
      if (!drawer || drawer.hidden) return;
      drawer.classList.remove('is-open');
      document.documentElement.classList.remove('wac-drawer-open');
      setTimeout(function () { drawer.hidden = true; }, 250);
      if (opener && opener.focus) opener.focus();
    }
    root.querySelectorAll('[data-wac-drawer-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); closeAll(null); openDrawer(); }); });
    if (drawer) drawer.querySelectorAll('[data-wac-drawer-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
    if (dform) {
      dform.addEventListener('submit', function (e) { e.preventDefault(); cleanSubmit(dform); });
      var countEl = dform.querySelector('[data-wac-apply-count]');
      dform.addEventListener('change', function () {
        var n = dform.querySelectorAll('input[type="checkbox"]:checked').length;
        dform.querySelectorAll('input[type="number"]').forEach(function (i) { if (i.value !== '') n += 0.5; });
        if (countEl) countEl.textContent = Math.ceil(n);
      });
    }
  }
  // infinite load: append the next page's cards when the end of the grid comes near
  function initMore(root) {
    var more = root.querySelector('[data-wac-more]');
    var grid = root.querySelector('[data-wac-grid]');
    if (!more || !grid || !more.dataset.next) return;
    root.classList.add('wac-coll--infinite');
    var status = more.querySelector('[data-wac-more-status]');
    var spinner = more.querySelector('[data-wac-more-spinner]');
    var btn = more.querySelector('[data-wac-more-btn]');
    var busy = false;
    function done() {
      observer.disconnect();
      spinner.hidden = true; btn.hidden = true;
      status.textContent = 'You have seen all ' + more.dataset.total + ' products';
    }
    function load() {
      var next = more.dataset.next;
      if (busy || !next) return;
      if (document.documentElement.dataset.wacNoAutoload) return;
      busy = true; spinner.hidden = false; btn.hidden = true;
      var url = next + (next.indexOf('?') > -1 ? '&' : '?') + 'section_id=' + encodeURIComponent(more.dataset.section);
      fetch(url, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var cells = doc.querySelectorAll('[data-wac-grid] > .wac-coll__cell');
          cells.forEach(function (c) { grid.appendChild(document.importNode(c, true)); });
          var nextMore = doc.querySelector('[data-wac-more]');
          more.dataset.next = nextMore ? nextMore.dataset.next : '';
          more.dataset.shown = nextMore ? nextMore.dataset.shown : more.dataset.total;
          status.textContent = 'Showing ' + more.dataset.shown + ' of ' + more.dataset.total;
          busy = false; spinner.hidden = true;
          if (!more.dataset.next) { done(); return; }
          // still near the end (tall screens): keep going
          var rect = more.getBoundingClientRect();
          if (rect.top < window.innerHeight + 800) load();
        })
        .catch(function () {
          busy = false; spinner.hidden = true; btn.hidden = false;
        });
    }
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) load();
    }, { rootMargin: '0px 0px 800px 0px' });
    observer.observe(more);
    btn.addEventListener('click', function () { delete document.documentElement.dataset.wacNoAutoload; load(); });
  }

  function all() {
    document.querySelectorAll('[data-wac-coll]').forEach(function (root) {
      var fresh = !root.dataset.ready;
      init(root);
      if (fresh) initMore(root);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
  document.addEventListener('shopify:section:load', all);
})();
