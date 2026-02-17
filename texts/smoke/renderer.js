/**
 * Smoke Theme - Redesigned
 * Luminous rising vapor with swirly turbulence, god rays, and additive glow.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  function hexToRgb(hex) {
    hex = (hex || '').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.substring(0, 2), 16) || 0;
    var g = parseInt(hex.substring(2, 4), 16) || 0;
    var b = parseInt(hex.substring(4, 6), 16) || 0;
    return { r: r, g: g, b: b };
  }

  var SmokeTheme = {
    id: 'smoke',

    defaults: {
      color: '88ccff',
      bg: '050508',
      font: "'Georgia', serif",
      speed: 60,
      direction: 'left',
      scale: 1,
      density: 6,
      turbulence: 5,
      shafts: 4,
      glow: 6
    },

    _container: null,
    _config: null,
    _canvas: null,
    _ctx: null,
    _maskCanvas: null,
    _maskCtx: null,
    _glowCanvas: null,
    _glowCtx: null,
    _rafId: null,
    _paused: false,
    _text: '',
    _mode: null,
    _particles: [],
    _textPositions: [],
    _time: 0,
    _lastTime: 0,
    _flowOffset: 0,
    _flowWidth: 0,
    _resizeHandler: null,

    _resolveMode: function(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    init: function(container, text, config) {
      this._container = container;
      this._text = text;
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._time = 0;
      this._flowOffset = 0;
      this._lastTime = performance.now();

      container.classList.add('theme-smoke');
      container.style.backgroundColor = '#' + this._config.bg;

      this._canvas = document.createElement('canvas');
      this._canvas.className = 'smoke-canvas';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._maskCanvas = document.createElement('canvas');
      this._maskCtx = this._maskCanvas.getContext('2d', { willReadFrequently: true });

      this._glowCanvas = document.createElement('canvas');
      this._glowCtx = this._glowCanvas.getContext('2d');

      this._mode = this._resolveMode(text, this._config.mode);

      this._resizeCanvas();
      this._initParticles();
      this._startAnimation();

      this._resizeHandler = this._resizeCanvas.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _resizeCanvas: function() {
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      if (w === 0 || h === 0) return;
      this._canvas.width = w;
      this._canvas.height = h;
      this._maskCanvas.width = w;
      this._maskCanvas.height = h;
      this._glowCanvas.width = w;
      this._glowCanvas.height = h;
      this._prepareMask();
      this._prepareGlow();
      this._sampleText();
    },

    _prepareMask: function() {
      var w = this._maskCanvas.width;
      var h = this._maskCanvas.height;
      var font = this._config.font || this.defaults.font;
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
      var ctx = this._maskCtx;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, w, h);

      if (this._mode === 'sign') {
        var fontSize = TextEngine.autoFit(this._text, this._container, {
          fontFamily: font, fontWeight: '700', padding: w * 0.15
        });
        fontSize = Math.floor(fontSize * scale);
        ctx.font = '700 ' + fontSize + 'px ' + font;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this._text, w / 2, h / 2);
      } else {
        var flowSize = Math.floor(h * 0.5 * scale);
        ctx.font = '700 ' + flowSize + 'px ' + font;
        var tw = ctx.measureText(this._text + '   ').width;
        this._flowWidth = tw;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        var tx = 0;
        while (tx < w + tw) {
          ctx.fillText(this._text, tx, h / 2);
          tx += tw;
        }
      }
    },

    _prepareGlow: function() {
      var w = this._glowCanvas.width;
      var h = this._glowCanvas.height;
      var ctx = this._glowCtx;
      var color = hexToRgb(this._config.color);

      ctx.clearRect(0, 0, w, h);

      // Soft blurred text glow — draw text multiple times with offsets
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.06;
      var offsets = [
        [0,0], [2,0], [-2,0], [0,2], [0,-2],
        [3,3], [-3,3], [3,-3], [-3,-3],
        [5,0], [-5,0], [0,5], [0,-5]
      ];
      for (var i = 0; i < offsets.length; i++) {
        ctx.drawImage(this._maskCanvas, offsets[i][0], offsets[i][1]);
      }

      // Tint to smoke color
      ctx.globalCompositeOperation = 'source-in';
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    },

    _sampleText: function() {
      var w = this._maskCanvas.width;
      var h = this._maskCanvas.height;
      var data = this._maskCtx.getImageData(0, 0, w, h).data;
      var pos = [];
      var step = 3;
      for (var y = 0; y < h; y += step) {
        for (var x = 0; x < w; x += step) {
          if (data[(y * w + x) * 4] > 128) {
            pos.push({ x: x, y: y });
          }
        }
      }
      this._textPositions = pos;
    },

    _initParticles: function() {
      var density = Math.max(1, Math.min(15, Number(this._config.density) || this.defaults.density));
      var count = density * 300;
      this._particles = [];
      for (var i = 0; i < count; i++) {
        this._particles.push(this._createParticle(true));
      }
    },

    _createParticle: function(initialSpread) {
      var w = this._canvas.width;
      var h = this._canvas.height;
      var p = {};
      if (this._textPositions.length > 0) {
        var target = this._textPositions[Math.floor(Math.random() * this._textPositions.length)];
        p.tx = target.x;
        p.ty = target.y;
        // Spawn near text position with slight random spread
        var spread = initialSpread ? (Math.random() * 40 - 20) : (Math.random() * 12 - 6);
        p.x = target.x + spread;
        p.y = target.y + spread + (initialSpread ? 0 : -Math.random() * 8);
      } else {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.tx = p.x; p.ty = p.y;
      }
      p.vx = (Math.random() - 0.5) * 0.3;
      p.vy = -Math.random() * 0.8 - 0.1;
      p.size = Math.random() * 4 + 3;
      p.life = Math.random() * 0.6 + 0.7;
      p.maxLife = p.life;
      p.rot = Math.random() * Math.PI * 2;
      p.rotS = (Math.random() - 0.5) * 0.03;
      // Phase determines behavior: 0-60% gather on text, 60-100% rise as smoke
      p.phase = 0;
      return p;
    },

    _startAnimation: function() {
      var self = this;
      function loop(now) {
        if (!self._container) return;
        var delta = Math.min((now - self._lastTime) / 1000, 0.1);
        self._lastTime = now;
        if (!self._paused) {
          self._time += delta;
          if (self._mode === 'flow') {
            var speed = parseFloat(self._config.speed) || self.defaults.speed;
            var direction = self._config.direction === 'right' ? -1 : 1;
            self._flowOffset += speed * delta * 5 * direction;
          }
        }
        self._draw(delta);
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _draw: function(delta) {
      var ctx = this._ctx;
      var w = this._canvas.width;
      var h = this._canvas.height;
      var config = this._config;
      var color = hexToRgb(config.color);
      var turb = (Number(config.turbulence) || 5) * 0.03;
      var glow = Math.max(0.3, (Number(config.glow) || 6) * 0.15);
      var shafts = (Number(config.shafts) || 4);

      // Clear
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#' + config.bg;
      ctx.fillRect(0, 0, w, h);

      // 1. God rays
      if (shafts > 0) {
        this._drawShafts(ctx, w, h, color, shafts);
      }

      // 2. Base text glow (anchors readability)
      ctx.globalCompositeOperation = 'lighter';
      var glowPulse = 0.5 + Math.sin(this._time * 0.8) * 0.1;
      ctx.globalAlpha = glowPulse * glow;
      if (this._mode === 'flow') {
        var fw = this._flowWidth;
        if (fw > 0) {
          var ox = -(this._flowOffset % fw);
          if (ox > 0) ox -= fw;
          for (var gx = ox; gx < w; gx += fw) {
            ctx.drawImage(this._glowCanvas, gx, 0);
          }
        }
      } else {
        ctx.drawImage(this._glowCanvas, 0, 0);
      }
      ctx.globalAlpha = 1;

      // 3. Smoke particles
      ctx.globalCompositeOperation = 'lighter';
      var time = this._time;
      for (var i = 0; i < this._particles.length; i++) {
        var p = this._particles[i];
        if (!this._paused) {
          p.phase += delta * 0.5;
          p.life -= delta * 0.15;

          if (p.phase < 0.6) {
            // Gathering phase: attract toward text position
            var dx = p.tx - p.x;
            var dy = p.ty - p.y;
            p.vx += dx * 0.02;
            p.vy += dy * 0.02;
          } else {
            // Rising phase: float upward with turbulence
            p.vy -= 0.015;
          }

          // Turbulence
          var nx = Math.sin(p.y * 0.008 + time * 0.6) * turb;
          var ny = Math.cos(p.x * 0.008 + time * 0.4) * turb;
          p.vx += nx; p.vy += ny;
          p.vx *= 0.96; p.vy *= 0.96;
          p.x += p.vx; p.y += p.vy;
          p.rot += p.rotS;

          if (p.life <= 0 || p.y < -60 || p.y > h + 60) {
            this._particles[i] = this._createParticle(false);
          }
        }

        // Alpha: peaks during gather phase, fades during rise
        var lifeRatio = Math.max(0, p.life / p.maxLife);
        var phaseAlpha = p.phase < 0.6 ? 1.0 : Math.max(0, 1.0 - (p.phase - 0.6) * 1.5);
        var alpha = lifeRatio * phaseAlpha * 0.35 * glow;

        var drawX = p.x;
        if (this._mode === 'flow') {
          drawX = (p.x - this._flowOffset) % w;
          if (drawX < 0) drawX += w;
        }

        var radius = p.size * (3 + p.phase * 4);
        ctx.save();
        ctx.translate(drawX, p.y);
        ctx.rotate(p.rot);
        var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        grad.addColorStop(0, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha + ')');
        grad.addColorStop(0.4, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (alpha * 0.5) + ')');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
        ctx.restore();
      }

      ctx.globalCompositeOperation = 'source-over';
    },

    _drawShafts: function(ctx, w, h, color, level) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var count = Math.floor(level);
      for (var i = 0; i < count; i++) {
        var x = (w / (count + 1)) * (i + 1) + Math.sin(this._time * 0.2 + i) * 50;
        var alpha = 0.04 + 0.02 * Math.sin(this._time * 0.3 + i * 1.5);
        var grad = ctx.createLinearGradient(x - 100, 0, x + 100, h);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (alpha * 0.5) + ')');
        grad.addColorStop(0.5, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha + ')');
        grad.addColorStop(0.7, 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + (alpha * 0.5) + ')');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - 80, 0); ctx.lineTo(x + 80, 0);
        ctx.lineTo(x + 200, h); ctx.lineTo(x - 200, h);
        ctx.fill();
      }
      ctx.restore();
    },

    togglePause: function() {
      this._paused = !this._paused;
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this._container.classList.remove('theme-smoke');
      this._container.innerHTML = '';
      this._container = null;
      this._canvas = null;
      this._ctx = null;
      this._maskCanvas = null;
      this._glowCanvas = null;
    }
  };

  TextManager.register(SmokeTheme);

})(typeof window !== 'undefined' ? window : this);
