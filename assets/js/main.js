/* ==========================================================================
   Арт-Пак Плюс — поведение сайта
   Ванильный JS, без зависимостей. Всё инициализируется по наличию узлов,
   поэтому один файл безопасно подключается на всех страницах.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Один раз на всю страницу: с отключёнными анимациями не крутим слайды
  // и не запускаем полёт коробки в корзину.
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    // Уход по любой ссылке меню — и по пункту, и по подпункту — закрывает
    // бургер: иначе после перехода к якорю на этой же странице меню осталось
    // бы висеть поверх того места, куда только что прокрутили.
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
    // Подменю на сенсорном экране: наводить нечем, поэтому список разделов
    // разворачивается тапом по кнопке-шеврону. Сам пункт остаётся ссылкой
    // на свою страницу, поэтому кнопка отдельная, а не переключатель на нём.
    // На десктопе кнопка скрыта (display:none) и в клики не попадает —
    // там работает наведение, чистым CSS.
    $$('.nav__toggle', nav).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.nav__item');
        if (!item) return;
        var open = !item.classList.contains('is-open');
        // Открытым держим один раздел: два развёрнутых списка сразу
        // не помещаются на экран телефона.
        $$('.nav__item.is-open', nav).forEach(function (other) {
          if (other !== item) {
            other.classList.remove('is-open');
            var b = other.querySelector('.nav__toggle');
            if (b) b.setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* --- Слайдер на главной -----------------------------------------------
     Фон меняется сам — это чисто задний план, без кнопок и индикаторов.
     Текст над ним статичный (лежит вне .slide в разметке), поэтому смена
     картинки его не трогает.
     ---------------------------------------------------------------------- */
  var hero = $('.hero');
  if (hero) {
    var slides = $$('.slide', hero);
    var idx    = 0, timer = null;
    var DUR    = 4200;

    var show = function (n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
    };

    // Тем, кто отключил анимации в системе, слайды не крутим — показываем первый.
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var play = function () { stop(); if (!calm) timer = setInterval(function () { show(idx + 1); }, DUR); };

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

  /* --- Аккордеон: обычный, по клику («Услуги», «Оборудование») ----------- */
  $$('.acc__btn').forEach(function (btn) {
    if (btn.closest('.acc--frame')) return;   // у рамки на «О компании» своя механика ниже
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

  /* --- Аккордеон-рамка на «О компании»: раскрывается наведением ----------
     Курсор навёлся на вкладку — она открывается, предыдущая сама
     складывается. Клик и фокус с клавиатуры работают так же — без мыши
     навести панель нельзя, поэтому это не единственный способ её открыть.
     Курсор ушёл со всей таблицы — последняя открытая вкладка сворачивается
     тем же движением, что и при переключении между вкладками.
     ---------------------------------------------------------------------- */
  $$('.acc--frame').forEach(function (acc) {
    var items = $$('.acc__item', acc);
    var openItem = function (item) {
      items.forEach(function (i) {
        var open = i === item;
        i.classList.toggle('is-open', open);
        $('.acc__btn', i).setAttribute('aria-expanded', String(open));
      });
    };
    items.forEach(function (item) {
      var btn = $('.acc__btn', item);
      item.addEventListener('mouseenter', function () { openItem(item); });
      btn.addEventListener('focus', function () { openItem(item); });
      btn.addEventListener('click', function (e) { e.preventDefault(); openItem(item); });
    });
    acc.addEventListener('mouseleave', function () { openItem(null); });
  });

  /* --- Кнопка «наверх» ---------------------------------------------------- */
  var totop = $('.totop');
  if (totop) {
    var toggleTop = function () { totop.classList.toggle('is-shown', window.scrollY > 520); };
    toggleTop();
    window.addEventListener('scroll', toggleTop, { passive: true });
    totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* --- Корзина ------------------------------------------------------------
     Состав заказа живёт в localStorage: сайт статический, между страницами
     ничего не передашь. Цена берётся из тиражной сетки прайса — какую
     колонку применить, решает введённый тираж.
     ---------------------------------------------------------------------- */
  var CART_KEY = 'apk-cart';

  var readCart = function () {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }                       // приватный режим или битые данные
  };
  var writeCart = function (list) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(list)); } catch (e) {}
    paintBadge();
  };

  // «3,6» → 3.6 руб.; «33 коп.» → 0.33 руб.; «1,80 руб.» → 1.8 руб.
  var toRub = function (s) {
    var n = parseFloat(String(s).replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(n)) return 0;
    return /коп/i.test(s) ? n / 100 : n;
  };
  var money = function (n) { return n.toFixed(2).replace('.', ',') + ' руб.'; };

  // Цена за штуку по тиражу: последняя ступень, порог которой уже пройден.
  var tierPrice = function (tiers, qty) {
    var pick = tiers[0];
    tiers.forEach(function (t) { if (qty >= t[0]) pick = t; });
    return pick[1];
  };

  var paintBadge = function () {
    var n = readCart().length;
    $$('[data-cart-badge]').forEach(function (b) {
      b.textContent = n;
      if (n) { b.removeAttribute('hidden'); } else { b.setAttribute('hidden', ''); }
    });
  };
  paintBadge();

  /* Коробка, улетающая в корзину: подтверждает, что позиция добавилась. */
  var flyToCart = function (from) {
    var target = $$('[data-cart-target], .nav__link--cart').filter(function (el) {
      return el.getBoundingClientRect().width > 0;
    })[0];
    if (!target || !from || calm || !document.body.animate) return;

    var a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
    var fly = document.createElement('div');
    fly.className = 'flyer';
    fly.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 3 3 7.2v9.6L12 21l9-4.2V7.2Z" fill="currentColor" opacity=".9"/>' +
      '<path d="M3 7.2 12 11.5l9-4.3M12 11.5V21" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6"/></svg>';
    fly.style.left = a.left + a.width / 2 - 22 + 'px';
    fly.style.top  = a.top  + a.height / 2 - 22 + 'px';
    document.body.appendChild(fly);

    var dx = b.left + b.width / 2 - (a.left + a.width / 2);
    var dy = b.top  + b.height / 2 - (a.top  + a.height / 2);
    fly.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.55 + 'px,' + (dy * 0.35 - 90) + 'px) scale(.8)', opacity: 1, offset: .55 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.25)', opacity: .1 }
    ], { duration: 750, easing: 'cubic-bezier(.4,.05,.5,1)' })
      .onfinish = function () {
        fly.remove();
        target.classList.add('is-bumped');
        setTimeout(function () { target.classList.remove('is-bumped'); }, 400);
      };
  };

  /* Прайс на странице подгруппы: «плюс» → окошко тиража → добавление. */
  $$('.ptable__row').forEach(function (row) {
    var panel = row.nextElementSibling;
    if (!panel || !panel.classList.contains('pform')) return;
    var btn  = $('.padd', row);
    var qty  = $('.pform__qty', panel);
    var calc = $('[data-calc]', panel);
    var go   = $('.pform__go', panel);
    var tiers;
    try { tiers = JSON.parse(row.dataset.tiers); } catch (e) { return; }

    var recalc = function () {
      var n = Math.max(parseInt(qty.value, 10) || 0, 0);
      var unit = tierPrice(tiers, n);
      calc.innerHTML = n
        ? 'Цена за штуку: <b>' + unit + '</b> · Сумма: <b>' + money(toRub(unit) * n) + '</b>'
        : 'Укажите тираж — покажем цену по прайсу.';
      return { n: n, unit: unit };
    };
    recalc();

    btn.addEventListener('click', function () {
      var open = panel.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { qty.focus(); qty.select(); }
    });
    qty.addEventListener('input', recalc);

    go.addEventListener('click', function () {
      var r = recalc();
      if (!r.n) { qty.focus(); return; }
      var list = readCart();
      var same = list.filter(function (i) { return i.id === row.dataset.id; })[0];
      if (same) { same.qty = r.n; same.price = r.unit; }
      else {
        list.push({
          id: row.dataset.id, name: row.dataset.name, photo: row.dataset.photo,
          size: row.dataset.size, cat: row.dataset.cat, url: row.dataset.url,
          tiers: tiers, qty: r.n, price: r.unit
        });
      }
      writeCart(list);
      flyToCart(go);
      panel.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  /* Страница корзины: таблица состава заказа. */
  var cartRows = $('[data-cart-rows]');
  if (cartRows) {
    var box     = $('[data-cart-box]');
    var empty   = $('[data-cart-empty]');
    var total   = $('[data-cart-total]');
    var summary = $('[data-cart-summary]');

    var cell = function (label, html, align) {
      return '<td class="ptable__c" data-label="' + label + '"' +
             (align ? ' style="text-align:' + align + '"' : '') + '>' + html + '</td>';
    };

    var paintCart = function () {
      var list = readCart();
      var has = list.length > 0;
      if (box)   { if (has) box.removeAttribute('hidden'); else box.setAttribute('hidden', ''); }
      if (empty) { empty.style.display = has ? 'none' : ''; }

      var sum = 0;
      cartRows.innerHTML = list.map(function (i, n) {
        var line = toRub(i.price) * i.qty;
        sum += line;
        return '<tr data-row="' + n + '">' +
          cell('Фото', i.photo ? '<img class="ptable__photo" src="' + i.photo + '" alt="' + i.name + '" loading="lazy">' : '—') +
          cell('Наименование', '<a href="' + i.url + '">' + i.name + '</a><span class="ptable__cat">' + i.cat + '</span>') +
          cell('Размер, мм', i.size || '—') +
          cell('Тираж, шт.', '<input class="cart__qty" type="number" min="1" step="1" value="' + i.qty + '" aria-label="Тираж">', 'right') +
          cell('Цена без НДС', i.price, 'right') +
          cell('Сумма', '<b>' + money(line) + '</b>', 'right') +
          cell('', '<button class="cart__del" type="button" aria-label="Убрать из корзины">' +
                   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.8h15M9.6 6.8V4.6h4.8v2.2M7 6.8l.9 13a1.6 1.6 0 0 0 1.6 1.5h5a1.6 1.6 0 0 0 1.6-1.5l.9-13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>', 'right') +
          '</tr>';
      }).join('');

      if (total) total.textContent = money(sum);
      if (summary) {
        summary.innerHTML = has
          ? 'К заявке приложим состав заказа: <b>' + list.length + '</b> поз. на сумму <b>' + money(sum) + '</b> без НДС.'
          : 'Корзина пуста — заявка уйдёт только с вашим комментарием.';
      }
    };
    paintCart();

    cartRows.addEventListener('input', function (e) {
      if (!e.target.classList.contains('cart__qty')) return;
      var n = +e.target.closest('tr').dataset.row;
      var list = readCart();
      if (!list[n]) return;
      list[n].qty = Math.max(parseInt(e.target.value, 10) || 1, 1);
      if (list[n].tiers) list[n].price = tierPrice(list[n].tiers, list[n].qty);
      writeCart(list);
      paintCart();
    });

    cartRows.addEventListener('click', function (e) {
      var del = e.target.closest('.cart__del');
      if (!del) return;
      var list = readCart();
      list.splice(+del.closest('tr').dataset.row, 1);
      writeCart(list);
      paintCart();
    });
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
        '',
        get('message')
      ].filter(Boolean);

      // Состав заказа переносим в письмо из корзины — руками его вводить не нужно.
      if (form.hasAttribute('data-cart-form')) {
        var order = readCart(), sum = 0;
        if (order.length) {
          lines.push('', 'Состав заказа:');
          order.forEach(function (i, n) {
            sum += toRub(i.price) * i.qty;
            lines.push((n + 1) + '. ' + i.cat + ' — ' + i.name +
                       ' · тираж ' + i.qty + ' шт. · ' + i.price + ' за шт. · ' +
                       money(toRub(i.price) * i.qty));
          });
          lines.push('Итого без НДС: ' + money(sum));
        }
      }

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
