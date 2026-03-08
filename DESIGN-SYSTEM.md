# WavCash Frontend Design System

Living reference for building pages and components that feel like one product.
Updated as the site evolves.

---

## Color Tokens

All colors live in CSS custom properties on `:root` (dark) and `html.light-mode` (light). Every new element must use these tokens — never hardcode hex values for foreground/background.

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--bg-body` | `#0a0a0a` | `#F8F6F3` | Page background |
| `--text-primary` | `#E8ECF0` | `#1A1A1A` | Headings, body emphasis |
| `--text-secondary` | `#9AA8B4` | `#5A5A5A` | Body copy, descriptions |
| `--text-tertiary` | `#788898` | `#888` | Captions, footnotes, muted UI |
| `--accent` | `#D4883A` | `#D4883A` | Amber — labels, highlights, active states |
| `--bg-surface` | `rgba(232,236,240,0.06)` | `rgba(0,0,0,0.04)` | Glass cards, nav, sidebar |
| `--border-subtle` | `rgba(232,236,240,0.12)` | `rgba(0,0,0,0.10)` | Borders on surfaces |
| `--bg-btn-primary` | `#fff` | `#1A1A1A` | Primary CTA fill |
| `--text-btn-primary` | `#000` | `#F8F6F3` | Primary CTA text |
| `--nav-underline` | `#fff` | `#1A1A1A` | Nav link underline (before hover) |

### Accent usage

Amber (`#D4883A`) is the only brand accent. It appears on:
- Section labels, TOC numbers, table headers, timeline phase labels
- Active nav link + underline
- Hover state for buttons, links, cards
- Accent borders (`border-left: 4px solid var(--accent)` on case study cards)
- Scrollbar thumbs (dark mode: `rgba(212,136,58,0.45)`)

Semi-transparent amber tints for hover backgrounds: `rgba(212,136,58,0.08)` bg + `rgba(212,136,58,0.35)` border.

---

## Typography

Three font families, loaded from Google Fonts:

| Family | Weights | Role |
|--------|---------|------|
| **General Sans** | 400, 500, 600, 700 | Display — logo, headings, pull quotes, subtitles |
| **Plus Jakarta Sans** | 400, 500, 600, 700 | Body — paragraphs, buttons, nav links, descriptions |
| **JetBrains Mono** | 400, 500, 700 | Mono — labels, code blocks, table headers, stats, TOC numbers |

### Font stack

```css
font-family: 'Plus Jakarta Sans', 'General Sans', -apple-system, sans-serif;
```

General Sans is the display face, Plus Jakarta Sans is the reading face. Body inherits Plus Jakarta Sans. Headings and display elements explicitly set General Sans.

### Type scale

| Element | Family | Size | Weight | Extras |
|---------|--------|------|--------|--------|
| Logo | General Sans | 22px | 700 | letter-spacing: -0.5px |
| Page title | General Sans | clamp(42px, 6vw, 64px) | 700 | letter-spacing: -2.5px |
| Section title | General Sans | clamp(28px, 4vw, 36px) | 700 | letter-spacing: -1.5px |
| Section subtitle | General Sans | 20px | 600 | letter-spacing: -0.5px |
| Pull quote | General Sans | clamp(18px, 2.5vw, 24px) | 600 | letter-spacing: -0.5px |
| Body text | Plus Jakarta Sans | 15px | 400 | line-height: 1.75, text-align: justify |
| Nav link | Plus Jakarta Sans | 14px | 500 | — |
| CTA button | Plus Jakarta Sans | 13px | 600 | letter-spacing: 0.2px |
| Amber label | JetBrains Mono | 10–12px | 700 | letter-spacing: 1.5–2px, uppercase |
| Code block | JetBrains Mono | 12px | 400 | line-height: 1.65 |
| Table header | JetBrains Mono | 10px | 700 | letter-spacing: 1.5px, uppercase |
| Footnote | JetBrains Mono | 10px | 400 | opacity: 0.5 |

### Amber label pattern

All JetBrains Mono labels in amber share this pattern:

```css
font-family: 'JetBrains Mono', monospace;
font-weight: 700;
letter-spacing: 1.5px;
text-transform: uppercase;
color: var(--accent);
```

Size varies by context (9–12px). Always bold, always uppercase, always amber.

---

## Surfaces & Glass

The glass effect is the signature surface treatment. Every elevated element uses it.

```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border-radius: 8px–12px;
```

- **Nav**: `blur(20px)`, fixed position, `border-bottom` only
- **Sidebar**: `blur(20px)`, fixed position, `border-right` only
- **Cards** (case study, stat block): `blur(8px)`, `border-radius: 12px`
- **Code blocks**: no blur, just `var(--bg-surface)` + border, `border-radius: 10px`
- **Toggle card**: `blur(12px)`, `border-radius: 8px`

### Border radius scale

- `6px` — small interactive (TOC link hover bg)
- `8px` — buttons, toggle, small cards
- `10px` — code blocks
- `12px` — content cards (case study, stat block)
- `100px` — pill badges

---

## Hover & Transitions

Standard transition timing: `0.5s ease` for most interactions. Theme transitions use `0.6s ease`. Quick micro-interactions (sidebar slide) use `0.35s ease`.

### Hover patterns

| Element | Hover effect |
|---------|-------------|
| **Nav link** | Color → accent, `::after` underline grows 0→100% width |
| **Nav CTA** | BG → accent, text → black, `translateY(-1px) scale(1.03)`, amber box-shadow |
| **Theme toggle** | Color → accent, border → amber tint, bg → amber 8% |
| **Cards** (case study, stat block) | `translateY(-2px)`, border → amber, amber box-shadow |
| **Code block** | Border → amber, subtle amber shadow |
| **Table row** | BG → `rgba(212,136,58,0.04)`, text → primary |
| **Timeline item** | `translateX(4px)`, phase opacity → 1 |
| **Pull quote** | Text color → accent |
| **Logo** | Color → accent, SVG scale(1.08), SVG stroke → accent |

### Active states

Buttons: `transform: scale(0.98)` on `:active`.

---

## Layout

### Navigation (fixed)

```
position: fixed; top: 0; left: 0; right: 0; z-index: 100;
padding: 20px 40px;
```

Height is approximately 64px. All fixed elements below nav use `top: 64px`.

Structure: `[logo] — [links] — [toggle + CTA]` with `justify-content: space-between`.

Mobile (< 768px): nav links and CTA hidden, padding reduces to `12px 20px`.

### Content area

```css
.main { padding: 0 40px; max-width: 860px; margin: 0 auto; }
.content { max-width: 780px; margin: 0 auto; }
```

Content is always centered. Sidebar is an overlay that slides in from the left — it does not push content.

### Section spacing

- Section padding: `56px 0`
- Section separator: `border-top: 1px solid rgba(212,136,58,0.25)` (amber tint, not the standard border token)
- Heading to content gap: `margin-bottom: 32px`
- Between paragraphs: `margin-bottom: 20px`
- Card margins: `24px 0`

---

## Components

### Case Study Card

Amber left border accent, glass surface, hover lift.

```css
background: var(--bg-surface);
border: 1px solid var(--border-subtle);
border-left: 4px solid var(--accent);
border-radius: 12px;
padding: 24px 28px;
backdrop-filter: blur(8px);
```

### Stat Block

Side-by-side label + value, glass surface.

```css
display: flex;
justify-content: space-between;
align-items: baseline;
/* same glass surface as cards */
```

Value in JetBrains Mono, amber color.

### Pull Quote

Full-width, no card surface. Top border in amber.

```css
border-top: 2px solid var(--accent);
border-bottom: 1px solid var(--border-subtle);
padding: 32px 0;
font-family: 'General Sans';
font-weight: 600;
```

### Data Table

Wrapped in `.table-wrap` for horizontal overflow. Amber headers, subtle row hover.

```css
.spec-table th — JetBrains Mono, amber, uppercase, bold
.spec-table td — var(--text-secondary), amber bottom borders at 8% opacity
tbody tr:hover — amber bg at 4%, text goes primary
```

### Timeline

Left-aligned dot track. Amber dots, amber phase labels, hover slides item right.

### Code Block

JetBrains Mono, glass surface, horizontal scroll for overflow.

---

## Interactive Elements

### Theme Toggle

Sun icon (dark mode) / Moon icon (light mode). SVG icons, 16x16. Toggle switches `html.light-mode` class and persists in `localStorage`.

Keyboard shortcut: `L` key.

All theme-aware properties transition at `0.6s ease`.

### Sidebar TOC

- Collapsed by default (`transform: translateX(-100%)`)
- Toggled via "Table of Contents" card (fixed, `top: 84px`, `left: 40px`, z-index: 55)
- Sidebar sits at z-index: 50, behind the card
- TOC items start below card area (sidebar `padding-top: 72px`)
- Scroll spy via IntersectionObserver highlights current section
- Active TOC link: amber color + amber bg at 6% opacity

### Scrollbars

- Page vertical scrollbar: **hidden** (`display: none` / `scrollbar-width: none`)
- Table and code horizontal scrollbars: 4px height, transparent by default, amber thumb while scrolling (via `.is-scrolling` class), disappears 1s after scroll stops
- Light mode scrollbar thumb: `rgba(26,26,26,0.3)` instead of amber
- Sidebar scrollbar: hidden

---

## Effects

### Mercury Surface (WebGL2)

Full-viewport `<canvas>` at z-index: 0 behind all content. Wave equation simulation with cursor-reactive ripples. Fragment shader renders reflective mercury-like surface. Present on both landing and docs pages.

### Atom Cursor

Custom SVG cursor replacing the default pointer. Three electrons orbiting a nucleus on tilted elliptical paths, animated via `requestAnimationFrame`. Fixed position, follows mouse with `will-change: transform`. z-index: 9999.

Hidden class: `.hidden { opacity: 0; }` — used when cursor leaves viewport.

### Scroll Indicator

Fixed bottom-center. JetBrains Mono "Scroll down" text + chevron arrow. Amber in dark, primary text in light. Fades out once user scrolls past the cover section. Gentle nudge animation via CSS keyframes.

---

## Responsive Breakpoints

| Breakpoint | Changes |
|-----------|---------|
| < 768px | Nav links + CTA hidden; padding 40px → 20px; cover meta stacks vertically |

Content width is inherently responsive via `max-width: 860px` + `margin: 0 auto`. The `clamp()` type scale handles font sizing.

---

## Print

All UI chrome (nav, sidebar, toggle, cursor, canvas) hidden. Background forced white, text forced dark. Surfaces lose backdrop-filter, get flat `#f5f5f5` bg. Cover section forces page break after.

---

## File Structure

```
wavcash/
  docs.html              — Living documentation (whitepaper content)
  WavCash-WhitePaper.html — Original whitepaper (archive)
  WavCash-PitchDeck.html  — Pitch deck
  DESIGN-SYSTEM.md        — This file

mercury-cursor/
  wavcash-landing.html    — Landing page
```

---

## Rules of Thumb

1. **Every color is a token.** Never hardcode — use `var(--token)`.
2. **Amber is the only accent.** No other highlight colors.
3. **Glass everywhere.** Elevated elements get `backdrop-filter: blur` + semi-transparent bg + subtle border.
4. **Slow transitions.** 0.5s minimum for hover, 0.6s for theme. The site feels deliberate, not snappy.
5. **JetBrains Mono = metadata.** Any label, stat, code, or structural marker uses the mono face, bold, uppercase, amber.
6. **Hover lifts.** Cards translate up 2px. Timeline items translate right 4px. Buttons scale down on press.
7. **Justify body text.** All paragraph-length content is justified. Centered alignment only for hero/cover elements.
8. **Hide scrollbars.** Page scrollbar is invisible. Overflow scrollbars appear only during scroll, thin amber, auto-hide after 1s.
9. **Content never shifts.** Overlays (sidebar) use transforms, not margin changes. Main content is always centered independently.
10. **Theme = class toggle.** `html.light-mode` controls everything. Persist with `localStorage`. Transition at 0.6s.
