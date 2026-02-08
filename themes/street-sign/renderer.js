/**
 * Street Sign Theme (V5: High-Precision Icons)
 * The entire viewport is the sign surface with industrial SVG icons.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 15;

  // Industrial SVG Arrows
  var ARROWS = {
    up: '<svg class="sign-arrow-svg" viewBox="0 0 100 100"><path d="M50 10 L90 50 L70 50 L70 90 L30 90 L30 50 L10 50 Z"/></svg>',
    left: '<svg class="sign-arrow-svg" viewBox="0 0 100 100"><path d="M10 50 L50 10 L50 30 L90 30 L90 70 L50 70 L50 90 Z"/></svg>',
    right: '<svg class="sign-arrow-svg" viewBox="0 0 100 100"><path d="M90 50 L50 10 L50 30 L10 30 L10 70 L50 70 L50 90 Z"/></svg>',
    uturn: '<svg class="sign-arrow-svg" viewBox="0 0 100 100"><path d="M20 90 L20 50 C20 10, 80 10, 80 50 L80 90 L60 90 L60 50 C60 35, 40 35, 40 50 L40 70 L55 70 L30 95 L5 70 L20 70 Z"/></svg>',
    'sl-left': '<svg class="sign-arrow-svg" viewBox="0 0 100 100" style="transform: rotate(-45deg)"><path d="M50 10 L90 50 L70 50 L70 90 L30 90 L30 50 L10 50 Z"/></svg>',
    'sl-right': '<svg class="sign-arrow-svg" viewBox="0 0 100 100" style="transform: rotate(45deg)"><path d="M50 10 L90 50 L70 50 L70 90 L30 90 L30 50 L10 50 Z"/></svg>'
  };

  var StreetSignTheme = {
    id: 'street-sign',

    defaults: {
      color: '003884',
      bg: '000000',
      font: '',
      speed: 30,
      direction: 'left',
      sub: '',
      exit: '',
      arrow: '',
      glare: 0.1,
      scale: 1
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

      container.classList.add('theme-street-sign');

      var color = '#' + (config.color || this.defaults.color);
      container.style.setProperty('--sign-color', color);
      container.style.setProperty('--glare-opacity', config.glare !== undefined ? config.glare : this.defaults.glare);

      this._addRivets(container);

      var glare = document.createElement('div');
      glare.className = 'sign-full-glare';
      container.appendChild(glare);

      var wrapper = document.createElement('div');
      wrapper.className = 'sign-wrapper';
      container.appendChild(wrapper);
      this._wrapper = wrapper;

      if (config.exit) {
          var exit = document.createElement('div');
          exit.className = 'sign-exit-tag';
          exit.textContent = config.exit;
          wrapper.appendChild(exit);
      }

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(wrapper, text, config);
      } else {
        this._initSign(wrapper, text, config);
      }

      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      if (scale < 1) {
        var scaleWrap = document.createElement('div');
        scaleWrap.style.position = 'relative';
        scaleWrap.style.width = '100%';
        scaleWrap.style.height = '100%';
        scaleWrap.style.transform = 'scale(' + scale + ')';
        scaleWrap.style.transformOrigin = 'center center';
        var cs = window.getComputedStyle(container);
        ['display', 'flexDirection', 'alignItems', 'justifyContent', 'overflow'].forEach(function(p) {
          scaleWrap.style[p] = cs[p];
        });
        while (container.firstChild) scaleWrap.appendChild(container.firstChild);
        container.appendChild(scaleWrap);
        scaleWrap.style.backgroundColor = '#' + this.defaults.bg;
        container.style.background = 'transparent';
        if (config.bg && config.bg !== this.defaults.bg) {
          container.style.backgroundColor = '#' + config.bg;
        }
      }
    },

    _addRivets(container) {
        ['tl', 'tr', 'bl', 'br'].forEach(function(pos) {
            var rivet = document.createElement('div');
            rivet.className = 'sign-rivet rivet-' + pos;
            container.appendChild(rivet);
        });
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(wrapper, text, config) {
      // SVG Arrow
      if (config.arrow && ARROWS[config.arrow]) {
          var arrowContainer = document.createElement('div');
          arrowContainer.innerHTML = ARROWS[config.arrow];
          wrapper.appendChild(arrowContainer.firstChild);
      }

      var el = document.createElement('div');
      el.className = 'sign-text-main';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      wrapper.appendChild(el);
      this._textEl = el;

      if (config.sub) {
          var sub = document.createElement('div');
          sub.className = 'sign-sub-label';
          sub.textContent = config.sub;
          wrapper.appendChild(sub);
      }

      this._fitText(el, text, config);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Inter', sans-serif",
        fontWeight: '800',
        padding: this._container.clientWidth * 0.1
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(wrapper, text, config) {
      var track = document.createElement('div');
      track.className = 'sign-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'sign-text-main sign-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      wrapper.appendChild(track);
      this._textEl = track;

      var flowSize = Math.floor(this._container.clientHeight * 0.45);
      track.querySelectorAll('.sign-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var animName = 'sign-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 20));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(this._container.clientHeight * 0.45);
        track.querySelectorAll('.sign-flow-text').forEach(function(t) {
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
      this._wrapper = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(StreetSignTheme);

})(typeof window !== 'undefined' ? window : this);
