const { chromium } = require('playwright-core');
const path = require('path');
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
  ok('год выводится без разделителя разрядов',
     (await p.locator('[data-count="2016"]').textContent()).trim() === '2016');
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
        return { increment: getComputedStyle(e.parentElement).counterIncrement, content: c.content };
      }));
      const gridOk = grid.includes('artbox');
      const cardsOk = items.length === 4 && items.every(it =>
        it.increment.includes('artbox') && it.content.includes('counter(artbox'));
      return gridOk && cardsOk; })());
  ok('текст на бирке читаем (тёмный на светлом фоне)', await p.locator('.card__label').first()
      .evaluate(e => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)'));
  ok('при наведении короб приподнимается и лента съезжает', await (async () => {
      const card = p.locator('.card--kraft').first();
      const tape = p.locator('.card__tape').first();
      const before = await card.evaluate(e => getComputedStyle(e).transform);
      const tapeBefore = await tape.evaluate(e => getComputedStyle(e).transform);
      await card.hover();
      await p.waitForTimeout(500);
      const after = await card.evaluate(e => getComputedStyle(e).transform);
      const tapeAfter = await tape.evaluate(e => getComputedStyle(e).transform);
      await p.mouse.move(10, 10);
      return after !== before && tapeAfter !== tapeBefore; })());

  console.log('Плашка оборудования на главной:');
  ok('блок «Продажа нового и б/у оборудования» на месте',
     (await p.locator('.band__t').textContent()).includes('б/у оборудования'));
  ok('ведёт в раздел «Оборудование»',
     (await p.locator('.band a').getAttribute('href')) === 'oborudovanie.html');

  console.log('Фильтр каталога:');
  await p.goto('file://' + B + 'produkciya.html', { waitUntil:'domcontentloaded' });
  ok('видны все 9 позиций', await p.locator('.prod:visible').count() === 9);
  await p.click('[data-filter="market"]');
  ok('фильтр «для маркетплейсов» оставляет 1', await p.locator('.prod:visible').count() === 1);
  await p.click('[data-filter="korob"]');
  ok('фильтр «короба и ящики» оставляет 3', await p.locator('.prod:visible').count() === 3);
  await p.click('[data-filter="all"]');
  ok('«Всё» возвращает 9', await p.locator('.prod:visible').count() === 9);

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

  console.log('Форма заявки:');
  await p.goto('file://' + B + 'kontakty.html', { waitUntil:'domcontentloaded' });
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
