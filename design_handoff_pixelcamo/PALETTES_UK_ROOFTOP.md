# Pixelcamo — UK Rooftop Palette Library (Addendum)

This file extends `PALETTES.md` with palettes for the Aerial/Rooftop mode.
Append these entries to the existing PALETTES.md in the repo.

All values are calibrated against aerial photographic reference and UK roofing
industry material specifications. They represent typical *aged/weathered* appearance
as seen from altitude — not showroom-fresh colours. New materials always look
different from how they read at 50–500m after 5+ years of weathering.

---

## UK Rooftop palettes

These palettes appear in the **Palette → Source** dropdown when Mode = Aerial.
Each palette has four swatches: light zone, mid zone, dark/shadow zone, stain/algae.

---

### UK Welsh Slate
Blue-grey tones of Penrhyn and Ffestiniog quarries. Dominant across Wales,
northern England, and Scotland. Distinctly cooler and more blue-purple than
any concrete or fibre cement substitute.
```
#8888a0  #707080  #585868  #404048
```
Notes: swatch 1 = sun-facing faces + lichen; swatch 2 = standard aged slate;
swatch 3 = shadow faces and wet slate; swatch 4 = ridge mortar and deep shadow.

---

### UK Clay Plain Tile
Characteristic of southern and central England, conservation areas, and
pre-war housing stock. Heavily weathered — lichen and biological growth pull
the colour well away from fresh terracotta toward muted brown-grey.
The warmth is there but subdued.
```
#a07060  #906858  #7a6858  #504038
```
Notes: swatch 1 = sheltered south-facing tiles; swatch 2 = typical aged surface;
swatch 3 = lichen-dominated north-facing areas; swatch 4 = ridge tiles and valleys.

---

### UK Pantile (Clay)
East coast profile — Lincolnshire, Norfolk, Yorkshire, parts of Scotland.
Historic Dutch import influence. Barrel profile creates strong directional
shadow at sun angles above ~30°, which must be simulated in the shadow layer.
Colour is similar to plain tile but barrel highlights add a lighter tone.
```
#b08878  #906858  #786050  #4a3830
```
Notes: swatch 1 = barrel highlight (catches direct light); swatch 2 = mid tile body;
swatch 3 = inter-tile shadow trough; swatch 4 = mortar, valley, ridge shadow.

---

### UK Concrete Interlocking Tile
Most widespread material on post-war and modern UK housing stock nationwide.
Colours vary by manufacturer but weather to a fairly consistent mid grey-brown
after 10–15 years. Sandtoft, Marley, and Redland dominate. Smooth surface
reads more uniformly than clay at altitude — less tonal variation per tile.
```
#908880  #787068  #605850  #484038
```
Notes: swatch 1 = lighter grey/buff variants (Antique, Sandfaced); swatch 2 = standard
weathered brown-grey; swatch 3 = darker weathered or shadow faces; swatch 4 = pointing.

---

### UK Fibre Cement Slate
Common on new builds and extensions as cost-effective slate substitute.
Reads distinctly flatter and more uniform than real Welsh slate at altitude —
less colour variation across a roof. Has a slight warm grey cast rather than
the blue-purple of genuine slate.
```
#909098  #787880  #606068  #484850
```
Notes: swatch 1 = lighter fibre cement variants; swatch 2 = standard weathered;
swatch 3 = shadow/north-facing; swatch 4 = valley and ridge detail.

---

### UK Flat Bitumen / Torch-On Felt
Traditional UK flat roof — still dominant on older commercial stock, garages,
and industrial. Mineral-surfaced cap sheet adds slight warm aggregate texture
over near-black base. Lap joints are a distinctive horizontal banding feature.
```
#2a2820  #38342c  #46423a  #1e1c16
```
Notes: swatch 1 = standard aged bitumen; swatch 2 = mineral-surfaced cap sheet;
swatch 3 = bleached/sun-degraded areas; swatch 4 = fresh torch-on or deep shadow.

---

### UK Flat EPDM Rubber
Now the most common domestic flat roof in the UK (extensions, dormers, garages).
Distinctive cool dark grey — not as warm as bitumen, and importantly not as
blue-cool as UPVC. Single sheet means very few seam lines visible from altitude.
Dark colour slightly increases heat absorption — appears warmer in thermal imagery.
```
#4e4e56  #686874  #38383e  #28282e
```
Notes: swatch 1 = typical aged EPDM; swatch 2 = lighter/greyer variants (ClassicBond);
swatch 3 = newer or darker installations; swatch 4 = deep shadow at parapet edge.

---

### UK Flat GRP Fibreglass
Increasingly common on domestic extensions. Hard, shiny surface is distinctly
lighter than bitumen or EPDM — almost cream-grey. Gel coat weathers to a
slightly chalky surface. Very uniform from altitude — no aggregate texture,
minimal seam lines, occasionally shows slight colour banding from laying direction.
```
#c8c4b8  #b0ac9c  #989488  #787470
```
Notes: swatch 1 = typical light GRP gel coat; swatch 2 = mid-aged surface;
swatch 3 = older/more weathered; swatch 4 = drainage shadow and edge detail.

---

### UK Flat Aggregate (Stone Chippings)
Found on older commercial/industrial flat roofs — loose stone chippings applied
over bitumen or built-up felt. Aggregate colour varies by region: limestone
chippings (cream-warm) in southern England, flint/gravel (mixed grey-brown)
in East Anglia, granite chips (cool grey) in Scotland.
```
#b0a898  #908880  #706860  #504840
```
Notes: swatch 1 = limestone/light aggregate; swatch 2 = mixed gravel (most common);
swatch 3 = darker flint/basalt aggregate; swatch 4 = wet areas and drainage shadow.

---

### UK Shadow / Drainage Stain
Explicit shadow layer palette — used for all printed trompe-l'œil shadow
and drainage stain passes regardless of underlying material. Not warm black —
real aerial shadows have a slight warm-dark or olive cast from scattered light.
```
#1e1c14  #282418  #38342a  #404838
```
Notes: swatch 1 = parapet / hard shadow edge; swatch 2 = mid shadow body;
swatch 3 = soft shadow edge / penumbra; swatch 4 = algae-influenced drainage stain.

---

## Regional deployment guide

| Region | Dominant pitched material | Dominant flat material |
|--------|--------------------------|----------------------|
| Wales / N. England / Scotland | Welsh slate | Bitumen / EPDM |
| Southern England (pre-war) | Clay plain tile | Bitumen / EPDM |
| East coast (Norfolk, Lincs, Yorks) | Clay or concrete pantile | Bitumen |
| Nationwide post-war housing | Concrete interlocking | EPDM / GRP |
| Modern new builds (nationwide) | Fibre cement slate or concrete | EPDM / GRP |
| Industrial / commercial | N/A (usually flat) | Bitumen aggregate / EPDM |

---

## Tile geometry parameters (for pattern generator)

Each tile type requires a set of geometric parameters for the repeat unit.
These values represent typical UK stock dimensions.

### Welsh Slate
```
tile_w: 300–500mm (variable — random within range adds realism)
tile_h: 200–300mm
lap: 75–100mm (vertical overlap)
margin: 5–8mm (side gap / no margin — butt joint)
profile: flat
bond: broken bond (staggered half-tile offset every row)
colour_variation: high (each tile slightly different — ±15% lightness)
```

### Clay Plain Tile
```
tile_w: 165mm (standard UK plain tile)
tile_h: 265mm
lap: 65mm
margin: 3mm
profile: flat with slight camber
bond: broken bond
colour_variation: very high (±25% — handmade variation is the character)
```

### Clay / Concrete Pantile
```
tile_w: 335mm
tile_h: 390mm
lap: 75mm
margin: 25mm (side lap)
profile: S-curve barrel — rendered as 3 horizontal ellipse arcs per tile
peak_offset: +8px (barrel highlight lighter tone)
trough_offset: -10px (inter-tile shadow)
bond: straight bond (columns run vertically — NOT staggered)
colour_variation: medium (±15%)
```

### Concrete Interlocking Tile
```
tile_w: 420mm (double Roman / Redland 50 style)
tile_h: 330mm
lap: 75mm
margin: 30mm
profile: low-profile with single raised rib — rendered as a faint light line
bond: broken bond
colour_variation: low (±8% — uniform manufacture)
```

### Fibre Cement Slate
```
tile_w: 600mm
tile_h: 300mm
lap: 90mm
margin: 3mm
profile: flat
bond: broken bond
colour_variation: low (±5%)
```

---

## Implementation notes for Claude Code

### Dropdown mapping
In Aerial mode, the Source dropdown should show:
Welsh Slate / Clay Plain Tile / Clay Pantile / Concrete Interlocking /
Fibre Cement Slate / Flat Bitumen / Flat EPDM / Flat GRP /
Flat Aggregate / Custom

### Flat vs pitched distinction
Flat roof palettes (Flat Bitumen, Flat EPDM, Flat GRP, Flat Aggregate)
trigger the flat-roof generator path — zone-based, no tile repeat pattern.
Pitched palettes (Welsh Slate, Clay Plain Tile, Clay Pantile,
Concrete Interlocking, Fibre Cement Slate) trigger the tile pattern generator.
The app detects this from the palette name prefix.

### Tile pattern generator render path
For pitched palettes, `renderer.py` should use `_render_tiles()` instead of
`_render_camo()`. See AERIAL_MODE_SPEC.md for the full implementation brief.
