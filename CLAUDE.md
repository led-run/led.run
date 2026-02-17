# led.run — Project Conventions

## Architecture

- **Pure vanilla JS/CSS** — no frameworks, no build step, no npm
- **IIFE modules** — each file wraps in `;(function(global) { ... })(window)`
- **Cloudflare Pages** — static hosting, SPA rewrite via `_redirects`
- **Multi-product platform** — four products (Text, Light, Sound, Time) with independent managers
- **Theme-centric** — themes/effects/visualizers are autonomous rendering systems, the app only orchestrates

## Products

| Product | Purpose | Manager | Directory | URL |
|---------|---------|---------|-----------|-----|
| **Text** | LED-style text display (30 themes) | `TextManager` | `texts/` | `led.run/HELLO` or `led.run/text/HELLO` |
| **Light** | Pure color/pattern light effects (18 effects) | `LightManager` | `lights/` | `led.run/light?t=disco` |
| **Sound** | Real-time audio visualization (12 visualizers) | `SoundManager` | `sounds/` | `led.run/sound?t=bars` |
| **Time** | Clock displays (14 themes) | `TimeManager` | `times/` | `led.run/time?t=digital` |

## URL Protocol

```
led.run/HELLO?t=neon                   → Text product (preferred short-link form)
led.run/text/HELLO?t=neon              → Text product (canonical form, technically equivalent)
led.run/light?t=disco&colors=ff0000    → Light product
led.run/sound?t=bars&sensitivity=5     → Sound product
led.run/time?t=digital&format=12h      → Time product
led.run/                               → Landing page
```

**Routing rules**:
- `text`, `light`, `sound`, `time` are reserved path prefixes (lowercase)
- All non-reserved paths fall back to Text product (backward compatible)
- `/text/light` displays text "light" (`text/` prefix overrides reserved words)
- Text share links use `led.run/content` short-link form (no `/text/` prefix)

All params are "preference hints" — themes decide whether to consume them.

| Param | Alias | Type | Description |
|-------|-------|------|-------------|
| `theme` | `t` | string | Theme/effect/visualizer ID |
| `mode` | — | string | Display mode hint (sign/flow) |
| `color` | `c` | hex (6 or 8 digit) | Text color (no #), 8-digit AARRGGBB for alpha |
| `bg` | — | hex (6 or 8 digit) | Background color (no #), 8-digit AARRGGBB for alpha |
| `speed` | — | number | Scroll speed |
| `direction` | `dir` | string | Scroll direction |
| `font` | — | string | Font family |
| `wakelock` | `w` | boolean | Keep screen on (App-level, default true) |
| `scale` | — | number | Display scale multiplier (Text: 0.1–1, Time: 0.1–3, default 1) |
| `fill` | — | hex (6 or 8 digit) | Card face background color (no #), used by card themes when scale < 1 |
| `cursor` | `cur` | number | Cursor auto-hide delay (App-level) |
| `lang` | `l` | string | UI language (en/zh/ja/ko/es/fr/de), App-level |
| `position` | — | string | Clock position (center/top/bottom/top-left/top-right/bottom-left/bottom-right), Time product |
| `padding` | — | number | Container padding in % (0–20, default 0), Time product |
| `format` | — | string | Time format (12h/24h), Time product |
| `showSeconds` | — | boolean | Show seconds display, Time product |
| `showDate` | — | boolean | Show date display, Time product |
| `dateFormat` | — | string | Date format (MDY/DMY/YMD), Time product |
| `tz` | — | number | Timezone UTC offset (-12 to 14, default: local timezone), Time product |
| `lcdScale` | — | number | LCD overall scale (0.3–2.0, default 1.0), LCD clock |
| `lcdPosition` | — | string | LCD position (center/top/bottom/top-left/top-right/bottom-left/bottom-right), LCD clock |
| `lcdFull` | — | boolean | LCD fullscreen mode (removes bezel, fills container), LCD clock |

## Manager Interfaces (Symmetric Design)

### TextManager (`js/core/text-manager.js`)

```
register(theme), switch(themeId, container, text, config), getCurrent(),
getCurrentId(), getThemeIds(), hasTheme(id), getDefaults(id),
getCurrentConfig(), getCurrentText(), resize(), load(basePath)
```

**Text Theme interface:**
```javascript
{
  id: 'neon',
  defaults: { color: 'ff0000', bg: '000000', mode: 'auto', speed: 3 },
  init(container, text, config) {},
  destroy() {}
}
```

### LightManager (`js/core/light-manager.js`)

```
register(effect), switch(effectId, container, config), getCurrent(),
getCurrentId(), getEffectIds(), hasEffect(id), getDefaults(id),
getCurrentConfig(), resize()
```

**Light Effect interface:**
```javascript
{
  id: 'disco',
  defaults: { colors: 'ff0000,00ff00,0000ff', speed: 1, brightness: 100 },
  init(container, config) {},
  destroy() {}
}
```

### SoundManager (`js/core/sound-manager.js`)

```
register(viz), switch(vizId, container, config, audioEngine), getCurrent(),
getCurrentId(), getVisualizerIds(), hasVisualizer(id), getDefaults(id),
getCurrentConfig(), resize()
```

**Sound Visualizer interface:**
```javascript
{
  id: 'bars',
  defaults: { color: '00ff41', bg: '000000', sensitivity: 5, smoothing: 0.8 },
  init(container, config, audioEngine) {},
  destroy() {}
}
```

### TimeManager (`js/core/time-manager.js`)

```
register(clock), switch(clockId, container, config), getCurrent(),
getCurrentId(), getClockIds(), hasClock(id), getDefaults(id),
getCurrentConfig(), resize()
```

**Clock Theme interface:**
```javascript
{
  id: 'digital',
  defaults: { color: 'ff0000', bg: '0a0a0a', format: '24h', showSeconds: true },
  init(container, config) {},
  destroy() {}
}
```

### AudioEngine (`js/core/audio-engine.js`)

```
isSupported(), init(options) → Promise, getFrequencyData() → Uint8Array,
getTimeDomainData() → Uint8Array, getBinCount(), getSampleRate(),
updateSettings(options), pause() → Promise, resume() → Promise,
isRunning(), destroy()
```

Pipeline: `getUserMedia({ audio }) → AudioContext → MediaStreamSource → AnalyserNode`

**Chrome autoplay policy handling**: When mic permission is pre-saved, `getUserMedia` resolves without a dialog (no user gesture), so AudioContext starts `suspended`. `init()` resolves immediately after pipeline setup (`_running = true`), attempts a non-blocking `context.resume()`, and installs one-time `click`/`touchstart`/`keydown` listeners as fallback. On first user interaction, `context.resume()` is called with a real gesture, transitioning to `'running'`. `isRunning()` gates on `context.state === 'running'`, so visualizers show idle state until context resumes, then auto-transition.

## File Structure

```
robots.txt                SEO crawler directives
sitemap.xml               SEO sitemap (7 landing pages, 7 docs pages, 4 product pages)
_redirects                Cloudflare Pages rewrite rules (robots/sitemap before SPA catch-all)
css/main.css              Global reset + layout
css/landing.css           Landing page styles + language switcher + product tabs
css/docs.css              Documentation page styles + language switcher
css/toolbar.css           Floating toolbar styles + rotation classes
css/settings.css          Settings panel styles (drawer/bottom-sheet)
css/light.css             Light product global styles
css/sound.css             Sound product global styles
css/time.css              Time product global styles
docs/index.html           Documentation site (English)
docs/{lang}/index.html    Translated documentation (zh/ja/ko/es/fr/de)
js/core/url-parser.js     URL text + param extraction + product detection
js/core/text-engine.js    Auto-fit text sizing utility
js/core/text-manager.js   Text theme registry, switching + dynamic loading
js/core/light-manager.js  Light effect registry, switching + lifecycle
js/core/sound-manager.js  Sound visualizer registry, switching + lifecycle
js/core/audio-engine.js   Web Audio API pipeline (mic → analyzer)
js/core/time-manager.js   Clock theme registry, switching + lifecycle
js/core/time-utils.js     Shared time utilities (timezone, formatting)
js/core/i18n.js           I18n module — locale detection + translation lookup
locales/{lang}.js         Translation strings (en/zh/ja/ko/es/fr/de)
texts/{id}/renderer.js    Text theme implementation (self-registers via TextManager.register)
texts/{id}/style.css      Text theme stylesheet
lights/{id}/renderer.js   Light effect implementation (self-registers via LightManager.register)
sounds/{id}/renderer.js   Sound visualizer implementation (self-registers via SoundManager.register)
times/{id}/renderer.js    Clock theme implementation (self-registers via TimeManager.register)
js/ui/fullscreen.js       Fullscreen API (from til.re)
js/ui/wakelock.js         Wake Lock API (from til.re)
js/ui/cursor.js           Cursor auto-hide (from til.re)
js/ui/controls.js         Keyboard/pointer input
js/ui/cast.js             Presentation API casting (controller + receiver)
js/ui/toolbar.js          Floating toolbar (fullscreen/rotate/cast/settings/share)
js/ui/settings.js         Settings panel — visual param configuration
js/app.js                 App entry + multi-product orchestrator
.github/workflows/deploy.yml  CI/CD — Cloudflare Pages deploy on push to main
```

## Available Text Themes

| ID | Effect | Custom Params |
|----|--------|---------------|
| `default` | Classic green LED sign | — |
| `neon` | Glowing neon with flicker | `flicker` |
| `retro` | CRT scanlines + vignette | `scanlines` |
| `glitch` | RGB split + jitter + distortion | `intensity` |
| `typewriter` | Character-by-character typing + cursor | `typingSpeed` |
| `gradient` | Rainbow gradient text flow | — |
| `hologram` | Chromatic aberration + scanline sweep | — |
| `broadcast` | Studio "ON AIR" indicator + recording dot | `dot`, `fill` |
| `marquee` | Broadway chase light bulbs (Canvas) | `chase`, `bulbColor`, `fill` |
| `pulse` | Breathing mood ambient + radial glow | `rhythm` |
| `aurora` | Northern lights wave bands (Canvas) | `intensity` |
| `firework` | Particle fireworks system (Canvas) | `rate` |
| `wood` | Warm wooden cafe sign with painted text | `grain`, `warm`, `fill` |
| `cyber` | Matrix terminal decode effect + HUD overlay | `glitch` |
| `tokyo` | Cyberpunk rain-soaked neon + Japanese decorations | — |
| `blueprint` | Architectural blueprint drawing style | — |
| `monolith` | Brutalist high-contrast display | — |
| `street-sign` | Highway guide sign + rivets + reflective coating | `sub`, `exit`, `arrow`, `glare`, `fill` |
| `do-not-disturb` | Skeuomorphic lightbox + glass panel | `fill`, `glow` |
| `dot-matrix` | Skeuomorphic LED dot-matrix board (Canvas) | `res`, `gap`, `glow`, `shape`, `bezel`, `weight`, `flicker`, `fill`, `wrap` |
| `vfd` | Vacuum fluorescent 14-segment display (Canvas) | `glow`, `flicker`, `mesh`, `tube` |
| `chalk` | Realistic chalkboard with chalk texture (Canvas) | `roughness`, `dust`, `smudge`, `board` |
| `stamp` | Rubber stamp on aged paper (DOM/CSS) | `ink`, `aged`, `smudge`, `paper` |
| `cinema` | Cinema marquee letterboard (DOM) | `rows`, `backlight`, `felt` |
| `gothic` | Medieval illuminated manuscript (DOM/CSS) | `ornate`, `aged`, `illuminated`, `seal`, `candle` |
| `railway` | Solari split-flap departure board (DOM/CSS 3D) | `flipSpeed`, `housing`, `wear`, `vibration` |
| `sticker` | Vinyl sticker with glossy/holographic finish (DOM/CSS) | `finish`, `peel`, `outline`, `glitter` |
| `embroidery` | Cross-stitch on linen fabric (Canvas) | `stitch`, `fabric`, `hoop`, `tension` |
| `smoke` | Particle smoke forming/dissolving text (Canvas) | `density`, `turbulence`, `shafts`, `glow` |
| `sand` | Beach sand writing with wave animation (Canvas) | `depth`, `wetness`, `foam`, `detail`, `showWaves` |

## Available Light Effects

| ID | Effect | Custom Params |
|----|--------|---------------|
| `solid` | Solid color / flashlight | `color`, `brightness` |
| `strobe` | Adjustable-rate strobe | `color`, `speed` |
| `disco` | Multi-color rotation | `colors`, `speed` |
| `gradient` | Gradient color flow | `colors`, `speed` |
| `emergency` | Red-blue alternating police | `speed` |
| `candle` | Candlelight flicker simulation | `color`, `warmth` |
| `rainbow` | Rainbow color cycle | `speed` |
| `sos` | Morse code SOS signal | `color` |
| `breathing` | Slow radial breathing pulse | `cycle`, `depth` |
| `sunset` | Sunset sky gradient with sun and clouds | `sunSize`, `cloudDensity` |
| `heartbeat` | Center pulse with BPM-driven ripple rings | `bpm`, `pulse` |
| `matrix-rain` | Falling green characters (Canvas) | `density` |
| `aurora-waves` | Multi-layer sine wave aurora bands | `waves`, `amplitude` |
| `campfire` | Particle campfire with sparks and smoke | `sparks`, `wind` |
| `lightning` | Fractal lightning bolts + flash (≤3Hz safe) | `frequency`, `branches` |
| `kaleidoscope` | N-fold rotational symmetry patterns | `symmetry`, `complexity` |
| `plasma` | Classic sine-wave plasma (1/4 res buffer) | `waveScale`, `intensity` |
| `lava-lamp` | Metaball lava lamp (1/4 res buffer) | `blobCount`, `viscosity` |

## Available Sound Visualizers

| ID | Effect | Custom Params |
|----|--------|---------------|
| `bars` | Premium green spectrum with persistent peaks, reflections, color modes | `smoothing`, `barCount`, `colorMode` |
| `scope` | CRT phosphor oscilloscope with trail persistence, dotted grid, beam dot | `lineWidth`, `gridLines` |
| `ocean` | Moonlit ocean dreamscape with stars, moon, foam particles (default 7 waves) | `waveCount` |
| `alchemy` | Organic energy vortex with energy waves, HSL spiral color, radial trail fade | `complexity` |
| `battery` | Sonar pulse system with radar sweep, gradient rings, interference glow | `pulseSpeed` |
| `ambience` | Deep atmospheric presets: Nebula (glow), Ripple (water), Veil (swirl) | `ambPreset`, `glowRadius` |
| `particle` | Tron-style 3D grid with connections, wave propagation, bloom lighting | `gridSize` |
| `musical-colors` | Artistic flowing effects (7 presets: aurora/water/silky/electric/neon/flame/star) | `mcPreset` |
| `spikes` | Dramatic 360° radial spikes with tip particles, inner core glow (default 96) | `spikeCount` |
| `plenoptic` | Cinematic bokeh light field with pre-rendered textures, depth color variation | `depth` |
| `waveform-3d` | Holographic 3D waveform with depth color gradient, grid lines (default depth 12) | `depth` |
| `spectrum-circle` | Monstercat-style circular spectrum with log binning, rotating glow ring, orb | `innerRadius` |

## Available Clock Themes

| ID | Effect | Custom Params |
|----|--------|---------------|
| `digital` | 7-segment LED display (Canvas, default) | `dotStyle`, `segmentStyle`, `glow`, `dimBrightness` |
| `minimal` | Clean minimal typography (DOM) | `align`, `weight`, `separator`, `uppercase` |
| `retro` | CRT terminal green phosphor (DOM) | `scanlines`, `vignette`, `flicker`, `prompt` |
| `binary` | Binary clock with glowing bits (DOM) | `dotStyle`, `glow`, `bitShape`, `showLabels` |
| `lcd` | Casio-style LCD watch face (DOM) | `backlight`, `bezel`, `brand`, `lcdScale`, `lcdPosition`, `lcdFull` |
| `analog` | Classic analog clock with smooth hands (Canvas) | `style`, `handColor`, `markers` |
| `flip` | Mechanical split-flap display (CSS 3D) | `flipSpeed`, `gap` |
| `nixie` | Warm glowing nixie tube display (Canvas) | `glow`, `flicker`, `tubeColor`, `warmth` |
| `neon` | Neon tube glow sign (DOM+CSS) | `glow`, `flicker`, `tube` |
| `word` | Time spelled in English words (DOM) | `wordLang`, `showPeriod`, `animation` |
| `sun` | Sundial with sky gradient (Canvas) | `stars`, `showSundial`, `atmosphere` |
| `calendar` | Monthly calendar with time (DOM) | `firstDay`, `weekendHighlight`, `compact`, `weekendColor` |
| `matrix` | Matrix rain with time overlay (Canvas) | `density`, `speed`, `charset`, `glowIntensity` |
| `gradient` | Background shifts with time of day (DOM) | `palette`, `angle` |

## Script Load Order

```
core (url-parser, text-engine, text-manager, light-manager, sound-manager, audio-engine, time-manager, time-utils, i18n)
→ locales
→ texts (text themes)
→ lights (light effects)
→ sounds (sound visualizers)
→ times (clock themes)
→ ui (fullscreen, wakelock, cursor, controls, cast, toolbar, settings)
→ app
```

## Adding a New Text Theme

1. Create `texts/{id}/renderer.js` with the theme interface
2. Create `texts/{id}/style.css` for styles
3. Add `<link>` and `<script>` tags to `index.html`
4. Theme self-registers via `TextManager.register()`

For dynamic loading (without editing index.html): `TextManager.load('/texts/{id}')`

## Toolbar

The floating toolbar provides fullscreen, rotate, cast, settings, and share buttons. It syncs with cursor auto-hide (fades out when cursor is hidden). `Toolbar.init({ container, product })` accepts a `product` option ('text'/'light'/'sound') so rotation calls the correct manager's resize via `Settings.PRODUCT_ADAPTERS`.

- **`data-theme` attribute**: `#app[data-theme="xxx"]` is set by app.js when a theme is active, enabling theme-scoped CSS selectors
- **DOM structure** (stable API for theme CSS):
  - `.toolbar` — toolbar container
  - `.toolbar-btn` — button elements
  - `.toolbar-btn[data-action="fullscreen|rotate|cast|settings|share"]` — specific buttons
  - `.toolbar-toast` — toast notification

### Theme Customization

Themes can override toolbar appearance via CSS custom properties or full CSS overrides.

**Quick color override:**
```css
#app[data-theme="broadcast"] .toolbar {
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

Themes can also fully override position, shape, and animations via standard CSS targeting `#app[data-theme="xxx"] .toolbar`.

### Toolbar Buttons by Product

| Button | Text | Light | Sound | Time |
|--------|------|-------|-------|------|
| Fullscreen | Yes | Yes | Yes | Yes |
| Rotate | Yes | Yes | Yes | Yes |
| Cast | Yes | Yes | Yes | Yes |
| Settings | Yes | Yes | Yes | Yes |
| Share | Yes | Yes | Yes | Yes |
| Microphone | No | No | Yes | No |

## Keyboard & Pointer Controls

| Action | Key/Gesture | Text | Light | Sound | Time |
|--------|-------------|------|-------|-------|------|
| Toggle pause | Space | Pause/resume animation | — | — | — |
| Fullscreen | F / DblClick | Yes | Yes | Yes | Yes |
| Settings | S | Open settings panel | Open settings panel | Open settings panel | Open settings panel |
| Next | Right arrow | — | Next effect | Next visualizer | Next clock |
| Previous | Left arrow | — | Previous effect | Previous visualizer | Previous clock |
| Adjust up | Up arrow | — | Brightness +5 | Sensitivity +1 | — |
| Adjust down | Down arrow | — | Brightness -5 | Sensitivity -1 | — |
| Exit fullscreen | Escape | Yes | Yes | Yes | Yes |

**Click-to-pause is removed** — avoids accidental toggles on touch devices. Double-click/F for fullscreen is the only pointer gesture.

## Key Design Decisions

- **Brand positioning: "Display Toolkit"** — v2.0 rebrand from "Digital Signage" to "Display Toolkit" to reflect the multi-product platform (Text + Light + Sound + Time). Used across HTML titles, meta descriptions, OG tags, manifest, and locale strings
- **SEO: OG + Twitter + canonical, no og:image** — index.html and all 7 docs pages include Open Graph, Twitter Card, and canonical link tags. No `og:image` because the project has no image assets (can be added later). SPA limitation: all routes share `index.html` OG tags. Meta descriptions reference all four products and "70+ display modes" (30+18+12+14=74). Docs pages list product-specific theme counts (e.g., "30 text themes, 18 light effects, 12 sound visualizers, 14 clock themes")
- **No independent mode-resolver** — mode logic lives inside each theme
- **TextEngine is a public utility** — shared auto-fit, not a module boundary
- **Controls bridge via App** — Controls → App callbacks → manager.getCurrent()
- **UI modules copied from til.re** — fullscreen.js, wakelock.js, cursor.js are identical
- **Toolbar uses `<button>` elements** — controls.js ignores clicks on `button` elements, preventing toolbar clicks from triggering pause/fullscreen
- **Themes must use container dimensions, not viewport** — `_fitText` and CSS sizing must reference `this._container.clientWidth/clientHeight` (or CSS `100%`), never `window.innerWidth/innerHeight` (or CSS `100vw/100vh`), because toolbar rotation swaps the container's width/height via CSS classes while the viewport stays the same. DOM clock themes use a container-relative sizing helper in `init()`: `function s(xPct, yPct) { return Math.min(cw * xPct / 100, ch * (yPct || xPct) / 100) + 'px'; }` — replaces all `min(Xvw, Yvh)` CSS patterns with computed px values. Themes that reference sizes in `_render()` (binary, calendar) store the helper as `this._s`
- **DOM theme `_resizeHandler` uses destroy+re-init** — DOM-based clock themes (flip, lcd, neon, minimal, retro, binary, word, calendar, gradient) implement `_resizeHandler` with: save container/config refs → `destroy()` → `container.innerHTML = ''` → `init(container, config)`. This recalculates all container-relative sizes. Canvas-based themes (digital, analog, nixie, sun, matrix) handle resize differently via canvas redraw
- **Flip clock text centering uses flex layout** — flip card text uses `height:200%; display:flex; align-items:center; justify-content:center` instead of `line-height` matching. Top half text renders naturally; bottom half text adds `transform:translateY(-50%)`. This ensures pixel-perfect alignment between static halves and flip animation overlays. Flip animation uses sequential two-phase timing: flipOut runs for `D/2 ms ease-in`, flipIn runs for `D/2 ms ease-out` with `D/2` delay (total = D, no overlap)
- **Themes must never set inline `transform` on the container** — toolbar rotation uses CSS class `transform` on `#display`; inline styles override CSS classes. Use an inner wrapper div for theme transforms like `scale()`
- **Time product scale/position/padding uses Manager-layer wrapper** — When `scale !== 1` or `padding > 0`, `TimeManager.switch()` creates a flex container on the outer element with position-based alignment, then inserts a wrapper div sized to `scale*100%` width/height. Scale range is 0.1–3: values < 1 shrink the clock, values > 1 enlarge it (wrapper exceeds container, `overflow:hidden` clips, `position` controls which portion is visible). Themes `init()` into the wrapper, so they see real dimensions (not transform-scaled). `padding` is CSS padding on the outer container. `position` maps to flex `align-items`/`justify-content`. LCD's own `lcdScale`/`lcdPosition` work independently inside the wrapper, stacking with these params
- **Scale parameter has two strategies** — Card themes (broadcast, street-sign, wood, do-not-disturb, marquee, dot-matrix) use CSS `transform: scale()` on an inner wrapper div; container `background: transparent` by default when `scale < 1`, overridable via `bg` param; the card face color is controlled by `fill` param (each theme provides its own default). Extended themes (all others) apply `scale` as a font-size multiplier: autoFit result × scale for sign mode, container height ratio × scale for flow mode; background effects remain fullscreen.
- **Presentation API casting** — `Cast` module uses W3C Presentation API (Chrome/Edge only); receiver detected via `navigator.presentation.receiver` (no URL params needed); receiver skips Controls + Toolbar for clean display; controller persists connection ID in `sessionStorage` for reconnect across page navigations; unsupported browsers never see the cast button
- **Settings panel** — right-side drawer (desktop 360px) / bottom sheet (mobile ≤640px); opens via toolbar gear button or `S` key; disables cursor auto-hide while open; real-time preview via debounced manager switch on param change; `history.replaceState()` syncs URL without page reload; switching themes resets theme-specific params but preserves common params; `KNOWN_PARAMS` metadata drives control types (color picker, range slider, select, toggle); polymorphic params like `glow` auto-detect type from theme defaults; `PRODUCT_ADAPTERS` map each product to its manager, i18n prefix, common params, URL builder, and resize method; adapters can define `knownParamOverrides` to override global `KNOWN_PARAMS` ranges for product-specific needs (e.g., Light `speed` uses 1-20 instead of Text's 10-300); `_buildField` checks adapter overrides before global metadata; `Settings.syncThemeId(id)` allows external code (e.g., arrow key navigation) to notify Settings of theme changes; text input only shown for text product; `audioEngine` passed via init options for sound product
- **Landing page** — Tab switcher (Text / Light / Sound / Time); each product has Simple + Studio modes; Text simple mode navigates with `led.run/content` short links; mode preference persisted in `localStorage('led-active-mode')`
- **Font param uses combo control** — `FONT_PRESETS` array defines web-safe presets (monospace, serif, sans-serif, cursive, Arial, Georgia, Courier New, Impact, Comic Sans MS) with i18n labels; `FONT_CUSTOM_VALUE = '__custom__'` sentinel triggers a text input for arbitrary font names; both settings panel and landing builder use the same combo pattern; `Settings.FONT_PRESETS` and `Settings.FONT_CUSTOM_VALUE` are exposed for reuse
- **Random style button** — Landing page dice button next to GO picks random theme, random text color (HSL high saturation), random bg color (HSL low lightness), random fill color (for card themes only), and random font (from FONT_PRESETS); speed/direction/scale/theme-specific params use theme defaults
- **Multi-product routing** — URLParser detects product from path prefix; App.init() switches on product type to call `_initText`/`_initLight`/`_initSound`/`_initTime`; each product initializes its own manager, controls, and settings
- **Light/Sound/Time share URLs must include `?t=`** — `/light`, `/sound`, and `/time` without `?t=` route to the landing page; `_syncURL()` always emits `?t=` for light/sound/time products (even for default effect/visualizer/clock), so share links like `/light?t=solid`, `/sound?t=bars`, and `/time?t=digital` work correctly; text product keeps existing behavior (no `?t=` for default theme)
- **AudioContext needs user-gesture resume** — Chrome autoplay policy starts AudioContext in `suspended` state when `getUserMedia` resolves without a dialog (pre-saved permission = no user gesture). `AudioEngine.init()` never blocks on `context.resume()` — it resolves immediately after pipeline setup, attempts a non-blocking resume, and installs one-time gesture listeners (`click`/`touchstart`/`keydown`) as fallback. `isRunning()` checks `context.state === 'running'` so visualizers gate data reads correctly and auto-transition when the context resumes
- **Builder-Settings param alignment** — Landing page builders use the same `defaults[key] !== undefined` logic as Settings panel to conditionally show/hide common param controls when effect/visualizer changes; `direction` control added to Text builder; each common param row has a unique ID for dynamic visibility toggling
- **TimeManager follows LightManager pattern** — TimeManager is architecturally identical to LightManager (no text input, no audio engine); clock themes implement `{ id, defaults, init(container, config), destroy() }` interface; `TimeUtils` provides shared time utilities (`getTime(tz)`, `formatHours()`, `formatDate()`, `padZero()`, `getAmPm()`); timezone offset via `?tz=N` parameter (UTC hours); clock themes use Canvas (digital, analog, nixie, sun, matrix), DOM (minimal, binary, lcd, word, calendar), CSS 3D (flip), or hybrid (retro, neon, gradient)
- **Builder preview must mirror `#display` layout** — `#builder-live-preview` must have the same layout properties as `#display` (`display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative`); without these, ID selector specificity overrides theme class styles (e.g., `.theme-wood { display: flex }` loses to `#builder-live-preview { display: block }`), causing preview/display inconsistency across all 30 themes
- **Builder browser window chrome** — `.builder-canvas` is a unified browser window shell (border-radius, border, box-shadow, overflow hidden). Inside: `.browser-bar` (address bar with `.browser-dots` traffic light decoration + `.builder-url-box` + `.builder-actions` GO/Copy buttons) on top, `.preview-card` (rendering viewport) below. The old `.prop-card-highlight` Action Card is removed — URL bar and action buttons live inside the browser chrome. Desktop (>1024px) uses CSS Grid (`400px 1fr`) with `.builder-canvas` as a sticky flex column (`height: calc(100vh - 6rem)`) where `.preview-card` fills remaining space via `flex: 1`. `.landing-content--wide` class removes max-width when builder mode is active. Mobile (≤1024px) uses flex column with order (1: browser window, 2: controls). Mobile ≤800px: `.browser-bar` wraps with `flex-wrap: wrap`

## Internationalization (i18n)

Supported languages: English (`en`), Simplified Chinese (`zh`), Japanese (`ja`), Korean (`ko`), Spanish (`es`), French (`fr`), German (`de`).

### How It Works

- `I18n` is a global IIFE module (`js/core/i18n.js`) loaded after text-manager, before locales
- Each locale file (`locales/{lang}.js`) calls `I18n.register(lang, {...})` to register translations
- Language detection priority: URL `?lang=xx` → `localStorage('led-lang')` → `navigator.language` → `'en'`
- Landing page and toolbar use `I18n.t('key')` for all user-facing strings
- Documentation has separate translated HTML files per language (`docs/{lang}/index.html`)

### Adding a New Language

1. Create `locales/{lang}.js` with all keys from `locales/en.js`
2. Create `docs/{lang}/index.html` (translated copy of `docs/index.html`)
3. Add `<script src="/locales/{lang}.js"></script>` to `index.html`
4. Add the language code to `SUPPORTED` array in `js/core/i18n.js`
5. Add language label to `LANG_LABELS` in `js/app.js`
6. Add redirect rules in `_redirects`
7. Update language switchers in all `docs/*/index.html` files

### Key Conventions

- **Preset display text is NOT translated** — "DO NOT DISTURB", "HELLO" etc. are sign content, not UI
- **Preset badges and descriptions ARE translated** — these are UI labels
- Translation keys use dot-separated flat structure: `'landing.hero.title'`, `'toolbar.toast.linkCopied'`
- `I18n.t()` falls back to English, then returns the key itself if missing

## Deployment

- **CI/CD**: GitHub Actions → `cloudflare/wrangler-action@v3` → Direct Upload to Cloudflare Pages
- **Trigger**: push to `main` branch
- **No build step** — deploys the project root directory as-is
- **Required GitHub Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
