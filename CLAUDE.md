# led.run — Project Conventions

## Architecture

- **Pure vanilla JS/CSS** — no frameworks, no build step, no npm
- **IIFE modules** — each file wraps in `;(function(global) { ... })(window)`
- **Cloudflare Pages** — static hosting, SPA rewrite via `_redirects`
- **Theme-centric** — themes are autonomous rendering systems, the app only orchestrates

## URL Protocol

```
https://led.run/[text]?[params]
```

All params are "preference hints" — themes decide whether to consume them.

| Param | Alias | Type | Description |
|-------|-------|------|-------------|
| `theme` | `t` | string | Theme ID (default/neon/retro/glitch/typewriter/gradient/hologram/broadcast/marquee/pulse/aurora/firework/wood/cyber/tokyo/blueprint/monolith/street-sign/do-not-disturb) |
| `mode` | — | string | Display mode hint (sign/flow) |
| `color` | `c` | hex (6 or 8 digit) | Text color (no #), 8-digit AARRGGBB for alpha |
| `bg` | — | hex (6 or 8 digit) | Background color (no #), 8-digit AARRGGBB for alpha |
| `speed` | — | number | Scroll speed |
| `direction` | `dir` | string | Scroll direction |
| `font` | — | string | Font family |
| `wakelock` | `w` | boolean | Keep screen on (App-level, default true) |
| `scale` | — | number | Display scale multiplier (0.1–1, default 1) |
| `fill` | — | hex (6 or 8 digit) | Card face background color (no #), used by card themes when scale < 1 |
| `cursor` | `cur` | number | Cursor auto-hide delay (App-level) |

## Theme Interface

```javascript
{
  id: 'theme-id',
  defaults: { ... },
  init(container, text, config) {},
  destroy() {},
  togglePause() {},   // optional
  isPaused() {}       // optional
}
```

- `config` = merged params (URL overrides theme defaults)
- Themes self-register via `ThemeManager.register(theme)` at load time
- Themes may call `TextEngine.autoFit(text, container, options)` for sizing
- `ThemeManager.load(basePath)` — dynamically loads a theme directory (injects `style.css` + `renderer.js`)

## File Structure

```
css/main.css              Global reset + layout
css/landing.css           Landing page styles
css/toolbar.css           Floating toolbar styles + rotation classes
js/core/url-parser.js     URL text + param extraction
js/core/text-engine.js    Auto-fit text sizing utility
js/core/theme-manager.js  Theme registry, switching + dynamic loading
themes/{id}/renderer.js   Theme implementation (self-registers via ThemeManager.register)
themes/{id}/style.css     Theme stylesheet
js/ui/fullscreen.js       Fullscreen API (from til.re)
js/ui/wakelock.js         Wake Lock API (from til.re)
js/ui/cursor.js           Cursor auto-hide (from til.re)
js/ui/controls.js         Keyboard/pointer input
js/ui/toolbar.js          Floating toolbar (fullscreen/rotate/share)
js/app.js                 App entry + orchestrator
.github/workflows/deploy.yml  CI/CD — Cloudflare Pages deploy on push to main
```

## Available Themes

| ID | Effect | Custom Params |
|----|--------|---------------|
| `default` | Classic green LED sign | — |
| `neon` | Glowing neon with flicker | `flicker` |
| `retro` | CRT scanlines + vignette | `scanlines` |
| `glitch` | RGB split + jitter + distortion | `intensity` |
| `typewriter` | Character-by-character typing + cursor | `typingSpeed` |
| `gradient` | Rainbow gradient text flow | — |
| `hologram` | Chromatic aberration + scanline sweep | — |
| `broadcast` | Studio "ON AIR" indicator + recording dot | `dot`, `frame`, `fill` |
| `marquee` | Broadway chase light bulbs (Canvas) | `chase`, `bulbColor`, `fill` |
| `pulse` | Breathing mood ambient + radial glow | `rhythm`, `palette` |
| `aurora` | Northern lights wave bands (Canvas) | `intensity` |
| `firework` | Particle fireworks system (Canvas) | `rate` |
| `wood` | Warm wooden cafe sign with painted text | `grain`, `warm`, `fill` |
| `cyber` | Matrix terminal decode effect + HUD overlay | `glitch` |
| `tokyo` | Cyberpunk rain-soaked neon + Japanese decorations | — |
| `blueprint` | Architectural blueprint drawing style | — |
| `monolith` | Brutalist high-contrast display | — |
| `street-sign` | Highway guide sign + rivets + reflective coating | `sub`, `exit`, `arrow`, `glare`, `fill` |
| `do-not-disturb` | Skeuomorphic lightbox + glass panel | — |

## Script Load Order

core (url-parser, text-engine, theme-manager) → themes → ui → app (defined in index.html)

## Adding a New Theme

1. Create `themes/{id}/renderer.js` with the theme interface
2. Create `themes/{id}/style.css` for styles
3. Add `<link>` and `<script>` tags to `index.html`
4. Theme self-registers via `ThemeManager.register()`

For dynamic loading (without editing index.html): `ThemeManager.load('/themes/{id}')`

## Toolbar

The floating toolbar provides fullscreen, rotate, and share buttons. It syncs with cursor auto-hide (fades out when cursor is hidden).

- **`data-theme` attribute**: `#app[data-theme="xxx"]` is set by app.js when a theme is active, enabling theme-scoped CSS selectors
- **DOM structure** (stable API for theme CSS):
  - `.sign-toolbar` — toolbar container
  - `.sign-toolbar-btn` — button elements
  - `.sign-toolbar-btn[data-action="fullscreen|rotate|share"]` — specific buttons
  - `.sign-toolbar-toast` — toast notification

### Theme Customization

Themes can override toolbar appearance via CSS custom properties or full CSS overrides.

**Quick color override:**
```css
#app[data-theme="broadcast"] .sign-toolbar {
  --toolbar-bg: rgba(30, 0, 0, 0.8);
  --toolbar-btn-color: rgba(255, 100, 100, 0.8);
}
```

**Available CSS custom properties:**
- `--toolbar-bg` — toolbar background
- `--toolbar-border` — toolbar border color
- `--toolbar-btn-bg` — button background
- `--toolbar-btn-color` — button icon color
- `--toolbar-btn-hover-bg` — button hover background
- `--toolbar-btn-hover-color` — button hover icon color

Themes can also fully override position, shape, and animations via standard CSS targeting `#app[data-theme="xxx"] .sign-toolbar`.

## Key Design Decisions

- **No independent mode-resolver** — mode logic lives inside each theme
- **TextEngine is a public utility** — shared auto-fit, not a module boundary
- **Controls bridge via App** — Controls → App callbacks → ThemeManager.getCurrent()
- **UI modules copied from til.re** — fullscreen.js, wakelock.js, cursor.js are identical
- **Toolbar uses `<button>` elements** — controls.js ignores clicks on `button` elements, preventing toolbar clicks from triggering pause/fullscreen
- **Themes must use container dimensions, not viewport** — `_fitText` and CSS sizing must reference `this._container.clientWidth/clientHeight` (or CSS `100%`), never `window.innerWidth/innerHeight` (or CSS `100vw/100vh`), because toolbar rotation swaps the container's width/height via CSS classes while the viewport stays the same
- **Themes must never set inline `transform` on the container** — toolbar rotation uses CSS class `transform` on `#sign-container`; inline styles override CSS classes. Use an inner wrapper div for theme transforms like `scale()`
- **Scale parameter has two strategies** — Card themes (broadcast, street-sign, wood, do-not-disturb, marquee) use CSS `transform: scale()` on an inner wrapper div; container `background: transparent` by default when `scale < 1`, overridable via `bg` param; the card face color is controlled by `fill` param (each theme provides its own default). Extended themes (all others) apply `scale` as a font-size multiplier: autoFit result × scale for sign mode, container height ratio × scale for flow mode; background effects remain fullscreen.

## Deployment

- **CI/CD**: GitHub Actions → `cloudflare/wrangler-action@v3` → Direct Upload to Cloudflare Pages
- **Trigger**: push to `main` branch
- **No build step** — deploys the project root directory as-is
- **Required GitHub Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
