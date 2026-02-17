/**
 * Cinema Theme
 * Classic cinema marquee letterboard with black felt background
 * and white plastic slot-mounted letters
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var FELT_COLORS = {
    black: '#1a1a1a',
    red: '#3a1515',
    blue: '#15152a'
  };

  var CinemaTheme = {
    id: 'cinema',

    defaults: {
      color: 'ffffff',
      bg: '0a0a0a',
      fill: '1a1a1a',
      font: "'Bebas Neue', 'Impact', sans-serif",
      speed: 60,
      direction: 'left',
      scale: 1,
      rows: 1,
      backlight: 5,
      letterColor: 'ffffff',
      felt: 'black'
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _boardEl: null,
    _casingEl: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-cinema');

      var feltKey = config.felt || this.defaults.felt;
      var feltColor = FELT_COLORS[feltKey] || FELT_COLORS.black;
      var letterColor = '#' + (config.letterColor || this.defaults.letterColor);
      var bg = '#' + (config.bg || this.defaults.bg);
      var backlight = Math.max(0, Math.min(10, Number(config.backlight != null ? config.backlight : this.defaults.backlight)));

      container.style.setProperty('--cinema-felt', feltColor);
      container.style.setProperty('--cinema-letter-color', letterColor);
      container.style.setProperty('--cinema-bg', bg);
      container.style.setProperty('--cinema-backlight', backlight / 10);
      container.style.backgroundColor = bg;

      // Build the letterboard structure
      this._buildBoard(container);

      // Resolve mode
      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(this._boardEl, text, config);
      } else {
        this._initSign(this._boardEl, text, config);
      }

      // Card-type scale handling
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
        scaleWrap.style.backgroundColor = '#' + config.fill;
        container.style.background = 'transparent';
        if (config.bg && config.bg !== this.defaults.bg) {
          container.style.backgroundColor = '#' + config.bg;
        }
      }
    },

    _buildBoard(container) {
      // Top casing with warm glow
      var casing = document.createElement('div');
      casing.className = 'cinema-casing';
      container.appendChild(casing);
      this._casingEl = casing;

      // Backlight glow from casing
      var glow = document.createElement('div');
      glow.className = 'cinema-glow';
      casing.appendChild(glow);

      // Letterboard felt surface
      var board = document.createElement('div');
      board.className = 'cinema-board';
      container.appendChild(board);
      this._boardEl = board;

      // Horizontal groove rails
      var rows = Math.max(1, Math.min(6, Number(this._config.rows) || 1));
      for (var i = 0; i < rows + 1; i++) {
        var rail = document.createElement('div');
        rail.className = 'cinema-rail';
        rail.style.top = (i / (rows + 1)) * 100 + '%';
        board.appendChild(rail);
      }

      // Subtle felt texture overlay
      var feltOverlay = document.createElement('div');
      feltOverlay.className = 'cinema-felt-texture';
      board.appendChild(feltOverlay);

      // Frame border
      var frame = document.createElement('div');
      frame.className = 'cinema-frame';
      container.appendChild(frame);
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(board, text, config) {
      var tileContainer = document.createElement('div');
      tileContainer.className = 'cinema-tile-container';

      var chars = [...text.toUpperCase()];
      chars.forEach(function(ch, idx) {
        var tile = document.createElement('div');
        tile.className = 'cinema-tile';
        tile.textContent = ch === ' ' ? '\u00A0' : ch;
        if (config.font) tile.style.fontFamily = config.font;

        // Staggered appearance animation
        tile.style.animationDelay = (idx * 0.04) + 's';

        tileContainer.appendChild(tile);
      });

      board.appendChild(tileContainer);
      this._textEl = tileContainer;

      this._fitTiles(tileContainer, text, config);

      this._resizeHandler = function() {
        this._fitTiles(tileContainer, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitTiles(tileContainer, text, config) {
      // Use TextEngine to find optimal font size, then derive tile size
      var fontSize = TextEngine.autoFit(text.toUpperCase(), this._container, {
        fontFamily: config.font || this.defaults.font,
        fontWeight: '400',
        padding: Math.max(80, this._container.clientWidth * 0.1)
      });

      // Set tile size proportional to font size
      var tileSize = fontSize * 1.1;
      tileContainer.style.setProperty('--cinema-tile-size', tileSize + 'px');
      tileContainer.style.setProperty('--cinema-font-size', fontSize + 'px');
    },

    _initFlow(board, text, config) {
      var track = document.createElement('div');
      track.className = 'cinema-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'cinema-flow-text';
        span.textContent = text.toUpperCase();
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      board.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(this._container.clientHeight * 0.35);
      track.querySelectorAll('.cinema-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'cinema-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 30));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(this._container.clientHeight * 0.35);
        track.querySelectorAll('.cinema-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    togglePause() {
      this._paused = !this._paused;
      var state = this._paused ? 'paused' : 'running';

      if (this._textEl) {
        if (this._mode === 'flow') {
          this._textEl.style.animationPlayState = state;
        } else {
          // Dim tiles on pause
          this._textEl.querySelectorAll('.cinema-tile').forEach(function(tile) {
            tile.style.opacity = this._paused ? '0.4' : '1';
          }.bind(this));
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
      this._boardEl = null;
      this._casingEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  TextManager.register(CinemaTheme);

})(typeof window !== 'undefined' ? window : this);
