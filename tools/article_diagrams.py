"""Схемы раздела «Полезное»: простая графика и отдельный текст HTML."""

from html import escape


def board(waves):
    """Разрез гофрокартона: на одну волну приходится два плоских края."""
    start = 23 if waves == 1 else 13
    return "".join(
        f'<path class="diagram__kraft" d="M16 {start + row * 20}h88v4H16Z"/>'
        for row in range(waves + 1)
    ) + "".join(
        f'<path d="M16 {start + row * 20 + 12}q5.5-14 11 0{"t11 0" * 7}"/>'
        for row in range(waves)
    )


BOX = '<path class="diagram__kraft" d="M19 23 57 10l44 12-1 27-40 14-41-16Z"/><path d="m19 23 41 12 41-13M60 35v28m-20-47 42 12"/>'
TRAY = '<path class="diagram__kraft" d="M12 35l28-12 68 12-7 19-64 8-20-10Z"/><path d="m12 35 29 12 67-12M41 47l-4 15"/>'
OPEN = '<path class="diagram__kraft" d="m16 28 38-13 48 13-3 24-44 12-37-13Z"/><path d="m16 28 39 14 47-14M55 42v22"/>'
SHEETS = '<path class="diagram__kraft" d="m17 30 40-17 48 17-44 16Z"/><path d="m17 39 44 16 44-16M17 47l44 16 44-16"/>'
DOCUMENT = '<path class="diagram__kraft" d="M41 9h29l14 14v38H41Z"/><path d="M70 9v14h14M50 33h24M50 42h24M50 51h16"/>'
PULP = '<path class="diagram__kraft" d="M22 36h76l-9 20H31Z"/><path d="M28 35q8-13 16 0 7-17 17 0 8-16 17 0 8-11 14 0M56 22l4-8m13 9 6-10m-36 9-4-10"/>'
GEAR = '<path class="diagram__kraft" d="M52 11h16l3 8 8 4 9-2 8 12-6 7-1 6 4 7-10 9-8-4-7 2-4 7H51l-4-8-8-4-8 2-8-12 6-7v-6l-4-7 10-9 8 4 6-2Z"/><circle cx="59" cy="39" r="11"/>'
PALLET = '<path class="diagram__kraft" d="M25 13h70v35H25Z"/><path d="M25 22h70M25 30h70M25 38h70M17 48h86v7H17ZM23 55v7h12v-7m19 0v7h12v-7m19 0v7h12v-7"/>'
LABEL = BOX + '<path fill="#fff9ef" d="m70 38 21-7v11l-21 7Z"/><path d="m75 39 11-4m-11 8 8-3"/>'
GRID = OPEN + '<path class="diagram__kraft" d="m36 22 41 13v15L36 35Zm39-1-40 14v15l40-14Z"/>'
CORNER = BOX + '<path class="diagram__edge" d="m51 33 9 3 10-3v25l-10 4-9-3Z"/><path d="M60 36v26"/>'
INSIDE = '<path class="diagram__kraft" d="M15 13h90v44H15Z"/><path fill="#fff9ef" d="M23 21h74v28H23Z"/><path class="diagram__edge" d="M43 26h34v18H43Z"/><path d="M28 35h10m44 0h10m-61-3-3 3 3 3m58-6 3 3-3 3"/>'
OUTSIDE = '<path class="diagram__kraft" d="M26 14h68v32H26Z"/><path d="M26 56h68m-68-5v10m68-10v10M15 14v32m-4-32h8m-8 32h8"/>'
SUN = '<circle class="diagram__kraft" cx="60" cy="33" r="12"/><path d="M60 10v7m0 32v7M37 33h7m32 0h7M44 17l5 5m22 22 5 5m0-32-5 5M49 44l-5 5M30 62l60-57"/>'
DRY = '<path class="diagram__kraft" d="M60 8c-7 12-19 23-19 34a19 19 0 0 0 38 0C79 31 67 20 60 8Z"/><path d="M35 63 85 9"/>'
FOOD = TRAY + '<circle class="diagram__edge" cx="46" cy="30" r="9"/><circle class="diagram__edge" cx="64" cy="27" r="9"/><circle class="diagram__edge" cx="80" cy="33" r="8"/>'
WRAPPED = OPEN + '<path fill="#fff9ef" d="m38 30 23-16 25 9v13L64 48l-26-9Z"/><path d="m38 30 26 9 22-16M64 39v9m-13-26 26 10"/>'
SIGN = '<circle class="diagram__kraft" cx="60" cy="34" r="24"/><path d="m48 34 8 8 16-17"/>'


# Строки под графикой остаются читаемыми при увеличении шрифта.
DIAGRAMS = {
    "3-ili-5-sloev": (
        "Из чего состоит лист", False, (
            ("Три слоя", "Два плоских слоя картона и один гофрированный.", board(1)),
            ("Пять слоёв", "Три плоских слоя картона и два гофрированных.", board(2)),
        ),
    ),
    "kak-rasschitat-razmer-koroba": (
        "Размер короба изнутри и снаружи", False, (
            ("Внутренний", "Расстояние между внутренними поверхностями стенок. В этот объём должны поместиться товар и защита.", INSIDE),
            ("Внешний", "Габарит собранного короба с учётом толщины стенок.", OUTSIDE),
        ),
    ),
    "gofroyashchik-ili-gofrolotok": (
        "Чем отличаются ящик и лоток", False, (
            ("Закрытый ящик", "Клапаны сверху закрывают содержимое.", BOX),
            ("Открытый лоток", "Сверху нет крышки, товар можно вынуть сразу.", TRAY),
        ),
    ),
    "upakovka-dlya-marketpleysov": (
        "Как проверить отправление", True, (
            ("Внутри", "При переноске товар должен оставаться на месте.", WRAPPED),
            ("Снаружи", "Закройте короб и убедитесь, что маркировка читается.", LABEL),
            ("Перед сдачей", "Взвесьте и измерьте короб вместе с товаром. Проверьте лимиты площадки.", SIGN),
        ),
    ),
    "pishchevaya-upakovka": (
        "Контакт продукта с картоном", False, (
            ("Прямой контакт", "Еда лежит на картоне. Для этого нужна упаковка, допущенная к контакту с пищей.", FOOD),
            ("Вторичная упаковка", "Продукт лежит в собственной упаковке. С коробом соприкасается только она.", WRAPPED),
        ),
    ),
    "kak-hranit-gofrotaru": (
        "Место для хранения", False, (
            ("Выше пола", "Поддон отделяет картон от пола.", PALLET),
            ("Сухое помещение", "Проверьте, что рядом нет источников сырости.", DRY),
            ("Без прямого солнца", "Поставьте поддон туда, где на него не попадают прямые лучи.", SUN),
        ),
    ),
    "individualnyy-zakaz-sroki": (
        "Этапы изготовления", True, (
            ("Заявка и чертёж", "По размеру и весу товара подбираем конструкцию и согласуем чертёж.", DOCUMENT),
            ("Подготовка оснастки", "При необходимости делаем штамп для высечки и формы для печати.", GEAR),
            ("Тираж и отгрузка", "Выпускаем партию и передаём на доставку или самовывоз.", PALLET),
        ),
    ),
    "pererabotka-gofrokartona": (
        "Как картон перерабатывают", True, (
            ("Сдача", "На приёме использованные короба отделяют от других материалов.", BOX),
            ("Переработка", "На производстве картон смешивают с водой, чтобы отделить волокна.", PULP),
            ("Новый лист", "Подготовленное волокно используют для новых листов.", SHEETS),
        ),
    ),
    "zashchitnye-ugolki-i-prokladki": (
        "Защита снаружи и внутри", False, (
            ("Уголок снаружи", "Под ленту на ребро короба или стопки коробов кладут уголок.", CORNER),
            ("Решётка внутри", "У каждого изделия внутри короба своя ячейка.", GRID),
        ),
    ),
}


def render_diagram(slug):
    title, ordered, items = DIAGRAMS[slug]
    tag = "ol" if ordered else "ul"
    cells = []
    for label, description, art in items:
        visual = (f'<svg viewBox="0 0 120 70" aria-hidden="true" focusable="false">'
                  f'{art}</svg><strong>{escape(label)}</strong>')
        connector = '<span class="diagram__arrow" aria-hidden="true">→</span>' if ordered and cells else ""
        cells.append(
            f'<li>{connector}{visual}<span class="diagram__detail">{escape(description)}</span></li>'
        )
    return (f'<figure class="diagram" aria-label="{escape(title)}">'
            f'<figcaption>{escape(title)}</figcaption>'
            f'<{tag} class="diagram__list" role="list">{"".join(cells)}</{tag}></figure>')
