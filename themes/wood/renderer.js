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
      warm: 5,
      scale: 1
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

      // The Physical Board
      var board = document.createElement('div');
      board.className = 'wood-board';
      container.appendChild(board);

      // Frame Layers
      var frameOuter = document.createElement('div');
      frameOuter.className = 'frame-layer frame-outer';
      container.appendChild(frameOuter);

      var frameInner = document.createElement('div');
      frameInner.className = 'frame-layer frame-inner';
      container.appendChild(frameInner);

      // Ornate Corners
      var corners = ['tl', 'tr', 'bl', 'br'];
      corners.forEach(function(pos) {
        var orn = document.createElement('div');
        orn.className = 'ornament orn-' + pos;
        container.appendChild(orn);
      });

      // Lighting & Atmosphere
      var vignette = document.createElement('div');
      vignette.className = 'lighting-vignette';
      container.appendChild(vignette);

      var spot = document.createElement('div');
      spot.className = 'lighting-spot';
      container.appendChild(spot);
      this._warmLightEl = spot;

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }

      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      if (scale < 1) {
        var scaleWrap = document.createElement('div');
        scaleWrap.style.position = 'relative';
        scaleWrap.style.width = '100%';
        scaleWrap.style.height = '100%';
        scaleWrap.style.transform = 'scale(' + scale + ')';
        scaleWrap.style.transformOrigin = 'center center';
        // Replicate container layout so children stay centered
        var cs = window.getComputedStyle(container);
        ['display', 'flexDirection', 'alignItems', 'justifyContent', 'overflow'].forEach(function(p) {
          scaleWrap.style[p] = cs[p];
        });
        while (container.firstChild) scaleWrap.appendChild(container.firstChild);
        container.appendChild(scaleWrap);
      }
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config) {
      var wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      wrapper.style.zIndex = '12';

      var el = document.createElement('div');
      el.className = 'wood-sign-text';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      wrapper.appendChild(el);
      this._textEl = el;

      // Add a decorative divider below the text
      var divider = document.createElement('div');
      divider.className = 'text-divider';
      wrapper.appendChild(divider);

      container.appendChild(wrapper);

      this._fitText(el, text, config);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Cinzel Decorative', 'Noto Serif SC', serif",
        fontWeight: '900',
        padding: 240 // Massive padding for the heavy frame and ornaments
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

      var flowSize = Math.floor(this._container.clientHeight * 0.3);
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
        var newSize = Math.floor(this._container.clientHeight * 0.3);
        track.querySelectorAll('.wood-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
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
