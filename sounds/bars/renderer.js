;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
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

  var BarsVisualizer = {
    id: 'bars',

    defaults: {
      color: '4080ff',
      bg: '000000',
      sensitivity: 5,
      smoothing: 0.85,
      barCount: 64
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
    },

    _buildGradientCache: function(w, h, barColor, barCount) {
      var ctx = this._ctx;
      var baselineY = h * 0.82;

      // Pre-compute color stops
      var deepR = Math.floor(barColor.r * 0.3);
      var deepG = Math.floor(barColor.g * 0.3);
      var deepB = Math.floor(barColor.b * 0.3);
      var midR = barColor.r;
      var midG = barColor.g;
      var midB = barColor.b;
      var lightR = Math.min(255, barColor.r + Math.round((255 - barColor.r) * 0.6));
      var lightG = Math.min(255, barColor.g + Math.round((255 - barColor.g) * 0.6));
      var lightB = Math.min(255, barColor.b + Math.round((255 - barColor.b) * 0.6));
      var hotR = Math.min(255, barColor.r + Math.round((255 - barColor.r) * 0.85));
      var hotG = Math.min(255, barColor.g + Math.round((255 - barColor.g) * 0.85));
      var hotB = Math.min(255, barColor.b + Math.round((255 - barColor.b) * 0.85));

      // Single full-height gradient for all bars (top of canvas to baseline)
      var barGrad = ctx.createLinearGradient(0, 0, 0, baselineY);
      barGrad.addColorStop(0, 'rgb(' + hotR + ',' + hotG + ',' + hotB + ')');
      barGrad.addColorStop(0.15, 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')');
      barGrad.addColorStop(0.5, 'rgb(' + midR + ',' + midG + ',' + midB + ')');
      barGrad.addColorStop(1, 'rgb(' + deepR + ',' + deepG + ',' + deepB + ')');

      // Reflection gradient mask: fades from semi-transparent to fully transparent
      var reflectionH = h - baselineY;
      var reflMask = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflectionH);
      reflMask.addColorStop(0, 'rgba(' + midR + ',' + midG + ',' + midB + ',0.28)');
      reflMask.addColorStop(0.3, 'rgba(' + midR + ',' + midG + ',' + midB + ',0.12)');
      reflMask.addColorStop(1, 'rgba(' + midR + ',' + midG + ',' + midB + ',0)');

      this._gradientCache = {
        barGrad: barGrad,
        deepColor: 'rgb(' + deepR + ',' + deepG + ',' + deepB + ')',
        midColor: 'rgb(' + midR + ',' + midG + ',' + midB + ')',
        lightColor: 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')',
        hotColor: 'rgb(' + hotR + ',' + hotG + ',' + hotB + ')',
        peakColor: 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')',
        peakGlow: 'rgba(' + lightR + ',' + lightG + ',' + lightB + ',0.6)'
      };
      this._reflectionMask = reflMask;

      this._cachedWidth = w;
      this._cachedHeight = h;
      this._cachedColor = barColor;
      this._cachedBarCount = barCount;
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
      var ctx = self._ctx;
      var now = performance.now();

      // Rebuild gradient cache if dimensions, color, or barCount changed
      if (!self._gradientCache ||
          self._cachedWidth !== w ||
          self._cachedHeight !== h ||
          self._cachedColor === null ||
          self._cachedColor.r !== barColor.r ||
          self._cachedColor.g !== barColor.g ||
          self._cachedColor.b !== barColor.b ||
          self._cachedBarCount !== barCount) {
        self._buildGradientCache(w, h, barColor, barCount);
      }

      var cache = self._gradientCache;
      var baselineY = h * 0.82;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Subtle baseline separator line
      ctx.fillStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0.06)';
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
          var idleH = 2 + idlePulse * 2;
          var idleAlpha = 0.08 + breathe * 0.04;

          ctx.fillStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + idleAlpha.toFixed(3) + ')';
          roundRect(ctx, x, baselineY - idleH, barW, idleH, [cornerR, cornerR, 0, 0]);
          ctx.fill();

          // Peak dots at baseline in idle state
          ctx.fillStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + (0.12 + idlePulse * 0.06).toFixed(3) + ')';
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

      // --- Draw bars with glow ---
      ctx.shadowColor = cache.midColor;
      ctx.shadowBlur = 18;

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

        // Draw bar body with cached gradient and rounded corners
        ctx.fillStyle = cache.barGrad;
        roundRect(ctx, x, barTop, barW, barH, [cornerR, cornerR, cornerR * 0.3, cornerR * 0.3]);
        ctx.fill();

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

      // Reset shadowBlur immediately after bar drawing
      ctx.shadowBlur = 0;

      // --- Draw peak indicators ---
      var peakDotH = Math.max(2, barW * 0.12);

      for (var i = 0; i < barCount; i++) {
        if (self._peaks[i] <= 0.005) continue;

        var peakBarH = self._peaks[i] * baselineY * 0.95;
        var peakY = baselineY - peakBarH - peakDotH - 2;
        var x = i * barWidth + gap / 2;

        // Peak dot with glow
        ctx.shadowColor = cache.peakGlow;
        ctx.shadowBlur = 6;
        ctx.fillStyle = cache.peakColor;
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

        // Use cached reflection mask gradient
        ctx.fillStyle = self._reflectionMask;
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
