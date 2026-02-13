;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var MAX_PARTICLES = 150;

  var SpikesVisualizer = {
    id: 'spikes',

    defaults: {
      color: '4080ff',
      bg: '000000',
      sensitivity: 5,
      spikeCount: 96
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedData: null,
    _logBins: null,
    _tipParticles: null,
    _lastTime: 0,

    // Cached color strings to avoid per-frame allocation
    _cachedColorHex: null,
    _cachedBgHex: null,
    _cachedColor: null,
    _cachedBg: null,
    _cachedDark: null,
    _cachedLight: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
      this._logBins = null;
      this._tipParticles = [];
      this._lastTime = performance.now();

      this._cachedColorHex = null;
      this._cachedBgHex = null;
      this._cachedColor = null;
      this._cachedBg = null;
      this._cachedDark = null;
      this._cachedLight = null;

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
      this._tipParticles = null;
      this._config = null;
      this._cachedColorHex = null;
      this._cachedBgHex = null;
      this._cachedColor = null;
      this._cachedBg = null;
      this._cachedDark = null;
      this._cachedLight = null;
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    _generateLogBins: function(spikeCount, binCount) {
      if (this._logBins && this._logBins.length === spikeCount) {
        return this._logBins;
      }

      this._logBins = [];
      var minFreq = 1;
      var maxFreq = binCount;
      var logMin = Math.log(minFreq);
      var logMax = Math.log(maxFreq);
      var logStep = (logMax - logMin) / spikeCount;

      for (var i = 0; i < spikeCount; i++) {
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

    _resolveColors: function(cfg) {
      var colorHex = cfg.color || this.defaults.color;
      var bgHex = cfg.bg || this.defaults.bg;

      if (colorHex !== this._cachedColorHex) {
        this._cachedColorHex = colorHex;
        this._cachedColor = hexToRgb(colorHex);
        var c = this._cachedColor;
        this._cachedDark = {
          r: Math.floor(c.r * 0.25),
          g: Math.floor(c.g * 0.25),
          b: Math.floor(c.b * 0.25)
        };
        this._cachedLight = {
          r: Math.min(255, c.r + Math.round((255 - c.r) * 0.6)),
          g: Math.min(255, c.g + Math.round((255 - c.g) * 0.6)),
          b: Math.min(255, c.b + Math.round((255 - c.b) * 0.6))
        };
      }

      if (bgHex !== this._cachedBgHex) {
        this._cachedBgHex = bgHex;
        this._cachedBg = hexToRgb(bgHex);
      }
    },

    _spawnParticle: function(x, y, angle, energy) {
      if (this._tipParticles.length >= MAX_PARTICLES) return;

      var speed = 1.5 + energy * 3;
      // Add slight angular spread for more natural look
      var spread = (Math.random() - 0.5) * 0.3;
      var a = angle + spread;

      this._tipParticles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1.0,
        maxLife: 0.4 + Math.random() * 0.4,
        size: 1 + Math.random() * 2
      });
    },

    _updateParticles: function(dt) {
      var particles = this._tipParticles;
      var i = particles.length;
      while (i--) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        // Slow down over time
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) {
          // Swap with last and pop for O(1) removal
          particles[i] = particles[particles.length - 1];
          particles.pop();
        }
      }
    },

    _drawParticles: function(ctx, color) {
      var particles = this._tipParticles;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var alpha = p.life * 0.8;
        if (alpha <= 0) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var now = performance.now();
      var dt = (now - self._lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // Cap delta to avoid large jumps
      self._lastTime = now;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var spikeCount = parseInt(cfg.spikeCount, 10) || self.defaults.spikeCount;
      if (spikeCount < 32) spikeCount = 32;
      if (spikeCount > 128) spikeCount = 128;
      var ctx = self._ctx;

      self._resolveColors(cfg);
      var spikeColor = self._cachedColor;
      var bgColor = self._cachedBg;
      var darkColor = self._cachedDark;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      var centerX = w / 2;
      var centerY = h / 2;
      var minDim = Math.min(w, h);
      var baseRadius = minDim * 0.1;
      if (baseRadius < 20) baseRadius = 20;
      var maxLength = minDim * 0.4;

      // Idle state
      if (!freqData || freqData.length === 0) {
        var t = now * 0.001;
        var breathe = 0.6 + Math.sin(t * 1.5) * 0.4;

        // Inner core glow (breathing)
        var coreRadius = baseRadius * 0.7 * (0.8 + breathe * 0.2);
        var coreGrad = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, coreRadius
        );
        coreGrad.addColorStop(0, 'rgba(255,255,255,' + (0.15 * breathe) + ')');
        coreGrad.addColorStop(0.4, 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',' + (0.1 * breathe) + ')');
        coreGrad.addColorStop(1, 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Baseline circle
        ctx.strokeStyle = 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Short idle spikes with gentle ripple
        var angleStep = (Math.PI * 2) / spikeCount;
        ctx.strokeStyle = 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',0.35)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        for (var i = 0; i < spikeCount; i++) {
          var angle = i * angleStep;
          var ripple = 3 + Math.sin(t * 2 + i * 0.15) * 2;
          var x1 = centerX + Math.cos(angle) * baseRadius;
          var y1 = centerY + Math.sin(angle) * baseRadius;
          var x2 = centerX + Math.cos(angle) * (baseRadius + ripple);
          var y2 = centerY + Math.sin(angle) * (baseRadius + ripple);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Update and draw any remaining particles
        self._updateParticles(dt);
        self._drawParticles(ctx, spikeColor);

        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      // Active state
      var logBins = self._generateLogBins(spikeCount, freqData.length);

      if (!self._smoothedData || self._smoothedData.length !== spikeCount) {
        self._smoothedData = new Float32Array(spikeCount);
      }

      var angleStep = (Math.PI * 2) / spikeCount;

      // Compute bass energy for core pulse (first ~15% of bins)
      var bassEnd = Math.max(1, Math.floor(spikeCount * 0.15));
      var bassSum = 0;
      for (var b = 0; b < bassEnd; b++) {
        var bin = logBins[b];
        var s = 0;
        var cnt = bin.end - bin.start;
        for (var j = bin.start; j < bin.end; j++) {
          s += freqData[j];
        }
        bassSum += s / cnt;
      }
      var bassEnergy = (bassSum / bassEnd / 255) * (sensitivity / 5);
      if (bassEnergy > 1) bassEnergy = 1;

      // Inner core glow: 3-layer radial gradient pulsing with bass
      var coreScale = 0.8 + bassEnergy * 0.5;
      var coreRadius = baseRadius * 0.85 * coreScale;

      var coreGrad = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, coreRadius
      );
      var coreAlpha = 0.3 + bassEnergy * 0.5;
      coreGrad.addColorStop(0, 'rgba(255,255,255,' + (coreAlpha * 0.9) + ')');
      coreGrad.addColorStop(0.35, 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',' + (coreAlpha * 0.6) + ')');
      coreGrad.addColorStop(1, 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw spikes with glow
      ctx.shadowColor = 'rgb(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ')';
      ctx.shadowBlur = 12 + bassEnergy * 10;
      ctx.lineCap = 'round';

      for (var i = 0; i < spikeCount; i++) {
        var bin = logBins[i];
        var sum = 0;
        var count = bin.end - bin.start;
        for (var j = bin.start; j < bin.end; j++) {
          sum += freqData[j];
        }
        var avg = sum / count;

        self._smoothedData[i] = self._smoothedData[i] * 0.82 + avg * 0.18;

        var normalized = (self._smoothedData[i] / 255) * (sensitivity / 5);
        if (normalized > 1) normalized = 1;

        var spikeLength = normalized * maxLength;
        if (spikeLength < 4) spikeLength = 4;

        var angle = i * angleStep;
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);
        var x1 = centerX + cosA * baseRadius;
        var y1 = centerY + sinA * baseRadius;
        var tipR = baseRadius + spikeLength;
        var x2 = centerX + cosA * tipR;
        var y2 = centerY + sinA * tipR;

        // Spike gradient: dark → main color → white highlight at tip
        var grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgb(' + darkColor.r + ',' + darkColor.g + ',' + darkColor.b + ')');
        grad.addColorStop(0.5, 'rgb(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ')');
        grad.addColorStop(1, 'rgba(255,255,255,' + (0.5 + normalized * 0.5) + ')');

        ctx.strokeStyle = grad;
        // Line width varies by energy: 1.5 (quiet) to 4 (loud)
        ctx.lineWidth = 1.5 + normalized * 2.5;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Tip particles: when spike exceeds 70% of max length
        if (normalized > 0.6) {
          var particleChance = (normalized - 0.6) / 0.4; // 0 at 60%, 1 at 100%
          // Spawn 1-2 particles probabilistically
          if (Math.random() < particleChance * 0.6) {
            self._spawnParticle(x2, y2, angle, normalized);
          }
          if (Math.random() < particleChance * 0.3) {
            self._spawnParticle(x2, y2, angle, normalized);
          }
        }
      }

      // Reset shadow immediately after spike drawing
      ctx.shadowBlur = 0;

      // Thin baseline circle at spike base radius
      ctx.strokeStyle = 'rgba(' + spikeColor.r + ',' + spikeColor.g + ',' + spikeColor.b + ',' + (0.2 + bassEnergy * 0.3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Update and draw particles
      self._updateParticles(dt);
      self._drawParticles(ctx, spikeColor);

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(SpikesVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
