/* ==========================================================================
   MEGAHACK — логика сайта (vanilla JS, без зависимостей)

   1. Шапка: фон при скролле, мобильное меню, активный пункт
   2. Универсальные вкладки (data-tab / data-subtab) с клавиатурой
   3. Симулятор меню на главной
   4. Аккордеоны
   5. FAQ: категории + живой поиск
   6. Демо-ссылки (пока нет реальных URL)
   7. Появление блоков при скролле
   8. Бегущая строка и год в футере
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------------
     Тост
     ------------------------------------------------------------------------ */
  var toastTimer = null;

  function toast(message) {
    var el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.innerHTML =
        '<svg class="ico" aria-hidden="true"><use href="#i-check"></use></svg><span></span>';
      document.body.appendChild(el);
    }
    $('span', el).textContent = message;
    void el.offsetWidth;
    el.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  /* ------------------------------------------------------------------------
     1. Шапка
     ------------------------------------------------------------------------ */
  var header = $('.hdr');
  var burger = $('#burger');
  var nav = $('#nav');

  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function closeNav() {
    if (!nav || !burger) return;
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  if (burger && nav) {
    var backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', closeNav);

    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    });
    $$('a', nav).forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1000) closeNav();
    });
  }

  var page = document.body.getAttribute('data-page');
  $$('.nav-link[data-page]').forEach(function (link) {
    if (link.getAttribute('data-page') === page) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  /* ------------------------------------------------------------------------
     2. Вкладки
     ------------------------------------------------------------------------ */
  function bindTabs(group, attr, panelAttr) {
    var buttons = $$('[' + attr + ']', group);
    var panels = $$('[' + panelAttr + ']', group);
    if (!buttons.length || !panels.length) return;

    function activate(btn) {
      var value = btn.getAttribute(attr);
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (panel) {
        panel.classList.toggle('active', panel.getAttribute(panelAttr) === value);
      });
    }

    buttons.forEach(function (btn, i) {
      btn.tabIndex = btn.classList.contains('active') ? 0 : -1;
      btn.addEventListener('click', function () { activate(btn); });
      btn.addEventListener('keydown', function (e) {
        var keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
        if (keys.indexOf(e.key) === -1) return;
        e.preventDefault();
        var next = i;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % buttons.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + buttons.length) % buttons.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = buttons.length - 1;
        activate(buttons[next]);
        buttons[next].focus();
      });
    });
  }

  $$('[data-tab-group]').forEach(function (group) {
    bindTabs(group, 'data-tab', 'data-tab-panel');
  });
  $$('[data-subtab-group]').forEach(function (group) {
    bindTabs(group, 'data-subtab', 'data-subtab-panel');
  });

  /* ------------------------------------------------------------------------
     3. Симулятор меню
     ------------------------------------------------------------------------ */
  var overlay = $('[data-ov]');
  if (overlay) {
    var railButtons = $$('[data-ov-tab]', overlay);
    var ovPanels = $$('[data-ov-panel]', overlay);

    function updateCounts() {
      $$('[data-ov-panel]', overlay).forEach(function (panel) {
        var out = $('[data-ov-count]', panel);
        if (!out) return;
        out.textContent = String($$('.sw:checked', panel).length);
      });
    }

    railButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-ov-tab');
        railButtons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', String(on));
        });
        ovPanels.forEach(function (panel) {
          panel.classList.toggle('active', panel.getAttribute('data-ov-panel') === value);
        });
        updateCounts();
      });
    });

    $$('.sw', overlay).forEach(function (input) {
      input.addEventListener('change', updateCounts);
    });
    updateCounts();

    /* Подпись внизу панели: выравнивает короткие вкладки по высоте */
    ovPanels.forEach(function (panel) {
      var note = document.createElement('p');
      note.className = 'ov-note';
      note.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-check"></use></svg>применяется сразу';
      panel.appendChild(note);
    });

    $$('.rng', overlay).forEach(function (range) {
      var output = range.parentElement.querySelector('output');
      function paint() {
        var pct = ((range.value - range.min) / (range.max - range.min)) * 100;
        range.style.setProperty('--fill', pct + '%');
        if (output) output.textContent = (range.value / 100).toFixed(2) + 'x';
      }
      range.addEventListener('input', paint);
      paint();
    });
  }

  /* ------------------------------------------------------------------------
     4. Аккордеоны
     ------------------------------------------------------------------------ */
  function bindAccordion(item) {
    var trigger = $('.acc-trigger', item);
    if (!trigger) return;
    trigger.addEventListener('click', function () {
      var willOpen = !item.classList.contains('open');
      var group = item.parentElement;
      if (willOpen && group) {
        $$('.acc-item.open', group).forEach(function (other) {
          if (other === item) return;
          other.classList.remove('open');
          var otherTrigger = $('.acc-trigger', other);
          if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
        });
      }
      item.classList.toggle('open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
  }
  $$('.acc-item').forEach(bindAccordion);

  /* ------------------------------------------------------------------------
     5. FAQ: фильтр по категориям + поиск
     ------------------------------------------------------------------------ */
  var faqSearch = $('#faqSearch');
  var faqItems = $$('.acc-item[data-category]');
  var faqChips = $$('[data-filter]');
  var faqEmpty = $('#faqEmpty');
  var activeFilter = 'all';

  function normalize(str) {
    return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function applyFaqFilter() {
    var needle = normalize(faqSearch ? faqSearch.value : '');
    var visible = 0;

    faqItems.forEach(function (item) {
      var categoryOk = activeFilter === 'all' || item.getAttribute('data-category') === activeFilter;
      var haystack = normalize(item.textContent);
      var searchOk = !needle || haystack.indexOf(needle) !== -1;
      var show = categoryOk && searchOk;
      item.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });

    if (faqEmpty) faqEmpty.classList.toggle('show', visible === 0 && faqItems.length > 0);
  }

  faqChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      activeFilter = chip.getAttribute('data-filter') || 'all';
      faqChips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', String(on));
      });
      applyFaqFilter();
    });
  });

  if (faqSearch) {
    var searchWrap = faqSearch.closest('.search');
    var clearBtn = $('.search-clear', searchWrap);

    faqSearch.addEventListener('input', function () {
      if (searchWrap) searchWrap.classList.toggle('has-value', faqSearch.value.length > 0);
      applyFaqFilter();
    });
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        faqSearch.value = '';
        searchWrap.classList.remove('has-value');
        faqSearch.focus();
        applyFaqFilter();
      });
    }
  }

  var faqReset = $('[data-faq-reset]');
  if (faqReset) {
    faqReset.addEventListener('click', function () {
      if (faqSearch) {
        faqSearch.value = '';
        var wrap = faqSearch.closest('.search');
        if (wrap) wrap.classList.remove('has-value');
      }
      activeFilter = 'all';
      faqChips.forEach(function (chip) {
        var on = chip.getAttribute('data-filter') === 'all';
        chip.classList.toggle('active', on);
        chip.setAttribute('aria-pressed', String(on));
      });
      applyFaqFilter();
    });
  }

  /* ------------------------------------------------------------------------
     6. Демо-ссылки (заглушки, пока нет реальных URL)
     ------------------------------------------------------------------------ */
  $$('[data-demo]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      toast('Ссылка пока недоступна');
    });
  });

  /* ------------------------------------------------------------------------
     7. Появление блоков при скролле
     ------------------------------------------------------------------------ */
  var revealEls = $$('.reveal');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      revealEls.forEach(function (el) { observer.observe(el); });
    }
  }

  /* ------------------------------------------------------------------------
     8. Бегущая строка и год
     ------------------------------------------------------------------------ */
  var tickers = $$('.ticker-track');
  tickers.forEach(function (track) {
    if (track.getAttribute('data-cloned') === 'true') return;
    track.innerHTML += track.innerHTML;
    track.setAttribute('data-cloned', 'true');
  });

  $$('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
