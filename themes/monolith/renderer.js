/**
 * Monolith Theme
 * Brutalist / Industrial / High-contrast aesthetic
 * Features: Paper grain texture, massive BG text, reveal animations
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 8;

  var MonolithTheme = {
    id: 'monolith',

    defaults: {
      color: '000000',
      bg: 'ffffff',
      font: '',
      speed: 50,
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

      container.classList.add('theme-monolith');
      
      var bg = '#' + (config.bg || this.defaults.bg);
      var color = '#' + (config.color || this.defaults.color);
      container.style.backgroundColor = bg;
      container.style.color = color;

      // Add Texture
      var texture = document.createElement('div');
      texture.className = 'monolith-texture';
      container.appendChild(texture);
      
      // Add Progress bar
      var progress = document.createElement('div');
      progress.className = 'monolith-progress';
      progress.style.backgroundColor = color;
      container.appendChild(progress);

      // Add Background Decoration
      this._addBgText(text);

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }
    },

    _addBgText(text) {
        var bg = document.createElement('div');
        bg.className = 'monolith-bg-text';
        bg.textContent = text;
        this._container.appendChild(bg);
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config) {
      var wrapper = document.createElement('div');
      wrapper.className = 'monolith-split';
      
      var el = document.createElement('div');
      el.className = 'monolith-sign-text monolith-reveal';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      
      wrapper.appendChild(el);
      container.appendChild(wrapper);
      this._textEl = el;

      this._fitText(el, text, config);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Inter', sans-serif",
        fontWeight: '900',
        padding: 60
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'monolith-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'monolith-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.7);
      track.querySelectorAll('.monolith-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'monolith-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 20));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(container.clientHeight * 0.7);
        track.querySelectorAll('.monolith-flow-text').forEach(function(t) {
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
    }
  };

  ThemeManager.register(MonolithTheme);

})(typeof window !== 'undefined' ? window : this);
