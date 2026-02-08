/**
 * Marquee Theme
 * Broadway-style chase light bulbs border with Canvas rendering
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;
  var LIT_GROUP_SIZE = 3;

  var MarqueeTheme = {
    id: 'marquee',

    defaults: {
      color: 'ffd700',
      bg: '120800',
      font: '',
      speed: 60,
      direction: 'left',
      chase: 3,
      bulbColor: 'ffaa00',
      scale: 1,
      fill: '120800'
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _contentEl: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _bulbs: [],

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-marquee');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--marquee-color', color);
      container.style.setProperty('--marquee-bg', bg);
      container.style.backgroundColor = bg;

      // Build Theatrical UI
      this._buildTheatricalUI(container);

      // Main Content
      var content = document.createElement('div');
      content.className = 'marquee-content';
      container.appendChild(content);
      this._contentEl = content;

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(content, text, config);
      } else {
        this._initSign(content, text, config);
      }

      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      if (scale < 1) {
        var scaleWrap = document.createElement('div');
        scaleWrap.style.position = 'relative';
        scaleWrap.style.width = '100%';
        scaleWrap.style.height = '100%';
        scaleWrap.style.transform = 'scale(' + scale + ')';
        scaleWrap.style.transformOrigin = 'center center';
        var cs = window.getComputedStyle(container);
        ['display', 'flexDirection', 'alignItems', 'justifyContent', 'overflow'].forEach(function(p) {
          scaleWrap.style[p] = cs[p];
        });
        while (container.firstChild) scaleWrap.appendChild(container.firstChild);
        container.appendChild(scaleWrap);
        scaleWrap.style.backgroundColor = '#' + config.fill;
        container.style.background = 'transparent';
        if (config.bg && config.bg !== this.defaults.bg) {
          container.style.backgroundColor = '#' + config.bg;
        }
      }

      this._resizeHandler = this._onResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _buildTheatricalUI(container) {
      // Metallic Frame
      var frame = document.createElement('div');
      frame.className = 'marquee-frame';
      container.appendChild(frame);

      // Corner Stars
      ['tl', 'tr', 'bl', 'br'].forEach(function(pos) {
        var star = document.createElement('div');
        star.className = 'marquee-star star-' + pos;
        container.appendChild(star);
      });

      // Canvas for bulbs
      var canvas = document.createElement('canvas');
      canvas.className = 'marquee-canvas';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      this._resizeCanvas();
      this._calculateBulbs();
      this._startBulbAnimation();
    },

    _calculateBulbs() {
      var w = this._canvas.width;
      var h = this._canvas.height;
      var pad = 30; // Center of the 60px frame
      var spacing = 40;
      var bulbs = [];

      // Top edge
      for (var x = pad; x <= w - pad; x += spacing) bulbs.push({ x: x, y: pad });
      // Right edge
      for (var y = pad + spacing; y <= h - pad; y += spacing) bulbs.push({ x: w - pad, y: y });
      // Bottom edge
      for (var x = w - pad - spacing; x >= pad; x -= spacing) bulbs.push({ x: x, y: h - pad });
      // Left edge
      for (var y = h - pad - spacing; y >= pad + spacing; y -= spacing) bulbs.push({ x: pad, y: y });

      this._bulbs = bulbs;
    },

    _startBulbAnimation() {
      var self = this;
      var bulbColorHex = '#' + (this._config.bulbColor || this.defaults.bulbColor);
      var chaseSpeed = Math.max(1, Math.min(10, Number(this._config.chase) || this.defaults.chase));
      var chaseMs = 600 / chaseSpeed;
      var groupSpacing = LIT_GROUP_SIZE + 3;

      function draw() {
        if (self._paused) {
          self._rafId = requestAnimationFrame(draw);
          return;
        }

        var ctx = self._ctx;
        var bulbs = self._bulbs;
        if (!bulbs.length) {
          self._rafId = requestAnimationFrame(draw);
          return;
        }

        ctx.clearRect(0, 0, self._canvas.width, self._canvas.height);
        var offset = Math.floor(Date.now() / chaseMs) % groupSpacing;

        bulbs.forEach(function(bulb, i) {
          var pos = (i + offset) % groupSpacing;
          var isLit = pos < LIT_GROUP_SIZE;
          var isFlickering = Math.random() > 0.98; // Realistic imperfection

          self._drawRealisticBulb(ctx, bulb.x, bulb.y, isLit && !isFlickering, bulbColorHex);
        });

        self._rafId = requestAnimationFrame(draw);
      }

      this._rafId = requestAnimationFrame(draw);
    },

    _drawRealisticBulb(ctx, x, y, isLit, color) {
      var radius = 7;
      
      // Base/Socket
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.fill();

      if (isLit) {
        // Outer Glow
        var grad = ctx.createRadialGradient(x, y, radius, x, y, radius * 4);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius * 4, 0, Math.PI * 2);
        ctx.fill();

        // Bulb Body
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Filament highlight
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 2, y);
        ctx.lineTo(x + 2, y);
        ctx.stroke();
      } else {
        // Dim Bulb
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _resizeCanvas() {
      var canvas = this._canvas;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      canvas.width = w;
      canvas.height = h;
    },

    _onResize() {
      this._resizeCanvas();
      this._calculateBulbs();

      // Refit text
      if (this._mode === 'sign' && this._textEl) {
        this._fitText(this._textEl, this._textEl.textContent, this._config);
      } else if (this._mode === 'flow' && this._textEl) {
        var newSize = Math.floor(this._container.clientHeight * 0.4);
        this._textEl.querySelectorAll('.marquee-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }
    },

    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'marquee-sign-text';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text.toUpperCase(), this._container, {
        fontFamily: config.font || "'Playfair Display', 'Georgia', serif",
        fontWeight: '900',
        padding: 120
      });
      // Compensate for CSS letter-spacing: 0.05em (not measured by autoFit)
      el.style.fontSize = Math.floor(fontSize * 0.9) + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'marquee-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'marquee-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(this._container.clientHeight * 0.4);
      track.querySelectorAll('.marquee-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'marquee-flow-scroll';
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
      this._canvas = null;
      this._ctx = null;
      this._bulbs = [];
      this._container = null;
      this._textEl = null;
      this._contentEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(MarqueeTheme);

})(typeof window !== 'undefined' ? window : this);