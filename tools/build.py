#!/usr/bin/env python3
"""
Сборщик статических страниц сайта «Арт-Пак Плюс».

Зачем: шапка, меню, контакты и подвал одинаковы на всех страницах. Держать их
в шести файлах — гарантированно получить расхождения. Здесь они лежат в одном
месте, а содержимое страниц — в src/*.html.

Правка контента:  src/<страница>.html
Правка каркаса:   этот файл
Пересборка:       python3 tools/build.py   (готовые .html кладутся в корень)
"""

import json
import os
import re

from products_data import CATEGORIES

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "src")

# --- Контактные данные: единственный источник правды ----------------------
COMPANY   = "Арт-Пак Плюс"
LEGAL     = "ООО «Арт-Пак Плюс»"                      # для <title> и <meta> — только текст
LEGAL_HTML = 'ООО «Арт-Пак <span class="brand-plus">Плюс</span>»'  # для видимого текста на странице
TAGLINE   = "Производство упаковки из гофрокартона"
PHONES    = [("8 (017) 547 44 44", "+375175474444"),
             ("8 (044) 517 44 45", "+375445174445"),
             ("8 (029) 120 01 50", "+375291200150")]
FAX       = "8 (017) 511 44 02"
EMAIL     = "info@gofrocarton.by"
ADDRESS   = "223036, Минский р-н, г. Заславль, ул. Вокзальная, 8Б"
HOURS     = "Пн–Пт 8:30–17:30, обед 13:00–13:30"
UNP       = "691817655"

NAV = [("index.html",       "Главная"),
       ("o-kompanii.html",  "О компании"),
       ("produkciya.html",  "Продукция"),
       ("uslugi.html",      "Услуги"),
       ("oborudovanie.html", "Оборудование"),
       ("korzina.html",     "Корзина")]

# Подменю пунктов навигации. Ключ — страница, значение — список пар
# (ссылка, подпись). Ссылки полные, а не якоря на своей странице: в подменю
# «Продукция» стоят страницы конкретных подгрупп гофротары, в «Услугах» —
# конкретные услуги, у остальных пунктов — разделы своей страницы. Так из
# шапки можно попасть сразу в нужное место сайта, а не только на страницу.
# Категории берутся из products_data.py — список нигде не дублируется.
NAV_SECTIONS = {
    "index.html": [
        ("index.html#dalee",             "Почему заказывают у нас"),
        ("index.html#produkciya",        "Продукция"),
        ("index.html#oborudovanie-band", "Оборудование"),
        ("index.html#etapy",             "От заявки до отгрузки"),
    ],
    "o-kompanii.html": [
        ("o-kompanii.html#dalee",     "Производство"),
        ("o-kompanii.html#standarty", "Корпоративные стандарты"),
        ("o-kompanii.html#principy",  "Принципы работы"),
        ("o-kompanii.html#dokumenty", "Официальные документы"),
        ("o-kompanii.html#vizit",     "Приезжайте на производство"),
    ],
    "produkciya.html": [
        *((f'produkciya-{c["slug"]}.html', c["name"]) for c in CATEGORIES),
        ("produkciya.html#dalee",    "Весь каталог продукции"),
        ("produkciya.html#material", "Из чего делаем упаковку"),
    ],
    "uslugi.html": [
        ("uslugi.html#usluga-flexopechat",  "Флексографическая печать"),
        ("uslugi.html#usluga-pokraska",     "Покраска продукции"),
        ("uslugi.html#usluga-konstrukciya", "Разработка конструкции"),
        ("uslugi.html#usluga-vysechka",     "Высечка и рилёвка"),
        ("uslugi.html#usluga-razmery",      "Изготовление по размерам"),
        ("uslugi.html#usluga-dostavka",     "Доставка"),
        ("uslugi.html#usluga-makulatura",   "Приём макулатуры"),
        ("uslugi.html#usluga-polietilen",   "Приём отходов полиэтилена"),
        ("uslugi.html#usluga-hranenie",     "Хранение гофротары"),
        ("uslugi.html#flexopechat",         "Как мы печатаем"),
        ("uslugi.html#faq",                 "Частые вопросы"),
    ],
    "oborudovanie.html": [
        ("oborudovanie.html#dalee",  "Что мы предлагаем"),
        ("oborudovanie.html#sdelka", "Как проходит сделка"),
    ],
    "korzina.html": [
        ("korzina.html#sostav",  "Состав заказа"),
        ("korzina.html#zayavka", "Заявка на расчёт"),
        ("korzina.html#karta",   "Как нас найти"),
    ],
}

# Подменю, которые не помещаются в одну колонку разумной высоты: каталог
# продукции и услуги раскладываются в два столбца.
NAV_WIDE = {"produkciya.html", "uslugi.html"}

PAGES = {
    "index.html":       ("Производство упаковки из гофрокартона в Минске — " + LEGAL,
                         "Производим гофрокороба, лотки, защитные уголки и гофротару любой конфигурации "
                         "с флексографической печатью 1–4 краски. Собственное производство под Минском."),
    "o-kompanii.html":  ("О компании — " + LEGAL,
                         "ООО «Арт-Пак Плюс» — производство гофроупаковки полного цикла в Заславле "
                         "под Минском: собственные мощности, современное оборудование, свои конструкторы."),
    "produkciya.html":  ("Продукция — гофрокороба, лотки, уголки, гофротара",
                         "Каталог продукции из гофрокартона: четырёхклапанные короба, лотки, уголки, "
                         "контейнеры, коробки для пиццы, упаковка для маркетплейсов, прокладки."),
    "uslugi.html":      ("Услуги — флексопечать, высечка, разработка конструкции",
                         "Многокрасочная флексографическая печать, высечка, разработка конструкции "
                         "упаковки, покраска продукции, доставка по Беларуси."),
    "oborudovanie.html": ("Оборудование — продажа нового и б/у оборудования",
                          "Наш производственный парк и продажа нового и б/у оборудования "
                          "для производства гофротары."),
    "korzina.html":     ("Корзина и заявка на расчёт — " + LEGAL,
                         "Соберите заказ из каталога и отправьте заявку на расчёт: "
                         "имя, телефон и e-mail — остальное подставится из корзины."),
}

# --- Иконки (подставляются как {{icon:имя}}) ------------------------------
ICONS = {
    "arrow":    '<path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "left":     '<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "right":    '<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "down":     '<path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "up":       '<path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "heat":     '<path d="M12.6 2.6c1.6 2.4.6 3.9-.5 5.3-1.2 1.5-2.2 2.9-.8 5.2" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M8 6.4c1 1.6.4 2.6-.3 3.5-.8 1-1.5 1.9-.6 3.4M17 6.4c1 1.6.4 2.6-.3 3.5-.8 1-1.5 1.9-.6 3.4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".65"/><path d="M4.5 17.2h15M6.5 20.4h11" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    "snow":     '<path d="M12 2.6v18.8M4 7.2l16 9.6M20 7.2 4 16.8" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M9.4 5.1 12 7.7l2.6-2.6M9.4 18.9 12 16.3l2.6 2.6M3.4 10.6l.9 3.5 3.4-1M20.6 10.6l-.9 3.5-3.4-1M7.7 8.5l-3.4-1-.9 3.5M16.3 8.5l3.4-1 .9 3.5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "talk":     '<path d="M4 5.5h11a1.6 1.6 0 0 1 1.6 1.6v5.3a1.6 1.6 0 0 1-1.6 1.6H9.2L5.4 17v-3H4a1.6 1.6 0 0 1-1.6-1.6V7.1A1.6 1.6 0 0 1 4 5.5Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M18.6 9.2H20a1.6 1.6 0 0 1 1.6 1.6v4.4A1.6 1.6 0 0 1 20 16.8h-1v2.6l-2.8-2.6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>',
    "zoom":     '<circle cx="11" cy="11" r="6.6" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M15.8 15.8 21 21M8.6 11h4.8M11 8.6v4.8" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
    "chev":     '<path d="M6 9.5 12 15l6-5.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "plus":     '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
    "phone":    '<path d="M6.6 3h3l1.5 4-2 1.4a12 12 0 0 0 5.5 5.5l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
    "mail":     '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="m3.5 7 8.5 6 8.5-6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    "pin":      '<path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.6" stroke="currentColor" stroke-width="1.8" fill="none"/>',
    "clock":    '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 7v5.2l3.4 2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    "fax":      '<path d="M7 9V4h10v5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><rect x="3" y="9" width="18" height="7" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M7 16h10v4H7z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
    "box":      '<path d="M12 3 3 7.2v9.6L12 21l9-4.2V7.2Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="M3 7.2 12 11.5l9-4.3M12 11.5V21" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
    "print":    '<rect x="6" y="3" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="3" y="9" width="18" height="8" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="6" y="15" width="12" height="6" rx="1" stroke="currentColor" stroke-width="1.8" fill="none"/>',
    "ruler":    '<rect x="2.5" y="8" width="19" height="8" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M7 8v3.5M11 8v5M15 8v3.5M19 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    "truck":    '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><circle cx="7" cy="18" r="2" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="17.5" cy="18" r="2" stroke="currentColor" stroke-width="1.8" fill="none"/>',
    "shield":   '<path d="M12 3 5 6v6c0 4.2 2.9 7.7 7 9 4.1-1.3 7-4.8 7-9V6Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="m9 12 2.2 2.2L15.5 10" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "gear":     '<circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    "spark":    '<path d="M12 2.5 14.2 9l6.5 2.2-6.5 2.2L12 20l-2.2-6.6L3.3 11.2 9.8 9Z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/>',
    "layers":   '<path d="m12 3 9 4.5-9 4.5-9-4.5Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
    "chart":    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    "crumb":    '<path d="M9.5 5.5 15 12l-5.5 6.5" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "check":    '<path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "cart":     '<path d="M3.5 5h2.3l2.2 9.6a2 2 0 0 0 1.95 1.55h7.05a2 2 0 0 0 1.95-1.5L20.5 8.2H6.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10.2" cy="19.4" r="1.5" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="17.2" cy="19.4" r="1.5" stroke="currentColor" stroke-width="1.8" fill="none"/>',
    "trash":    '<path d="M4.5 6.8h15M9.6 6.8V4.6h4.8v2.2M7 6.8l.9 13a1.6 1.6 0 0 0 1.6 1.5h5a1.6 1.6 0 0 0 1.6-1.5l.9-13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "leaf":     '<path d="M20 4C10 4 4 9 4 16c0 2.2.8 3.6.8 3.6S8 12 19 8c0 0-7 3.6-9.6 11.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
}

LOGO_MARK = '''<svg class="logo__mark" viewBox="0 0 48 48" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#F49B3F"/><stop offset="1" stop-color="#C06A1C"/>
      </linearGradient></defs>
      <path d="M24 3 44 13v22L24 45 4 35V13Z" fill="url(#lg)"/>
      <path d="M24 3 44 13 24 23 4 13Z" fill="#F7B265"/>
      <path d="M24 23v22L4 35V13Z" fill="#A85B14" opacity=".55"/>
      <path d="M4 13 24 23l20-10" fill="none" stroke="#8C4A0E" stroke-width="1.6" opacity=".5"/>
      <path d="M24 23v22" fill="none" stroke="#8C4A0E" stroke-width="1.6" opacity=".5"/>
    </svg>'''


def icon(name, cls=""):
    c = f' class="{cls}"' if cls else ""
    return f'<svg{c} viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>'


def phones_html(sep="<br>"):
    return sep.join(f'<a href="tel:{t}">{d}</a>' for d, t in PHONES)


def topbar():
    return f'''<div class="topbar">
    <div class="wrap topbar__in">
      <span class="topbar__note"><i class="topbar__dot"></i>Собственное производство под Минском · {HOURS}</span>
      <span class="topbar__links">
        <a href="tel:{PHONES[0][1]}">{PHONES[0][0]}</a>
        <a href="mailto:{EMAIL}">{EMAIL}</a>
      </span>
    </div>
  </div>'''


def nav_item(f, t, active):
    """Пункт меню. У пунктов с подменю — семантический список ссылок:
    на десктопе он раскрывается наведением, на мобильном (где наводить
    нечем) — тапом по кнопке-шеврону рядом с пунктом. Сам пункт остаётся
    обычной ссылкой на свою страницу в обоих случаях.
    У «Корзины» дополнительно счётчик позиций — его ведёт JS."""
    cls = "nav__link" + (" is-active" if f == active else "")
    label = t
    if f == "korzina.html":
        cls += " nav__link--cart"
        label += f'{icon("cart", "nav__cart-ico")}<span class="cart-badge" data-cart-badge hidden>0</span>'
    sections = NAV_SECTIONS.get(f)
    if not sections:
        return f'<li><a class="{cls}" href="{f}">{label}</a></li>'

    link = f'<a class="{cls}" href="{f}" aria-haspopup="true">{label}</a>'
    items = "".join(f'<li><a href="{href}">{title}</a></li>' for href, title in sections)
    wide = " nav__drop--wide" if f in NAV_WIDE else ""
    return (f'<li class="nav__item">\n'
            f'        {link}\n'
            f'        <button class="nav__toggle" type="button" aria-expanded="false"'
            f' aria-label="Разделы: {t}">{icon("chev")}</button>\n'
            f'        <div class="nav__drop{wide}">\n'
            f'          <ul class="nav__drop-list">{items}</ul>\n'
            f'        </div>\n'
            f'      </li>')


def header(active):
    links = "".join(nav_item(f, t, active) for f, t in NAV)
    return f'''{topbar()}
  <header class="header">
    <div class="wrap header__in">
      <a class="logo" href="index.html" aria-label="{COMPANY} — на главную">
        {LOGO_MARK}
        <span class="logo__txt">
          <span class="logo__name">Арт-Пак <b>Плюс</b></span>
          <span class="logo__sub">{TAGLINE}</span>
        </span>
      </a>
      <a class="header__cart" href="korzina.html" aria-label="Корзина" data-cart-target>
        {icon('cart')}<span class="cart-badge" data-cart-badge hidden>0</span>
      </a>
      <button class="burger" type="button" aria-label="Меню" aria-expanded="false"><span></span></button>
      <nav class="nav" aria-label="Основное меню"><ul class="nav__list">{links}</ul></nav>
      <a class="btn btn--primary btn--sm header__cta" href="korzina.html#zayavka">Рассчитать заказ</a>
    </div>
  </header>'''


def footer():
    # Список продукции в подвале — из каталога, чтобы не расходился с сайтом
    prod = "".join(f'<li><a href="produkciya-{c["slug"]}.html">{c["name"]}</a></li>'
                   for c in CATEGORIES[:6])
    comp = "".join(f'<li><a href="{f}">{t}</a></li>' for f, t in NAV[1:])
    tels = "".join(f'<li><a href="tel:{t}">{d}</a></li>' for d, t in PHONES)
    return f'''<footer class="footer">
    <div class="wrap">
      <div class="footer__grid">
        <div>
          <a class="logo" href="index.html">
            {LOGO_MARK}
            <span class="logo__txt"><span class="logo__name">Арт-Пак <b>Плюс</b></span></span>
          </a>
          <p class="footer__about">{LEGAL_HTML} — производство гофротары и гофроупаковки
            полного цикла: от конструкции и печати до доставки на ваш склад.</p>
        </div>
        <div>
          <div class="footer__t">Продукция</div>
          <ul class="footer__list">{prod}</ul>
        </div>
        <div>
          <div class="footer__t">Компания</div>
          <ul class="footer__list">{comp}</ul>
        </div>
        <div>
          <div class="footer__t">Контакты</div>
          <ul class="footer__list">
            {tels}
            <li><span>факс: {FAX}</span></li>
            <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
            <li><span>{ADDRESS}</span></li>
          </ul>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© <span data-year>2026</span> {LEGAL_HTML}. УНП {UNP}</span>
        <span>Все права защищены</span>
      </div>
    </div>
  </footer>
  <button class="totop" type="button" aria-label="Наверх">{icon('up')}</button>'''


LAYOUT = '''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0B1118">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
{header}
<main>
{body}
</main>
{footer}
<script src="assets/js/main.js"></script>
</body>
</html>
'''


def substitute(body):
    """Подстановка иконок и контактов в тело страницы."""
    body = re.sub(r"\{\{icon:(\w+)(?::([\w-]+))?\}\}",
                  lambda m: icon(m.group(1), m.group(2) or ""), body)
    return (body.replace("{{email}}", EMAIL).replace("{{fax}}", FAX)
                .replace("{{address}}", ADDRESS).replace("{{hours}}", HOURS)
                .replace("{{unp}}", UNP).replace("{{legal}}", LEGAL_HTML)
                .replace("{{phones}}", phones_html())
                .replace("{{phone1}}", PHONES[0][0]).replace("{{tel1}}", PHONES[0][1]))


def write_page(name, title, desc, body, active=None):
    """Собирает страницу из каркаса и записывает её в корень проекта."""
    html = LAYOUT.format(title=title, desc=desc,
                         header=header(active or name), body=substitute(body), footer=footer())
    with open(os.path.join(ROOT, name), "w", encoding="utf-8") as fh:
        fh.write(html)
    return len(html)


def render(name):
    title, desc = PAGES[name]
    with open(os.path.join(SRC, name), encoding="utf-8") as fh:
        body = fh.read()
    if name == "produkciya.html":                      # сетка карточек — из данных каталога
        body = body.replace("{{catalog}}", catalog_grid())
    return write_page(name, title, desc, body)


# --- Каталог продукции ----------------------------------------------------
def catalog_grid():
    """Сетка карточек подгрупп на странице «Продукция» — с кнопкой «Подробнее»."""
    cards = []
    for c in CATEGORIES:
        cards.append(f'''      <article class="prod reveal" data-cat="{c['cat']}">
        <div class="prod__pic">
          <img src="assets/img/{c['img']}" alt="{c['name']}"></div>
        <div class="prod__body">
          <h3 class="prod__t">{c['name']}</h3>
          <p class="prod__d">{c['desc']}</p>
          <a class="btn btn--outline btn--sm prod__more" href="produkciya-{c['slug']}.html">
            Подробнее {icon('arrow')}</a>
        </div>
      </article>''')
    return "\n\n".join(cards)


SIZE_RE = re.compile(r"\d{2,4}\s*[×xXхХ*]\s*\d{2,4}\s*[×xXхХ*]\s*\d{2,4}")


def esc(s):
    return (s or "").replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def row_size(name):
    """Габарит из названия позиции — для отдельной колонки в корзине."""
    m = SIZE_RE.search(name or "")
    return m.group(0).replace(" ", "") if m else ""


def row_tiers(cols, row):
    """[[тираж, «цена»], …] по колонкам с `min` — из них корзина берёт цену."""
    return [[col["min"], row[col["key"]]]
            for col in cols if "min" in col and row.get(col["key"])]


def add_button(cat, num):
    """Плюсик рядом с номером позиции: раскрывает окошко с тиражом."""
    return (f'<button class="padd" type="button" aria-expanded="false" '
            f'aria-controls="add-{cat["slug"]}-{num}" '
            f'aria-label="Добавить позицию {num} в корзину">'
            f'{icon("plus")}<span class="padd__t">В корзину</span></button>')


def add_panel(cat, num, min_qty, span):
    """Окошко под строкой: тираж, пересчёт цены и кнопка «в корзину»."""
    return f'''<tr class="pform" id="add-{cat['slug']}-{num}"><td colspan="{span}">
          <div class="pform__wrap"><div class="pform__in">
            <label class="pform__field"><span class="pform__lbl">Тираж, шт.</span>
              <input class="pform__qty" type="number" inputmode="numeric" step="1"
                     min="{min_qty}" value="{min_qty}" aria-label="Тираж, шт."></label>
            <p class="pform__calc" data-calc></p>
            <button class="btn btn--primary btn--sm pform__go" type="button">
              В корзину {icon('cart')}</button>
          </div></div></td></tr>'''


def price_table(cat):
    """Таблица прайса подгруппы. Пока строк нет — честное «Цена по запросу»."""
    if not cat["rows"]:
        return f'''<div class="ptable__empty reveal">
        <p class="ptable__empty-t">Цена по запросу</p>
        <p class="ptable__empty-d">Пришлите размеры и тираж — рассчитаем стоимость
          «{cat['name'].lower()}» под вашу задачу и вышлем прайс в тот же день.</p>
        <div class="cta__acts">
          <a class="btn btn--primary" href="korzina.html#zayavka">Запросить цену {icon('arrow')}</a>
          <a class="btn btn--outline" href="tel:{PHONES[0][1]}">{icon('phone')}{PHONES[0][0]}</a>
        </div>
      </div>'''

    cols = cat["columns"]
    head = table_head(cols)
    body = []
    num = 0
    for row in cat["rows"]:
        num += 1
        tiers = row_tiers(cols, row)
        cells = []
        for col in cols:
            key = col["key"]
            if key == "no":
                val = f'<span class="ptable__n">{num}</span>' + (add_button(cat, num) if tiers else "")
            elif key == "photo":
                img = row.get("photo")
                val = (f'<img class="ptable__photo" src="assets/img/{img}" '
                       f'alt="{row.get("name", cat["name"])}" loading="lazy">' if img else "—")
            else:
                val = row.get(key, "—")
            nw = " ptable__nowrap" if col.get("nowrap") else ""
            cells.append(f'<td class="ptable__c ptable__c--{key}{nw}" '
                         f'style="text-align:{col.get("align", "left")}" '
                         f'data-label="{col["title"]}">{val}</td>')

        if tiers:
            data = (f' class="ptable__row" data-id="{cat["slug"]}-{num}"'
                    f' data-name="{esc(row.get("name", ""))}"'
                    f' data-photo="assets/img/{row.get("photo", "")}"'
                    f' data-size="{row_size(row.get("name", ""))}"'
                    f' data-cat="{esc(cat["name"])}"'
                    f' data-url="produkciya-{cat["slug"]}.html"'
                    f" data-tiers='{json.dumps(tiers, ensure_ascii=False)}'")
        else:
            data = ""
        body.append(f"<tr{data}>" + "".join(cells) + "</tr>")
        if tiers:
            body.append(add_panel(cat, num, tiers[0][0], len(cols)))

    note = cat.get("note") or ("Цены указаны без НДС. Итоговая стоимость зависит от тиража, "
                               "марки картона и печати — уточняйте у отдела продаж.")
    return f'''<div class="ptable__wrap reveal">
        <table class="ptable">
          <thead>{head}</thead>
          <tbody>{"".join(body)}</tbody>
        </table>
      </div>
      <p class="ptable__note">{note}</p>'''


def table_head(cols):
    """Шапка таблицы. Соседние колонки с общим `group` уходят под один заголовок."""
    if not any(c.get("group") for c in cols):
        return "<tr>" + "".join(
            f'<th style="text-align:{c.get("align", "left")}">{c["title"]}</th>'
            for c in cols) + "</tr>"

    top, low = [], []
    i = 0
    while i < len(cols):
        g = cols[i].get("group")
        if not g:
            top.append(f'<th rowspan="2" style="text-align:{cols[i].get("align", "left")}">'
                       f'{cols[i]["title"]}</th>')
            i += 1
            continue
        j = i
        while j < len(cols) and cols[j].get("group") == g:
            j += 1
        top.append(f'<th colspan="{j - i}" class="ptable__group">{g}</th>')
        low += [f'<th style="text-align:{c.get("align", "left")}">{c["title"]}</th>'
                for c in cols[i:j]]
        i = j
    return f'<tr>{"".join(top)}</tr><tr>{"".join(low)}</tr>'


def text_sections(cat):
    """Текстовые блоки внизу страницы подгруппы (требования площадок и т. п.)."""
    if not cat.get("sections"):
        return ""
    blocks = []
    for sec in cat["sections"]:
        lead = f'<p class="lead ptext__lead">{sec["lead"]}</p>' if sec.get("lead") else ""
        items = "".join(f"<li>{it}</li>" for it in sec.get("items", []))
        lst = f'<ul class="ptext__list">{items}</ul>' if items else ""
        after = f'<p class="ptext__after">{sec["after"]}</p>' if sec.get("after") else ""
        blocks.append(f'''<article class="ptext reveal">
          <h3 class="ptext__t">{sec["t"]}</h3>
          {lead}{lst}{after}
        </article>''')
    return f'''<section class="section section--tight">
  <div class="wrap">
    <div class="head reveal">
      <span class="eyebrow">Требования</span>
      <h2 class="h2 h2--tight">Что нужно знать до заказа</h2>
    </div>
    <div class="ptext__grid">{"".join(blocks)}</div>
  </div>
</section>

'''


def h1_class(cat):
    """Длинному заголовку — своя ступень кегля.

    Обычное имя подгруппы («Коробки для пиццы») в 66px читается как заголовок.
    Развёрнутый заголовок из данных категории тем же кеглем занимает четыре
    строки на всю шапку и перевешивает страницу, поэтому для него ступень ниже.
    """
    return "h1 h1--long" if len(cat.get("h1", "")) > 40 else "h1"


def hero_facts(cat):
    """Плашки быстрых условий под заголовком страницы подгруппы."""
    if not cat.get("facts"):
        return ""
    items = "".join(f'''
        <li class="pfact">
          <span class="pfact__ico">{icon(ic)}</span>
          <span class="pfact__txt"><b class="pfact__k">{k}</b><span class="pfact__v">{v}</span></span>
        </li>''' for ic, k, v in cat["facts"])
    return f'''
      <ul class="pfacts">{items}
      </ul>'''


def sizes_table(cat):
    """Таблица типоразмеров: размер, углы, назначение, статус и кнопка расчёта.

    Та же .ptable, что и у прайса, поэтому на узком экране она так же
    разбирается на карточки по data-label, а не скроллится вбок.
    """
    if not cat.get("sizes"):
        return ""
    rows = []
    for s in cat["sizes"]:
        stock = s.get("stock")
        badge = ('<span class="pstatus pstatus--in">В наличии</span>' if stock
                 else '<span class="pstatus">Под заказ</span>')
        # Размер и бейдж лежат в одной обёртке .psize__cell: на узком экране
        # .ptable разбирает строку в flex-карточку, и два соседних span стали
        # бы двумя flex-элементами, которые не переносятся. Внутри обёртки
        # между ними стоит пробел — единственная точка переноса.
        tag = '<span class="psize__tag">ходовой</span>' if s.get("tag") else ""
        rows.append(f'''      <tr>
        <td data-label="Размер, мм"><span class="psize__cell"><span class="psize">{s['size']}</span> {tag}</span></td>
        <td data-label="Углы">{s['corners']}</td>
        <td data-label="Назначение">{s['use']}</td>
        <td data-label="Статус">{badge}</td>
        <td data-label="" class="pcalc__cell">
          <a class="btn btn--outline btn--sm pcalc" href="#zakaz" data-size="{s['size']}">Рассчитать</a>
        </td>
      </tr>''')
    body = "\n".join(rows)
    return f'''<div class="ptable__wrap reveal">
    <table class="ptable">
      <thead><tr>
        <th style="text-align:left">Размер, мм</th>
        <th style="text-align:left">Углы</th>
        <th style="text-align:left">Назначение</th>
        <th style="text-align:left">Статус</th>
        <th><span class="visually-hidden">Расчёт</span></th>
      </tr></thead>
      <tbody>
{body}
      </tbody>
    </table>
  </div>'''


def extra_blocks(cat):
    """Дополнительные секции страницы подгруппы из src/<blocks>.html.

    Нужны там, где содержимого больше, чем укладывается в общий шаблон:
    у коробок для пиццы это позиции со склада, условия печати, технология
    и логистика. Файл проходит ту же подстановку, что и обычные страницы,
    поэтому {{icon:…}}, {{phones}} и прочие метки в нём работают.
    """
    name = cat.get("blocks")
    if not name:
        return ""
    with open(os.path.join(SRC, f"{name}.html"), encoding="utf-8") as fh:
        return fh.read().replace("{{sizes}}", sizes_table(cat))

def product_page(cat):
    """Страница одной подгруппы: описание, таблица прайса, заявка."""
    body = f'''<section class="phead">
  <div class="wrap">
    <div class="phead__in">
      <nav class="crumbs" aria-label="Хлебные крошки">
        <a href="index.html">Главная</a><span class="crumbs__sep">{icon('crumb')}</span><a href="produkciya.html">Продукция</a><span class="crumbs__sep">{icon('crumb')}</span><span>{cat['name']}</span>
      </nav>
      <span class="eyebrow">Продукция</span>
      <h1 class="{h1_class(cat)}">{cat.get('h1', cat['name'])}</h1>
      <p class="lead">{cat.get('lead', cat['desc'])}</p>{hero_facts(cat)}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="grid grid--2">
      <div class="reveal">
        <img class="pdetail__pic" src="assets/img/{cat['img']}" alt="{cat['name']}">
      </div>
      <div class="reveal">
        <h2 class="h2 h2--tight">Что это за упаковка</h2>
        <p class="lead" style="margin-top:18px">{cat['long']}</p>
        <div class="cta__acts" style="margin-top:22px">
          <a class="btn btn--primary" href="#price">Перейти к деталям {icon('down')}</a>
          <a class="btn btn--outline" href="produkciya.html">Вся продукция</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section section--paper" id="price">
  <div class="wrap">
    <div class="head reveal">
      <span class="eyebrow">{cat.get("table_eyebrow", "Прайс")}</span>
      <h2 class="h2">{cat.get("table_t", "Номенклатура и цены")}</h2>
      {'<p class="lead">Выберите позицию, нажмите «плюс» рядом с номером, укажите тираж — и добавьте в корзину.</p>' if cat["rows"] and row_tiers(cat["columns"], cat["rows"][0]) else ''}
    </div>
    {price_table(cat)}
  </div>
</section>

{extra_blocks(cat)}{text_sections(cat)}<section class="section section--tight">
  <div class="wrap">
    <div class="cta reveal">
      <div class="cta__in">
        <div>
          <h2 class="h2">Нужен нестандартный размер?</h2>
          <p class="lead" style="margin-top:16px">Изготовим по вашим габаритам и чертежу.
            Пришлите размеры товара — предложим конструкцию и посчитаем тираж.</p>
          <div class="cta__acts">
            <a class="btn btn--primary" href="korzina.html#zayavka">Оставить заявку {icon('arrow')}</a>
            <a class="btn btn--ghost" href="uslugi.html">Наши услуги</a>
          </div>
        </div>
        <div>
          <div class="ct" style="border-top:0"><div class="ct__ico">{icon('phone')}</div>
            <div><div class="ct__l">Отдел продаж</div><div class="ct__v">{phones_html()}</div></div></div>
          <div class="ct"><div class="ct__ico">{icon('mail')}</div>
            <div><div class="ct__l">E-mail</div><div class="ct__v"><a href="mailto:{EMAIL}">{EMAIL}</a></div></div></div>
        </div>
      </div>
    </div>
  </div>
</section>
'''
    return write_page(f"produkciya-{cat['slug']}.html",
                      f"{cat['name']} — цены и номенклатура | {LEGAL}",
                      f"{cat['desc']} Номенклатура, размеры и цены без НДС.",
                      body, active="produkciya.html")


def main():
    for name in PAGES:
        print(f"{name}: {render(name)} байт")
    for cat in CATEGORIES:
        print(f"produkciya-{cat['slug']}.html: {product_page(cat)} байт")


if __name__ == "__main__":
    main()
