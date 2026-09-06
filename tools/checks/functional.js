const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const B = path.resolve(__dirname, '../..') + '/';
let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ✓ ' + n)) : (fail++, console.log('  ✗ ' + n)); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await b.newContext({ viewport:{ width:1440, height:900 } });
  await ctx.route('**', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));

  console.log('Слайдер (фон меняется сам, текст статичен):');
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  ok('кнопок перелистывания на странице нет', await p.locator('.hero__arrow, .hero__dot').count() === 0);
  ok('текст лежит вне .slide — не завязан на конкретный фон',
     await p.locator('.hero__copy').evaluate(e => !e.closest('.slide')));
  ok('на странице ровно один текстовый блок героя', await p.locator('.hero__copy').count() === 1);
  ok('заголовок и кнопки статичны', await (async () => {
      const title = (await p.locator('.hero__title').innerText()).toUpperCase();
      const ok1 = title.includes('УПАКОВКА ИЗ ГОФРОКАРТОНА');
      const ok2 = (await p.locator('.hero__acts .btn').count()) === 2;
      return ok1 && ok2; })());
  ok('стартует с первого слайда', await p.locator('.slide').first().evaluate(e => e.classList.contains('is-active')));
  await p.waitForTimeout(4700);
  ok('сам переключился на 2-й', await p.locator('.slide').nth(1).evaluate(e => e.classList.contains('is-active')));
  ok('текст не изменился при смене фона',
     (await p.locator('.hero__title').innerText()).toUpperCase().includes('УПАКОВКА ИЗ ГОФРОКАРТОНА'));
  await p.waitForTimeout(4400);
  ok('сам переключился на 3-й', await p.locator('.slide').nth(2).evaluate(e => e.classList.contains('is-active')));
  await p.waitForTimeout(4400);
  ok('после третьего вернулся на первый', await p.locator('.slide').nth(0).evaluate(e => e.classList.contains('is-active')));
  ok('наведение мышью не останавливает показ', await (async () => {
      await p.locator('.hero').hover();
      await p.waitForTimeout(4600);
      return await p.locator('.slide').nth(1).evaluate(e => e.classList.contains('is-active')); })());
  ok('кнопка «Рассчитать заказ» на hover получает белую обводку', await (async () => {
      const btn = p.locator('.hero__acts .btn--primary');
      await btn.hover();
      const c = await btn.evaluate(e => getComputedStyle(e).borderColor);
      return c === 'rgb(255, 255, 255)'; })());

  console.log('Счётчики и анимации:');
  // Блок цифр убран целиком — и с главной, и с «О компании» (дублировал уже
  // сказанное в тексте и в карточках принципов работы). Проверяем, что
  // счётчиков-«стат» не осталось нигде на сайте.
  ok('блока цифр («2016 / 1–4 / 20 км») на главной больше нет',
     await p.locator('.stats').count() === 0);
  await p.goto('file://' + B + 'o-kompanii.html', { waitUntil:'domcontentloaded' });
  ok('блока цифр на «О компании» тоже больше нет', await p.locator('.stats').count() === 0);
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  ok('блоки проявляются при прокрутке', await (async () => {
      await p.evaluate(() => { document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0, 1200); });
      await p.waitForTimeout(700);
      return await p.locator('.card').first().evaluate(e => e.classList.contains('is-in')); })());

  console.log('Крафт-карточки «Почему заказывают у нас»:');
  ok('на 4 карточках подключена нумерация «Арт. №» через CSS-счётчик', await (async () => {
      // getComputedStyle(::before).content не считает counter() — он возвращает
      // CSS-выражение как есть, поэтому проверяем сам счётчик, а не готовую строку.
      const grid = await p.locator('.grid--4').evaluate(e => getComputedStyle(e).counterReset);
      const items = await p.locator('.card__num').evaluateAll(els => els.map(e => {
        const c = getComputedStyle(e, '::before');
        return { increment: getComputedStyle(e.closest('.card--kraft')).counterIncrement, content: c.content };
      }));
      const gridOk = grid.includes('artbox');
      const cardsOk = items.length === 4 && items.every(it =>
        it.increment.includes('artbox') && it.content.includes('counter(artbox'));
      return gridOk && cardsOk; })());
  ok('заголовок и текст лежат прямо на картоне, без бирки и ленты',
     await p.locator('.card--kraft .card__label, .card__tape').count() === 0);
  ok('иконка и номер вынесены в один нижний ряд карточки', await p.locator('.card--kraft').first()
      .evaluate(e => {
        const foot = e.querySelector('.card__foot');
        return !!foot && foot.contains(e.querySelector('.card__ico')) && foot.contains(e.querySelector('.card__num'));
      }));
  ok('лицо панели ровное, гофра видна только на торце справа',
     await p.locator('.card--kraft').first().evaluate(e => {
       const face = getComputedStyle(e, '::before').backgroundImage;
       const edge = getComputedStyle(e, '::after').backgroundImage;
       return !face.includes('repeating-linear-gradient')      // на лицевой стороне полос нет
              && face.includes('radial-gradient')              // только мягкие переливы
              && edge.includes('repeating-linear-gradient');   // гофра — на торце
     }));
  ok('при наведении панель приподнимается', await (async () => {
      const card = p.locator('.card--kraft').first();
      const before = await card.evaluate(e => getComputedStyle(e).transform);
      await card.hover();
      await p.waitForTimeout(500);
      const after = await card.evaluate(e => getComputedStyle(e).transform);
      await p.mouse.move(10, 10);
      return after !== before; })());

  console.log('Плашка оборудования на главной:');
  ok('блок «Продажа нового и б/у оборудования» на месте',
     (await p.locator('.band__t').textContent()).includes('б/у оборудования'));
  ok('ведёт в раздел «Оборудование»',
     (await p.locator('.band a').getAttribute('href')) === 'oborudovanie.html');

  console.log('Иллюстрация «Упаковка для маркетплейсов»:');
  const marketSvg = fs.readFileSync(B + 'assets/img/pr-market.svg', 'utf8');
  ok('нарисовано два короба (не один) — 5 полигонов на короб, значит минимум 10',
     (marketSvg.match(/<polygon/g) || []).length >= 10);
  ok('наклейка WB на большем коробе', marketSvg.includes('>WB<'));
  ok('наклейка OZON на меньшем коробе', marketSvg.includes('>OZON<'));

  console.log('Фильтр каталога:');
  await p.goto('file://' + B + 'produkciya.html', { waitUntil:'domcontentloaded' });
  ok('видны все 10 позиций', await p.locator('.prod:visible').count() === 10);
  await p.click('[data-filter="market"]');
  ok('фильтр «для маркетплейсов» оставляет 1', await p.locator('.prod:visible').count() === 1);
  await p.click('[data-filter="korob"]');
  ok('фильтр «короба и ящики» оставляет 2', await p.locator('.prod:visible').count() === 2);
  await p.click('[data-filter="material"]');
  ok('фильтр «гофрокартон» оставляет 1', await p.locator('.prod:visible').count() === 1);
  await p.click('[data-filter="all"]');
  ok('«Всё» возвращает 10', await p.locator('.prod:visible').count() === 10);

  console.log('Каталог: карточки → страницы подгрупп:');
  ok('у каждой карточки есть кнопка «Подробнее»',
     await p.locator('.prod__more').count() === await p.locator('.prod').count());
  const slugs = await p.locator('.prod__more').evaluateAll(
    els => els.map(e => e.getAttribute('href')));
  ok('все кнопки ведут на существующие страницы подгрупп',
     slugs.length > 0 && slugs.every(h => /^produkciya-.+\.html$/.test(h) && fs.existsSync(B + h)));
  ok('переход по кнопке открывает страницу этой же подгруппы', await (async () => {
      const cardTitle = await p.locator('.prod').first().locator('.prod__t').innerText();
      await p.locator('.prod__more').first().click();
      await p.waitForLoadState('domcontentloaded');
      const h1 = await p.locator('h1').innerText();
      return h1.trim() === cardTitle.trim(); })());
  ok('в крошках подгруппы три уровня: Главная → Продукция → товар',
     (await p.locator('.crumbs a').count()) === 2);
  ok('пункт меню «Продукция» подсвечен и на странице подгруппы',
     await p.locator('.nav__link.is-active').evaluate(e => e.textContent.trim() === 'Продукция'));
  console.log('Прайс подгрупп:');
  await p.goto('file://' + B + 'produkciya-gofroyashchiki.html', { waitUntil:'domcontentloaded' });
  ok('у гофроящиков 7 позиций прайса', await p.locator('.ptable__row').count() === 7);
  ok('колонки тиражей собраны под общей шапкой «Цена без НДС»',
     (await p.locator('.ptable__group').innerText()).toLowerCase().includes('цена без ндс') &&
     await p.locator('.ptable__group').getAttribute('colspan') === '3');
  ok('строки пронумерованы автоматически',
     (await p.locator('.ptable__row').last().locator('.ptable__n').innerText()) === '7');
  ok('цены перенесены как в прайсе (577×392×323 П-32 → 3,6 / 3,2 / 3,0)',
     await p.locator('.ptable__row').first().evaluate(
       tr => [...tr.querySelectorAll('td')].slice(3).map(td => td.textContent.trim()).join('|')
     ) === '3,6|3,2|3,0');
  ok('под таблицей — условия доставки со старого сайта',
     (await p.locator('.ptable__note').innerText()).includes('30 рублей'));

  await p.goto('file://' + B + 'produkciya-korobki-dlya-piccy.html', { waitUntil:'domcontentloaded' });
  ok('у пиццы свои тиражи — от 3000 / 5000 / 10 000 шт.',
     (await p.locator('.ptable thead').innerText()).includes('10 000'));

  await p.goto('file://' + B + 'produkciya-gofrokarton.html', { waitUntil:'domcontentloaded' });
  ok('виды гофрокартона: 5 позиций без колонки цены',
     await p.locator('.ptable tbody tr').count() === 5 &&
     await p.locator('.ptable__group').count() === 0);

  await p.goto('file://' + B + 'produkciya-upakovka-dlya-marketpleysov.html', { waitUntil:'domcontentloaded' });
  ok('требования площадок вынесены в отдельные блоки', await p.locator('.ptext').count() === 4);
  ok('есть блоки Wildberries и OZON', await (async () => {
      const t = await p.locator('.ptext__grid').innerText();
      return t.includes('Wildberries') && t.includes('OZON'); })());

  await p.goto('file://' + B + 'produkciya-gofrokonteynery.html', { waitUntil:'domcontentloaded' });
  ok('пока прайса нет — показан честный блок «Цена по запросу», а не пустая таблица',
     await p.locator('.ptable__empty').count() === 1 && await p.locator('.ptable').count() === 0);
  ok('на странице подгруппы есть кнопка запроса цены',
     (await p.locator('.ptable__empty .btn--primary').innerText()).includes('Запросить цену'));

  console.log('Разделители «/»:');
  await p.goto('file://' + B + 'produkciya.html', { waitUntil:'domcontentloaded' });
  ok('в хлебных крошках нет косой черты',
     !(await p.locator('.crumbs').innerText()).includes('/'));
  ok('сокращение «б/у» сохранено на странице оборудования', await (async () => {
      await p.goto('file://' + B + 'oborudovanie.html', { waitUntil:'domcontentloaded' });
      return (await p.locator('h1').innerText()).includes('б/у'); })());

  console.log('Аккордеон:');
  await p.goto('file://' + B + 'uslugi.html', { waitUntil:'domcontentloaded' });
  ok('первый пункт открыт', await p.locator('.acc__item').first().evaluate(e => e.classList.contains('is-open')));
  await p.locator('.acc__btn').nth(2).click();
  ok('клик открывает третий', await p.locator('.acc__item').nth(2).evaluate(e => e.classList.contains('is-open')));
  ok('первый при этом закрылся', await p.locator('.acc__item').first().evaluate(e => !e.classList.contains('is-open')));

  console.log('Корзина:');
  await p.goto('file://' + B + 'produkciya-gofroyashchiki.html', { waitUntil:'domcontentloaded' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil:'domcontentloaded' });
  ok('«Рассчитать заказ» на странице подгруппы заменена на «Перейти к деталям»',
     (await p.locator('.cta__acts .btn--primary').first().innerText()).includes('Перейти к деталям'));
  ok('кнопка ведёт к блоку с прайсом',
     await p.locator('.cta__acts .btn--primary').first().getAttribute('href') === '#price'
     && await p.locator('#price .ptable').count() === 1);
  ok('пустая корзина — счётчик в шапке скрыт',
     await p.locator('.header__cart .cart-badge').isHidden());
  ok('у каждой строки прайса есть «плюс» и своё окошко', await (async () => {
      const rows = await p.locator('.ptable__row').count();
      return rows === 7 && await p.locator('.padd').count() === rows
                        && await p.locator('.pform').count() === rows; })());
  ok('окошко раскрывается по «плюсу» и сворачивается повторным нажатием', await (async () => {
      const btn = p.locator('.padd').first(), form = p.locator('.pform').first();
      await btn.click(); await p.waitForTimeout(420);
      const opened = await form.evaluate(e => e.classList.contains('is-open'))
                  && await btn.getAttribute('aria-expanded') === 'true';
      await btn.click(); await p.waitForTimeout(420);
      return opened && !(await form.evaluate(e => e.classList.contains('is-open'))); })());
  ok('цена пересчитывается по тиражу: 20 шт → 3,6, а 500 шт → 3,2', await (async () => {
      await p.locator('.padd').first().click(); await p.waitForTimeout(420);
      const small = await p.locator('[data-calc]').first().innerText();
      await p.locator('.pform__qty').first().fill('500');
      await p.waitForTimeout(120);
      const big = await p.locator('[data-calc]').first().innerText();
      return small.includes('3,6') && big.includes('3,2') && big.includes('1600,00'); })());
  ok('позиция уходит в корзину, счётчик в шапке растёт', await (async () => {
      await p.locator('.pform__go').first().click();
      await p.waitForTimeout(900);
      return (await p.locator('.header__cart .cart-badge').innerText()) === '1'; })());
  ok('в гофрокартоне цен нет — кнопок «в корзину» там тоже нет', await (async () => {
      await p.goto('file://' + B + 'produkciya-gofrokarton.html', { waitUntil:'domcontentloaded' });
      return await p.locator('.padd').count() === 0 && await p.locator('.ptable tbody tr').count() === 5; })());
  await p.goto('file://' + B + 'korzina.html', { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(200);
  ok('корзина переживает переход между страницами',
     await p.locator('[data-cart-rows] tr').count() === 1);
  ok('в строке корзины есть фото, размер, тираж и сумма', await (async () => {
      const t = await p.locator('[data-cart-rows] tr').first().innerText();
      return await p.locator('[data-cart-rows] .ptable__photo').count() === 1
             && t.includes('577×392×323') && t.includes('1600,00'); })());
  ok('итог считается по тиражной цене',
     (await p.locator('[data-cart-total]').innerText()) === '1600,00 руб.');
  ok('тираж правится прямо в корзине и цена уходит на нижнюю ступень', await (async () => {
      await p.locator('.cart__qty').first().fill('100');
      await p.waitForTimeout(200);
      return (await p.locator('[data-cart-total]').innerText()) === '360,00 руб.'; })());
  ok('позицию можно убрать — остаётся пустая корзина', await (async () => {
      await p.locator('.cart__del').first().click();
      await p.waitForTimeout(200);
      return await p.locator('[data-cart-rows] tr').count() === 0
             && await p.locator('[data-cart-empty]').isVisible()
             && await p.locator('.header__cart .cart-badge').isHidden(); })());

  console.log('Меню:');
  ok('в меню шесть пунктов, последний — «Корзина»', await (async () => {
      const items = await p.locator('.nav__list .nav__link').allInnerTexts();
      return items.length === 6 && items[5].trim() === 'Корзина'; })());
  ok('страницы «Контакты и карта» больше нет ни в меню, ни на диске',
     !(await p.locator('.nav__list').innerText()).includes('Контакты')
     && !fs.existsSync(B + 'kontakty.html'));
  ok('карта переехала на страницу корзины', await p.locator('.map iframe').count() === 1);

  console.log('Форма заявки:');
  await p.goto('file://' + B + 'korzina.html', { waitUntil:'domcontentloaded' });
  await p.click('.form button[type=submit]');
  ok('пустая форма не отправляется, поля подсвечены',
     await p.locator('.field.has-error').count() === 2);
  await p.fill('#f-name', 'Иван');
  ok('ошибка снимается при вводе', await p.locator('#f-name').evaluate(e => !e.closest('.field').classList.contains('has-error')));
  await p.fill('#f-phone', '375291234567');
  await p.fill('#f-email', 'не-почта');
  await p.click('.form button[type=submit]');
  ok('некорректный e-mail отклоняется', await p.locator('#f-email').evaluate(e => e.closest('.field').classList.contains('has-error')));
  await p.fill('#f-email', '');
  await p.click('.form button[type=submit]');
  ok('пустой необязательный e-mail не блокирует отправку',
     await p.locator('#f-email').evaluate(e => !e.closest('.field').classList.contains('has-error')));
  ok('в заявке остались только имя, телефон, e-mail и комментарий',
     await p.locator('.form input, .form textarea, .form select').count() === 4
     && await p.locator('#f-msg').count() === 1);

  console.log('Страница «О компании»:');
  await p.setViewportSize({ width: 1440, height: 1100 });
  await p.goto('file://' + B + 'o-kompanii.html', { waitUntil:'domcontentloaded' });
  ok('заголовок в шапке страницы начинается там же, где заголовок героя на главной', await (async () => {
      const pheadX = await p.locator('.phead h1').evaluate(e => e.getBoundingClientRect().left);
      await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
      const heroX = await p.locator('.hero__title').evaluate(e => e.getBoundingClientRect().left);
      await p.goto('file://' + B + 'o-kompanii.html', { waitUntil:'domcontentloaded' });
      return Math.abs(pheadX - heroX) < 1; })());
  ok('«Плюс» в заголовке — фирменный оранжевый', await p.locator('.phead h1 .brand-plus')
      .evaluate(e => getComputedStyle(e).color === 'rgb(224, 123, 38)'));
  ok('«Плюс» в подвале — тот же оранжевый', await p.locator('.footer .brand-plus').first()
      .evaluate(e => getComputedStyle(e).color === 'rgb(224, 123, 38)'));
  ok('заголовок «Полный цикл на своей площадке» мельче обычного h2',
     await p.locator('.h2--tight').evaluate(e => {
       const probe = document.createElement('h2');
       probe.className = 'h2'; probe.style.visibility = 'hidden'; probe.textContent = 'x';
       document.body.appendChild(probe);
       const base = parseFloat(getComputedStyle(probe).fontSize);
       probe.remove();
       return parseFloat(getComputedStyle(e).fontSize) < base;
     }));
  ok('плюсиков-разворотов на вкладках «О компании» больше нет',
     await p.locator('.acc--frame .acc__ico').count() === 0);
  ok('рамки вокруг таблицы нет, фон — приглушённый непрозрачный оранжевый (--soft)',
     await p.locator('.acc--frame').evaluate(e => {
       const cs = getComputedStyle(e);
       return cs.borderStyle === 'none' && cs.backgroundColor === 'rgb(236, 218, 202)';
     }));
  ok('закруглённые углы таблицы не тронуты', await p.locator('.acc--frame')
      .evaluate(e => parseFloat(getComputedStyle(e).borderRadius) > 0));
  // Рамка открывается наведением, а уход курсора её сворачивает: чтобы проверить
  // именно состояние «по умолчанию», уводим курсор и перезагружаем страницу.
  await p.mouse.move(2, 2);
  await p.reload({ waitUntil:'domcontentloaded' });
  ok('по умолчанию открыта первая вкладка', await p.locator('.acc--frame .acc__item').first()
      .evaluate(e => e.classList.contains('is-open')));
  ok('наведение на третью вкладку открывает её и закрывает первую', await (async () => {
      // Третья вкладка обычно ниже сгиба экрана: если скроллить прямо внутри
      // .hover(), точка приземления мыши считается ДО того, как открытая
      // первая панель успеет схлопнуться (.38s), и реальный курсор попадает
      // на соседний пункт, сдвинувшийся вверх во время анимации. Скроллим
      // и ждём осадки раскладки заранее, отдельно от самого наведения.
      const third = p.locator('.acc--frame .acc__item').nth(2);
      await third.scrollIntoViewIfNeeded();
      await p.waitForTimeout(300);
      await third.hover();
      await p.waitForTimeout(300);
      const thirdOpen = await third.evaluate(e => e.classList.contains('is-open'));
      const firstClosed = await p.locator('.acc--frame .acc__item').first().evaluate(e => !e.classList.contains('is-open'));
      return thirdOpen && firstClosed; })());
  ok('панель раскрывается поворотом, а не просто списком (эффект «листа»)',
     await p.locator('.acc--frame .acc__panel > div').nth(2)
       .evaluate(e => getComputedStyle(e).transform !== 'none'));
  ok('уход курсора со всей таблицы сворачивает последнюю открытую вкладку', await (async () => {
      await p.mouse.move(50, 50);
      await p.waitForTimeout(250);
      return await p.locator('.acc--frame .acc__item').nth(2).evaluate(e => !e.classList.contains('is-open')); })());

  console.log('Стрелка «к содержимому» под заголовком:');
  for (const page of ['index','o-kompanii','produkciya','uslugi','oborudovanie']) {
    await p.goto('file://' + B + page + '.html', { waitUntil:'domcontentloaded' });
    ok('на «' + page + '» есть стрелка и цель прокрутки', await (async () => {
        const arrow = p.locator('.scroll-down');
        return await arrow.count() === 1
               && await arrow.getAttribute('href') === '#dalee'
               && await p.locator('#dalee').count() === 1; })());
    ok('на «' + page + '» стрелка лежит прямо в шапке страницы, а не в текстовом блоке',
       await p.locator('.scroll-down').evaluate(e =>
         e.parentElement.classList.contains('hero') || e.parentElement.classList.contains('phead')));
    ok('на «' + page + '» стрелка отцентрована по всей ширине шапки', await (async () => {
        const arrowBox = await p.locator('.scroll-down').boundingBox();
        const bannerBox = await p.locator('.hero, .phead').first().boundingBox();
        const arrowCenter = arrowBox.x + arrowBox.width / 2;
        const bannerCenter = bannerBox.x + bannerBox.width / 2;
        return Math.abs(arrowCenter - bannerCenter) < 2; })());
  }
  ok('стрелка и её иконка мягко покачиваются, привлекая внимание', await (async () => {
      await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
      const ys = [];
      for (let i = 0; i < 6; i++) {
        ys.push(await p.locator('.scroll-down').evaluate(e => e.getBoundingClientRect().top));
        await p.waitForTimeout(200);
      }
      return new Set(ys).size > 1; })());
  ok('клик по стрелке прокручивает к содержимому под липкой шапкой', await (async () => {
      await p.goto('file://' + B + 'oborudovanie.html', { waitUntil:'domcontentloaded' });
      await p.waitForTimeout(200);
      await p.locator('.scroll-down').click({ force: true });   // элемент постоянно покачивается
      await p.waitForTimeout(1200);
      const top = await p.locator('#dalee').evaluate(e => e.getBoundingClientRect().top);
      return await p.evaluate(() => window.scrollY) > 200 && top > 0 && top < 140; })());

  console.log('Подменю пунктов навигации:');
  await p.mouse.move(2, 2);
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  ok('у каждого пункта меню есть подменю с разделами страницы', await (async () => {
      const counts = await p.locator('.nav__item .nav__drop').evaluateAll(els => els.length);
      return counts === (await p.locator('.nav__item').count()); })());
  ok('подменю «Главной» перечисляет её разделы', await (async () => {
      // .innerText не читает скрытый (visibility:hidden) элемент — берём textContent
      const text = await p.locator('.nav__item').first().locator('.nav__drop').evaluate(e => e.textContent);
      return text.includes('Почему заказывают у нас') && text.includes('Продукция')
             && text.includes('Оборудование') && text.includes('От заявки до отгрузки'); })());
  ok('подменю скрыто, пока курсор не наведён', await (async () => {
      const drop = p.locator('.nav__item').first().locator('.nav__drop');
      return !(await drop.isVisible()); })());
  ok('наведение на пункт раскрывает его подменю', await (async () => {
      const item = p.locator('.nav__item').first();
      await item.hover();
      await p.waitForTimeout(250);
      return await item.locator('.nav__drop').isVisible(); })());
  ok('пункт подменю ведёт на якорь внутри той же страницы', await (async () => {
      const item = p.locator('.nav__item').first();
      await item.hover();
      await p.waitForTimeout(250);
      await item.locator('.nav__drop a', { hasText: 'Оборудование' }).click();
      await p.waitForLoadState('domcontentloaded');
      await p.waitForTimeout(1200);
      const okUrl = p.url().endsWith('index.html#oborudovanie-band');
      const top = await p.locator('#oborudovanie-band').evaluate(e => e.getBoundingClientRect().top);
      return okUrl && top > 0 && top < 140; })());
  ok('на мобильном подменю не показывается — навести некуда', await (async () => {
      await p.setViewportSize({ width: 390, height: 800 });
      await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
      await p.locator('.burger').click();
      await p.waitForTimeout(300);
      const visible = await p.locator('.nav__drop').first().isVisible();
      await p.setViewportSize({ width: 1440, height: 900 });
      return !visible; })());

  console.log('Таблица на «Оборудовании»:');
  await p.mouse.move(2, 2);
  await p.goto('file://' + B + 'oborudovanie.html', { waitUntil:'domcontentloaded' });
  ok('таблица переведена на тот же аккордеон-рамку, что и на «О компании»',
     await p.locator('.acc--frame').count() === 1);
  ok('плюсиков в таблице больше нет', await p.locator('.acc--frame .acc__ico').count() === 0);
  ok('фон таблицы — тот же приглушённый оранжевый (--soft), что на «О компании»',
     await p.locator('.acc--frame').evaluate(e => getComputedStyle(e).backgroundColor === 'rgb(236, 218, 202)'));
  ok('наведение на подраздел раскрывает его и сворачивает предыдущий', await (async () => {
      const items = p.locator('.acc--frame .acc__item');
      await items.nth(2).hover();
      await p.waitForTimeout(500);
      return await items.nth(2).evaluate(e => e.classList.contains('is-open'))
             && !(await items.first().evaluate(e => e.classList.contains('is-open'))); })());

  console.log('Крафт-панели на главной — цвет:');
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  ok('панели залиты непрозрачным приглушённым оранжевым (--soft/--soft-2), не крафтом и не полупрозрачным',
     await p.locator('.card--kraft').first().evaluate(e => {
       const bg = getComputedStyle(e).backgroundImage;
       return bg.includes('rgb(231, 202, 177)') && bg.includes('rgb(236, 218, 202)')
              && !bg.includes('rgb(217, 175, 137)') && !bg.includes('rgba(224, 123, 38');
     }));
  ok('оттенок панелей — та же тёплая гамма, что у «Плюс» в названии (не ушёл в красный)', await p.evaluate(() => {
      const hue = ([r, g, b]) => {
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (!d) return 0;
        let h;
        if (max === r) h = ((g - b) / d + 6) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return h * 60;
      };
      const probe = css => { const d = document.createElement('div'); d.style.color = css;
        document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
      const plusHue = hue(rgb(getComputedStyle(document.querySelector('.brand-plus')).color));
      const softHue = hue(rgb(probe('var(--soft-2)')));
      return Math.abs(plusHue - softHue) < 12; }));

  console.log('Карточки «На что мы отвечаем перед заказчиком»:');
  await p.goto('file://' + B + 'o-kompanii.html', { waitUntil:'domcontentloaded' });
  ok('карточек шесть, все тёмные (card--dark)', await p.locator('.card--dark').count() === 6);
  ok('заголовки карточек — фирменный оранжевый', await p.locator('.card--dark .card__t').first()
      .evaluate(e => getComputedStyle(e).color === 'rgb(244, 155, 63)'));
  ok('фон карточек — тёмный градиент, а не прежний белый', await p.locator('.card--dark').first()
      .evaluate(e => getComputedStyle(e).backgroundImage.includes('gradient')));

  console.log('Карточки услуг — тот же тёмный дизайн, что на «О компании»:');
  await p.goto('file://' + B + 'uslugi.html', { waitUntil:'domcontentloaded' });
  ok('карточек услуг шесть, все тёмные (card--dark)', await p.locator('.card--dark').count() === 6);
  ok('заголовки — тот же фирменный оранжевый', await p.locator('.card--dark .card__t').first()
      .evaluate(e => getComputedStyle(e).color === 'rgb(244, 155, 63)'));
  ok('иконок на карточках нет — заголовок первым', await p.locator('.card--dark .card__ico').count() === 0);
  ok('названия услуг сохранены', await (async () => {
      const t = await p.locator('#dalee').innerText();
      return t.includes('Флексографическая печать') && t.includes('Покраска продукции')
             && t.includes('Разработка конструкции') && t.includes('Высечка и рилёвка')
             && t.includes('Изготовление по размерам') && t.includes('Доставка'); })());

  console.log('Мобильное меню:');
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  ok('меню скрыто по умолчанию', !(await p.locator('.nav').evaluate(e => e.classList.contains('is-open'))));
  await p.click('.burger');
  await p.waitForTimeout(450);
  ok('бургер открывает меню', await p.locator('.nav').evaluate(e => e.classList.contains('is-open')));
  ok('пункты меню видимы', await p.locator('.nav__link').first().isVisible());
  await p.locator('.nav__link').first().click();
  ok('клик по пункту закрывает меню', !(await p.locator('.nav').evaluate(e => e.classList.contains('is-open'))));

  console.log('\nОшибок JS: ' + errs.length + (errs.length ? '\n' + errs.join('\n') : ''));
  console.log(`Итого: ${pass} пройдено, ${fail} провалено`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
