;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var OceanVisualizer = {
    id: 'ocean',

    defaults: {
      color: '4080ff',
      bg: '001a33',
      sensitivity: 5,
      waveCount: 7
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _lastTime: 0,
    _elapsed: 0,
    _smoothedAmps: null,
    _stars: null,
    _foamParticles: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._lastTime = 0;
      this._elapsed = 0;
      this._smoothedAmps = null;
      this._foamParticles = [];

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

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
      this._container = null;
      this._audioEngine = null;
      this._smoothedAmps = null;
      this._stars = null;
      this._foamParticles = null;
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

      // Regenerate stars on resize
      this._generateStars(w, h);
    },

    _generateStars: function(w, h) {
      var count = 80 + Math.floor(Math.random() * 41); // 80-120
      this._stars = [];
      for (var i = 0; i < count; i++) {
        this._stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.4, // Top 40% only
          radius: 0.5 + Math.random() * 1.5,
          twinkleSpeed: 0.8 + Math.random() * 1.5, // Slower, gentler twinkle
          twinkleOffset: Math.random() * Math.PI * 2,
          baseAlpha: 0.4 + Math.random() * 0.5
        });
      }
    },

    /**
     * Compute the wave Y value for a given x position, time, layer params.
     * Uses two sine harmonics for richer shape.
     */
    _waveY: function(x, baseY, amp, frequency, time, waveSpeed, layer) {
      var primary = Math.sin(x * frequency + time * waveSpeed + layer) * amp;
      var secondary = Math.sin(x * frequency * 1.8 + time * waveSpeed * 0.7 + layer * 2.3) * amp * 0.3;
      return baseY + primary + secondary;
    },

    /**
     * Approximate derivative of wave Y to detect crests (sign changes).
     */
    _waveDerivative: function(x, baseY, amp, frequency, time, waveSpeed, layer) {
      var dx = 1;
      var y0 = this._waveY(x - dx, baseY, amp, frequency, time, waveSpeed, layer);
      var y1 = this._waveY(x + dx, baseY, amp, frequency, time, waveSpeed, layer);
      return (y1 - y0) / (2 * dx);
    },

    _spawnFoam: function(x, y, waveColor) {
      if (this._foamParticles.length >= 100) return;
      this._foamParticles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        radius: 1 + Math.random() * 2.5,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.2 - Math.random() * 0.3
      });
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var now = performance.now();
      var dt = (now - self._lastTime) / 1000; // Delta in seconds
      if (dt > 0.1) dt = 0.1; // Cap to avoid spiral on tab-switch
      self._lastTime = now;
      self._elapsed += dt;

      var time = self._elapsed;
      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var waveColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var waveCount = parseInt(cfg.waveCount, 10) || self.defaults.waveCount;
      if (waveCount < 3) waveCount = 3;
      if (waveCount > 10) waveCount = 10;
      var ctx = self._ctx;

      // --- Night sky background ---
      var skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      // Dark navy at top, slightly lighter toward horizon
      skyGrad.addColorStop(0, 'rgb(' + Math.floor(bgColor.r * 0.4) + ',' + Math.floor(bgColor.g * 0.3) + ',' + Math.floor(bgColor.b * 0.5) + ')');
      skyGrad.addColorStop(0.35, 'rgb(' + Math.floor(bgColor.r * 0.6) + ',' + Math.floor(bgColor.g * 0.5) + ',' + Math.floor(bgColor.b * 0.7) + ')');
      skyGrad.addColorStop(0.5, 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')');
      skyGrad.addColorStop(1, 'rgb(' + Math.min(255, bgColor.r + 15) + ',' + Math.min(255, bgColor.g + 20) + ',' + Math.min(255, bgColor.b + 30) + ')');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // --- Stars ---
      if (self._stars) {
        for (var s = 0; s < self._stars.length; s++) {
          var star = self._stars[s];
          var twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
          var alpha = star.baseAlpha + twinkle * 0.25;
          if (alpha < 0.1) alpha = 0.1;
          if (alpha > 0.95) alpha = 0.95;
          ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Moon ---
      var minDim = Math.min(w, h);
      var moonR = minDim * 0.02; // Diameter ~4% of min(w,h), radius = 2%
      var moonX = w * 0.8;
      var moonY = h * 0.15;

      // Outer glow halo
      var haloGrad = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 5);
      haloGrad.addColorStop(0, 'rgba(200,220,255,0.12)');
      haloGrad.addColorStop(0.5, 'rgba(180,200,240,0.05)');
      haloGrad.addColorStop(1, 'rgba(150,180,220,0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 5, 0, Math.PI * 2);
      ctx.fill();

      // Moon body with soft glow
      var softPulse = 0.9 + Math.sin(time * 0.5) * 0.1;
      ctx.shadowColor = 'rgba(200,220,255,0.6)';
      ctx.shadowBlur = moonR * 2 * softPulse;
      var moonGrad = ctx.createRadialGradient(moonX - moonR * 0.2, moonY - moonR * 0.2, 0, moonX, moonY, moonR);
      moonGrad.addColorStop(0, 'rgba(255,255,245,0.95)');
      moonGrad.addColorStop(0.6, 'rgba(220,230,250,0.85)');
      moonGrad.addColorStop(1, 'rgba(180,200,230,0.3)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Moon reflection on water (subtle vertical shimmer)
      var reflectY = h * 0.45;
      var reflectH = h * 0.3;
      for (var ry = 0; ry < 8; ry++) {
        var reflY = reflectY + ry * (reflectH / 8);
        var reflAlpha = 0.12 * (1 - ry / 8) * softPulse;
        var shimmerX = moonX + Math.sin(time * 1.2 + ry * 0.7) * 8;
        ctx.fillStyle = 'rgba(200,220,255,' + reflAlpha.toFixed(3) + ')';
        ctx.fillRect(shimmerX - 2, reflY, 4, reflectH / 8 - 2);
      }

      // --- Audio data ---
      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      // Initialize smoothed amplitudes
      if (!self._smoothedAmps || self._smoothedAmps.length !== waveCount) {
        self._smoothedAmps = new Float32Array(waveCount);
        for (var i = 0; i < waveCount; i++) {
          self._smoothedAmps[i] = 0;
        }
      }

      // Calculate amplitude for each wave layer from frequency bands
      var amplitudes = [];
      if (freqData && freqData.length > 0) {
        var binCount = freqData.length;
        var binStep = Math.floor(binCount / waveCount);
        for (var i = 0; i < waveCount; i++) {
          var start = i * binStep;
          var end = Math.min(start + binStep, binCount);
          var sum = 0;
          for (var j = start; j < end; j++) {
            sum += freqData[j];
          }
          var avg = sum / (end - start);
          self._smoothedAmps[i] = self._smoothedAmps[i] * 0.85 + avg * 0.15;
          var normalized = (self._smoothedAmps[i] / 255) * (sensitivity / 5);
          amplitudes.push(normalized);
        }
      } else {
        // Idle state: gentle rolling
        for (var i = 0; i < waveCount; i++) {
          amplitudes.push(0.05 + Math.sin(time * 0.3 + i) * 0.02);
        }
      }

      // --- Draw wave layers from back to front ---
      var segmentCount = 60; // Number of bezier segments
      var segW = w / segmentCount;

      for (var layer = 0; layer < waveCount; layer++) {
        var depth = (layer + 1) / waveCount; // 0.x to 1.0
        var baseY = h * (0.35 + layer * (0.55 / waveCount)); // Spread across 35%-90% of canvas
        var amp = amplitudes[layer] * h * 0.15;
        if (amp < 4) amp = 4;

        var waveSpeed = 0.4 + layer * 0.12;
        var frequency = 0.006 - layer * 0.0004;

        // Color: deeper waves darker/more transparent, front waves brighter
        var layerAlpha = 0.25 + depth * 0.55;
        // Back waves get lower alpha for depth/blur illusion
        if (layer < waveCount - 2) {
          layerAlpha *= 0.7 + depth * 0.3;
        }
        var layerR = Math.floor(waveColor.r * (0.35 + depth * 0.65));
        var layerG = Math.floor(waveColor.g * (0.35 + depth * 0.65));
        var layerB = Math.floor(waveColor.b * (0.35 + depth * 0.65));

        // Compute all wave points for this layer
        var points = [];
        for (var i = 0; i <= segmentCount; i++) {
          var x = i * segW;
          var y = self._waveY(x, baseY, amp, frequency, time, waveSpeed, layer);
          points.push({ x: x, y: y });
        }

        // --- Draw filled wave shape using cubic bezier ---
        ctx.beginPath();
        ctx.moveTo(-2, h + 2);
        ctx.lineTo(points[0].x, points[0].y);

        for (var i = 0; i < points.length - 1; i++) {
          var p0 = points[i];
          var p1 = points[i + 1];
          // Cubic bezier with control points at 1/3 and 2/3 of segment
          var cp1x = p0.x + segW / 3;
          var cp1y = p0.y;
          var cp2x = p1.x - segW / 3;
          var cp2y = p1.y;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
        }

        ctx.lineTo(w + 2, h + 2);
        ctx.closePath();

        // Fill gradient for wave body
        var waveGrad = ctx.createLinearGradient(0, baseY - amp, 0, h);
        waveGrad.addColorStop(0, 'rgba(' + layerR + ',' + layerG + ',' + layerB + ',' + layerAlpha.toFixed(3) + ')');
        waveGrad.addColorStop(1, 'rgba(' + Math.floor(layerR * 0.5) + ',' + Math.floor(layerG * 0.5) + ',' + Math.floor(layerB * 0.7) + ',' + Math.min(0.95, layerAlpha + 0.15).toFixed(3) + ')');
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // --- Thin bright stroke on top edge ---
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (var i = 0; i < points.length - 1; i++) {
          var p0 = points[i];
          var p1 = points[i + 1];
          var cp1x = p0.x + segW / 3;
          var cp1y = p0.y;
          var cp2x = p1.x - segW / 3;
          var cp2y = p1.y;
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
        }
        ctx.strokeStyle = 'rgba(' + Math.min(255, layerR + 80) + ',' + Math.min(255, layerG + 80) + ',' + Math.min(255, layerB + 80) + ',' + (layerAlpha * 0.6).toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // --- Specular highlights on front 2 waves ---
        if (layer >= waveCount - 2) {
          // Find local minima in Y (peaks, since Y decreases upward)
          for (var i = 1; i < points.length - 1; i++) {
            if (points[i].y < points[i - 1].y && points[i].y < points[i + 1].y) {
              // This is a crest (local minimum in Y)
              var peakX = points[i].x;
              var peakY = points[i].y;
              var highlightLen = segW * 2;
              var highlightAlpha = 0.45 + depth * 0.35;
              ctx.strokeStyle = 'rgba(255,255,255,' + highlightAlpha.toFixed(3) + ')';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(peakX - highlightLen / 2, peakY - 1);
              ctx.lineTo(peakX + highlightLen / 2, peakY - 1);
              ctx.stroke();

              // Spawn foam at crests of frontmost wave
              if (layer === waveCount - 1 && Math.random() < 0.3) {
                self._spawnFoam(peakX, peakY, waveColor);
              }
            }
          }
        }

        // --- Foam detection on crests via derivative sign change (all layers) ---
        if (layer >= waveCount - 3) {
          for (var i = 1; i < segmentCount; i++) {
            var prevDeriv = self._waveDerivative((i - 1) * segW, baseY, amp, frequency, time, waveSpeed, layer);
            var currDeriv = self._waveDerivative(i * segW, baseY, amp, frequency, time, waveSpeed, layer);
            // Derivative changes from negative to positive = crest just passed (Y min)
            if (prevDeriv < 0 && currDeriv >= 0) {
              var foamX = (i - 0.5) * segW;
              var foamY = self._waveY(foamX, baseY, amp, frequency, time, waveSpeed, layer);
              if (Math.random() < 0.15) {
                self._spawnFoam(foamX, foamY, waveColor);
              }
            }
          }
        }
      }

      // --- Update and draw foam particles ---
      var aliveFoam = [];
      for (var i = 0; i < self._foamParticles.length; i++) {
        var fp = self._foamParticles[i];
        fp.life -= fp.decay;
        fp.x += fp.vx;
        fp.y += fp.vy;
        if (fp.life > 0) {
          aliveFoam.push(fp);
          var foamAlpha = fp.life * 0.7;
          ctx.fillStyle = 'rgba(255,255,255,' + foamAlpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fp.radius * fp.life, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      self._foamParticles = aliveFoam;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(OceanVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
