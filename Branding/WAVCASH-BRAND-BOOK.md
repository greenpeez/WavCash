# WavCash Brand Book

---

## 1. Brand Overview

**Name:** WavCash
**Tagline:** Your royalties, finally visible.
**Positioning:** Royalty intelligence platform for independent artists across Africa and Latin America. Instant verification, transparent payouts.
**Tone:** Precise, confident, understated luxury. The brand communicates through material quality (liquid mercury, chrome) rather than loud graphics. Every interaction feels considered.

**Key Copy:**
- Badge: "Now in Private Beta"
- CTA: "Get Early Access" / "Claim Your Royalties"
- Secondary: "See How It Works"
- Search placeholder: "Search any ISRC, artist, or track..."

---

## 2. Color System

### 2.1 Core Palette

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| Background | `#0a0a0a` | `#F8F6F3` | Page background, canvas clear |

> CSS value is `#0A0A0A`. On the live site the mercury WebGL surface renders over this, producing a perceived average closer to `#141413` (derived from shader env mid `vec3(0.08, 0.08, 0.07)`).
| Primary text | `#E8ECF0` | `#1A1A1A` | Headlines, body, stat values, logo |
| Secondary text | `#9AA8B4` | `#5A5A5A` | Nav links, paragraphs, descriptions |
| Tertiary text | `#788898` | `#888888` | Labels, placeholders, icons |
| Badge text | `#A0A4A8` | `#777777` | Badge label, pulse dot |
| Button text | `#000000` | `#F8F6F3` | Primary button / CTA foreground |
| Button background | `#FFFFFF` | `#1A1A1A` | Primary button / CTA fill |

### 2.2 Accent

| Token | Value | Notes |
|-------|-------|-------|
| Amber | `#D4883A` | Single accent across both modes. All hover states, ignite words, interactive highlights |
| RGB | `rgb(212, 136, 58)` | Used in JS gradient interpolation |

### 2.3 Headline Gradient (135deg)

| Stop | Dark Mode | Light Mode |
|------|-----------|------------|
| 0% | `#FFFFFF` | `#1A1A1A` |
| 40% | `#DDDDDD` | `#333333` |
| 100% | `#AAAAAA` | `#555555` |

Background-size `200% 200%`, animated via `gradient-shift` keyframe (8s cycle).

### 2.4 Paragraph Gradient (135deg)

| Stop | Dark Mode | Light Mode |
|------|-----------|------------|
| 0% | `#9AA8B4` | `#5A5A5A` |
| 40% | `#8A98A6` | `#6A6A6A` |
| 100% | `#7A8898` | `#7A7A7A` |

Background-size `200% 200%`, animated via `gradient-shift-p` keyframe (10s cycle).

### 2.5 Surface & Border Opacity Scale

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| Surface | `rgba(232,236,240, 0.06)` | `rgba(0,0,0, 0.04)` |
| Border subtle | `rgba(232,236,240, 0.12)` | `rgba(0,0,0, 0.10)` |
| Badge bg | `rgba(255,255,255, 0.06)` | `rgba(0,0,0, 0.04)` |
| Badge border | `rgba(255,255,255, 0.12)` | `rgba(0,0,0, 0.10)` |
| Search bg | `rgba(232,236,240, 0.04)` | `rgba(0,0,0, 0.03)` |

### 2.6 Amber Opacity Scale (Shared Both Modes)

| Opacity | Hex/RGBA | Usage |
|---------|----------|-------|
| 3% | `rgba(212,136,58, 0.03)` | Search hover background |
| 4% | `rgba(212,136,58, 0.04)` | Search focus background |
| 8% | `rgba(212,136,58, 0.08)` | Toggle hover bg, kbd hover bg |
| 10% | `rgba(212,136,58, 0.10)` | Badge hover background |
| 15% | `rgba(212,136,58, 0.15)` | Button hover ring |
| 25% | `rgba(212,136,58, 0.25)` | Button hover glow, search hover border |
| 35% | `rgba(212,136,58, 0.35)` | Badge hover border, toggle hover border |
| 40% | `rgba(212,136,58, 0.40)` | Search focus border |

### 2.7 Shadow Palette

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| Button shadow | `rgba(255,255,255, 0.10)` | `rgba(0,0,0, 0.08)` |
| Button active shadow | `rgba(255,255,255, 0.08)` | `rgba(0,0,0, 0.06)` |
| Search focus shadow | `rgba(0,0,0, 0.30)` | `rgba(0,0,0, 0.08)` |

### 2.8 Flare & Cursor Colors

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Atom cursor (all parts) | `#D4883A` | `#1A1A1A` |
| SVG flare stroke | `rgba(255,255,255, opacity)` | `rgba(248,246,243, opacity)` |
| Nav underline | `#FFFFFF` | `#1A1A1A` |

---

## 3. Typography

### 3.1 Font Stack

| Role | Family | Fallback | Source |
|------|--------|----------|--------|
| Display | General Sans | sans-serif | Google Fonts (400, 500, 600, 700) |
| Body | Plus Jakarta Sans | General Sans, -apple-system, sans-serif | Google Fonts (400, 500, 600, 700) |
| Mono | JetBrains Mono | monospace | Google Fonts (400, 500) |

### 3.2 Type Scale

| Element | Font | Size | Weight | Letter Spacing | Line Height | Transform |
|---------|------|------|--------|----------------|-------------|-----------|
| H1 | General Sans | `clamp(42px, 6vw, 72px)` | 700 | -2px | 1.05 | -- |
| Paragraph | Plus Jakarta Sans | `clamp(16px, 2vw, 20px)` | 400 | -- | 1.6 | -- |
| Nav logo | General Sans | 22px | 700 | -0.5px | -- | -- |
| Nav link | Plus Jakarta Sans | 14px | 500 | -- | -- | -- |
| Nav CTA | Plus Jakarta Sans | 13px | 600 | 0.2px | -- | -- |
| Badge | Plus Jakarta Sans | 12px | 600 | 0.8px | -- | UPPERCASE |
| Btn primary | Plus Jakarta Sans | 15px | 600 | -- | -- | -- |
| Btn secondary | Plus Jakarta Sans | 15px | 500 | -- | -- | -- |
| Stat value | JetBrains Mono | 28px | 500 | -1px | -- | -- |
| Stat label | Plus Jakarta Sans | 12px | 500 | 0.5px | -- | UPPERCASE |
| Search input | Plus Jakarta Sans | 14px | -- | -- | -- | -- |

### 3.3 Gradient Text Treatment

All `.hw` spans use `background-clip: text` with `-webkit-text-fill-color: transparent`. Background gradients are `135deg` with `background-size: 200% 200%` and a slow position animation for shimmer.

On hover, JS overrides the CSS gradient with `requestAnimationFrame` interpolation from the base gradient colors toward flat amber `[212, 136, 58]` over 750ms using an easeInOut curve.

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

| Value | Usage |
|-------|-------|
| 4px | Search demo margin-top, stat label margin-top, nav link padding-y |
| 6px | Badge padding-y |
| 7px | Theme toggle padding-y |
| 8px | Hero actions margin-top, badge gap, status padding |
| 9px | Theme toggle padding-x |
| 10px | Nav CTA padding-y, nav logo gap |
| 13px | Btn secondary padding-y |
| 14px | Search input padding-y, btn primary padding-y |
| 16px | Badge padding-x, hero actions gap, search icon left |
| 20px | Nav padding-y, search input padding-right |
| 22px | Nav CTA padding-x |
| 24px | Hero gap, stats bar padding-top |
| 28px | Btn secondary padding-x |
| 32px | Nav links gap, stats bar padding-bottom, btn primary padding-x |
| 40px | Nav padding-x, hero padding-x, stats bar padding-x |
| 44px | Search input padding-left (icon clearance) |
| 48px | Stats bar gap |

### 4.2 Border Radius Scale

| Value | Usage |
|-------|-------|
| 4px | Status debug overlay |
| 5px | (removed: search kbd) |
| 8px | Nav CTA, theme toggle |
| 10px | Btn primary, btn secondary |
| 12px | Search input |
| 100px | Badge (pill) |

### 4.3 Layout Structure

```
[Fixed Canvas / z:0 / WebGL mercury surface, 100vw × 100vh]
[Fixed UI Overlay / z:10 / pointer-events:none container]
  ├── Nav (flex, space-between, 20px 40px padding)
  │   ├── Logo (flex, gap:10)
  │   └── Links (flex, gap:32) + Toggle + CTA
  ├── Hero (flex:1, column, center, gap:24)
  │   ├── Badge (inline-flex, pill)
  │   ├── H1 (gradient text spans)
  │   ├── P (gradient text spans)
  │   ├── Search (relative, max-width:460px)
  │   └── Actions (flex, gap:16)
  └── Stats Bar (flex, center, gap:48)
      └── Stat × 4, separated by dividers
[Fixed Atom Cursor / z:9999 / pointer-events:none]
```

---

## 5. Components

### 5.1 Primary Button (`.btn-primary`, `.nav-cta`)

| State | Background | Text Color | Shadow | Transform |
|-------|------------|------------|--------|-----------|
| Default | `var(--bg-btn-primary)` | `var(--text-btn-primary)` | `0 2px 8px var(--btn-primary-shadow)` | -- |
| Hover | `var(--accent)` | `#000` | `0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15)` | `translateY(-1px)` |
| Active | -- | -- | `0 1px 4px var(--btn-primary-active-shadow)` | `translateY(0)` / `scale(0.98)` |

Transitions: `transform 0.5s, box-shadow 0.5s, background 0.4s, color 0.4s`, all ease.

### 5.2 Secondary Button (`.btn-secondary`)

| State | Background | Text | Border | Transform |
|-------|------------|------|--------|-----------|
| Default | `var(--bg-surface)` | `var(--text-primary)` | `1px solid var(--border-subtle)` | -- |
| Hover | `rgba(212,136,58,0.08)` | `var(--accent)` | `rgba(212,136,58,0.35)` | `translateY(-1px)` |
| Active | -- | -- | -- | `scale(0.98)` |

Includes `backdrop-filter: blur(8px)`. Transition: `all 0.5s ease`.

### 5.3 Badge (`.hero-badge`)

| State | Background | Text | Border | Dot |
|-------|------------|------|--------|-----|
| Default | `var(--bg-badge)` | `var(--text-badge)` | `var(--border-badge)` | `var(--text-badge)`, pulsing |
| Hover | `rgba(212,136,58,0.10)` | `var(--accent)` | `rgba(212,136,58,0.35)` | `var(--accent)` |

Pulse dot: 2s ease-in-out infinite, opacity 1→0.5, scale 1→0.7.
Badge words (`.hw` spans): CSS color transition 1s to amber on hover.

### 5.4 Search Input (`.search-input`)

| State | Background | Border | Shadow | Icon/Placeholder |
|-------|------------|--------|--------|------------------|
| Default | `var(--search-bg)` | `var(--border-subtle)` | -- | `var(--text-tertiary)` |
| Hover | `rgba(212,136,58,0.03)` | `rgba(212,136,58,0.25)` | -- | `var(--accent)` |
| Focus | `rgba(212,136,58,0.04)` | `rgba(212,136,58,0.40)` | `0 0 0 3px rgba(212,136,58,0.1), 0 8px 30px var(--search-focus-shadow)` | `var(--accent)` |

Transition: `0.35s cubic-bezier(0.34, 1.56, 0.64, 1)` (springy overshoot).
Includes `backdrop-filter: blur(12px)`.

### 5.5 Stat (`.stat`)

| State | Value Color | Label Color | Transform |
|-------|-------------|-------------|-----------|
| Default | `var(--text-primary)` | `var(--text-tertiary)` | -- |
| Hover | `var(--accent)` | `var(--accent)` | `translateY(-3px)` |

Color transitions: 0.8s ease. Transform: 0.5s ease.

### 5.6 Nav Link (`.nav-link`)

| State | Color | Underline |
|-------|-------|-----------|
| Default | `var(--text-secondary)` | Hidden (width: 0) |
| Hover | `var(--accent)` | Full width, `var(--accent)`, 1.5px |

Underline slides from left via `width` transition 0.5s. Color transition 0.8s.

### 5.7 Theme Toggle (`.theme-toggle`)

| State | Color | Border | Background | Icon |
|-------|-------|--------|------------|------|
| Default | `var(--text-secondary)` | `var(--border-subtle)` | `none` | Sun (dark) / Moon (light) |
| Hover | `var(--accent)` | `rgba(212,136,58,0.35)` | `rgba(212,136,58,0.08)` | `rotate(15deg) scale(1.1)` |

---

## 6. Motion & Animation

### 6.1 Timing Scale

| Duration | Usage |
|----------|-------|
| 0.3s | Cursor opacity fade |
| 0.35s | Search input transitions (springy) |
| 0.4s | Button background/color fade to amber |
| 0.5s | Button transform/shadow, nav underline, stat transform, toggle, search placeholder/icon |
| 0.6s | Body/UI theme transition |
| 0.8s | Logo, nav link, badge, stat color transitions |
| 1.0s | Badge word hover |

### 6.2 Easing Functions

| Name | Value | Usage |
|------|-------|-------|
| Default | `ease` | Most transitions |
| Spring | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Search input (overshoot) |
| EaseInOut (JS) | `t < 0.5 ? 2t² : 1 - (-2t+2)²/2` | Hover gradient interpolation, ignite words |
| EaseOut (JS) | `1 - (1-t)³` | Stat counter animation |
| Pulse | `ease-in-out` | Badge dot (CSS keyframe) |

### 6.3 Ignite Words Choreography

```
0.0s ─── Page loads
1.0s ─── "royalties" color shift begins (dark→amber, 2.0s duration)
3.0s ─── "royalties" locks to flat amber
4.5s ─── "visible." color shift begins (dark→amber, 2.0s duration)
6.5s ─── "visible." locks to flat amber
        ─── "royalties" flare fires (3.5s after its color locked)
6.8s ─── "visible." flare fires (0.3s after its color locked)
```

Flare runs continuously after activation: 2.5s trace + 7.5s gap = 10s cycle.

### 6.4 Flare SVG Animation

- Stroke dash: 8% of estimated outline length lit, rest is gap
- Offset sweeps from `+totalLength` to `-totalLength` over 2.5s
- Fade-in: first 10% of trace phase
- Fade-out: last 15% of trace phase
- Peak stroke opacity: 0.9
- Glow: `feGaussianBlur` stdDeviation=3, merged with source

### 6.5 Hover Gradient Interpolation

- Duration: 750ms
- Direction: instant engage on mouseenter, reverse on mouseleave
- Each RGB channel interpolated independently from base gradient colors → amber
- Reads mode-appropriate base colors each frame (survives theme toggle mid-hover)

### 6.6 Stat Counter Animation

| Stat | Target | Duration | Delay |
|------|--------|----------|-------|
| Royalties Recovered | $2.4M | 1800ms | 900ms |
| Tracks Verified | 12,400+ | 2000ms | 900ms |
| Countries | 38 | 1200ms | 900ms |

Easing: cubic ease-out. Floats display 1 decimal; integers use `toLocaleString()`.

---

## 7. The Mercury Surface

### 7.1 Simulation

- Grid: 512 x 512 heightfield (RGBA32F ping-pong FBOs)
- Filtering: NEAREST (no interpolation, sharp ripple edges)
- Wrap: CLAMP_TO_EDGE
- Edge absorption: smoothstep with 0.01 threshold on all 4 borders

### 7.2 Wave Physics

| Parameter | Value | Effect |
|-----------|-------|--------|
| Wave speed coefficient | 0.18 | How fast height differences propagate |
| Velocity damping | 0.945 | Energy loss per frame (lower = more damping) |
| Height decay | 0.9992 | Slow return to flat (very close to 1 = long-lived ripples) |
| Drop radius (cursor) | 0.015 | Normalized viewport units |
| Drop strength | 0.15 + vel × 0.15 | Velocity-responsive, capped at vel=3.0 |
| Ambient drop radius | 0.035 | Larger, gentler idle ripples |
| Ambient drop strength | 0.04 | Subtle |
| Ambient frequency | Every 90 frames | ~1.5s at 60fps |

### 7.3 Cursor Interaction

- Strength ramps instantly on movement, decays with 0.04 factor on stop
- Activity window: 150ms after last mouse/touch event
- Drop function: `exp(-dist²/radius²)` Gaussian mound added to height

### 7.4 Render Shader / Dark Mode

| Parameter | Value |
|-----------|-------|
| Normal strength | 1.0 |
| Env dark | `vec3(0.01)` |
| Env mid | `vec3(0.08, 0.08, 0.07)` |
| Env tint | `vec3(0.25, 0.24, 0.22)` |
| Env limiter | 0.12 |
| Fresnel range | 0.65 → 0.75 |
| Output limiter | 0.20 |

### 7.5 Render Shader / Light Mode

| Parameter | Value |
|-----------|-------|
| Normal strength | 2.0 (doubled for visible ripple detail on bright surface) |
| Env dark | `vec3(0.62)` |
| Env mid | `vec3(0.78, 0.78, 0.77)` |
| Env tint | `vec3(0.92, 0.91, 0.89)` |
| Env limiter | 0.93 |
| Fresnel range | 0.75 → 0.90 |
| Output limiter | None (ACES handles it) |

### 7.6 Tone Mapping & Post

- ACES filmic: `c = (c * (2.51c + 0.03)) / (c * (2.43c + 0.59) + 0.14)`
- Gamma: `pow(c, 1/2.2)`
- Two soft light bands at different heights in the env map for subtle horizontal reflections
- Side variation: `0.90 + 0.10 * sin(...)` for asymmetric glint

---

## 8. Cursor System

### 8.1 Atom Cursor SVG

- Viewbox: `0 0 36 36`, center `(18, 18)`
- 3 elliptical orbits: `rx=14, ry=5`, tilted at 0/60/120 degrees
- Orbit stroke-width: 0.5, opacity: 0.15
- 3 electrons: `r=1.8`, animated along orbits
- Nucleus: `r=2.2`, opacity 0.9
- Nucleus glow: `r=3.5`, opacity 0.12

### 8.2 Orbit Dynamics

| Orbit | Tilt | Speed |
|-------|------|-------|
| 1 | 0deg | 1.8 rad/s |
| 2 | 60deg | 2.3 rad/s |
| 3 | 120deg | 1.5 rad/s |

Phase offset: 120deg apart. Electrons fade 0.35→0.9 opacity based on depth (`sin(angle)`).

### 8.3 Follow Behavior

- Lag factor: 0.25 per frame (`cur += (target - cur) * 0.25`)
- Centered: offset -18px both axes from mouse position
- Hidden on: buttons, links, inputs, textareas, selects (via event delegation)
- Hidden on: mouse leave window
- Color: `#D4883A` (dark mode), `#1A1A1A` (light mode)

---

## 9. Dark/Light Mode System

### 9.1 Toggle Mechanism

- CSS class: `html.light-mode` on the `<html>` element
- JS state: `isLightMode` boolean
- Trigger: click `.theme-toggle` button or press `L` key (blocked in inputs)
- Icons: Sun (dark mode), Moon (light mode), swapped via CSS `display`

### 9.2 What Changes

| Element | Dark → Light |
|---------|-------------|
| Body background | `#0a0a0a` → `#F8F6F3` |
| All text colors | Light greys → dark greys |
| Button polarity | White bg / black text → Black bg / cream text |
| Gradients | White→grey → Black→grey |
| Mercury surface | Dark chrome → Bright chrome |
| Normal strength | 1.0 → 2.0 |
| Atom cursor | Amber → Dark |
| SVG flare | White → Cream |
| Nav underline | White → Dark |
| Borders/surfaces | White-based alpha → Black-based alpha |

### 9.3 What Stays Constant

- Amber accent `#D4883A`, same in both modes
- All amber opacity tints (hover backgrounds, borders)
- Animation timing (durations, easings, choreography)
- Layout and spacing
- Typography (families, sizes, weights)
- Wave physics parameters
- Cursor orbit geometry and dynamics

### 9.4 Transition

Body background and UI text color transition over 0.6s ease. CSS custom properties cascade instantly; the transition properties on elements handle the visual interpolation. WebGL shader switches instantly (no interpolation, the uniform flips 0/1).

---

## 10. Effects

### 10.1 Box Shadows

| Context | Shadow |
|---------|--------|
| Button default | `0 2px 8px` at mode-appropriate opacity |
| Button/CTA hover | `0 4px 20px rgba(amber, 0.25), 0 0 0 1px rgba(amber, 0.15)` |
| Button active | `0 1px 4px` at mode-appropriate opacity |
| Search focus | `0 0 0 3px rgba(amber, 0.1), 0 8px 30px` at mode shadow |

### 10.2 Backdrop Blur

| Element | Blur |
|---------|------|
| Secondary button | 8px |
| Search input | 12px |

Applied with both `backdrop-filter` and `-webkit-backdrop-filter`.

### 10.3 Transform Vocabulary

| Transform | Elements |
|-----------|----------|
| `translateY(-1px)` | Buttons, badge, search input on hover/focus |
| `translateY(-3px)` | Stats on hover |
| `scale(0.98)` | Button active press |
| `scale(1.03)` | Nav CTA hover |
| `scale(1.08)` | Logo SVG hover |
| `rotate(15deg) scale(1.1)` | Toggle icon hover |

### 10.4 Flare Overlay System

The SVG text stroke flare is an Apple-inspired cutout outline effect:
- An SVG `<text>` element is layered over each ignite word with `fill: none` and a thin `stroke-width: 0.8`
- A `feGaussianBlur` filter (stdDeviation=3) creates a soft glow around the lit segment
- `stroke-dasharray` creates a short lit segment (8% of total) with a long gap
- `stroke-dashoffset` is animated via JS to sweep the lit segment around the letterforms
- Color: white in dark mode, warm cream (`#F8F6F3`) in light mode
- Cycle: 2.5s trace, 7.5s rest, with fade-in/out at trace boundaries

---

## 11. Keyboard Shortcuts

| Key | Action | Blocked in Inputs |
|-----|--------|-------------------|
| `L` | Toggle light/dark mode | Yes |
| `/` | Focus search input | No (preventDefault) |

---

## 12. Logo / The Diffraction

**Concept:** A single-slit diffraction pattern: a bold central bar flanked by progressively thinner, fainter bars. This is how sound and light behave when they pass through an opening, the invisible made visible. Inspired by wave optics and the brand tagline "Your royalties, finally visible."

**SVG Mark:**
```svg
<svg width="26" height="22" viewBox="0 0 26 22" fill="none">
  <line x1="13" y1="2" x2="13" y2="20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  <line x1="9" y1="4" x2="9" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <line x1="17" y1="4" x2="17" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <line x1="5.5" y1="6" x2="5.5" y2="16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
  <line x1="20.5" y1="6" x2="20.5" y2="16" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.3"/>
</svg>
```

**Structure:** 5 vertical bars, symmetric around center:
| Bar | X Position | Y Range | Stroke Width | Opacity |
|-----|-----------|---------|-------------|---------|
| Center | 13 | 2–20 | 3 | 1.0 |
| Inner L/R | 9 / 17 | 4–18 | 2 | 0.6 |
| Outer L/R | 5.5 / 20.5 | 6–16 | 1.2 | 0.3 |

**Behavior:**
- Inherits `currentColor` from `.nav-logo` (primary text color)
- Amber on hover (0.8s transition)
- Scale: `1.08` on hover
- Works in both dark and light mode via `currentColor`
