;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var SpectrumCircleVisualizer = {
    id: 'spectrum-circle',

    defaults: {
      color: '4080ff',
      bg: '000000',
      sensitivity: 5,
      innerRadius: 0.2      // 0.1-0.4
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedData: null,
    _avgVolume: 0,
    _logBins: null,
    _gradientCache: null,
    _cachedW: 0,
    _cachedH: 0,
    _cachedColor: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
      this._avgVolume = 0;
      this._logBins = null;
      this._gradientCache = null;
      this._cachedW = 0;
      this._cachedH = 0;
      this._cachedColor = null;

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
      this._config = null;
      this._logBins = null;
      this._gradientCache = null;
      this._cachedColor = null;
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Invalidate gradient cache on resize
      this._gradientCache = null;
    },

    // Logarithmic frequency bins for musical distribution
    _generateLogBins: function(barCount, binCount) {
      if (this._logBins && this._logBins.length === barCount) return this._logBins;
      this._logBins = [];
      var minFreq = 1, maxFreq = binCount;
      var logMin = Math.log(minFreq), logMax = Math.log(maxFreq);
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

    // Build and cache per-bar radial gradients
    _buildGradientCache: function(ctx, centerX, centerY, innerRadius, maxRadius, barColor, barCount) {
      var colorKey = barColor.r + ',' + barColor.g + ',' + barColor.b;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      if (this._gradientCache && this._gradientCache.length === barCount &&
          this._cachedW === w && this._cachedH === h && this._cachedColor === colorKey) {
        return this._gradientCache;
      }
      this._cachedW = w;
      this._cachedH = h;
      this._cachedColor = colorKey;

      var lightR = Math.min(255, barColor.r + Math.round((255 - barColor.r) * 0.5));
      var lightG = Math.min(255, barColor.g + Math.round((255 - barColor.g) * 0.5));
      var lightB = Math.min(255, barColor.b + Math.round((255 - barColor.b) * 0.5));

      var cache = new Array(barCount);
      var angleStep = (Math.PI * 2) / barCount;

      for (var i = 0; i < barCount; i++) {
        var angle = i * angleStep - Math.PI / 2;
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);
        var x1 = centerX + cosA * innerRadius;
        var y1 = centerY + sinA * innerRadius;
        var x2 = centerX + cosA * maxRadius;
        var y2 = centerY + sinA * maxRadius;
        var grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgb(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ')');
        grad.addColorStop(1, 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')');
        cache[i] = { grad: grad, cos: cosA, sin: sinA };
      }

      this._gradientCache = cache;
      return cache;
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var barColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var innerRadiusRatio = parseFloat(cfg.innerRadius) || self.defaults.innerRadius;
      if (innerRadiusRatio < 0.1) innerRadiusRatio = 0.1;
      if (innerRadiusRatio > 0.4) innerRadiusRatio = 0.4;
      var ctx = self._ctx;
      var now = performance.now();
      var timeSec = now * 0.001;

      var barCount = 120;
      var angleStep = (Math.PI * 2) / barCount;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var centerX = w / 2;
      var centerY = h / 2;
      var maxRadius = Math.min(w, h) * 0.45;
      var innerRadius = maxRadius * innerRadiusRatio;

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      var hasData = freqData && freqData.length > 0;

      // Compute average volume (smoothed)
      if (hasData) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        var volume = sum / freqData.length / 255;
        self._avgVolume = self._avgVolume * 0.85 + volume * 0.15;
      } else {
        self._avgVolume = self._avgVolume * 0.95;
      }

      var vol = self._avgVolume;
      var sensMul = sensitivity / 5;

      // --- IDLE / ACTIVE SHARED ELEMENTS ---

      // 1. Inner ring: thin circle at innerRadius with subtle glow
      var innerRingPulse = hasData
        ? 1 + vol * sensMul * 0.25
        : 1 + Math.sin(timeSec * 1.5) * 0.06;
      var innerRingR = innerRadius * innerRingPulse;
      var innerRingAlpha = hasData
        ? 0.3 + vol * sensMul * 0.5
        : 0.15 + Math.sin(timeSec * 1.5) * 0.05;
      if (innerRingAlpha > 0.8) innerRingAlpha = 0.8;

      ctx.strokeStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + innerRingAlpha.toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + (innerRingAlpha * 0.8).toFixed(3) + ')';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRingR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 2. Center orb: multi-layer radial gradient (white core -> color -> transparent)
      var orbScale = hasData
        ? 1 + vol * sensMul * 0.35
        : 1 + Math.sin(timeSec * 0.8) * 0.06;
      var orbRadius = innerRadius * 0.55 * orbScale;
      var orbCoreAlpha = hasData
        ? 0.5 + vol * sensMul * 0.5
        : 0.25 + Math.sin(timeSec * 0.8) * 0.08;
      if (orbCoreAlpha > 1) orbCoreAlpha = 1;

      // Layer 1: outer soft halo
      var haloGrad = ctx.createRadialGradient(centerX, centerY, orbRadius * 0.5, centerX, centerY, orbRadius * 1.6);
      haloGrad.addColorStop(0, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + (orbCoreAlpha * 0.3).toFixed(3) + ')');
      haloGrad.addColorStop(1, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Layer 2: main orb body
      var orbGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
      orbGrad.addColorStop(0, 'rgba(255,255,255,' + orbCoreAlpha.toFixed(3) + ')');
      orbGrad.addColorStop(0.25, 'rgba(255,255,255,' + (orbCoreAlpha * 0.6).toFixed(3) + ')');
      orbGrad.addColorStop(0.5, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + (orbCoreAlpha * 0.8).toFixed(3) + ')');
      orbGrad.addColorStop(0.8, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + (orbCoreAlpha * 0.4).toFixed(3) + ')');
      orbGrad.addColorStop(1, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Spectrum bars
      if (hasData) {
        var logBins = self._generateLogBins(barCount, freqData.length);

        // Initialize smoothed data
        if (!self._smoothedData || self._smoothedData.length !== barCount) {
          self._smoothedData = new Float32Array(barCount);
        }

        // Build/reuse gradient cache
        var gradCache = self._buildGradientCache(ctx, centerX, centerY, innerRadius, maxRadius, barColor, barCount);

        // Enable glow for bars
        ctx.shadowColor = 'rgb(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ')';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';

        for (var i = 0; i < barCount; i++) {
          // Average the logarithmic frequency bins for this bar
          var bin = logBins[i];
          var barSum = 0;
          var count = bin.end - bin.start;
          for (var j = bin.start; j < bin.end; j++) {
            barSum += freqData[j];
          }
          var avg = barSum / count;

          // Smooth
          self._smoothedData[i] = self._smoothedData[i] * 0.82 + avg * 0.18;

          // Normalize with sensitivity
          var normalized = (self._smoothedData[i] / 255) * sensMul;
          if (normalized > 1) normalized = 1;

          var barLength = normalized * (maxRadius - innerRadius);
          if (barLength < 2) barLength = 2;

          var entry = gradCache[i];
          var x1 = centerX + entry.cos * innerRadius;
          var y1 = centerY + entry.sin * innerRadius;
          var x2 = centerX + entry.cos * (innerRadius + barLength);
          var y2 = centerY + entry.sin * (innerRadius + barLength);

          ctx.strokeStyle = entry.grad;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
      }

      // 4. Rotating outer glow ring
      var outerRingRadius = maxRadius + 8;
      var rotAngle = timeSec * 0.4; // slow rotation
      var outerAlpha = hasData
        ? 0.25 + vol * sensMul * 0.6
        : 0.15 + Math.sin(timeSec * 0.5) * 0.05;
      if (outerAlpha > 0.75) outerAlpha = 0.75;

      var prevComposite = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';

      // Draw a glowing arc that spans ~270deg and rotates
      var arcSpan = Math.PI * 1.5;
      var arcStart = rotAngle;
      var arcEnd = rotAngle + arcSpan;

      ctx.strokeStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + outerAlpha.toFixed(3) + ')';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + (outerAlpha * 0.8).toFixed(3) + ')';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRingRadius, arcStart, arcEnd);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Second thinner pass for brighter leading edge
      var edgeSpan = Math.PI * 0.3;
      var edgeAlpha = outerAlpha * 1.2;
      if (edgeAlpha > 0.9) edgeAlpha = 0.9;
      ctx.strokeStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + edgeAlpha.toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRingRadius, arcEnd - edgeSpan, arcEnd);
      ctx.stroke();

      ctx.globalCompositeOperation = prevComposite;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(SpectrumCircleVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
