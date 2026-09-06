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

  console.log('Широкий десктоп: контейнер, первый экран, сетки, типографика:');
  // Общий контейнер (--wrap) и первый экран должны стоять на одной
  // вертикальной направляющей: 1280px до 1440px, затем 1560px и 1760px.
  const wrapAt = async (w, page) => {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto('file://' + B + page, { waitUntil:'domcontentloaded' });
    return p.evaluate(() => {
      const el = document.querySelector('.section .wrap') || document.querySelector('.wrap');
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), left: Math.round(r.left) };
    });
  };
  const heroAt = async (w) => {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
    return p.evaluate(() => {
      const inn = document.querySelector('.hero__in');
      const copy = document.querySelector('.hero__copy');
      const title = document.querySelector('.hero__title');
      const text = document.querySelector('.hero__text');
      const btn = document.querySelector('.hero__acts .btn--primary');
      const innW = inn.getBoundingClientRect().width;
      return {
        innW,
        copyShare: copy.getBoundingClientRect().width / (innW - 80),
        titleFS: parseFloat(getComputedStyle(title).fontSize),
        textFS: parseFloat(getComputedStyle(text).fontSize),
        btnFS: parseFloat(getComputedStyle(btn).fontSize),
        btnPadY: parseFloat(getComputedStyle(btn).paddingTop),
      };
    });
  };
  const hero1280 = await heroAt(1280);
  const hero1440 = await heroAt(1440);
  const hero1920 = await heroAt(1920);
  ok('контейнер разделов раскрывается ступенями: 1280px → 1560px → 1760px',
     await (async () => {
       const a = await wrapAt(1366, 'index.html');
       const b1 = await wrapAt(1600, 'index.html');
       const c = await wrapAt(1920, 'index.html');
       const d = await wrapAt(2560, 'index.html');
       return a.w === 1280 && b1.w === 1560 && c.w === 1760 && d.w === 1760; })());
  ok('на 1920px по бокам остаётся ровное поле, а не по 300px пустоты',
     await (async () => {
       const c = await wrapAt(1920, 'index.html');
       return c.left === 80 && c.left * 2 + c.w === 1920; })());
  ok('внутренние страницы используют тот же раскрытый контейнер',
     await (async () => {
       for (const page of ['o-kompanii.html','produkciya.html','uslugi.html',
                           'oborudovanie.html','korzina.html','produkciya-gofrolotki.html']) {
         const r = await wrapAt(1920, page);
         if (r.w !== 1760 || r.left !== 80) return false;
       }
       return true; })());
  ok('логотип в шапке стоит на той же направляющей, что текст под ним',
     await (async () => {
       for (const w of [1280, 1440, 1600, 1920, 2560]) {
         await p.setViewportSize({ width: w, height: 1000 });
         await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
         const m = await p.evaluate(() => {
           const L = s => document.querySelector(s).getBoundingClientRect().left;
           return { logo: L('.logo'), hero: L('.hero__title'), foot: L('.footer .wrap') };
         });
         // Логотип лежит внутри .wrap шапки, поэтому сравниваем его с текстом
         // героя (тоже внутри .wrap) — оба должны начинаться в одной точке.
         if (Math.abs(m.logo - m.hero) >= 1) return false;
         if (Math.abs(m.foot + 40 - m.hero) >= 1) return false;
       }
       await p.setViewportSize({ width: 1440, height: 900 });
       return true; })());
  ok('первый экран стоит на той же направляющей, что и остальные секции',
     hero1440.innW === 1440 && hero1920.innW === 1760 && hero1280.innW === 1280);
  ok('заголовок героя на 1440px — 62–72px, на 1920px — 72–80px',
     hero1440.titleFS >= 62 && hero1440.titleFS <= 72
     && hero1920.titleFS >= 72 && hero1920.titleFS <= 80
     && hero1920.titleFS > hero1440.titleFS);
  ok('подзаголовок героя на 1440px и 1920px — 20–21px',
     hero1440.textFS === 20 && hero1920.textFS === 21);
  ok('на экранах уже 1440px заголовок героя остаётся мельче потолка (нет надбавки)',
     hero1280.titleFS < 60);
  ok('левая колонка героя занимает 50–55% контейнера на 1440px и 1920px',
     hero1440.copyShare >= 0.5 && hero1440.copyShare <= 0.55
     && hero1920.copyShare >= 0.5 && hero1920.copyShare <= 0.55);
  ok('кнопки героя крупнее на 1440px и ещё крупнее на 1920px',
     hero1440.btnFS >= 17 && hero1440.btnFS <= 18 && hero1440.btnPadY >= 18
     && hero1920.btnFS === 18 && hero1920.btnPadY > hero1440.btnPadY);

  // Каталог: колонку добавляет auto-fit, как только в ряд помещается ещё одна
  // карточка не у́же 380px. Отсюда три широкие колонки на 1440–1900px и
  // четыре — на Full HD, но ни на одной ширине карточка не мельче, чем на 1280px.
  const catAt = async (w) => {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto('file://' + B + 'produkciya.html', { waitUntil:'domcontentloaded' });
    return p.evaluate(() => {
      const g = document.querySelector('.grid--cat');
      const pic = document.querySelector('.grid--cat .prod__pic').getBoundingClientRect();
      return {
        cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
        picW: Math.round(pic.width), picH: Math.round(pic.height),
      };
    });
  };
  const cat1280 = await catAt(1280);
  const cat1440 = await catAt(1440);
  const cat1920 = await catAt(1920);
  ok('каталог: 3 колонки на 1280px и 1440px, 4 полноценные — на Full HD',
     cat1280.cols === 3 && cat1440.cols === 3 && cat1920.cols === 4);
  ok('превью в карточках каталога на широком экране крупнее, а не мельче, чем на 1280px',
     cat1440.picW > cat1280.picW && cat1440.picH > cat1280.picH
     && cat1920.picW > cat1280.picW && cat1920.picH > cat1280.picH);
  ok('сетки на 3 и 6 карточек лишнюю колонку не получают — дыр в ряду нет',
     await (async () => {
       await p.setViewportSize({ width: 1920, height: 1000 });
       const n = async (page, sel) => {
         await p.goto('file://' + B + page, { waitUntil:'domcontentloaded' });
         return p.locator(sel).first()
           .evaluate(e => [getComputedStyle(e).gridTemplateColumns.split(' ').length, e.children.length]);
       };
       const idx = await n('index.html', '.grid--3');        // 3 карточки продукции
       const usl = await n('uslugi.html', '.grid--3');       // 6 карточек услуг
       const kom = await n('o-kompanii.html', '.grid--3');   // 6 тёмных карточек
       const kraft = await n('index.html', '.grid--4');      // 4 крафт-панели
       return idx[0] === 3 && idx[1] === 3 && usl[0] === 3 && usl[1] === 6
              && kom[0] === 3 && kom[1] === 6 && kraft[0] === 4 && kraft[1] === 4; })());

  // Типографика внутренних страниц: на широком экране текст не должен
  // мельчать вместе с ростом свободного места.
  // Абзацы и описания — всё, что на странице читают строкой, а не таблицей.
  // Возвращаем размер и межстрочный по каждому виду текста, который на
  // странице реально есть: на «Корзине» нет карточек, на «Продукции» —
  // аккордеонов, поэтому один общий селектор тут не годится.
  const BODY_SEL = ['.card__d', '.acc__panel p', '.step__d', '.prod__d',
                    '.cart__empty-d', '.ptable__empty-d', '.band__d', '.ptext__list li'];
  const typoAt = async (w, page) => {
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto('file://' + B + page, { waitUntil:'domcontentloaded' });
    return p.evaluate((sels) => {
      const box = s => { const e = document.querySelector(s); if (!e) return null;
        const c = getComputedStyle(e);
        return { fs: parseFloat(c.fontSize), lh: parseFloat(c.lineHeight) / parseFloat(c.fontSize) }; };
      const body = {};
      for (const s of sels) { const b = box(s); if (b) body[s] = b; }
      return { h2: box('.h2'), lead: box('.lead'), body };
    }, BODY_SEL);
  };
  ok('заголовки h2 на внутренних страницах — 38–46px на 1440px и на 1920px',
     await (async () => {
       for (const w of [1440, 1920])
         for (const page of ['o-kompanii.html','uslugi.html','korzina.html','produkciya.html']) {
           const t = await typoAt(w, page);
           if (!(t.h2.fs >= 38 && t.h2.fs <= 46)) return false;
         }
       return true; })());
  ok('основной текст на внутренних страницах — 17–18px с межстрочным 1.6–1.7',
     await (async () => {
       for (const w of [1440, 1920])
         for (const page of ['o-kompanii.html','uslugi.html','korzina.html','oborudovanie.html']) {
           const t = await typoAt(w, page);
           const kinds = Object.values(t.body);
           if (kinds.length === 0) return false;
           for (const k of kinds)
             if (!(k.fs >= 17 && k.fs <= 18 && k.lh >= 1.6 && k.lh <= 1.7)) return false;
           if (!(t.lead.fs >= 19 && t.lead.lh >= 1.6 && t.lead.lh <= 1.7)) return false;
         }
       return true; })());
  ok('на 1920px текст крупнее, чем на 1440px, а не одного размера',
     await (async () => {
       const a = await typoAt(1440, 'o-kompanii.html');
       const b1 = await typoAt(1920, 'o-kompanii.html');
       return b1.h2.fs > a.h2.fs && b1.lead.fs > a.lead.fs
              && b1.body['.card__d'].fs > a.body['.card__d'].fs; })());

  // Ноутбуки, планшеты и телефоны раскрытие не задевает: до 1440px всё
  // должно остаться ровно таким, каким было.
  ok('до 1440px вёрстка не изменилась: контейнер 1280px и прежние размеры текста',
     await (async () => {
       const r = await wrapAt(1280, 'o-kompanii.html');
       for (const [w, page] of [[1280,'o-kompanii.html'], [1024,'uslugi.html'], [768,'uslugi.html']]) {
         const t = await typoAt(w, page);
         for (const k of Object.values(t.body)) if (k.fs >= 16) return false;
         if (t.lead.fs > 19) return false;
       }
       return r.w === 1280; })());
  await p.setViewportSize({ width: 1440, height: 900 });

  console.log('Выпадающее меню в шапке:');
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.mouse.move(2, 2);
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  ok('подменю — семантический список: ul > li > a, без «ссылок» на div-ах',
     await p.evaluate(() => [...document.querySelectorAll('.nav__drop')].every(d => {
       const list = d.firstElementChild;
       if (!list || list.tagName !== 'UL') return false;
       return [...list.children].every(li => li.tagName === 'LI'
              && li.children.length === 1 && li.firstElementChild.tagName === 'A'
              && li.firstElementChild.getAttribute('href'));
     })));
  ok('пункт с подменю помечен aria-haspopup, у кнопки раскрытия есть подпись',
     await p.evaluate(() => [...document.querySelectorAll('.nav__item')].every(it =>
       it.querySelector('.nav__link').getAttribute('aria-haspopup') === 'true'
       && it.querySelector('.nav__toggle').getAttribute('aria-label')
       && it.querySelector('.nav__toggle').getAttribute('aria-expanded') === 'false')));
  ok('подменю «Продукция» ведёт на страницы конкретных подгрупп гофротары',
     await (async () => {
       const hrefs = await p.evaluate(() => [...document.querySelectorAll('.nav__item')]
         .filter(it => it.querySelector('.nav__link').getAttribute('href') === 'produkciya.html')
         .flatMap(it => [...it.querySelectorAll('.nav__drop a')].map(a => a.getAttribute('href'))));
       const detail = fs.readdirSync(path.resolve(__dirname, '../..'))
         .filter(f => /^produkciya-.+\.html$/.test(f));
       // все страницы подгрупп представлены, и каждая ссылка существует
       return detail.every(f => hrefs.includes(f))
              && hrefs.every(h => fs.existsSync(path.resolve(__dirname, '../..', h.split('#')[0]))); })());
  ok('подменю «Услуги» ведёт на конкретные услуги, и каждый якорь есть на странице',
     await (async () => {
       const hrefs = await p.evaluate(() => [...document.querySelectorAll('.nav__item')]
         .filter(it => it.querySelector('.nav__link').getAttribute('href') === 'uslugi.html')
         .flatMap(it => [...it.querySelectorAll('.nav__drop a')].map(a => a.getAttribute('href'))));
       if (!hrefs.some(h => h.includes('usluga-flexopechat'))) return false;
       await p.goto('file://' + B + 'uslugi.html', { waitUntil:'domcontentloaded' });
       const missing = await p.evaluate(hh => hh
         .map(h => h.split('#')[1]).filter(Boolean)
         .filter(id => !document.getElementById(id)), hrefs);
       await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
       return missing.length === 0; })());
  ok('во всех шапках сайта ни одна ссылка подменю не ведёт в никуда',
     await (async () => {
       for (const page of ['index.html','o-kompanii.html','produkciya.html','uslugi.html',
                           'oborudovanie.html','korzina.html','produkciya-gofrolotki.html']) {
         await p.goto('file://' + B + page, { waitUntil:'domcontentloaded' });
         const hrefs = await p.evaluate(() =>
           [...document.querySelectorAll('.nav__drop a')].map(a => a.getAttribute('href')));
         if (!hrefs.length) return false;
         for (const h of hrefs)
           if (!fs.existsSync(path.resolve(__dirname, '../..', h.split('#')[0]))) return false;
       }
       await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
       return true; })());

  const dropAt = n => p.locator('.nav__item').nth(n).locator('.nav__drop');
  ok('по умолчанию подменю скрыто, наведение его раскрывает', await (async () => {
      const hidden = await dropAt(2).evaluate(e => getComputedStyle(e).visibility === 'hidden');
      await p.locator('.nav__item').nth(2).locator('.nav__link').hover();
      await p.waitForTimeout(400);
      const shown = await dropAt(2).evaluate(e => getComputedStyle(e).visibility === 'visible'
                                                 && getComputedStyle(e).opacity === '1');
      return hidden && shown; })());
  ok('меню ложится поверх первого экрана: высокий z-index, тень и скругление',
     await dropAt(2).evaluate(e => {
       const cs = getComputedStyle(e);
       const header = parseFloat(getComputedStyle(document.querySelector('.header')).zIndex);
       return parseFloat(cs.zIndex) >= 950 && header >= 800
              && cs.boxShadow !== 'none' && parseFloat(cs.borderRadius) > 0; }));
  ok('безопасная зона: курсор в зазоре между пунктом и меню его не закрывает',
     await (async () => {
       const it = p.locator('.nav__item').nth(2);
       await it.locator('.nav__link').hover();
       await p.waitForTimeout(350);
       const link = await it.locator('.nav__link').boundingBox();
       const drop = await dropAt(2).boundingBox();
       // Середина зазора: тут нет ни пункта, ни самого меню — только мостик.
       const gapY = (link.y + link.height + drop.y) / 2;
       if (gapY <= link.y + link.height || gapY >= drop.y) return false;
       await p.mouse.move(link.x + link.width / 2, gapY);
       await p.waitForTimeout(400);
       return dropAt(2).evaluate(e => getComputedStyle(e).visibility === 'visible'); })());
  ok('уход курсора с пункта закрывает меню — но с задержкой, а не мгновенно',
     await (async () => {
       // Задержку читаем в покое: под курсором она намеренно обнулена —
       // меню появляется сразу, а закрывается с паузой. Предыдущая проверка
       // оставила курсор на меню, поэтому сначала уводим его в сторону.
       await p.mouse.move(700, 600);
       await p.waitForTimeout(500);
       const delay = await dropAt(2).evaluate(e => getComputedStyle(e).transitionDelay);
       await p.locator('.nav__item').nth(2).locator('.nav__link').hover();
       await p.waitForTimeout(350);
       const openDelay = await dropAt(2).evaluate(e => getComputedStyle(e).transitionDelay);
       await p.mouse.move(700, 600);
       await p.waitForTimeout(600);
       const closed = await dropAt(2).evaluate(e => getComputedStyle(e).visibility === 'hidden');
       return closed && /^0\.1\d*s/.test(delay) && openDelay === '0s'; })());
  ok('подпункт отзывается на наведение: подложка, цвет текста и стрелка',
     await (async () => {
       await p.locator('.nav__item').nth(2).locator('.nav__link').hover();
       await p.waitForTimeout(350);
       const a = dropAt(2).locator('a').nth(1);
       const rest = await a.evaluate(e => ({
         bg: getComputedStyle(e).backgroundColor, fg: getComputedStyle(e).color,
         mark: getComputedStyle(e, '::after').opacity,
         tr: getComputedStyle(e).transitionDuration, cur: getComputedStyle(e).cursor }));
       await a.hover();
       await p.waitForTimeout(350);
       const on = await a.evaluate(e => ({
         bg: getComputedStyle(e).backgroundColor, fg: getComputedStyle(e).color,
         mark: getComputedStyle(e, '::after').opacity }));
       return rest.bg !== on.bg && rest.fg !== on.fg
              && on.bg === 'rgb(246, 234, 220)' && on.fg === 'rgb(140, 74, 14)'
              && parseFloat(rest.mark) === 0 && parseFloat(on.mark) === 1
              && rest.tr.startsWith('0.2s') && rest.cur === 'pointer'; })());
  ok('кликается вся строка подпункта, а не только буквы', await (async () => {
      await p.locator('.nav__item').nth(2).locator('.nav__link').hover();
      await p.waitForTimeout(350);
      const a = dropAt(2).locator('a').first();
      const box = await a.boundingBox();
      // Пустое место справа от текста, у самого края строки
      await Promise.all([
        p.waitForURL('**/produkciya-gofroyashchiki.html', { timeout: 5000 }).catch(() => {}),
        p.mouse.click(box.x + box.width - 8, box.y + box.height / 2),
      ]);
      const url = p.url();
      await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
      return url.endsWith('produkciya-gofroyashchiki.html'); })());

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
  // На этой странице две таблицы: прайс по тиражу и список типоразмеров,
  // поэтому обращаемся именно к прайсовой — по её секции.
  ok('у пиццы свои тиражи — от 3000 / 5000 / 10 000 шт.',
     (await p.locator('#price .ptable thead').innerText()).includes('10 000'));

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
  ok('при загрузке всё свёрнуто — ни один пункт не открыт сам',
     await p.locator('.acc__item.is-open').count() === 0);
  await p.locator('.acc__btn').nth(2).click();
  ok('клик открывает третий', await p.locator('.acc__item').nth(2).evaluate(e => e.classList.contains('is-open')));
  await p.locator('.acc__btn').first().click();
  ok('клик по другому пункту закрывает предыдущий', await (async () => {
      const third = await p.locator('.acc__item').nth(2).evaluate(e => e.classList.contains('is-open'));
      const first = await p.locator('.acc__item').first().evaluate(e => e.classList.contains('is-open'));
      return first && !third; })());
  ok('повторный клик по открытому пункту сворачивает его обратно', await (async () => {
      await p.locator('.acc__btn').first().click();
      await p.waitForTimeout(200);
      return await p.locator('.acc__item.is-open').count() === 0; })());
  ok('aria-expanded ходит вместе с состоянием пункта', await (async () => {
      const btn = p.locator('.acc__btn').nth(1);
      const shut = await btn.getAttribute('aria-expanded');
      await btn.click(); await p.waitForTimeout(150);
      const open = await btn.getAttribute('aria-expanded');
      await btn.click(); await p.waitForTimeout(150);
      return shut === 'false' && open === 'true'
             && await btn.getAttribute('aria-expanded') === 'false'; })());

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
      // Первый экран больше не живёт по своей ширине: .hero__in берёт тот же
      // --wrap, что и все секции (см. «19b»), поэтому левый край заголовка
      // совпадает на любой ширине — и до 1440px, и на Full HD.
      for (const w of [1280, 1440, 1920]) {
        await p.setViewportSize({ width: w, height: 1100 });
        await p.goto('file://' + B + 'o-kompanii.html', { waitUntil:'domcontentloaded' });
        const pheadX = await p.locator('.phead h1').evaluate(e => e.getBoundingClientRect().left);
        await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
        const heroX = await p.locator('.hero__title').evaluate(e => e.getBoundingClientRect().left);
        if (Math.abs(pheadX - heroX) >= 1) return false;
      }
      await p.setViewportSize({ width: 1440, height: 1100 });
      await p.goto('file://' + B + 'o-kompanii.html', { waitUntil:'domcontentloaded' });
      return true; })());
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
  ok('у каждой вкладки есть шеврон-индикатор', await (async () => {
      const items = await p.locator('.acc--frame .acc__item').count();
      return items > 0 && await p.locator('.acc--frame .acc__ico').count() === items
             && await p.locator('.acc--frame .acc__ico svg').count() === items; })());
  ok('плашка вкладки белая, с тёплой окантовкой и мягкой тенью',
     await p.locator('.acc--frame .acc__item').first().evaluate(e => {
       const cs = getComputedStyle(e);
       return cs.backgroundColor === 'rgb(255, 255, 255)'
              && parseFloat(cs.borderTopWidth) === 1
              && cs.borderTopColor === 'rgba(235, 120, 35, 0.25)'
              && cs.boxShadow !== 'none' && parseFloat(cs.borderRadius) > 0;
     }));
  ok('наведение усиливает окантовку плашки', await (async () => {
      const item = p.locator('.acc--frame .acc__item').first();
      const rest = await item.evaluate(e => getComputedStyle(e).borderTopColor);
      await item.hover();
      await p.waitForTimeout(350);
      const hov = await item.evaluate(e => getComputedStyle(e).borderTopColor);
      await p.mouse.move(2, 2);
      await p.waitForTimeout(300);
      return rest === 'rgba(235, 120, 35, 0.25)' && hov === 'rgba(235, 120, 35, 0.5)'; })());
  // Раскрытие теперь только по клику: наводить на сенсорном экране нечем,
  // а открытая по умолчанию вкладка сбивала с толку.
  await p.mouse.move(2, 2);
  await p.reload({ waitUntil:'domcontentloaded' });
  ok('по умолчанию свёрнуты все вкладки',
     await p.locator('.acc--frame .acc__item.is-open').count() === 0);
  ok('наведение само по себе ничего не раскрывает', await (async () => {
      await p.locator('.acc--frame .acc__item').nth(2).hover();
      await p.waitForTimeout(450);
      const n = await p.locator('.acc--frame .acc__item.is-open').count();
      await p.mouse.move(2, 2);
      return n === 0; })());
  ok('клик открывает третью вкладку, шеврон разворачивается вверх', await (async () => {
      await p.locator('.acc--frame .acc__btn').nth(2).click();
      await p.waitForTimeout(500);
      const item = p.locator('.acc--frame .acc__item').nth(2);
      const open = await item.evaluate(e => e.classList.contains('is-open'));
      const ico = await item.locator('.acc__ico').evaluate(e => {
        const cs = getComputedStyle(e);
        // rotate(180deg) в матрице — matrix(-1, 0, 0, -1, 0, 0)
        return cs.transform.replace(/\s/g, '').startsWith('matrix(-1,0,0,-1')
               && cs.backgroundColor === 'rgb(224, 123, 38)';
      });
      return open && ico; })());
  ok('раскрытая вкладка выделена оранжевой рамкой',
     await p.locator('.acc--frame .acc__item').nth(2)
       .evaluate(e => getComputedStyle(e).borderTopColor === 'rgb(224, 123, 38)'));
  ok('клик по другой вкладке закрывает предыдущую', await (async () => {
      await p.locator('.acc--frame .acc__btn').first().click();
      await p.waitForTimeout(500);
      return await p.locator('.acc--frame .acc__item').first().evaluate(e => e.classList.contains('is-open'))
             && !(await p.locator('.acc--frame .acc__item').nth(2).evaluate(e => e.classList.contains('is-open'))); })());
  ok('панель раскрывается поворотом, а не просто списком (эффект «листа»)',
     await p.locator('.acc--frame .acc__panel > div').nth(2)
       .evaluate(e => getComputedStyle(e).transform !== 'none'));
  ok('повторный клик по открытой вкладке сворачивает её', await (async () => {
      await p.locator('.acc--frame .acc__btn').first().click();
      await p.waitForTimeout(500);
      return await p.locator('.acc--frame .acc__item.is-open').count() === 0; })());

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
  ok('на мобильном подменю раскрывается тапом, а не наведением', await (async () => {
      await p.setViewportSize({ width: 390, height: 800 });
      await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
      await p.locator('.burger').click();
      await p.waitForTimeout(300);
      const item = p.locator('.nav__item').nth(2);
      // Список сворачивается высотой контейнера (grid-template-rows), поэтому
      // меряем именно её: сама ссылка внутри свой бокс сохраняет, и
      // isVisible() про обрезку предком ничего не знает.
      const subH = () => item.locator('.nav__drop').evaluate(e => e.getBoundingClientRect().height);
      const shut = await subH();
      // Наведение на сенсорном экране ничего не открывает — только кнопка.
      await item.locator('.nav__link').hover();
      await p.waitForTimeout(300);
      const afterHover = await subH();
      await item.locator('.nav__toggle').click();
      await p.waitForTimeout(450);
      const afterTap = await subH();
      const aria = await item.locator('.nav__toggle').getAttribute('aria-expanded');
      await p.setViewportSize({ width: 1440, height: 900 });
      return shut === 0 && afterHover === 0 && afterTap > 200 && aria === 'true'; })());
  ok('на мобильном открыт один раздел: тап по другому сворачивает предыдущий', await (async () => {
      await p.setViewportSize({ width: 390, height: 800 });
      await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
      await p.locator('.burger').click();
      await p.waitForTimeout(300);
      await p.locator('.nav__item').nth(2).locator('.nav__toggle').click();
      await p.waitForTimeout(400);
      await p.locator('.nav__item').nth(3).locator('.nav__toggle').click();
      await p.waitForTimeout(400);
      const first = await p.locator('.nav__item').nth(2).evaluate(e => e.classList.contains('is-open'));
      const second = await p.locator('.nav__item').nth(3).evaluate(e => e.classList.contains('is-open'));
      await p.setViewportSize({ width: 1440, height: 900 });
      return !first && second; })());
  ok('тап по подпункту уводит на страницу и закрывает бургер', await (async () => {
      await p.setViewportSize({ width: 390, height: 800 });
      await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
      await p.locator('.burger').click();
      await p.waitForTimeout(300);
      await p.locator('.nav__item').nth(2).locator('.nav__toggle').click();
      await p.waitForTimeout(450);
      await p.locator('.nav__item').nth(2).locator('.nav__drop a').first().click();
      await p.waitForLoadState('domcontentloaded');
      const url = p.url();
      const menuShut = !(await p.locator('.nav').evaluate(e => e.classList.contains('is-open')));
      await p.setViewportSize({ width: 1440, height: 900 });
      return url.endsWith('produkciya-gofroyashchiki.html') && menuShut; })());

  console.log('Таблица на «Оборудовании»:');
  await p.mouse.move(2, 2);
  await p.goto('file://' + B + 'oborudovanie.html', { waitUntil:'domcontentloaded' });
  ok('таблица переведена на тот же аккордеон-рамку, что и на «О компании»',
     await p.locator('.acc--frame').count() === 1);
  ok('плашки вкладок выглядят так же, как на «О компании»',
     await p.locator('.acc--frame .acc__item').first().evaluate(e => {
       const cs = getComputedStyle(e);
       return cs.backgroundColor === 'rgb(255, 255, 255)'
              && cs.borderTopColor === 'rgba(235, 120, 35, 0.25)'
              && cs.boxShadow !== 'none';
     }));
  ok('у каждой вкладки шеврон, при загрузке все свёрнуты', await (async () => {
      const items = await p.locator('.acc--frame .acc__item').count();
      return items > 0 && await p.locator('.acc--frame .acc__ico').count() === items
             && await p.locator('.acc--frame .acc__item.is-open').count() === 0; })());
  ok('клик раскрывает подраздел и сворачивает предыдущий', await (async () => {
      // Раскрытие по клику, а не наведением: раньше первое же наведение
      // двигало раскладку под курсором и проверка была неустойчивой.
      const items = p.locator('.acc--frame .acc__item');
      await p.locator('.acc--frame .acc__btn').first().click();
      await p.waitForTimeout(450);
      await p.locator('.acc--frame .acc__btn').nth(2).click();
      await p.waitForTimeout(450);
      return await items.nth(2).evaluate(e => e.classList.contains('is-open'))
             && !(await items.first().evaluate(e => e.classList.contains('is-open'))); })());

  console.log('Единая тёплая палитра карточек, плашек и аккордеонов:');
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  // Контраст по WCAG: считаем прямо на странице по фактически применённым
  // цветам, а не по токенам — так проверка ловит и случайную прозрачность.
  const CONTRAST = `(fg, bg) => {
    const lum = c => {
      const [r, g, b] = c.match(/[\\d.]+/g).slice(0, 3).map(Number).map(v => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const a = lum(fg), b2 = lum(bg);
    return (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);
  }`;
  ok('крафт-панели залиты чистым тёплым оттенком, без песочной «грязи»',
     await p.locator('.card--kraft').first().evaluate(e => {
       const cs = getComputedStyle(e);
       const bg = cs.backgroundImage;
       return bg.includes('rgb(246, 234, 220)') && bg.includes('rgb(251, 246, 240)')
              && !bg.includes('rgb(231, 202, 177)') && !bg.includes('rgb(236, 218, 202)')
              && cs.borderTopColor === 'rgba(235, 120, 35, 0.2)';
     }));
  ok('иконка и номер «Art. №» внизу панели — тёплый фирменный оранжевый',
     await p.locator('.card--kraft').first().evaluate(e => {
       const ico = getComputedStyle(e.querySelector('.card__ico')).color;
       const num = getComputedStyle(e.querySelector('.card__num')).color;
       const op  = getComputedStyle(e.querySelector('.card__num')).opacity;
       return ico === 'rgb(224, 123, 38)' && num === 'rgb(154, 85, 20)' && op === '1';
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
      const warmHue = hue(rgb(probe('var(--warm-2)')));
      return Math.abs(plusHue - warmHue) < 12; }));

  // Одна палитра на все четыре вида блоков: панели на главной, плашки
  // преимуществ на «Оборудовании», аккордеон-рамка и FAQ. Смотрим фактическую
  // заливку и рамку — расхождение здесь и есть «разнобой», от которого уходили.
  ok('все информационные блоки сайта держат одну заливку и одну рамку',
     await (async () => {
       const probe = async (page, sel) => {
         await p.goto('file://' + B + page, { waitUntil:'domcontentloaded' });
         return p.locator(sel).first().evaluate(e => {
           const cs = getComputedStyle(e);
           return { bg: cs.backgroundColor, border: cs.borderTopColor };
         });
       };
       // Карточки и плашки — тёплая заливка; аккордеоны намеренно белые
       // с той же тёплой окантовкой: пункт должен читаться как кнопка
       // поверх молочного фона, а не сливаться с ним.
       const cards = [await probe('oborudovanie.html', '.card:not(.card--dark):not(.card--kraft)'),
                      await probe('uslugi.html',       '.svc')];
       const accs  = [await probe('oborudovanie.html', '.acc--frame .acc__item'),
                      await probe('o-kompanii.html',   '.acc--frame .acc__item'),
                      await probe('uslugi.html',       '.acc .acc__item')];
       return cards.every(x => x.bg === 'rgb(251, 246, 240)'
                              && x.border === 'rgba(235, 120, 35, 0.2)')
              && accs.every(x => x.bg === 'rgb(255, 255, 255)'
                                && x.border === 'rgba(235, 120, 35, 0.25)');
     })());
  ok('чёрный текст заголовков и описаний на тёплой заливке читается (AA и выше)',
     await (async () => {
       const contrast = new Function('return ' + CONTRAST)();
       const cases = [['index.html', '.card--kraft', '.card__t', 4.5],
                      ['index.html', '.card--kraft', '.card__d', 4.5],
                      ['oborudovanie.html', '.card:not(.card--dark)', '.card__t', 4.5],
                      ['oborudovanie.html', '.card:not(.card--dark)', '.card__d', 4.5],
                      ['uslugi.html', '.acc .acc__item', '.acc__btn', 4.5],
                      ['o-kompanii.html', '.acc--frame .acc__item', '.acc__btn', 4.5]];
       for (const [page, block, sel, min] of cases) {
         await p.goto('file://' + B + page, { waitUntil:'domcontentloaded' });
         const c = await p.locator(block).first().evaluate((e, s2) => {
           const t = e.querySelector(s2) || e;
           // Заливка блока: у панели она градиентная, поэтому берём самый
           // светлый край — худший случай для тёмного текста здесь не он,
           // но именно он лежит под большей частью строки.
           const cs = getComputedStyle(e);
           const grad = cs.backgroundImage.match(/rgb\([^)]+\)/g);
           return { fg: getComputedStyle(t).color,
                    bg: grad ? grad[grad.length - 1] : cs.backgroundColor };
         }, sel);
         if (contrast(c.fg, c.bg) < min) return false;
       }
       return true; })());
  ok('наведение на карточку насыщает рамку тёплым оранжевым', await (async () => {
      await p.goto('file://' + B + 'oborudovanie.html', { waitUntil:'domcontentloaded' });
      const card = p.locator('.card:not(.card--dark)').first();
      const before = await card.evaluate(e => getComputedStyle(e).borderTopColor);
      await card.hover();
      await p.waitForTimeout(450);
      const after = await card.evaluate(e => getComputedStyle(e).borderTopColor);
      await p.mouse.move(2, 2);
      return before === 'rgba(235, 120, 35, 0.2)' && after === 'rgba(235, 120, 35, 0.4)'; })());
  ok('раскрытый вопрос FAQ и его шеврон — в фирменном оранжевом', await (async () => {
      await p.goto('file://' + B + 'uslugi.html', { waitUntil:'domcontentloaded' });
      // Открытых пунктов при загрузке нет — открываем первый сами.
      await p.locator('.acc__btn').first().click();
      await p.waitForTimeout(450);
      const openBtn = p.locator('.acc__item.is-open .acc__btn').first();
      const openIco = p.locator('.acc__item.is-open .acc__ico').first();
      const shutIco = p.locator('.acc__item:not(.is-open) .acc__ico').first();
      return await openBtn.evaluate(e => getComputedStyle(e).color === 'rgb(140, 74, 14)'
                                        && getComputedStyle(e).backgroundColor === 'rgb(251, 246, 240)')
             && await openIco.evaluate(e => getComputedStyle(e).backgroundColor === 'rgb(224, 123, 38)'
                                           && getComputedStyle(e).color === 'rgb(255, 255, 255)')
             && await shutIco.evaluate(e => getComputedStyle(e).backgroundColor === 'rgba(235, 120, 35, 0.1)');
     })());

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

  console.log('Первый экран: фотографии производства:');
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto('file://' + B + 'index.html', { waitUntil:'load' });
  ok('в слайдере три фотографии, а не рисованные фоны', await (async () => {
      const srcs = await p.evaluate(() =>
        [...document.querySelectorAll('.slide__bg img')].map(i => i.getAttribute('src')));
      return srcs.length === 3
             && srcs.every((s, i) => s === `assets/img/hero-${i + 1}.jpg`)
             && srcs.every(s => !s.endsWith('.svg')); })());
  ok('все три фотографии реально загружаются и не пустые', await (async () => {
      await p.waitForTimeout(600);
      const st = await p.evaluate(() =>
        [...document.querySelectorAll('.slide__bg img')].map(i => i.complete && i.naturalWidth));
      return st.length === 3 && st.every(w => w >= 1900); })());
  ok('у каждого фона осмысленное описание для скринридера',
     await p.evaluate(() => [...document.querySelectorAll('.slide__bg img')]
       .every(i => (i.getAttribute('alt') || '').length > 20)));
  ok('разметка первого экрана не тронута: те же классы, заголовок и две кнопки',
     await p.evaluate(() => {
       const hero = document.querySelector('.hero');
       return !!hero.querySelector('.hero__stage')
              && hero.querySelectorAll('.slide').length === 3
              && hero.querySelectorAll('.slide__bg').length === 3
              && !!hero.querySelector('.wrap.hero__in .hero__copy .hero__title')
              && hero.querySelectorAll('.hero__acts .btn').length === 2
              && hero.querySelector('.slide').classList.contains('is-active'); }));

  console.log('Услуги: приём вторсырья, доставка и склад:');
  await p.goto('file://' + B + 'uslugi.html', { waitUntil:'domcontentloaded' });
  ok('на странице четыре новые карточки услуг', await (async () => {
      const ids = ['usluga-makulatura','usluga-polietilen','usluga-dostavka-tirazha','usluga-hranenie'];
      for (const id of ids) if (await p.locator('#' + id + '.svc').count() !== 1) return false;
      return await p.locator('#dop .svc').count() === 4; })());
  ok('условия приёма макулатуры перенесены со старого сайта полностью',
     await p.locator('#usluga-makulatura').evaluate(e => {
       const t = e.innerText.replace(/\s+/g, ' ');
       return t.includes('7–20 коп./кг') && t.includes('5 коп./кг')
              && t.includes('от 200 кг') && t.includes('от 500 кг')
              && t.includes('Вокзальная, 8Б') && t.includes('Пн–Сб 8:00–17:00')
              && /без скоб, скрепок и ламинации/.test(t); }));
  ok('условия приёма полиэтилена перенесены со старого сайта',
     await p.locator('#usluga-polietilen').evaluate(e => {
       const t = e.innerText.replace(/\s+/g, ' ');
       return t.includes('0,40–0,70 руб./кг') && /[Сс]трейч-плёнка/.test(t)
              && t.includes('ПВД') && /[Сс]ортировка/.test(t); }));
  ok('доставка и хранение описаны с условиями со старого сайта',
     await (async () => {
       const d = await p.locator('#usluga-dostavka-tirazha').evaluate(e => e.innerText.replace(/\s+/g, ' '));
       const h = await p.locator('#usluga-hranenie').evaluate(e => e.innerText.replace(/\s+/g, ' '));
       return d.includes('МКАД') && d.includes('от 1 коп.') && /Заславл/.test(d)
              && /отапливаем/i.test(h) && /склад/i.test(h); })());
  ok('телефоны в карточках кликабельны и совпадают с подписью', await (async () => {
      const tels = await p.locator('#dop .svc__tel').evaluateAll(list => list.map(a => ({
        href: a.getAttribute('href'), text: a.textContent.trim() })));
      if (tels.length !== 4) return false;
      return tels.every(t => {
        if (!/^tel:\+375\d{9}$/.test(t.href)) return false;
        // «8 (029) 120 01 50» → +375 29 120 01 50: междугородняя «8» и ноль
        // кода города в международной записи заменяются на код страны.
        const shown = t.text.replace(/\D/g, '').replace(/^80/, '375');
        return 'tel:+' + shown === t.href;
      }); })());
  ok('номер для вывоза полиэтилена — тот, что указан на старом сайте',
     await p.locator('#usluga-polietilen .svc__tel').getAttribute('href') === 'tel:+375295364364');

  console.log('«О компании»: документы и корпоративные стандарты:');
  await p.goto('file://' + B + 'o-kompanii.html', { waitUntil:'load' });
  ok('в блоке «Корпоративные стандарты» четыре карточки с нужными тезисами',
     await (async () => {
       if (await p.locator('#standarty .card').count() !== 4) return false;
       const t = await p.locator('#standarty').evaluate(e => e.innerText);
       return ['Миссия','Стабильность и гарантии','Контроль качества','Уважение к клиенту']
         .every(x => t.includes(x)); })());
  ok('стандарты стоят в 4 колонки на десктопе и не разъезжаются на мобильном',
     await (async () => {
       const cols = async w => { await p.setViewportSize({ width: w, height: 900 });
         return p.locator('#standarty .grid').evaluate(
           e => getComputedStyle(e).gridTemplateColumns.split(' ').length); };
       const d = await cols(1440), t = await cols(1024), m = await cols(390);
       await p.setViewportSize({ width: 1440, height: 900 });
       return d === 4 && t === 2 && m === 1; })());
  ok('в блоке документов три скана с подписями',
     await p.locator('#dokumenty .doc').count() === 3);
  ok('сканы реально загружаются, а не показывают битую картинку', await (async () => {
      await p.evaluate(() => document.querySelector('#dokumenty').scrollIntoView());
      await p.waitForTimeout(900);
      const st = await p.evaluate(() =>
        [...document.querySelectorAll('#dokumenty img')].map(i => i.complete && i.naturalWidth > 300));
      return st.length === 3 && st.every(Boolean); })());
  ok('реквизиты под сканами совпадают с самими документами',
     await p.locator('#dokumenty').evaluate(e => {
       const t = e.innerText.replace(/\s+/g, ' ');
       return t.includes('691817655') && t.includes('26 августа 2016')
              && t.includes('478.2/4874-1') && t.includes('ТР ТС 005/2011')
              && t.includes('691817655.001-2020'); }));
  ok('превью документа — кнопка с курсором «увеличить», а не просто картинка',
     await p.locator('#dokumenty .doc__view').first().evaluate(e =>
       e.tagName === 'BUTTON' && getComputedStyle(e).cursor === 'zoom-in'
       && !!e.getAttribute('data-doc') && !!e.getAttribute('data-doc-title')));
  ok('клик по превью открывает документ во весь экран', await (async () => {
      await p.locator('#dokumenty .doc__view').nth(2).click();
      await p.waitForTimeout(500);
      return p.evaluate(() => {
        const v = document.querySelector('.viewer');
        return !!v && !v.hidden && v.classList.contains('is-open')
               && v.getAttribute('role') === 'dialog'
               && v.querySelector('img').getAttribute('src').includes('doc-deklaraciya')
               && document.activeElement.classList.contains('viewer__close'); }); })());
  ok('Esc закрывает просмотр и возвращает фокус на превью', await (async () => {
      await p.keyboard.press('Escape');
      await p.waitForTimeout(500);
      return p.evaluate(() => document.querySelector('.viewer').hidden
             && document.activeElement.classList.contains('doc__view')); })());
  ok('клик мимо документа тоже закрывает просмотр', await (async () => {
      await p.locator('#dokumenty .doc__view').first().click();
      await p.waitForTimeout(450);
      await p.locator('.viewer').click({ position: { x: 6, y: 6 } });
      await p.waitForTimeout(500);
      return p.evaluate(() => document.querySelector('.viewer').hidden); })());

  console.log('Акции со старого сайта в каталоге:');
  ok('коробки для пиццы: три ступени тиража с ценами старого сайта', await (async () => {
      await p.goto('file://' + B + 'produkciya-korobki-dlya-piccy.html', { waitUntil:'domcontentloaded' });
      const t = (await p.locator('#price .ptable').innerText()).replace(/\s+/g, ' ');
      const note = (await p.locator('#price .ptable__note').innerText()).replace(/\s+/g, ' ');
      return t.includes('320×320×30') && t.includes('33 коп.') && t.includes('31 коп.') && t.includes('29 коп.')
             && t.includes('320×320×35') && t.includes('34 коп.') && t.includes('32 коп.') && t.includes('30 коп.')
             && note.includes('МКАД') && note.includes('1 коп.'); })());
  ok('коробка для маркетплейсов 700×400×435 — 1,80 руб.', await (async () => {
      await p.goto('file://' + B + 'produkciya-upakovka-dlya-marketpleysov.html', { waitUntil:'domcontentloaded' });
      const t = (await p.locator('.ptable').innerText()).replace(/\s+/g, ' ');
      return t.includes('700×400×435') && t.includes('1,80 руб.'); })());
  await p.goto('file://' + B + 'index.html', { waitUntil:'domcontentloaded' });
  await p.setViewportSize({ width: 1440, height: 900 });

  console.log('Страница «Коробки для пиццы»:');
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.goto('file://' + B + 'produkciya-korobki-dlya-piccy.html', { waitUntil:'load' });
  ok('заголовок и подзаголовок страницы — развёрнутые, под кегль пониже',
     await p.evaluate(() => {
       const h1 = document.querySelector('.phead h1');
       const lead = document.querySelector('.phead .lead').textContent.replace(/\s+/g, ' ');
       return h1.classList.contains('h1--long')
              && h1.textContent.includes('Производство коробок для пиццы')
              && h1.textContent.includes('Минске и Заславле')
              && parseFloat(getComputedStyle(h1).fontSize) < 56
              && lead.includes('микрогофрокартона') && lead.includes('профиль «E», «В»')
              && lead.includes('Т11, Т21–Т24') && lead.includes('вентиляционными'); }));
  ok('в шапке четыре плашки быстрых условий', await (async () => {
      if (await p.locator('.phead .pfact').count() !== 4) return false;
      const t = (await p.locator('.pfacts').innerText()).replace(/\s+/g, ' ');
      return t.includes('от 50 шт.') && t.includes('5–7 рабочих дней')
             && t.includes('1–4 цвета по Pantone') && t.includes('самовывоз из Заславля'); })());
  ok('плашки читаются на тёмной шапке (контраст выше AA)',
     await p.locator('.pfact').first().evaluate(e => {
       const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number)
         .map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
         return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
       const fg = lum(getComputedStyle(e.querySelector('.pfact__v')).color);
       const bg = lum(getComputedStyle(document.querySelector('.phead')).backgroundColor);
       return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) >= 4.5; }));

  ok('две складские позиции с бейджем «В наличии»', await (async () => {
      return await p.locator('#sklad .pstock').count() === 2
             && await p.locator('#sklad .pstatus--in').count() === 2; })());
  ok('все четыре цены на 320×320×30 и цена на 320×320×35 на месте',
     await p.locator('#sklad').evaluate(e => {
       const t = e.innerText.replace(/\s+/g, ' ');
       return t.includes('320×320×30') && t.includes('Профиль «E»')
              && t.includes('0,40 руб.') && t.includes('0,42 руб.')
              && t.includes('0,43 руб.') && t.includes('0,48 руб.')
              && t.includes('320×320×35') && t.includes('Профиль «В»') && t.includes('0,39 руб.')
              && t.includes('50 шт.'); }));
  ok('условия печати логотипа перечислены полностью',
     await p.locator('#sklad .band').evaluate(e => {
       const t = e.innerText.replace(/\s+/g, ' ');
       return t.includes('+0,02 руб.') && t.includes('+0,04 руб.')
              && t.includes('от 3000 шт.') && /четырёх цветов/.test(t); }));

  ok('в таблице типоразмеров все 22 позиции из прайса', await (async () => {
      const rows = await p.locator('#razmery .ptable tbody tr').count();
      const t = (await p.locator('#razmery .ptable').innerText()).replace(/\s+/g, ' ');
      const sizes = ['220×220×30','230×230×40','240×240×35','250×250×30','280×280×30',
                     '280×280×40','295×295×40','305×305×40','320×320×30','320×320×35',
                     '320×320×40','330×330×40','370×370×40','390×390×40','420×420×35',
                     '430×430×40','445×445×40','460×460×30','460×460×45',
                     '350×250×50','400×300×30','600×300×50'];
      return rows === sizes.length && sizes.every(s => t.includes(s)); })());
  ok('у каждого размера указан статус и стоит кнопка расчёта', await (async () => {
      const rows = await p.locator('#razmery .ptable tbody tr').count();
      return await p.locator('#razmery .pstatus').count() === rows
             && await p.locator('#razmery .pcalc[data-size]').count() === rows
             && await p.locator('#razmery .pstatus--in').count() === 2; })());
  ok('ходовые размеры помечены отдельно', await (async () => {
      const tags = await p.locator('#razmery .psize__tag').evaluateAll(
        list => list.map(e => e.closest('tr').querySelector('.psize').textContent));
      return tags.length === 6 && ['280×280×30','320×320×35','320×320×40','460×460×45']
        .every(s => tags.includes(s)); })());
  ok('римские прямоугольные форматы отмечены как прямоугольные',
     await p.locator('#razmery .ptable').evaluate(e => {
       const rows = [...e.querySelectorAll('tbody tr')].filter(r =>
         /350×250×50|400×300×30|600×300×50/.test(r.querySelector('.psize').textContent));
       return rows.length === 3 && rows.every(r => r.innerText.includes('прямоугольная')
                                                  && /римская/i.test(r.innerText)); }));
  ok('кнопка «Рассчитать» подставляет размер в форму заявки', await (async () => {
      await p.locator('#razmery .pcalc[data-size="390×390×40"]').click();
      await p.waitForTimeout(500);
      const v = await p.locator('#pf-msg').inputValue();
      // повторный клик по тому же размеру не дублирует его
      await p.locator('#razmery .pcalc[data-size="390×390×40"]').click();
      await p.waitForTimeout(400);
      const again = await p.locator('#pf-msg').inputValue();
      return v.startsWith('390×390×40') && again === v; })());

  ok('две технологические карточки: горячая доставка и заморозка',
     await p.locator('#tehnologiya .svc').evaluateAll(list => {
       if (list.length !== 2) return false;
       const t = list.map(e => e.innerText.replace(/\s+/g, ' ')).join(' | ');
       return /горяч/i.test(t) && /заморож/i.test(t)
              && t.includes('Т24') && /жиростойк/i.test(t) && /пергамент/i.test(t)
              && /вентиляц/i.test(t) && /конденсат/i.test(t)
              && /формоустойчивость/i.test(t) && /пищевая сертификация/i.test(t)
              && t.includes('ЕАС'); }));
  ok('логистика: поддонная укладка и быстрая сборка',
     await p.locator('#logistika').evaluate(e => {
       const t = e.innerText.replace(/\s+/g, ' ');
       return /поддон/i.test(t) && /стрейч/i.test(t) && /упаковочным листом/i.test(t)
              && /пыли и влаги/i.test(t) && /вырубаются по ножам/i.test(t); }));
  ok('внизу раздела есть рабочая форма заявки со своими id',
     await p.locator('#zakaz form.form').evaluate(f => {
       const ids = [...f.querySelectorAll('[id]')].map(e => e.id);
       return f.getAttribute('data-subject').includes('коробки для пиццы')
              && ids.includes('pf-name') && ids.includes('pf-phone') && ids.includes('pf-msg')
              && !!f.querySelector('[data-size-target]')
              && !!f.querySelector('button[type=submit]'); }));
  ok('форма проверяет обязательные поля так же, как на «Корзине»', await (async () => {
      await p.locator('#zakaz .form button[type=submit]').click();
      await p.waitForTimeout(250);
      return p.locator('#pf-name').evaluate(e => e.closest('.field').classList.contains('has-error')); })());
  ok('на телефоне таблица размеров превращается в карточки, а не режется', await (async () => {
      await p.setViewportSize({ width: 390, height: 900 });
      await p.goto('file://' + B + 'produkciya-korobki-dlya-piccy.html', { waitUntil:'load' });
      const st = await p.evaluate(() => {
        const td = document.querySelector('#razmery .ptable tbody td');
        const tbl = document.querySelector('#razmery .ptable');
        return { td: getComputedStyle(td).display,
                 label: getComputedStyle(td, '::before').content,
                 fits: tbl.scrollWidth <= document.documentElement.clientWidth + 1 };
      });
      await p.setViewportSize({ width: 1440, height: 1000 });
      return st.td === 'flex' && st.label.includes('Размер') && st.fits; })());
  ok('страница подгруппы осталась на своём адресе и в каталоге', await (async () => {
      await p.goto('file://' + B + 'produkciya.html', { waitUntil:'domcontentloaded' });
      const href = await p.locator('.grid--cat .prod')
        .filter({ hasText: 'Коробки для пиццы' }).locator('a').getAttribute('href');
      return href === 'produkciya-korobki-dlya-piccy.html'; })());

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
