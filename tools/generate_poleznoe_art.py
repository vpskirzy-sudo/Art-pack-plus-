#!/usr/bin/env python3
"""
Схемы для статей раздела «Полезное».

Три простые векторные схемы в тёмной гамме сайта (фон — --ink #0B1118,
акцент — --accent #E07B26, крафтовые тона те же, что у слайдов):

    pl-sloi.svg           — «сэндвич» гофрокартона: лайнер, флютинг, лайнер
    pl-3-5.svg            — три слоя против пяти
    pl-yashchik-lotok.svg — гофроящик против гофролотка

Запуск:  python3 tools/generate_poleznoe_art.py
"""

import os

W, H = 1200, 750
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")

INK, INK_2, LINE = "#0B1118", "#121C26", "#26333F"
ACCENT, ACCENT_2 = "#E07B26", "#F49B3F"
BLUE = "#2E8AD6"
LINER, LINER_DK = "#D9A968", "#B9803F"
FLUTE = "#C89355"
TXT, TXT_DIM = "#F3EFE9", "#9FB0BF"
FF = "Manrope, 'Segoe UI', system-ui, sans-serif"


def head(title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
            f'width="{W}" height="{H}" role="img" aria-label="{title}">'
            f'<title>{title}</title>'
            f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
            f'<stop offset="0" stop-color="{INK_2}"/><stop offset="1" stop-color="{INK}"/>'
            f'</linearGradient>'
            f'<radialGradient id="glow" cx="0.82" cy="0.1" r="0.7">'
            f'<stop offset="0" stop-color="{ACCENT}" stop-opacity=".22"/>'
            f'<stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/></radialGradient>'
            f'<radialGradient id="glow2" cx="0.06" cy="1" r="0.7">'
            f'<stop offset="0" stop-color="{BLUE}" stop-opacity=".20"/>'
            f'<stop offset="1" stop-color="{BLUE}" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="{W}" height="{H}" fill="url(#bg)"/>'
            f'<rect width="{W}" height="{H}" fill="url(#glow)"/>'
            f'<rect width="{W}" height="{H}" fill="url(#glow2)"/>')


def txt(x, y, s, size=20, fill=TXT, weight=600, anchor="start"):
    return (f'<text x="{x:.0f}" y="{y:.0f}" font-family="{FF}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{s}</text>')


def title_block(t, sub):
    return (txt(70, 92, t, 34, TXT, 800)
            + txt(70, 128, sub, 18, TXT_DIM, 500)
            + f'<rect x="70" y="40" width="52" height="4" rx="2" fill="{ACCENT}"/>')


def liner(x, y, w, h=16):
    """Плоский слой картона (лайнер)."""
    return (f'<rect x="{x}" y="{y:.0f}" width="{w}" height="{h}" rx="3" fill="{LINER}"/>'
            f'<rect x="{x}" y="{y + h - 4:.0f}" width="{w}" height="4" rx="2" '
            f'fill="{LINER_DK}" opacity=".55"/>')


def flute(x, y, w, h=42, step=56):
    """Волна гофры между двумя лайнерами.

    Шаг подгоняется под ширину: волна должна уложиться целым числом дуг,
    иначе последняя обрывается за краем лайнера.
    """
    n = max(2, round(w / step))
    step = w / n
    d, up = [f"M{x} {y + h:.0f}"], True
    for i in range(n):
        cx = x + i * step
        nx = cx + step
        d.append(f"C{cx + step * .35:.1f} {y + (h if up else 0):.0f} "
                 f"{cx + step * .65:.1f} {y + (0 if up else h):.0f} "
                 f"{nx:.1f} {y + (0 if up else h):.0f}")
        up = not up
    return (f'<path d="{" ".join(d)}" fill="none" stroke="{FLUTE}" stroke-width="7" '
            f'stroke-linecap="round"/>')


def band(lines, y=612, x=70, w=1060):
    """Нижняя плашка с выводом: одна-две строки внутри акцентной рамки."""
    h = 54 + 30 * (len(lines) - 1)
    out = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" '
           f'fill="{ACCENT}" opacity=".10" stroke="{ACCENT}" stroke-opacity=".35"/>']
    for i, line in enumerate(lines):
        out.append(txt(x + 30, y + 35 + 30 * i, line, 18, TXT, 600))
    return "".join(out)


def leader(x1, y1, x2, y2, label, anchor="start", color=ACCENT_2):
    """Выноска с подписью."""
    return (f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{color}" stroke-width="2" '
            f'opacity=".8"/><circle cx="{x1}" cy="{y1}" r="4.5" fill="{color}"/>'
            + txt(x2 + (10 if anchor == "start" else -10), y2 + 6, label, 19, TXT, 700, anchor))


# ---------------------------------------------------------------- схема 1
def art_sloi():
    """«Сэндвич» трёхслойного гофрокартона с подписями слоёв."""
    x, w, y = 360, 520, 330
    s = [head("Строение гофрокартона: лайнер, флютинг, лайнер"),
         title_block("Из чего состоит гофрокартон",
                     "Трёхслойный лист: две плоские стенки и волна между ними")]
    s.append(f'<rect x="{x - 34}" y="{y - 92}" width="{w + 68}" height="152" rx="18" '
             f'fill="#ffffff" opacity=".04" stroke="{LINE}"/>')
    s.append(liner(x, y - 60, w))                 # верхний лайнер
    s.append(flute(x, y - 42, w))                 # волна
    s.append(liner(x, y + 2, w))                  # нижний лайнер
    # Выноски: подпись слева, пояснение справа — на одной высоте с выноской.
    for ly, cy, name, note in [(y - 52, y - 130, "Лайнер", "держит нагрузку"),
                               (y - 20, y + 4,   "Флютинг (волна)", "даёт жёсткость"),
                               (y + 10, y + 138, "Лайнер", "держит нагрузку")]:
        s.append(leader(x + 70, ly, 320, cy, name, "end"))
    s.append(txt(x + w + 44, y - 124, "Плоские слои держат", 18, TXT_DIM, 500))
    s.append(txt(x + w + 44, y - 98, "нагрузку и печать", 18, TXT_DIM, 500))
    s.append(txt(x + w + 44, y + 10, "Волна даёт жёсткость", 18, TXT_DIM, 500))
    s.append(txt(x + w + 44, y + 36, "и гасит удар", 18, TXT_DIM, 500))
    s.append(band(["Т — трёхслойный, П — пятислойный.",
                   "Первая цифра — число плоских слоёв, вторая — прочность сырья."]))
    return "".join(s) + "</svg>"


# ---------------------------------------------------------------- схема 2
def art_3_5():
    """Трёхслойный лист против пятислойного: волны и лайнеры в разрезе."""
    s = [head("Трёхслойный и пятислойный гофрокартон в разрезе"),
         title_block("Три слоя и пять слоёв",
                     "Пятислойный лист — это тот же «сэндвич», собранный дважды")]
    for i, (cx, name, note) in enumerate(
            [(90, "3 слоя", "лайнер + волна + лайнер"),
             (640, "5 слоёв", "лайнер + волна + лайнер + волна + лайнер")]):
        w = 470
        s.append(f'<rect x="{cx}" y="230" width="{w}" height="330" rx="18" '
                 f'fill="#ffffff" opacity=".04" stroke="{LINE}"/>')
        s.append(txt(cx + 30, 290, name, 26, ACCENT_2, 800))
        s.append(txt(cx + 30, 322, note, 17, TXT_DIM, 500))
        y = 380
        if i == 0:
            s.append(liner(cx + 30, y, w - 60))
            s.append(flute(cx + 30, y + 18, w - 60))
            s.append(liner(cx + 30, y + 62, w - 60))
        else:
            s.append(liner(cx + 30, y - 30, w - 60))
            s.append(flute(cx + 30, y - 12, w - 60))
            s.append(liner(cx + 30, y + 32, w - 60))
            s.append(flute(cx + 30, y + 50, w - 60))
            s.append(liner(cx + 30, y + 94, w - 60))
        s.append(txt(cx + 30, 530,
                     "Товар обычного веса" if i == 0 else "Тяжёлый, хрупкий, дальняя перевозка",
                     18, TXT, 600))
    s.append(band(["Больше слоёв — больше жёсткость и выше цена.",
                   "Под лёгкий товар переплачивать не нужно."], y=612, x=90, w=1020))
    return "".join(s) + "</svg>"


# ---------------------------------------------------------------- схема 3
def art_yashchik_lotok():
    """Гофроящик с клапанами против открытого лотка с низкими бортами."""
    s = [head("Гофроящик с клапанами и открытый гофролоток"),
         title_block("Ящик и лоток", "Закрытый короб для перевозки — и открытая тара для выкладки")]

    def box(x, y, w, h, d=70):
        """Короб в изометрии: передняя стенка, бок и верх."""
        return (f'<path d="M{x} {y} h{w} v{h} h-{w} z" fill="{LINER}"/>'
                f'<path d="M{x + w} {y} l{d} -{d * .5:.0f} v{h} l-{d} {d * .5:.0f} z" '
                f'fill="{LINER_DK}"/>'
                f'<path d="M{x} {y} l{d} -{d * .5:.0f} h{w} l-{d} {d * .5:.0f} z" fill="{FLUTE}"/>')

    # Ящик с открытыми клапанами: дальний клапан отогнут назад, ближний —
    # на зрителя, поэтому он рисуется уже поверх короба.
    s.append(txt(150, 250, "Гофроящик", 26, ACCENT_2, 800))
    s.append(f'<path d="M220 365 H520 L556 287 H256 Z" fill="{FLUTE}" opacity=".9"/>')
    s.append(box(150, 400, 300, 160))
    s.append(f'<path d="M150 400 H450 L414 318 H114 Z" fill="{LINER_DK}" opacity=".92"/>')
    s.append(txt(150, 612, "Четыре клапана сверху и снизу — короб закрывается,", 18, TXT_DIM, 500))
    s.append(txt(150, 638, "штабелируется и едет закрытым", 18, TXT_DIM, 500))

    # лоток: та же ширина, низкий борт и открытый верх
    s.append(txt(700, 250, "Гофролоток", 26, ACCENT_2, 800))
    s.append(box(700, 490, 300, 70))
    s.append(f'<path d="M700 490 l70 -35 h300 l-70 35 z" fill="{INK}" opacity=".9"/>')
    s.append(f'<path d="M700 490 l70 -35 h300" fill="none" stroke="{LINER}" stroke-width="4"/>')
    s.append(txt(700, 612, "Открытый верх и низкие борта — товар видно,", 18, TXT_DIM, 500))
    s.append(txt(700, 638, "его легко достать и выложить на полку", 18, TXT_DIM, 500))

    s.append(f'<path d="M600 240 V648" stroke="{LINE}" stroke-width="2" opacity=".7"/>')
    return "".join(s) + "</svg>"


def main():
    for name, body in [("pl-sloi.svg", art_sloi()),
                       ("pl-3-5.svg", art_3_5()),
                       ("pl-yashchik-lotok.svg", art_yashchik_lotok())]:
        path = os.path.join(OUT, name)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(body)
        print(f"{name}: {len(body)} байт")


if __name__ == "__main__":
    main()
