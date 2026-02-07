/**
 * Pulse Theme
 * Breathing mood ambient with radial glow and palette-driven hue rotation
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  // Palette definitions: hue-rotate range in degrees
  var PALETTES = {
    warm: 60,      // pink → orange → coral → pink
    cool: 90,      // blue → indigo → purple → blue
    rainbow: 360   // full spectrum
  };

  var PulseTheme = {
    id: 'pulse',

    defaults: {
      color: 'ff6b9d',
      bg: '0a0015',
      font: '',
      speed: 60,
      direction: 'left',
      rhythm: 4,
      palette: 'warm'
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _glowEl: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-pulse');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      var rhythm = Math.max(2, Math.min(10, Number(config.rhythm) || this.defaults.rhythm));
      var palette = config.palette || this.defaults.palette;
      var hueRange = PALETTES[palette] !== undefined ? PALETTES[palette] : PALETTES.warm;

      container.style.setProperty('--pulse-color', color);
      container.style.setProperty('--pulse-bg', bg);
      container.style.setProperty('--pulse-rhythm', rhythm + 's');
      container.style.setProperty('--pulse-hue-range', hueRange + 'deg');
      container.style.setProperty('--pulse-hue-duration', (rhythm * 3) + 's');
      container.style.backgroundColor = bg;

      // Background hue layer
      var bgLayer = document.createElement('div');
      bgLayer.className = 'pulse-bg-layer';
      container.appendChild(bgLayer);

      // Glow layer
      var glow = document.createElement('div');
      glow.className = 'pulse-glow';
      container.appendChild(glow);
      this._glowEl = glow;

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
      el.className = 'pulse-sign-text';
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
        fontFamily: config.font || "'Quicksand', 'Varela Round', sans-serif",
        fontWeight: '700',
        padding: 40
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'pulse-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'pulse-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.6);
      track.querySelectorAll('.pulse-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'pulse-flow-scroll';
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
        track.querySelectorAll('.pulse-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    togglePause() {
      this._paused = !this._paused;
      var state = this._paused ? 'paused' : 'running';

      if (this._textEl) {
        if (this._mode === 'flow') {
          this._textEl.style.animationPlayState = state;
        } else {
          this._textEl.style.animationPlayState = state;
        }
      }
      if (this._glowEl) {
        this._glowEl.style.animationPlayState = state;
      }
      // Pause bg layer too
      var bgLayer = this._container && this._container.querySelector('.pulse-bg-layer');
      if (bgLayer) {
        bgLayer.style.animationPlayState = state;
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
      this._glowEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(PulseTheme);

})(typeof window !== 'undefined' ? window : this);
