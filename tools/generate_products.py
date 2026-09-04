#!/usr/bin/env python3
"""
Иллюстрации карточек продукции «Арт-Пак Плюс».

Изометрия, одна палитра гофрокартона, один фон — карточки каталога
складываются в единый ряд. Запуск: python3 tools/generate_products.py
"""

import math
import os

W, H = 480, 360
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")

TOP, LEFT, RIGHT = "#E2B77E", "#C08947", "#9A6A31"
TOP2, LEFT2, RIGHT2 = "#EAC79A", "#CE9958", "#A9783C"
INNER, EDGE = "#8A5C29", "#7A4F22"
ACCENT, INK = "#E07B26", "#22303C"

COS, SIN = 0.866, 0.5


def pt(cx, cy, X, Y, Z):
    return cx + (X - Y) * COS, cy + (X + Y) * SIN - Z


def face(pts, fill, op=None):
    p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    o = f' opacity="{op}"' if op else ""
    return f'<polygon points="{p}" fill="{fill}"{o}/>'


def flute(pts, op=".22"):
    """Накладка «гофра» на грань."""
    p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return f'<polygon points="{p}" fill="url(#fl)" opacity="{op}"/>'


def iso_box(cx, cy, w, d, h, light=False, top=True, seam=True, z0=0):
    t, l, r = (TOP2, LEFT2, RIGHT2) if light else (TOP, LEFT, RIGHT)
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z + z0)
    s = []
    lf = [P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)]
    rf = [P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, 0, h)]
    tf = [P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)]
    s.append(face(lf, l)); s.append(flute(lf))
    s.append(face(rf, r)); s.append(flute(rf, ".30"))
    if top:
        s.append(face(tf, t))
        if seam:
            a, b = P(w / 2, 0, h), P(w / 2, d, h)
            s.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" '
                     f'stroke="{EDGE}" stroke-width="2.4" opacity=".55"/>')
    return "".join(s), (lf, rf, tf)


def shadow(cx, cy, w, d, z0=0):
    """Контактная тень под центром основания (в изометрии он смещён)."""
    gx, gy = pt(cx, cy, w / 2, d / 2, z0)
    return (f'<ellipse cx="{gx:.0f}" cy="{gy + 4:.0f}" rx="{(w + d) * 0.42:.0f}" '
            f'ry="{(w + d) * 0.14:.0f}" fill="#3A2A16" opacity=".17"/>')


def doc(title, body, bg="a"):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{title}">
  <title>{title}</title>
  <defs>
    <linearGradient id="bgA" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F6EEE1"/><stop offset="1" stop-color="#E2D2BB"/>
    </linearGradient>
    <linearGradient id="bgB" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#EFE7DA"/><stop offset="1" stop-color="#D8C6AC"/>
    </linearGradient>
    <pattern id="fl" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="none"/><rect width="2.4" height="6" fill="#000" opacity=".5"/>
    </pattern>
    <radialGradient id="lt" cx=".42" cy=".3" r=".7">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="{W}" height="{H}" fill="url(#bg{bg.upper()})"/>
  <rect width="{W}" height="{H}" fill="url(#lt)"/>
{body}
</svg>
'''


# --------------------------------------------------------------- изделия
def p_box4():
    """Четырёхклапанный короб (закрытый)."""
    cx, cy, w, d, h = 240, 150, 118, 86, 92
    b, _ = iso_box(cx, cy, w, d, h)
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    tape = [P(0, d * .42, h), P(w, d * .42, h), P(w, d * .58, h), P(0, d * .58, h)]
    return doc("Четырёхклапанный гофрокороб", shadow(cx, cy, w, d) + b + face(tape, "#D7C7A4", ".85"))


def p_box_open():
    """Короб с открытыми клапанами."""
    cx, cy, w, d, h = 240, 140, 116, 86, 84
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    b, _ = iso_box(cx, cy, w, d, h, top=False)
    inner = [P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)]
    s = [shadow(cx, cy, w, d), b, face(inner, INNER)]
    # четыре откинутых клапана
    s.append(face([P(0, 0, h), P(w, 0, h), P(w, -d * .52, h + 34), P(0, -d * .52, h + 34)], TOP2))
    s.append(face([P(0, d, h), P(w, d, h), P(w, d * 1.52, h + 34), P(0, d * 1.52, h + 34)], LEFT2))
    s.append(face([P(0, 0, h), P(0, d, h), P(-w * .5, d, h + 30), P(-w * .5, 0, h + 30)], TOP))
    s.append(face([P(w, 0, h), P(w, d, h), P(w * 1.5, d, h + 30), P(w * 1.5, 0, h + 30)], RIGHT2))
    return doc("Гофрокороб с открытыми клапанами", "".join(s))


def p_tray():
    """Гофролоток."""
    cx, cy, w, d, h = 240, 168, 132, 96, 42
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    b, _ = iso_box(cx, cy, w, d, h, top=False, light=True)
    inner = [P(6, 6, h), P(w - 6, 6, h), P(w - 6, d - 6, h), P(6, d - 6, h)]
    rim = [P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)]
    return doc("Гофролоток", shadow(cx, cy, w, d) + b + face(rim, TOP2) + face(inner, INNER))


def p_sleeve():
    """Обечайка."""
    cx, cy, w, d, h = 240, 158, 126, 92, 76
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    s = [shadow(cx, cy, w, d)]
    s.append(face([P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)], LEFT))
    s.append(flute([P(0, d, 0), P(w, d, 0), P(w, d, h), P(0, d, h)]))
    s.append(face([P(w, 0, 0), P(w, d, 0), P(w, d, h), P(w, 0, h)], RIGHT))
    s.append(face([P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)], TOP2))
    s.append(face([P(9, 9, h), P(w - 9, 9, h), P(w - 9, d - 9, h), P(9, d - 9, h)], INNER))
    s.append(face([P(9, 9, h - 30), P(w - 9, 9, h - 30), P(w - 9, d - 9, h - 30), P(9, d - 9, h - 30)], "#5F3F18"))
    s.append(face([P(0, 0, h), P(w, 0, h), P(w, 0, h - 9), P(0, 0, h - 9)], TOP2, ".9"))
    return doc("Обечайка", "".join(s))


def p_pizza():
    """Коробка для пиццы."""
    cx, cy, w, d, h = 236, 176, 140, 140, 26
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    b, _ = iso_box(cx, cy, w, d, h, light=True, seam=False)
    s = [shadow(cx, cy, w, d), b]
    # приоткрытая крышка
    lid = [P(0, 0, h), P(w, 0, h), P(w + 22, -46, h + 78), P(-22, -46, h + 78)]
    s.append(face(lid, TOP))
    s.append(flute(lid, ".16"))
    s.append(f'<circle cx="{cx:.0f}" cy="{cy - 6:.0f}" r="34" fill="{ACCENT}" opacity=".22"/>')
    return doc("Коробка для пиццы", "".join(s))


def p_container():
    """Гофроконтейнер на деревянном поддоне."""
    cx, cy, w, d, h, ph = 236, 132, 142, 106, 128, 18
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    s = [shadow(cx, cy, w, d)]
    # поддон
    s.append(face([P(-10, d + 10, 0), P(w + 10, d + 10, 0), P(w + 10, d + 10, ph), P(-10, d + 10, ph)], "#5C3F1C"))
    s.append(face([P(w + 10, -10, 0), P(w + 10, d + 10, 0), P(w + 10, d + 10, ph), P(w + 10, -10, ph)], "#4A3216"))
    s.append(face([P(-10, -10, ph), P(w + 10, -10, ph), P(w + 10, d + 10, ph), P(-10, d + 10, ph)], "#7A5726"))
    # короб на поддоне
    b, _ = iso_box(cx, cy, w, d, h, z0=ph)
    s.append(b)
    strap = [P(w * .30, -0.1, ph), P(w * .38, -0.1, ph), P(w * .38, -0.1, ph + h), P(w * .30, -0.1, ph + h)]
    s.append(face(strap, "#F0E4CB", ".7"))
    return doc("Гофроконтейнер на поддоне", "".join(s), bg="b")


def p_sheets():
    """Прокладки и решётки."""
    cx, cy = 240, 190
    s = [shadow(cx, cy - 30, 130, 96)]
    for i in range(5):
        z = i * 13
        w, d = 132, 96
        P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
        top = [P(0, 0, z + 8), P(w, 0, z + 8), P(w, d, z + 8), P(0, d, z + 8)]
        s.append(face([P(0, d, z), P(w, d, z), P(w, d, z + 8), P(0, d, z + 8)], LEFT if i % 2 else LEFT2))
        s.append(face([P(w, 0, z), P(w, d, z), P(w, d, z + 8), P(w, 0, z + 8)], RIGHT))
        s.append(face(top, TOP2 if i % 2 else TOP))
    # прорези решётки на верхнем листе
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    for k in (0.28, 0.5, 0.72):
        a, b2 = P(132 * k, 14, 60), P(132 * k, 82, 60)
        s.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b2[0]:.1f}" y2="{b2[1]:.1f}" '
                 f'stroke="{EDGE}" stroke-width="5" opacity=".55" stroke-linecap="round"/>')
    return doc("Прокладки и решётки из гофрокартона", "".join(s))


def p_market():
    """Упаковка для маркетплейсов: два формата с наклейками WB и Ozon."""
    def sticker(cx, cy, w, h, rot, bg, text, fs):
        """Наклейка службы доставки: цветной ярлык под углом, как на реальной посылке."""
        rx = h * .24
        return (f'<g transform="rotate({rot:.1f} {cx:.1f} {cy:.1f})">'
                f'<ellipse cx="{cx:.1f}" cy="{cy + h * .64:.1f}" rx="{w * .44:.1f}" ry="{h * .22:.1f}" '
                f'fill="#2A1A08" opacity=".16"/>'
                f'<rect x="{cx - w / 2:.1f}" y="{cy - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}" '
                f'rx="{rx:.1f}" fill="{bg}"/>'
                f'<rect x="{cx - w / 2:.1f}" y="{cy - h / 2:.1f}" width="{w:.1f}" height="{h * .34:.1f}" '
                f'rx="{rx:.1f}" fill="#fff" opacity=".18"/>'
                f'<text x="{cx:.1f}" y="{cy + fs * .34:.1f}" text-anchor="middle" '
                f'font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="{fs}" '
                f'letter-spacing=".5" fill="#fff">{text}</text></g>')

    s = []

    # короб побольше — с наклейкой Wildberries
    bx, by, bw, bd, bh = 168, 150, 128, 92, 118
    Pb = lambda X, Y, Z: pt(bx, by, X, Y, Z)
    s.append(shadow(bx, by, bw, bd))
    box_b, _ = iso_box(bx, by, bw, bd, bh, light=False)
    s.append(box_b)
    bsx, bsy = Pb(bw * .60, bd * .12, bh)
    s.append(sticker(bsx, bsy - 6, 66, 30, -16, "#7C1FD6", "WB", 18))

    # короб поменьше — с наклейкой Ozon
    sx, sy, sw, sd, sh = 358, 224, 82, 60, 72
    Ps = lambda X, Y, Z: pt(sx, sy, X, Y, Z)
    s.append(shadow(sx, sy, sw, sd))
    box_s, _ = iso_box(sx, sy, sw, sd, sh, light=True)
    s.append(box_s)
    ssx, ssy = Ps(sw * .58, sd * .14, sh)
    s.append(sticker(ssx, ssy - 6, 62, 24, -14, "#0468FF", "OZON", 12))

    return doc("Упаковка для маркетплейсов: короба под отправку Wildberries и Ozon", "".join(s), bg="b")


def p_floor():
    """Картон для защиты пола: листы, уложенные внахлёст."""
    cx, cy = 240, 150
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    s = [f'<ellipse cx="{cx:.0f}" cy="{cy + 96:.0f}" rx="185" ry="56" fill="#3A2A16" opacity=".12"/>']
    # нижний лист
    a = [P(-30, -10, 0), P(160, -10, 0), P(160, 130, 0), P(-30, 130, 0)]
    s.append(face(a, LEFT2)); s.append(flute(a, ".14"))
    # верхний лист внахлёст
    b = [P(20, 40, 9), P(210, 40, 9), P(210, 180, 9), P(20, 180, 9)]
    s.append(face([P(20, 40, 0), P(210, 40, 0), P(210, 40, 9), P(20, 40, 9)], RIGHT2))
    s.append(face([P(20, 40, 0), P(20, 180, 0), P(20, 180, 9), P(20, 40, 9)], RIGHT))
    s.append(face(b, TOP2)); s.append(flute(b, ".16"))
    # приподнятый угол верхнего листа
    s.append(face([P(210, 180, 9), P(210, 120, 9), P(238, 96, 46), P(244, 158, 46)], TOP))
    s.append(face([P(210, 180, 9), P(244, 158, 46), P(238, 96, 46), P(210, 120, 9)], INNER, ".35"))
    # проклеенный стык
    s.append(face([P(20, 40, 9.6), P(210, 40, 9.6), P(210, 58, 9.6), P(20, 58, 9.6)], ACCENT, ".45"))
    return doc("Картон для защиты пола", "".join(s))


# ------------------------------------------------------------ гофрокартон
# Виды картона показываем срезом: по длинной грани видна волна гофры,
# по числу слоёв сразу читается двух-, трёх- или пятислойный лист.
LINER, LINER_D = "#E4BC84", "#C79457"
FLUTE_BG, FLUTE_LN = "#F2E2C7", "#B9884A"
PAPER_W = "#F1EFE9"


def dark(hexc, k=.82):
    """Тот же цвет, но темнее — для боковой грани."""
    r, g, b = (int(hexc[i:i + 2], 16) for i in (1, 3, 5))
    return "#%02X%02X%02X" % (int(r * k), int(g * k), int(b * k))


def board_body(cx, cy, w, d, stack, top="flat", period=17):
    """Лист картона в изометрии: срез со слоями + верхняя поверхность.

    stack — слои снизу вверх: (вид, высота, цвет), вид = liner | flute.
    top   — вид сверху: flat (лайнер), ridge (открытая гофра), chrome (мел)."""
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    H = sum(h for _, h, _ in stack)
    s = [shadow(cx, cy, w, d)]
    z = 0.0
    for kind, h, fill in stack:
        z1, z2 = z, z + h
        lf = [P(0, d, z1), P(w, d, z1), P(w, d, z2), P(0, d, z2)]
        rf = [P(w, 0, z1), P(w, d, z1), P(w, d, z2), P(w, 0, z2)]
        s.append(face(lf, fill))
        s.append(face(rf, dark(fill)))
        if kind == "flute":
            zm, amp = (z1 + z2) / 2, max(h / 2 - 1.4, 1.2)
            pts, x = [], 0.0
            while x <= w:
                pts.append(P(x, d, zm + amp * math.sin(2 * math.pi * x / period)))
                x += 1.5
            dpth = " ".join(("M" if i == 0 else "L") + f"{a:.1f} {b:.1f}"
                            for i, (a, b) in enumerate(pts))
            s.append(f'<path d="{dpth}" fill="none" stroke="{FLUTE_LN}" '
                     f'stroke-width="2.1" stroke-linejoin="round" opacity=".9"/>')
            # на торце гофра видна как ряд склеек
            for k in range(1, 5):
                a, b = P(w, d * k / 5, z1 + .8), P(w, d * k / 5, z2 - .8)
                s.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" '
                         f'y2="{b[1]:.1f}" stroke="{FLUTE_LN}" stroke-width="1.4" opacity=".5"/>')
        z = z2

    tf = [P(0, 0, H), P(w, 0, H), P(w, d, H), P(0, d, H)]
    if top == "ridge":                       # двухслойный: гофра открыта сверху
        x = 0.0
        while x < w:
            a = [P(x, 0, H), P(min(x + period * .5, w), 0, H),
                 P(min(x + period * .5, w), d, H), P(x, d, H)]
            b = [P(min(x + period * .5, w), 0, H), P(min(x + period, w), 0, H),
                 P(min(x + period, w), d, H), P(min(x + period * .5, w), d, H)]
            s.append(face(a, "#EFD2A4")); s.append(face(b, "#D0A469"))
            x += period
    elif top == "chrome":                    # хром-эрзац: мелованная поверхность
        s.append(face(tf, PAPER_W))
        s.append(face([P(0, 0, H), P(w * .55, 0, H), P(w * .25, d, H), P(0, d, H)],
                      "#FFFFFF", ".55"))
    else:
        s.append(face(tf, stack[-1][2]))
        s.append(flute(tf, ".12"))
    return "".join(s), H


STACK3 = [("liner", 3.4, LINER), ("flute", 11, FLUTE_BG), ("liner", 3.4, LINER)]
STACK5 = [("liner", 3.2, LINER), ("flute", 9, FLUTE_BG), ("liner", 3.2, LINER),
          ("flute", 9, FLUTE_BG), ("liner", 3.2, LINER)]
STACK2 = [("liner", 3.4, LINER), ("flute", 11, FLUTE_BG)]
STACKM = [("liner", 2.4, PAPER_W), ("flute", 4.5, "#F7F5F0"), ("liner", 2.4, PAPER_W)]
STACKC = [("liner", 3.0, "#E9E5DC"), ("liner", 3.0, PAPER_W)]


def p_kb2():
    b, _ = board_body(240, 176, 210, 148, STACK2, top="ridge")
    return doc("Двухслойный гофрокартон", b)


def p_kb3():
    b, _ = board_body(240, 176, 210, 148, STACK3)
    return doc("Трёхслойный гофрокартон", b)


def p_kb5():
    b, _ = board_body(240, 172, 210, 148, STACK5)
    return doc("Пятислойный гофрокартон", b)


def p_kbmicro():
    b, _ = board_body(240, 180, 210, 148, STACKM, period=9)
    return doc("Микрогофрокартон", b, bg="b")


def p_kbchrome():
    b, _ = board_body(240, 178, 210, 148, STACKC, top="chrome")
    return doc("Хром-эрзац", b, bg="b")


def p_board():
    """Карточка каталога: три листа разной слойности стопкой со сдвигом."""
    s = []
    for (cx, cy, st, tp) in ((208, 232, STACK5, "flat"),
                             (240, 186, STACK3, "flat"),
                             (272, 140, STACK2, "ridge")):
        b, _ = board_body(cx, cy, 168, 118, st, top=tp)
        s.append(b)
    return doc("Гофрокартон: двух-, трёх- и пятислойный лист", "".join(s))


ITEMS = {
    "pr-box4.svg": p_box4, "pr-box-open.svg": p_box_open, "pr-tray.svg": p_tray,
    "pr-sleeve.svg": p_sleeve, "pr-pizza.svg": p_pizza, "pr-container.svg": p_container,
    "pr-sheets.svg": p_sheets, "pr-market.svg": p_market, "pr-floor.svg": p_floor,
    "pr-board.svg": p_board, "pr-kb2.svg": p_kb2, "pr-kb3.svg": p_kb3,
    "pr-kb5.svg": p_kb5, "pr-kbmicro.svg": p_kbmicro, "pr-kbchrome.svg": p_kbchrome,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in ITEMS.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(fn())
        print(name)


if __name__ == "__main__":
    main()
