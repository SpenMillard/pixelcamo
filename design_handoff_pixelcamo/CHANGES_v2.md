# Pixelcamo v2 — Change List

This file describes what changed between the v1 design (`Pixelcamo.html` +
`styles.css` + `app.jsx`) and the v2 design (`Pixelcamo v2.html` +
`styles-v2.css` + `app-v2.jsx`).

Apply these changes to your production codebase. The reference HTML files in
this folder are the visual ground truth — open both side-by-side to compare.

---

## Why this exists

The v1 design had two problems once running:

1. **Export bar overflow.** The bottom canvas export bar packed Size + W×H +
   DPI + mm readout + Format + Export button into one row that needed ~1100px
   of horizontal space. At the 960×620 minimum window size, the Export button
   was cut off.
2. **Density.** The whole app felt cramped — control sizes assumed a 13" laptop
   screen.

v2 addresses both, plus adds responsive toolbar behavior so the canvas
toolbar can never overflow either.

---

## What changed

### 1. Export panel moved (canvas footer → sidebar bottom)

**Removed:** the entire `<div className="export-bar">` that lived at the bottom
of the canvas pane.

**Added:** a new pinned "Export" section at the bottom of the sidebar,
**outside** the scrolling section list. It's a sibling of `.sidebar-scroll`,
not a child — so it stays visible regardless of how the user scrolls.

**Default state:** collapsed. The section header shows current format/DPI in
its badge (`PNG · 300dpi`). The toolbar's Export button covers the common
"just export now" case, so users don't need the section expanded for routine
work.

**Layout when expanded:** vertical stack (Size → W×H → DPI → mm readout →
Format → Export button), full-width inside the 340px sidebar. No horizontal
squeeze possible.

**CSS hooks** (in `styles-v2.css`):
```css
.section.export-section {
  background: linear-gradient(180deg, transparent 0%, rgba(232,149,42,0.025) 100%);
  border-top: 0.5px solid var(--line-2);
  margin-top: auto;
}
.export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.export-dim-row { display: flex; align-items: center; gap: 6px; }
.mm-readout { font-family: var(--mono); font-size: 10px; ... }
.btn.primary-export { height: 32px; width: 100%; justify-content: center; }
```

The sidebar element itself needs `display: flex; flex-direction: column` and
`.sidebar-scroll` needs `flex: 1` for the export section to sit at the bottom.

### 2. Toolbar gains a primary Export button

In the canvas toolbar's right-side button group, **replaced** the placeholder
Link button with an Export button (calls the same export action as the sidebar
button):

```jsx
<button className="btn toolbar-primary" title="⌘E">
  {Icon.download} <span className="btn-label">Export</span>
</button>
<button className="btn accent toolbar-primary" onClick={regenerate} title="Regenerate (⌘R)">
  {Icon.refresh} <span className="btn-label">Regenerate</span>
</button>
```

Wrap each button's label text in `<span className="btn-label">` so the
container query can collapse them to icon-only at narrow widths.

### 3. Responsive toolbar (CSS container queries)

The toolbar gracefully collapses content at narrow widths. Without this, the
canvas pane at minimum window size (960×620 - 340 sidebar = 620px wide) can't
fit the toolbar's natural ~810px of content.

```css
.canvas-toolbar {
  container-type: inline-size;
  container-name: toolbar;
}
.toolbar-left {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}
.toolbar-right { flex-shrink: 0; margin-left: auto; }
.crumb {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@container toolbar (max-width: 720px) {
  .crumb-secondary { display: none; }       /* drop "› Palette › 2-pass" */
}
@container toolbar (max-width: 600px) {
  .toolbar-tile .btn-label { display: none; }
  .toolbar-seed { display: none; }
}
@container toolbar (max-width: 500px) {
  .toolbar-primary .btn-label { display: none; }
  .toolbar-primary { width: 30px; padding: 0; justify-content: center; }
}
```

In the JSX, wrap the secondary crumb parts in a single span so the query can
hide them together:

```jsx
<span className="crumb">
  <span className="doc">{preset}</span>
  <span className="crumb-secondary">
    <span className="sep">›</span><span>{paletteName}</span>
    <span className="sep">›</span><span>{passes}-pass</span>
  </span>
</span>
```

Tip for the developer: container queries need `container-type: inline-size`
on the ancestor. Make sure the toolbar element has it. Supported in all
evergreen browsers and Safari 16+ — fine for an Electron/pywebview shell.

### 4. Looser density

Pure CSS token changes — apply globally:

| Token | v1 | v2 |
|---|---|---|
| `--sidebar-w` | 320px | **340px** |
| `--toolbar-h` | 44px | **52px** |
| `--row-h` | 28px | **30px** |
| `--section-pad` | 14px | **16px** |
| `--footer-h` | 56px | **0** (removed) |

Control size bumps:

| Control | v1 | v2 |
|---|---|---|
| `.btn` height | 24px | **26px** |
| `.input` height | 24px | **26px** |
| `.select` height | 24px | **26px** |
| `.slider` height | 22px | **24px** |
| `.passes button` | 28×22 | **32×24** |
| `.btn.icon-only` width | 24px | **26px** |
| Control radius | 4px | **5px** |

Section header changes:

| Property | v1 | v2 |
|---|---|---|
| Header height | 32px | **38px** |
| Title size | 10.5px | **11px** |
| Title letter-spacing | 0.08em | **0.1em** |
| Badge size | 9.5px | **10px** |
| Header background | linear-gradient sheen | **transparent** |
| Body bottom padding | 14px | **18px** |
| Body row gap | 8px | **10px** |

### 5. Misc

- The bottom canvas-toolbar **Link button** was a placeholder novelty in v1 —
  removed in v2.
- Default `open.export` state: `false` (collapsed).
- All other section defaults unchanged: `pattern/palette/params/texture: true`,
  `harmony: false`.

---

## Verification checklist

After porting, verify:

- [ ] Window resizes from 1200×760 → 960×620 with no element overflow at any
      size in between.
- [ ] The toolbar Regenerate button is always visible.
- [ ] At 1200×760, the breadcrumb shows `Preset › Palette › N-pass`. At
      smaller widths it truncates to just the preset name.
- [ ] At minimum 960×620, the toolbar buttons collapse to icon-only without
      the toolbar wrapping.
- [ ] The Export section in the sidebar stays pinned at the bottom; it does
      not scroll away when the user scrolls the rest of the sidebar.
- [ ] Pattern, Palette, Parameters, Texture sections are all visible at 760px
      window height without scrolling (when their bodies are open and Harmony
      is collapsed).
- [ ] Clicking Export in the toolbar and Export in the sidebar trigger the
      same action.
