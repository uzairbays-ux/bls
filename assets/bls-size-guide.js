/* Size Guide link + popup (snippets/bls-size-guide-ui.liquid): first .bls-sg-rule[data-kind=main] is the
   chart, every [data-kind=extra] a tab; Sister Size shows when the chart allows it. */
(function () {
  if (window.blsSizeGuide) { window.blsSizeGuide.refresh(); return; }

  function rules(root) {
    var all = Array.prototype.slice.call(root.querySelectorAll('.bls-sg-rule'));
    return {
      main: all.filter(function (r) { return r.dataset.kind === 'main'; })[0] || null,
      extras: all.filter(function (r) { return r.dataset.kind === 'extra'; })
    };
  }

  function refresh() {
    document.querySelectorAll('[data-bls-size-guide]').forEach(function (root) {
      var sister = root.querySelector('[data-bls-sg-sister-link]');
      if (sister) {
        var main = rules(root).main;
        sister.hidden = !(main && main.hasAttribute('data-sister'));
      }
    });
  }

  function panel(src, alt, id, hidden) {
    var p = document.createElement('div');
    p.className = 'bls-sg__panel';
    if (id) { p.id = id; p.setAttribute('role', 'tabpanel'); }
    if (hidden) p.hidden = true;
    var img = document.createElement('img');
    img.src = src; img.alt = alt || 'Size chart'; img.loading = 'lazy';
    p.appendChild(img);
    return p;
  }

  function fill(root, modal) {
    var r = rules(root);
    var tabs = modal.querySelector('[data-bls-sg-tabs]');
    var panels = modal.querySelector('[data-bls-sg-panels]');
    tabs.innerHTML = ''; panels.innerHTML = '';
    var useTabs = !!(r.main && r.extras.length);
    var items = [];
    if (r.main) {
      var mainLabel = 'Size chart';
      for (var i = 0; i < r.extras.length; i++) {
        if (r.extras[i].dataset.mainTab) { mainLabel = r.extras[i].dataset.mainTab; break; }
      }
      items.push({ label: mainLabel, src: r.main.dataset.src, alt: r.main.dataset.alt });
    }
    r.extras.forEach(function (x) { items.push({ label: x.dataset.tab, src: x.dataset.src, alt: x.dataset.alt }); });
    var uid = 'BlsSgPanel-' + Math.random().toString(36).slice(2, 8);
    items.forEach(function (it, n) {
      if (useTabs) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'bls-sg__tab' + (n === 0 ? ' is-active' : '');
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', n === 0 ? 'true' : 'false');
        b.setAttribute('aria-controls', uid + '-' + n);
        b.dataset.blsSgTab = String(n);
        b.textContent = it.label;
        tabs.appendChild(b);
      }
      panels.appendChild(panel(it.src, it.alt, useTabs ? uid + '-' + n : '', useTabs && n > 0));
    });
    tabs.hidden = !useTabs;
  }

  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-bls-sg-open]');
    if (open) {
      var root = open.closest('[data-bls-size-guide]');
      var modal = root && root.querySelector('[data-bls-sg-modal="' + open.dataset.blsSgOpen + '"]');
      if (!modal) return;
      e.preventDefault();
      if (open.dataset.blsSgOpen === 'chart') fill(root, modal);
      if (modal.showModal) modal.showModal(); else modal.setAttribute('open', '');
      return;
    }
    var tab = e.target.closest('[data-bls-sg-tab]');
    if (tab) {
      var m = tab.closest('.bls-sg__modal');
      m.querySelectorAll('[data-bls-sg-tab]').forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      m.querySelectorAll('.bls-sg__panel').forEach(function (p, n) { p.hidden = String(n) !== tab.dataset.blsSgTab; });
      return;
    }
    var close = e.target.closest('[data-bls-sg-close]');
    var backdrop = e.target.classList && e.target.classList.contains('bls-sg__modal');
    if (close || backdrop) {
      var d = close ? close.closest('.bls-sg__modal') : e.target;
      if (d.close) d.close(); else d.removeAttribute('open');
    }
  });

  window.blsSizeGuide = { refresh: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
  // product details are re-rendered on variant change
  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; refresh(); });
  }).observe(document.body, { childList: true, subtree: true });
})();
