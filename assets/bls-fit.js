/* Fit pages (sections/bls-fit-calculator, bls-fit-size-picker, bls-fit-guides).
   Sizes follow BLS's own bra chart (the old "The Perfect Fit" page):
   underbust 27-28" = band 32, 29-30 = 34, 31-32 = 36, 33-35 = 38, 36-38 = 40, 39-41 = 42;
   bust minus band gives the cup (1" A ... 6" E), the 42 band takes DD at 5-6" and E at 7-8".
   Measurements round to the nearest whole inch, a half rounds up ("don't round your size down"). */
(function () {
  if (window.blsFit) return;

  var CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G', 'H'];
  var BANDS = [[27, 28, 32], [29, 30, 34], [31, 32, 36], [33, 35, 38], [36, 38, 40], [39, 41, 42]];
  var CHART = {
    32: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'DD' },
    34: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'DD' },
    36: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'DD' },
    38: { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'DD', 6: 'E' },
    40: { 3: 'C', 4: 'D', 5: 'DD', 6: 'E' },
    42: { 4: 'D', 5: 'DD', 6: 'DD', 7: 'E', 8: 'E' }
  };
  /* S/M/L bra chart (same as the product size charts) */
  var LETTER = {
    S: ['30B', '30C', '30D', '32B'],
    M: ['32C', '32D', '32DD', '34B', '34C', '36B'],
    L: ['34D', '34DD', '36C', '36D', '38B', '38C'],
    XL: ['34E', '36DD', '36E', '38D', '38DD'],
    '2X': ['38E', '40C', '40D', '42C'],
    '3X': ['40DD', '42D']
  };

  function inChart(band, cup) {
    var row = CHART[band];
    if (!row) return false;
    for (var k in row) if (row[k] === cup) return true;
    return false;
  }
  function round(x) { return Math.floor(x + 0.5); }
  /* sister sizes within what the shop sells: bands 32-44, cups A-F */
  function sisters(band, cup) {
    var i = CUPS.indexOf(cup), out = [];
    if (i < 0) return out;
    if (i + 1 <= CUPS.indexOf('F') && band - 2 >= 32) out.push((band - 2) + CUPS[i + 1]);
    if (i - 1 >= CUPS.indexOf('A') && band + 2 <= 44) out.push((band + 2) + CUPS[i - 1]);
    return out;
  }
  function letterOf(size) {
    for (var k in LETTER) if (LETTER[k].indexOf(size) > -1) return k;
    return '';
  }

  /* inches in, size or a reason out */
  function fromMeasure(under, bust) {
    if (!(bust > under)) return { error: 'Your bust measurement should be bigger than your underbust. Please check both numbers.' };
    var u = round(under), b = round(bust), band = 0;
    for (var i = 0; i < BANDS.length; i++) if (u >= BANDS[i][0] && u <= BANDS[i][1]) band = BANDS[i][2];
    if (!band) {
      return { error: u < 27
        ? 'Your underbust is smaller than our size chart: our smallest band, 32, fits 27 to 28 in (69 to 71 cm). Our fit team can help you choose.'
        : 'Your underbust is bigger than our size chart: our largest band, 42, fits 39 to 41 in (99 to 104 cm). Our fit team can help you choose.' };
    }
    var diff = b - band, cup = CHART[band][diff];
    if (cup) return { size: band + cup, band: band, cup: cup };
    var keys = Object.keys(CHART[band]).map(Number), min = Math.min.apply(null, keys), max = Math.max.apply(null, keys);
    /* outside this band's cups: the nearest sister size that the chart has */
    var generic = CUPS[Math.max(0, Math.min(CUPS.length - 1, diff))];
    var tries = sisters(band, generic);
    for (var t = 0; t < tries.length; t++) {
      var m = tries[t].match(/^(\d+)(\D+)$/);
      if (m && inChart(+m[1], m[2])) return { size: tries[t], band: +m[1], cup: m[2], note: 'Our chart has no ' + band + generic + ', so this is your closest sister size.' };
    }
    return { error: diff < min
      ? 'Your bust is smaller than the cups in our chart for a ' + band + ' band. Our fit team can help you choose.'
      : 'Your bust is bigger than the cups in our chart for a ' + band + ' band. Our fit team can help you choose.' };
  }

  /* ---------- result panel ---------- */
  function Result(root) {
    this.root = root;
    this.coll = root.dataset.collectionUrl || '/collections/bras';
    this.req = 0;
  }
  Result.prototype.q = function (s) { return this.root.querySelector(s); };
  Result.prototype.hide = function () {
    this.root.hidden = true;
  };
  Result.prototype.error = function (text) {
    this.root.hidden = false;
    this.q('[data-fit-result-ok]').hidden = true;
    this.q('[data-fit-result-error]').hidden = false;
    this.q('[data-fit-error-text]').textContent = text;
    this.q('[data-fit-products-wrap]').hidden = true;
    this.focus();
  };
  Result.prototype.show = function (r, eyebrow) {
    var self = this;
    this.root.hidden = false;
    this.q('[data-fit-result-ok]').hidden = false;
    this.q('[data-fit-result-error]').hidden = true;
    this.q('[data-fit-eyebrow]').textContent = eyebrow || 'Your BLS size';
    this.q('[data-fit-size]').textContent = r.size;
    var note = this.q('[data-fit-note]');
    note.hidden = !r.note;
    note.textContent = r.note || '';
    var sis = sisters(r.band, r.cup), dd = this.q('[data-fit-sisters]');
    dd.innerHTML = '';
    sis.forEach(function (s, n) {
      if (n) dd.appendChild(document.createTextNode(' · '));
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bls-fit-result__sister'; b.textContent = s;
      b.setAttribute('aria-label', 'Show bras in ' + s);
      b.addEventListener('click', function () { self.products(s); });
      dd.appendChild(b);
    });
    this.q('[data-fit-sisters-row]').hidden = !sis.length;
    var letter = letterOf(r.size);
    this.q('[data-fit-letter]').textContent = letter;
    this.q('[data-fit-letter-row]').hidden = !letter;
    this.products(r.size);
    this.focus();
  };
  Result.prototype.focus = function () {
    var box = this.q('[data-fit-result-box]');
    var top = this.root.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: top, behavior: 'smooth' });
    try { box.focus({ preventScroll: true }); } catch (e) { box.focus(); }
  };
  Result.prototype.products = function (size) {
    var self = this, id = ++this.req;
    var filter = '?filter.v.option.size=' + encodeURIComponent(size);
    var shop = this.q('[data-fit-shop]');
    shop.href = this.coll + filter;
    shop.textContent = 'Shop bras in ' + size;
    var wrap = this.q('[data-fit-products-wrap]'), grid = this.q('[data-fit-products]'), empty = this.q('[data-fit-empty]');
    this.q('[data-fit-size-inline]').textContent = size;
    wrap.hidden = false;
    grid.innerHTML = '';
    grid.classList.add('is-loading');
    empty.hidden = true;
    fetch(this.coll + filter + '&section_id=bls-fit-products')
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (id !== self.req) return;
        grid.classList.remove('is-loading');
        var list = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-fit-products-list]');
        var items = list ? list.children : [];
        if (!items.length) {
          empty.hidden = false;
          var sis = sisters(+size.match(/^\d+/)[0], size.replace(/^\d+/, ''));
          empty.textContent = 'Nothing in ' + size + ' is in stock right now.' + (sis.length ? ' Try a sister size: ' + sis.join(' or ') + '.' : '');
          return;
        }
        grid.innerHTML = list.innerHTML;
      })
      .catch(function () { if (id === self.req) { grid.classList.remove('is-loading'); wrap.hidden = true; } });
  };

  /* ---------- calculator ---------- */
  var IN_WHOLE = [25, 50], CM_WHOLE = [60, 130];
  var IN_FRAC = [['0', '0'], ['0.125', '1/8'], ['0.25', '1/4'], ['0.375', '3/8'], ['0.5', '1/2'], ['0.625', '5/8'], ['0.75', '3/4'], ['0.875', '7/8']];
  var CM_FRAC = [['0', '0'], ['0.5', '.5']];

  function fill(select, list, keepFirst) {
    var html = keepFirst ? '<option value="">--</option>' : '';
    list.forEach(function (o) { html += '<option value="' + o[0] + '">' + o[1] + '</option>'; });
    select.innerHTML = html;
  }
  function range(a, b) { var o = []; for (var i = a; i <= b; i++) o.push([String(i), String(i)]); return o; }

  function initCalc(root) {
    var unit = 'in';
    var btn = root.querySelector('[data-fit-calc]');
    var result = new Result(root.querySelector('[data-fit-result]'));
    var get = function (key) {
      var w = root.querySelector('[data-fit-whole="' + key + '"]').value;
      if (w === '') return null;
      return parseFloat(w) + parseFloat(root.querySelector('[data-fit-frac="' + key + '"]').value || 0);
    };
    var check = function () { btn.disabled = get('under') === null || get('over') === null; };
    root.querySelectorAll('[data-fit-unit]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.fitUnit === unit) return;
        unit = b.dataset.fitUnit;
        root.querySelectorAll('[data-fit-unit]').forEach(function (x) {
          var on = x === b;
          x.classList.toggle('is-active', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var w = unit === 'in' ? IN_WHOLE : CM_WHOLE;
        root.querySelectorAll('[data-fit-whole]').forEach(function (s) { fill(s, range(w[0], w[1]), true); });
        root.querySelectorAll('[data-fit-frac]').forEach(function (s) { fill(s, unit === 'in' ? IN_FRAC : CM_FRAC); });
        var hint = root.querySelector('[data-fit-unit-hint]');
        if (hint) hint.textContent = unit === 'in' ? 'In inches' : 'In centimetres';
        result.hide();
        check();
      });
    });
    root.addEventListener('change', function (e) { if (e.target.matches('select')) check(); });
    btn.addEventListener('click', function () {
      var u = get('under'), o = get('over');
      if (u === null || o === null) return;
      if (unit === 'cm') { u = u / 2.54; o = o / 2.54; }
      var r = fromMeasure(u, o);
      if (r.error) result.error(r.error); else result.show(r);
    });
    root.querySelectorAll('[data-fit-reset]').forEach(function (b) {
      b.addEventListener('click', function () {
        root.querySelectorAll('[data-fit-whole]').forEach(function (s) { s.value = ''; });
        root.querySelectorAll('[data-fit-frac]').forEach(function (s) { s.selectedIndex = 0; });
        result.hide(); check();
        var first = root.querySelector('[data-fit-whole="under"]');
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first.focus({ preventScroll: true });
      });
    });
    check();
  }

  /* ---------- I know my size ---------- */
  function initPicker(root) {
    var band = '', cup = '';
    var result = new Result(root.querySelector('[data-fit-result]'));
    function pick(attr, value) {
      root.querySelectorAll('[' + attr + ']').forEach(function (b) {
        var on = b.getAttribute(attr) === value;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    function update() {
      if (!band || !cup) { result.hide(); return; }
      result.show({ size: band + cup, band: +band, cup: cup }, 'Your size');
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fit-band]'), c = e.target.closest('[data-fit-cup]');
      if (b) { band = b.dataset.fitBand; pick('data-fit-band', band); update(); }
      if (c) { cup = c.dataset.fitCup; pick('data-fit-cup', cup); update(); }
      if (e.target.closest('[data-fit-reset]')) {
        band = cup = ''; pick('data-fit-band', ''); pick('data-fit-cup', ''); result.hide();
        var first = root.querySelector('[data-fit-band]');
        if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true }); }
      }
    });
    /* arrow keys move within a radio group */
    root.addEventListener('keydown', function (e) {
      var pill = e.target.closest('.bls-fit-size-pill');
      if (!pill || ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
      var pills = Array.prototype.slice.call(pill.parentNode.children);
      var i = pills.indexOf(pill) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
      if (pills[i]) { e.preventDefault(); pills[i].focus(); pills[i].click(); }
    });
  }

  /* ---------- measuring guide tabs ---------- */
  function initGuides(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-fit-tab]'));
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (j >= 0 && tabs[j]) { e.preventDefault(); tabs[j].focus(); select(tabs[j]); }
      });
    });
  }

  function init() {
    document.querySelectorAll('[data-bls-fit-calc]').forEach(initCalc);
    document.querySelectorAll('[data-bls-fit-picker]').forEach(initPicker);
    document.querySelectorAll('[data-bls-fit-guides]').forEach(initGuides);
  }
  window.blsFit = { fromMeasure: fromMeasure, sisters: sisters, letterOf: letterOf };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
