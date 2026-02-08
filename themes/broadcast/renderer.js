/**
 * Broadcast Theme
 * High-end studio "ON AIR" indicator with skeuomorphic details
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var BroadcastTheme = {
    id: 'broadcast',

    defaults: {
      color: 'ffffff',
      bg: '0a0a0a',
      font: '',
      speed: 60,
      direction: 'left',
      dot: 'ff0000',
      scale: 1,
      fill: '0a0a0a'
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _dotEl: null,
    _contentEl: null,
    _clockEl: null,
    _clockInterval: null,

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

      // Skeuomorphic Frame and Details
      this._buildSkeuomorphicUI(container);

      // Main Content Container
      var content = document.createElement('div');
      content.className = 'broadcast-content';
      container.appendChild(content);
      this._contentEl = content;

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(content, text, config);
      } else {
        this._initSign(content, text, config);
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
        scaleWrap.style.backgroundColor = '#' + config.fill;
        container.style.background = 'transparent';
        if (config.bg && config.bg !== this.defaults.bg) {
          container.style.backgroundColor = '#' + config.bg;
        }
      }
    },

    _buildSkeuomorphicUI(container) {
      // Metal Frame
      var frame = document.createElement('div');
      frame.className = 'broadcast-container';
      container.appendChild(frame);

      // Screws
      ['tl', 'tr', 'bl', 'br'].forEach(function(pos) {
        var screw = document.createElement('div');
        screw.className = 'broadcast-screw screw-' + pos;
        container.appendChild(screw);
      });

      // Glass Panel
      var glass = document.createElement('div');
      glass.className = 'broadcast-glass';
      container.appendChild(glass);

      // Labels & Dot
      var recLabel = document.createElement('div');
      recLabel.className = 'broadcast-label-rec';
      recLabel.textContent = 'REC';
      container.appendChild(recLabel);

      var dot = document.createElement('div');
      dot.className = 'broadcast-dot';
      container.appendChild(dot);
      this._dotEl = dot;

      // Studio Clock
      var clock = document.createElement('div');
      clock.className = 'broadcast-clock';
      container.appendChild(clock);
      this._clockEl = clock;
      this._updateClock();
      this._clockInterval = setInterval(this._updateClock.bind(this), 1000);

      // VU Meters
      var vuContainer = document.createElement('div');
      vuContainer.className = 'broadcast-vumeters';
      for (var i = 0; i < 40; i++) {
        var bar = document.createElement('div');
        bar.className = 'vu-bar';
        var level = document.createElement('div');
        level.className = 'vu-level';
        level.style.setProperty('--vu-height', (Math.random() * 80 + 10) + '%');
        level.style.animationDelay = (Math.random() * 0.5) + 's';
        bar.appendChild(level);
        vuContainer.appendChild(bar);
      }
      container.appendChild(vuContainer);
    },

    _updateClock() {
      if (!this._clockEl) return;
      var now = new Date();
      var h = String(now.getHours()).padStart(2, '0');
      var m = String(now.getMinutes()).padStart(2, '0');
      var s = String(now.getSeconds()).padStart(2, '0');
      this._clockEl.textContent = h + ':' + m + ':' + s;
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
        fontFamily: config.font || "'Bebas Neue', 'Impact', sans-serif",
        fontWeight: '400',
        padding: 100
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

      var flowSize = Math.floor(this._container.clientHeight * 0.4);
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
        var newSize = Math.floor(this._container.clientHeight * 0.4);
        track.querySelectorAll('.broadcast-flow-text').forEach(function(t) {
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
          this._textEl.style.opacity = this._paused ? '0.5' : '1';
        }
      }
      if (this._dotEl) {
        this._dotEl.style.animationPlayState = state;
      }
      // VU meters pause
      if (this._container) {
        this._container.querySelectorAll('.vu-level').forEach(function(vu) {
          vu.style.animationPlayState = state;
        });
      }
      return this._paused;
    },

    isPaused() {
      return this._paused;
    },

    destroy() {
      if (this._clockInterval) {
        clearInterval(this._clockInterval);
        this._clockInterval = null;
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
      this._dotEl = null;
      this._contentEl = null;
      this._clockEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(BroadcastTheme);

})(typeof window !== 'undefined' ? window : this);