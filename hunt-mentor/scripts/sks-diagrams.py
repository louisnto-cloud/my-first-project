# Hunt Mentor: SKS (Chinese Type 56) course diagrams.
# Writes diagrams/sks-*.svg. Run: python3 scripts/sks-diagrams.py
# Part shapes are a simplified right side profile of the Type 56 carbine,
# drawn to the US Army TC 9-56 (1969) technical data: 1020 mm long, 520 mm barrel.
# Every label and tip comes from the SKS course lessons (content/phase8/17x-sks-*.md).
import math, os, html

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'diagrams')

SPRUCE = '#1F3D2B'; LICHEN = '#EEF1EA'; BLAZE = '#FF6A13'; INK = '#17201A'
WOOD = '#A8743F'; WOODD = '#6E4A2A'; STEEL = '#59625C'; STEELL = '#8E9690'; STEELD = '#3A403C'
PAPER = '#FFFFFF'; SAGE = '#B9C4B0'; BRASS = '#C9A227'; RUST = '#9B4A1C'; GREEN = '#2E7D4F'; RED = '#B3261E'

def esc(s):
    return html.escape(s, quote=True)

def T(x, y, s, size=14, weight='normal', anchor='start', fill=INK, extra=''):
    w = f' font-weight="{weight}"' if weight != 'normal' else ''
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}"{w} fill="{fill}" text-anchor="{anchor}"{extra}>{esc(s)}</text>'

def svg(name, aria, body, h=300, title=None, foot=None):
    head = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 {h}" font-family="sans-serif" role="img" aria-label="{esc(aria)}">\n'
    bg = f'<rect x="0" y="0" width="400" height="{h}" fill="{LICHEN}"/>\n'
    t = T(200, 26, title, 18, 'bold', 'middle', SPRUCE) + '\n' if title else ''
    f = T(200, h - 12, foot, 14, 'normal', 'middle', INK) + '\n' if foot else ''
    with open(os.path.join(OUT, name + '.svg'), 'w') as fh:
        fh.write(head + bg + t + body + '\n' + f + '</svg>\n')
    NAMES.append(name)

NAMES = []

def tip(title, text):
    return f' data-tip="{esc(title)}|{esc(text)}"'

def badge(n, x, y, key=False, r=11):
    fill = BLAZE if key else SPRUCE
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{fill}" stroke="{PAPER}" stroke-width="2"/>'
            + T(x, y + 5, str(n), 14, 'bold', 'middle', PAPER))

def callout(n, px, py, lx, ly, label, side='right', key=False, t=None, dot=True):
    """Numbered callout: leader from part point (px,py) to badge (lx,ly), label beside badge."""
    g = f'<g{tip(*t) if t else ""}>'
    g += f'<line x1="{px:.1f}" y1="{py:.1f}" x2="{lx:.1f}" y2="{ly:.1f}" stroke="{INK}" stroke-width="1.5"/>'
    if dot:
        g += f'<circle cx="{px:.1f}" cy="{py:.1f}" r="3" fill="{INK}"/>'
    g += badge(n, lx, ly, key)
    if label:
        if side == 'right':
            g += T(lx + 15, ly + 5, label, 14, 'bold', 'start', INK)
        elif side == 'left':
            g += T(lx - 15, ly + 5, label, 14, 'bold', 'end', INK)
        elif side == 'above':
            g += T(lx, ly - 16, label, 14, 'bold', 'middle', INK)
        else:
            g += T(lx, ly + 28, label, 14, 'bold', 'middle', INK)
    return g + '</g>'

def poly(pts, fill, stroke=INK, sw=1.5, extra=''):
    p = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    return f'<polygon points="{p}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"{extra}/>'

def rect(x, y, w, h, fill, stroke=INK, sw=1.5, rx=0, extra=''):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{extra}/>'

def line(x1, y1, x2, y2, stroke=INK, sw=1.5, extra=''):
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round"{extra}/>'

def circ(x, y, r, fill, stroke=INK, sw=1.5, extra=''):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{extra}/>'

def arrow(x1, y1, x2, y2, color=BLAZE, sw=4):
    a = math.atan2(y2 - y1, x2 - x1); L = 12
    p1 = (x2 - L * math.cos(a - 0.45), y2 - L * math.sin(a - 0.45))
    p2 = (x2 - L * math.cos(a + 0.45), y2 - L * math.sin(a + 0.45))
    return (line(x1, y1, x2 - 6 * math.cos(a), y2 - 6 * math.sin(a), color, sw)
            + poly([(x2, y2), p1, p2], color, color, 1))

def curved_arrow(cx, cy, r, a0, a1, color=BLAZE, sw=4):
    """Arc arrow around (cx,cy) from angle a0 to a1 (degrees, svg y down)."""
    x0 = cx + r * math.cos(math.radians(a0)); y0 = cy + r * math.sin(math.radians(a0))
    x1 = cx + r * math.cos(math.radians(a1)); y1 = cy + r * math.sin(math.radians(a1))
    large = 1 if abs(a1 - a0) > 180 else 0
    sweep = 1 if a1 > a0 else 0
    d = f'<path d="M{x0:.1f} {y0:.1f} A{r} {r} 0 {large} {sweep} {x1:.1f} {y1:.1f}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/>'
    # head tangent
    da = 1 if sweep else -1
    t = math.radians(a1) + da * math.pi / 2
    L = 11
    p1 = (x1 - L * math.cos(t - 0.5), y1 - L * math.sin(t - 0.5))
    p2 = (x1 - L * math.cos(t + 0.5), y1 - L * math.sin(t + 0.5))
    return d + poly([(x1 + 4 * math.cos(t), y1 + 4 * math.sin(t)), p1, p2], color, color, 1)

def check(x, y, ok=True, s=1.0):
    if ok:
        return (circ(x, y, 11 * s, GREEN, PAPER, 2)
                + f'<path d="M{x-5*s:.1f} {y:.1f} l{4*s:.1f} {4*s:.1f} l{7*s:.1f} {-8*s:.1f}" fill="none" stroke="{PAPER}" stroke-width="2.5" stroke-linecap="round"/>')
    return (circ(x, y, 11 * s, RED, PAPER, 2)
            + line(x - 4.5 * s, y - 4.5 * s, x + 4.5 * s, y + 4.5 * s, PAPER, 2.5)
            + line(x + 4.5 * s, y - 4.5 * s, x - 4.5 * s, y + 4.5 * s, PAPER, 2.5))

# ---------------------------------------------------------------- the rifle
class Rifle:
    """Right side profile. L = mm from butt plate (0) to muzzle (1020). y = mm below bore line."""
    def __init__(self, ox, oy, s):
        self.ox, self.oy, self.s = ox, oy, s
    def P(self, L, y):
        return (self.ox + L * self.s, self.oy + y * self.s)
    def pts(self, lst):
        return [self.P(L, y) for L, y in lst]
    def draw(self, hl=(), safety='safe', mag='closed', bolt='closed', bayonet='folded', cover=True,
             carrier=True, gastube=True, ghost=()):
        P, s = self.P, self.s
        H = lambda k, base: BLAZE if k in hl else base
        op = lambda k: ' opacity="0.25"' if k in ghost else ''
        out = []
        # stock
        out.append(poly(self.pts([(0, 40), (0, 170), (60, 150), (235, 88), (300, 62), (480, 58), (600, 48), (760, 34),
                                  (766, 22), (760, 12), (498, 12), (498, 15), (290, 15), (280, 22), (240, 27)]),
                        H('stock', WOOD), WOODD, 1.5, op('stock')))
        # butt trap door
        out.append(rect(*P(4, 88), 22 * s, 26 * s, H('trap', '#8C5E33'), WOODD, 1.2))
        # magazine (pivots at front, L 485)
        mp = [(405, 58), (405, 76), (480, 80), (488, 70), (486, 58)]
        if mag == 'open':
            px, py = 486, 60; a = math.radians(-32)
            mp = [(px + (L - px) * math.cos(a) - (y - py) * math.sin(a), py + (L - px) * math.sin(a) + (y - py) * math.cos(a)) for L, y in mp]
        out.append(poly(self.pts(mp), H('mag', STEEL), INK, 1.5, op('mag')))
        # magazine catch
        out.append(poly(self.pts([(398, 60), (404, 60), (402, 78), (397, 78)]), H('catch', STEELD), INK, 1.2))
        # trigger guard
        gx = [P(330, 60), P(333, 86), P(392, 86), P(396, 60)]
        out.append(f'<path d="M{gx[0][0]:.1f} {gx[0][1]:.1f} L{gx[1][0]:.1f} {gx[1][1]:.1f} L{gx[2][0]:.1f} {gx[2][1]:.1f} L{gx[3][0]:.1f} {gx[3][1]:.1f}" fill="none" stroke="{H("guard", STEELD)}" stroke-width="{max(2, 6*s):.1f}" stroke-linejoin="round"/>')
        # trigger
        t0 = P(368, 60); t1 = P(362, 70); t2 = P(366, 80)
        out.append(f'<path d="M{t0[0]:.1f} {t0[1]:.1f} Q{t1[0]:.1f} {t1[1]:.1f} {t2[0]:.1f} {t2[1]:.1f}" fill="none" stroke="{H("trigger", STEELD)}" stroke-width="{max(2.5, 5*s):.1f}" stroke-linecap="round"/>')
        # safety: pivot behind trigger
        pv = P(345, 63)
        tipp = P(337, 82) if safety == 'fire' else P(360, 71)
        out.append(line(pv[0], pv[1], tipp[0], tipp[1], H('safety', STEELD), max(3, 6 * s)))
        out.append(circ(pv[0], pv[1], max(2, 3 * s), STEELD, INK, 1))
        # receiver
        out.append(poly(self.pts([(288, 15), (288, -12), (298, -18), (500, -18), (500, 15)]), H('receiver', STEEL), INK, 1.5, op('receiver')))
        # ejection opening / bolt view when open
        if bolt == 'open':
            out.append(rect(*P(420, -16), 70 * s, 14 * s, '#2A2F2B', INK, 1))
        # top cover
        if cover:
            out.append(f'<path d="M{P(296,-18)[0]:.1f} {P(296,-18)[1]:.1f} L{P(300,-27)[0]:.1f} {P(300,-27)[1]:.1f} Q{P(400,-31)[0]:.1f} {P(400,-31)[1]:.1f} {P(500,-27)[0]:.1f} {P(500,-27)[1]:.1f} L{P(500,-18)[0]:.1f} {P(500,-18)[1]:.1f} Z" fill="{H("cover", STEELL)}" stroke="{INK}" stroke-width="1.5"{op("cover")}/>')
        # cover pin lever
        cp = P(298, -6)
        out.append(line(cp[0], cp[1], *P(306, 10), H('coverpin', STEELD), max(2.5, 5 * s)))
        out.append(circ(cp[0], cp[1], max(2.5, 4 * s), H('coverpin', STEELD), INK, 1))
        # operating handle on the bolt carrier
        if carrier:
            hx = 470 if bolt == 'closed' else 400
            hp = P(hx, -6)
            out.append(line(*P(hx, -10), *P(hx, -2), STEELD, max(2, 4 * s)))
            out.append(circ(hp[0], hp[1], max(4, 9 * s), H('handle', '#C8CCC6'), INK, 1.5, op('handle')))
        # rear sight base and leaf
        out.append(rect(*P(498, -24), 62 * s, 32 * s, H('rsight', STEEL), INK, 1.5))
        out.append(poly(self.pts([(504, -24), (556, -33), (558, -24)]), H('rsight', STEELD), INK, 1.2))
        # barrel
        out.append(rect(*P(498, -7), 522 * s, 14 * s, H('barrel', STEELD), INK, 1.2))
        # gas tube and wood handguard
        if gastube:
            out.append(rect(*P(560, -22), 240 * s, 13 * s, H('gastube', STEEL), INK, 1.2, extra=op('gastube')))
            out.append(rect(*P(562, -27), 196 * s, 19 * s, H('handguard', WOOD), WOODD, 1.2, rx=max(1, 3 * s), extra=op('handguard')))
        # gas tube lock lever
        gl = P(556, -12)
        out.append(line(gl[0], gl[1], *P(548, 2), H('gaslever', STEELD), max(2.5, 5 * s)))
        out.append(circ(gl[0], gl[1], max(2.5, 3.5 * s), H('gaslever', STEELD), INK, 1))
        # gas block
        out.append(poly(self.pts([(795, -24), (835, -24), (835, 9), (800, 9)]), H('gasblock', STEEL), INK, 1.2))
        # cleaning rod
        out.append(line(*P(770, 21), *P(992, 21), H('rod', STEELL), max(1.5, 3 * s)))
        out.append(circ(*P(992, 21), max(2, 3.5 * s), H('rod', STEELL), INK, 1))
        # bayonet
        if bayonet == 'folded':
            out.append(poly(self.pts([(700, 13), (958, 11), (958, 17), (700, 15)]), H('bayonet', '#AEB4AE'), INK, 1.2))
            out.append(rect(*P(952, 7), 22 * s, 14 * s, H('bayonet', STEEL), INK, 1.2))
        else:
            out.append(rect(*P(952, 7), 22 * s, 14 * s, H('bayonet', STEEL), INK, 1.2))
            out.append(poly(self.pts([(962, 11), (1240, 13), (962, 16)]), H('bayonet', '#AEB4AE'), INK, 1.2))
        # front sight base, post and hood
        out.append(rect(*P(975, -10), 27 * s, 18 * s, H('fsight', STEEL), INK, 1.2))
        out.append(rect(*P(985, -30), 7 * s, 20 * s, H('fsight', STEELD), INK, 1))
        hb = P(980, -12); ht = P(988, -42); he = P(997, -12)
        out.append(f'<path d="M{hb[0]:.1f} {hb[1]:.1f} Q{ht[0]-2:.1f} {ht[1]:.1f} {ht[0]:.1f} {ht[1]:.1f} Q{ht[0]+2:.1f} {ht[1]:.1f} {he[0]:.1f} {he[1]:.1f}" fill="none" stroke="{H("fsight", STEELD)}" stroke-width="{max(1.5, 3*s):.1f}"/>')
        return ''.join(out)

FULL = Rifle(10, 130, 0.372)   # whole rifle across a 400 wide card

# ---------------------------------------------------------------- loose parts
def top_cover(x, y, w, fill=STEELL):
    h = w * 0.09
    return f'<path d="M{x:.1f} {y+h:.1f} L{x+6:.1f} {y:.1f} Q{x+w/2:.1f} {y-h*0.5:.1f} {x+w:.1f} {y:.1f} L{x+w:.1f} {y+h:.1f} Z" fill="{fill}" stroke="{INK}" stroke-width="1.5"/>'

def recoil_spring(x, y, w, fill=STEELL):
    o = [rect(x, y - 6, 18, 12, fill, INK, 1.2, 2)]  # stepped end
    o.append(line(x + 18, y, x + w, y, STEELD, 3))
    n = 16; seg = (w - 30) / n
    d = f'M{x+22:.1f} {y:.1f} ' + ' '.join(f'L{x+22+seg*(i+0.5):.1f} {y+(-6 if i%2==0 else 6):.1f}' for i in range(n)) + f' L{x+22+seg*n:.1f} {y:.1f}'
    o.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="1.6"/>')
    return ''.join(o)

def carrier(x, y, w, fill='#C8CCC6'):
    h = w * 0.2
    o = [rect(x, y, w, h, fill, INK, 1.5, 3)]
    o.append(rect(x + w - 26, y - 6, 18, 8, STEEL, INK, 1.2))  # stripper clip guide
    o.append(line(x + w - 30, y + h, x + w - 30, y + h + 14, STEELD, 4))
    o.append(circ(x + w - 30, y + h + 20, 9, fill, INK, 1.5))  # operating handle
    return ''.join(o)

def bolt(x, y, w, fill='#D9DCD7', pin=INK, pinfwd=False):
    h = w * 0.26
    o = [poly([(x, y + h * 0.25), (x + 14, y), (x + w, y), (x + w, y + h), (x, y + h)], fill, INK, 1.5)]
    px0 = x + 4 + (10 if pinfwd else 0)
    o.append(line(px0, y + h * 0.55, px0 + w - 8, y + h * 0.55, pin, 3, ' stroke-dasharray="7 4"'))
    o.append(rect(x + w - 22, y + h - 6, 20, 7, STEEL, INK, 1))  # extractor
    return ''.join(o)

def gas_tube(x, y, w):
    o = [rect(x, y + 6, w, 12, STEEL, INK, 1.2)]
    o.append(rect(x + 4, y, w * 0.8, 15, WOOD, WOODD, 1.2, 3))
    o.append(rect(x + w - 6, y + 3, 10, 18, STEEL, INK, 1.2, 2))
    return ''.join(o)

def piston(x, y, w):
    return rect(x, y - 3, w - 16, 6, STEELL, INK, 1.2, 2) + rect(x + w - 18, y - 7, 18, 14, STEELL, INK, 1.2, 2)

def trigger_group(x, y, s=1.0, safety='safe'):
    o = [rect(x, y, 150 * s, 24 * s, STEEL, INK, 1.5, 3)]
    o.append(f'<path d="M{x+30*s:.1f} {y+24*s:.1f} L{x+34*s:.1f} {y+62*s:.1f} L{x+110*s:.1f} {y+62*s:.1f} L{x+116*s:.1f} {y+24*s:.1f}" fill="none" stroke="{STEELD}" stroke-width="{6*s:.1f}" stroke-linejoin="round"/>')
    o.append(f'<path d="M{x+80*s:.1f} {y+24*s:.1f} Q{x+72*s:.1f} {y+40*s:.1f} {x+78*s:.1f} {y+52*s:.1f}" fill="none" stroke="{STEELD}" stroke-width="{5*s:.1f}" stroke-linecap="round"/>')
    pv = (x + 48 * s, y + 28 * s)
    tp = (x + 38 * s, y + 54 * s) if safety == 'fire' else (x + 66 * s, y + 40 * s)
    o.append(line(*pv, *tp, BLAZE, 6 * s))
    o.append(rect(x + 100 * s, y - 26 * s, 16 * s, 28 * s, STEELL, INK, 1.2, 2))  # hammer
    return ''.join(o)

def cartridge(x, y, L=56, kind='sp', vertical=False, case=BRASS):
    """Side view of a 7.62x39 round, base at x, pointing right. L = overall px."""
    cl = L * 0.68; bh = L * 0.2
    o = [rect(x, y - bh / 2, cl, bh, case, INK, 1.2, 1.5)]
    o.append(line(x + 3, y - bh / 2, x + 3, y + bh / 2, INK, 1))
    tipc = {'sp': '#B87333', 'fmj': '#B87333', 'poly': RED}[kind]
    o.append(f'<path d="M{x+cl:.1f} {y-bh*0.42:.1f} Q{x+L*0.95:.1f} {y-bh*0.3:.1f} {x+L:.1f} {y:.1f} Q{x+L*0.95:.1f} {y+bh*0.3:.1f} {x+cl:.1f} {y+bh*0.42:.1f} Z" fill="{tipc}" stroke="{INK}" stroke-width="1.2"/>')
    if kind == 'sp':
        o.append(f'<path d="M{x+L*0.9:.1f} {y-bh*0.18:.1f} Q{x+L*0.99:.1f} {y:.1f} {x+L*0.9:.1f} {y+bh*0.18:.1f}" fill="#9AA0A6" stroke="{INK}" stroke-width="1"/>')
    if kind == 'poly':
        o.append(f'<path d="M{x+L*0.88:.1f} {y-bh*0.2:.1f} L{x+L:.1f} {y:.1f} L{x+L*0.88:.1f} {y+bh*0.2:.1f} Z" fill="{RED}" stroke="{INK}" stroke-width="1"/>')
    return ''.join(o)

def clip(x, y, n=10, w=10, filled=10, hl=False):
    """Stripper clip seen from above the rifle: n rounds side by side (base view circles)."""
    o = [rect(x - 4, y - 8, n * w + 8, 30, BLAZE if hl else STEELL, INK, 1.5, 3)]
    for i in range(n):
        cx = x + w / 2 + i * w
        if i < filled:
            o.append(circ(cx, y + 7, w * 0.42, BRASS, INK, 1))
    return ''.join(o)

def legend(items, x0=14, y0=200, cols=2, colw=193, rowh=22):
    """items: list of (n, label, key). Numbered key under a drawing."""
    o = []
    per = (len(items) + cols - 1) // cols
    for i, (n, lab, key) in enumerate(items):
        cx = x0 + 11 + (i // per) * colw; cy = y0 + (i % per) * rowh
        o.append(badge(n, cx, cy, key, r=10) + T(cx + 16, cy + 5, lab, 14, 'bold' if key else 'normal', 'start', INK))
    return ''.join(o)

def card(x, y, w, h, fill=PAPER, stroke=SPRUCE, sw=2, rx=10, extra=''):
    return rect(x, y, w, h, fill, stroke, sw, rx, extra)

def step_badge(n):
    return badge(n, 26, 22, key=False, r=13)

def stitle(n, text):
    """Title for a step frame: numbered badge at left, title text after it."""
    return step_badge(n) + T(46, 28, text, 17, 'bold', 'start', SPRUCE)

def hand(x, y, s=1.0, flip=False):
    """Simple thumb shape (a rounded finger tip) pressing at (x,y)."""
    k = -1 if flip else 1
    return (f'<path d="M{x:.1f} {y:.1f} q{6*s*k:.1f} {-2*s:.1f} {10*s*k:.1f} {-14*s:.1f} l{8*s*k:.1f} {-30*s:.1f} q{3*s*k:.1f} {-8*s:.1f} {12*s*k:.1f} {-5*s:.1f} l{-4*s*k:.1f} {38*s:.1f} q{-6*s*k:.1f} {14*s:.1f} {-26*s*k:.1f} {11*s:.1f} Z" fill="#E8B894" stroke="{INK}" stroke-width="1.5"/>')

def safe_dir(x, y):
    """Small 'muzzle safe' icon: arrow to the ground marker."""
    return (rect(x - 54, y - 14, 108, 28, PAPER, BLAZE, 2, 14) + T(x, y + 5, 'Muzzle safe', 14, 'bold', 'middle', BLAZE))

import sks_frames  # noqa: E402  (the diagram list lives in sks_frames.py next to this file)
sks_frames.build(globals())
print(len(NAMES), 'diagrams written')
