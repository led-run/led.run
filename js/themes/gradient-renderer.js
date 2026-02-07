/**
 * Gradient Theme
 * Rainbow gradient text with flowing animation
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  // Default rainbow gradient
  var RAINBOW = 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff, #ff0000)';

  /**
   * Parse hex color to HSL and generate a gradient with hue shifts
   * @param {string} hex - 6-digit hex color (no #)
   * @returns {string} CSS linear-gradient
   */
  function generateColorGradient(hex) {
    var r = parseInt(hex.substring(0, 2), 16) / 255;
    var g = parseInt(hex.substring(2, 4), 16) / 255;
    var b = parseInt(hex.substring(4, 6), 16) / 255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max === min) {
      h = 0; s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }

    var hDeg = Math.round(h * 360);
    var sPct = Math.round(s * 100);
    var lPct = Math.round(l * 100);

    // Generate gradient with hue offsets: -30, -15, 0, +15, +30, back to -30
    var offsets = [-30, -15, 0, 15, 30, -30];
    var stops = offsets.map(function(offset) {
      return 'hsl(' + ((hDeg + offset + 360) % 360) + ', ' + sPct + '%, ' + lPct + '%)';
    });

    return 'linear-gradient(90deg, ' + stops.join(', ') + ')';
  }

  var GradientTheme = {
    id: 'gradient',

    defaults: {
      color: 'ff0000',
      bg: '0a0a0a',
      font: '',
      speed: 60,
      direction: 'left'
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-gradient');

      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--gradient-bg', bg);
      container.style.backgroundColor = bg;

      // Determine gradient: custom color → color-based gradient, default → rainbow
      var userColor = config.color;
      this._gradient = userColor ? generateColorGradient(userColor) : RAINBOW;

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'gradient-sign-text';
      el.textContent = text;
      el.style.backgroundImage = this._gradient;
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Arial Black', 'Impact', sans-serif",
        fontWeight: 'bold',
        padding: 30
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'gradient-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'gradient-flow-text';
        span.textContent = text;
        span.style.backgroundImage = this._gradient;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.6);
      track.querySelectorAll('.gradient-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'gradient-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 30));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(container.clientHeight * 0.6);
        track.querySelectorAll('.gradient-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    togglePause() {
      this._paused = !this._paused;
      if (this._textEl) {
        if (this._mode === 'flow') {
          this._textEl.style.animationPlayState = this._paused ? 'paused' : 'running';
        } else {
          this._textEl.style.animationPlayState = this._paused ? 'paused' : 'running';
        }
      }
      return this._paused;
    },

    isPaused() {
      return this._paused;
    },

    destroy() {
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      if (this._animationStyle) {
        this._animationStyle.remove();
        this._animationStyle = null;
      }
      this._container = null;
      this._textEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
      this._gradient = null;
    }
  };

  ThemeManager.register(GradientTheme);

})(typeof window !== 'undefined' ? window : this);
