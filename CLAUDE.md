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
| `theme` | `t` | string | Theme ID (default/neon/retro) |
| `mode` | — | string | Display mode hint (sign/flow) |
| `color` | `c` | hex (6 or 8 digit) | Text color (no #), 8-digit for alpha |
| `bg` | — | hex (6 or 8 digit) | Background color (no #), 8-digit for alpha |
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

## File Structure

```
css/main.css              Global reset + layout
css/landing.css           Landing page styles
css/themes/*.css          Theme stylesheets
js/core/url-parser.js     URL text + param extraction
js/core/text-engine.js    Auto-fit text sizing utility
js/themes/theme-manager.js   Theme registry + switching
js/themes/*-renderer.js   Theme implementations
js/ui/fullscreen.js       Fullscreen API (from til.re)
js/ui/wakelock.js         Wake Lock API (from til.re)
js/ui/cursor.js           Cursor auto-hide (from til.re)
js/ui/controls.js         Keyboard/pointer input
js/app.js                 App entry + orchestrator
```

## Script Load Order

core → themes → ui → app (defined in index.html)

## Adding a New Theme

1. Create `js/themes/{id}-renderer.js` with the theme interface
2. Create `css/themes/{id}.css` for styles
3. Add `<link>` and `<script>` tags to `index.html`
4. Theme self-registers via `ThemeManager.register()`

## Key Design Decisions

- **No independent mode-resolver** — mode logic lives inside each theme
- **TextEngine is a public utility** — shared auto-fit, not a module boundary
- **Controls bridge via App** — Controls → App callbacks → ThemeManager.getCurrent()
- **UI modules copied from til.re** — fullscreen.js, wakelock.js, cursor.js are identical
