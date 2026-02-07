/**
 * Glitch Theme
 * RGB channel split, random jitter, text distortion
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var GlitchTheme = {
    id: 'glitch',

    defaults: {
      color: '00ffff',
      bg: '0a0a0a',
      font: '',
      speed: 60,
      direction: 'left',
      intensity: 1
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

      container.classList.add('theme-glitch');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--glitch-color', color);
      container.style.setProperty('--glitch-bg', bg);
      container.style.backgroundColor = bg;

      // Glitch intensity maps to CSS variable
      var intensity = config.intensity !== undefined ? config.intensity : this.defaults.intensity;
      container.style.setProperty('--glitch-intensity', intensity);

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
      el.className = 'glitch-sign-text';
      el.textContent = text;
      el.setAttribute('data-text', text);
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
      
      this._startCorruption(text);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'SF Mono', 'Fira Code', 'Roboto Mono', monospace",
        fontWeight: 'bold',
        padding: 30
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'glitch-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'glitch-flow-text';
        span.textContent = text;
        span.setAttribute('data-text', text); // Needed for CSS pseudo-elements
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.6);
      track.querySelectorAll('.glitch-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'glitch-flow-scroll';
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
        track.querySelectorAll('.glitch-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
      
      this._startCorruption(text);
    },

    _startCorruption(originalText) {
      var self = this;
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      function corrupt() {
        if (self._paused || !self._container) return;
        
        // Randomly decide to corrupt
        if (Math.random() > 0.7) {
            var targets = self._mode === 'flow' 
              ? self._container.querySelectorAll('.glitch-flow-text') 
              : [self._container.querySelector('.glitch-sign-text')];
              
            targets.forEach(function(el) {
              if (!el) return;
              var currentText = el.textContent;
              var split = currentText.split('');
              // Corrupt 1-3 random characters
              var num = Math.floor(Math.random() * 3) + 1;
              for(var k=0; k<num; k++) {
                var idx = Math.floor(Math.random() * split.length);
                split[idx] = chars.charAt(Math.floor(Math.random() * chars.length));
              }
              el.textContent = split.join('');
              
              // Restore after 100ms
              setTimeout(function() {
                if (self._container && el) el.textContent = originalText;
              }, 100);
            });
        }
        
        self._corruptionTimeout = setTimeout(corrupt, Math.random() * 2000 + 500);
      }
      
      corrupt();
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
      if (this._corruptionTimeout) {
        clearTimeout(this._corruptionTimeout);
        this._corruptionTimeout = null;
      }
      this._container = null;
      this._textEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(GlitchTheme);

})(typeof window !== 'undefined' ? window : this);
