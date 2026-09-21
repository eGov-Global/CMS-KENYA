#!/usr/bin/env python3
"""Produce the final Bomet login-backdrop variant set.

Decisions, with the reasoning that the numbers forced:

* Render ABOVE the source width (2560/1920 from a 1376px source), even though
  that adds bytes without adding detail. The first version of this script
  capped at the native 1376px on exactly that "don't waste bytes" reasoning,
  and it was wrong: a 1920px window then upscales 1.40x in the browser, and a
  2x display far more. Browser upscaling is bilinear with no sharpening, and
  it read as visibly soft and grainy. Resampling up here with LANCZOS plus a
  mild unsharp mask hands the browser a file at or above the display size, so
  it downsamples (sharp) rather than upsamples (soft).
* Quality varies per size (q68 at 2560, q80 at 1920, q84-86 below) so each
  variant lands under the 250KB-per-fetch budget. A smaller render affords
  more quality per pixel within the same budget.
* Per-breakpoint renders so a phone fetches 62KB, not 242KB. This is the
  single biggest real-world win for Bomet citizens on low-end Android.
* JPEG fallback renders at 1600px, not 1920: JPEG cannot reach 250KB at 1920
  without visible loss. It only serves browsers with no WebP support.

Usage: encode-login-bg.py <source-image> [out-dir]
"""
import math
import os
import sys

from PIL import Image, ImageFilter

Image.init()

if len(sys.argv) < 2:
    sys.exit("usage: encode-login-bg.py <source-image> [out-dir]\n"
             "  out-dir defaults to public/brand/ relative to the repo's\n"
             "  digit-ui-esbuild workspace.")

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), os.pardir, "public", "brand")
os.makedirs(OUT, exist_ok=True)

src = Image.open(SRC).convert("RGBA")
src = Image.alpha_composite(Image.new("RGBA", src.size, (255, 255, 255, 255)), src).convert("RGB")
SW, SH = src.size


def psnr(a, b):
    pa, pb = a.load(), b.load()
    w, h = a.size
    tot = 0.0
    n = 0
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            ra, ga, ba = pa[x, y]
            rb, gb, bb = pb[x, y]
            tot += (ra - rb) ** 2 + (ga - gb) ** 2 + (ba - bb) ** 2
            n += 3
    mse = tot / n
    return 99.0 if mse == 0 else 10 * math.log10(65025.0 / mse)


def emit(name, width, fmt, **kw):
    h = round(width * SH / SW)
    im = src if width == SW else src.resize((width, h), Image.LANCZOS)
    # Mild unsharp mask to restore the acutance any resample costs. Restrained
    # on purpose: heavier settings put halos on tree lines and ridge edges,
    # and halos are high-frequency detail the encoder must spend bytes on.
    im = im.filter(ImageFilter.UnsharpMask(radius=1.1, percent=55, threshold=3))
    p = os.path.join(OUT, name)
    im.save(p, fmt, **kw)
    kb = os.path.getsize(p) / 1024.0
    back = Image.open(p).convert("RGB")
    print("  %-30s %5dx%-5d %8.1f KB   PSNR %.1f dB" % (name, im.size[0], im.size[1], kb, psnr(im, back)))
    return kb


print("source %dx%d\n" % (SW, SH))
# Quality differs per size on purpose: a smaller render affords more quality
# per pixel inside the same byte budget. Every WebP variant must land <=250KB.
t = 0
t += emit("bomet-login-bg-2560.webp", 2560, "WEBP", quality=68, method=6)
t += emit("bomet-login-bg.webp", 1920, "WEBP", quality=80, method=6)
t += emit("bomet-login-bg-1280.webp", 1280, "WEBP", quality=84, method=6)
t += emit("bomet-login-bg-640.webp", 640, "WEBP", quality=86, method=6)
# JPEG cannot hit 250KB at 1920 without visible loss, so render it smaller.
t += emit("bomet-login-bg.jpg", 1600, "JPEG", quality=82, optimize=True, progressive=True)
print("\ntotal on disk %.1f KB" % t)
print("source was %.1f KB PNG" % (os.path.getsize(SRC) / 1024.0))
