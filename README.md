# led.run — Display Toolkit

Turn any screen into a text sign, light effect, sound visualizer, clock display, QR code, or camera filter. 80+ display modes. No apps, no accounts — just a URL.

## Products

### Text — 30 Themes

LED-style text signs with auto-fit sizing, sign and flow modes.

```
led.run/HELLO                           Simple sign
led.run/OPEN?t=neon&c=ff2d78            Neon theme, custom color
led.run/WELCOME?mode=flow&speed=120     Scrolling marquee
led.run/text/light                      Display the word "light"
```

### Light — 18 Effects

Full-screen light effects: flashlight, strobe, disco, candle, aurora, and more.

```
led.run/light?t=solid                   Flashlight
led.run/light?t=disco&speed=3           Disco rotation
led.run/light?t=candle&warmth=80        Warm candlelight
led.run/light?t=aurora-waves            Northern lights
```

### Sound — 12 Visualizers

Real-time audio visualizations driven by your microphone.

```
led.run/sound?t=bars                    Spectrum analyzer
led.run/sound?t=ocean&waveCount=10      Moonlit ocean
led.run/sound?t=waveform-3d             3D waveform
led.run/sound?t=spectrum-circle         Circular spectrum
```

### Time — 14 Clocks

Beautiful clock displays: digital, analog, flip, nixie, neon, and more.

```
led.run/time?t=digital                  7-segment LED clock
led.run/time?t=analog&showDate=true     Analog with date
led.run/time?t=nixie&format=12h         Nixie tubes, 12h
led.run/time?t=flip                     Flip clock
```

### QR — 4 Themes

Full-screen QR code display with visual themes.

```
led.run/qr/https://example.com          Standard QR code
led.run/qr/HELLO?t=neon                 Neon glow QR
led.run/qr/WIFI:S:MyNet;T:WPA;P:pass;;?t=dot   Dot-style QR
led.run/qr/hello?t=pixel&ec=H           Pixel art, high ECC
```

### Camera — 4 Effects

Real-time camera feed with visual effect filters.

```
led.run/camera?t=default                Mirror view
led.run/camera?t=ascii                  ASCII art
led.run/camera?t=pixel&blockSize=12     Pixelated mosaic
led.run/camera?t=surveillance           Security camera style
```

## URL Protocol

```
Text:   led.run/HELLO?t=neon              Path = text content
        led.run/text/HELLO?t=neon         Explicit /text/ prefix
Light:  led.run/light?t=disco             Product prefix + params
Sound:  led.run/sound?t=bars              Product prefix + params
Time:   led.run/time?t=digital            Product prefix + params
QR:     led.run/qr/CONTENT?t=neon         Path = QR content (URL-encoded)
Camera: led.run/camera?t=ascii            Product prefix + params
```

All parameters are optional "preference hints" — themes decide whether to consume them.

## Controls

| Key | Text | Light | Sound | Time | QR | Camera |
|-----|------|-------|-------|------|-----|--------|
| Space | Pause/resume | — | — | — | — | — |
| F / Double-click | Fullscreen | Fullscreen | Fullscreen | Fullscreen | Fullscreen | Fullscreen |
| S | Settings | Settings | Settings | Settings | Settings | Settings |
| ← → | — | Prev/next effect | Prev/next visualizer | Prev/next clock | Prev/next theme | Prev/next effect |
| ↑ ↓ | — | Brightness ±5 | Sensitivity ±1 | — | — | — |
| Esc | Exit fullscreen | Exit fullscreen | Exit fullscreen | Exit fullscreen | Exit fullscreen | Exit fullscreen |

## Documentation

Full docs with all themes, effects, visualizers, and parameters: [led.run/docs](https://led.run/docs)

Available in: English, 中文, 日本語, 한국어, Español, Français, Deutsch

## Development

```bash
npx serve .
```

No build step required. Pure vanilla JS/CSS.

## License

MIT
