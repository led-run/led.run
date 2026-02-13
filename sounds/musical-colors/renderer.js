;(function(global) {
  'use strict';

  // Simple 1D Perlin-like noise generator
  function NoiseGenerator() {
    this.seed = Math.random() * 1000;
    this.perm = [];
    for (var i = 0; i < 256; i++) {
      this.perm[i] = Math.floor(Math.random() * 256);
    }
  }

  NoiseGenerator.prototype.noise = function(x) {
    var xi = Math.floor(x) & 255;
    var xf = x - Math.floor(x);
    var u = this.fade(xf);
    var a = this.perm[xi];
    var b = this.perm[(xi + 1) & 255];
    return this.lerp(u, this.grad(a, xf), this.grad(b, xf - 1));
  };

  NoiseGenerator.prototype.fade = function(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  NoiseGenerator.prototype.lerp = function(t, a, b) {
    return a + t * (b - a);
  };

  NoiseGenerator.prototype.grad = function(hash, x) {
    return (hash & 1) === 0 ? x : -x;
  };

  // Particle class
  function Particle(x, y, vx, vy, life, color, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.alpha = 1;
  }

  Particle.prototype.update = function(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
  };

  Particle.prototype.isDead = function() {
    return this.life <= 0;
  };

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  // Preset configurations
  var PRESETS = {
    aurora: {
      name: 'Aurora',
      colors: [
        { r: 0, g: 255, b: 150 },   // Green
        { r: 100, g: 150, b: 255 }, // Blue
        { r: 200, g: 100, b: 255 }  // Purple
      ],
      render: 'wave'
    },
    water: {
      name: 'Water Spray',
      colors: [
        { r: 0, g: 200, b: 255 },   // Cyan
        { r: 100, g: 220, b: 255 }, // Light blue
        { r: 50, g: 150, b: 200 }   // Deep blue
      ],
      render: 'fountain'
    },
    silky: {
      name: 'Silky Wave',
      colors: [
        { r: 255, g: 150, b: 200 }, // Pink
        { r: 200, g: 150, b: 255 }, // Purple
        { r: 150, g: 200, b: 255 }  // Light blue
      ],
      render: 'silk'
    },
    electric: {
      name: 'Electric Green',
      colors: [
        { r: 0, g: 255, b: 100 },   // Electric green
        { r: 200, g: 255, b: 100 }, // Yellow-green
        { r: 100, g: 255, b: 150 }  // Bright green
      ],
      render: 'pulse'
    },
    neon: {
      name: 'Neon Highway',
      colors: [
        { r: 255, g: 0, b: 100 },   // Hot pink
        { r: 0, g: 200, b: 255 },   // Cyan
        { r: 255, g: 200, b: 0 },   // Yellow
        { r: 150, g: 0, b: 255 }    // Purple
      ],
      render: 'highway'
    },
    flame: {
      name: 'Blue Flame',
      colors: [
        { r: 255, g: 255, b: 255 }, // White
        { r: 150, g: 200, b: 255 }, // Light blue
        { r: 50, g: 100, b: 255 }   // Deep blue
      ],
      render: 'flame'
    },
    star: {
      name: 'Star Power',
      colors: [
        { r: 255, g: 255, b: 255 }, // White
        { r: 255, g: 255, b: 150 }, // Pale yellow
        { r: 255, g: 220, b: 100 }  // Gold
      ],
      render: 'starburst'
    }
  };

  var MusicalColorsVisualizer = {
    id: 'musical-colors',

    defaults: {
      bg: '000000',
      sensitivity: 5,
      mcPreset: 'aurora'  // Default preset
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _particles: null,
    _noise: null,
    _time: 0,
    _lastTime: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._particles = [];
      this._noise = new NoiseGenerator();
      this._time = 0;
      this._lastTime = performance.now();

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
      this._particles = null;
      this._noise = null;
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
    },

    _getAverageVolume: function() {
      if (!this._audioEngine || !this._audioEngine.isRunning()) {
        return 0;
      }
      var freqData = this._audioEngine.getFrequencyData();
      if (!freqData || freqData.length === 0) {
        return 0;
      }
      var sum = 0;
      for (var i = 0; i < freqData.length; i++) {
        sum += freqData[i];
      }
      return sum / freqData.length / 255;
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var now = performance.now();
      var dt = Math.min((now - self._lastTime) / 1000, 0.1);
      self._lastTime = now;
      self._time += dt;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var presetId = cfg.mcPreset || self.defaults.mcPreset;
      var preset = PRESETS[presetId] || PRESETS.aurora;

      var volume = self._getAverageVolume() * (sensitivity / 5);
      if (volume > 1) volume = 1;

      // Clear with fade for trail effect
      self._ctx.fillStyle = 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',0.1)';
      self._ctx.fillRect(0, 0, w, h);

      // Render based on preset type
      switch (preset.render) {
        case 'wave':
          self._renderAurora(w, h, volume, preset.colors, dt);
          break;
        case 'fountain':
          self._renderFountain(w, h, volume, preset.colors, dt);
          break;
        case 'silk':
          self._renderSilk(w, h, volume, preset.colors, dt);
          break;
        case 'pulse':
          self._renderPulse(w, h, volume, preset.colors, dt);
          break;
        case 'highway':
          self._renderHighway(w, h, volume, preset.colors, dt);
          break;
        case 'flame':
          self._renderFlame(w, h, volume, preset.colors, dt);
          break;
        case 'starburst':
          self._renderStarburst(w, h, volume, preset.colors, dt);
          break;
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    },

    // Aurora: flowing wave bands
    _renderAurora: function(w, h, volume, colors, dt) {
      var ctx = this._ctx;
      var bands = 5;
      var time = this._time;

      for (var i = 0; i < bands; i++) {
        var color = colors[i % colors.length];
        var yOffset = (i / bands) * h;
        var amplitude = 50 + volume * 100;
        var frequency = 0.01 + i * 0.002;

        ctx.beginPath();
        ctx.moveTo(0, yOffset);

        for (var x = 0; x <= w; x += 5) {
          var noise = this._noise.noise(x * frequency + time + i * 100);
          var y = yOffset + Math.sin(x * 0.01 + time + i) * amplitude + noise * 30;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        var alpha = 0.15 + volume * 0.3;
        ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha + ')';
        ctx.fill();

        // Glow
        ctx.shadowBlur = 20 + volume * 20;
        ctx.shadowColor = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.5)';
        ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (0.4 + volume * 0.4) + ')';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    },

    // Water Spray: particle fountain
    _renderFountain: function(w, h, volume, colors, dt) {
      var ctx = this._ctx;
      var spawnRate = 2 + volume * 8;

      // Spawn particles
      for (var i = 0; i < spawnRate; i++) {
        var color = colors[Math.floor(Math.random() * colors.length)];
        var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        var speed = 100 + volume * 300;
        this._particles.push(new Particle(
          w / 2,
          h,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          1 + Math.random() * 2,
          color,
          2 + Math.random() * 3
        ));
      }

      // Update and draw particles
      ctx.shadowBlur = 15;
      for (var i = this._particles.length - 1; i >= 0; i--) {
        var p = this._particles[i];
        p.vy += 200 * dt; // Gravity
        p.update(dt);

        if (p.isDead() || p.y > h) {
          this._particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')';
        ctx.shadowColor = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',0.8)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Limit particle count
      if (this._particles.length > 500) {
        this._particles.splice(0, this._particles.length - 500);
      }
    },

    // Silky Wave: smooth sine wave flow
    _renderSilk: function(w, h, volume, colors, dt) {
      var ctx = this._ctx;
      var waves = 4;
      var time = this._time;

      for (var i = 0; i < waves; i++) {
        var color = colors[i % colors.length];
        var amplitude = 60 + volume * 80;
        var baseY = h / 2;

        ctx.beginPath();
        ctx.moveTo(0, baseY);

        for (var x = 0; x <= w; x += 3) {
          var y = baseY +
            Math.sin(x * 0.01 + time * 2 + i * 0.5) * amplitude * 0.6 +
            Math.sin(x * 0.02 + time * 1.5 + i) * amplitude * 0.4;
          ctx.lineTo(x, y);
        }

        var alpha = 0.2 + volume * 0.2;
        ctx.strokeStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha + ')';
        ctx.lineWidth = 15 + i * 5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 25;
        ctx.shadowColor = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.6)';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    },

    // Electric Green: lightning pulses
    _renderPulse: function(w, h, volume, colors, dt) {
      var ctx = this._ctx;
      var pulseCount = 3 + Math.floor(volume * 5);

      for (var i = 0; i < pulseCount; i++) {
        var color = colors[i % colors.length];
        var x = Math.random() * w;
        var y = Math.random() * h;
        var radius = 20 + volume * 80;

        var grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (0.6 + volume * 0.4) + ')');
        grad.addColorStop(0.5, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (0.2 + volume * 0.2) + ')');
        grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0)');

        ctx.fillStyle = grad;
        ctx.shadowBlur = 30 + volume * 30;
        ctx.shadowColor = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.8)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    },

    // Neon Highway: flowing lines with perspective
    _renderHighway: function(w, h, volume, colors, dt) {
      var ctx = this._ctx;
      var lineCount = 4;
      var time = this._time;
      var speed = 200 + volume * 300;

      // Spawn line particles
      if (Math.random() < 0.3) {
        var color = colors[Math.floor(Math.random() * colors.length)];
        var lane = Math.floor(Math.random() * lineCount);
        this._particles.push(new Particle(
          (lane + 0.5) * (w / lineCount),
          0,
          0,
          speed,
          2,
          color,
          3 + Math.random() * 2
        ));
      }

      // Draw particles
      ctx.shadowBlur = 15;
      for (var i = this._particles.length - 1; i >= 0; i--) {
        var p = this._particles[i];
        p.update(dt);

        if (p.isDead() || p.y > h) {
          this._particles.splice(i, 1);
          continue;
        }

        // Perspective scale
        var scale = p.y / h;
        var size = p.size * (0.5 + scale * 1.5);

        ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')';
        ctx.shadowColor = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',0.8)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (this._particles.length > 300) {
        this._particles.splice(0, this._particles.length - 300);
      }
    },

    // Blue Flame: rising particles
    _renderFlame: function(w, h, volume, colors, dt) {
      var ctx = this._ctx;
      var spawnRate = 3 + volume * 10;

      // Spawn flame particles
      for (var i = 0; i < spawnRate; i++) {
        var color = colors[Math.floor(Math.random() * colors.length)];
        var xOffset = (Math.random() - 0.5) * 100;
        this._particles.push(new Particle(
          w / 2 + xOffset,
          h,
          (Math.random() - 0.5) * 50,
          -100 - volume * 150,
          0.8 + Math.random() * 1.2,
          color,
          4 + Math.random() * 6
        ));
      }

      // Draw particles
      ctx.shadowBlur = 20;
      for (var i = this._particles.length - 1; i >= 0; i--) {
        var p = this._particles[i];
        p.vx += (Math.random() - 0.5) * 20 * dt; // Flicker
        p.update(dt);

        if (p.isDead() || p.y < 0) {
          this._particles.splice(i, 1);
          continue;
        }

        var size = p.size * p.alpha;
        ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')';
        ctx.shadowColor = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',0.8)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (this._particles.length > 600) {
        this._particles.splice(0, this._particles.length - 600);
      }
    },

    // Star Power: radial bursts
    _renderStarburst: function(w, h, volume, colors, dt) {
      var ctx = this._ctx;
      var centerX = w / 2;
      var centerY = h / 2;

      // Spawn burst particles
      if (volume > 0.3 && Math.random() < 0.5) {
        var color = colors[Math.floor(Math.random() * colors.length)];
        var angle = Math.random() * Math.PI * 2;
        var speed = 100 + volume * 200;
        this._particles.push(new Particle(
          centerX,
          centerY,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          1 + Math.random() * 1.5,
          color,
          3 + Math.random() * 4
        ));
      }

      // Draw particles with trails
      ctx.shadowBlur = 20;
      for (var i = this._particles.length - 1; i >= 0; i--) {
        var p = this._particles[i];
        p.vx *= 0.98; // Slow down
        p.vy *= 0.98;
        p.update(dt);

        if (p.isDead()) {
          this._particles.splice(i, 1);
          continue;
        }

        var size = p.size * p.alpha;
        ctx.fillStyle = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + p.alpha + ')';
        ctx.shadowColor = 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',0.9)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Center glow
      if (volume > 0.2) {
        var color = colors[0];
        var glowRadius = 30 + volume * 50;
        var grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
        grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + volume + ')');
        grad.addColorStop(1, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (this._particles.length > 400) {
        this._particles.splice(0, this._particles.length - 400);
      }
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(MusicalColorsVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
