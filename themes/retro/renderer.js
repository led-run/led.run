/**
 * Retro CRT Theme
 * CRT monitor effect with scanlines and screen curvature
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var RetroTheme = {
    id: 'retro',

    defaults: {
      color: '33ff33',
      bg: '0d0d0d',
      font: '',
      speed: 60,
      direction: 'left',
      scanlines: true,
      scale: 1
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _scanlinesEl: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-retro');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--retro-color', color);
      container.style.setProperty('--retro-bg', bg);
      container.style.backgroundColor = bg;

      // Add scanlines overlay
      var scanlines = config.scanlines !== undefined ? config.scanlines : this.defaults.scanlines;
      if (scanlines !== false) {
        var overlay = document.createElement('div');
        overlay.className = 'retro-scanlines';
        container.appendChild(overlay);
        this._scanlinesEl = overlay;
      }

      // Add CRT vignette
      var vignette = document.createElement('div');
      vignette.className = 'retro-vignette';
      container.appendChild(vignette);

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
      el.className = 'retro-sign-text';
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
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Courier New', 'Lucida Console', monospace",
        fontWeight: 'bold',
        padding: 40
      });
      el.style.fontSize = (fontSize * scale) + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'retro-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'retro-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var flowSize = Math.floor(container.clientHeight * 0.6 * scale);
      track.querySelectorAll('.retro-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'retro-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 30));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(container.clientHeight * 0.6 * scale);
        track.querySelectorAll('.retro-flow-text').forEach(function(t) {
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
          this._textEl.style.opacity = this._paused ? '0.5' : '1';
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
      this._scanlinesEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(RetroTheme);

})(typeof window !== 'undefined' ? window : this);
