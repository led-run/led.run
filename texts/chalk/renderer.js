/**
 * Chalk Theme
 * Realistic chalkboard with chalk-drawn text, dust particles, wooden frame
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var BOARD_COLORS = {
    green: { bg: '#2d5a27', surface: '#3a6b34', line: 'rgba(255,255,255,0.03)' },
    black: { bg: '#1a1a1a', surface: '#252525', line: 'rgba(255,255,255,0.02)' }
  };

  var ChalkTheme = {
    id: 'chalk',

    defaults: {
      color: 'ffffff',
      bg: '1a1a0f',
      fill: '2d5a27',
      font: "'Patrick Hand', 'Segoe Print', cursive",
      speed: 60,
      direction: 'left',
      scale: 1,
      dust: 5,
      board: 'green',
      frame: 'wood'
    },

    _container: null,
    _config: null,
    _canvas: null,
    _ctx: null,
    _mode: null,
    _text: '',
    _flowText: '',
    _scrollPos: 0,
    _lastTime: 0,
    _rafId: null,
    _paused: false,
    _resizeHandler: null,
    _dustParticles: [],
    _sampleCanvas: null,
    _sampleCtx: null,

    _resolveMode: function(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    init: function(container, text, config) {
      this._container = container;
      this._text = text;
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._scrollPos = 0;
      this._lastTime = performance.now();

      container.classList.add('theme-chalk');
      container.style.backgroundColor = '#' + this._config.bg;

      // Board surface
      var board = document.createElement('div');
      board.className = 'chalk-board';
      var boardStyle = BOARD_COLORS[this._config.board] || BOARD_COLORS.green;
      board.style.backgroundColor = boardStyle.bg;
      container.appendChild(board);

      // Canvas for chalk text and dust
      this._canvas = document.createElement('canvas');
      this._canvas.className = 'chalk-canvas';
      board.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      // Sampling canvas
      this._sampleCanvas = document.createElement('canvas');
      this._sampleCtx = this._sampleCanvas.getContext('2d', { willReadFrequently: true });

      // Chalk tray
      var tray = document.createElement('div');
      tray.className = 'chalk-tray';
      container.appendChild(tray);

      // Chalk pieces on tray
      var colors = ['#fff', '#ffcccc', '#ccccff', '#ffffcc'];
      for (var i = 0; i < 3; i++) {
        var piece = document.createElement('div');
        piece.className = 'chalk-piece';
        piece.style.backgroundColor = colors[i % colors.length];
        piece.style.left = (15 + i * 30 + Math.random() * 10) + '%';
        piece.style.transform = 'rotate(' + (Math.random() * 20 - 10) + 'deg)';
        tray.appendChild(piece);
      }

      // Frame
      if (this._config.frame !== 'none') {
        var frame = document.createElement('div');
        frame.className = 'chalk-frame chalk-frame-' + this._config.frame;
        container.appendChild(frame);
      }

      // Init dust particles
      this._initDust();

      this._mode = this._resolveMode(text, this._config.mode);
      if (this._mode === 'flow') {
        this._flowText = ' ' + this._text + ' ';
      }

      this._resizeCanvas();
      this._startAnimation();

      this._resizeHandler = this._resizeCanvas.bind(this);
      window.addEventListener('resize', this._resizeHandler);

      // Card-type scale
      var scale = Math.max(0.1, Math.min(1, Number(this._config.scale) || 1));
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
        scaleWrap.style.backgroundColor = '#' + this._config.fill;
        container.style.background = 'transparent';
        if (this._config.bg && this._config.bg !== this.defaults.bg) {
          container.style.backgroundColor = '#' + this._config.bg;
        }
      }
    },

    _initDust: function() {
      var density = parseInt(this._config.dust) || 5;
      var count = density * 8;
      this._dustParticles = [];
      for (var i = 0; i < count; i++) {
        this._dustParticles.push({
          x: Math.random(),
          y: Math.random(),
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 0.0003 + 0.0001,
          drift: Math.random() * 0.0002 - 0.0001,
          opacity: Math.random() * 0.4 + 0.1
        });
      }
    },

    _resizeCanvas: function() {
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      this._canvas.width = w;
      this._canvas.height = h;
      this._prepareTextSample();
    },

    _prepareTextSample: function() {
      var w = this._canvas.width;
      var h = this._canvas.height;
      var text = this._mode === 'flow' ? this._flowText : this._text;
      var font = this._config.font || this.defaults.font;

      if (this._mode === 'sign') {
        // Auto-fit text
        var padding = Math.min(w, h) * 0.15;
        var fontSize = TextEngine.autoFit(this._text, this._container, {
          fontFamily: font,
          fontWeight: '400',
          padding: padding
        });
        this._sampleCanvas.width = w;
        this._sampleCanvas.height = h;
        this._sampleCtx.clearRect(0, 0, w, h);
        this._sampleCtx.font = '400 ' + fontSize + 'px ' + font;
        this._sampleCtx.fillStyle = 'white';
        this._sampleCtx.textAlign = 'center';
        this._sampleCtx.textBaseline = 'middle';
        this._sampleCtx.fillText(this._text, w / 2, h / 2);
        this._signFontSize = fontSize;
      } else {
        var flowFontSize = Math.floor(h * 0.5);
        this._sampleCtx.font = '400 ' + flowFontSize + 'px ' + font;
        var tw = this._sampleCtx.measureText(this._flowText).width;
        this._sampleCanvas.width = Math.ceil(tw) + 4;
        this._sampleCanvas.height = h;
        this._sampleCtx.clearRect(0, 0, this._sampleCanvas.width, h);
        this._sampleCtx.font = '400 ' + flowFontSize + 'px ' + font;
        this._sampleCtx.fillStyle = 'white';
        this._sampleCtx.textAlign = 'left';
        this._sampleCtx.textBaseline = 'middle';
        this._sampleCtx.fillText(this._flowText, 0, h / 2);
        this._flowFontSize = flowFontSize;
      }
    },

    _startAnimation: function() {
      var self = this;
      function loop(now) {
        if (!self._paused) {
          var delta = Math.min((now - self._lastTime) / 1000, 0.1);
          self._lastTime = now;
          if (self._mode === 'flow') {
            var speed = parseFloat(self._config.speed);
            var direction = self._config.direction === 'right' ? -1 : 1;
            self._scrollPos += speed * delta * 0.5 * direction;
          }
          self._draw(now);
        } else {
          self._lastTime = now;
        }
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _draw: function(now) {
      var ctx = this._ctx;
      var w = this._canvas.width;
      var h = this._canvas.height;

      // Board surface
      var boardStyle = BOARD_COLORS[this._config.board] || BOARD_COLORS.green;
      ctx.fillStyle = boardStyle.surface;
      ctx.fillRect(0, 0, w, h);

      // Surface noise texture
      this._drawSurfaceNoise(ctx, w, h, now);

      // Draw chalk text
      this._drawChalkText(ctx, w, h);

      // Draw eraser smudges
      this._drawSmudges(ctx, w, h);

      // Draw dust particles
      this._drawDust(ctx, w, h, now);
    },

    _drawSurfaceNoise: function(ctx, w, h, now) {
      // Subtle slate texture lines
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#000';
      for (var i = 0; i < 20; i++) {
        var y = (i / 20) * h + Math.sin(now * 0.0001 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + Math.random() * 4 - 2);
        ctx.lineWidth = Math.random() * 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },

    _drawChalkText: function(ctx, w, h) {
      var color = this._config.color;
      var r = parseInt(color.substring(0, 2), 16);
      var g = parseInt(color.substring(2, 4), 16);
      var b = parseInt(color.substring(4, 6), 16);

      if (this._mode === 'sign') {
        // Draw chalk texture over sampled text
        var imgData = this._sampleCtx.getImageData(0, 0, w, h);
        var data = imgData.data;
        var step = 2;
        for (var y = 0; y < h; y += step) {
          for (var x = 0; x < w; x += step) {
            var idx = (y * w + x) * 4;
            if (data[idx + 3] > 30) {
              var alpha = data[idx + 3] / 255;
              // Chalk texture: varying opacity for rough edges
              var noise = Math.random() * 0.4 + 0.6;
              ctx.globalAlpha = alpha * noise;
              ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (noise * 0.9) + ')';
              ctx.fillRect(x, y, step + Math.random(), step + Math.random());
            }
          }
        }
        ctx.globalAlpha = 1;
      } else {
        // Flow mode: scroll and draw
        var sw = this._sampleCanvas.width;
        var scrollPx = this._scrollPos;
        if (scrollPx > sw) this._scrollPos = -w;
        else if (scrollPx < -w) this._scrollPos = sw;

        var imgData2 = this._sampleCtx.getImageData(0, 0, sw, h);
        var data2 = imgData2.data;
        var step2 = 2;

        for (var y2 = 0; y2 < h; y2 += step2) {
          for (var x2 = 0; x2 < w; x2 += step2) {
            var srcX = Math.floor(x2 + scrollPx);
            if (srcX < 0 || srcX >= sw) continue;
            var idx2 = (y2 * sw + srcX) * 4;
            if (data2[idx2 + 3] > 30) {
              var alpha2 = data2[idx2 + 3] / 255;
              var noise2 = Math.random() * 0.4 + 0.6;
              ctx.globalAlpha = alpha2 * noise2;
              ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (noise2 * 0.9) + ')';
              ctx.fillRect(x2, y2, step2 + Math.random(), step2 + Math.random());
            }
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    _drawSmudges: function(ctx, w, h) {
      // A few semi-transparent smudge areas
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = '#888';
      for (var i = 0; i < 3; i++) {
        var sx = w * (0.1 + i * 0.3 + Math.sin(i * 1.7) * 0.1);
        var sy = h * (0.6 + Math.cos(i * 2.3) * 0.2);
        var sr = Math.min(w, h) * (0.05 + Math.random() * 0.05);
        ctx.beginPath();
        ctx.ellipse(sx, sy, sr * 2, sr, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    _drawDust: function(ctx, w, h, now) {
      var particles = this._dustParticles;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y -= p.speed * 16;
        p.x += p.drift * 16;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        if (p.x < -0.05 || p.x > 1.05) {
          p.x = Math.random();
          p.y = Math.random();
        }

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    togglePause: function() {
      this._paused = !this._paused;
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      this._container.classList.remove('theme-chalk');
      this._container.innerHTML = '';
      this._container = null;
      this._canvas = null;
      this._ctx = null;
      this._sampleCanvas = null;
      this._sampleCtx = null;
      this._config = null;
      this._dustParticles = [];
      this._mode = null;
      this._text = '';
      this._flowText = '';
      this._paused = false;
    }
  };

  TextManager.register(ChalkTheme);

})(typeof window !== 'undefined' ? window : this);
