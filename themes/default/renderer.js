/**
 * Default LED Theme
 * Classic LED sign with green text on black background
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  // Visual character count threshold for auto mode detection
  var AUTO_FLOW_THRESHOLD = 10;

  var DefaultTheme = {
    id: 'default',

    defaults: {
      color: '00ff41',
      bg: '000000',
      font: '',
      speed: 60,
      direction: 'left',
      scale: 1
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,

    /**
     * Initialize theme
     * @param {HTMLElement} container
     * @param {string} text - Display text
     * @param {Object} config - Merged config
     */
    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-default');

      // Apply CSS custom properties
      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--led-color', color);
      container.style.setProperty('--led-bg', bg);
      container.style.backgroundColor = bg;

      // Determine mode
      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }
    },

    /**
     * Resolve display mode
     * @private
     */
    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';

      // Auto-detect: count visual characters (spread handles emoji correctly)
      var charCount = [...text].length;
      return charCount > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    /**
     * Initialize SIGN mode (static, auto-fit text)
     * @private
     */
    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'led-sign-text';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      // Auto-fit text size
      this._fitText(el, text, config);

      // Re-fit on resize
      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    /**
     * Fit text to container
     * @private
     */
    _fitText(el, text, config) {
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'SF Mono', 'Fira Code', 'Roboto Mono', monospace",
        fontWeight: 'bold',
        padding: 30
      });
      el.style.fontSize = (fontSize * scale) + 'px';
    },

    /**
     * Initialize FLOW mode (scrolling marquee)
     * @private
     */
    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'led-flow-track';

      // Create two copies for seamless loop
      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'led-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      // Calculate animation
      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      // Set flow font size based on container height
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var flowSize = Math.floor(container.clientHeight * 0.6 * scale);
      var flowTexts = track.querySelectorAll('.led-flow-text');
      flowTexts.forEach(function(t) { t.style.fontSize = flowSize + 'px'; });

      // Inject animation style
      var animName = 'led-flow-scroll';
      var translateDir = (direction === 'right') ? '0%, -50%' : '-50%, 0%';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      // Duration based on speed (pixels per second)
      this._applyFlowAnimation(track, speed, animName, direction);

      // Refit on resize
      this._resizeHandler = function() {
        var newSize = Math.floor(container.clientHeight * 0.6 * scale);
        track.querySelectorAll('.led-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    /**
     * Apply flow animation to track
     * @private
     */
    _applyFlowAnimation(track, speed, animName, direction) {
      // Estimate duration: use a base that makes speed feel natural
      // speed parameter maps to px/second, estimate total width
      var duration = Math.max(5, 200 / (speed / 30));
      track.style.animation = animName + ' ' + duration + 's linear infinite';
    },

    /**
     * Toggle pause (for controls)
     */
    togglePause() {
      this._paused = !this._paused;
      if (this._textEl) {
        if (this._mode === 'flow') {
          this._textEl.style.animationPlayState = this._paused ? 'paused' : 'running';
        } else {
          // SIGN mode: blink effect when paused
          this._textEl.style.opacity = this._paused ? '0.5' : '1';
        }
      }
      return this._paused;
    },

    /**
     * Check if paused
     * @returns {boolean}
     */
    isPaused() {
      return this._paused;
    },

    /**
     * Destroy theme and clean up
     */
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

  // Register with ThemeManager
  ThemeManager.register(DefaultTheme);

})(typeof window !== 'undefined' ? window : this);
