/**
 * Cyber Theme
 * High-tech terminal / HUD aesthetic
 * Features: Text decoding effect, scanning lines, data decorations
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  var CyberTheme = {
    id: 'cyber',

    defaults: {
      color: '00ff00',
      bg: '050a05',
      font: '',
      speed: 50,
      direction: 'left',
      glitch: 1,
      scale: 1
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _intervals: [],

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;
      this._intervals = [];

      container.classList.add('theme-cyber');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--cyber-color', color);
      container.style.setProperty('--cyber-bg', bg);
      container.style.backgroundColor = bg;

      this._mode = this._resolveMode(text, config.mode);

      // Add HUD decorations
      this._addDecorations();

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }
      
      // Periodic subtle glitch
      if (config.glitch !== 0) {
        this._startGlitchLoop();
      }
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'cyber-sign-text';
      // Start with empty text for decoding effect
      el.textContent = '';
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);
      this._decodeText(el, text);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitText(el, text, config) {
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'JetBrains Mono', 'Share Tech Mono', monospace",
        fontWeight: 'bold',
        padding: 50
      });
      el.style.fontSize = (fontSize * scale) + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'cyber-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'cyber-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var flowSize = Math.floor(container.clientHeight * 0.5 * scale);
      track.querySelectorAll('.cyber-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'cyber-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 30));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(container.clientHeight * 0.5 * scale);
        track.querySelectorAll('.cyber-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _decodeText(el, targetText) {
      var self = this;
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>[]{}/?+*#%&@';
      var duration = 1500;
      var frameRate = 30;
      var totalFrames = Math.floor((duration / 1000) * frameRate);
      var frame = 0;

      var interval = setInterval(function() {
        if (self._paused) return;
        
        var current = '';
        var progress = frame / totalFrames;
        
        for (var i = 0; i < targetText.length; i++) {
          if (i / targetText.length < progress) {
            current += targetText[i];
          } else {
            current += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        
        el.textContent = current;
        frame++;
        
        if (frame > totalFrames) {
          el.textContent = targetText;
          clearInterval(interval);
        }
      }, 1000 / frameRate);
      
      this._intervals.push(interval);
    },

    _addDecorations() {
      var container = this._container;
      var corners = [
        { t: '10px', l: '10px', text: 'SYS_BOOT: READY' },
        { t: '10px', r: '10px', text: 'LINK_STABLE: 100%' },
        { b: '10px', l: '10px', text: 'SEC_ENCRYPT: AES-256' },
        { b: '10px', r: '10px', text: 'LOC: 35.6895° N, 139.6917° E' }
      ];

      corners.forEach(function(c) {
        var d = document.createElement('div');
        d.className = 'cyber-decoration';
        if (c.t) d.style.top = c.t;
        if (c.b) d.style.bottom = c.b;
        if (c.l) d.style.left = c.l;
        if (c.r) d.style.right = c.r;
        d.textContent = c.text;
        container.appendChild(d);
      });
      
      // Random bits
      for (var i = 0; i < 5; i++) {
          this._spawnDataBit();
      }
    },

    _spawnDataBit() {
        if (!this._container) return;
        var d = document.createElement('div');
        d.className = 'cyber-decoration';
        d.style.top = Math.random() * 90 + '%';
        d.style.left = Math.random() * 90 + '%';
        d.style.opacity = '0.1';
        d.textContent = Math.random().toString(16).substring(2, 8).toUpperCase();
        this._container.appendChild(d);
    },

    _startGlitchLoop() {
      var self = this;
      function run() {
        if (!self._container || self._paused) {
           self._glitchTimeout = setTimeout(run, 2000);
           return;
        }
        
        if (Math.random() > 0.8 && self._textEl) {
          var target = self._mode === 'flow' ? self._textEl : self._textEl;
          target.classList.add('cyber-glitch-active');
          setTimeout(function() {
            if (target) target.classList.remove('cyber-glitch-active');
          }, 300);
        }
        self._glitchTimeout = setTimeout(run, Math.random() * 3000 + 1000);
      }
      run();
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
      if (this._glitchTimeout) {
        clearTimeout(this._glitchTimeout);
        this._glitchTimeout = null;
      }
      this._intervals.forEach(clearInterval);
      this._intervals = [];
      this._container = null;
      this._textEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  TextManager.register(CyberTheme);

})(typeof window !== 'undefined' ? window : this);
