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

  console.log('Слайдер:');
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  ok('стартует с первого слайда', await p.locator('.slide').first().evaluate(e => e.classList.contains('is-active')));
  await p.click('.hero__arrow--next');
  ok('стрелка «вперёд» переключает на 2-й', await p.locator('.slide').nth(1).evaluate(e => e.classList.contains('is-active')));
  ok('счётчик показывает 02', (await p.locator('.hero__count b').textContent()) === '02');
  await p.click('.hero__arrow--prev');
  await p.click('.hero__arrow--prev');
  ok('перелистывание по кругу назад → 3-й слайд', await p.locator('.slide').nth(2).evaluate(e => e.classList.contains('is-active')));
  await p.locator('.hero__dot').nth(0).click();
  ok('точка возвращает на 1-й', await p.locator('.slide').nth(0).evaluate(e => e.classList.contains('is-active')));
  ok('автопрокрутка идёт', await (async () => { await p.waitForTimeout(7600);
      return await p.locator('.slide').nth(1).evaluate(e => e.classList.contains('is-active')); })());

  console.log('Счётчики и анимации:');
  ok('год выводится без разделителя разрядов',
     (await p.locator('[data-count="2016"]').textContent()).trim() === '2016');
  ok('блоки проявляются при прокрутке', await (async () => {
      await p.evaluate(() => { document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0, 1200); });
      await p.waitForTimeout(700);
      return await p.locator('.card').first().evaluate(e => e.classList.contains('is-in')); })());

  console.log('Фильтр каталога:');
  await p.goto('file://' + B + 'produkciya.html', { waitUntil:'domcontentloaded' });
  ok('видны все 9 позиций', await p.locator('.prod:visible').count() === 9);
  await p.click('[data-filter="market"]');
  ok('фильтр «для маркетплейсов» оставляет 1', await p.locator('.prod:visible').count() === 1);
  await p.click('[data-filter="korob"]');
  ok('фильтр «короба и ящики» оставляет 3', await p.locator('.prod:visible').count() === 3);
  await p.click('[data-filter="all"]');
  ok('«Всё» возвращает 9', await p.locator('.prod:visible').count() === 9);

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
