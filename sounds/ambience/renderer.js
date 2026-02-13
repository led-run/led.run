;(function(global) {
  'use strict';

  // --- Color helpers (IIFE-scoped) ---

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h, s: s, l: l };
  }

  function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  /**
   * Shift a hex color's hue by degrees and return rgb object.
   */
  function shiftHue(hex, degrees) {
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.h += degrees / 360;
    if (hsl.h > 1) hsl.h -= 1;
    if (hsl.h < 0) hsl.h += 1;
    return hslToRgb(hsl.h, hsl.s, hsl.l);
  }

  // --- Ambient particles (shared across all presets) ---

  function createAmbientDots(count, w, h) {
    var dots = [];
    for (var i = 0; i < count; i++) {
      dots.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      });
    }
    return dots;
  }

  function updateAndDrawAmbientDots(ctx, dots, w, h, time, volume, color) {
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];

      // Gentle floating drift
      d.x += d.vx + Math.sin(time * 0.5 + d.phase) * 0.15;
      d.y += d.vy + Math.cos(time * 0.4 + d.phase) * 0.15;

      // Wrap around edges
      if (d.x < -5) d.x = w + 5;
      if (d.x > w + 5) d.x = -5;
      if (d.y < -5) d.y = h + 5;
      if (d.y > h + 5) d.y = -5;

      // Twinkle effect: oscillate alpha
      var twinkle = 0.6 + Math.sin(time * 2 + d.phase) * 0.4;
      var dotAlpha = d.alpha * twinkle * (0.6 + volume * 0.4);

      ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + dotAlpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }


  // =====================================================================
  // Ambience Visualizer
  // =====================================================================

  var AmbienceVisualizer = {
    id: 'ambience',

    defaults: {
      color: '4080ff',
      bg: '000000',
      sensitivity: 5,
      glowRadius: 0.6,
      ambPreset: 'glow'    // glow (Nebula), water (Ripple), swirl (Veil)
    },

    _canvas: null,
    _offCanvas: null,
    _ctx: null,
    _offCtx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _lastTime: 0,
    _time: 0,
    _avgVolume: 0,
    _ambientDots: null,

    // Nebula (glow) state
    _orbs: null,

    // Ripple (water) state
    _ripples: null,
    _lastRippleTime: 0,
    _rippleHueOffset: 0,

    // Veil (swirl) state
    _bands: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._lastTime = 0;
      this._time = 0;
      this._avgVolume = 0;
      this._ripples = [];
      this._lastRippleTime = 0;
      this._rippleHueOffset = 0;
      this._orbs = null;
      this._bands = null;

      // Main canvas (full resolution for final compositing)
      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      // Offscreen canvas at 1/2 resolution
      this._offCanvas = document.createElement('canvas');
      this._offCtx = this._offCanvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._draw();
    },

    destroy: function() {
      if (this._animFrameId) {
        cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
      }
      if (this._boundResize) {
        window.removeEventListener('resize', this._boundResize);
        this._boundResize = null;
      }
      if (this._canvas && this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
      }
      this._canvas = null;
      this._ctx = null;
      this._offCanvas = null;
      this._offCtx = null;
      this._container = null;
      this._audioEngine = null;
      this._config = null;
      this._ambientDots = null;
      this._orbs = null;
      this._ripples = null;
      this._bands = null;
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;

      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Offscreen at half resolution
      this._offCanvas.width = Math.floor(w / 2) * dpr;
      this._offCanvas.height = Math.floor(h / 2) * dpr;
      this._offCtx.setTransform(dpr / 2, 0, 0, dpr / 2, 0, 0);

      // Re-init persistent elements sized to canvas
      this._initAmbientDots(w, h);
      this._initPresetState(w, h);
    },

    _initAmbientDots: function(w, h) {
      this._ambientDots = createAmbientDots(40, w, h);
    },

    _initPresetState: function(w, h) {
      var preset = (this._config && this._config.ambPreset) || this.defaults.ambPreset;

      if (preset === 'glow') {
        this._initNebula(w, h);
      } else if (preset === 'water') {
        this._ripples = [];
        this._lastRippleTime = 0;
        this._rippleHueOffset = 0;
      } else if (preset === 'swirl') {
        this._initVeil(w, h);
      }
    },

    // --- Nebula (glow) preset initialization ---

    _initNebula: function(w, h) {
      var colorHex = (this._config && this._config.color) || this.defaults.color;
      var count = 4; // 3-5 orbs, we use 4 as a nice middle
      this._orbs = [];

      for (var i = 0; i < count; i++) {
        // Spread hue offsets: -40, -13, +13, +40 degrees
        var hueOffset = -40 + (80 / (count - 1)) * i;
        var orbRgb = shiftHue(colorHex, hueOffset);
        var orbHsl = rgbToHsl(orbRgb.r, orbRgb.g, orbRgb.b);

        this._orbs.push({
          color: orbRgb,
          hsl: orbHsl,
          // Lissajous frequencies — unique per orb for varied motion
          freqX: 0.15 + i * 0.07,
          freqY: 0.1 + i * 0.09,
          phaseX: (Math.PI * 2 / count) * i,
          phaseY: (Math.PI * 2 / count) * i + Math.PI * 0.3,
          // Radius as fraction of canvas min dimension
          radiusFrac: 0.25 + (i % 2) * 0.2, // alternates between 0.25 and 0.45
          alpha: 0.3 + (i % 3) * 0.1        // 0.3, 0.4, 0.5, 0.3
        });
      }
    },

    // --- Veil (swirl) preset initialization ---

    _initVeil: function(w, h) {
      var count = 6; // 5-7 bands, 6 is a good balance
      this._bands = [];

      for (var i = 0; i < count; i++) {
        this._bands.push({
          phase: (Math.PI * 2 / count) * i,
          speed: 0.3 + Math.random() * 0.4,
          widthFrac: 0.15 + Math.random() * 0.2,   // 15-35% of canvas width
          hueOffset: -60 + (120 / (count - 1)) * i, // spread from green to purple
          amplitude: 0.05 + Math.random() * 0.1,
          alpha: 0.25 + Math.random() * 0.15
        });
      }
    },

    // --- Audio volume extraction ---

    _getVolume: function(sensitivity) {
      var freqData = null;
      var isRunning = this._audioEngine && this._audioEngine.isRunning();

      if (isRunning) {
        freqData = this._audioEngine.getFrequencyData();
      }

      var volume = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        volume = sum / freqData.length / 255;
      } else {
        volume = 0.08;
      }

      // Smooth volume
      this._avgVolume = this._avgVolume * 0.88 + volume * 0.12;

      var normalized = this._avgVolume * (sensitivity / 5);
      if (normalized > 1) normalized = 1;

      return { raw: volume, normalized: normalized, isRunning: !!isRunning };
    },

    // --- Frequency band extraction for veil preset ---

    _getFreqBands: function(bandCount) {
      var bands = [];
      var isRunning = this._audioEngine && this._audioEngine.isRunning();
      if (!isRunning) {
        for (var i = 0; i < bandCount; i++) bands.push(0);
        return bands;
      }

      var freqData = this._audioEngine.getFrequencyData();
      if (!freqData || freqData.length === 0) {
        for (var i = 0; i < bandCount; i++) bands.push(0);
        return bands;
      }

      var binSize = Math.floor(freqData.length / bandCount);
      for (var i = 0; i < bandCount; i++) {
        var sum = 0;
        var start = i * binSize;
        var end = start + binSize;
        if (end > freqData.length) end = freqData.length;
        for (var j = start; j < end; j++) {
          sum += freqData[j];
        }
        bands.push(sum / (end - start) / 255);
      }

      return bands;
    },

    // =================================================================
    // NEBULA PRESET (glow) — Floating orbs with Lissajous motion
    // =================================================================

    _drawNebula: function(offCtx, w, h, time, vol, bgColor, glowRadius) {
      if (!this._orbs) {
        this._initNebula(
          this._container.clientWidth,
          this._container.clientHeight
        );
      }

      var cx = w / 2;
      var cy = h / 2;
      var minDim = Math.min(w, h);

      // Background
      offCtx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      offCtx.fillRect(0, 0, w, h);

      // Draw each orb using screen compositing for bright intersections
      offCtx.globalCompositeOperation = 'screen';

      for (var i = 0; i < this._orbs.length; i++) {
        var orb = this._orbs[i];

        // Lissajous pattern position
        var breathScale = 0.7 + vol.normalized * 0.6;
        var driftX = Math.sin(time * orb.freqX + orb.phaseX) * cx * 0.5 * glowRadius * breathScale;
        var driftY = Math.cos(time * orb.freqY + orb.phaseY) * cy * 0.5 * glowRadius * breathScale;

        var orbX = cx + driftX;
        var orbY = cy + driftY;

        // Orb radius responsive to canvas and audio
        var baseRadius = minDim * orb.radiusFrac * glowRadius;
        var pulseRadius = baseRadius * (1 + vol.normalized * 0.3 + Math.sin(time * 1.2 + i) * 0.05);

        // Alpha intensifies slightly with volume
        var orbAlpha = orb.alpha + vol.normalized * 0.25;
        if (orbAlpha > 0.7) orbAlpha = 0.7;

        // Radial gradient orb
        var grad = offCtx.createRadialGradient(orbX, orbY, 0, orbX, orbY, pulseRadius);
        grad.addColorStop(0, 'rgba(' + orb.color.r + ',' + orb.color.g + ',' + orb.color.b + ',' + orbAlpha.toFixed(3) + ')');
        grad.addColorStop(0.4, 'rgba(' + orb.color.r + ',' + orb.color.g + ',' + orb.color.b + ',' + (orbAlpha * 0.6).toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + orb.color.r + ',' + orb.color.g + ',' + orb.color.b + ',0)');

        offCtx.fillStyle = grad;
        offCtx.fillRect(orbX - pulseRadius, orbY - pulseRadius, pulseRadius * 2, pulseRadius * 2);
      }

      offCtx.globalCompositeOperation = 'source-over';
    },

    // =================================================================
    // RIPPLE PRESET (water) — Audio-triggered concentric rings
    // =================================================================

    _drawRipple: function(offCtx, w, h, time, dt, vol, bgColor, colorHex, sensitivity) {
      var cx = w / 2;
      var cy = h / 2;
      var maxRadius = Math.max(w, h) * 0.7;

      // Background
      offCtx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      offCtx.fillRect(0, 0, w, h);

      // Spawn new ripple every 0.3s when volume > 0.2
      var spawnThreshold = 0.12;
      var spawnInterval = 0.3;

      if (vol.normalized > spawnThreshold && (time - this._lastRippleTime) > spawnInterval && this._ripples.length < 8) {
        this._rippleHueOffset += 15;
        if (this._rippleHueOffset > 360) this._rippleHueOffset -= 360;

        var rippleColor = shiftHue(colorHex, this._rippleHueOffset);
        this._ripples.push({
          radius: 5,
          maxRadius: maxRadius,
          life: 1,
          color: rippleColor,
          lineWidth: 4 + vol.normalized * 8,
          speed: 150 + vol.normalized * 200 // px/s expansion
        });
        this._lastRippleTime = time;
      }

      // Idle state: spawn faint slow ripple every 2s
      if (!vol.isRunning || vol.normalized < 0.05) {
        if ((time - this._lastRippleTime) > 2 && this._ripples.length < 3) {
          var idleColor = shiftHue(colorHex, this._rippleHueOffset);
          this._rippleHueOffset += 15;
          this._ripples.push({
            radius: 5,
            maxRadius: maxRadius * 0.6,
            life: 0.5,
            color: idleColor,
            lineWidth: 1.5,
            speed: 60
          });
          this._lastRippleTime = time;
        }
      }

      // Update and draw ripples with screen compositing
      offCtx.globalCompositeOperation = 'screen';

      for (var i = this._ripples.length - 1; i >= 0; i--) {
        var rip = this._ripples[i];

        // Expand
        rip.radius += rip.speed * dt;

        // Life decays as radius grows
        var progress = rip.radius / rip.maxRadius;
        rip.life = 1 - progress;

        if (rip.life <= 0 || rip.radius > rip.maxRadius) {
          this._ripples.splice(i, 1);
          continue;
        }

        // Diminishing alpha and lineWidth
        var alpha = rip.life * 0.9;
        var lw = rip.lineWidth * rip.life;
        if (lw < 0.5) lw = 0.5;

        var c = rip.color;
        offCtx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha.toFixed(3) + ')';
        offCtx.lineWidth = lw;
        offCtx.beginPath();
        offCtx.arc(cx, cy, rip.radius, 0, Math.PI * 2);
        offCtx.stroke();

        // Secondary faint ring slightly behind for thickness
        if (rip.radius > 15) {
          offCtx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (alpha * 0.45).toFixed(3) + ')';
          offCtx.lineWidth = lw * 2.5;
          offCtx.beginPath();
          offCtx.arc(cx, cy, rip.radius - lw * 1.5, 0, Math.PI * 2);
          offCtx.stroke();
        }
      }

      offCtx.globalCompositeOperation = 'source-over';

      // Center dot glow (always visible, pulses with volume)
      var dotAlpha = 0.15 + vol.normalized * 0.3;
      var dotRadius = 3 + vol.normalized * 8;
      var baseColor = hexToRgb(colorHex);
      var dotGrad = offCtx.createRadialGradient(cx, cy, 0, cx, cy, dotRadius * 4);
      dotGrad.addColorStop(0, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',' + dotAlpha.toFixed(3) + ')');
      dotGrad.addColorStop(1, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0)');
      offCtx.fillStyle = dotGrad;
      offCtx.beginPath();
      offCtx.arc(cx, cy, dotRadius * 4, 0, Math.PI * 2);
      offCtx.fill();
    },

    // =================================================================
    // VEIL PRESET (swirl) — Vertical aurora bands with horizontal sway
    // =================================================================

    _drawVeil: function(offCtx, w, h, time, vol, bgColor, colorHex, sensitivity) {
      if (!this._bands) {
        this._initVeil(
          this._container.clientWidth,
          this._container.clientHeight
        );
      }

      // Background
      offCtx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      offCtx.fillRect(0, 0, w, h);

      // Get frequency bands for per-band audio reactivity
      var freqBands = this._getFreqBands(this._bands.length);

      offCtx.globalCompositeOperation = 'screen';

      for (var i = 0; i < this._bands.length; i++) {
        var band = this._bands[i];
        var bandVol = freqBands[i] * (sensitivity / 5);
        if (bandVol > 1) bandVol = 1;

        // Use volume for idle vs active
        var effectiveVol = vol.isRunning ? bandVol : 0.1;

        // Band color from hue offset (green -> cyan -> purple spectrum)
        // Base hues: green=120, cyan=180, purple=280
        var bandColor = shiftHue(colorHex, band.hueOffset);

        // Band width varies with audio
        var bandWidth = w * band.widthFrac * (0.6 + effectiveVol * 0.8);
        if (bandWidth < 10) bandWidth = 10;

        // Horizontal displacement via sin wave
        var swayAmount = w * band.amplitude * (1 + effectiveVol * 2);
        var baseX = (w / (this._bands.length + 1)) * (i + 1);

        // Draw band as a series of vertical segments for curved effect
        var segments = 32;
        var segH = h / segments;

        offCtx.beginPath();

        for (var s = 0; s <= segments; s++) {
          var sy = s * segH;
          var t = s / segments;

          // Multiple sin waves for organic shape
          var sway = Math.sin(time * band.speed + band.phase + t * Math.PI * 2) * swayAmount;
          sway += Math.sin(time * band.speed * 0.7 + band.phase * 1.3 + t * Math.PI * 3) * swayAmount * 0.3;

          var sx = baseX + sway;

          if (s === 0) {
            offCtx.moveTo(sx - bandWidth / 2, sy);
          } else {
            offCtx.lineTo(sx - bandWidth / 2, sy);
          }
        }

        // Return path on the right edge
        for (var s = segments; s >= 0; s--) {
          var sy = s * segH;
          var t = s / segments;

          var sway = Math.sin(time * band.speed + band.phase + t * Math.PI * 2) * swayAmount;
          sway += Math.sin(time * band.speed * 0.7 + band.phase * 1.3 + t * Math.PI * 3) * swayAmount * 0.3;

          var sx = baseX + sway;
          offCtx.lineTo(sx + bandWidth / 2, sy);
        }

        offCtx.closePath();

        // Vertical gradient fill for each band (bright center, fading edges)
        var bandAlpha = band.alpha + effectiveVol * 0.3;
        if (bandAlpha > 0.7) bandAlpha = 0.7;

        var grad = offCtx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(' + bandColor.r + ',' + bandColor.g + ',' + bandColor.b + ',' + (bandAlpha * 0.3).toFixed(3) + ')');
        grad.addColorStop(0.3, 'rgba(' + bandColor.r + ',' + bandColor.g + ',' + bandColor.b + ',' + bandAlpha.toFixed(3) + ')');
        grad.addColorStop(0.5, 'rgba(' + bandColor.r + ',' + bandColor.g + ',' + bandColor.b + ',' + (bandAlpha * 1.2 > 1 ? 1 : bandAlpha * 1.2).toFixed(3) + ')');
        grad.addColorStop(0.7, 'rgba(' + bandColor.r + ',' + bandColor.g + ',' + bandColor.b + ',' + bandAlpha.toFixed(3) + ')');
        grad.addColorStop(1, 'rgba(' + bandColor.r + ',' + bandColor.g + ',' + bandColor.b + ',' + (bandAlpha * 0.3).toFixed(3) + ')');

        offCtx.fillStyle = grad;
        offCtx.fill();
      }

      offCtx.globalCompositeOperation = 'source-over';
    },

    // =================================================================
    // Main draw loop
    // =================================================================

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas || !self._container) return;

      // --- Delta time via performance.now() ---
      var now = performance.now();
      var dt;
      if (self._lastTime === 0) {
        dt = 0.016;
      } else {
        dt = (now - self._lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; // Clamp for tab re-focus
      }
      self._lastTime = now;
      self._time += dt;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      if (w === 0 || h === 0) {
        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      var cfg = self._config;
      var colorHex = cfg.color || self.defaults.color;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var glowRadius = parseFloat(cfg.glowRadius) || self.defaults.glowRadius;
      if (glowRadius < 0.3) glowRadius = 0.3;
      if (glowRadius > 1) glowRadius = 1;
      var preset = cfg.ambPreset || self.defaults.ambPreset;

      var ctx = self._ctx;
      var offCtx = self._offCtx;

      // Get audio volume
      var vol = self._getVolume(sensitivity);

      // Offscreen dimensions (logical, half of canvas)
      var offW = w;
      var offH = h;

      // --- Draw preset on offscreen canvas ---
      if (preset === 'water') {
        self._drawRipple(offCtx, offW, offH, self._time, dt, vol, bgColor, colorHex, sensitivity);
      } else if (preset === 'swirl') {
        self._drawVeil(offCtx, offW, offH, self._time, vol, bgColor, colorHex, sensitivity);
      } else {
        self._drawNebula(offCtx, offW, offH, self._time, vol, bgColor, glowRadius);
      }

      // --- Composite offscreen to main canvas (upscale from 1/2 res) ---
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(self._offCanvas, 0, 0, w, h);

      // --- Draw ambient particles on main canvas (full resolution) ---
      if (self._ambientDots) {
        var dotColor = hexToRgb(colorHex);
        updateAndDrawAmbientDots(ctx, self._ambientDots, w, h, self._time, vol.normalized, dotColor);
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(AmbienceVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
