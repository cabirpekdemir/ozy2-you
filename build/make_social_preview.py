from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 640
img = Image.new("RGBA", (W, H), "#080a10")

# Gradient blob — top left blue
for r in range(320, 0, -8):
    alpha = int(28 * (1 - r / 320))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).ellipse([-60, -60, r * 2 - 60, r * 2 - 60], fill=(79, 142, 247, alpha))
    img = Image.alpha_composite(img, ov)

# Gradient blob — bottom right purple
for r in range(280, 0, -8):
    alpha = int(22 * (1 - r / 280))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).ellipse([W - r * 2 + 40, H - r * 2 + 40, W + 40, H + 40], fill=(168, 85, 247, alpha))
    img = Image.alpha_composite(img, ov)

draw = ImageDraw.Draw(img)

# Fonts
try:
    font_xl = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 100)
    font_lg = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 48)
    font_md = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 28)
    font_sm = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 22)
except Exception:
    font_xl = font_lg = font_md = font_sm = ImageFont.load_default()

# ── Left side ──────────────────────────────────────
# Logo
draw.text((100, 110), "OZY", font=font_xl, fill="#f97316")
ozy_w = int(draw.textlength("OZY", font=font_xl))
draw.text((100 + ozy_w, 110), "2", font=font_xl, fill="#4f8ef7")

# Tagline
draw.text((100, 235), "Your personal AI assistant.", font=font_lg, fill="#e8eaf2")
draw.text((100, 295), "Local-first · 38 tools · Mac · Windows · Linux", font=font_md, fill="#5a6380")

# Divider
draw.line([(100, 360), (660, 360)], fill="#1e2130", width=1)

# Feature pills
pills = [
    ("🔒 100% Local", "#4f8ef7"),
    ("🤖 Any AI Model", "#a855f7"),
    ("⚡ 38 Tools", "#f97316"),
    ("🆓 Free", "#22c55e"),
]
px, py = 100, 388
for label, accent in pills:
    tw = int(draw.textlength(label, font=font_sm))
    pad = 14
    draw.rounded_rectangle([px, py, px + tw + pad * 2, py + 38], radius=19,
                            fill="#13161f", outline=accent, width=1)
    draw.text((px + pad, py + 8), label, font=font_sm, fill="#e8eaf2")
    px += tw + pad * 2 + 12

# URL
draw.text((102, 575), "ozy2.com  ·  github.com/cabirpekdemir/ozy2", font=font_sm, fill="#3a4060")

# ── Right side — mock chat window ──────────────────
bx, by, bw, bh = 800, 80, 400, 460
draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=18, fill="#0e1118", outline="#1e2130", width=1)

# Title bar
draw.rounded_rectangle([bx, by, bx + bw, by + 40], radius=18, fill="#13161f")
draw.rectangle([bx, by + 22, bx + bw, by + 40], fill="#13161f")
for ci, col in enumerate(["#f43f5e", "#f59e0b", "#22c55e"]):
    draw.ellipse([bx + 16 + ci * 22, by + 13, bx + 28 + ci * 22, by + 27], fill=col)
draw.text((bx + 80, by + 11), "OZY2", font=font_sm, fill="#5a6380")

# Messages
msgs = [
    ("What's Apple stock today?", True),
    ("🍎 AAPL: $213.07 ▲ +1.2%", False),
    ("Summarize latest AI news", True),
    ("📰 Found 5 articles…", False),
    ("Add task: review PR tomorrow", True),
    ("✅ Task added with priority!", False),
]
my = by + 56
for text, is_user in msgs:
    tw = int(draw.textlength(text, font=font_sm))
    tw = min(tw, 300)
    pad = 10
    if is_user:
        rx = bx + bw - tw - pad * 2 - 14
        draw.rounded_rectangle([rx, my, rx + tw + pad * 2, my + 32], radius=10, fill="#4f8ef7")
        draw.text((rx + pad, my + 6), text, font=font_sm, fill="#fff")
    else:
        draw.rounded_rectangle([bx + 14, my, bx + 14 + tw + pad * 2, my + 32], radius=10, fill="#1e2130")
        draw.text((bx + 14 + pad, my + 6), text, font=font_sm, fill="#e8eaf2")
    my += 46

out = "/Users/cabirpekdemir/Ozy2/landing/social_preview.png"
img.convert("RGB").save(out, "PNG")
print(f"✅ Saved: {out}  ({W}x{H}px)")
