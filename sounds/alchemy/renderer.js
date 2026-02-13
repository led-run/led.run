;(function(global) {
  'use strict';

  // --- Color helpers ---

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
   * Interpolate particle color along spiral path.
   * Inner (normalizedRadius ~ 0) = warm orange/gold hue
   * Outer (normalizedRadius ~ 1) = cool purple/blue hue
   * Uses the base color's saturation and lightness as anchors.
   */
  function spiralColor(baseHsl, normalizedRadius, volumeBoost) {
    // Warm inner hue: ~30 (orange/gold), cool outer hue: ~270 (purple/blue)
    // Map in HSL hue space (0-1): 30/360=0.083, 270/360=0.75
    var innerHue = 0.083;
    var outerHue = 0.75;
    var hue = innerHue + (outerHue - innerHue) * normalizedRadius;

    // Slight hue boost from volume (shift towards white/brighter)
    var sat = baseHsl.s * (0.7 + 0.3 * (1 - normalizedRadius));
    var lit = baseHsl.l + volumeBoost * 0.15 * (1 - normalizedRadius);
    if (lit > 1) lit = 1;

    return hslToRgb(hue, sat, lit);
  }


  var AlchemyVisualizer = {
    id: 'alchemy',

    defaults: {
      color: 'ff6600',      // Orange energy
      bg: '000000',
      sensitivity: 5,
      complexity: 5          // Particle density 1-10
    },

    _canvas: null,
    _trailCanvas: null,
    _ctx: null,
    _trailCtx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _particles: null,
    _energyWaves: null,
    _avgVolume: 0,
    _lastTime: 0,
    _time: 0,
    _lastWaveTime: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._avgVolume = 0;
      this._lastTime = 0;
      this._time = 0;
      this._lastWaveTime = 0;
      this._energyWaves = [];

      // Trail canvas for particle trails
      this._trailCanvas = document.createElement('canvas');
      this._trailCanvas.style.position = 'absolute';
      this._trailCanvas.style.top = '0';
      this._trailCanvas.style.left = '0';
      this._trailCanvas.style.width = '100%';
      this._trailCanvas.style.height = '100%';
      container.appendChild(this._trailCanvas);
      this._trailCtx = this._trailCanvas.getContext('2d');

      // Main canvas for orb, energy waves, and foreground elements
      this._canvas = document.createElement('canvas');
      this._canvas.style.position = 'absolute';
      this._canvas.style.top = '0';
      this._canvas.style.left = '0';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._initParticles();
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
      if (this._trailCanvas && this._trailCanvas.parentNode) {
        this._trailCanvas.parentNode.removeChild(this._trailCanvas);
      }
      this._canvas = null;
      this._ctx = null;
      this._trailCanvas = null;
      this._trailCtx = null;
      this._container = null;
      this._audioEngine = null;
      this._particles = null;
      this._energyWaves = null;
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

      this._trailCanvas.width = w * dpr;
      this._trailCanvas.height = h * dpr;
      this._trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this._initParticles();
    },

    _initParticles: function() {
      var cfg = this._config;
      var complexity = parseInt(cfg.complexity, 10) || this.defaults.complexity;
      if (complexity < 1) complexity = 1;
      if (complexity > 10) complexity = 10;

      // Max 200 particles (was 300), scale: 20 per complexity unit
      var count = complexity * 20;
      if (count > 200) count = 200;
      this._particles = [];

      for (var i = 0; i < count; i++) {
        this._particles.push(this._createParticle(true));
      }
    },

    _createParticle: function(randomize) {
      var startRadius = 30 + Math.random() * 60;
      return {
        angle: Math.random() * Math.PI * 2,
        radius: randomize ? (startRadius + Math.random() * 150) : startRadius,
        speed: 0.008 + Math.random() * 0.018,
        spiralSpeed: 0.3 + Math.random() * 0.5,
        upwardSpeed: 0.2 + Math.random() * 0.6,
        baseSize: 1.5 + Math.random() * 2.5,
        opacity: 0.3 + Math.random() * 0.5,
        life: randomize ? Math.random() : 1,
        maxLife: 1,
        birthRadius: startRadius
      };
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      // --- Delta time via performance.now() ---
      var now = performance.now();
      var dt;
      if (self._lastTime === 0) {
        dt = 0.016; // First frame fallback ~60fps
      } else {
        dt = (now - self._lastTime) / 1000;
        // Clamp to avoid spiral jumps on tab re-focus
        if (dt > 0.1) dt = 0.1;
      }
      self._lastTime = now;
      self._time += dt;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var orbColor = hexToRgb(cfg.color || self.defaults.color);
      var orbHsl = rgbToHsl(orbColor.r, orbColor.g, orbColor.b);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var ctx = self._ctx;
      var trailCtx = self._trailCtx;

      // === Clear main canvas ===
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // === Radial trail fade (center slower, edges faster) ===
      var cx = w / 2;
      var cy = h / 2;
      var fadeRadius = Math.max(w, h) * 0.8;
      var trailGrad = trailCtx.createRadialGradient(cx, cy, 0, cx, cy, fadeRadius);
      trailGrad.addColorStop(0, 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',0.015)');
      trailGrad.addColorStop(1, 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',0.06)');
      trailCtx.fillStyle = trailGrad;
      trailCtx.fillRect(0, 0, w, h);

      // === Audio analysis ===
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
        volume = 0.08; // Idle minimum
      }

      // Smooth volume
      self._avgVolume = self._avgVolume * 0.85 + volume * 0.15;

      var normalizedVol = self._avgVolume * (sensitivity / 5);
      if (normalizedVol > 1) normalizedVol = 1;

      var isIdle = !isRunning || normalizedVol < 0.05;

      var centerX = w / 2;
      var centerY = h / 2;

      // === Background glow ===
      var bgGlowRadius = Math.min(w, h) * 0.5;
      var bgGlowAlpha = 0.08 + normalizedVol * 0.15;
      var bgGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, bgGlowRadius);
      bgGlow.addColorStop(0, 'rgba(' + orbColor.r + ',' + orbColor.g + ',' + orbColor.b + ',' + bgGlowAlpha + ')');
      bgGlow.addColorStop(1, 'rgba(' + orbColor.r + ',' + orbColor.g + ',' + orbColor.b + ',0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, w, h);

      // === Central energy orb ===
      var breathe = isIdle ? Math.sin(self._time * 1.2) * 16 : 0;
      var orbRadius = (isIdle ? 25 : 30) + normalizedVol * 100 + breathe;
      if (orbRadius < 10) orbRadius = 10;

      // Hue shift based on volume (orange toward yellow/white at high volume)
      var hueShift = normalizedVol * 60;
      var r = orbColor.r;
      var g = Math.min(255, orbColor.g + hueShift);
      var b = orbColor.b;

      // Radial gradient for orb
      var orbGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
      orbGrad.addColorStop(0, 'rgba(255,255,255,' + (0.8 + normalizedVol * 0.2) + ')');
      orbGrad.addColorStop(0.3, 'rgba(' + r + ',' + g + ',' + b + ',0.9)');
      orbGrad.addColorStop(0.7, 'rgba(' + Math.floor(r * 0.6) + ',' + Math.floor(g * 0.6) + ',' + Math.floor(b * 0.6) + ',0.5)');
      orbGrad.addColorStop(1, 'rgba(' + Math.floor(r * 0.3) + ',' + Math.floor(g * 0.3) + ',' + Math.floor(b * 0.3) + ',0)');

      // Pulsating glow
      var glowPulse = Math.sin(self._time * 3) * 5;
      ctx.shadowColor = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.shadowBlur = 30 + normalizedVol * 30 + glowPulse;
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // === Pulsing rings around orb ===
      var ringCount = 3;
      for (var ri = 0; ri < ringCount; ri++) {
        var phase = (self._time * 2 + ri * (Math.PI * 2 / ringCount)) % (Math.PI * 2);
        var ringRadius = orbRadius + 20 + Math.sin(phase) * 30;
        var ringAlpha = (0.45 + Math.sin(phase) * 0.3) * normalizedVol;

        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + ringAlpha + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // === Energy waves ===
      // Emit a new wave periodically at high volume
      var maxExtent = Math.max(w, h) * 0.7;
      if (normalizedVol > 0.6 && self._energyWaves.length < 5) {
        var timeSinceLastWave = self._time - self._lastWaveTime;
        if (timeSinceLastWave > 0.5) {
          self._energyWaves.push({
            radius: orbRadius,
            maxRadius: maxExtent,
            life: 1,
            maxLife: 1,
            alpha: 0.6 + normalizedVol * 0.3
          });
          self._lastWaveTime = self._time;
        }
      }

      // Update and draw energy waves
      for (var wi = self._energyWaves.length - 1; wi >= 0; wi--) {
        var wave = self._energyWaves[wi];

        // Expand outward
        wave.radius += dt * maxExtent * 0.8; // Traverse full radius in ~1.25s
        wave.life -= dt * 0.8; // Fade over ~1.25s

        if (wave.life <= 0 || wave.radius > wave.maxRadius) {
          self._energyWaves.splice(wi, 1);
          continue;
        }

        // Diminishing alpha as it expands
        var waveAlpha = wave.alpha * wave.life;
        // Line width: thick at start (4px), thin at edge (1px)
        var waveProgress = (wave.radius - orbRadius) / (wave.maxRadius - orbRadius);
        if (waveProgress < 0) waveProgress = 0;
        if (waveProgress > 1) waveProgress = 1;
        var waveLineWidth = 4 - waveProgress * 3; // 4px -> 1px

        // Color shifts cooler as wave expands
        var waveColor = spiralColor(orbHsl, waveProgress * 0.5, normalizedVol);

        ctx.strokeStyle = 'rgba(' + waveColor.r + ',' + waveColor.g + ',' + waveColor.b + ',' + waveAlpha + ')';
        ctx.lineWidth = waveLineWidth;
        ctx.beginPath();
        ctx.arc(centerX, centerY, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // === Update and draw particles ===
      var dtScale = dt / 0.016; // Normalize to ~60fps so motion stays consistent
      if (dtScale > 3) dtScale = 3;

      for (var pi = 0; pi < self._particles.length; pi++) {
        var p = self._particles[pi];

        // Idle state: very slow spiral, reduced motion
        var motionMult = isIdle ? 0.25 : 1;
        var volFactor = isIdle ? 0.1 : normalizedVol;

        // Spiral motion
        p.angle += p.speed * (1 + volFactor) * dtScale * motionMult;
        p.radius += p.spiralSpeed * (0.3 + volFactor * 0.7) * dtScale * motionMult;

        // Decay life
        p.life -= 0.002 * (1 + volFactor) * dtScale;
        if (p.life < 0) p.life = 0;

        // Reset particle if it goes too far or dies
        if (p.radius > maxExtent || p.life <= 0) {
          var fresh = self._createParticle(false);
          p.radius = fresh.radius;
          p.angle = fresh.angle;
          p.life = 1;
          p.birthRadius = fresh.birthRadius;
          p.speed = fresh.speed;
          p.spiralSpeed = fresh.spiralSpeed;
          p.upwardSpeed = fresh.upwardSpeed;
          p.baseSize = fresh.baseSize;
          p.opacity = fresh.opacity;
        }

        // Normalized distance (0 = center, 1 = max extent)
        var normalizedRadius = (p.radius - 30) / (maxExtent - 30);
        if (normalizedRadius < 0) normalizedRadius = 0;
        if (normalizedRadius > 1) normalizedRadius = 1;

        // Convert to Cartesian
        var spiralX = Math.cos(p.angle) * p.radius;
        var spiralY = Math.sin(p.angle) * p.radius;

        // Upward drift
        var upwardDrift = (p.birthRadius - p.radius) * p.upwardSpeed * (1 + volFactor * 0.5);
        var px = centerX + spiralX;
        var py = centerY + spiralY + upwardDrift;

        // --- Particle size variation: inner larger, outer smaller ---
        var sizeFromRadius = 1.5 - normalizedRadius * 0.8; // 1.5 (inner) -> 0.7 (outer)
        var lifeScale = 0.5 + p.life * 0.5;
        var particleSize = p.baseSize * sizeFromRadius * lifeScale;

        // --- Color variation along spiral path ---
        var pColor = spiralColor(orbHsl, normalizedRadius, volFactor);

        // Distance + life based alpha
        var distanceFade = 1 - normalizedRadius;
        var particleAlpha = p.opacity * distanceFade * p.life;

        // In idle state, keep only a faint glow for the inner particles
        if (isIdle) {
          particleAlpha *= 0.6;
        }

        // Draw particle on trail canvas with glow
        trailCtx.shadowColor = 'rgba(' + pColor.r + ',' + pColor.g + ',' + pColor.b + ',0.7)';
        trailCtx.shadowBlur = 6 + (1 - normalizedRadius) * 6; // Stronger glow near center
        trailCtx.fillStyle = 'rgba(' + pColor.r + ',' + pColor.g + ',' + pColor.b + ',' + particleAlpha + ')';
        trailCtx.beginPath();
        trailCtx.arc(px, py, particleSize, 0, Math.PI * 2);
        trailCtx.fill();
        trailCtx.shadowBlur = 0;
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(AlchemyVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
