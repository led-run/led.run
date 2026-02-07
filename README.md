# led.run

Minimal digital signage. URL is your sign.

## Usage

Just put your text in the URL:

```
https://led.run/OPEN
https://led.run/Hello World
https://led.run/你好
```

### Parameters

Add query parameters to customize:

```
https://led.run/SALE?c=ff0000            # Red text
https://led.run/OPEN?t=neon              # Neon theme
https://led.run/RETRO?t=retro            # CRT retro theme
https://led.run/Welcome!?mode=flow       # Force scrolling mode
https://led.run/NEWS?speed=120&dir=right # Fast, right-to-left scroll
```

| Param | Alias | Description |
|-------|-------|-------------|
| `theme` | `t` | Theme: `default`, `neon`, `retro` |
| `mode` | — | `sign` (static) or `flow` (scroll) |
| `color` | `c` | Text color hex (no `#`) |
| `bg` | — | Background color hex (no `#`) |
| `speed` | — | Scroll speed (default: 60) |
| `direction` | `dir` | Scroll direction: `left` or `right` |
| `font` | — | Custom font family |
| `wakelock` | `w` | Keep screen on (`true`/`false`) |

## Themes

- **default** — Classic LED sign, green on black with subtle glow
- **neon** — Neon sign with glow, breathe, and flicker animations
- **retro** — CRT monitor with scanlines and vignette

## Controls

| Input | Action |
|-------|--------|
| `Space` | Pause/resume |
| `F` | Toggle fullscreen |
| `Escape` | Exit fullscreen |
| Click | Pause/resume |
| Double-click | Toggle fullscreen |

## Auto Mode Detection

Short text (≤10 characters) displays as a static **SIGN**. Longer text automatically scrolls as **FLOW**. Override with `?mode=sign` or `?mode=flow`.

## Development

```bash
npx serve .
```

No build step required. Pure vanilla JS/CSS.

## License

MIT
