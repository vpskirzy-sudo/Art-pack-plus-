/* ==========================================================================
   Арт-Пак Плюс — поведение сайта
   Ванильный JS, без зависимостей. Всё инициализируется по наличию узлов,
   поэтому один файл безопасно подключается на всех страницах.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- Шапка: тень при прокрутке ---------------------------------------- */
  var header = $('.header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- Мобильное меню ---------------------------------------------------- */
  var burger = $('.burger'), nav = $('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('.nav__link', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --- Слайдер на главной -----------------------------------------------
     Слайды меняются только сами: кнопок перелистывания нет. Полоски внизу —
     индикатор прогресса, а не элементы управления.
     ---------------------------------------------------------------------- */
  var hero = $('.hero');
  if (hero) {
    var slides = $$('.slide', hero);
    var dots   = $$('.hero__dot', hero);
    var idx    = 0, timer = null;
    var DUR    = 7000;

    var show = function (n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
      dots.forEach(function (d, i) {
        d.classList.remove('is-active');
        if (i === idx) {                       // перезапуск CSS-анимации полосы
          void d.offsetWidth;
          d.classList.add('is-active');
        }
      });
    };

    // Тем, кто отключил анимации в системе, слайды не крутим — показываем первый.
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var play = function () { stop(); if (!calm) timer = setInterval(function () { show(idx + 1); }, DUR); };

    hero.style.setProperty('--slide-dur', DUR + 'ms');
    show(0);
    play();

    // В фоновой вкладке таймер не тратим — и не «перематываем» слайды пачкой.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else play();
    });
  }

  /* --- Появление блоков при прокрутке ------------------------------------ */
  var reveals = $$('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });
      reveals.forEach(function (el, i) {
        el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
        io.observe(el);
      });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  /* --- Счётчики в блоке «цифры» ------------------------------------------ */
  var nums = $$('[data-count]');
  if (nums.length && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, to = parseFloat(el.dataset.count), suf = el.dataset.suffix || '';
        var plain = el.hasAttribute('data-plain');   // годы и т.п. — без разделителя разрядов
        var t0 = null, D = 1400;
        var step = function (ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / D, 1);
          var e = 1 - Math.pow(1 - p, 3);
          var v = Math.round(to * e);
          el.textContent = (plain ? String(v) : v.toLocaleString('ru-RU')) + suf;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io2.unobserve(el);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io2.observe(el); });
  }

  /* --- Фильтр каталога продукции ----------------------------------------- */
  var filters = $$('.filter');
  if (filters.length) {
    var cards = $$('[data-cat]');
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        filters.forEach(function (x) { x.classList.remove('is-active'); });
        f.classList.add('is-active');
        var cat = f.dataset.filter;
        cards.forEach(function (c) {
          var ok = cat === 'all' || c.dataset.cat.split(' ').indexOf(cat) !== -1;
          c.style.display = ok ? '' : 'none';
        });
      });
    });
  }

  /* --- Аккордеон ---------------------------------------------------------- */
  $$('.acc__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.acc__item');
      var open = item.classList.contains('is-open');
      $$('.acc__item', btn.closest('.acc')).forEach(function (i) {
        i.classList.remove('is-open');
        $('.acc__btn', i).setAttribute('aria-expanded', 'false');
      });
      if (!open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* --- Кнопка «наверх» ---------------------------------------------------- */
  var totop = $('.totop');
  if (totop) {
    var toggleTop = function () { totop.classList.toggle('is-shown', window.scrollY > 520); };
    toggleTop();
    window.addEventListener('scroll', toggleTop, { passive: true });
    totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* --- Форма заявки -------------------------------------------------------
     Сайт статический, серверной части нет: форма собирает письмо на
     info@gofrocarton.by и открывает почтовый клиент. Если появится бэкенд —
     достаточно заменить тело submit-обработчика на fetch().
     ---------------------------------------------------------------------- */
  $$('.form').forEach(function (form) {
    var ok = $('.form__ok', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;
      // Проверяем обязательные поля и, дополнительно, заполненные необязательные:
      // необязательный e-mail с опечаткой иначе молча ушёл бы в письмо.
      var checked = $$('[required], input[type=email], input[type=tel]', form);
      checked.forEach(function (input) {
        var field = input.closest('.field');
        var val = input.value.trim();
        var need = input.hasAttribute('required');
        var bad;
        if (!val) {
          bad = need;                                   // пустое поле — ошибка только если обязательное
        } else if (input.type === 'email') {
          bad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
        } else if (input.type === 'tel') {
          bad = val.replace(/\D/g, '').length < 7;
        } else {
          bad = false;
        }
        field.classList.toggle('has-error', bad);
        if (bad && valid) { input.focus(); }
        if (bad) valid = false;
      });
      if (!valid) return;

      var get = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
      var lines = [
        'Имя: '     + get('name'),
        'Телефон: ' + get('phone'),
        'E-mail: '  + get('email'),
        get('product') ? 'Изделие: ' + get('product') : '',
        get('size')    ? 'Размеры: ' + get('size')    : '',
        get('qty')     ? 'Тираж: '   + get('qty')     : '',
        '',
        get('message')
      ].filter(Boolean);

      window.location.href = 'mailto:info@gofrocarton.by'
        + '?subject=' + encodeURIComponent(form.dataset.subject || 'Заявка с сайта gofrocarton.by')
        + '&body='    + encodeURIComponent(lines.join('\n'));

      if (ok) { ok.classList.add('is-shown'); }
      form.reset();
    });

    $$('input, textarea', form).forEach(function (input) {
      input.addEventListener('input', function () {
        input.closest('.field').classList.remove('has-error');
      });
    });
  });

  /* --- Год в подвале ------------------------------------------------------ */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
