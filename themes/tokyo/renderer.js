/**
 * Tokyo Theme
 * Cinematic night city aesthetic
 * Features: Canvas rain, layered glows, vertical decorations, lens flare
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var TokyoTheme = {
    id: 'tokyo',

    defaults: {
      color: 'ff0055',
      bg: '050508',
      font: '',
      speed: 40,
      direction: 'left'
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,
    _rainCanvas: null,
    _rainCtx: null,
    _rafId: null,
    _drops: [],

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-tokyo');

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      container.style.setProperty('--tokyo-color', color);
      container.style.backgroundColor = bg;

      // Add background glows
      this._addGlows();
      
      // Add Rain Canvas
      this._initRain();

      // Add Lens Flare
      var flare = document.createElement('div');
      flare.className = 'tokyo-flare';
      container.appendChild(flare);

      // Add Vertical Decorations
      this._addDecorations();

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }
      
      this._startAnimation();
    },

    _addGlows() {
        var g1 = document.createElement('div');
        g1.className = 'tokyo-glow tokyo-glow-1';
        this._container.appendChild(g1);
        var g2 = document.createElement('div');
        g2.className = 'tokyo-glow tokyo-glow-2';
        this._container.appendChild(g2);
    },

    _initRain() {
        var canvas = document.createElement('canvas');
        canvas.className = 'tokyo-rain';
        this._container.appendChild(canvas);
        this._rainCanvas = canvas;
        this._rainCtx = canvas.getContext('2d');
        this._resizeCanvas();
        
        // Initialize drops
        this._drops = [];
        for (var i = 0; i < 100; i++) {
            this._drops.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                len: Math.random() * 20 + 10,
                speed: Math.random() * 10 + 10
            });
        }
    },

    _resizeCanvas() {
        if (!this._rainCanvas) return;
        this._rainCanvas.width = this._container.clientWidth;
        this._rainCanvas.height = this._container.clientHeight;
    },

    _addDecorations() {
        var labels = ['東京', '新宿', '渋谷', '夜間', '信号'];
        for (var i = 0; i < 4; i++) {
            var d = document.createElement('div');
            d.className = 'tokyo-decoration';
            d.textContent = labels[Math.floor(Math.random() * labels.length)];
            d.style.left = (Math.random() * 90 + 5) + '%';
            d.style.top = (Math.random() * 80) + '%';
            this._container.appendChild(d);
        }
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'tokyo-sign-text tokyo-flicker';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
        this._resizeCanvas();
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Oswald', sans-serif",
        fontWeight: '700',
        padding: 100
      });
      el.style.fontSize = fontSize + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'tokyo-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'tokyo-flow-text tokyo-flicker';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(container.clientHeight * 0.5);
      track.querySelectorAll('.tokyo-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'tokyo-flow-scroll';
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
        track.querySelectorAll('.tokyo-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
        this._resizeCanvas();
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _startAnimation() {
        var self = this;
        function draw() {
            if (!self._rainCtx) return;
            if (!self._paused) {
                var ctx = self._rainCtx;
                var canvas = self._rainCanvas;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.lineCap = 'round';
                
                self._drops.forEach(function(d) {
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(d.x, d.y + d.len);
                    ctx.stroke();
                    
                    d.y += d.speed;
                    if (d.y > canvas.height) {
                        d.y = -20;
                        d.x = Math.random() * canvas.width;
                    }
                });
            }
            self._rafId = requestAnimationFrame(draw);
        }
        draw();
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
      if (this._rafId) cancelAnimationFrame(this._rafId);
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

  ThemeManager.register(TokyoTheme);

})(typeof window !== 'undefined' ? window : this);
