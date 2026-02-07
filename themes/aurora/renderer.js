/**
 * Aurora Theme
 * Northern lights wave bands rendered via Canvas with organic motion
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  // Aurora band presets
  function generateBands(intensity) {
    var count = Math.max(2, Math.min(5, Math.round(intensity / 2)));
    var baseBands = [
      { hue: 140, sat: 80, light: 55, amplitude: 50, frequency: 0.003, speed: 0.0008, baseY: 0.35, opacity: 0.3, height: 120 },
      { hue: 280, sat: 70, light: 50, amplitude: 40, frequency: 0.004, speed: 0.0012, baseY: 0.45, opacity: 0.25, height: 100 },
      { hue: 200, sat: 75, light: 55, amplitude: 60, frequency: 0.0025, speed: 0.001, baseY: 0.55, opacity: 0.2, height: 140 },
      { hue: 160, sat: 85, light: 50, amplitude: 35, frequency: 0.0035, speed: 0.0015, baseY: 0.4, opacity: 0.15, height: 90 },
      { hue: 240, sat: 65, light: 60, amplitude: 45, frequency: 0.002, speed: 0.0006, baseY: 0.5, opacity: 0.2, height: 110 }
    ];
    var bands = baseBands.slice(0, count);
    // Scale opacity by intensity
    var opacityScale = intensity / 5;
    for (var i = 0; i < bands.length; i++) {
      bands[i].opacity *= opacityScale;
    }
    return bands;
  }

  var AuroraTheme = {
    id: 'aurora',

    defaults: {
      color: 'e0ffef',
      bg: '020810',
      font: '',
      speed: 60,
      direction: 'left',
      intensity: 5
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
    _bands: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-aurora');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--aurora-color', color);
      container.style.setProperty('--aurora-bg', bg);
      container.style.backgroundColor = bg;

      // Starfield
      this._initStars(container);

      // Aurora Canvas
      var canvas = document.createElement('canvas');
      canvas.className = 'aurora-canvas';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      // Mountains
      this._initMountains(container);

      // Content
      var content = document.createElement('div');
      content.className = 'aurora-content';
      container.appendChild(content);
      this._contentEl = content;

      var intensity = Math.max(1, Math.min(10, Number(config.intensity) || this.defaults.intensity));
      this._bands = generateBands(intensity);

      this._resizeCanvas();
      this._startAuroraAnimation();

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(content, text, config);
      } else {
        this._initSign(content, text, config);
      }

      this._resizeHandler = this._onResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _initStars(container) {
      var stars = document.createElement('div');
      stars.className = 'aurora-stars';
      for (var i = 0; i < 200; i++) {
        var star = document.createElement('div');
        var size = Math.random() * 2;
        star.style.position = 'absolute';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.backgroundColor = '#fff';
        star.style.borderRadius = '50%';
        star.style.opacity = Math.random();
        if (Math.random() > 0.8) {
          star.animate([{ opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }], {
            duration: Math.random() * 3000 + 2000,
            iterations: Infinity
          });
        }
        stars.appendChild(star);
      }
      container.appendChild(stars);
    },

    _initMountains(container) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'aurora-mountains');
      svg.setAttribute('viewBox', '0 0 1000 200');
      svg.setAttribute('preserveAspectRatio', 'none');
      
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var d = 'M0,200 L0,150 ';
      for (var i = 0; i <= 10; i++) {
        var x = i * 100;
        var y = 100 + Math.random() * 80;
        d += 'L' + x + ',' + y + ' ';
      }
      d += 'L1000,150 L1000,200 Z';
      path.setAttribute('d', d);
      svg.appendChild(path);
      container.appendChild(svg);
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
      // Half resolution for performance
      canvas.width = Math.floor(w * 0.5);
      canvas.height = Math.floor(h * 0.5);
    },

    _startAuroraAnimation() {
      var self = this;

      function draw() {
        if (self._paused) {
          self._rafId = requestAnimationFrame(draw);
          return;
        }

        var ctx = self._ctx;
        var canvas = self._canvas;
        var w = canvas.width;
        var h = canvas.height;
        var bands = self._bands;
        var time = Date.now();

        // Clear with background
        ctx.clearRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'screen';

        for (var b = 0; b < bands.length; b++) {
          var band = bands[b];
          var baseY = band.baseY * h;

          // Draw vertical gradient strips across the width
          var step = 3; // pixel step for performance
          for (var x = 0; x < w; x += step) {
            var y = baseY
              + Math.sin(x * band.frequency + time * band.speed) * band.amplitude
              + Math.sin(x * band.frequency * 0.7 + time * band.speed * 1.3) * band.amplitude * 0.5;

            var grad = ctx.createLinearGradient(x, y - band.height * 0.3, x, y + band.height * 0.7);
            grad.addColorStop(0, 'hsla(' + band.hue + ', ' + band.sat + '%, ' + band.light + '%, 0)');
            grad.addColorStop(0.3, 'hsla(' + band.hue + ', ' + band.sat + '%, ' + band.light + '%, ' + band.opacity + ')');
            grad.addColorStop(0.7, 'hsla(' + band.hue + ', ' + band.sat + '%, ' + band.light + '%, ' + (band.opacity * 0.5) + ')');
            grad.addColorStop(1, 'hsla(' + band.hue + ', ' + band.sat + '%, ' + band.light + '%, 0)');

            ctx.fillStyle = grad;
            ctx.fillRect(x, y - band.height * 0.3, step, band.height);
          }
        }

        ctx.globalCompositeOperation = 'source-over';

        self._rafId = requestAnimationFrame(draw);
      }

      this._rafId = requestAnimationFrame(draw);
    },

    _onResize() {
      this._resizeCanvas();

      if (this._mode === 'sign' && this._textEl) {
        this._fitText(this._textEl, this._textEl.textContent, this._config);
      } else if (this._mode === 'flow' && this._textEl) {
        var newSize = Math.floor(this._container.clientHeight * 0.6);
        this._textEl.querySelectorAll('.aurora-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }
    },

    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'aurora-sign-text';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Raleway', 'Helvetica Neue', sans-serif",
        fontWeight: '600',
        padding: 40
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'aurora-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'aurora-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.6);
      track.querySelectorAll('.aurora-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'aurora-flow-scroll';
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
      this._bands = null;
      this._container = null;
      this._textEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(AuroraTheme);

})(typeof window !== 'undefined' ? window : this);
