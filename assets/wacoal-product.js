/* Wacoal replica: product page behaviour (sections/wacoal-main-product.liquid,
   sections/wacoal-product-recommendations.liquid, snippets/wacoal-pdp-card.liquid).
   Photo slider, colour circles, band/cup and size buttons, quantity, add to cart, feature
   cards, product rows with arrows, and the ADD NOW size pickers on small cards. */
import { CartAddEvent } from '@theme/events';

const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

function cartSectionIds() {
  return Array.from(document.querySelectorAll('cart-items-component'))
    .map((el) => el instanceof HTMLElement && el.dataset.sectionId)
    .filter(Boolean);
}

/**
 * Adds a variant to the cart and tells the theme (cart count, cart drawer).
 * @param {string|number} id
 * @param {number} quantity
 * @param {Element} source
 */
async function addToCart(id, quantity, source) {
  const body = new FormData();
  body.append('id', String(id));
  body.append('quantity', String(quantity));
  const ids = cartSectionIds();
  if (ids.length) {
    body.append('sections', ids.join(','));
    body.append('sections_url', window.location.pathname);
  }
  const response = await fetch(root + 'cart/add.js', {
    method: 'POST',
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body,
  });
  const data = await response.json();
  if (!response.ok || data.status) {
    throw new Error(data.description || data.message || 'Could not add to cart');
  }
  let cart;
  try {
    cart = await (await fetch(root + 'cart.js', { headers: { Accept: 'application/json' } })).json();
  } catch (e) {
    cart = undefined;
  }
  source.dispatchEvent(
    new CartAddEvent(cart, String(id), {
      source: 'product-form-component',
      itemCount: Number(quantity),
      productId: String(data.product_id || ''),
      variantId: String(id),
      sections: data.sections,
    })
  );
  return data;
}

/* ---------- side-scrolling rows (photos, Complete your look, Similar styles) ---------- */

function initCarousel(box) {
  if (box.dataset.wacReady) return;
  box.dataset.wacReady = '1';
  const list = box.querySelector('[data-wac-carousel-list]');
  const prev = box.querySelector('[data-wac-carousel-prev]');
  const next = box.querySelector('[data-wac-carousel-next]');
  if (!list) return;
  const step = () => {
    const item = list.firstElementChild;
    if (!item) return list.clientWidth;
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    const w = item.getBoundingClientRect().width + gap;
    return Math.max(1, Math.floor((list.clientWidth + gap) / w)) * w;
  };
  const update = () => {
    const max = list.scrollWidth - list.clientWidth - 1;
    if (prev) prev.disabled = list.scrollLeft <= 1;
    if (next) next.disabled = list.scrollLeft >= max;
  };
  if (prev) prev.addEventListener('click', () => list.scrollBy({ left: -step(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => list.scrollBy({ left: step(), behavior: 'smooth' }));
  list.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ---------- product page ---------- */

class WacoalProduct {
  /** @param {HTMLElement} el */
  constructor(el) {
    this.el = el;
    const json = el.querySelector('[data-wac-pdp-json]');
    this.data = json ? JSON.parse(json.textContent) : { variants: [], colorIndex: -1, sizeIndex: -1 };
    this.form = el.querySelector('[data-wac-form]');
    this.idInput = el.querySelector('[data-wac-id]');
    this.addBtn = el.querySelector('[data-wac-add]');
    this.message = el.querySelector('[data-wac-message]');
    this.qty = el.querySelector('[data-wac-qty]');
    this.color = null;
    if (this.data.multiColor) {
      const active = el.querySelector('[data-wac-color].is-active');
      this.color = active ? active.dataset.wacColor : null;
    }
    this.initGallery();
    this.initBar();
    this.initOptions();
    this.initQuantity();
    this.initFeatures();
    this.loadSiblings();
    el.querySelectorAll('[data-wac-carousel]').forEach(initCarousel);
    if (this.form) this.form.addEventListener('submit', (e) => this.onSubmit(e));
    this.refresh(false);
  }

  /* photos */
  initGallery() {
    const slider = this.el.querySelector('[data-wac-slider]');
    if (!slider) return;
    this.slider = slider;
    const prev = this.el.querySelector('[data-wac-prev]');
    const next = this.el.querySelector('[data-wac-next]');
    const dots = Array.from(this.el.querySelectorAll('[data-wac-dot]'));
    const thumbsBox = this.el.querySelector('[data-wac-thumbs]');
    const thumbs = Array.from(this.el.querySelectorAll('[data-wac-thumb]'));
    const slides = () => Array.from(slider.children);
    const index = () => {
      const w = slides()[0] ? slides()[0].getBoundingClientRect().width : slider.clientWidth;
      const gap = parseFloat(getComputedStyle(slider).columnGap) || 0;
      return Math.round(slider.scrollLeft / (w + gap));
    };
    this.goTo = (i, smooth = true) => {
      const target = slides()[i];
      if (!target) return;
      slider.scrollTo({ left: target.offsetLeft - slider.firstElementChild.offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
    };
    const update = () => {
      const i = index();
      const max = slider.scrollWidth - slider.clientWidth - 1;
      if (prev) prev.disabled = slider.scrollLeft <= 1;
      if (next) next.disabled = slider.scrollLeft >= max;
      dots.forEach((d, n) => d.classList.toggle('is-active', n === i));
      thumbs.forEach((t, n) => {
        const on = n === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-current', on ? 'true' : 'false');
        // keep the active thumb in view inside its own column (never scrolls the page)
        if (on && thumbsBox) {
          const top = t.offsetTop; // the thumbs column is position: relative
          if (top < thumbsBox.scrollTop) thumbsBox.scrollTop = top;
          else if (top + t.offsetHeight > thumbsBox.scrollTop + thumbsBox.clientHeight) thumbsBox.scrollTop = top + t.offsetHeight - thumbsBox.clientHeight;
        }
      });
    };
    if (prev) prev.addEventListener('click', () => this.goTo(Math.max(0, index() - 1)));
    if (next) next.addEventListener('click', () => this.goTo(Math.min(slides().length - 1, index() + 1)));
    dots.forEach((d) => d.addEventListener('click', () => this.goTo(Number(d.dataset.wacDot))));
    thumbs.forEach((t) => t.addEventListener('click', () => this.goTo(Number(t.dataset.wacThumb))));
    slider.addEventListener('scroll', update, { passive: true });
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); this.goTo(Math.min(slides().length - 1, index() + 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.goTo(Math.max(0, index() - 1)); }
    });
    window.addEventListener('resize', update);
    update();
    this.initZoom(slider, index);
  }

  /* sticky bar (Intimissimi): title, price, colour and the add button once the real button scrolls away */
  initBar() {
    const bar = this.el.querySelector('[data-wac-bar]');
    const add = this.el.querySelector('[data-wac-add]');
    if (!bar || !add) return;
    const btn = bar.querySelector('[data-wac-bar-btn]');
    const price = bar.querySelector('[data-wac-bar-price]');
    const color = bar.querySelector('[data-wac-bar-color]');
    const mainPrice = this.el.querySelector('[data-wac-price] .wac-pdp__price-now');
    const mainColor = this.el.querySelector('[data-wac-color-name]');
    const sync = () => {
      btn.textContent = add.textContent.trim();
      btn.disabled = add.disabled;
      btn.classList.toggle('is-ready', add.classList.contains('is-ready'));
      if (price && mainPrice) price.textContent = mainPrice.textContent;
      if (color && mainColor) color.textContent = mainColor.textContent;
    };
    sync();
    new MutationObserver(sync).observe(add, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled'] });
    if (mainPrice) new MutationObserver(sync).observe(mainPrice.parentElement, { childList: true, characterData: true, subtree: true });
    if (mainColor) new MutationObserver(sync).observe(mainColor, { childList: true, characterData: true, subtree: true });
    const row = add.closest('.wac-pdp__add-row') || add;
    // shown once the add button has gone up off the screen (checked on every scroll: a jump from
    // below the button to above it never crosses the screen edge, so an IntersectionObserver misses it)
    let shown = false;
    let queued = false;
    const check = () => {
      queued = false;
      const show = row.getBoundingClientRect().bottom < 0;
      if (show === shown) return;
      shown = show;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      btn.tabIndex = show ? 0 : -1;
    };
    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(check);
    }, { passive: true });
    window.addEventListener('resize', check);
    check();
    btn.addEventListener('click', () => {
      if (add.classList.contains('is-ready') && !add.disabled) {
        add.click();
        return;
      }
      // no size yet: back to the size buttons
      const target = this.el.querySelector('[data-wac-band-group], [data-wac-option-group]') || row;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
    });
  }

  /* zoom: full-screen viewer, click to zoom 2.5x, mouse pans (desktop), drag scrolls (touch) */
  initZoom(slider, index) {
    const dialog = this.el.querySelector('[data-wac-zoom]');
    if (!dialog) return;
    const stage = dialog.querySelector('[data-wac-zoom-stage]');
    const img = dialog.querySelector('[data-wac-zoom-img]');
    const count = dialog.querySelector('[data-wac-zoom-count]');
    const sources = () => Array.from(slider.querySelectorAll('img[data-wac-zoom-src]'));
    let current = 0;
    const setZoom = (on, x, y) => {
      dialog.classList.toggle('is-zoomed', on);
      if (!on) { stage.scrollTo(0, 0); return; }
      requestAnimationFrame(() => {
        stage.scrollLeft = x * (stage.scrollWidth - stage.clientWidth);
        stage.scrollTop = y * (stage.scrollHeight - stage.clientHeight);
      });
    };
    const show = (i) => {
      const list = sources();
      if (!list.length) return;
      current = (i + list.length) % list.length;
      setZoom(false);
      img.src = list[current].dataset.wacZoomSrc;
      img.alt = list[current].alt || '';
      count.textContent = (current + 1) + ' / ' + list.length;
      dialog.classList.toggle('is-single', list.length < 2);
    };
    const open = (i) => {
      show(i);
      if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
      document.documentElement.classList.add('wac-zoom-open');
    };
    const close = () => {
      if (dialog.open && dialog.close) dialog.close(); else dialog.removeAttribute('open');
    };
    dialog.addEventListener('close', () => { setZoom(false); document.documentElement.classList.remove('wac-zoom-open'); });
    slider.addEventListener('click', (e) => {
      const slideImg = e.target.closest('img[data-wac-zoom-src]');
      if (!slideImg) return;
      open(sources().indexOf(slideImg));
    });
    const btn = this.el.querySelector('[data-wac-zoom-open]');
    if (btn) btn.addEventListener('click', () => open(index()));
    dialog.querySelector('[data-wac-zoom-close]').addEventListener('click', close);
    dialog.querySelector('[data-wac-zoom-prev]').addEventListener('click', () => show(current - 1));
    dialog.querySelector('[data-wac-zoom-next]').addEventListener('click', () => show(current + 1));
    img.addEventListener('click', (e) => {
      const r = img.getBoundingClientRect();
      setZoom(!dialog.classList.contains('is-zoomed'), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    stage.addEventListener('mousemove', (e) => {
      if (!dialog.classList.contains('is-zoomed') || e.buttons) return;
      const r = stage.getBoundingClientRect();
      stage.scrollLeft = ((e.clientX - r.left) / r.width) * (stage.scrollWidth - stage.clientWidth);
      stage.scrollTop = ((e.clientY - r.top) / r.height) * (stage.scrollHeight - stage.clientHeight);
    });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
    });
  }

  showMedia(mediaId) {
    if (!this.slider || !mediaId || !this.goTo) return;
    const slides = Array.from(this.slider.children);
    const i = slides.findIndex((s) => s.dataset.mediaId === String(mediaId));
    if (i > -1) this.goTo(i);
  }

  /* options */
  initOptions() {
    this.el.addEventListener('change', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.matches('[data-wac-band], [data-wac-cup], [data-wac-option]')) {
        if (this.message) this.message.hidden = true;
        this.refresh(true);
      }
    });
    this.el.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-wac-color]') : null;
      if (!btn) return;
      this.color = btn.dataset.wacColor;
      this.el.querySelectorAll('[data-wac-color]').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const name = this.el.querySelector('[data-wac-color-name]');
      if (name) name.textContent = btn.dataset.name || this.color;
      const v = this.data.variants.find((x) => x.options[this.data.colorIndex] === this.color && x.media);
      if (v) this.showMedia(v.media);
      this.refresh(true);
    });
  }

  checked(selector) {
    const input = this.el.querySelector(selector + ':checked');
    return input ? input.value : null;
  }

  /** The values picked so far, one per option (null = not picked yet). */
  picked() {
    const { colorIndex, sizeIndex, split } = this.data;
    if (this.data.variants.length === 1) return this.data.variants[0].options.slice();
    const count = this.data.variants[0] ? this.data.variants[0].options.length : 0;
    const values = new Array(count).fill(null);
    if (colorIndex > -1) {
      values[colorIndex] = this.data.multiColor ? this.color : this.data.variants[0].options[colorIndex];
    }
    for (let i = 0; i < count; i++) {
      if (i === colorIndex) continue;
      if (i === sizeIndex && split) {
        const band = this.checked('[data-wac-band]');
        const cup = this.checked('[data-wac-cup]');
        values[i] = band && cup ? band + cup : null;
      } else {
        values[i] = this.checked(`[data-wac-option="${i}"]`);
      }
    }
    return values;
  }

  match(values) {
    return this.data.variants.find((v) =>
      v.options.every((o, i) => values[i] === null || String(o).toUpperCase() === String(values[i]).toUpperCase())
    );
  }

  /** Grey out the buttons that cannot make an available variant with the other picks. */
  updateAvailability(values) {
    const { colorIndex, sizeIndex, split, variants } = this.data;
    const fits = (v, skip) =>
      v.available &&
      v.options.every((o, i) => i === skip || values[i] === null || String(o).toUpperCase() === String(values[i]).toUpperCase());
    if (split && sizeIndex > -1) {
      const band = this.checked('[data-wac-band]');
      const cup = this.checked('[data-wac-cup]');
      this.el.querySelectorAll('[data-wac-band]').forEach((input) => {
        const ok = variants.some((v) => {
          const s = String(v.options[sizeIndex]).toUpperCase();
          return fits(v, sizeIndex) && s.slice(0, 2) === input.value && (!cup || s.slice(2) === cup);
        });
        input.nextElementSibling.classList.toggle('is-unavailable', !ok);
      });
      this.el.querySelectorAll('[data-wac-cup]').forEach((input) => {
        const ok = variants.some((v) => {
          const s = String(v.options[sizeIndex]).toUpperCase();
          return fits(v, sizeIndex) && s.slice(2) === input.value && (!band || s.slice(0, 2) === band);
        });
        input.nextElementSibling.classList.toggle('is-unavailable', !ok);
      });
    }
    this.el.querySelectorAll('[data-wac-option]').forEach((input) => {
      const i = Number(input.dataset.wacOption);
      const ok = variants.some((v) => fits(v, i) && String(v.options[i]) === input.value);
      input.nextElementSibling.classList.toggle('is-unavailable', !ok);
    });
    if (colorIndex > -1 && this.data.multiColor) {
      this.el.querySelectorAll('[data-wac-color]').forEach((b) => {
        const ok = variants.some((v) => fits(v, colorIndex) && v.options[colorIndex] === b.dataset.wacColor);
        b.classList.toggle('is-unavailable', !ok);
      });
    }
  }

  refresh(fromUser) {
    const values = this.picked();
    this.updateAvailability(values);
    this.el.querySelectorAll('[data-wac-band-group], [data-wac-cup-group], [data-wac-option-group]').forEach((group) => {
      const label = group.querySelector('[data-wac-picked-label]');
      const input = group.querySelector('input:checked');
      if (label) label.textContent = input ? input.value : '';
    });
    const complete = values.every((v) => v !== null);
    const variant = complete ? this.match(values) : null;
    this.variant = variant || null;
    if (this.idInput) this.idInput.value = variant ? String(variant.id) : '';
    const shown = variant || this.match(values.map((v, i) => (i === this.data.colorIndex ? v : null)));
    if (shown) {
      this.el.querySelectorAll('[data-wac-price]').forEach((box) => {
        box.innerHTML = '';
        const now = document.createElement('span');
        now.className = 'wac-pdp__price-now';
        now.textContent = shown.price;
        box.appendChild(now);
        if (shown.compare) {
          const was = document.createElement('s');
          was.className = 'wac-pdp__price-was';
          was.textContent = shown.compare;
          box.appendChild(was);
        }
      });
    }
    this.setButton();
    if (fromUser && variant) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', String(variant.id));
      window.history.replaceState({}, '', url.toString());
      if (variant.media && this.data.multiColor) this.showMedia(variant.media);
    }
  }

  setButton(state) {
    const btn = this.addBtn;
    if (!btn) return;
    const d = btn.dataset;
    btn.classList.remove('is-ready', 'is-busy');
    btn.disabled = false;
    if (state === 'busy') {
      btn.textContent = d.labelAdding;
      btn.classList.add('is-ready', 'is-busy');
      return;
    }
    if (state === 'added') {
      btn.textContent = d.labelAdded;
      btn.classList.add('is-ready');
      return;
    }
    const anyAvailable = this.data.variants.some((v) => v.available);
    if (!anyAvailable) {
      btn.textContent = d.labelSold;
      btn.disabled = true;
    } else if (!this.variant) {
      btn.textContent = d.labelSelect;
    } else if (!this.variant.available) {
      btn.textContent = d.labelSold;
      btn.disabled = true;
    } else {
      btn.textContent = d.labelAdd;
      btn.classList.add('is-ready');
    }
  }

  say(text) {
    if (!this.message) return;
    this.message.textContent = text;
    this.message.hidden = !text;
  }

  async onSubmit(e) {
    e.preventDefault();
    if (!this.variant) {
      this.say('Please select your size.');
      const first = this.el.querySelector('.wac-pdp__sizes');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!this.variant.available) return;
    const quantity = Math.max(1, parseInt(this.qty ? this.qty.value : '1', 10) || 1);
    this.setButton('busy');
    this.say('');
    try {
      await addToCart(this.variant.id, quantity, this.form);
      this.setButton('added');
      setTimeout(() => this.setButton(), 2000);
    } catch (err) {
      this.setButton();
      this.say(err instanceof Error ? err.message : String(err));
    }
  }

  /* quantity */
  initQuantity() {
    const minus = this.el.querySelector('[data-wac-minus]');
    const plus = this.el.querySelector('[data-wac-plus]');
    const input = this.qty;
    if (!input) return;
    const set = (n) => {
      const v = Math.min(99, Math.max(1, n || 1));
      input.value = String(v);
      if (minus) minus.disabled = v <= 1;
    };
    if (minus) minus.addEventListener('click', () => set(parseInt(input.value, 10) - 1));
    if (plus) plus.addEventListener('click', () => set(parseInt(input.value, 10) + 1));
    input.addEventListener('change', () => set(parseInt(input.value, 10)));
  }

  /* feature cards */
  initFeatures() {
    this.el.querySelectorAll('[data-wac-feature]').forEach((head) => {
      head.addEventListener('click', () => {
        const card = head.closest('.wac-pdp__feature');
        const body = card ? card.querySelector('.wac-pdp__feature-body') : null;
        const open = head.getAttribute('aria-expanded') !== 'true';
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (card) card.classList.toggle('is-open', open);
        if (body) body.hidden = !open;
      });
    });
  }

  /* colours sold as separate products */
  async loadSiblings() {
    const url = this.el.dataset.siblingsUrl;
    const list = this.el.querySelector('[data-wac-swatches]');
    if (!url || !list) return;
    try {
      const html = await (await fetch(url)).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = doc.querySelector('[data-wac-siblings]');
      if (!fresh) return;
      const items = Array.from(fresh.children);
      if (!items.some((li) => li.dataset.handle === this.el.dataset.handle)) {
        const own = list.querySelector('.wac-pdp__swatch-item');
        if (own) items.unshift(own.cloneNode(true));
      }
      if (items.length < 2) return;
      items.forEach((li) => {
        const a = li.querySelector('.wac-pdp__swatch');
        const on = li.dataset.handle === this.el.dataset.handle;
        if (a) {
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true');
        }
      });
      list.replaceChildren(...items);
      const name = this.el.querySelector('[data-wac-color-name]');
      const own = name ? name.textContent : '';
      list.addEventListener('mouseover', (e) => {
        const a = e.target instanceof Element ? e.target.closest('.wac-pdp__swatch') : null;
        if (a && name) name.textContent = a.dataset.name || own;
      });
      list.addEventListener('mouseleave', () => {
        if (name) name.textContent = own;
      });
    } catch (e) {
      /* keep the single circle */
    }
  }
}

/* ---------- Similar styles (loaded after the page) ---------- */

async function loadSimilar(box) {
  if (box.dataset.wacReady) return;
  box.dataset.wacReady = '1';
  if (box.querySelector('[data-wac-carousel]')) {
    box.querySelectorAll('[data-wac-carousel]').forEach(initCarousel);
    return;
  }
  const load = async () => {
    try {
      const html = await (await fetch(box.dataset.url)).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const inner = doc.querySelector('[data-wac-similar] [data-wac-carousel]');
      if (!inner) {
        box.hidden = true;
        return;
      }
      box.replaceChildren(inner);
      initCarousel(inner);
    } catch (e) {
      box.hidden = true;
    }
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        io.disconnect();
        load();
      }
    }, { rootMargin: '600px 0px' });
    io.observe(box);
  } else {
    load();
  }
}

/* ---------- ADD NOW on small cards ---------- */

if (!window.__wacQuickAdd) {
  window.__wacQuickAdd = true;
  const busy = (el, on) => {
    const box = el.closest('.wac-pcard__actions');
    if (box) box.classList.toggle('is-busy', on);
  };
  document.addEventListener('change', async (e) => {
    const select = e.target;
    if (!(select instanceof HTMLSelectElement) || !select.matches('[data-wac-quick-add]') || !select.value) return;
    busy(select, true);
    try {
      await addToCart(select.value, 1, select);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
    select.selectedIndex = 0;
    busy(select, false);
  });
  document.addEventListener('click', async (e) => {
    const btn = e.target instanceof Element ? e.target.closest('[data-wac-quick-add-id]') : null;
    if (!btn || !(btn instanceof HTMLElement)) return;
    busy(btn, true);
    try {
      await addToCart(btn.dataset.wacQuickAddId, 1, btn);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
    busy(btn, false);
  });
}

function initAll() {
  document.querySelectorAll('[data-wac-pdp]').forEach((el) => {
    if (el instanceof HTMLElement && !el.dataset.wacReady) {
      el.dataset.wacReady = '1';
      new WacoalProduct(el);
    }
  });
  document.querySelectorAll('[data-wac-similar]').forEach((el) => el instanceof HTMLElement && loadSimilar(el));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
else initAll();
document.addEventListener('shopify:section:load', initAll);
