;(function(global) {
  'use strict';

  // --- Color utilities ---

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
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
    return { h: h * 360, s: s, l: l };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    h /= 360;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var hue2rgb = function(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  // --- Bokeh texture sizes per depth layer index ---
  // Layer 0 (farthest) = largest/blurriest, Layer 3 (nearest) = smallest/sharpest
  var BOKEH_SIZES = [128, 80, 48, 32];

  // Particle draw size ranges per layer (in CSS pixels)
  // Back layers: large blurry bokeh, front layers: small sharp bokeh
  var LAYER_SIZE_RANGE = [
    { min: 40, max: 64 },  // Layer 0 (far): large blurry
    { min: 28, max: 48 },  // Layer 1
    { min: 18, max: 32 },  // Layer 2
    { min: 10, max: 20 }   // Layer 3 (near): small sharp
  ];

  // Opacity range per layer (far = dimmer, near = brighter)
  var LAYER_OPACITY = [
    { min: 0.20, max: 0.45 },
    { min: 0.30, max: 0.60 },
    { min: 0.40, max: 0.75 },
    { min: 0.55, max: 0.92 }
  ];

  // Hue shift per layer relative to base hue (cool back, warm front)
  // Layer 0: +120 (cool/blue), Layer 3: -30 (warm/orange-pink)
  var LAYER_HUE_SHIFT = [120, 60, 0, -30];

  /**
   * Create a pre-rendered bokeh texture with "onion bokeh" multi-ring character.
   *
   * @param {number} size - Canvas size in pixels (square)
   * @param {number} r - Red channel 0-255
   * @param {number} g - Green channel 0-255
   * @param {number} b - Blue channel 0-255
   * @param {number} layerIdx - 0 (far/soft) to 3 (near/sharp)
   */
  function createBokehTexture(size, r, g, b, layerIdx) {
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var cx = size / 2;
    var cy = size / 2;
    var radius = size / 2 - 1;

    // Sharpness ramps with layer: far layers softer, near layers crisper
    var sharpness = 0.4 + layerIdx * 0.2; // 0.4, 0.6, 0.8, 1.0

    // Soft radial gradient fill
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.12, 'rgba(' + r + ',' + g + ',' + b + ', 0.85)');
    grad.addColorStop(0.4, 'rgba(' + r + ',' + g + ',' + b + ',' + (0.25 + sharpness * 0.15).toFixed(2) + ')');
    grad.addColorStop(0.75, 'rgba(' + r + ',' + g + ',' + b + ',' + (0.06 + sharpness * 0.06).toFixed(2) + ')');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ', 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Onion bokeh: concentric inner rings (simulate lens element reflections)
    var ringColor = 'rgba(' + r + ',' + g + ',' + b + ',';
    ctx.lineWidth = Math.max(1, size / 32);

    // Inner ring at 50% radius
    ctx.strokeStyle = ringColor + '0.10)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.50, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring at 70% radius
    ctx.strokeStyle = ringColor + '0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.70, 0, Math.PI * 2);
    ctx.stroke();

    // Primary edge ring — stronger highlight
    ctx.strokeStyle = ringColor + (0.30 + sharpness * 0.15).toFixed(2) + ')';
    ctx.lineWidth = Math.max(1.5, size / 20);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // Double-edge: secondary ring at 92% radius
    ctx.strokeStyle = ringColor + (0.15 + sharpness * 0.10).toFixed(2) + ')';
    ctx.lineWidth = Math.max(1, size / 28);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
    ctx.stroke();

    return canvas;
  }

  // --- Visualizer ---

  var PlenopticVisualizer = {
    id: 'plenoptic',

    defaults: {
      color: 'ffffff',
      bg: '000000',
      sensitivity: 5,
      depth: 8              // Depth layers 4-12
    },

    _canvas: null,
    _offscreenCanvas: null,
    _ctx: null,
    _offscreenCtx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _layers: null,          // Array of 4 arrays (back-to-front), each holding particles
    _bokehTextures: null,   // Array of 4 offscreen canvas textures
    _sparkles: null,        // Array of foreground sparkle particles
    _lastTime: 0,
    _avgVolume: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._layers = null;
      this._bokehTextures = null;
      this._sparkles = null;
      this._lastTime = 0;
      this._avgVolume = 0;

      // Offscreen canvas for additive blending
      this._offscreenCanvas = document.createElement('canvas');
      this._offscreenCtx = this._offscreenCanvas.getContext('2d');

      // Main display canvas
      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._buildBokehTextures();
      this._resizeHandler();

      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._lastTime = performance.now();
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
      this._offscreenCanvas = null;
      this._offscreenCtx = null;
      this._container = null;
      this._audioEngine = null;
      this._layers = null;
      this._bokehTextures = null;
      this._sparkles = null;
      this._config = null;
    },

    /**
     * Build 4 pre-rendered bokeh textures, one per depth layer.
     * Each layer gets a color derived from the base color param via HSL hue shift.
     */
    _buildBokehTextures: function() {
      var cfg = this._config;
      var baseRgb = hexToRgb(cfg.color || this.defaults.color);
      var hsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);

      this._bokehTextures = [];
      for (var i = 0; i < 4; i++) {
        var layerHue = hsl.h + LAYER_HUE_SHIFT[i];
        // Boost saturation for color variation; keep lightness moderate
        var layerS = Math.min(1, hsl.s * 0.6 + 0.4);
        var layerL = 0.45 + i * 0.05; // Slightly brighter toward front
        var rgb = hslToRgb(layerHue, layerS, layerL);
        this._bokehTextures.push(createBokehTexture(BOKEH_SIZES[i], rgb.r, rgb.g, rgb.b, i));
      }
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;

      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Offscreen at full resolution
      this._offscreenCanvas.width = w * dpr;
      this._offscreenCanvas.height = h * dpr;
      this._offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this._initParticles();
    },

    /**
     * Distribute ~40 particles per depth "sub-layer" into 4 rendering layers.
     * The depth param (4-12) controls total sub-layers; particles are assigned
     * to one of 4 rendering layers (bucket) for draw-order grouping.
     */
    _initParticles: function() {
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var cfg = this._config;
      var depth = parseInt(cfg.depth, 10) || this.defaults.depth;
      if (depth < 4) depth = 4;
      if (depth > 12) depth = 12;

      this._layers = [[], [], [], []]; // 4 render layers: back → front
      var particlesPerSubLayer = 25;

      for (var sub = 0; sub < depth; sub++) {
        // Map sub-layer (0..depth-1) to render layer (0..3)
        var layerIdx = Math.min(3, Math.floor(sub / depth * 4));
        var sizeRange = LAYER_SIZE_RANGE[layerIdx];
        var opRange = LAYER_OPACITY[layerIdx];

        for (var i = 0; i < particlesPerSubLayer; i++) {
          var baseSize = sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min);
          var baseOpacity = opRange.min + Math.random() * (opRange.max - opRange.min);

          this._layers[layerIdx].push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            // Drift curve parameters (gentle sin/cos curves)
            driftAmpX: 0.3 + Math.random() * 0.8,
            driftAmpY: 0.3 + Math.random() * 0.8,
            driftFreqX: 0.3 + Math.random() * 0.4,
            driftFreqY: 0.3 + Math.random() * 0.4,
            driftPhaseX: Math.random() * Math.PI * 2,
            driftPhaseY: Math.random() * Math.PI * 2,
            baseSize: baseSize,
            baseOpacity: baseOpacity,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.8 + Math.random() * 0.8 // Individual pulse rate
          });
        }
      }

      // Foreground sparkle particles (tiny bright points)
      this._sparkles = [];
      for (var si = 0; si < 20; si++) {
        this._sparkles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          phase: Math.random() * Math.PI * 2,
          speed: 1.5 + Math.random() * 2.5,
          size: 1 + Math.random() * 1.5
        });
      }
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var now = performance.now();
      var dt = (now - self._lastTime) / 1000; // seconds
      if (dt > 0.1) dt = 0.1; // Cap delta to avoid jumps after tab switch
      self._lastTime = now;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var offW = w;
      var offH = h;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var baseColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var ctx = self._ctx;
      var offCtx = self._offscreenCtx;

      // --- Audio analysis ---
      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      var volume = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        volume = sum / freqData.length / 255;
      } else {
        volume = 0.08; // Idle minimum — dreamy float
      }

      // Smooth volume for stable visuals
      self._avgVolume = self._avgVolume * 0.82 + volume * 0.18;
      var normVol = self._avgVolume * (sensitivity / 5);
      if (normVol > 1) normVol = 1;

      // --- Clear offscreen with background ---
      offCtx.globalCompositeOperation = 'source-over';
      offCtx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      offCtx.fillRect(0, 0, offW, offH);

      // --- Atmospheric depth background ---
      // Center radial glow (warm ambient light)
      var glowAlpha = 0.04 + normVol * 0.06;
      var glowGrad = offCtx.createRadialGradient(offW * 0.5, offH * 0.5, 0, offW * 0.5, offH * 0.5, Math.max(offW, offH) * 0.6);
      glowGrad.addColorStop(0, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',' + glowAlpha.toFixed(3) + ')');
      glowGrad.addColorStop(1, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0)');
      offCtx.fillStyle = glowGrad;
      offCtx.fillRect(0, 0, offW, offH);

      // Edge vignette (darkening)
      var vigAlpha = 0.25 + normVol * 0.10;
      var vigGrad = offCtx.createRadialGradient(offW * 0.5, offH * 0.5, Math.min(offW, offH) * 0.3, offW * 0.5, offH * 0.5, Math.max(offW, offH) * 0.75);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,' + vigAlpha.toFixed(3) + ')');
      offCtx.fillStyle = vigGrad;
      offCtx.fillRect(0, 0, offW, offH);

      // Switch to additive blending for all bokeh draws
      offCtx.globalCompositeOperation = 'screen';

      // --- Update and draw particles layer by layer (back → front) ---
      var layers = self._layers;
      if (!layers) { self._animFrameId = requestAnimationFrame(function() { self._draw(); }); return; }

      for (var li = 0; li < 4; li++) {
        var layer = layers[li];
        var texture = self._bokehTextures[li];
        if (!texture) continue;

        // Layer speed multiplier (back layers drift slower, front faster)
        var layerSpeedMul = 0.4 + li * 0.25; // 0.4, 0.65, 0.9, 1.15

        for (var pi = 0; pi < layer.length; pi++) {
          var p = layer[pi];

          // Slow drift animation: gentle sine/cosine curves on velocity
          var driftX = Math.sin(now * 0.001 * p.driftFreqX + p.driftPhaseX) * p.driftAmpX;
          var driftY = Math.cos(now * 0.001 * p.driftFreqY + p.driftPhaseY) * p.driftAmpY;

          // Speed reacts to audio volume
          var speedFactor = layerSpeedMul * (0.6 + normVol * 0.8);

          p.x += (p.vx + driftX) * speedFactor * dt * 60;
          p.y += (p.vy + driftY) * speedFactor * dt * 60;

          // Wrap around with padding so large bokeh don't pop at edges
          var pad = p.baseSize;
          if (p.x < -pad) p.x = w + pad;
          if (p.x > w + pad) p.x = -pad;
          if (p.y < -pad) p.y = h + pad;
          if (p.y > h + pad) p.y = -pad;

          // Enhanced pulsing size modulation
          var pulse = 1 + Math.sin(now * 0.001 * p.pulseSpeed + p.pulsePhase) * 0.25;
          var size = p.baseSize * pulse * (0.8 + normVol * 0.5);

          // Opacity: wider dynamic range
          var alpha = p.baseOpacity * (0.6 + normVol * 0.6);
          if (alpha > 1) alpha = 1;

          // Draw bokeh texture at full coordinates
          var drawSize = size;
          var drawX = p.x - drawSize / 2;
          var drawY = p.y - drawSize / 2;

          offCtx.globalAlpha = alpha;
          offCtx.drawImage(texture, drawX, drawY, drawSize, drawSize);
        }
      }

      // Reset composite and alpha
      offCtx.globalAlpha = 1;
      offCtx.globalCompositeOperation = 'source-over';

      // --- Composite offscreen to main canvas ---
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(self._offscreenCanvas, 0, 0, w, h);

      // --- Depth fog overlay (top-to-bottom atmospheric tint) ---
      var fogAlpha = 0.03 + normVol * 0.03;
      var fogGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
      fogGrad.addColorStop(0, 'rgba(20, 30, 60,' + fogAlpha.toFixed(3) + ')');
      fogGrad.addColorStop(1, 'rgba(20, 30, 60, 0)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, w, h * 0.4);

      // --- Foreground sparkle layer (on main canvas for crisp full-res points) ---
      var sparkles = self._sparkles;
      if (sparkles) {
        for (var si = 0; si < sparkles.length; si++) {
          var sp = sparkles[si];
          var twinkle = Math.sin(now * 0.001 * sp.speed + sp.phase);
          // Twinkle threshold: more sparkles visible at higher volume
          var threshold = 0.4 - normVol * 0.5; // -0.1 (loud) to 0.4 (quiet)
          if (twinkle < threshold) continue;

          var sparkAlpha = (twinkle - threshold) / (1 - threshold); // normalize to 0-1
          sparkAlpha *= (0.5 + normVol * 0.5);
          if (sparkAlpha > 1) sparkAlpha = 1;

          ctx.fillStyle = 'rgba(255,255,255,' + sparkAlpha.toFixed(3) + ')';
          ctx.fillRect(sp.x - sp.size * 0.5, sp.y - sp.size * 0.5, sp.size, sp.size);
        }
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(PlenopticVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
