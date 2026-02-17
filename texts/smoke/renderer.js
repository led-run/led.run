/**
 * Smoke Theme
 * Text formed by rising smoke/vapor particles rendered via Canvas
 * Uses offscreen canvas text mask with particle system clustering
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  // Simple seeded noise for turbulence
  function noise(x, y, t) {
    var n = Math.sin(x * 12.9898 + y * 78.233 + t * 43.758) * 43758.5453;
    return n - Math.floor(n);
  }

  // Parse hex color to RGB
  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var SmokeTheme = {
    id: 'smoke',

    defaults: {
      color: 'cccccc',
      bg: '0a0a0a',
      font: '',
      speed: 60,
      direction: 'left',
      scale: 1,
      density: 5,
      wind: 3,
      turbulence: 5
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _maskCanvas: null,
    _maskCtx: null,
    _particles: null,
    _textPositions: null,
    _fogParticles: null,
    _flowOffset: 0,
    _flowSpeed: 0,
    _flowDirection: 1,
    _text: '',
    _time: 0,
    _lastTime: 0,

    init: function(container, text, config) {
      this._container = container;
      this._config = config;
      this._text = text;
      this._paused = false;
      this._particles = [];
      this._textPositions = [];
      this._fogParticles = [];
      this._flowOffset = 0;
      this._time = 0;
      this._lastTime = performance.now();

      container.classList.add('theme-smoke');

      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.backgroundColor = bg;

      // Main canvas
      var canvas = document.createElement('canvas');
      canvas.className = 'smoke-canvas';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      // Offscreen mask canvas
      this._maskCanvas = document.createElement('canvas');
      this._maskCtx = this._maskCanvas.getContext('2d');

      this._mode = this._resolveMode(text, config.mode);

      this._resizeCanvas();
      this._buildTextMask();
      this._sampleTextPositions();
      this._initParticles();
      this._initFogParticles();

      if (this._mode === 'flow') {
        var speed = config.speed || this.defaults.speed;
        var direction = config.direction || this.defaults.direction;
        this._flowDirection = direction === 'right' ? 1 : -1;
        this._flowSpeed = speed / 30;
      }

      this._startAnimation();

      this._resizeHandler = this._onResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _resolveMode: function(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _resizeCanvas: function() {
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      this._canvas.width = w;
      this._canvas.height = h;
      this._maskCanvas.width = w;
      this._maskCanvas.height = h;
    },

    _buildTextMask: function() {
      var ctx = this._maskCtx;
      var w = this._maskCanvas.width;
      var h = this._maskCanvas.height;
      var config = this._config;
      var text = this._text;
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      var fontFamily = config.font || "'Georgia', 'Times New Roman', serif";
      var fontWeight = '700';

      if (this._mode === 'sign') {
        var fontSize = TextEngine.autoFit(text, this._container, {
          fontFamily: fontFamily,
          fontWeight: fontWeight,
          padding: 40
        });
        fontSize = Math.floor(fontSize * scale);

        ctx.font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);
      } else {
        // Flow mode: render text wider for scrolling
        var flowSize = Math.floor(h * 0.6 * scale);
        ctx.font = fontWeight + ' ' + flowSize + 'px ' + fontFamily;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        var textWidth = ctx.measureText(text + '   ').width;
        // Tile text across the mask for seamless scrolling
        var x = 0;
        while (x < w + textWidth) {
          ctx.fillText(text, x, h / 2);
          x += textWidth;
        }
        this._flowTextWidth = textWidth;
      }
    },

    _sampleTextPositions: function() {
      var ctx = this._maskCtx;
      var w = this._maskCanvas.width;
      var h = this._maskCanvas.height;
      var imageData = ctx.getImageData(0, 0, w, h);
      var data = imageData.data;
      var positions = [];

      // Sample every N pixels for performance
      var step = 3;
      for (var y = 0; y < h; y += step) {
        for (var x = 0; x < w; x += step) {
          var idx = (y * w + x) * 4;
          // White pixels are text
          if (data[idx] > 128) {
            positions.push({ x: x, y: y });
          }
        }
      }

      this._textPositions = positions;
    },

    _initParticles: function() {
      var density = Math.max(1, Math.min(10, Number(this._config.density) || this.defaults.density));
      var count = density * 200;
      var w = this._canvas.width;
      var h = this._canvas.height;
      var positions = this._textPositions;
      var particles = [];

      for (var i = 0; i < count; i++) {
        var p = {};
        if (positions.length > 0) {
          // Assign a target from text positions
          var target = positions[Math.floor(Math.random() * positions.length)];
          p.targetX = target.x;
          p.targetY = target.y;
        } else {
          p.targetX = Math.random() * w;
          p.targetY = Math.random() * h;
        }
        // Start scattered
        p.x = p.targetX + (Math.random() - 0.5) * 100;
        p.y = p.targetY + (Math.random() - 0.5) * 100;
        p.size = Math.random() * 3 + 1.5;
        p.opacity = Math.random() * 0.4 + 0.3;
        p.vx = 0;
        p.vy = 0;
        p.life = Math.random() * 200 + 100;
        p.maxLife = p.life;
        p.phase = Math.random() * Math.PI * 2;
        p.driftSpeed = Math.random() * 0.5 + 0.2;
        particles.push(p);
      }

      this._particles = particles;
    },

    _initFogParticles: function() {
      var w = this._canvas.width;
      var h = this._canvas.height;
      var fog = [];
      var count = 30;

      for (var i = 0; i < count; i++) {
        fog.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 150 + 80,
          opacity: Math.random() * 0.04 + 0.01,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(Math.random() * 0.2 + 0.05),
          phase: Math.random() * Math.PI * 2
        });
      }

      this._fogParticles = fog;
    },

    _startAnimation: function() {
      var self = this;

      function update(timestamp) {
        if (!self._container) return;

        var dt = Math.min((timestamp - self._lastTime) / 16.667, 3); // Normalize to ~60fps, cap at 3x
        self._lastTime = timestamp;

        if (!self._paused) {
          self._time += dt * 0.02;
          self._updateAndDraw(dt);
        }

        self._rafId = requestAnimationFrame(update);
      }

      self._lastTime = performance.now();
      self._rafId = requestAnimationFrame(update);
    },

    _updateAndDraw: function(dt) {
      var ctx = this._ctx;
      var w = this._canvas.width;
      var h = this._canvas.height;
      var config = this._config;
      var time = this._time;
      var colorHex = config.color || this.defaults.color;
      var bgHex = config.bg || this.defaults.bg;
      var rgb = hexToRgb(colorHex);
      var bgRgb = hexToRgb(bgHex);

      var wind = Math.max(0, Math.min(10, Number(config.wind) || this.defaults.wind));
      var turbulence = Math.max(0, Math.min(10, Number(config.turbulence) || this.defaults.turbulence));
      var windForce = (wind - 5) * 0.08; // Centered wind: 0 = left, 5 = none, 10 = right
      var turbFactor = turbulence * 0.15;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgRgb.r + ',' + bgRgb.g + ',' + bgRgb.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Draw fog layer
      this._drawFog(ctx, w, h, rgb, windForce, dt);

      // Update flow offset
      if (this._mode === 'flow' && this._flowTextWidth) {
        this._flowOffset += this._flowSpeed * this._flowDirection * dt;
        // Wrap offset
        if (Math.abs(this._flowOffset) > this._flowTextWidth) {
          this._flowOffset = this._flowOffset % this._flowTextWidth;
        }
      }

      // Update and draw particles
      var particles = this._particles;
      var positions = this._textPositions;
      var flowOff = this._flowOffset;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        // Calculate effective target with flow offset
        var tx = p.targetX;
        if (this._mode === 'flow') {
          tx = p.targetX - flowOff;
          // Wrap target position
          if (this._flowTextWidth) {
            tx = ((tx % w) + w) % w;
          }
        }
        var ty = p.targetY;

        // Attraction to text position
        var dx = tx - p.x;
        var dy = ty - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var attraction = 0.02;

        if (dist > 1) {
          p.vx += (dx / dist) * attraction * dt;
          p.vy += (dy / dist) * attraction * dt;
        }

        // Turbulence
        var nx = noise(p.x * 0.005, p.y * 0.005, time);
        var ny = noise(p.x * 0.005 + 100, p.y * 0.005 + 100, time);
        p.vx += (nx - 0.5) * turbFactor * dt;
        p.vy += (ny - 0.5) * turbFactor * dt;

        // Upward drift (smoke rises)
        p.vy -= 0.01 * dt;

        // Wind
        p.vx += windForce * dt;

        // Organic oscillation
        p.vx += Math.sin(time * 3 + p.phase) * 0.02 * dt;
        p.vy += Math.cos(time * 2.5 + p.phase) * 0.015 * dt;

        // Damping
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Apply velocity
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Life cycle
        p.life -= dt * 0.3;
        if (p.life <= 0) {
          // Respawn at a text position
          if (positions.length > 0) {
            var newTarget = positions[Math.floor(Math.random() * positions.length)];
            p.targetX = newTarget.x;
            p.targetY = newTarget.y;
            var spawnTx = this._mode === 'flow' ? p.targetX - flowOff : p.targetX;
            if (this._mode === 'flow' && this._flowTextWidth) {
              spawnTx = ((spawnTx % w) + w) % w;
            }
            p.x = spawnTx + (Math.random() - 0.5) * 60;
            p.y = p.targetY + (Math.random() - 0.5) * 60 - 20;
          } else {
            p.x = Math.random() * w;
            p.y = Math.random() * h;
          }
          p.life = Math.random() * 200 + 100;
          p.maxLife = p.life;
          p.vx = 0;
          p.vy = 0;
          p.phase = Math.random() * Math.PI * 2;
          p.size = Math.random() * 3 + 1.5;
          p.opacity = Math.random() * 0.4 + 0.3;
        }

        // Wrap horizontally
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        // Soft vertical bounds
        if (p.y < -50) p.y = h + 20;
        if (p.y > h + 50) p.y = 0;

        // Calculate draw opacity based on life
        var lifeRatio = p.life / p.maxLife;
        var fadeIn = lifeRatio > 0.9 ? (1 - lifeRatio) * 10 : 1;
        var fadeOut = lifeRatio < 0.2 ? lifeRatio * 5 : 1;
        var alpha = p.opacity * fadeIn * fadeOut;

        // Distance from target affects opacity (closer = more opaque)
        var distFade = Math.max(0, 1 - dist / 80);
        alpha *= (0.4 + distFade * 0.6);

        if (alpha < 0.01) continue;

        // Draw smoke particle with soft glow
        ctx.beginPath();
        var gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')');
        gradient.addColorStop(0.5, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (alpha * 0.4) + ')');
        gradient.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
      }
    },

    _drawFog: function(ctx, w, h, rgb, windForce, dt) {
      var fog = this._fogParticles;
      var time = this._time;

      for (var i = 0; i < fog.length; i++) {
        var f = fog[i];

        f.x += (f.vx + windForce * 0.3) * dt;
        f.y += f.vy * dt;

        // Wrap
        if (f.x < -f.size) f.x = w + f.size;
        if (f.x > w + f.size) f.x = -f.size;
        if (f.y < -f.size) {
          f.y = h + f.size;
          f.x = Math.random() * w;
        }

        // Pulsing opacity
        var pulse = Math.sin(time * 2 + f.phase) * 0.5 + 0.5;
        var alpha = f.opacity * (0.6 + pulse * 0.4);

        ctx.beginPath();
        var gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        gradient.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')');
        gradient.addColorStop(0.5, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (alpha * 0.3) + ')');
        gradient.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(f.x - f.size, f.y - f.size, f.size * 2, f.size * 2);
      }
    },

    _onResize: function() {
      this._resizeCanvas();
      this._buildTextMask();
      this._sampleTextPositions();

      // Reassign targets to new positions
      var positions = this._textPositions;
      var particles = this._particles;
      for (var i = 0; i < particles.length; i++) {
        if (positions.length > 0) {
          var target = positions[Math.floor(Math.random() * positions.length)];
          particles[i].targetX = target.x;
          particles[i].targetY = target.y;
        }
      }

      // Reinit fog for new dimensions
      this._initFogParticles();
    },

    togglePause: function() {
      this._paused = !this._paused;
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      this._particles = [];
      this._textPositions = [];
      this._fogParticles = [];
      this._canvas = null;
      this._ctx = null;
      this._maskCanvas = null;
      this._maskCtx = null;
      this._container = null;
      this._textEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
      this._text = '';
      this._flowOffset = 0;
    }
  };

  TextManager.register(SmokeTheme);

})(typeof window !== 'undefined' ? window : this);
