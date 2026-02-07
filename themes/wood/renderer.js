/**
 * Wood Theme
 * Warm wooden cafe sign with painted text and spotlight ambiance
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var WoodTheme = {
    id: 'wood',

    defaults: {
      color: 'f5e6c8',
      bg: '3b2314',
      font: '',
      speed: 60,
      direction: 'left',
      grain: 'dark',
      warm: 5
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _warmLightEl: null,
    _sheenEl: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-wood');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      var grain = config.grain || this.defaults.grain;
      var warm = Math.max(1, Math.min(10, Number(config.warm) || this.defaults.warm));

      // Map warm 1-10 to intensity and duration
      var warmIntensity = 0.05 + (warm / 10) * 0.25;
      var warmDuration = 12 - (warm / 10) * 8; // 12s at warm=1, 4s at warm=10

      container.style.setProperty('--wood-color', color);
      container.style.setProperty('--wood-warm-intensity', warmIntensity);
      container.style.setProperty('--wood-warm-duration', warmDuration + 's');
      container.style.backgroundColor = bg;

      // Build wood grain background
      var grainEl = document.createElement('div');
      grainEl.className = grain === 'light' ? 'wood-grain-light' : 'wood-grain-dark';
      if (grain !== 'light') {
        grainEl.style.backgroundColor = bg;
      }
      container.appendChild(grainEl);

      // Build ambient layers
      this._buildAmbientLayers(container);

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }
    },

    _buildAmbientLayers(container) {
      // Warm spotlight
      var warmLight = document.createElement('div');
      warmLight.className = 'wood-warm-light';
      container.appendChild(warmLight);
      this._warmLightEl = warmLight;

      // Surface sheen
      var sheen = document.createElement('div');
      sheen.className = 'wood-sheen';
      container.appendChild(sheen);
      this._sheenEl = sheen;
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'wood-sign-text';
      el.textContent = text;
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
        fontFamily: config.font || "'Caveat', 'Noto Serif SC', cursive, serif",
        fontWeight: '700',
        padding: 60
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'wood-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'wood-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(this._container.clientHeight * 0.4);
      track.querySelectorAll('.wood-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'wood-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 30));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(this._container.clientHeight * 0.4);
        track.querySelectorAll('.wood-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    togglePause() {
      this._paused = !this._paused;
      var state = this._paused ? 'paused' : 'running';

      if (this._textEl) {
        this._textEl.style.animationPlayState = state;
      }
      if (this._warmLightEl) {
        this._warmLightEl.style.animationPlayState = state;
      }
      if (this._sheenEl) {
        this._sheenEl.style.animationPlayState = state;
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
      this._warmLightEl = null;
      this._sheenEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(WoodTheme);

})(typeof window !== 'undefined' ? window : this);
