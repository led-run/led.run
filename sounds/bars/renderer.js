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

  function getBarColor(index, barCount, baseColor, colorMode) {
    if (colorMode === 'rainbow') {
      return hslToRgb((index / barCount) * 360, 0.9, 0.55);
    }
    if (colorMode === 'gradient') {
      var hue = 120 - (index / Math.max(1, barCount - 1)) * 120;
      return hslToRgb(hue, 0.9, 0.5);
    }
    return baseColor;
  }

  function buildColorSet(color) {
    var r = color.r, g = color.g, b = color.b;
    var lightR = Math.min(255, r + ((255 - r) * 0.6 + 0.5) | 0);
    var lightG = Math.min(255, g + ((255 - g) * 0.6 + 0.5) | 0);
    var lightB = Math.min(255, b + ((255 - b) * 0.6 + 0.5) | 0);

    return {
      deep:  'rgb(' + ((r * 0.3) | 0) + ',' + ((g * 0.3) | 0) + ',' + ((b * 0.3) | 0) + ')',
      mid:   'rgb(' + r + ',' + g + ',' + b + ')',
      light: 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')',
      hot:   'rgb(' + Math.min(255, r + ((255 - r) * 0.85 + 0.5) | 0) + ',' +
                      Math.min(255, g + ((255 - g) * 0.85 + 0.5) | 0) + ',' +
                      Math.min(255, b + ((255 - b) * 0.85 + 0.5) | 0) + ')',
      // Pre-baked glow color (semi-transparent mid)
      glow:  'rgba(' + r + ',' + g + ',' + b + ',0.15)',
      // Pre-baked peak glow
      peakGlow: 'rgba(' + lightR + ',' + lightG + ',' + lightB + ',0.35)',
      // Raw for inline rgba
      r: r, g: g, b: b
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
    _barHeights: null,      // cached bar pixel heights per frame
    _cachedWidth: 0,
    _cachedHeight: 0,
    _cachedColor: null,
    _cachedBarCount: 0,
    _cachedColorMode: null,
    _barGrad: null,
    _barGrads: null,
    _colors: null,
    _reflGrads: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
      this._logBins = null;
      this._peaks = null;
      this._peakTimestamps = null;
      this._barHeights = null;
      this._cachedWidth = 0;
      this._cachedHeight = 0;
      this._cachedColor = null;
      this._cachedBarCount = 0;
      this._cachedColorMode = null;
      this._barGrad = null;
      this._barGrads = null;
      this._colors = null;
      this._reflGrads = null;

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
      this._barHeights = null;
      this._barGrad = null;
      this._barGrads = null;
      this._colors = null;
      this._reflGrads = null;
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
      this._cachedWidth = 0;
    },

    _rebuildCache: function(w, h, barColor, barCount, colorMode) {
      var ctx = this._ctx;
      var baselineY = h * 0.82;
      var reflZone = h - baselineY;
      var isSingle = colorMode === 'single';

      if (isSingle) {
        var cs = buildColorSet(barColor);
        var grad = ctx.createLinearGradient(0, 0, 0, baselineY);
        grad.addColorStop(0, cs.hot);
        grad.addColorStop(0.15, cs.light);
        grad.addColorStop(0.5, cs.mid);
        grad.addColorStop(1, cs.deep);
        this._barGrad = grad;
        this._barGrads = null;
        this._colors = [cs];

        var rg = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflZone);
        rg.addColorStop(0, 'rgba(' + cs.r + ',' + cs.g + ',' + cs.b + ',0.32)');
        rg.addColorStop(0.3, 'rgba(' + cs.r + ',' + cs.g + ',' + cs.b + ',0.14)');
        rg.addColorStop(1, 'rgba(' + cs.r + ',' + cs.g + ',' + cs.b + ',0)');
        this._reflGrads = [rg];
      } else {
        this._barGrad = null;
        var grads = new Array(barCount);
        var colors = new Array(barCount);
        var refls = new Array(barCount);
        for (var i = 0; i < barCount; i++) {
          var c = getBarColor(i, barCount, barColor, colorMode);
          var cs = buildColorSet(c);
          colors[i] = cs;
          var grad = ctx.createLinearGradient(0, 0, 0, baselineY);
          grad.addColorStop(0, cs.hot);
          grad.addColorStop(0.15, cs.light);
          grad.addColorStop(0.5, cs.mid);
          grad.addColorStop(1, cs.deep);
          grads[i] = grad;
          var rg = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflZone);
          rg.addColorStop(0, 'rgba(' + cs.r + ',' + cs.g + ',' + cs.b + ',0.32)');
          rg.addColorStop(0.3, 'rgba(' + cs.r + ',' + cs.g + ',' + cs.b + ',0.14)');
          rg.addColorStop(1, 'rgba(' + cs.r + ',' + cs.g + ',' + cs.b + ',0)');
          refls[i] = rg;
        }
        this._barGrads = grads;
        this._colors = colors;
        this._reflGrads = refls;
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
      var logMin = 0; // log(1)
      var logMax = Math.log(binCount);
      var logStep = (logMax - logMin) / barCount;

      for (var i = 0; i < barCount; i++) {
        var start = Math.floor(Math.exp(logMin + i * logStep));
        var end = Math.ceil(Math.exp(logMin + (i + 1) * logStep));
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
      var isSingle = colorMode === 'single';

      if (self._cachedWidth !== w ||
          self._cachedHeight !== h ||
          self._cachedColor === null ||
          self._cachedColor.r !== barColor.r ||
          self._cachedColor.g !== barColor.g ||
          self._cachedColor.b !== barColor.b ||
          self._cachedBarCount !== barCount ||
          self._cachedColorMode !== colorMode) {
        self._rebuildCache(w, h, barColor, barCount, colorMode);
      }

      var baselineY = h * 0.82;
      var sensRatio = sensitivity * 0.2; // /5 → *0.2
      var barWidth = w / barCount;
      var gap = Math.max(1, barWidth * 0.12);
      var barW = barWidth - gap;
      var halfGap = gap * 0.5;
      var useRoundRect = barW >= 4; // skip roundRect for tiny bars
      var cornerR, cornerRBot;
      if (useRoundRect) {
        cornerR = Math.max(1.5, barW * 0.15);
        cornerRBot = cornerR * 0.3;
      }

      // Clear
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Baseline separator
      var cs0 = isSingle ? self._colors[0] : self._colors[barCount >> 1];
      ctx.fillStyle = 'rgba(' + cs0.r + ',' + cs0.g + ',' + cs0.b + ',0.06)';
      ctx.fillRect(0, baselineY - 0.5, w, 1);

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
        var baseAlpha = 0.12 + breathe * 0.06;

        // Single mode: set fillStyle outside loop
        if (isSingle) {
          var scs = self._colors[0];
          for (var i = 0; i < barCount; i++) {
            var x = i * barWidth + halfGap;
            var idlePulse = Math.sin(time * 1.2 + i * 0.15) * 0.3 + 0.5;
            var idleH = 3 + idlePulse * 3;

            ctx.globalAlpha = baseAlpha;
            ctx.fillStyle = scs.mid;
            ctx.fillRect(x, baselineY - idleH, barW, idleH);

            ctx.globalAlpha = 0.15 + idlePulse * 0.08;
            ctx.fillRect(x, baselineY - idleH - 3, barW, 2);
          }
        } else {
          for (var i = 0; i < barCount; i++) {
            var x = i * barWidth + halfGap;
            var idlePulse = Math.sin(time * 1.2 + i * 0.15) * 0.3 + 0.5;
            var idleH = 3 + idlePulse * 3;
            var cs = self._colors[i];

            ctx.globalAlpha = baseAlpha;
            ctx.fillStyle = cs.mid;
            ctx.fillRect(x, baselineY - idleH, barW, idleH);

            ctx.globalAlpha = 0.15 + idlePulse * 0.08;
            ctx.fillRect(x, baselineY - idleH - 3, barW, 2);
          }
        }
        ctx.globalAlpha = 1;

        var peaks = self._peaks;
        for (var p = 0; p < barCount; p++) {
          peaks[p] *= 0.95;
          if (peaks[p] < 0.001) peaks[p] = 0;
        }

        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      // --- Active state ---
      var logBins = self._generateLogBins(barCount, freqData.length);

      if (!self._smoothedData || self._smoothedData.length !== barCount) {
        self._smoothedData = new Float32Array(barCount);
      }
      if (!self._barHeights || self._barHeights.length !== barCount) {
        self._barHeights = new Float32Array(barCount);
      }

      var maxBarH = baselineY * 0.95;
      var invMaxBarH = 1 / maxBarH;
      var smoothedData = self._smoothedData;
      var peaks = self._peaks;
      var peakTs = self._peakTimestamps;
      var barHeights = self._barHeights;
      var peakFall = 2 * invMaxBarH; // pre-compute
      var peakHoldMs = 600;
      var oneMinusSmoothing = 1 - smoothing;
      var inv255 = 1 / 255;

      // ====== Pass 1: Glow underlays + bar bodies + glass highlights + peak tracking ======
      // No shadowBlur at all — glow is a cheap wider semi-transparent fillRect

      var singleGrad = self._barGrad;
      var singleCs = isSingle ? self._colors[0] : null;
      var glowExpand = Math.max(2, barW * 0.2);

      for (var i = 0; i < barCount; i++) {
        var bin = logBins[i];
        var sum = 0;
        for (var j = bin.start; j < bin.end; j++) {
          sum += freqData[j];
        }

        var sd = smoothedData[i] * smoothing + (sum / (bin.end - bin.start)) * oneMinusSmoothing;
        smoothedData[i] = sd;

        var normalized = sd * inv255 * sensRatio;
        if (normalized > 1) normalized = 1;

        var barH = normalized * maxBarH;
        if (barH < 1) barH = 1;
        barHeights[i] = barH;

        var x = i * barWidth + halfGap;
        var barTop = baselineY - barH;

        // Fake glow: wider semi-transparent rect behind bar (much cheaper than shadowBlur)
        if (barH > 2) {
          ctx.fillStyle = isSingle ? singleCs.glow : self._colors[i].glow;
          ctx.fillRect(x - glowExpand, barTop - glowExpand, barW + glowExpand * 2, barH + glowExpand);
        }

        // Bar body
        if (useRoundRect) {
          ctx.fillStyle = isSingle ? singleGrad : self._barGrads[i];
          ctx.beginPath();
          ctx.roundRect(x, barTop, barW, barH, [cornerR, cornerR, cornerRBot, cornerRBot]);
          ctx.fill();
        } else {
          ctx.fillStyle = isSingle ? singleGrad : self._barGrads[i];
          ctx.fillRect(x, barTop, barW, barH);
        }

        // Glass highlight at top edge
        if (barH > 4) {
          ctx.fillStyle = isSingle ? singleCs.light : self._colors[i].light;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x + 1, barTop, barW - 2, 1);
          ctx.globalAlpha = 1;
        }

        // Peak tracking (inline)
        var nh = barH * invMaxBarH;
        if (nh >= peaks[i]) {
          peaks[i] = nh;
          peakTs[i] = now;
        } else if (now - peakTs[i] > peakHoldMs) {
          peaks[i] -= peakFall;
          if (peaks[i] < 0) peaks[i] = 0;
        }
      }

      // ====== Pass 2: Peak dots + reflections (no shadow) ======
      var peakDotH = Math.max(2, barW * 0.12);
      var peakBaseY = baselineY - peakDotH - 2;
      var reflZone = h - baselineY;
      var reflLimit = reflZone * 0.85;

      for (var i = 0; i < barCount; i++) {
        var x = i * barWidth + halfGap;

        // Peak glow backdrop (wider semi-transparent rect)
        var peakBarH = peaks[i] * maxBarH;
        var peakY = baselineY - peakBarH - peakDotH - 2;
        if (peakY > peakBaseY) peakY = peakBaseY;

        var cs = isSingle ? singleCs : self._colors[i];
        ctx.fillStyle = cs.peakGlow;
        ctx.fillRect(x - 1, peakY - 1, barW + 2, peakDotH + 2);
        ctx.fillStyle = cs.light;
        ctx.fillRect(x, peakY, barW, peakDotH);

        // Reflection (simple fillRect, no roundRect needed)
        var bh = barHeights[i];
        if (bh < 2) continue;
        var mirrorH = bh * 0.45;
        if (mirrorH > reflLimit) mirrorH = reflLimit;
        if (mirrorH < 1) continue;

        ctx.fillStyle = isSingle ? self._reflGrads[0] : self._reflGrads[i];
        ctx.fillRect(x, baselineY + 1, barW, mirrorH);
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(BarsVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
