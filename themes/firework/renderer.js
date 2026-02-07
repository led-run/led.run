/**
 * Firework Theme
 * Canvas particle system with firework launch, explosion, and physics
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  // Firework color palette
  var COLORS = [
    '#FFD700', // gold
    '#FF4444', // red
    '#44AAFF', // blue
    '#44FF88', // green
    '#CC66FF', // purple
    '#00DDDD', // cyan
    '#FF66AA'  // pink
  ];

  var GRAVITY = 0.04;
  var PARTICLES_PER_EXPLOSION = 80;

  var FireworkTheme = {
    id: 'firework',

    defaults: {
      color: 'ffffff',
      bg: '050510',
      font: '',
      speed: 60,
      direction: 'left',
      rate: 5
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
    _fireworks: [],
    _particles: [],
    _lastLaunch: 0,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;
      this._fireworks = [];
      this._particles = [];
      this._lastLaunch = 0;

      container.classList.add('theme-firework');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--firework-color', color);
      container.style.setProperty('--firework-bg', bg);
      container.style.backgroundColor = bg;

      // Skyline
      this._initSkyline(container);

      // Flash Overlay
      var flash = document.createElement('div');
      flash.className = 'firework-flash';
      container.appendChild(flash);
      this._flashEl = flash;

      // Canvas
      var canvas = document.createElement('canvas');
      canvas.className = 'firework-canvas';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      // Content
      var content = document.createElement('div');
      content.className = 'firework-content';
      container.appendChild(content);
      this._contentEl = content;

      this._resizeCanvas();
      this._startAnimation();

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(content, text, config);
      } else {
        this._initSign(content, text, config);
      }

      this._resizeHandler = this._onResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _initSkyline(container) {
      // Silhouette
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'firework-skyline');
      svg.setAttribute('viewBox', '0 0 1000 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var d = 'M0,100 ';
      for (var i = 0; i <= 20; i++) {
        var x = i * 50;
        var h = 20 + Math.random() * 60;
        d += 'L' + x + ',' + (100-h) + ' L' + (x+40) + ',' + (100-h) + ' ';
      }
      d += 'L1000,100 Z';
      path.setAttribute('d', d);
      svg.appendChild(path);
      container.appendChild(svg);

      // Random window lights
      var lights = document.createElement('div');
      lights.className = 'city-lights';
      for (var i = 0; i < 100; i++) {
        var light = document.createElement('div');
        light.style.position = 'absolute';
        light.style.bottom = (Math.random() * 10) + '%';
        light.style.left = (Math.random() * 100) + '%';
        light.style.width = '2px';
        light.style.height = '2px';
        light.style.backgroundColor = Math.random() > 0.5 ? '#fff9a0' : '#ffffff';
        light.style.opacity = Math.random() * 0.5;
        lights.appendChild(light);
      }
      container.appendChild(lights);
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _resizeCanvas() {
      var canvas = this._canvas;
      canvas.width = this._container.clientWidth;
      canvas.height = this._container.clientHeight;
    },

    _startAnimation() {
      var self = this;
      var rate = Math.max(1, Math.min(10, Number(this._config.rate) || this.defaults.rate));
      // Launch interval in ms: rate 1 = 2000ms, rate 10 = 300ms
      var launchInterval = 2200 - (rate * 190);

      function update() {
        if (self._paused) {
          self._rafId = requestAnimationFrame(update);
          return;
        }

        var ctx = self._ctx;
        var canvas = self._canvas;
        var w = canvas.width;
        var h = canvas.height;

        // Fade trail effect
        ctx.fillStyle = 'rgba(2, 2, 10, 0.2)';
        ctx.fillRect(0, 0, w, h);

        var now = Date.now();

        // Launch new firework
        if (now - self._lastLaunch > launchInterval) {
          self._launchFirework(w, h);
          self._lastLaunch = now;
        }

        // Update and draw fireworks (ascending)
        for (var i = self._fireworks.length - 1; i >= 0; i--) {
          var fw = self._fireworks[i];
          fw.y += fw.vy;
          fw.vy += 0.02; // slow deceleration
          fw.trail.push({ x: fw.x, y: fw.y });
          if (fw.trail.length > 8) fw.trail.shift();

          // Draw trail
          for (var t = 0; t < fw.trail.length; t++) {
            var alpha = (t / fw.trail.length) * 0.6;
            ctx.beginPath();
            ctx.arc(fw.trail[t].x, fw.trail[t].y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 220, 180, ' + alpha + ')';
            ctx.fill();
          }

          // Explode when reaching target
          if (fw.y <= fw.targetY) {
            self._explode(fw.x, fw.y);
            self._fireworks.splice(i, 1);
          }
        }

        // Update and draw particles
        for (var i = self._particles.length - 1; i >= 0; i--) {
          var p = self._particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += GRAVITY;
          p.life -= 1 / 60; // approximate 60fps decay

          if (p.life <= 0) {
            self._particles.splice(i, 1);
            continue;
          }

          var lifeRatio = p.life / p.maxLife;
          var alpha = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1;
          var size = p.size * (0.5 + lifeRatio * 0.5);

          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fillStyle = self._colorWithAlpha(p.color, alpha);
          if (lifeRatio > 0.5) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.fill();
        }

        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        self._rafId = requestAnimationFrame(update);
      }

      this._rafId = requestAnimationFrame(update);
    },

    _launchFirework(w, h) {
      this._fireworks.push({
        x: Math.random() * w * 0.6 + w * 0.2,
        y: h,
        vy: -(Math.random() * 4 + 6),
        targetY: h * 0.15 + Math.random() * h * 0.35,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        trail: []
      });
    },

    _explode(x, y) {
      var color = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      // Screen Flash
      if (this._flashEl) {
        this._flashEl.style.backgroundColor = color;
        this._flashEl.animate([
          { opacity: 0.1 },
          { opacity: 0 }
        ], { duration: 200 });
      }

      // Text Interaction
      if (this._contentEl) {
        this._contentEl.animate([
          { transform: 'scale(1)', filter: 'brightness(1)' },
          { transform: 'scale(1.05)', filter: 'brightness(1.5) blur(1px)' },
          { transform: 'scale(1)', filter: 'brightness(1)' }
        ], { duration: 200, easing: 'ease-out' });
      }

      var particles = PARTICLES_PER_EXPLOSION;
      for (var i = 0; i < particles; i++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = Math.random() * 4 + 2;
        var life = Math.random() * 1.5 + 1;
        this._particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: life,
          maxLife: life,
          color: color,
          size: Math.random() * 3 + 1
        });
      }
    },

    _colorWithAlpha(hex, alpha) {
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    },

    _onResize() {
      this._resizeCanvas();

      if (this._mode === 'sign' && this._textEl) {
        this._fitText(this._textEl, this._textEl.textContent, this._config);
      } else if (this._mode === 'flow' && this._textEl) {
        var newSize = Math.floor(this._container.clientHeight * 0.6);
        this._textEl.querySelectorAll('.firework-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }
    },

    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'firework-sign-text';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Poppins', 'Montserrat', sans-serif",
        fontWeight: '800',
        padding: 40
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'firework-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'firework-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.6);
      track.querySelectorAll('.firework-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'firework-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 30));
      track.style.animation = animName + ' ' + duration + 's linear infinite';
    },

    togglePause() {
      this._paused = !this._paused;
      if (this._textEl) {
        if (this._mode === 'flow') {
          this._textEl.style.animationPlayState = this._paused ? 'paused' : 'running';
        } else {
          this._textEl.style.opacity = this._paused ? '0.5' : '1';
        }
      }
      return this._paused;
    },

    isPaused() {
      return this._paused;
    },

    destroy() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      if (this._animationStyle) {
        this._animationStyle.remove();
        this._animationStyle = null;
      }
      this._fireworks = [];
      this._particles = [];
      this._canvas = null;
      this._ctx = null;
      this._container = null;
      this._textEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(FireworkTheme);

})(typeof window !== 'undefined' ? window : this);
