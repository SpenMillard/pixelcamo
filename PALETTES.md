# Pixelcamo — Palette Library

This file is the canonical palette reference for the application.
It supersedes the six placeholder palettes in `app-parts.jsx`.

All palettes are production-tuned. Hex values were developed iteratively
with visual validation — do not substitute or approximate.

---

## Camo palettes

These appear in the **Palette → Source** dropdown when Mode = Camo or Blend.

### Woodland
Five-colour temperate forest. Dark greens and earth browns.
```
#4a5240  #6b7a5e  #3d3028  #8a9278  #2e3a2a
```

### Desert
Warm tans and toffee browns. North African / Middle Eastern terrain.
```
#c8a96e  #a07840  #786040  #d4b888  #5a4830
```

### Urban
Neutral mid-greys. General built-environment use.
```
#7a7a7a  #555555  #9a9a9a  #3c3c3c  #b0b0b0
```

### Arctic
Cool blue-greys and off-whites. Snow and ice terrain.
```
#d8dce0  #a8b4bc  #eef2f4  #7a8a94  #c0c8cc
```

### Jungle
Deep saturated greens. Dense tropical / subtropical foliage.
```
#2d4a1e  #4a6a30  #1a2e14  #6a8a4a  #3a5a28
```

### Tarmac
Dark cool greys. Road surfaces, car parks, urban hardstanding.
```
#3a3a38  #282828  #4e4e4c  #1e1e1c  #626260
```

### Concrete
Mid warm greys. Paving, rendered walls, brutalist surfaces.
```
#8a8a82  #6e6e68  #a0a098  #545450  #bcbcb4
```

### Brick
Terracotta reds and dark earth browns. North European brick stock.
```
#7a4a38  #5c3428  #9a6248  #3e2218  #b87a5a
```

### Gravel
Warm mixed stone. Driveways, aggregate paths, ballast.
```
#7a7268  #5e5850  #948c80  #46423c  #aaa49c
```

### Soil
Dark earthy browns with charcoal. Disturbed urban ground.
```
#4a3828  #362818  #5e4c38  #241a10  #444444
```

### Midnight
Near-black blue-blacks. Very low-light / night operation.
```
#06070c  #0d0f18  #030408  #14161f  #020309
```

---

## Dazzle palettes

These appear when Mode = Dazzle. High-contrast geometric disruption
requires stark tonal separation — muted camo palettes are ineffective.

### Dazzle B/W
Pure black and white with dark and light greys.
```
#000000  #ffffff  #1a1a1a  #e0e0e0
```

### Dazzle Blue
Black, white, deep navy, steel blue.
```
#000000  #ffffff  #1a3a6e  #4a8ac8
```

### Dazzle Red
Black, white, deep crimson, bright red.
```
#000000  #ffffff  #8b0000  #cc2200
```

### Dazzle Gold
Black, amber gold, dark charcoal, pale cream.
```
#000000  #f5c400  #1a1a1a  #fff8d0
```

---

## Implementation notes

### Dropdown mapping
The Source dropdown in the Palette section should list:
- In Camo / Blend mode: Woodland, Desert, Urban, Arctic, Jungle, Tarmac,
  Concrete, Brick, Gravel, Soil, Midnight, Custom
- In Dazzle mode: B/W, Blue, Red, Gold, Custom

### Preset → palette defaults
When the user selects a preset, the palette resets to the preset's
associated palette and all sliders return to their default values.
Suggested preset-to-palette mapping:

| Preset            | Palette  |
|-------------------|----------|
| M81 Woodland      | Woodland |
| MARPAT Digital    | Jungle   |
| Flecktarn Mod     | Woodland |
| Razzle Dazzle     | Dazzle B/W |
| Urban Splinter    | Urban    |
| Norwegian Arctic  | Arctic   |
| Tiger Stripe      | Soil     |

### Swatches in Custom mode
When the user edits individual swatches, the Source dropdown
shows "Custom" and the preset name is preserved in the document
but flagged as modified. The .pcm format already supports this
(see `README.md §7`).

### Notes on excluded colours
The Concrete, Brick, Gravel, and Soil palettes intentionally
exclude any green tones. Earlier prototypes included greens but
they were removed for cleaner material specificity — each palette
should read unambiguously as its named material.
