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
    """Упаковка для маркетплейсов."""
    cx, cy, w, d, h = 238, 148, 120, 88, 96
    P = lambda X, Y, Z: pt(cx, cy, X, Y, Z)
    b, _ = iso_box(cx, cy, w, d, h, light=True)
    s = [shadow(cx, cy, w, d), b]
    # этикетка со штрихкодом на боковой грани
    lab = [P(14, d, h * .30), P(w - 14, d, h * .30), P(w - 14, d, h * .72), P(14, d, h * .72)]
    s.append(face(lab, "#F7F2E8", ".96"))
    for i in range(11):
        x = 20 + i * 8.4
        a, b2 = P(x, d, h * .36), P(x, d, h * .60)
        wdt = 2.2 if i % 3 else 4.2
        s.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b2[0]:.1f}" y2="{b2[1]:.1f}" '
                 f'stroke="{INK}" stroke-width="{wdt}" opacity=".8"/>')
    tape = [P(0, d * .44, h), P(w, d * .44, h), P(w, d * .56, h), P(0, d * .56, h)]
    s.append(face(tape, ACCENT, ".55"))
    return doc("Упаковка для маркетплейсов", "".join(s), bg="b")


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


ITEMS = {
    "pr-box4.svg": p_box4, "pr-box-open.svg": p_box_open, "pr-tray.svg": p_tray,
    "pr-sleeve.svg": p_sleeve, "pr-pizza.svg": p_pizza, "pr-container.svg": p_container,
    "pr-sheets.svg": p_sheets, "pr-market.svg": p_market, "pr-floor.svg": p_floor,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in ITEMS.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(fn())
        print(name)


if __name__ == "__main__":
    main()
