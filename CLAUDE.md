# WavCash Project Memory

## Frosted Glass Effect

**The correct implementation is 3 properties per element:**
```css
background: var(--bg-surface);
-webkit-backdrop-filter: blur(20px);
backdrop-filter: blur(20px);
```

**CSS variable values:**
- Dark: `--bg-surface: rgba(232, 236, 240, 0.06)` / `--border-subtle: rgba(232, 236, 240, 0.12)`
- Light: `--bg-surface: rgba(0, 0, 0, 0.04)` / `--border-subtle: rgba(0, 0, 0, 0.10)`

**Mistakes to never repeat:**
1. Don't apply glass over uniform dark backgrounds (WebGL canvas capped at brightness 0.20) — blur has nothing to work with
2. Don't over-engineer with `saturate()`, `brightness()`, `box-shadow: inset` — they shift colors
3. Don't use hardcoded RGBA per theme — CSS variables adapt automatically, no `.light` overrides needed
4. Always read the existing reference implementation first (docs.html) before writing custom CSS
5. Full documentation in `wavcash-app/Frosted Glass/` folder

## Dev Server

- Always use port **3001** — never 3000

## Title Format

- Split agreement titles use **colon** separator: `Track Name: Split Agreement` (not em dash)
- Track dropdown uses **middle dot**: `Title · ISRC`

## Mercury Canvas — Default Loading Protocol

Every page with an inline mercury WebGL canvas **must** include the reveal pattern. The layout.tsx inline script sets `body.style.opacity = '0'` on load. Each mercury page is responsible for setting it back to `'1'` after the first frame draws.

**Pattern (add to the RAF loop, after `gl.drawArrays`):**
```js
let revealed = false;

function loop() {
  // ... simulation + render code ...
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  if (!revealed) {
    revealed = true;
    document.body.style.opacity = "1";
  }
}
```

**Pages using this pattern:** landing (`page.tsx`), login, docs, sniffer, mercury-canvas.tsx (shared component used by dashboard + sign page).

**Why:** Without this, body stays at opacity 0 and the page appears stuck on a black screen until the 3-second safety timeout fires.
