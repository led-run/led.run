/**
 * Gold Theme
 * Luxury / Premium / Metallic aesthetic
 * Features: Shimmer highlights, random sparkles
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 8;

  var GoldTheme = {
    id: 'gold',

    defaults: {
      color: 'd4af37',
      bg: '0a0a0a',
      font: '',
      speed: 40,
      direction: 'left',
      sparkles: 1
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _sparkleInterval: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-gold');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      // We use the CSS-defined gradient for gold, but bg is customizable
      container.style.setProperty('--gold-bg', bg);
      container.style.backgroundColor = bg;

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }
      
      if (config.sparkles !== 0) {
        this._startSparkles();
      }
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config) {
      var wrapper = document.createElement('div');
      wrapper.className = 'gold-shimmer-container';
      wrapper.setAttribute('data-text', text);
      
      var el = document.createElement('div');
      el.className = 'gold-sign-text';
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
        fontFamily: config.font || "'Playfair Display', serif",
        fontWeight: 'bold',
        padding: 60
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'gold-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'gold-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.5);
      track.querySelectorAll('.gold-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'gold-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 20));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(container.clientHeight * 0.5);
        track.querySelectorAll('.gold-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _startSparkles() {
        var self = this;
        this._sparkleInterval = setInterval(function() {
            if (self._paused || !self._container) return;
            
            if (Math.random() > 0.6) {
                self._spawnSparkle();
            }
        }, 200);
    },

    _spawnSparkle() {
        var container = this._container;
        var sparkle = document.createElement('div');
        sparkle.className = 'gold-sparkle';
        
        // Random position within the container, favoring the center area where text is
        var top = 20 + Math.random() * 60;
        var left = Math.random() * 100;
        
        sparkle.style.top = top + '%';
        sparkle.style.left = left + '%';
        
        container.appendChild(sparkle);
        
        setTimeout(function() {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 1000);
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
      if (this._sparkleInterval) {
          clearInterval(this._sparkleInterval);
          this._sparkleInterval = null;
      }
      this._container = null;
      this._textEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(GoldTheme);

})(typeof window !== 'undefined' ? window : this);
