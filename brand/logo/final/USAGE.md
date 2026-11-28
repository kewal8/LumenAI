# Radmatic logo

**Idea:** "radmatic" in calm, round letters. The dot on the i is teal: the one finding that matters. That is how the product works: you say only the abnormal finding, and everything else stays normal.

## Files

| File | Use |
|---|---|
| `radmatic-wordmark.svg` | The logo. Use it wherever there is room. |
| `radmatic-wordmark-black.svg` / `-white.svg` | One colour: print, fax, stamps, embossing. |
| `radmatic-wordmark-reversed.svg` | White letters with a light-teal dot, on dark or teal backgrounds. |
| `radmatic-symbol.svg` | The r and its dot, for square places where the word does not fit. |
| `radmatic-symbol-tight.svg` | The same, cropped to the mark: for navigation bars and small headers. |
| `radmatic-symbol-small.svg` | A heavier r and dot for 32 px and below. |
| `radmatic-app-icon.svg` | The app icon: a teal tile with a white r and light-teal dot. |
| `radmatic-icon-square.svg` / `-maskable.svg` | Phone home-screen icons (the phone rounds the corners). |
| `radmatic-favicon.svg` | Browser tab icon, from the small version. |
| `radmatic-construction.png` | How the logo is drawn. |
| `make_logo.py` | Rebuilds every file above from the rules below. |

In the app, navigation bars and small headers use `<LogoMark />` (the icon); large places such as the landing footer use `<Wordmark />`. Both come from `src/components/brand/Logo.tsx`. The letters take the text colour, so they follow light and dark mode. The dot is always `--c-teal`.

## Golden-ratio construction (φ = 1.618)

Everything comes from the x-height **h**:

- **Stroke** = h / φ³ (0.236 h).
- **Ascender** (top of the d, the dot) = h · φ above the baseline. So x-height : full height = 1 : φ.
- **The dot's diameter** = stroke × φ = h / φ². Its top sits on the ascender line. That leaves exactly one stroke of space above the i.
- **The r's shoulder** has an outer radius of h / φ. That makes the r a golden rectangle.
- **The t** is h + h / φ² tall, and its crossbar is h / φ long.
- **The m's arches** are the same width as the a and d bowls. Round letters overshoot the lines by 1.5 %, so they look the same size as the straight ones.
- **The icon:** the mark is the tile's width / φ wide.

## Colour

| | HEX | RGB | Use |
|---|---|---|---|
| Ink | `#0B1F1D` | 11 31 29 | The letters |
| Teal | `#0F766E` | 15 118 110 | The dot; icon tiles |
| Light teal | `#7FD8C8` | 127 216 200 | The dot on teal or dark backgrounds |
| Dark-mode teal | `#5CCBB9` | 92 203 185 | The dot in the app's dark mode |

## Rules

- **Clear space:** keep at least the height of the dot clear on every side.
- **Smallest sizes:** the wordmark at 72 px wide on screen (18 mm in print). Below that, use the symbol. Below 32 px, use the small symbol.
- **Don't:**
  - colour the letters teal;
  - make the dot any colour other than teal (or white, or black, in a one-colour version);
  - stretch, outline or add a shadow;
  - set "radmatic" in a font instead of using the file;
  - put the symbol and the wordmark side by side, because the r and dot would show twice.

## Still open

- Trademark: search "Radmatic" and the mark in the Indian trademark registry (and WIPO) before printing anything.
- The letters are drawn by hand from geometry. They are not a font, so there is no font licence to worry about.
