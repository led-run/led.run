/**
 * Pulse Theme
 * Ultra-modern glassmorphism with organic fluid motion
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var PulseTheme = {
    id: 'pulse',

    defaults: {
      color: 'ff6b9d',
      bg: '050110',
      font: '',
      speed: 60,
      direction: 'left',
      rhythm: 4,
      scale: 1
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _glassEl: null,
    _blobAnimations: [],

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;
      this._blobAnimations = [];

      container.classList.add('theme-pulse');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      var rhythm = Math.max(2, Math.min(10, Number(config.rhythm) || this.defaults.rhythm));

      container.style.setProperty('--pulse-color', color);
      container.style.setProperty('--pulse-bg', bg);
      container.style.setProperty('--pulse-rhythm', rhythm + 's');
      container.style.backgroundColor = bg;

      // Background Blobs
      this._initBlobs(container);

      // Glass Container
      var glass = document.createElement('div');
      glass.className = 'pulse-glass-container';
      container.appendChild(glass);
      this._glassEl = glass;

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(glass, text, config);
      } else {
        this._initSign(glass, text, config);
      }
    },

    _initBlobs(container) {
      var blobWrapper = document.createElement('div');
      blobWrapper.className = 'pulse-blobs';
      for (var i = 0; i < 5; i++) {
        var blob = document.createElement('div');
        blob.className = 'pulse-blob';
        var size = Math.random() * 400 + 200;
        blob.style.width = size + 'px';
        blob.style.height = size + 'px';
        blob.style.left = Math.random() * 100 + '%';
        blob.style.top = Math.random() * 100 + '%';
        blob.style.opacity = Math.random() * 0.4 + 0.1;
        
        // Random animation
        var duration = Math.random() * 20 + 10;
        var anim = blob.animate([
          { transform: 'translate(0, 0) scale(1)' },
          { transform: 'translate(' + (Math.random() * 200 - 100) + 'px, ' + (Math.random() * 200 - 100) + 'px) scale(1.2)' },
          { transform: 'translate(0, 0) scale(1)' }
        ], {
          duration: duration * 1000,
          iterations: Infinity,
          easing: 'ease-in-out'
        });
        this._blobAnimations.push(anim);
        blobWrapper.appendChild(blob);
      }
      container.appendChild(blobWrapper);
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
      el.setAttribute('data-text', text);
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
        fontFamily: config.font || "'Outfit', sans-serif",
        fontWeight: '800',
        padding: 120 // Extra padding for glass container
      });
      el.style.fontSize = (fontSize * scale) + 'px';
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

      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var flowSize = Math.floor(this._container.clientHeight * 0.4 * scale);
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
        var newSize = Math.floor(this._container.clientHeight * 0.4 * scale);
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
        this._textEl.style.animationPlayState = state;
      }
      if (this._glassEl) {
        this._glassEl.style.animationPlayState = state;
      }
      this._blobAnimations.forEach(function(anim) {
        if (this._paused) anim.pause();
        else anim.play();
      }.bind(this));

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
      this._blobAnimations.forEach(function(anim) { anim.cancel(); });
      this._blobAnimations = [];
      this._container = null;
      this._textEl = null;
      this._glassEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(PulseTheme);

})(typeof window !== 'undefined' ? window : this);