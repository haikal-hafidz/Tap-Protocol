"""Generate the TAP Protocol app icons (original artwork, drawn from shapes, no fonts, no emoji).
Dev tool only. Run: python3 tools/make-icons.py   (needs Pillow). Output goes to icons/.
Motif: the game's status window (double frame, brass corner marks) around a brass T monogram.
"""
from pathlib import Path
from PIL import Image, ImageDraw

BG, PANEL, EDGE, SYS, BRASS = '#12141b', '#1a1d28', '#2e3447', '#7fb0d6', '#c4a15c'
OUT = Path(__file__).resolve().parent.parent / 'icons'
S = 2048  # draw large, then downscale for smooth edges


def draw(maskable):
    img = Image.new('RGB', (S, S), BG)
    d = ImageDraw.Draw(img)
    # Maskable icons: all content inside the central 80 percent safe zone (we use about 62 percent).
    m = 0.19 if maskable else 0.09
    x0, y0, x1, y1 = [int(S * v) for v in (m, m, 1 - m, 1 - m)]
    w = x1 - x0
    d.rectangle([x0, y0, x1, y1], fill=PANEL, outline=SYS, width=int(S * 0.010))
    inset = int(w * 0.045)
    d.rectangle([x0 + inset, y0 + inset, x1 - inset, y1 - inset], outline=EDGE, width=int(S * 0.006))
    # brass corner marks (top-left and bottom-right, like the .window element)
    c, t = int(w * 0.17), int(S * 0.016)
    d.rectangle([x0 - t // 2, y0 - t // 2, x0 + c, y0 + t // 2 + t], fill=BRASS)
    d.rectangle([x0 - t // 2, y0 - t // 2, x0 + t // 2 + t, y0 + c], fill=BRASS)
    d.rectangle([x1 - c, y1 - t // 2 - t, x1 + t // 2, y1 + t // 2], fill=BRASS)
    d.rectangle([x1 - t // 2 - t, y1 - c, x1 + t // 2, y1 + t // 2], fill=BRASS)
    # T monogram: top bar, stem, and a small system-blue square under the bar's right end
    cx = (x0 + x1) // 2
    bar_w, bar_h = int(w * 0.56), int(w * 0.13)
    top = y0 + int(w * 0.24)
    d.rectangle([cx - bar_w // 2, top, cx + bar_w // 2, top + bar_h], fill=BRASS)
    stem_w, stem_h = int(w * 0.15), int(w * 0.42)
    d.rectangle([cx - stem_w // 2, top + bar_h, cx + stem_w // 2, top + bar_h + stem_h], fill=BRASS)
    q = int(w * 0.075)
    qx, qy = cx + bar_w // 2 - q, top + bar_h + int(w * 0.05)
    d.rectangle([qx, qy, qx + q, qy + q], fill=SYS)
    return img


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)


OUT.mkdir(exist_ok=True)
a, mk = draw(False), draw(True)
save(a, 'icon-192.png', 192)
save(a, 'icon-512.png', 512)
save(mk, 'icon-maskable-512.png', 512)
save(a, 'apple-touch-icon.png', 180)
save(a, 'favicon-32.png', 32)
print('icons written to', OUT)
