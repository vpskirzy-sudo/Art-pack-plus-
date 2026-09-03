#!/usr/bin/env python3
"""
Генератор фоновых иллюстраций слайдера «Арт-Пак Плюс».

Все слайды строятся на одной перспективной сетке (одна точка схода, один
коэффициент глубины) и на одной палитре — поэтому серия выглядит цельной.
Композиция смещена вправо: левая треть кадра остаётся под заголовок.

Запуск:  python3 tools/generate_art.py
"""

import os

W, H = 1600, 900
VPX, VPY = 790, 360          # точка схода (линия горизонта = высота камеры)
EYE = 175                    # высота камеры над полом, см
H_CEIL, H_RACK, H_BELT = 760, 430, 85   # мировые высоты объектов, см
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "img")

BLUE_LT, BLUE, BLUE_DK, BLUE_XD = "#2F8CD8", "#1568B6", "#0D4A85", "#08355F"
K_TOP, K_FRONT, K_SIDE = "#D9A968", "#B9803F", "#8E5C27"
K_TOP2, K_FRONT2, K_SIDE2 = "#E4BA80", "#C89355", "#9C6C32"
ACCENT, ACCENT_2 = "#E07B26", "#F49B3F"
STEEL_XD, STEEL_DK, STEEL, STEEL_LT = "#141E28", "#22303C", "#3B4C5A", "#63788A"


# ---------------------------------------------------------------- геометрия
def sx(offset, f):
    """Экранный X для мирового бокового смещения offset на глубине f."""
    return VPX + offset * f


def sy(height, f):
    """Экранный Y для мировой высоты height (0 = пол) на глубине f.

    f = фокус / расстояние: объект выше камеры уходит вверх от горизонта,
    ниже — вниз. Поэтому всё, что выше EYE, обязано иметь height > EYE.
    """
    return VPY + (EYE - height) * f


def poly(pts, fill, opacity=None):
    p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    op = f' opacity="{opacity}"' if opacity is not None else ""
    return f'<polygon points="{p}" fill="{fill}"{op}/>'


def rect(x, y, w, h, fill, opacity=None, rx=None):
    op = f' opacity="{opacity}"' if opacity is not None else ""
    r = f' rx="{rx}"' if rx else ""
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}"{op}{r}/>'


def to_vp(x, y, k):
    return x + (VPX - x) * k, y + (VPY - y) * k


def box(cx, bottom, w, h, k, light=False, printed=False):
    """Гофрокороб: боковина, крышка, фасад, линия клапанов, тень."""
    c_top, c_front, c_side = (K_TOP2, K_FRONT2, K_SIDE2) if light else (K_TOP, K_FRONT, K_SIDE)
    top = bottom - h
    x1, x2 = cx - w / 2, cx + w / 2
    A, B, C, D = (x1, top), (x2, top), (x2, bottom), (x1, bottom)
    Ap, Bp, Cp, Dp = to_vp(*A, k), to_vp(*B, k), to_vp(*C, k), to_vp(*D, k)
    s = [f'<ellipse cx="{cx:.1f}" cy="{bottom:.1f}" rx="{w*0.56:.1f}" ry="{h*0.07:.1f}" fill="#0A1119" opacity=".22"/>']
    if cx < VPX:
        s.append(poly([B, Bp, Cp, C], c_side))
    else:
        s.append(poly([A, Ap, Dp, D], c_side))
    s.append(poly([A, B, Bp, Ap], c_top))
    s.append(poly([A, B, C, D], c_front))
    # шов клапанов на крышке
    m = ((Ap[0] + Bp[0]) / 2, (Ap[1] + Bp[1]) / 2)
    s.append(f'<line x1="{cx:.1f}" y1="{top:.1f}" x2="{m[0]:.1f}" y2="{m[1]:.1f}" '
             f'stroke="#7E5220" stroke-width="{max(.8, w*.012):.1f}" opacity=".5"/>')
    # рёбра гофры на фасаде
    s.append(f'<rect x="{x1:.1f}" y="{top:.1f}" width="{w:.1f}" height="{h:.1f}" fill="url(#flute)" opacity=".30"/>')
    # блик сверху фасада
    s.append(rect(x1, top, w, h * 0.16, "#FFFFFF", .10))
    if printed and w > 60:
        s.append(rect(cx - w * .30, top + h * .30, w * .42, max(3, h * .10), ACCENT, .85, 2))
        s.append(rect(cx - w * .30, top + h * .50, w * .26, max(2, h * .07), "#2A3B49", .6, 2))
    return "".join(s)


# ---------------------------------------------------------------- слои сцены
def defs():
    return f'''
  <linearGradient id="air" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#16232F"/><stop offset=".24" stop-color="#354B5E"/>
    <stop offset=".42" stop-color="#8CA3B5"/><stop offset=".52" stop-color="#DCE6EE"/>
    <stop offset="1" stop-color="#9DB0BE"/>
  </linearGradient>
  <linearGradient id="conc" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8593A0"/><stop offset=".5" stop-color="#59667A"/>
    <stop offset="1" stop-color="#2C3742"/>
  </linearGradient>
  <linearGradient id="belt" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7C8B99"/><stop offset="1" stop-color="#39434E"/>
  </linearGradient>
  <linearGradient id="doorL" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{BLUE_XD}"/><stop offset=".72" stop-color="{BLUE_DK}"/>
    <stop offset="1" stop-color="{BLUE}"/>
  </linearGradient>
  <linearGradient id="doorR" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="{BLUE}"/><stop offset=".3" stop-color="{BLUE_DK}"/>
    <stop offset="1" stop-color="{BLUE_XD}"/>
  </linearGradient>
  <linearGradient id="lintel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="{BLUE}"/><stop offset="1" stop-color="{BLUE_XD}"/>
  </linearGradient>
  <pattern id="rib" width="46" height="40" patternUnits="userSpaceOnUse">
    <rect width="46" height="40" fill="none"/>
    <rect x="0"  width="15" height="40" fill="#000" opacity=".30"/>
    <rect x="15" width="4"  height="40" fill="#000" opacity=".14"/>
    <rect x="27" width="7"  height="40" fill="#FFF" opacity=".15"/>
    <rect x="34" width="3"  height="40" fill="#FFF" opacity=".07"/>
  </pattern>
  <pattern id="flute" width="7" height="7" patternUnits="userSpaceOnUse">
    <rect width="7" height="7" fill="none"/>
    <rect x="0" width="3" height="7" fill="#000" opacity=".18"/>
  </pattern>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#FFF6E8" stop-opacity=".95"/>
    <stop offset=".55" stop-color="#FFE3BC" stop-opacity=".35"/>
    <stop offset="1" stop-color="#FFD9A8" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="warm" cx=".52" cy=".42" r=".62">
    <stop offset="0" stop-color="{ACCENT}" stop-opacity=".34"/>
    <stop offset=".62" stop-color="{ACCENT}" stop-opacity=".08"/>
    <stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#050A0F" stop-opacity=".44"/>
    <stop offset=".30" stop-color="#050A0F" stop-opacity="0"/>
    <stop offset=".70" stop-color="#050A0F" stop-opacity=".08"/>
    <stop offset="1" stop-color="#050A0F" stop-opacity=".58"/>
  </linearGradient>
  <linearGradient id="vigx" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#050A0F" stop-opacity=".55"/>
    <stop offset=".42" stop-color="#050A0F" stop-opacity="0"/>
    <stop offset="1" stop-color="#050A0F" stop-opacity=".38"/>
  </linearGradient>
'''


def hall(racks=True, beams=True):
    """Общий интерьер цеха: воздух, бетонный пол, дальний свет, фермы, стеллажи."""
    s = [rect(0, 0, W, H, "url(#air)")]
    s.append(poly([(0, VPY), (W, VPY), (W, H), (0, H)], "url(#conc)"))
    # дальний светящийся проём — источник света всей сцены
    s.append(f'<ellipse cx="{VPX}" cy="{VPY - 26}" rx="250" ry="160" fill="url(#glow)"/>')
    s.append(rect(VPX - 96, sy(H_RACK, .30), 192, sy(0, .30) - sy(H_RACK, .30), "#F6EEE0", .5))
    # фермы перекрытия
    if beams:
        for i in range(8):
            f = 0.055 + (0.62 - 0.055) * (i / 7) ** 1.9
            y, hw, th = sy(H_CEIL, f), 640 * f, max(2, 26 * f)
            s.append(rect(VPX - hw, y, hw * 2, th, STEEL_XD, min(.9, .30 + .6 * f)))
            s.append(rect(VPX - 170 * f, y + th, 340 * f, max(2, 14 * f), "#FFF6E4", min(.95, .40 + .5 * f)))
    # стеллажи по бокам
    if racks:
        for i in range(7):
            f = 0.085 + (1.45 - 0.085) * (i / 6) ** 1.85
            for sgn in (-1, 1):
                off = sgn * 560
                x0, x1 = sx(off - 108, f), sx(off + 108, f)
                yb, yt = sy(0, f), sy(H_RACK, f)
                a = min(.92, .20 + .72 * f)
                s.append(poly([(x0, yt), (x1, yt), (x1, yb), (x0, yb)], STEEL_XD, a))
                for lvl in range(3):
                    yy = yb - (yb - yt) * (lvl + 1) / 3.5
                    s.append(rect(x0, yy, x1 - x0, max(2, 12 * f), ACCENT, min(.72, .20 + .48 * f)))
                    s.append(rect(x0 + (x1 - x0) * .09, yy - (yb - yt) * .20, (x1 - x0) * .82,
                                  (yb - yt) * .20, K_FRONT, min(.82, .22 + .58 * f)))
    # дымка у линии горизонта — мягко «сшивает» пол и воздух
    s.append(f'<rect x="0" y="{VPY - 46}" width="{W}" height="120" fill="#E8F0F6" opacity=".16"/>')
    s.append(f'<ellipse cx="{VPX}" cy="{VPY + 30}" rx="620" ry="80" fill="#FFF3E2" opacity=".10"/>')
    return "".join(s)


def conveyor(center=60, halfw=45, f_max=6.5, rollers=22):
    """Рольганг, уходящий в глубину. center/halfw — в сантиметрах."""
    f0 = 0.05
    L0, R0 = sx(center - halfw, f0), sx(center + halfw, f0)
    L1, R1 = sx(center - halfw, f_max), sx(center + halfw, f_max)
    y0, y1 = sy(H_BELT, f0), sy(H_BELT, f_max)
    s = [poly([(L0, y0), (R0, y0), (R1, y1), (L1, y1)], "url(#belt)")]
    for i in range(rollers):
        f = f0 + (f_max - f0) * (i / (rollers - 1)) ** 2.0
        y = sy(H_BELT, f)
        xl, xr = sx(center - halfw, f), sx(center + halfw, f)
        th = max(1.6, 3.0 * f)
        s.append(rect(xl, y, xr - xl, th, "#C6D3DE", min(.9, .32 + .5 * f), th / 2))
    # боковые балки рамы + сигнальная полоса
    for off in (center - halfw, center + halfw):
        s.append(poly([(sx(off, f0), sy(H_BELT, f0)), (sx(off, f0), sy(H_BELT - 22, f0)),
                       (sx(off, f_max), sy(H_BELT - 22, f_max)), (sx(off, f_max), sy(H_BELT, f_max))], STEEL_XD))
        s.append(poly([(sx(off, f0), sy(H_BELT - 6, f0)), (sx(off, f0), sy(H_BELT - 14, f0)),
                       (sx(off, f_max), sy(H_BELT - 14, f_max)), (sx(off, f_max), sy(H_BELT - 6, f_max))], ACCENT, .75))
    # стойки-опоры
    for f in (0.35, 0.75, 1.5, 3.0, 5.6):
        if f > f_max:
            continue
        for off in (center - halfw + 6, center + halfw - 6):
            s.append(rect(sx(off, f) - 2.2 * f, sy(H_BELT - 22, f), max(2, 4.4 * f),
                          sy(0, f) - sy(H_BELT - 22, f), STEEL_DK, .8))
    return "".join(s)


def container():
    """Створки и притолока морского контейнера — рама кадра."""
    LX, RX, TY = 424, 1516, 96
    s = []
    s.append(rect(0, 0, LX, H, "url(#doorL)"))
    s.append(rect(0, 0, LX, H, "url(#rib)"))
    s.append(rect(RX, 0, W - RX, H, "url(#doorR)"))
    s.append(rect(RX, 0, W - RX, H, "url(#rib)"))
    s.append(rect(LX, 0, RX - LX, TY, "url(#lintel)"))
    s.append(rect(LX, 0, RX - LX, TY, "url(#rib)", .5))
    for y, h in ((0, 26), (H - 30, 30)):
        s.append(rect(0, y, LX, h, BLUE_XD, .8))
        s.append(rect(RX, y, W - RX, h, BLUE_XD, .8))
    for x in (104, 176, 1552):
        s.append(rect(x, 30, 13, H - 62, BLUE_LT, .40, 6))
        s.append(rect(x - 11, 392, 35, 54, BLUE_XD, .95, 8))
        s.append(rect(x - 11, 392, 35, 54, BLUE_LT, .25, 8))
    s.append(rect(LX - 13, 0, 13, H, "#DCEAF6", .5))
    s.append(rect(RX, 0, 11, H, "#DCEAF6", .32))
    s.append(rect(LX, TY - 10, RX - LX, 10, "#DCEAF6", .32))
    s.append(rect(LX, TY, RX - LX, 104, "#061019", .30))
    return "".join(s)


def svg(title, body, extra_top=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'preserveAspectRatio="xMidYMid slice" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n  <defs>{defs()}</defs>\n{body}\n'
            f'  {rect(0,0,W,H,"url(#warm)")}\n  {rect(0,0,W,H,"url(#vigx)")}\n'
            f'  {rect(0,0,W,H,"url(#vig)")}\n{extra_top}</svg>\n')


def machine(off, f, half=180, height=370, hood=True, panel=True):
    """Станок в перспективе: цоколь, корпус, капот, вал и пульт."""
    x0, x1 = sx(off - half, f), sx(off + half, f)
    yb, yt = sy(0, f), sy(height, f)
    w, h = x1 - x0, yb - yt
    a = min(.96, .30 + .70 * f)
    s = [f'<ellipse cx="{(x0+x1)/2:.0f}" cy="{yb:.0f}" rx="{w*0.60:.0f}" ry="{max(3, h*0.05):.0f}" '
         f'fill="#070E15" opacity="{min(.42, .12 + .3 * f):.2f}"/>',
         poly([(x0, yt), (x1, yt), (x1, yb), (x0, yb)], STEEL_DK, a)]
    # верхняя грань ловит свет сверху
    s.append(rect(x0, yt, w, max(4, h * .06), STEEL_LT, min(.75, .26 + .45 * f)))
    if hood:
        s.append(rect(x0 + w * .08, yt - h * .13, w * .84, h * .13, STEEL, min(.9, .28 + .6 * f)))
        s.append(rect(x0 + w * .08, yt - h * .13, w * .84, max(3, h * .03), ACCENT, min(.85, .3 + .5 * f)))
    # вал
    cx, cy = (x0 + x1) / 2, yt + h * .44
    s.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{w*.27:.0f}" fill="{STEEL}" opacity="{a:.2f}"/>')
    s.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{w*.27:.0f}" fill="none" stroke="{STEEL_LT}" '
             f'stroke-width="{max(1.5, w*.03):.1f}" opacity="{min(.8, .25+.5*f):.2f}"/>')
    s.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{w*.09:.0f}" fill="{STEEL_XD}" opacity="{a:.2f}"/>')
    if panel and w > 90:
        s.append(rect(x0 + w * .70, yt + h * .16, w * .20, h * .15, "#0E1A24", min(.9, .3 + .55 * f), 4))
        s.append(rect(x0 + w * .72, yt + h * .18, w * .16, h * .10, "#8FD3F5", min(.8, .25 + .5 * f), 2))
    # цоколь с сигнальной разметкой
    s.append(rect(x0, yb - max(6, h * .09), w, max(6, h * .09), ACCENT, min(.88, .3 + .5 * f)))
    s.append(rect(x0, yb - max(3, h * .025), w, max(3, h * .025), STEEL_XD, min(.9, .3 + .5 * f)))
    return "".join(s)


def stack(cx, ground_y, w, h, n=2, k=.12):
    """Штабель коробов на поддоне, стоящий на полу."""
    ph = h * .17
    s = [rect(cx - w * .54, ground_y - ph, w * 1.08, ph, "#6E4E23", .95, 4)]
    y = ground_y - ph
    for i in range(n):
        ww = w * (1 - i * .09)
        s.append(box(cx, y, ww, h, k=k, light=i % 2 == 1))
        y -= h
    return "".join(s)


# ------------------------------------------------------------------ слайд 1
def slide_production():
    """Гофрокороба едут по рольгангу из открытых ворот контейнера — «от нас к клиенту»."""
    C, HW = 60, 45
    s = [hall(), conveyor(center=C, halfw=HW)]
    plan = [(0.25, -.30, False), (0.38, .34, True), (0.60, -.28, False), (0.95, .30, True),
            (1.55, -.24, False), (2.70, .22, True), (5.20, -.16, False)]
    for f, jit, light in plan:
        w = 62 * f
        s.append(box(sx(C + jit * HW, f), sy(H_BELT, f), w, w * 0.72,
                     k=.04 + .09 * min(f / 2.6, 1.0), light=light))
    body = "\n".join("<g>" + x + "</g>" for x in s) + "\n<g>" + container() + "</g>"
    return svg("Гофрокороба едут по рольгангу через открытые ворота контейнера", body)


# ------------------------------------------------------------------ слайд 2
def slide_print():
    """Флексопечать: печатные секции линии и отпечатанные короба на выходе."""
    C, HW = 60, 45
    s = [hall(racks=False)]
    # печатные секции стоят там же, где стеллажи в 1-м слайде — проверенная сетка
    for i in range(6):
        f = 0.10 + (1.55 - 0.10) * (i / 5) ** 1.85
        for sgn in (-1, 1):
            s.append(machine(sgn * 560, f, half=145, height=400))
            # шкала красок 1–4 на боковине секции
            if f > .45:
                x0 = sx(sgn * 560 - 110, f)
                for j, c in enumerate((ACCENT, BLUE_LT, "#EFE7D8", "#1E2A34")):
                    s.append(rect(x0 + j * 58 * f, sy(120, f), 44 * f, 40 * f, c,
                                  min(.9, .3 + .55 * f), 4))
    s.append(conveyor(center=C, halfw=HW))
    plan = [(0.25, -.30), (0.38, .34), (0.60, -.28), (0.95, .30), (1.55, -.24), (2.70, .22), (5.20, -.16)]
    for i, (f, jit) in enumerate(plan):
        w = 62 * f
        s.append(box(sx(C + jit * HW, f), sy(H_BELT, f), w, w * 0.68,
                     k=.04 + .09 * min(f / 2.6, 1.0), light=i % 2 == 0, printed=True))
    return svg("Многокрасочная флексографическая печать на гофроупаковке", "\n".join(s))


def slide_equipment():
    """Цех оборудования: ряд станков и свободный проезд — новое и б/у оборудование."""
    s = [hall(racks=False)]
    for i in range(7):
        f = 0.085 + (1.9 - 0.085) * (i / 6) ** 1.85
        for sgn in (-1, 1):
            # правый ряд чуть глубже левого — кадр перестаёт быть зеркальным
            ff = f if sgn < 0 else f * 0.82
            s.append(machine(sgn * 560, ff, half=150, height=390 if i % 2 else 340,
                             panel=ff > .35))
    # разметка проезда — строго внутри проезда
    for i in range(11):
        f = 0.14 + (4.2 - 0.14) * (i / 10) ** 2.0
        s.append(rect(sx(-60, f), sy(0, f), 120 * f, max(2, 4.5 * f), "#EFE6D6",
                      min(.42, .12 + .26 * f), 3))
    # штабели готовой продукции стоят на полу проезда
    s.append(stack(sx(-150, 1.30), sy(0, 1.30), 190, 128, n=2))
    s.append(stack(sx(210, 2.30), sy(0, 2.30), 285, 190, n=2))
    return svg("Производственная линия — продажа нового и б/у оборудования", "\n".join(s))


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, doc in (("hero-1.svg", slide_production()),
                      ("hero-2.svg", slide_print()),
                      ("hero-3.svg", slide_equipment())):
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(doc)
        print(f"{name}: {len(doc)} байт")


if __name__ == "__main__":
    main()
