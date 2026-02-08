/**
 * Typewriter Theme
 * Character-by-character typing with blinking cursor and auto-loop
 * Supports SIGN (typing effect) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var TypewriterTheme = {
    id: 'typewriter',

    defaults: {
      color: '1a1a1a',
      bg: 'f5f5f0',
      font: '',
      speed: 60,
      direction: 'left',
      typingSpeed: 120,
      scale: 1
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _typingTimeout: null, // Changed from interval to timeout for variable speed
    _resetTimeout: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-typewriter');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--tw-color', color);
      container.style.setProperty('--tw-bg', bg);
      container.style.backgroundColor = bg;

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
      // First, calculate the font size for the full text
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var fontSize = TextEngine.autoFit(text, container, {
        fontFamily: config.font || "'Special Elite', 'Courier Prime', monospace",
        fontWeight: '400',
        padding: 30
      });

      // Create wrapper to hold text + cursor
      var wrapper = document.createElement('div');
      wrapper.className = 'tw-sign-wrapper';

      var el = document.createElement('span');
      el.className = 'tw-sign-text';
      el.style.fontSize = (fontSize * scale) + 'px';
      if (config.font) el.style.fontFamily = config.font;

      var cursor = document.createElement('span');
      cursor.className = 'tw-cursor';
      cursor.style.fontSize = (fontSize * scale) + 'px';

      wrapper.appendChild(el);
      wrapper.appendChild(cursor);
      container.appendChild(wrapper);
      this._textEl = el;
      this._wrapperEl = wrapper;

      // Start typing animation
      this._startTyping(el, text, config);

      this._resizeHandler = function() {
        var newSize = TextEngine.autoFit(text, container, {
          fontFamily: config.font || "'Special Elite', 'Courier Prime', monospace",
          fontWeight: '400',
          padding: 30
        });
        el.style.fontSize = (newSize * scale) + 'px';
        cursor.style.fontSize = (newSize * scale) + 'px';
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _startTyping(el, text, config) {
      var self = this;
      var chars = [...text];
      var baseSpeed = config.typingSpeed !== undefined ? config.typingSpeed : self.defaults.typingSpeed;
      var index = 0;

      el.textContent = '';

      function typeNext() {
        if (self._paused) {
          self._typingTimeout = setTimeout(typeNext, 100);
          return;
        }

        if (index < chars.length) {
          el.textContent += chars[index];
          index++;
          // Random variance: 0.5x to 1.5x speed
          var variance = (Math.random() * 1.0) + 0.5; 
          self._typingTimeout = setTimeout(typeNext, baseSpeed * variance);
        } else {
          // Done typing — pause 2 seconds, then restart
          self._typingTimeout = null;
          self._resetTimeout = setTimeout(function() {
            if (!self._container) return;
            self._startTyping(el, text, config);
          }, 2000);
        }
      }

      typeNext();
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'tw-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'tw-flow-text';
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
      track.querySelectorAll('.tw-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'tw-flow-scroll';
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
        track.querySelectorAll('.tw-flow-text').forEach(function(t) {
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
        // SIGN mode: _paused flag controls interval skip in _startTyping
      }
      return this._paused;
    },

    isPaused() {
      return this._paused;
    },

    destroy() {
      if (this._typingTimeout) {
        clearTimeout(this._typingTimeout);
        this._typingTimeout = null;
      }
      if (this._resetTimeout) {
        clearTimeout(this._resetTimeout);
        this._resetTimeout = null;
      }
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
      this._wrapperEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(TypewriterTheme);

})(typeof window !== 'undefined' ? window : this);
