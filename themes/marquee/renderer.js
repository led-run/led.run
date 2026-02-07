/**
 * Marquee Theme
 * Broadway-style chase light bulbs border with Canvas rendering
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;
  var BULB_SPACING = 35;
  var BULB_RADIUS = 5;
  var BULB_PADDING = 30;
  var LIT_GROUP_SIZE = 3;

  var MarqueeTheme = {
    id: 'marquee',

    defaults: {
      color: 'ffd700',
      bg: '1a0a00',
      font: '',
      speed: 60,
      direction: 'left',
      chase: 3,
      bulbColor: 'ffaa00'
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

      // Create canvas for bulbs
      var canvas = document.createElement('canvas');
      canvas.className = 'marquee-canvas';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      // Calculate bulb positions
      this._resizeCanvas();
      this._calculateBulbs();

      // Start bulb animation
      this._startBulbAnimation();

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }

      this._resizeHandler = this._onResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
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

    _calculateBulbs() {
      var w = this._canvas.width;
      var h = this._canvas.height;
      var pad = BULB_PADDING;
      var spacing = BULB_SPACING;
      var bulbs = [];

      // Top edge (left to right)
      for (var x = pad; x <= w - pad; x += spacing) {
        bulbs.push({ x: x, y: pad });
      }
      // Right edge (top to bottom)
      for (var y = pad + spacing; y <= h - pad; y += spacing) {
        bulbs.push({ x: w - pad, y: y });
      }
      // Bottom edge (right to left)
      for (var x = w - pad - spacing; x >= pad; x -= spacing) {
        bulbs.push({ x: x, y: h - pad });
      }
      // Left edge (bottom to top)
      for (var y = h - pad - spacing; y >= pad + spacing; y -= spacing) {
        bulbs.push({ x: pad, y: y });
      }

      this._bulbs = bulbs;
    },

    _startBulbAnimation() {
      var self = this;
      var config = this._config;
      var chaseSpeed = Math.max(1, Math.min(10, Number(config.chase) || this.defaults.chase));
      var bulbColorHex = '#' + (config.bulbColor || this.defaults.bulbColor);

      // Parse bulb color for dim version
      var r = parseInt(bulbColorHex.slice(1, 3), 16);
      var g = parseInt(bulbColorHex.slice(3, 5), 16);
      var b = parseInt(bulbColorHex.slice(5, 7), 16);
      var dimColor = 'rgba(' + Math.floor(r * 0.25) + ',' + Math.floor(g * 0.25) + ',' + Math.floor(b * 0.25) + ',0.6)';

      // Chase timing: ms per step
      var chaseMs = 600 / chaseSpeed;
      var totalBulbs = 0;
      var groupSpacing = LIT_GROUP_SIZE + 3; // lit bulbs + gap

      function draw() {
        if (self._paused) {
          self._rafId = requestAnimationFrame(draw);
          return;
        }

        var ctx = self._ctx;
        var bulbs = self._bulbs;
        totalBulbs = bulbs.length;

        if (totalBulbs === 0) {
          self._rafId = requestAnimationFrame(draw);
          return;
        }

        var w = self._canvas.width;
        var h = self._canvas.height;
        ctx.clearRect(0, 0, w, h);

        var offset = Math.floor(Date.now() / chaseMs) % groupSpacing;

        for (var i = 0; i < totalBulbs; i++) {
          var bulb = bulbs[i];
          var pos = (i + offset) % groupSpacing;
          var isLit = pos < LIT_GROUP_SIZE;

          ctx.beginPath();
          ctx.arc(bulb.x, bulb.y, BULB_RADIUS, 0, Math.PI * 2);

          if (isLit) {
            ctx.fillStyle = bulbColorHex;
            ctx.shadowColor = bulbColorHex;
            ctx.shadowBlur = 15;
          } else {
            ctx.fillStyle = dimColor;
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }
          ctx.fill();
        }

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        self._rafId = requestAnimationFrame(draw);
      }

      this._rafId = requestAnimationFrame(draw);
    },

    _onResize() {
      this._resizeCanvas();
      this._calculateBulbs();

      // Refit text
      if (this._mode === 'sign' && this._textEl) {
        this._fitText(this._textEl, this._textEl.textContent, this._config);
      } else if (this._mode === 'flow' && this._textEl) {
        var newSize = Math.floor(this._container.clientHeight * 0.6);
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
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Playfair Display', 'Georgia', serif",
        fontWeight: '900',
        padding: 70
      });
      el.style.fontSize = fontSize + 'px';
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

      var flowSize = Math.floor(container.clientHeight * 0.6);
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
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(MarqueeTheme);

})(typeof window !== 'undefined' ? window : this);
