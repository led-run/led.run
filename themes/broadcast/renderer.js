/**
 * Broadcast Theme
 * Professional studio "ON AIR" indicator with recording dot and clean border
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var BroadcastTheme = {
    id: 'broadcast',

    defaults: {
      color: 'ffffff',
      bg: '1a1a1a',
      font: '',
      speed: 60,
      direction: 'left',
      dot: 'ff0000',
      frame: 1
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _dotEl: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-broadcast');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      var dotColor = '#' + (config.dot || this.defaults.dot);

      container.style.setProperty('--broadcast-color', color);
      container.style.setProperty('--broadcast-bg', bg);
      container.style.setProperty('--dot-color', dotColor);
      container.style.backgroundColor = bg;

      // Frame
      var showFrame = config.frame !== undefined ? Number(config.frame) : this.defaults.frame;
      if (showFrame) {
        var frame = document.createElement('div');
        frame.className = 'broadcast-frame';
        container.appendChild(frame);
      }

      // Recording dot
      var dot = document.createElement('div');
      dot.className = 'broadcast-dot';
      container.appendChild(dot);
      this._dotEl = dot;

      // Hide dot if dot color is black (000000)
      if ((config.dot || this.defaults.dot) === '000000') {
        dot.style.display = 'none';
      }

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
      el.className = 'broadcast-sign-text';
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
        fontFamily: config.font || "'Bebas Neue', 'Impact', 'Arial Narrow', sans-serif",
        fontWeight: '400',
        padding: 50
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'broadcast-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'broadcast-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.6);
      track.querySelectorAll('.broadcast-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'broadcast-flow-scroll';
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
        track.querySelectorAll('.broadcast-flow-text').forEach(function(t) {
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
      // Pause/resume dot animation
      if (this._dotEl) {
        this._dotEl.style.animationPlayState = this._paused ? 'paused' : 'running';
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
      this._dotEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(BroadcastTheme);

})(typeof window !== 'undefined' ? window : this);
