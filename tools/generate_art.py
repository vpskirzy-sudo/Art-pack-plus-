#!/usr/bin/env python3
"""
Генератор фоновых иллюстраций слайдера «Арт-Пак Плюс».

ВАЖНО: с сентября 2026 первый экран показывает настоящие фотографии
производства (assets/img/hero-1..3.jpg), а не эти рисунки. Скрипт и готовые
hero-1..3.svg оставлены как запасной вариант: если от фотографий откажутся,
достаточно вернуть в src/index.html пути на .svg. Сам по себе `npm run art`
на сайт больше не влияет.

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
  <linearGradient id="gate" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFBF2"/><stop offset=".55" stop-color="#FFEFD2"/>
    <stop offset="1" stop-color="#FFD9A2"/>
  </linearGradient>
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


# ------------------------------------------------------- фигуры людей
def _seg(pts, w, color):
    """Ломаная с круглыми стыками — из таких собраны руки и ноги."""
    d = " ".join(("M" if i == 0 else "L") + f" {x:.1f} {y:.1f}" for i, (x, y) in enumerate(pts))
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w:.1f}" '
            f'stroke-linecap="round" stroke-linejoin="round"/>')


def _elbow(sx_, sy_, hx, hy, out):
    """Точка локтя: середина плечо→кисть, сдвинутая по нормали — рука сгибается."""
    mx, my = (sx_ + hx) / 2, (sy_ + hy) / 2
    dx, dy = hx - sx_, hy - sy_
    L = max(1.0, (dx * dx + dy * dy) ** .5)
    return mx - dy / L * out, my + dx / L * out


def person(cx, ground, h, face=1, hand=None, hat=False, folder=False,
           dark="#0B141D", rim="#F0B072"):
    """Силуэт человека в контражуре: тонкая тёплая подсветка контура + тёмная заливка.

    Пропорции ~7,5 голов. face: 1 — вправо, -1 — влево.
    hand: (x, y) — куда тянется ближняя рука (рукопожатие); None — рука опущена.
    """
    r_h   = h * .071
    y_head = ground - h + r_h
    y_sh   = ground - h * .82
    y_hip  = ground - h * .47
    y_knee = ground - h * .25
    hx_sh  = h * .122

    def build(color, grow):
        g = []
        w_leg, w_arm = h * .072 + grow, h * .050 + grow
        # ноги
        g.append(_seg([(cx - h * .045, y_hip), (cx - h * .062, y_knee), (cx - h * .075, ground)], w_leg, color))
        g.append(_seg([(cx + h * .045, y_hip), (cx + h * .062, y_knee), (cx + h * .080, ground)], w_leg, color))
        # корпус — сужается от плеч к бёдрам
        t = grow / 2
        g.append(f'<polygon points="'
                 f'{cx - hx_sh - t:.1f},{y_sh - t:.1f} {cx + hx_sh + t:.1f},{y_sh - t:.1f} '
                 f'{cx + h * .092 + t:.1f},{y_hip + t:.1f} {cx - h * .092 - t:.1f},{y_hip + t:.1f}" '
                 f'fill="{color}"/>')
        g.append(_seg([(cx, y_sh), (cx, y_hip)], h * .175 + grow, color))
        # шея
        g.append(_seg([(cx + face * h * .006, y_head + r_h * .6), (cx, y_sh)], h * .052 + grow, color))
        # дальняя рука вдоль тела
        g.append(_seg([(cx - face * hx_sh, y_sh + h * .02),
                       (cx - face * (hx_sh + h * .012), y_hip),
                       (cx - face * (hx_sh + h * .028), y_hip + h * .11)], w_arm, color))
        # ближняя рука
        sxp, syp = cx + face * hx_sh, y_sh + h * .02
        if hand:
            ex, ey = _elbow(sxp, syp, hand[0], hand[1], face * h * .105)
            g.append(_seg([(sxp, syp), (ex, ey), (hand[0], hand[1])], w_arm, color))
        else:
            g.append(_seg([(sxp, syp), (sxp + face * h * .018, y_hip),
                           (sxp + face * h * .034, y_hip + h * .11)], w_arm, color))
        # голова
        hcx = cx + face * h * .014
        g.append(f'<circle cx="{hcx:.1f}" cy="{y_head:.1f}" r="{r_h + grow / 2:.1f}" fill="{color}"/>')
        if hat:
            rr = r_h + grow / 2
            g.append(f'<path d="M {hcx - rr * 1.12:.1f} {y_head - rr * .30:.1f} '
                     f'a {rr * 1.12:.1f} {rr * 1.20:.1f} 0 0 1 {rr * 2.24:.1f} 0 Z" fill="{color}"/>')
            g.append(f'<rect x="{hcx - rr * 1.42 + (face < 0) * 0:.1f}" y="{y_head - rr * .44:.1f}" '
                     f'width="{rr * 2.84:.1f}" height="{rr * .34:.1f}" rx="{rr * .17:.1f}" fill="{color}"/>')
        return "".join(g)

    out = [f'<ellipse cx="{cx:.0f}" cy="{ground:.0f}" rx="{h * .155:.0f}" ry="{h * .026:.0f}" '
           f'fill="#050A0F" opacity=".40"/>']
    out.append(f'<g opacity=".85">{build(rim, h * .020)}</g>')   # тонкий контровой контур
    out.append(build(dark, 0))
    if folder:
        fx = cx - face * h * .155
        out.append(f'<rect x="{fx - h * .045:.1f}" y="{y_hip - h * .01:.1f}" width="{h * .09:.1f}" '
                   f'height="{h * .12:.1f}" rx="3" fill="{dark}"/>')
        out.append(f'<rect x="{fx - h * .045:.1f}" y="{y_hip - h * .01:.1f}" width="{h * .09:.1f}" '
                   f'height="{h * .02:.1f}" fill="{rim}" opacity=".75"/>')
    return "".join(out)


def operator(cx, seat_y, h, dark="#0F1A24", rim="#F0B072"):
    """Сидящий за рулём погрузчика: голова, торс с наклоном вперёд, рука на руле."""
    r_h = h * .115
    y_head = seat_y - h + r_h
    y_sh = seat_y - h * .70
    def build(color, grow):
        g = [_seg([(cx - h * .05, seat_y - h * .10), (cx, y_sh)], h * .30 + grow, color),
             f'<circle cx="{cx + h * .05:.1f}" cy="{y_head:.1f}" r="{r_h + grow / 2:.1f}" fill="{color}"/>',
             _seg([(cx + h * .08, y_sh + h * .06), (cx + h * .30, y_sh + h * .16)], h * .085 + grow, color)]
        return "".join(g)
    return f'<g opacity=".55">{build(rim, h * .022)}</g>' + build(dark, 0)


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
def slide_truck():
    """Погрузка фуры: погрузчик заводит паллету с гофротарой в открытый прицеп."""
    VX, VY = 2500, 430                       # своя точка схода: прицеп уходит вправо
    GY = 748                                 # уровень пола (низ колёс)

    def to_side(x, y, xr):
        t = (xr - x) / (VX - x)
        return xr, y + (VY - y) * t

    BODY, BODY_D, BODY_L = "#A9B8C6", "#78899A", "#D3DDE5"
    RX0, RX1, RY0, RY1 = 900, 1300, 176, 606      # задняя плоскость кузова

    s = [rect(0, 0, W, H, "url(#air)")]
    s.append(poly([(0, 430), (W, 430), (W, H), (0, H)], "url(#conc)"))
    s.append(f'<ellipse cx="760" cy="404" rx="640" ry="200" fill="url(#glow)" opacity=".7"/>')
    s.append(rect(0, 0, W, 150, STEEL_XD, .72))            # козырёк дока
    s.append(rect(0, 142, W, 12, ACCENT, .40))
    for x, w_, hgt in ((70, 132, 104), (216, 104, 80), (334, 116, 96)):   # штабели вдали
        s.append(rect(x, 430 - hgt, w_, hgt, K_FRONT, .26))
        s.append(rect(x, 430 - hgt, w_, hgt * .14, K_TOP, .26))

    # --- прицеп ------------------------------------------------------------
    tr, br = to_side(RX1, RY0, W), to_side(RX1, RY1, W)
    s.append(poly([(RX1, RY0), tr, br, (RX1, RY1)], BODY))                 # боковина
    s.append(poly([(RX1, RY0), tr, (tr[0], tr[1] + 26), (RX1, RY0 + 30)], BODY_L))
    s.append(poly([(RX1, RY1 - 74), br, (br[0], br[1] - 60), (RX1, RY1)], BODY_D, .8))
    s.append(poly([(RX1, RY1 - 92), (br[0], br[1] - 78), (br[0], br[1] - 62), (RX1, RY1 - 76)], ACCENT, .75))
    s.append(poly([(RX1, RY0), tr, br, (RX1, RY1)], "#0A1420", .12))
    s.append(rect(RX0, RY0, RX1 - RX0, RY1 - RY0, BODY))                   # задняя стенка
    s.append(rect(RX0, RY0, RX1 - RX0, 30, BODY_L))
    s.append(rect(RX0, RY1 - 74, RX1 - RX0, 74, BODY_D, .85))
    s.append(rect(RX0, RY1 - 92, RX1 - RX0, 18, ACCENT, .8))
    # проём и груз внутри
    OX0, OX1, OY0, OY1 = 934, 1266, 210, RY1 - 96
    s.append(rect(OX0, OY0, OX1 - OX0, OY1 - OY0, "#0D1721"))
    for x, w_, hgt in ((944, 100, 250), (1052, 96, 214), (1156, 102, 236)):
        s.append(rect(x, OY1 - hgt, w_, hgt, K_FRONT, .52))
        s.append(rect(x, OY1 - hgt, w_, hgt * .10, K_TOP, .52))
        s.append(rect(x, OY1 - 20, w_, 20, "#6E4E23", .55))
    s.append(rect(OX0, OY0, OX1 - OX0, OY1 - OY0, "#050C14", .40))
    s.append(rect(OX0, OY0, OX1 - OX0, 66, "#050C14", .5))
    # створки распахнуты почти вплотную к бортам — проём остаётся открытым
    s.append(poly([(RX0, RY0), (836, 158), (836, 664), (RX0, RY1)], BODY_D))
    s.append(poly([(RX0, RY0), (836, 158), (836, 176), (RX0, RY0 + 16)], BODY_L, .8))
    s.append(rect(846, 214, 9, 402, BODY_L, .5, 5))
    s.append(poly([(RX1, RY0), (1340, 186), (1340, 636), (RX1, RY1)], BODY_D, .9))
    # рама, отбойник, колёса
    s.append(rect(RX0, RY1, W - RX0, 26, STEEL_XD))
    s.append(rect(RX0 + 24, RY1 + 62, 330, 26, STEEL_DK, 1, 6))
    for x in (RX0 + 52, RX0 + 300):
        s.append(rect(x, RY1 + 26, 18, 40, STEEL_DK))
    for i in range(7):
        s.append(rect(RX0 + 30 + i * 48, RY1 + 62, 24, 26, ACCENT, .9))
    for wx, wr in ((1386, 60), (1516, 60)):
        s.append(f'<circle cx="{wx}" cy="{GY - wr}" r="{wr}" fill="#0E1821"/>')
        s.append(f'<circle cx="{wx}" cy="{GY - wr}" r="{wr * .40:.0f}" fill="{STEEL_LT}" opacity=".8"/>')
    s.append(f'<ellipse cx="1230" cy="{GY - 2}" rx="330" ry="26" fill="#050A0F" opacity=".34"/>')

    # --- погрузчик ---------------------------------------------------------
    s.append(f'<ellipse cx="540" cy="{GY - 4}" rx="200" ry="26" fill="#050A0F" opacity=".34"/>')
    s.append(rect(398, 566, 262, 142, STEEL_DK, 1, 10))                    # корпус
    s.append(rect(398, 566, 262, 20, STEEL_LT, .40, 8))
    s.append(rect(410, 500, 150, 70, STEEL_XD, 1, 8))                      # спинка сиденья
    s.append(operator(506, 566, 148))
    for x in (416, 632):                                                   # стойки защитной крыши
        s.append(rect(x, 404, 22, 166, STEEL_DK))
    s.append(rect(404, 386, 262, 22, STEEL_DK, 1, 6))
    s.append(f'<circle cx="535" cy="374" r="10" fill="{ACCENT}"/>')
    s.append(f'<circle cx="535" cy="374" r="24" fill="{ACCENT}" opacity=".30"/>')
    s.append(rect(660, 352, 22, 372, STEEL_DK))                            # мачта
    s.append(rect(686, 366, 16, 358, STEEL_DK, .75))
    for wx, wr in ((452, 46), (630, 38)):
        s.append(f'<circle cx="{wx}" cy="{GY - wr}" r="{wr}" fill="#0E1821"/>')
        s.append(f'<circle cx="{wx}" cy="{GY - wr}" r="{wr * .38:.0f}" fill="{STEEL}"/>')
    # вилы с паллетой, поднятой на уровень пола прицепа
    s.append(rect(700, 596, 210, 13, STEEL_LT, .9, 3))
    s.append(rect(700, 640, 13, 84, STEEL_DK, .9))
    s.append(rect(714, 566, 228, 30, "#6E4E23"))
    s.append(box(828, 566, 224, 132, k=.09, light=False))
    s.append(box(820, 434, 202, 122, k=.09, light=True))
    s.append(rect(0, 0, W, H, "url(#warm)", .7))
    s.append(rect(0, 0, W, H, "url(#vigx)"))
    s.append(rect(0, 0, W, H, "url(#vig)"))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'preserveAspectRatio="xMidYMid slice" role="img" '
            f'aria-label="Погрузчик загружает паллету с гофроупаковкой в фуру">\n'
            f'  <title>Отгрузка: погрузчик заводит паллету с гофротарой в прицеп</title>\n'
            f'  <defs>{defs()}</defs>\n' + "\n".join(s) + '\n</svg>\n')


def slide_people():
    """Сотрудники и заказчик на складе против света — приёмка партии."""
    GY = 744
    s = [rect(0, 0, W, H, "url(#air)")]
    s.append(poly([(0, 430), (W, 430), (W, H), (0, H)], "url(#conc)"))
    # ворота как единственный источник света: мягкая, а не «вырезанная» форма
    s.append(f'<ellipse cx="874" cy="330" rx="430" ry="330" fill="url(#glow)" opacity=".75"/>')
    s.append(rect(646, 136, 456, 302, "#2B3946", .92, 8))         # рама ворот
    s.append(rect(658, 148, 432, 288, "url(#gate)"))              # дневной свет в проёме
    s.append(rect(658, 148, 432, 22, "#FFFDF7", .75))
    s.append(f'<ellipse cx="874" cy="452" rx="330" ry="46" fill="#FFF3DE" opacity=".38"/>')
    s.append(f'<ellipse cx="874" cy="700" rx="430" ry="96" fill="#FFE9C8" opacity=".18"/>')
    # стеллажи по бокам — тёмная рама кадра
    for x0, w_, top in ((0, 262, 158), (272, 170, 220), (1180, 172, 212), (1372, 228, 150)):
        s.append(rect(x0, top, w_, 430 - top, STEEL_XD, .84))
        for lvl in range(3):
            yy = top + 44 + lvl * ((430 - top) / 3.1)
            s.append(rect(x0, yy, w_, 15, ACCENT, .38))
            s.append(rect(x0 + w_ * .08, yy - 44, w_ * .84, 44, K_FRONT, .40))
    s.append(rect(0, 0, W, 126, STEEL_XD, .80))
    for i in range(4):
        s.append(rect(298 + i * 262, 92, 186, 15, "#FFF6E4", .45, 4))

    # штабели на полу — масштаб и глубина
    s.append(rect(196, GY - 34, 286, 34, "#6E4E23", .95, 4))
    s.append(box(339, GY - 34, 268, 166, k=.11, light=False))
    s.append(rect(1330, GY - 28, 236, 28, "#6E4E23", .95, 4))
    s.append(box(1448, GY - 28, 224, 144, k=.11, light=True))
    s.append(box(1440, GY - 172, 198, 126, k=.11, light=False))

    # бригадир жмёт руку заказчику, второй сотрудник — чуть в стороне и дальше
    shake = (886, 572)
    s.append(person(1238, GY - 16, 278, face=-1, hat=True))       # второй сотрудник — дальше
    s.append(person(762, GY, 332, face=1, hand=shake, hat=True))  # бригадир
    s.append(person(1012, GY, 324, face=-1, hand=shake, folder=True))  # заказчик
    s.append(rect(0, 0, W, H, "url(#warm)", .7))
    s.append(rect(0, 0, W, H, "url(#vigx)"))
    s.append(rect(0, 0, W, H, "url(#vig)"))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'preserveAspectRatio="xMidYMid slice" role="img" '
            f'aria-label="Сотрудники «Арт-Пак Плюс» и заказчик у отгруженной партии">\n'
            f'  <title>Сотрудники и заказчик у партии готовой гофроупаковки</title>\n'
            f'  <defs>{defs()}</defs>\n' + "\n".join(s) + '\n</svg>\n')


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, doc in (("hero-1.svg", slide_production()),
                      ("hero-2.svg", slide_truck()),
                      ("hero-3.svg", slide_people())):
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(doc)
        print(f"{name}: {len(doc)} байт")


if __name__ == "__main__":
    main()
