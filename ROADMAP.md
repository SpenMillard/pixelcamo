# Pixelcamo — Roadmap & Architecture Notes

Suggestions for taking Pixelcamo beyond the v1 design in `README.md`. These are
opinions, not requirements — pick what fits your scope and ship the rest later.

This file is meant to be read **alongside** `README.md`. The README describes what
to build first; this file describes what's worth building next and what
architectural choices set you up for it.

---

## 1. The big architectural call: one renderer, two surfaces

The v1 spec implies two implementations — JS for live preview, Python/NumPy for
export. **You will fight drift forever:** different RNGs, different float
behavior, edge-case off-by-ones, "why doesn't the exported PNG match what I saw
on screen?"

### Recommended approach

**Write the pattern kernel once, in Rust. Compile it to both targets:**
- **WASM** for the live preview in the webview (`wasm-bindgen` → loaded by the
  frontend, called from JS).
- **Native `.dylib` / `.so` / `.dll`** for the export pipeline (called from
  the desktop shell via FFI).

Same bytes in, same bytes out. The seed-parity question disappears. Performance
is good enough that you can drop pixel-scale to 1px without lag, and the export
path stops needing NumPy entirely.

### Consequences for the desktop shell

If you commit to a Rust kernel, **Tauri starts looking better than pywebview**
for the shell:
- Rust-native, so the kernel lives alongside the shell with no IPC.
- Native macOS `NSMenu` via Tauri's menu API (less PyObjC plumbing than
  pywebview).
- Smaller binaries, faster startup.
- Code-signing and notarization built into `tauri build`.

`pywebview` is fine for a 1-week MVP. For anything you'd sell or hand to other
people, Tauri+Rust is the modern answer for a generative graphics tool.

### Alternative shells, ranked

| Shell | Pros | Cons |
|---|---|---|
| **Tauri (Rust + webview)** | Small, fast, native menus, signing baked in. Pairs perfectly with a Rust kernel. | Team needs some Rust comfort. |
| **Electron + Rust kernel** | Mature, well-trodden, easiest hiring. | ~150MB binaries vs Tauri's ~10MB. |
| **pywebview + Python** | Fastest to scaffold. Good for v1. | Drift problems above. Menu fidelity is weak on macOS. |
| **SwiftUI native** | Best macOS feel possible. | Mac-only, slower UI iteration, harder cross-platform later. |
| **Briefcase / Toga** | Python-native packaging. | Limited UI primitives — would force you to abandon the current design language. |

---

## 2. Seed parity (preview ↔ export)

If you do not adopt the Rust+WASM kernel and stay with the JS preview / Python
export split, here are the fallback options ranked:

1. **Render the preview by calling Python.** The webview asks the backend to
   render a low-res PNG and displays it. Truly identical to export. **Cost:** UI
   feels laggy under slider drag without aggressive debouncing + a worker pool.
2. **Port Mulberry32 to Python verbatim + reimplement the algorithm with
   identical iteration order and float semantics.** Possible but fragile —
   floats diverge across platforms, the algorithm will need a frozen "v1 spec"
   to lock down forever.
3. **Accept divergence.** Document it. Tell users "the preview is a guide; the
   export is the truth." Acceptable for many creative tools but disappointing
   for a deterministic-RNG tool.

(1) is correct if you stay in Python. (2) is correct only if you commit to
freezing the algorithm. (3) is honest and may be fine.

---

## 3. Features that change what the tool *is*

These are the differentiators — without these, Pixelcamo is "another pattern
maker." With them, it has a point of view.

### 3.1 Per-swatch locks (★ highest leverage)

Click a small padlock on a swatch → reroll keeps that color, randomises the
rest. Single best feature in any generative tool I've used. Tiny scope,
disproportionate UX value.

**UI:** small lock icon top-left of each swatch on hover; click to toggle;
locked swatches show a persistent lock badge and a subtle amber outline.

**State:** add `locked: bool[]` parallel to the palette array. The kernel
treats locked indices as fixed and only generates over the rest.

### 3.2 Variations grid

Press `V` (or click a "Variations" button) → the canvas is replaced by a 3×3
grid of pattern variants generated from neighbouring seeds. Click one to
commit; press `V` again to dismiss.

Designers compare; they don't pick blindly. Anything that makes comparison
cheap is gold.

**Cost:** 9× the render work for the duration of the overlay — trivial with a
WASM kernel.

### 3.3 Sample palette from an image

Drag-drop a photo onto the palette section → run k-means in the kernel → fill
the palette with 4–8 extracted colors. Pairs naturally with the "I want camo
that hides against *this* environment" use case.

**Implementation:** `image-rs` crate in Rust does the decode; ship a tiny
k-means impl alongside the camo kernel.

### 3.4 Two-scale camo

Real MARPAT-style digital camo is **macro blobs + micro disruptor pattern on
top**. Add a second "micro scale" slider and a "micro weight" slider; render
the small pattern on top of the large one with a configurable color shift.

Suddenly the output looks like actual issued camo instead of generic Voronoi
art. Small algorithm change, large perceptual change.

### 3.5 Vector / SVG export

Same pattern, infinitely scalable, no raster artifacts. The user base splits
cleanly:
- **Raster path** (PNG/PDF at DPI): photographers, digital comp work, screen.
- **Vector path** (SVG/EPS): cutting machines, embroidery, large-format print,
  screen printing, laser cutting.

The Voronoi/run-length representation is already vector-friendly — each
palette region is a polygon. The hard part is *texture overlays* (stipple,
hatch, scratch) — those need to be expressed as vector primitives, not raster
overlays. Stipple = `<circle>` elements; hatch = `<line>`; scratch = same.
Doable, just deliberate.

### 3.6 History scrubber

Save every parameter change to a local timeline. Bottom of the window: a
horizontal strip of mini-thumbnails, one per state. Drag to scrub back. Cheap
to build (each state is just a JSON snapshot + a 64×64 thumb), huge for trust
— users stop being afraid to experiment.

**Storage:** SQLite per-document, or just an in-memory ring buffer of the last
200 states with thumbnails generated by the kernel.

### 3.7 Effectiveness score

Composite the current pattern against a reference background photo at a
configurable simulated distance. Compute:
- **Mean luminance contrast** to the background (lower = better hiding).
- **Edge entropy** (high frequency content masks silhouette edges).
- **Color distance** in CIELAB space.

Surface a 0–100 score. Even if rough, it makes the tool **opinionated** rather
than just generative. Lets you say "this preset scored 73/100 against
deciduous forest at 50m" — that's marketing copy that means something.

---

## 4. Pro-tool polish

The details that separate "indie utility" from "I'd pay for this."

### 4.1 Command palette (⌘K)

Every modern pro tool has one. Inventory all menu commands + presets + tweaks
into a searchable palette. Cheap to add (a sliding modal over the window with
a search input and a list of `{label, shortcut, action}` rows), instantly
raises the perceived ceiling of the app.

### 4.2 Tileable preview as actual 3×3 repeat

The v1 design shows dashed seam guides. Take it further: a `Preview Tile`
button replaces the canvas with the rendered 3×3 repeat so you can *see* the
seam. This is the only way to evaluate whether a tile actually works.

Keep the dashed-guide overlay as a separate cheaper toggle for moment-to-moment
work.

### 4.3 Onion-skin diff

When the user changes a slider, briefly composite the previous pattern at 30%
opacity over the new one for ~400ms. They see *what changed*, not just the new
state. Disorientation is the enemy of generative tools.

### 4.4 Project files (multi-pattern documents)

`.pcm` files in v1 hold a single pattern. Real designers work in **capsules**
— a coordinated family of 3–8 patterns (a primary, a complementary, a
"night" variant, etc.).

Change `.pcm` to hold an array of patterns + cross-references between them
(shared palette, derived seed, etc.). The sidebar gets a top-level "Documents"
strip listing the patterns in the current capsule.

### 4.5 Print production extras

For PDF export, add:
- Crop marks
- Bleed (3mm default)
- Color bar (the 8 palette swatches as printed reference)
- Optional **Pantone-nearest mapping** — for each palette color, find the
  closest Pantone Solid Coated chip and list both. Pure-print users will pay
  for just this feature.

### 4.6 Batch / scriptable export

A CLI: `pixelcamo render document.pcm --size 4961x3508 --dpi 300 --out out.png`

Lets users automate pattern generation in build pipelines, on a CI box, etc.
Pairs naturally with a Rust kernel — the CLI is just another consumer of the
same library.

---

## 5. Things to resist

Not every "good idea" belongs in this tool. A few worth avoiding:

- **Cloud sync, accounts, sharing galleries.** Adds backend cost,
  authentication, GDPR exposure, and changes the product category from "indie
  creative utility" to "SaaS." If you go one-time-purchase, these are
  anti-features. Save them for a sequel product if at all.
- **AI / ML "generate camo from a prompt."** Tempting. But it *dilutes the
  deterministic seeded-RNG identity* — the whole appeal of Pixelcamo is that
  the same seed always produces the same output. Generative AI is the
  opposite. If you want it, it's a different product.
- **Plug-in API for third-party algorithms.** Sounds good in a roadmap, ends
  up dominating the codebase's design constraints for a tiny actual user
  population. Defer until you have a clear customer asking for it.
- **Mobile / iPad version.** Pixelcamo's UI density doesn't translate. A
  mobile sibling app would be a separate product with a separate design.

---

## 6. Sequencing

If I had to pick three items for the **next milestone after v1 ships**:

1. **Rust + WASM kernel.** Fixes seed parity, unlocks performance, enables
   everything in §3 and §4.
2. **Per-swatch locks.** Highest UX leverage for the lowest scope.
3. **Variations grid.** Comparison is the bottleneck of every generative
   workflow.

Everything else is icing. Ship those three and Pixelcamo stops being "a camo
maker" and starts being "the camo tool."

---

## 7. Open questions to answer before scoping milestone 2

- Who is the target user? Textile designer, indie game dev, illustrator,
  cosplay/prepper hobbyist, military/contractor? The answer changes which
  features in §3–4 matter most.
- One-time purchase or subscription? Affects whether cloud features are even
  worth considering.
- Mac-only or cross-platform? Tauri does both for free; pywebview does too but
  poorly. SwiftUI locks you to Mac.
- How long until the export format must be frozen? Once people have `.pcm`
  files in the wild, schema changes get expensive.

Answer those four and the rest of the roadmap orders itself.
