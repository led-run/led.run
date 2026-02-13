;(function(global) {
  'use strict';

  // ── Shared Utilities ──────────────────────────────────────────────

  // 1D Perlin-like noise with permutation table
  var _noisePerm = [];
  (function() {
    for (var i = 0; i < 256; i++) _noisePerm[i] = Math.floor(Math.random() * 256);
  })();

  function _noiseFade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function _noiseLerp(t, a, b) { return a + t * (b - a); }
  function _noiseGrad(hash, x) { return (hash & 1) === 0 ? x : -x; }

  function noise1D(x) {
    var xi = Math.floor(x) & 255;
    var xf = x - Math.floor(x);
    var u = _noiseFade(xf);
    return _noiseLerp(u, _noiseGrad(_noisePerm[xi], xf), _noiseGrad(_noisePerm[(xi + 1) & 255], xf - 1));
  }

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  function hslToRgba(h, s, l, a) {
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return 'rgba(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ',' + a + ')';
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function rgba(r, g, b, a) {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  // ── Global Particle Limit ─────────────────────────────────────────

  var MAX_PARTICLES = 400;

  // ── Particle with trail support ───────────────────────────────────

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
    this.trail = [{ x: x, y: y }, { x: x, y: y }, { x: x, y: y }];
    this.type = 0; // 0 = normal, 1 = splash, 2 = ember
    this.splashed = false;
  }

  Particle.prototype.update = function(dt) {
    // Shift trail
    this.trail[2] = this.trail[1];
    this.trail[1] = this.trail[0];
    this.trail[0] = { x: this.x, y: this.y };
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
  };

  Particle.prototype.isDead = function() {
    return this.life <= 0;
  };

  // ── Preset Configurations ─────────────────────────────────────────

  var PRESETS = {
    aurora: { name: 'Aurora', render: 'aurora' },
    water: { name: 'Water Spray', render: 'fountain' },
    silky: { name: 'Silky Wave', render: 'silk' },
    electric: { name: 'Electric Pulse', render: 'pulse' },
    neon: { name: 'Neon Highway', render: 'highway' },
    flame: { name: 'Blue Flame', render: 'flame' },
    star: { name: 'Star Power', render: 'starburst' }
  };

  // ── Visualizer Object ─────────────────────────────────────────────

  var MusicalColorsVisualizer = {
    id: 'musical-colors',

    defaults: {
      bg: '000000',
      sensitivity: 5,
      mcPreset: 'aurora'
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _particles: null,
    _time: 0,
    _lastTime: 0,
    _burstCooldown: 0,
    _flashAlpha: 0,
    _roadOffset: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._particles = [];
      this._time = 0;
      this._lastTime = performance.now();
      this._burstCooldown = 0;
      this._flashAlpha = 0;
      this._roadOffset = 0;

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

    _getAudioData: function() {
      if (!this._audioEngine || !this._audioEngine.isRunning()) {
        return { volume: 0, freq: null };
      }
      var freqData = this._audioEngine.getFrequencyData();
      if (!freqData || freqData.length === 0) {
        return { volume: 0, freq: null };
      }
      var sum = 0;
      for (var i = 0; i < freqData.length; i++) sum += freqData[i];
      return { volume: sum / freqData.length / 255, freq: freqData };
    },

    // Get volume in specific frequency band (0-1 normalized index range)
    _getBandVolume: function(freq, lowFrac, highFrac) {
      if (!freq) return 0;
      var lo = Math.floor(lowFrac * freq.length);
      var hi = Math.floor(highFrac * freq.length);
      if (hi <= lo) return 0;
      var sum = 0;
      for (var i = lo; i < hi; i++) sum += freq[i];
      return sum / (hi - lo) / 255;
    },

    _enforceParticleLimit: function() {
      if (this._particles.length > MAX_PARTICLES) {
        this._particles.splice(0, this._particles.length - MAX_PARTICLES);
      }
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

      var audio = self._getAudioData();
      var volume = Math.min(audio.volume * (sensitivity / 5), 1);
      var freq = audio.freq;
      var ctx = self._ctx;

      // Clear with fade trail (preset-specific opacity)
      var fadeAlpha = preset.render === 'aurora' ? 0.15 : 0.12;
      ctx.fillStyle = rgba(bgColor.r, bgColor.g, bgColor.b, fadeAlpha);
      ctx.fillRect(0, 0, w, h);

      switch (preset.render) {
        case 'aurora':
          self._renderAurora(ctx, w, h, volume, freq, dt);
          break;
        case 'fountain':
          self._renderFountain(ctx, w, h, volume, freq, dt);
          break;
        case 'silk':
          self._renderSilk(ctx, w, h, volume, freq, dt);
          break;
        case 'pulse':
          self._renderPulse(ctx, w, h, volume, freq, dt);
          break;
        case 'highway':
          self._renderHighway(ctx, w, h, volume, freq, dt);
          break;
        case 'flame':
          self._renderFlame(ctx, w, h, volume, freq, dt);
          break;
        case 'starburst':
          self._renderStarburst(ctx, w, h, volume, freq, dt);
          break;
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    },

    // ── Aurora ────────────────────────────────────────────────────────
    // Wide wave bands with HSL gradient (green→cyan→purple),
    // Perlin noise displacement on edges, screen blending between bands.
    _renderAurora: function(ctx, w, h, volume, freq, dt) {
      var bands = 5;
      var time = this._time;
      var saved = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'screen';

      for (var i = 0; i < bands; i++) {
        var bandFrac = i / bands;
        // HSL hue: 120 (green) → 180 (cyan) → 280 (purple)
        var hueBase = 120 + bandFrac * 160;
        var yCenter = h * 0.2 + (i / bands) * h * 0.6;
        var amplitude = 80 + volume * 150;
        var freqMult = 0.008 + i * 0.002;
        var phaseOffset = i * 137;

        // Build the wave path
        ctx.beginPath();
        var firstY = 0;
        for (var x = 0; x <= w; x += 4) {
          var noiseVal = noise1D(x * freqMult + time * 0.6 + phaseOffset);
          var noiseEdge = noise1D(x * 0.015 + time * 0.3 + phaseOffset + 500) * 40;
          var baseWave = Math.sin(x * 0.006 + time * 0.8 + i * 1.2) * amplitude;
          var y = yCenter + baseWave + noiseVal * 50 + noiseEdge;
          if (x === 0) { firstY = y; ctx.moveTo(x, y); }
          else ctx.lineTo(x, y);
        }
        // Close band: draw lower edge offset downward
        var bandWidth = 60 + volume * 40;
        for (var x = w; x >= 0; x -= 4) {
          var noiseVal = noise1D(x * freqMult + time * 0.6 + phaseOffset + 1000);
          var noiseEdge = noise1D(x * 0.015 + time * 0.3 + phaseOffset + 1500) * 40;
          var baseWave = Math.sin(x * 0.006 + time * 0.8 + i * 1.2) * amplitude;
          var y = yCenter + baseWave + noiseVal * 50 + noiseEdge + bandWidth;
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        // HSL gradient fill across band
        var grad = ctx.createLinearGradient(0, yCenter - amplitude, 0, yCenter + amplitude + bandWidth);
        var alpha = 0.2 + volume * 0.35;
        var hShift = Math.sin(time * 0.5 + i) * 20;
        grad.addColorStop(0, hslToRgba((hueBase + hShift) / 360, 0.8, 0.55, alpha * 0.6));
        grad.addColorStop(0.4, hslToRgba((hueBase + 40 + hShift) / 360, 0.85, 0.5, alpha));
        grad.addColorStop(1, hslToRgba((hueBase + 80 + hShift) / 360, 0.7, 0.45, alpha * 0.5));
        ctx.fillStyle = grad;
        ctx.fill();

        // Edge glow stroke
        ctx.shadowBlur = 25 + volume * 25;
        ctx.shadowColor = hslToRgba((hueBase + 40) / 360, 0.9, 0.6, 0.6);
        ctx.strokeStyle = hslToRgba((hueBase + 40) / 360, 0.9, 0.6, 0.3 + volume * 0.3);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.globalCompositeOperation = saved;
    },

    // ── Water Fountain ────────────────────────────────────────────────
    // Parabolic arc, 3-position trails, splash particles at peak.
    _renderFountain: function(ctx, w, h, volume, freq, dt) {
      var spawnRate = Math.floor(2 + volume * 6);
      var gravity = 320;

      // Spawn main fountain particles
      for (var i = 0; i < spawnRate && this._particles.length < MAX_PARTICLES; i++) {
        var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        var speed = 150 + volume * 350;
        var hue = 190 + Math.random() * 30;
        var p = new Particle(
          w / 2 + (Math.random() - 0.5) * 20,
          h * 0.95,
          Math.cos(angle) * speed * (0.8 + Math.random() * 0.4),
          Math.sin(angle) * speed * (0.8 + Math.random() * 0.4),
          1.5 + Math.random() * 2,
          { r: 0, g: Math.floor(180 + Math.random() * 40), b: 255, h: hue },
          2 + Math.random() * 3
        );
        p.peakY = h; // Track the highest point reached
        this._particles.push(p);
      }

      // Update particles
      for (var i = this._particles.length - 1; i >= 0; i--) {
        var p = this._particles[i];
        p.vy += gravity * dt; // Parabolic gravity
        p.update(dt);

        // Track peak
        if (p.y < p.peakY) p.peakY = p.y;

        // Splash: when particle starts falling after reaching peak
        if (!p.splashed && p.type === 0 && p.vy > 0 && p.peakY < h * 0.6) {
          p.splashed = true;
          // Spawn 3-5 tiny splash particles
          var splashCount = 3 + Math.floor(Math.random() * 3);
          for (var s = 0; s < splashCount && this._particles.length < MAX_PARTICLES; s++) {
            var sp = new Particle(
              p.x, p.y,
              (Math.random() - 0.5) * 120,
              (Math.random() - 0.8) * 60,
              0.4 + Math.random() * 0.4,
              { r: 150, g: 220, b: 255 },
              1 + Math.random()
            );
            sp.type = 1; // Splash type
            this._particles.push(sp);
          }
        }

        if (p.isDead() || p.y > h * 1.05) {
          this._particles.splice(i, 1);
          continue;
        }

        // Draw trail
        var trailAlpha = p.alpha * 0.3;
        ctx.strokeStyle = rgba(p.color.r, p.color.g, p.color.b, trailAlpha);
        ctx.lineWidth = p.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(p.trail[2].x, p.trail[2].y);
        ctx.lineTo(p.trail[1].x, p.trail[1].y);
        ctx.lineTo(p.trail[0].x, p.trail[0].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Draw particle
        ctx.shadowBlur = p.type === 1 ? 8 : 12;
        ctx.shadowColor = rgba(p.color.r, p.color.g, p.color.b, 0.7);
        ctx.fillStyle = rgba(p.color.r, p.color.g, p.color.b, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.type === 1 ? 0.6 : 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      this._enforceParticleLimit();
    },

    // ── Silky Wave ────────────────────────────────────────────────────
    // 6 ribbons, width varies by audio, gradient along ribbon length.
    _renderSilk: function(ctx, w, h, volume, freq, dt) {
      var ribbons = 6;
      var time = this._time;
      var colors = [
        { h: 330, s: 0.8, l: 0.7 },  // Pink
        { h: 280, s: 0.7, l: 0.65 },  // Purple
        { h: 210, s: 0.8, l: 0.7 },   // Blue
        { h: 170, s: 0.7, l: 0.65 },  // Teal
        { h: 300, s: 0.75, l: 0.68 }, // Magenta
        { h: 240, s: 0.7, l: 0.6 }    // Indigo
      ];

      for (var i = 0; i < ribbons; i++) {
        var col = colors[i % colors.length];
        var bandVol = freq ? this._getBandVolume(freq, i / ribbons, (i + 1) / ribbons) : volume;
        var amplitude = 50 + bandVol * 120;
        var baseY = h * 0.2 + (i / ribbons) * h * 0.6;
        var lineW = 8 + bandVol * 25 + i * 3;
        var phaseI = i * 0.7;

        // Build points for smoother curves
        var pts = [];
        var step = w / 30;
        for (var px = 0; px <= w; px += step) {
          var y = baseY +
            Math.sin(px * 0.008 + time * 1.8 + phaseI) * amplitude * 0.5 +
            Math.sin(px * 0.015 + time * 1.2 + phaseI + 2) * amplitude * 0.3 +
            noise1D(px * 0.01 + time * 0.5 + i * 50) * amplitude * 0.2;
          pts.push({ x: px, y: y });
        }

        // Draw ribbon with gradient along length
        var grad = ctx.createLinearGradient(0, 0, w, 0);
        var alpha = 0.25 + volume * 0.25;
        var hShift = Math.sin(time * 0.3 + i) * 15;
        grad.addColorStop(0, hslToRgba((col.h + hShift) / 360, col.s, col.l, alpha));
        grad.addColorStop(0.3, hslToRgba((col.h + hShift) / 360, col.s, col.l + 0.15, alpha * 1.3));
        grad.addColorStop(0.5, hslToRgba((col.h + hShift + 10) / 360, col.s, col.l + 0.2, alpha * 1.5));
        grad.addColorStop(0.7, hslToRgba((col.h + hShift) / 360, col.s, col.l + 0.15, alpha * 1.3));
        grad.addColorStop(1, hslToRgba((col.h + hShift) / 360, col.s, col.l, alpha));

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        // Quadratic bezier through midpoints for smoothness
        for (var j = 0; j < pts.length - 1; j++) {
          var cp = pts[j];
          var np = pts[j + 1];
          var mx = (cp.x + np.x) / 2;
          var my = (cp.y + np.y) / 2;
          ctx.quadraticCurveTo(cp.x, cp.y, mx, my);
        }
        var last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);

        ctx.strokeStyle = grad;
        ctx.lineWidth = lineW;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 20 + bandVol * 15;
        ctx.shadowColor = hslToRgba(col.h / 360, col.s, col.l, 0.5);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    },

    // ── Electric Pulse (Lightning) ────────────────────────────────────
    // Branching bolts from top to bottom, layered glow, anchor points.
    _renderPulse: function(ctx, w, h, volume, freq, dt) {
      var boltCount = 1 + Math.floor(volume * 2);
      var time = this._time;
      var colors = [
        { r: 0, g: 255, b: 100 },
        { r: 200, g: 255, b: 100 },
        { r: 100, g: 255, b: 150 }
      ];

      for (var b = 0; b < boltCount; b++) {
        var color = colors[b % colors.length];
        // Anchor top 10%, bottom 10%
        var startX = w * 0.2 + Math.random() * w * 0.6;
        var startY = h * 0.02 + Math.random() * h * 0.08;
        var endX = w * 0.2 + Math.random() * w * 0.6;
        var endY = h * 0.9 + Math.random() * h * 0.08;

        // Generate main bolt segments
        var mainBolt = this._generateBolt(startX, startY, endX, endY, 8 + Math.floor(volume * 6), w * 0.12);

        // Draw glow layer (thicker, lower alpha)
        ctx.shadowBlur = 40 + volume * 30;
        ctx.shadowColor = rgba(color.r, color.g, color.b, 0.6);
        ctx.strokeStyle = rgba(color.r, color.g, color.b, 0.15 + volume * 0.1);
        ctx.lineWidth = 8 + volume * 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._drawBoltPath(ctx, mainBolt);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw mid glow layer
        ctx.shadowBlur = 15 + volume * 10;
        ctx.shadowColor = rgba(color.r, color.g, color.b, 0.8);
        ctx.strokeStyle = rgba(color.r, color.g, color.b, 0.3 + volume * 0.2);
        ctx.lineWidth = 3 + volume * 2;
        this._drawBoltPath(ctx, mainBolt);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw main bolt (bright core)
        ctx.strokeStyle = rgba(
          Math.min(255, color.r + 100),
          Math.min(255, color.g + 50),
          Math.min(255, color.b + 100),
          0.8 + volume * 0.2
        );
        ctx.lineWidth = 1.5;
        this._drawBoltPath(ctx, mainBolt);
        ctx.stroke();

        // Branches (2-3 per bolt)
        var branchCount = 2 + Math.floor(Math.random() * 2);
        for (var br = 0; br < branchCount; br++) {
          var branchIdx = 2 + Math.floor(Math.random() * (mainBolt.length - 4));
          var branchStart = mainBolt[branchIdx];
          var branchEndX = branchStart.x + (Math.random() - 0.5) * w * 0.3;
          var branchEndY = branchStart.y + h * 0.15 + Math.random() * h * 0.2;
          branchEndX = Math.max(0, Math.min(w, branchEndX));
          branchEndY = Math.min(h, branchEndY);
          var branch = this._generateBolt(branchStart.x, branchStart.y, branchEndX, branchEndY, 4, w * 0.06);

          // Branch glow
          ctx.shadowBlur = 12;
          ctx.shadowColor = rgba(color.r, color.g, color.b, 0.5);
          ctx.strokeStyle = rgba(color.r, color.g, color.b, 0.2 + volume * 0.15);
          ctx.lineWidth = 3;
          this._drawBoltPath(ctx, branch);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Branch core
          ctx.strokeStyle = rgba(
            Math.min(255, color.r + 80),
            Math.min(255, color.g + 40),
            Math.min(255, color.b + 80),
            0.5 + volume * 0.2
          );
          ctx.lineWidth = 1;
          this._drawBoltPath(ctx, branch);
          ctx.stroke();
        }
      }

      // Ambient glow at anchor areas
      if (volume > 0.15) {
        var glowAlpha = volume * 0.15;
        var gCol = colors[0];
        var topGrad = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, h * 0.15);
        topGrad.addColorStop(0, rgba(gCol.r, gCol.g, gCol.b, glowAlpha));
        topGrad.addColorStop(1, rgba(gCol.r, gCol.g, gCol.b, 0));
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, w, h * 0.2);

        var botGrad = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.15);
        botGrad.addColorStop(0, rgba(gCol.r, gCol.g, gCol.b, glowAlpha));
        botGrad.addColorStop(1, rgba(gCol.r, gCol.g, gCol.b, 0));
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, h * 0.8, w, h * 0.2);
      }
    },

    _generateBolt: function(x1, y1, x2, y2, segments, spread) {
      var pts = [{ x: x1, y: y1 }];
      for (var i = 1; i < segments; i++) {
        var frac = i / segments;
        var mx = x1 + (x2 - x1) * frac + (Math.random() - 0.5) * spread;
        var my = y1 + (y2 - y1) * frac + (Math.random() - 0.5) * spread * 0.3;
        pts.push({ x: mx, y: my });
      }
      pts.push({ x: x2, y: y2 });
      return pts;
    },

    _drawBoltPath: function(ctx, pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    },

    // ── Neon Highway ──────────────────────────────────────────────────
    // Vanishing point perspective, particle trails, road markings.
    _renderHighway: function(ctx, w, h, volume, freq, dt) {
      var time = this._time;
      var laneCount = 4;
      var speed = 250 + volume * 400;
      // Vanishing point at top center
      var vpX = w / 2;
      var vpY = h * 0.15;
      var colors = [
        { r: 255, g: 0, b: 100 },
        { r: 0, g: 200, b: 255 },
        { r: 255, g: 200, b: 0 },
        { r: 150, g: 0, b: 255 }
      ];

      // Draw road markings (dashed center line flowing downward)
      this._roadOffset = (this._roadOffset + speed * dt * 0.5) % 40;
      ctx.setLineDash([15, 25]);
      ctx.lineDashOffset = -this._roadOffset;
      ctx.strokeStyle = rgba(80, 80, 80, 0.3 + volume * 0.2);
      ctx.lineWidth = 2;
      // Center line from vanishing point to bottom center
      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      // Side lane dividers
      for (var lane = 1; lane < laneCount; lane++) {
        var frac = lane / laneCount;
        var bottomX = frac * w;
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(bottomX, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Spawn highway particles
      if (Math.random() < 0.3 + volume * 0.3) {
        var lane = Math.floor(Math.random() * laneCount);
        var color = colors[lane % colors.length];
        var p = new Particle(
          vpX,
          vpY,
          0, 0,
          2.5,
          color,
          2 + Math.random() * 2
        );
        // Store lane and progress for perspective calculation
        p.lane = lane;
        p.progress = 0; // 0 = vanishing point, 1 = bottom
        p.speed = (0.3 + Math.random() * 0.4) * (0.8 + volume * 0.5);
        if (this._particles.length < MAX_PARTICLES) {
          this._particles.push(p);
        }
      }

      // Update and draw
      for (var i = this._particles.length - 1; i >= 0; i--) {
        var p = this._particles[i];
        p.progress += p.speed * dt;

        if (p.isDead() || p.progress > 1) {
          this._particles.splice(i, 1);
          continue;
        }

        p.life -= dt;
        p.alpha = Math.max(0, p.life / p.maxLife);

        // Perspective interpolation: exponential for depth effect
        var t = p.progress * p.progress; // Accelerate as they approach
        var laneCenter = (p.lane + 0.5) / laneCount;
        var bottomX = laneCenter * w;
        var curX = vpX + (bottomX - vpX) * t;
        var curY = vpY + (h - vpY) * t;

        // Update trail positions
        p.trail[2] = p.trail[1];
        p.trail[1] = p.trail[0];
        p.trail[0] = { x: p.x, y: p.y };
        p.x = curX;
        p.y = curY;

        // Perspective scale
        var scale = 0.3 + t * 2;
        var size = p.size * scale;

        // Draw trail
        ctx.strokeStyle = rgba(p.color.r, p.color.g, p.color.b, p.alpha * 0.4);
        ctx.lineWidth = size * 0.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.trail[2].x, p.trail[2].y);
        ctx.lineTo(p.trail[1].x, p.trail[1].y);
        ctx.lineTo(p.trail[0].x, p.trail[0].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Draw particle with glow
        ctx.shadowBlur = 12 + t * 10;
        ctx.shadowColor = rgba(p.color.r, p.color.g, p.color.b, 0.8);
        ctx.fillStyle = rgba(p.color.r, p.color.g, p.color.b, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Vanishing point glow
      if (volume > 0.1) {
        var glowR = 20 + volume * 40;
        var vpGrad = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, glowR);
        vpGrad.addColorStop(0, rgba(255, 255, 255, volume * 0.3));
        vpGrad.addColorStop(1, rgba(255, 255, 255, 0));
        ctx.fillStyle = vpGrad;
        ctx.beginPath();
        ctx.arc(vpX, vpY, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      this._enforceParticleLimit();
    },

    // ── Flame ─────────────────────────────────────────────────────────
    // Color lifecycle: yellow/white → orange → red → gray.
    // Wider base, narrower top. Ember particles that float slower.
    _renderFlame: function(ctx, w, h, volume, freq, dt) {
      var spawnRate = Math.floor(3 + volume * 8);
      var baseWidth = w * 0.25 + volume * w * 0.1;
      var cx = w / 2;

      // Spawn main flame particles
      for (var i = 0; i < spawnRate && this._particles.length < MAX_PARTICLES; i++) {
        var xOff = (Math.random() - 0.5) * baseWidth;
        // Narrowing: particles further from center get less upward velocity
        var centerDist = Math.abs(xOff) / (baseWidth / 2);
        var upSpeed = -(120 + volume * 200) * (1 - centerDist * 0.4);
        var p = new Particle(
          cx + xOff,
          h * 0.95 + Math.random() * h * 0.05,
          (Math.random() - 0.5) * 30,
          upSpeed,
          1.0 + Math.random() * 1.5,
          { r: 255, g: 255, b: 220 }, // Start white/yellow
          3 + Math.random() * 5
        );
        p.type = 0;
        this._particles.push(p);
      }

      // Spawn ember particles (tiny, slower, brighter)
      if (Math.random() < 0.3 + volume * 0.4) {
        var emberX = cx + (Math.random() - 0.5) * baseWidth * 0.6;
        var ep = new Particle(
          emberX,
          h * 0.85 + Math.random() * h * 0.1,
          (Math.random() - 0.5) * 15,
          -(40 + volume * 60),
          2.0 + Math.random() * 2.0,
          { r: 255, g: 200, b: 50 },
          1 + Math.random()
        );
        ep.type = 2; // Ember
        if (this._particles.length < MAX_PARTICLES) {
          this._particles.push(ep);
        }
      }

      // Update and draw
      for (var i = this._particles.length - 1; i >= 0; i--) {
        var p = this._particles[i];
        // Flame flicker
        p.vx += (Math.random() - 0.5) * (p.type === 2 ? 10 : 40) * dt;
        // Converge toward center as they rise (narrowing)
        var dxFromCenter = p.x - cx;
        p.vx -= dxFromCenter * 0.5 * dt;
        p.update(dt);

        if (p.isDead() || p.y < -10) {
          this._particles.splice(i, 1);
          continue;
        }

        var lifeFrac = 1 - p.alpha; // 0 = just born, 1 = about to die

        // Color lifecycle: white/yellow → orange → red → gray
        var r, g, b;
        if (p.type === 2) {
          // Embers: bright orange-yellow, pulse
          var pulse = 0.7 + 0.3 * Math.sin(this._time * 8 + i);
          r = 255; g = Math.floor(150 + 50 * pulse); b = 30;
        } else if (lifeFrac < 0.2) {
          // Birth: white/yellow
          r = 255; g = 255; b = Math.floor(220 - lifeFrac * 500);
        } else if (lifeFrac < 0.5) {
          // Mid: orange
          var t = (lifeFrac - 0.2) / 0.3;
          r = 255; g = Math.floor(200 - t * 120); b = Math.floor(50 - t * 50);
        } else if (lifeFrac < 0.8) {
          // Late: red
          var t = (lifeFrac - 0.5) / 0.3;
          r = Math.floor(255 - t * 100); g = Math.floor(80 - t * 60); b = 0;
        } else {
          // Dying: dark red/gray
          var t = (lifeFrac - 0.8) / 0.2;
          r = Math.floor(155 - t * 80); g = Math.floor(20 + t * 20); b = Math.floor(t * 20);
        }

        var size = p.size * (p.type === 2 ? (0.5 + 0.5 * p.alpha) : p.alpha);

        // Draw ember glow brighter
        if (p.type === 2) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = rgba(255, 180, 30, 0.9);
        } else {
          ctx.shadowBlur = 15 + (1 - lifeFrac) * 10;
          ctx.shadowColor = rgba(r, g, b, 0.6);
        }

        ctx.fillStyle = rgba(r, g, b, p.alpha * (p.type === 2 ? 0.9 : 1));
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Base glow
      if (volume > 0.05) {
        var baseGrad = ctx.createRadialGradient(cx, h, 0, cx, h, h * 0.35);
        baseGrad.addColorStop(0, rgba(255, 200, 50, volume * 0.25));
        baseGrad.addColorStop(0.4, rgba(255, 100, 20, volume * 0.1));
        baseGrad.addColorStop(1, rgba(255, 50, 0, 0));
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, h * 0.5, w, h * 0.5);
      }

      this._enforceParticleLimit();
    },

    // ── Starburst ─────────────────────────────────────────────────────
    // Golden ratio spiral angle, tail trails, central flash.
    _renderStarburst: function(ctx, w, h, volume, freq, dt) {
      var centerX = w / 2;
      var centerY = h / 2;
      var colors = [
        { r: 255, g: 255, b: 255 },
        { r: 255, g: 255, b: 150 },
        { r: 255, g: 220, b: 100 }
      ];

      // Decay flash
      if (this._flashAlpha > 0) {
        this._flashAlpha -= dt * 4;
        if (this._flashAlpha < 0) this._flashAlpha = 0;
      }

      // Burst cooldown
      this._burstCooldown -= dt;

      // Spawn burst using golden ratio spiral
      if (volume > 0.3 && this._burstCooldown <= 0) {
        this._burstCooldown = 0.15 + (1 - volume) * 0.2;
        var burstSize = 8 + Math.floor(volume * 16);
        var speed = 120 + volume * 250;
        for (var i = 0; i < burstSize && this._particles.length < MAX_PARTICLES; i++) {
          var angle = i * 2.399; // Golden angle in radians
          var speedVar = speed * (0.6 + Math.random() * 0.8);
          var color = colors[i % colors.length];
          var p = new Particle(
            centerX,
            centerY,
            Math.cos(angle) * speedVar,
            Math.sin(angle) * speedVar,
            0.8 + Math.random() * 1.2,
            color,
            2 + Math.random() * 3
          );
          this._particles.push(p);
        }
        // Trigger central flash
        this._flashAlpha = 0.6 + volume * 0.4;
      }

      // Update and draw particles with trails
      for (var i = this._particles.length - 1; i >= 0; i--) {
        var p = this._particles[i];
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.update(dt);

        if (p.isDead()) {
          this._particles.splice(i, 1);
          continue;
        }

        // Draw tail trail
        ctx.strokeStyle = rgba(p.color.r, p.color.g, p.color.b, p.alpha * 0.35);
        ctx.lineWidth = p.size * 0.5 * p.alpha;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.trail[2].x, p.trail[2].y);
        ctx.lineTo(p.trail[1].x, p.trail[1].y);
        ctx.lineTo(p.trail[0].x, p.trail[0].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Draw particle
        var size = p.size * p.alpha;
        ctx.shadowBlur = 10 + p.alpha * 8;
        ctx.shadowColor = rgba(p.color.r, p.color.g, p.color.b, 0.8);
        ctx.fillStyle = rgba(p.color.r, p.color.g, p.color.b, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Central flash (brief white radial gradient)
      if (this._flashAlpha > 0.01) {
        var flashR = 60 + this._flashAlpha * 80;
        var flashGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, flashR);
        flashGrad.addColorStop(0, rgba(255, 255, 255, this._flashAlpha));
        flashGrad.addColorStop(0.3, rgba(255, 255, 200, this._flashAlpha * 0.6));
        flashGrad.addColorStop(1, rgba(255, 220, 100, 0));
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, flashR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Persistent center glow
      if (volume > 0.15) {
        var glowR = 25 + volume * 40;
        var grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowR);
        grad.addColorStop(0, rgba(255, 255, 200, volume * 0.4));
        grad.addColorStop(1, rgba(255, 220, 100, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      this._enforceParticleLimit();
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(MusicalColorsVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
