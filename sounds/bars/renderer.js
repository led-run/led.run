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

  // Attempt roundRect; fallback to plain rect for older browsers
  function roundRect(ctx, x, y, w, h, radii) {
    if (w <= 0 || h <= 0) return;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radii);
    } else {
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
      var hue = 120 - (index / Math.max(1, barCount - 1)) * 120;
      return hslToRgb(hue, 0.9, 0.5);
    }
    return baseColor;
  }

  // Pre-compute color variant strings from an RGB base color
  function buildColorSet(color) {
    var deepR = Math.floor(color.r * 0.3);
    var deepG = Math.floor(color.g * 0.3);
    var deepB = Math.floor(color.b * 0.3);
    var lightR = Math.min(255, color.r + Math.round((255 - color.r) * 0.6));
    var lightG = Math.min(255, color.g + Math.round((255 - color.g) * 0.6));
    var lightB = Math.min(255, color.b + Math.round((255 - color.b) * 0.6));
    var hotR = Math.min(255, color.r + Math.round((255 - color.r) * 0.85));
    var hotG = Math.min(255, color.g + Math.round((255 - color.g) * 0.85));
    var hotB = Math.min(255, color.b + Math.round((255 - color.b) * 0.85));

    return {
      deep:  'rgb(' + deepR + ',' + deepG + ',' + deepB + ')',
      mid:   'rgb(' + color.r + ',' + color.g + ',' + color.b + ')',
      light: 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')',
      hot:   'rgb(' + hotR + ',' + hotG + ',' + hotB + ')',
      peakGlow: 'rgba(' + lightR + ',' + lightG + ',' + lightB + ',0.6)',
      reflR: color.r, reflG: color.g, reflB: color.b
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
    // Cache fields
    _cachedWidth: 0,
    _cachedHeight: 0,
    _cachedColor: null,
    _cachedBarCount: 0,
    _cachedColorMode: null,
    // Cached draw data — rebuilt only when config changes
    _barGrad: null,        // single mode: shared CanvasGradient
    _barGrads: null,       // multi mode: per-bar CanvasGradient[]
    _colors: null,         // per-bar colorSet[] (or single colorSet at [0])
    _reflGrads: null,      // per-bar reflection CanvasGradient[] (or single at [0])

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
      this._logBins = null;
      this._peaks = null;
      this._peakTimestamps = null;
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
      this._cachedWidth = 0; // force rebuild
    },

    _rebuildCache: function(w, h, barColor, barCount, colorMode) {
      var ctx = this._ctx;
      var baselineY = h * 0.82;
      var reflZone = h - baselineY;
      var isSingle = colorMode === 'single';

      if (isSingle) {
        // Single mode: one shared gradient + one color set + one reflection
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
        rg.addColorStop(0, 'rgba(' + cs.reflR + ',' + cs.reflG + ',' + cs.reflB + ',0.32)');
        rg.addColorStop(0.3, 'rgba(' + cs.reflR + ',' + cs.reflG + ',' + cs.reflB + ',0.14)');
        rg.addColorStop(1, 'rgba(' + cs.reflR + ',' + cs.reflG + ',' + cs.reflB + ',0)');
        this._reflGrads = [rg];
      } else {
        // Multi mode: per-bar gradients, colors, reflections — all pre-cached
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
          rg.addColorStop(0, 'rgba(' + cs.reflR + ',' + cs.reflG + ',' + cs.reflB + ',0.32)');
          rg.addColorStop(0.3, 'rgba(' + cs.reflR + ',' + cs.reflG + ',' + cs.reflB + ',0.14)');
          rg.addColorStop(1, 'rgba(' + cs.reflR + ',' + cs.reflG + ',' + cs.reflB + ',0)');
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
      var isSingle = colorMode === 'single';

      // Rebuild cache only when config changes
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
      var sensRatio = sensitivity / 5;

      // Clear
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Baseline separator
      var sepCs = isSingle ? self._colors[0] : self._colors[barCount >> 1];
      ctx.fillStyle = 'rgba(' + sepCs.reflR + ',' + sepCs.reflG + ',' + sepCs.reflB + ',0.06)';
      ctx.fillRect(0, baselineY - 0.5, w, 1);

      var barWidth = w / barCount;
      var gap = Math.max(1, barWidth * 0.12);
      var barW = barWidth - gap;
      var cornerR = Math.max(1.5, barW * 0.15);
      var halfGap = gap / 2;
      var cornerRBot = cornerR * 0.3;

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
        // --- Idle state (no shadow needed) ---
        var time = now * 0.001;
        var breathe = 0.5 + Math.sin(time * 1.5) * 0.3;

        for (var i = 0; i < barCount; i++) {
          var x = i * barWidth + halfGap;
          var idlePulse = Math.sin(time * 1.2 + i * 0.15) * 0.3 + 0.5;
          var idleH = 3 + idlePulse * 3;
          var idleAlpha = 0.12 + breathe * 0.06;

          var cs = isSingle ? self._colors[0] : self._colors[i];
          ctx.fillStyle = 'rgba(' + cs.reflR + ',' + cs.reflG + ',' + cs.reflB + ',' + idleAlpha.toFixed(3) + ')';
          roundRect(ctx, x, baselineY - idleH, barW, idleH, [cornerR, cornerR, 0, 0]);
          ctx.fill();

          // Peak indicators at baseline
          var peakAlpha = 0.15 + idlePulse * 0.08;
          ctx.fillStyle = 'rgba(' + cs.reflR + ',' + cs.reflG + ',' + cs.reflB + ',' + peakAlpha.toFixed(3) + ')';
          ctx.fillRect(x, baselineY - idleH - 3, barW, 2);
        }

        // Decay peaks
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

      var peakFallPerFrame = 2;
      var peakHoldMs = 600;
      var maxBarH = baselineY * 0.95;
      var invMaxBarH = 1 / maxBarH;
      var smoothedData = self._smoothedData;
      var peaks = self._peaks;
      var peakTs = self._peakTimestamps;

      // --- Pass 1: Draw bars with glow ---
      // Set shadowBlur ONCE before the loop, not per-bar
      var glowCs = isSingle ? self._colors[0] : self._colors[barCount >> 1];
      ctx.shadowColor = glowCs.mid;
      ctx.shadowBlur = 18;

      for (var i = 0; i < barCount; i++) {
        var bin = logBins[i];
        var sum = 0;
        var cnt = bin.end - bin.start;
        for (var j = bin.start; j < bin.end; j++) {
          sum += freqData[j];
        }

        smoothedData[i] = smoothedData[i] * smoothing + (sum / cnt) * (1 - smoothing);

        var normalized = (smoothedData[i] / 255) * sensRatio;
        if (normalized > 1) normalized = 1;

        var barH = normalized * maxBarH;
        if (barH < 1) barH = 1;

        var x = i * barWidth + halfGap;
        var barTop = baselineY - barH;

        ctx.fillStyle = isSingle ? self._barGrad : self._barGrads[i];
        roundRect(ctx, x, barTop, barW, barH, [cornerR, cornerR, cornerRBot, cornerRBot]);
        ctx.fill();

        // Update peaks (inline, no function call overhead)
        var nh = barH * invMaxBarH;
        if (nh >= peaks[i]) {
          peaks[i] = nh;
          peakTs[i] = now;
        } else if (now - peakTs[i] > peakHoldMs) {
          peaks[i] -= peakFallPerFrame * invMaxBarH;
          if (peaks[i] < 0) peaks[i] = 0;
        }
      }

      ctx.shadowBlur = 0;

      // --- Pass 2: Glass highlight (batch with single globalAlpha) ---
      ctx.globalAlpha = 0.3;
      for (var i = 0; i < barCount; i++) {
        var normalized = (smoothedData[i] / 255) * sensRatio;
        if (normalized > 1) normalized = 1;
        var barH = normalized * maxBarH;
        if (barH <= 4) continue;

        var x = i * barWidth + halfGap;
        var barTop = baselineY - barH;
        ctx.fillStyle = isSingle ? self._colors[0].light : self._colors[i].light;
        ctx.fillRect(x + 1, barTop, barW - 2, 1);
      }
      ctx.globalAlpha = 1;

      // --- Pass 3: Peak indicators (single shadow setup) ---
      var peakDotH = Math.max(2, barW * 0.12);
      var peakBaseY = baselineY - peakDotH - 2;

      // Set peak glow once
      var peakGlowCs = isSingle ? self._colors[0] : self._colors[barCount >> 1];
      ctx.shadowColor = peakGlowCs.peakGlow;
      ctx.shadowBlur = 6;

      for (var i = 0; i < barCount; i++) {
        var peakBarH = peaks[i] * maxBarH;
        var peakY = baselineY - peakBarH - peakDotH - 2;
        if (peakY > peakBaseY) peakY = peakBaseY;

        var x = i * barWidth + halfGap;
        ctx.fillStyle = isSingle ? self._colors[0].light : self._colors[i].light;
        ctx.fillRect(x, peakY, barW, peakDotH);
      }

      ctx.shadowBlur = 0;

      // --- Pass 4: Reflections (no shadow) ---
      var reflZone = h - baselineY;
      var reflLimit = reflZone * 0.85;

      for (var i = 0; i < barCount; i++) {
        var normalized = (smoothedData[i] / 255) * sensRatio;
        if (normalized > 1) normalized = 1;

        var barH = normalized * maxBarH;
        if (barH < 1) continue;

        var mirrorH = barH * 0.45;
        if (mirrorH > reflLimit) mirrorH = reflLimit;
        if (mirrorH < 1) continue;

        var x = i * barWidth + halfGap;
        ctx.fillStyle = isSingle ? self._reflGrads[0] : self._reflGrads[i];
        roundRect(ctx, x, baselineY + 1, barW, mirrorH, [0, 0, cornerRBot, cornerRBot]);
        ctx.fill();
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(BarsVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
