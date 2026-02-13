;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r, g, b;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else               { r = c; g = 0; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  // Attempt roundRect; fallback to plain rect for older browsers
  function roundRect(ctx, x, y, w, h, radii) {
    if (w <= 0 || h <= 0) return;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radii);
    } else {
      // Fallback: manually draw rounded rect with individual corner radii
      var tl = Math.min(radii[0] || 0, w / 2, h / 2);
      var tr = Math.min(radii[1] || 0, w / 2, h / 2);
      var br = Math.min(radii[2] || 0, w / 2, h / 2);
      var bl = Math.min(radii[3] || 0, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + tl, y);
      ctx.lineTo(x + w - tr, y);
      if (tr > 0) ctx.arcTo(x + w, y, x + w, y + tr, tr);
      else ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h - br);
      if (br > 0) ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
      else ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + bl, y + h);
      if (bl > 0) ctx.arcTo(x, y + h, x, y + h - bl, bl);
      else ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + tl);
      if (tl > 0) ctx.arcTo(x, y, x + tl, y, tl);
      else ctx.lineTo(x, y);
      ctx.closePath();
    }
  }

  // Compute per-bar color based on colorMode
  function getBarColor(index, barCount, baseColor, colorMode) {
    if (colorMode === 'rainbow') {
      return hslToRgb((index / barCount) * 360, 0.9, 0.55);
    }
    if (colorMode === 'gradient') {
      // Green (120) → Yellow (60) → Red (0) across bar index
      var hue = 120 - (index / Math.max(1, barCount - 1)) * 120;
      return hslToRgb(hue, 0.9, 0.5);
    }
    return baseColor;
  }

  // Build per-bar vertical gradient
  function buildBarGradient(ctx, baselineY, color) {
    var deepR = Math.floor(color.r * 0.3);
    var deepG = Math.floor(color.g * 0.3);
    var deepB = Math.floor(color.b * 0.3);
    var midR = color.r;
    var midG = color.g;
    var midB = color.b;
    var lightR = Math.min(255, color.r + Math.round((255 - color.r) * 0.6));
    var lightG = Math.min(255, color.g + Math.round((255 - color.g) * 0.6));
    var lightB = Math.min(255, color.b + Math.round((255 - color.b) * 0.6));
    var hotR = Math.min(255, color.r + Math.round((255 - color.r) * 0.85));
    var hotG = Math.min(255, color.g + Math.round((255 - color.g) * 0.85));
    var hotB = Math.min(255, color.b + Math.round((255 - color.b) * 0.85));

    var grad = ctx.createLinearGradient(0, 0, 0, baselineY);
    grad.addColorStop(0, 'rgb(' + hotR + ',' + hotG + ',' + hotB + ')');
    grad.addColorStop(0.15, 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')');
    grad.addColorStop(0.5, 'rgb(' + midR + ',' + midG + ',' + midB + ')');
    grad.addColorStop(1, 'rgb(' + deepR + ',' + deepG + ',' + deepB + ')');

    return {
      grad: grad,
      mid: 'rgb(' + midR + ',' + midG + ',' + midB + ')',
      light: 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')',
      peakGlow: 'rgba(' + lightR + ',' + lightG + ',' + lightB + ',0.6)',
      reflMid: { r: midR, g: midG, b: midB }
    };
  }

  var BarsVisualizer = {
    id: 'bars',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      smoothing: 0.85,
      barCount: 64,
      colorMode: 'single'
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedData: null,
    _logBins: null,
    _peaks: null,
    _peakTimestamps: null,
    _gradientCache: null,
    _reflectionMask: null,
    _cachedWidth: 0,
    _cachedHeight: 0,
    _cachedColor: null,
    _cachedBarCount: 0,
    _cachedColorMode: null,
    _barGradients: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
      this._logBins = null;
      this._peaks = null;
      this._peakTimestamps = null;
      this._gradientCache = null;
      this._reflectionMask = null;
      this._cachedWidth = 0;
      this._cachedHeight = 0;
      this._cachedColor = null;
      this._cachedBarCount = 0;
      this._cachedColorMode = null;
      this._barGradients = null;

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

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
      this._container = null;
      this._audioEngine = null;
      this._smoothedData = null;
      this._logBins = null;
      this._peaks = null;
      this._peakTimestamps = null;
      this._gradientCache = null;
      this._reflectionMask = null;
      this._barGradients = null;
      this._config = null;
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Invalidate gradient cache so it rebuilds on next frame
      this._gradientCache = null;
      this._reflectionMask = null;
      this._barGradients = null;
    },

    _buildGradientCache: function(w, h, barColor, barCount, colorMode) {
      var ctx = this._ctx;
      var baselineY = h * 0.82;

      // For single mode, build a shared gradient
      if (colorMode === 'single') {
        var info = buildBarGradient(ctx, baselineY, barColor);
        this._gradientCache = {
          barGrad: info.grad,
          midColor: info.mid,
          lightColor: info.light,
          peakColor: info.light,
          peakGlow: info.peakGlow
        };
        // Reflection mask
        var rm = info.reflMid;
        var reflectionH = h - baselineY;
        var reflMask = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflectionH);
        reflMask.addColorStop(0, 'rgba(' + rm.r + ',' + rm.g + ',' + rm.b + ',0.32)');
        reflMask.addColorStop(0.3, 'rgba(' + rm.r + ',' + rm.g + ',' + rm.b + ',0.14)');
        reflMask.addColorStop(1, 'rgba(' + rm.r + ',' + rm.g + ',' + rm.b + ',0)');
        this._reflectionMask = reflMask;
        this._barGradients = null;
      } else {
        // For rainbow/gradient modes, build per-bar gradients
        this._barGradients = [];
        this._gradientCache = null;
        for (var i = 0; i < barCount; i++) {
          var c = getBarColor(i, barCount, barColor, colorMode);
          var info = buildBarGradient(ctx, baselineY, c);
          this._barGradients.push(info);
        }
        // Use first bar color for reflection mask (will be overridden per-bar)
        this._reflectionMask = null;
      }

      this._cachedWidth = w;
      this._cachedHeight = h;
      this._cachedColor = barColor;
      this._cachedBarCount = barCount;
      this._cachedColorMode = colorMode;
    },

    _generateLogBins: function(barCount, binCount) {
      if (this._logBins && this._logBins.length === barCount) {
        return this._logBins;
      }

      this._logBins = [];
      var minFreq = 1;
      var maxFreq = binCount;
      var logMin = Math.log(minFreq);
      var logMax = Math.log(maxFreq);
      var logStep = (logMax - logMin) / barCount;

      for (var i = 0; i < barCount; i++) {
        var startLog = logMin + i * logStep;
        var endLog = logMin + (i + 1) * logStep;
        var start = Math.floor(Math.exp(startLog));
        var end = Math.ceil(Math.exp(endLog));
        if (start < 1) start = 1;
        if (end > binCount) end = binCount;
        if (end <= start) end = start + 1;
        this._logBins.push({ start: start, end: end });
      }

      return this._logBins;
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var colorHex = cfg.color || self.defaults.color;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var barColor = hexToRgb(colorHex);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var smoothing = parseFloat(cfg.smoothing) || self.defaults.smoothing;
      var barCount = parseInt(cfg.barCount, 10) || self.defaults.barCount;
      var colorMode = cfg.colorMode || self.defaults.colorMode;
      var ctx = self._ctx;
      var now = performance.now();

      // Rebuild gradient cache if dimensions, color, barCount, or colorMode changed
      if ((!self._gradientCache && !self._barGradients) ||
          self._cachedWidth !== w ||
          self._cachedHeight !== h ||
          self._cachedColor === null ||
          self._cachedColor.r !== barColor.r ||
          self._cachedColor.g !== barColor.g ||
          self._cachedColor.b !== barColor.b ||
          self._cachedBarCount !== barCount ||
          self._cachedColorMode !== colorMode) {
        self._buildGradientCache(w, h, barColor, barCount, colorMode);
      }

      var baselineY = h * 0.82;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Subtle baseline separator line
      var sepColor = colorMode === 'single' ? barColor : getBarColor(Math.floor(barCount / 2), barCount, barColor, colorMode);
      ctx.fillStyle = 'rgba(' + sepColor.r + ',' + sepColor.g + ',' + sepColor.b + ',0.06)';
      ctx.fillRect(0, baselineY - 0.5, w, 1);

      var barWidth = w / barCount;
      var gap = Math.max(1, barWidth * 0.12);
      var barW = barWidth - gap;
      var cornerR = Math.max(1.5, barW * 0.15);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      // Initialize peak arrays
      if (!self._peaks || self._peaks.length !== barCount) {
        self._peaks = new Float32Array(barCount);
        self._peakTimestamps = new Float64Array(barCount);
        for (var p = 0; p < barCount; p++) {
          self._peakTimestamps[p] = now;
        }
      }

      if (!freqData || freqData.length === 0) {
        // --- Idle state ---
        var time = now * 0.001;
        var breathe = 0.5 + Math.sin(time * 1.5) * 0.3;

        for (var i = 0; i < barCount; i++) {
          var x = i * barWidth + gap / 2;
          var idlePulse = Math.sin(time * 1.2 + i * 0.15) * 0.3 + 0.5;
          var idleH = 3 + idlePulse * 3;
          var idleAlpha = 0.12 + breathe * 0.06;

          var idleColor = colorMode === 'single' ? barColor : getBarColor(i, barCount, barColor, colorMode);
          ctx.fillStyle = 'rgba(' + idleColor.r + ',' + idleColor.g + ',' + idleColor.b + ',' + idleAlpha.toFixed(3) + ')';
          roundRect(ctx, x, baselineY - idleH, barW, idleH, [cornerR, cornerR, 0, 0]);
          ctx.fill();

          // Peak indicators at baseline in idle — gentle breathing glow
          var peakAlpha = 0.15 + idlePulse * 0.08;
          ctx.fillStyle = 'rgba(' + idleColor.r + ',' + idleColor.g + ',' + idleColor.b + ',' + peakAlpha.toFixed(3) + ')';
          ctx.fillRect(x, baselineY - idleH - 3, barW, 2);
        }

        // Reset peaks during idle
        if (self._peaks) {
          for (var p = 0; p < barCount; p++) {
            self._peaks[p] *= 0.95;
            if (self._peaks[p] < 0.001) self._peaks[p] = 0;
          }
        }

        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      // --- Active state ---
      var logBins = self._generateLogBins(barCount, freqData.length);

      // Initialize smoothed data
      if (!self._smoothedData || self._smoothedData.length !== barCount) {
        self._smoothedData = new Float32Array(barCount);
      }

      // Peak fall speed: 2px per frame (~120px/s at 60fps)
      var peakFallPerFrame = 2;
      var peakHoldMs = 600;

      // --- Draw bars ---
      var isSingle = colorMode === 'single';
      if (isSingle && self._gradientCache) {
        ctx.shadowColor = self._gradientCache.midColor;
        ctx.shadowBlur = 18;
      }

      for (var i = 0; i < barCount; i++) {
        var bin = logBins[i];
        var sum = 0;
        var count = bin.end - bin.start;
        for (var j = bin.start; j < bin.end; j++) {
          sum += freqData[j];
        }
        var avg = sum / count;

        self._smoothedData[i] = self._smoothedData[i] * smoothing + avg * (1 - smoothing);

        var normalized = (self._smoothedData[i] / 255) * (sensitivity / 5);
        if (normalized > 1) normalized = 1;

        var maxBarH = baselineY * 0.95;
        var barH = normalized * maxBarH;
        if (barH < 1) barH = 1;

        var x = i * barWidth + gap / 2;
        var barTop = baselineY - barH;

        // Per-bar gradient or shared gradient
        if (isSingle) {
          ctx.fillStyle = self._gradientCache.barGrad;
        } else {
          var bg = self._barGradients[i];
          ctx.shadowColor = bg.mid;
          ctx.shadowBlur = 18;
          ctx.fillStyle = bg.grad;
        }

        roundRect(ctx, x, barTop, barW, barH, [cornerR, cornerR, cornerR * 0.3, cornerR * 0.3]);
        ctx.fill();

        // Edge highlight for glass effect — thin bright line at top
        if (barH > 4) {
          var highlightColor = isSingle ? self._gradientCache.lightColor : self._barGradients[i].light;
          ctx.fillStyle = highlightColor;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x + 1, barTop, barW - 2, 1);
          ctx.globalAlpha = 1;
        }

        if (!isSingle) {
          ctx.shadowBlur = 0;
        }

        // Update peak tracking
        var normalizedH = barH / maxBarH;
        if (normalizedH >= self._peaks[i]) {
          self._peaks[i] = normalizedH;
          self._peakTimestamps[i] = now;
        } else {
          var elapsed = now - self._peakTimestamps[i];
          if (elapsed > peakHoldMs) {
            // Convert pixel fall to normalized fall
            var fallAmount = peakFallPerFrame / maxBarH;
            self._peaks[i] -= fallAmount;
            if (self._peaks[i] < 0) self._peaks[i] = 0;
          }
        }
      }

      // Reset shadowBlur after bar drawing
      ctx.shadowBlur = 0;

      // --- Draw peak indicators (always visible) ---
      var peakDotH = Math.max(2, barW * 0.12);

      for (var i = 0; i < barCount; i++) {
        var peakBarH = self._peaks[i] * baselineY * 0.95;
        var peakY = baselineY - peakBarH - peakDotH - 2;
        var x = i * barWidth + gap / 2;

        // Clamp peak Y so it never goes below baseline
        if (peakY > baselineY - peakDotH - 2) {
          peakY = baselineY - peakDotH - 2;
        }

        // Peak dot with glow
        var peakColor, peakGlow;
        if (isSingle) {
          peakColor = self._gradientCache.peakColor;
          peakGlow = self._gradientCache.peakGlow;
        } else {
          peakColor = self._barGradients[i].light;
          peakGlow = self._barGradients[i].peakGlow;
        }

        ctx.shadowColor = peakGlow;
        ctx.shadowBlur = 6;
        ctx.fillStyle = peakColor;
        ctx.fillRect(x, peakY, barW, peakDotH);
        ctx.shadowBlur = 0;
      }

      // --- Draw reflection (bottom 18% of canvas) ---
      var reflZone = h - baselineY;
      ctx.save();
      ctx.globalAlpha = 1;

      for (var i = 0; i < barCount; i++) {
        var normalized = (self._smoothedData[i] / 255) * (sensitivity / 5);
        if (normalized > 1) normalized = 1;

        var barH = normalized * baselineY * 0.95;
        if (barH < 1) continue;

        var mirrorH = Math.min(barH * 0.45, reflZone * 0.85);
        if (mirrorH < 1) continue;

        var x = i * barWidth + gap / 2;

        if (isSingle && self._reflectionMask) {
          ctx.fillStyle = self._reflectionMask;
        } else if (self._barGradients && self._barGradients[i]) {
          // Per-bar reflection color
          var rm = self._barGradients[i].reflMid;
          var reflGrad = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflZone);
          reflGrad.addColorStop(0, 'rgba(' + rm.r + ',' + rm.g + ',' + rm.b + ',0.32)');
          reflGrad.addColorStop(0.3, 'rgba(' + rm.r + ',' + rm.g + ',' + rm.b + ',0.14)');
          reflGrad.addColorStop(1, 'rgba(' + rm.r + ',' + rm.g + ',' + rm.b + ',0)');
          ctx.fillStyle = reflGrad;
        }

        roundRect(ctx, x, baselineY + 1, barW, mirrorH, [0, 0, cornerR * 0.3, cornerR * 0.3]);
        ctx.fill();
      }

      ctx.restore();

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(BarsVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
