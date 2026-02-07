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
js/core/url-parser.js     URL text + param extraction
js/core/text-engine.js    Auto-fit text sizing utility
js/core/theme-manager.js  Theme registry, switching + dynamic loading
themes/{id}/renderer.js   Theme implementation (self-registers via ThemeManager.register)
themes/{id}/style.css     Theme stylesheet
js/ui/fullscreen.js       Fullscreen API (from til.re)
js/ui/wakelock.js         Wake Lock API (from til.re)
js/ui/cursor.js           Cursor auto-hide (from til.re)
js/ui/controls.js         Keyboard/pointer input
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
| `broadcast` | Studio "ON AIR" indicator + recording dot | `dot`, `frame` |
| `marquee` | Broadway chase light bulbs (Canvas) | `chase`, `bulbColor` |
| `pulse` | Breathing mood ambient + radial glow | `rhythm`, `palette` |
| `aurora` | Northern lights wave bands (Canvas) | `intensity` |
| `firework` | Particle fireworks system (Canvas) | `rate` |
| `wood` | Warm wooden cafe sign with painted text | `grain`, `warm` |
| `cyber` | Matrix terminal decode effect + HUD overlay | `glitch` |
| `tokyo` | Cyberpunk rain-soaked neon + Japanese decorations | — |
| `blueprint` | Architectural blueprint drawing style | — |
| `monolith` | Brutalist high-contrast display | — |
| `street-sign` | Highway guide sign + rivets + reflective coating | `sub`, `exit`, `arrow`, `glare` |
| `do-not-disturb` | Skeuomorphic lightbox + glass panel | — |

## Script Load Order

core (url-parser, text-engine, theme-manager) → themes → ui → app (defined in index.html)

## Adding a New Theme

1. Create `themes/{id}/renderer.js` with the theme interface
2. Create `themes/{id}/style.css` for styles
3. Add `<link>` and `<script>` tags to `index.html`
4. Theme self-registers via `ThemeManager.register()`

For dynamic loading (without editing index.html): `ThemeManager.load('/themes/{id}')`

## Key Design Decisions

- **No independent mode-resolver** — mode logic lives inside each theme
- **TextEngine is a public utility** — shared auto-fit, not a module boundary
- **Controls bridge via App** — Controls → App callbacks → ThemeManager.getCurrent()
- **UI modules copied from til.re** — fullscreen.js, wakelock.js, cursor.js are identical

## Deployment

- **CI/CD**: GitHub Actions → `cloudflare/wrangler-action@v3` → Direct Upload to Cloudflare Pages
- **Trigger**: push to `main` branch
- **No build step** — deploys the project root directory as-is
- **Required GitHub Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
