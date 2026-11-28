"""Radmatic logo, concept C 'Finding dot', constructed on the golden ratio.
Every measurement comes from the x-height h and phi. Letters are built as filled
shapes (rectangles and ring bands), so there are no strokes in the masters."""
import math
PHI = (1 + 5 ** 0.5) / 2
OUT = "/Users/coverner/Documents/qqq/brand/logo/final/"
INK, TEAL = "#0b1f1d", "#0f766e"

def n(v): return f"{v:.2f}".rstrip("0").rstrip(".")

class Glyphs:
    def __init__(self, h, w):
        self.h, self.w = h, w
        self.shapes = []          # path d strings, ink
        self.dots = []            # (cx, cy, r)
        self.guides = []
    def vbar(self, x, y1, y2):
        w = self.w; self.shapes.append(f"M{n(x-w/2)} {n(y1)}H{n(x+w/2)}V{n(y2)}H{n(x-w/2)}Z")
    def hbar(self, y, x1, x2):
        w = self.w; self.shapes.append(f"M{n(x1)} {n(y-w/2)}H{n(x2)}V{n(y+w/2)}H{n(x1)}Z")
    def band(self, cx, cy, r, a0, a1):
        """Ring band of centreline radius r from angle a0 to a1 (degrees, SVG y-down, increasing clockwise)."""
        w = self.w; ro, ri = r + w/2, r - w/2
        p = lambda rad, a: (cx + rad*math.cos(math.radians(a)), cy + rad*math.sin(math.radians(a)))
        large = 1 if (a1 - a0) % 360 > 180 else 0
        (x0, y0), (x1, y1) = p(ro, a0), p(ro, a1)
        (x2, y2), (x3, y3) = p(ri, a1), p(ri, a0)
        self.shapes.append(f"M{n(x0)} {n(y0)}A{n(ro)} {n(ro)} 0 {large} 1 {n(x1)} {n(y1)}"
                           f"L{n(x2)} {n(y2)}A{n(ri)} {n(ri)} 0 {large} 0 {n(x3)} {n(y3)}Z")
    def ring(self, cx, cy, r):
        self.band(cx, cy, r, 0, 180); self.band(cx, cy, r, 180, 360)

def wordmark(h=100.0, base=None):
    w = h / PHI**3                      # stroke
    base = base if base is not None else h * PHI + 20
    xh = base - h                       # x-height line
    asc = base - h * PHI                # ascender line: x-height : full height = 1 : phi
    over = h * 0.015                    # optical overshoot for round letters
    R = h/2 + over - w/2                # bowl centreline radius
    cy = base - h/2
    G = Glyphs(h, w)
    SS, RS, RR, T = 0.9*w, 0.7*w, 0.5*w, 0.6*w   # optical gaps between outlines
    x = 0.0
    # r: stem + shoulder whose outer radius is h/phi (the r is a golden rectangle)
    s = x + w/2
    rs = h/PHI - w/2
    G.vbar(s, xh, base)
    G.band(s + rs, xh + w/2 + rs, rs, 180, 270)
    x = s + rs + 0.45*w
    # a
    c = x + R + w/2
    G.ring(c, cy, R); G.vbar(c + R, xh, base)
    x = c + R + w/2 + RS
    # d
    c = x + R + w/2
    G.ring(c, cy, R); G.vbar(c + R, asc, base)
    x = c + R + w/2 + SS
    # m: arch counters as wide as the bowl counters
    s1 = x + w/2; ra = R
    acy = xh + w/2 + ra
    G.vbar(s1, xh, base)
    G.band(s1 + ra, acy, ra, 180, 360); G.vbar(s1 + 2*ra, acy, base)
    G.band(s1 + 3*ra, acy, ra, 180, 360); G.vbar(s1 + 4*ra, acy, base)
    x = s1 + 4*ra + w/2 + RS
    # a
    c = x + R + w/2
    G.ring(c, cy, R); G.vbar(c + R, xh, base)
    x = c + R + w/2 + T
    # t: height h + h/phi^2; crossbar h/phi long
    bar = h / PHI
    s = x + bar/2
    G.vbar(s, base - h - h/PHI**2, base)
    G.hbar(xh + w/2, s - bar/2, s + bar/2)
    x = s + bar/2 + T
    # i: dot diameter = stroke x phi; its top on the ascender line, leaving exactly one stroke above the stem
    s = x + w/2
    G.vbar(s, xh, base)
    dot_r = w * PHI / 2
    G.dots.append((s, asc + dot_r, dot_r))
    x = s + w/2 + RS
    # c: open on the right, cut at 45 degrees
    c = x + R + w/2
    G.band(c, cy, R, 45, 315)
    x = c + R + w/2
    G.width, G.top, G.base, G.xh, G.asc = x, asc, base, xh, asc
    G.i_x = s
    return G

def symbol(h, x0, base, w=None):
    """The r and the finding dot. Shoulder outer radius h/phi; dot diameter h/phi^2 (= stroke x phi)."""
    w = w or h / PHI**3
    G = Glyphs(h, w)
    xh = base - h
    s = x0 + w/2
    rs = h/PHI - w/2
    G.vbar(s, xh, base)
    G.band(s + rs, xh + w/2 + rs, rs, 180, 270)
    dot_r = (w * PHI) / 2 if w == h / PHI**3 else (h / PHI**2) / 2
    gap = w
    G.dots.append((s + rs + gap + dot_r, xh + dot_r, dot_r))
    G.width = (s + rs + gap + 2*dot_r) - x0
    return G

def render(G, ink=INK, dot=TEAL, tx=0, ty=0, sc=1):
    # One path, so the parts are drawn as one shape with no seams where they meet (all parts wind clockwise).
    body = f'<path d="{"".join(G.shapes)}"/>'
    dots = "".join(f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r)}" fill="{dot}"/>' for x, y, r in G.dots)
    return f'<g transform="translate({n(tx)} {n(ty)}) scale({n(sc)})"><g fill="{ink}">{body}</g>{dots}</g>'

def svg(w, h, body, title="Radmatic"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n(w)} {n(h)}" width="{n(w)}" height="{n(h)}">'
            f'<title>{title}</title>{body}</svg>\n')

files = {}
# --- wordmark masters
G = wordmark()
pad = 6
W_, H_ = G.width + 2*pad, (G.base - G.top) + 2*pad
files["radmatic-wordmark.svg"] = svg(W_, H_, render(G, tx=pad, ty=pad - G.top))
files["radmatic-wordmark-black.svg"] = svg(W_, H_, render(G, "#000", "#000", pad, pad - G.top))
files["radmatic-wordmark-white.svg"] = svg(W_, H_, render(G, "#fff", "#fff", pad, pad - G.top))
files["radmatic-wordmark-reversed.svg"] = svg(W_, H_, render(G, "#ffffff", "#5ccbb9", pad, pad - G.top))

# --- symbol in a 256 square: mark height = 256/phi^2... centred optically
def sym_svg(ink, dot, small=False, tile=None, size=256.0, square=False, inset=1.0):
    # The mark's width is the tile's width / phi. The mark is 1.236 h wide (h/phi + stroke + h/phi^2).
    h = (size / PHI) / (1 / PHI + 1 / PHI**3 + 1 / PHI**2) * inset
    if small:
        h *= 1.08
    w = h / PHI**2.5 if small else h / PHI**3
    S = symbol(h, 0, h, w)
    tx = (size - S.width) / 2
    ty = (size - h) / 2 - size * 0.01          # a hair above centre
    bg = f'<rect width="{n(size)}" height="{n(size)}" rx="{n(0 if square else size*0.225)}" fill="{tile}"/>' if tile else ""
    return svg(size, size, bg + render(S, ink, dot, tx, ty))
files["radmatic-symbol.svg"] = sym_svg(INK, TEAL)
# Cropped to the mark itself, for navigation bars and other small places.
T = symbol(100.0, 0.0, 100.0)
files["radmatic-symbol-tight.svg"] = svg(T.width, 100.0, render(T))
files["radmatic-symbol-black.svg"] = sym_svg("#000", "#000")
files["radmatic-symbol-white.svg"] = sym_svg("#fff", "#fff")
files["radmatic-symbol-small.svg"] = sym_svg(INK, TEAL, small=True)
files["radmatic-app-icon.svg"] = sym_svg("#ffffff", "#7fd8c8", tile=TEAL)
# Phones round the corners themselves; Android crops maskable icons to a circle, so the mark keeps to its safe zone.
files["radmatic-icon-square.svg"] = sym_svg("#ffffff", "#7fd8c8", tile=TEAL, square=True)
files["radmatic-icon-maskable.svg"] = sym_svg("#ffffff", "#7fd8c8", tile=TEAL, square=True, inset=0.82)
files["radmatic-favicon.svg"] = sym_svg("#ffffff", "#7fd8c8", small=True, tile=TEAL)

# --- construction sheet for the wordmark
L = 'fill="none" stroke="#e0457b" stroke-width="0.7"'
D = L + ' stroke-dasharray="3 2.5"'
gx = pad
lines = [(G.base, "baseline"), (G.xh, "x-height  h"), (G.asc, "ascender  h·φ")]
guides = "".join(f'<line x1="0" x2="{n(W_)}" y1="{n(pad - G.top + y)}" y2="{n(pad - G.top + y)}" {D}/>'
                 f'<text x="{n(W_ + 4)}" y="{n(pad - G.top + y + 3)}" font-size="8" font-family="Helvetica" fill="#e0457b">{t}</text>' for y, t in lines)
ix, (dx, dy, dr) = G.i_x, G.dots[0]
guides += f'<circle cx="{n(gx+dx)}" cy="{n(pad-G.top+dy)}" r="{n(dr)}" {L}/>'
files["radmatic-construction.svg"] = svg(W_ + 90, H_, f'<rect width="{n(W_+90)}" height="{n(H_)}" fill="#fff"/>' + render(G, tx=pad, ty=pad - G.top) + guides)

for k, v in files.items():
    open(OUT + k, "w").write(v)
print("stroke", round(100/PHI**3, 2), "dot", round(100/PHI**2, 2), "width", round(G.width, 1))
