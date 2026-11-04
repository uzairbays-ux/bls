/* Size Calculator on product pages: opens the BLS bra size calculator (sections/bls-fit-calculator.liquid,
   fetched on first open) in a pop-up, and offers to pick the size it works out on this product.
   The link comes from snippets/bls-size-guide-ui.liquid; closing is handled by bls-size-guide.js. */
(function () {
  var dialog, body, pick, loaded = false;

  function fitScript(src, done) {
    if (window.blsFit && window.blsFit.init) return done();
    var s = document.querySelector('script[data-bls-fit-js]');
    if (!s) {
      s = document.createElement('script');
      s.src = src;
      s.dataset.blsFitJs = '1';
      document.head.appendChild(s);
    }
    s.addEventListener('load', done, { once: true });
  }

  function sizeInput(size) {
    var inputs = document.querySelectorAll('form [data-wac-option]');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].value.toUpperCase() === size.toUpperCase()) return inputs[i];
    }
    return null;
  }

  function offer(size) {
    pick.hidden = !size;
    if (!size) return;
    var input = sizeInput(size), text = pick.querySelector('[data-calc-pick-text]'), btn = pick.querySelector('[data-calc-pick]');
    var label = input && document.querySelector('label[for="' + input.id + '"]');
    if (!input) {
      text.textContent = 'This style does not come in ' + size + '. Try one of the bras shown below.';
      btn.hidden = true;
    } else if (label && label.classList.contains('is-unavailable')) {
      text.textContent = size + ' is sold out in this colour right now.';
      btn.hidden = true;
    } else {
      text.textContent = 'Your size ' + size + ' is available in this style.';
      btn.textContent = 'Select ' + size;
      btn.dataset.size = size;
      btn.hidden = false;
    }
  }

  function build(opener) {
    dialog = document.createElement('dialog');
    dialog.className = 'bls-sg__modal bls-calc__modal';
    dialog.setAttribute('aria-labelledby', 'BlsCalcTitle');
    dialog.innerHTML =
      '<div class="bls-sg__head"><h2 class="bls-sg__title" id="BlsCalcTitle"></h2>' +
      '<button type="button" class="bls-sg__close" data-bls-sg-close aria-label="Close">&#215;</button></div>' +
      '<div class="bls-calc__body" data-calc-body><p class="bls-calc__loading">Loading the calculator...</p></div>' +
      '<div class="bls-calc__pick" data-calc-pick-bar hidden><p class="bls-calc__pick-text" data-calc-pick-text></p>' +
      '<button type="button" class="bls-calc__pick-btn" data-calc-pick hidden></button></div>';
    dialog.querySelector('#BlsCalcTitle').textContent = opener.textContent.trim();
    document.body.appendChild(dialog);
    body = dialog.querySelector('[data-calc-body]');
    pick = dialog.querySelector('[data-calc-pick-bar]');
    dialog.addEventListener('bls-fit:size', function (e) { offer(e.detail && e.detail.size); });
    pick.querySelector('[data-calc-pick]').addEventListener('click', function () {
      var input = sizeInput(this.dataset.size);
      dialog.close();
      if (!input) return;
      input.click();
      input.closest('.wac-pdp__option').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function load(opener) {
    loaded = true;
    fetch(opener.dataset.calcUrl)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        // the calculator page's title is an H1; inside the product page it is a pop-up heading
        body.innerHTML = html.replace(/<h1 class="bls-fit-tool__title"([^>]*)>/, '<h2 class="bls-fit-tool__title"$1>').replace(/<\/h1>/, '</h2>');
        fitScript(opener.dataset.calcJs, function () { window.blsFit.init(body); });
      })
      .catch(function () {
        loaded = false;
        body.innerHTML = '<p class="bls-calc__loading">The calculator did not load. <a href="/pages/the-perfect-fit?view=bra-fit-calculator">Open it on its own page</a>.</p>';
      });
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-bls-calc-open]');
    if (!opener) return;
    e.preventDefault();
    if (!dialog) build(opener);
    if (!loaded) load(opener);
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
  });
})();
