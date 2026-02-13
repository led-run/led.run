/**
 * Dot Matrix Theme
 * High-quality, skeuomorphic LED board with realistic lighting
 * Supports sign (static) and flow (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

  var DotMatrixTheme = {
    id: 'dot-matrix',

    defaults: {
      color: 'ffff00',      // Classic LED Yellow
      bg: '0a0a0a',         // Container background
      fill: '0a0a0a',       // Board surface color
      res: 20,              // Vertical resolution (dot rows)
      gap: 0.2,             // Gap between dots (0 to 1)
      glow: 0.5,            // Glow intensity
      speed: 30,            // Scroll speed (flow mode)
      direction: 'left',    // 'left' or 'right' (flow mode)
      shape: 'square',      // 'square' or 'round'
      bezel: true,          // Show frame
      font: 'monospace',    // Font for sampling
      weight: 'bold',
      flicker: 0.05,        // Subtle flickering amount
      scale: 1,
      wrap: false           // Height wraps to text content
    },

    _container: null,
    _config: null,
    _canvas: null,
    _ctx: null,
    _sampleCanvas: null,
    _sampleCtx: null,
    _rafId: null,
    _paused: false,
    _text: '',
    _mode: 'sign',
    _flowText: '',
    _scrollPos: 0,
    _lastTime: 0,
    _resizeHandler: null,
    _noiseMap: [],
    _signCols: 0,
    _signRows: 0,
    _boardEl: null,
    _flowRows: 0,
    _wrap: false,

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      var charCount = [...text].length;
      return charCount > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    init(container, text, config) {
      this._container = container;
      this._text = text;
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._scrollPos = 0;
      this._lastTime = performance.now();

      // Pre-generate noise for flickering
      this._noiseMap = Array.from({ length: 100 }, () => Math.random());

      // Wrap mode
      this._wrap = this._config.wrap === true || this._config.wrap === 'true';
      this._flowRows = 0;

      container.classList.add('theme-dot-matrix');
      container.style.backgroundColor = '#' + this._config.bg;

      // Build DOM
      this._buildUI(container);

      // Setup sampling canvas
      this._sampleCanvas = document.createElement('canvas');
      this._sampleCtx = this._sampleCanvas.getContext('2d', { willReadFrequently: true });

      // Resolve mode
      this._mode = this._resolveMode(text, this._config.mode);

      if (this._mode === 'sign') {
        this._initSign();
      } else {
        this._initFlow();
      }

      this._resizeHandler = this._onResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);

      this._startAnimation();

      // Card-type scale: wrap all children in a scaled div
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

    _buildUI(container) {
      var board = document.createElement('div');
      board.className = 'dot-matrix-board';
      container.appendChild(board);
      this._boardEl = board;

      this._canvas = document.createElement('canvas');
      this._canvas.className = 'dot-matrix-canvas';
      board.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      var overlay = document.createElement('div');
      overlay.className = 'dot-matrix-overlay';
      board.appendChild(overlay);

      var vignette = document.createElement('div');
      vignette.className = 'dot-matrix-vignette';
      board.appendChild(vignette);

      if (this._config.bezel !== false && this._config.bezel !== 'false') {
        var bezel = document.createElement('div');
        bezel.className = 'dot-matrix-bezel';
        board.appendChild(bezel);
      }

      var glare = document.createElement('div');
      glare.className = 'dot-matrix-glare';
      board.appendChild(glare);
    },

    _initSign() {
      this._onResize();
    },

    _initFlow() {
      this._flowText = ' ' + this._text + ' ';
      this._onResize();
    },

    _onResize() {
      if (this._mode === 'sign') {
        this._updateSignSampling();
      } else {
        this._updateFlowSampling();
      }
    },

    _updateSignSampling() {
      var res = parseInt(this._config.res);
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;

      // dotSize is always based on full container height
      var dotSize = h / res;
      var cols = Math.floor(w / dotSize);

      var ctx = this._sampleCtx;
      var font = this._config.font === 'monospace' ? "'Courier New', Courier, monospace" : this._config.font;
      var weight = this._config.weight;

      // Binary search for max font size that fits in cols
      var lo = 1, hi = res;
      while (lo < hi) {
        var mid = Math.ceil((lo + hi) / 2);
        ctx.font = weight + ' ' + mid + 'px ' + font;
        var tw = ctx.measureText(this._text).width;
        if (tw <= cols - 2 && mid <= res) {
          lo = mid;
        } else {
          hi = mid - 1;
        }
      }

      var rows = res;
      if (this._wrap) {
        // Measure actual text height to determine wrap rows
        ctx.font = weight + ' ' + lo + 'px ' + font;
        var metrics = ctx.measureText(this._text);
        var textHeight = lo * 0.85; // Fallback
        if (metrics.actualBoundingBoxAscent !== undefined && metrics.actualBoundingBoxDescent !== undefined) {
          textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        }
        rows = Math.min(Math.ceil(textHeight) + 4, res);
      }

      this._signRows = rows;
      this._signCols = cols;

      // Set board and canvas dimensions
      if (this._wrap) {
        var boardH = rows * dotSize;
        this._boardEl.style.height = boardH + 'px';
        this._canvas.width = w;
        this._canvas.height = boardH;
      } else {
        this._boardEl.style.height = '100%';
        this._canvas.width = w;
        this._canvas.height = h;
      }

      // Sample canvas: each pixel = one LED dot
      this._sampleCanvas.width = cols;
      this._sampleCanvas.height = rows;

      ctx.clearRect(0, 0, cols, rows);
      ctx.fillStyle = 'white';
      ctx.font = weight + ' ' + lo + 'px ' + font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this._text, cols / 2, rows / 2 + rows * 0.05);
    },

    _updateFlowSampling() {
      var res = parseInt(this._config.res);
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var font = this._config.font === 'monospace' ? "'Courier New', Courier, monospace" : this._config.font;
      var weight = this._config.weight;
      var dotSize = h / res;

      var rows = res;
      if (this._wrap) {
        // Measure text height at font size = res to determine wrap rows
        this._sampleCtx.font = weight + ' ' + res + 'px ' + font;
        var metrics = this._sampleCtx.measureText(this._flowText);
        var textHeight = res * 0.85;
        if (metrics.actualBoundingBoxAscent !== undefined && metrics.actualBoundingBoxDescent !== undefined) {
          textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        }
        rows = Math.min(Math.ceil(textHeight) + 4, res);
      }

      this._flowRows = rows;

      // Set board and canvas dimensions
      if (this._wrap) {
        var boardH = rows * dotSize;
        this._boardEl.style.height = boardH + 'px';
        this._canvas.width = w;
        this._canvas.height = boardH;
      } else {
        this._boardEl.style.height = '100%';
        this._canvas.width = w;
        this._canvas.height = h;
      }

      // Sample text at rows height (text fills the compact band)
      this._sampleCtx.font = weight + ' ' + rows + 'px ' + font;
      var textMetrics = this._sampleCtx.measureText(this._flowText);

      this._sampleCanvas.height = rows;
      this._sampleCanvas.width = Math.ceil(textMetrics.width) + 2;

      this._sampleCtx.clearRect(0, 0, this._sampleCanvas.width, this._sampleCanvas.height);
      this._sampleCtx.fillStyle = 'white';
      this._sampleCtx.font = weight + ' ' + rows + 'px ' + font;
      this._sampleCtx.textBaseline = 'middle';
      this._sampleCtx.textAlign = 'left';
      this._sampleCtx.fillText(this._flowText, 0, rows / 2 + rows * 0.05);
    },

    _startAnimation() {
      var self = this;
      function loop(now) {
        if (!self._paused) {
          var delta = Math.min((now - self._lastTime) / 1000, 0.1);
          self._lastTime = now;
          if (self._mode === 'flow') {
            self._updateFlow(delta);
          }
          self._draw();
        } else {
          self._lastTime = now;
        }
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _updateFlow(delta) {
      var speed = parseFloat(this._config.speed);
      var direction = this._config.direction === 'right' ? -1 : 1;

      this._scrollPos += speed * delta * 0.15 * direction;

      var maxScroll = this._sampleCanvas.width;
      var rows = this._flowRows || parseInt(this._config.res);
      var containerWidthInDots = this._canvas.width / (this._canvas.height / rows);

      if (this._scrollPos > maxScroll) {
        this._scrollPos = -containerWidthInDots;
      } else if (this._scrollPos < -containerWidthInDots) {
        this._scrollPos = maxScroll;
      }
    },

    _draw() {
      if (this._mode === 'sign') {
        this._drawSign();
      } else {
        this._drawFlow();
      }
    },

    _drawSign() {
      var ctx = this._ctx;
      var w = this._canvas.width;
      var h = this._canvas.height;
      var rows = this._signRows;
      var dotSize = h / rows;
      var gap = dotSize * parseFloat(this._config.gap);
      var radius = (dotSize - gap) / 2;
      var color = '#' + this._config.color;
      var shape = this._config.shape;
      var flickerAmount = parseFloat(this._config.flicker);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#' + this._config.fill;
      ctx.fillRect(0, 0, w, h);

      var cols = this._signCols;
      var imgData = this._sampleCtx.getImageData(0, 0, cols, rows);
      var data = imgData.data;
      var now = performance.now();

      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var idx = (y * cols + x) * 4;
          var alpha = data[idx + 3];
          var isOn = alpha > 128;

          var px = x * dotSize + dotSize / 2;
          var py = y * dotSize + dotSize / 2;

          var noiseIdx = (x + y + Math.floor(now / 80)) % 100;
          var brightnessMult = 1 - (this._noiseMap[noiseIdx] * flickerAmount);
          var currentOn = isOn && (Math.random() > flickerAmount * 0.05);

          this._drawLED(ctx, px, py, radius, currentOn, color, shape, brightnessMult);
        }
      }
    },

    _drawFlow() {
      var ctx = this._ctx;
      var w = this._canvas.width;
      var h = this._canvas.height;
      var rows = this._flowRows || parseInt(this._config.res);
      var dotSize = h / rows;
      var gap = dotSize * parseFloat(this._config.gap);
      var radius = (dotSize - gap) / 2;
      var color = '#' + this._config.color;
      var shape = this._config.shape;
      var flickerAmount = parseFloat(this._config.flicker);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#' + this._config.fill;
      ctx.fillRect(0, 0, w, h);

      var sampleW = Math.ceil(w / dotSize) + 1;
      var sampleH = rows;

      var scrollX = Math.floor(this._scrollPos);
      var offsetX = -(this._scrollPos % 1) * dotSize;

      var imgData = this._sampleCtx.getImageData(scrollX, 0, sampleW, sampleH);
      var data = imgData.data;

      var now = performance.now();

      for (var y = 0; y < sampleH; y++) {
        for (var x = 0; x < sampleW; x++) {
          var idx = (y * sampleW + x) * 4;
          var alpha = data[idx + 3];
          var isOn = alpha > 128;

          var px = x * dotSize + dotSize / 2 + offsetX;
          var py = y * dotSize + dotSize / 2;

          var noiseIdx = (x + y + Math.floor(now / 80)) % 100;
          var brightnessMult = 1 - (this._noiseMap[noiseIdx] * flickerAmount);
          var currentOn = isOn && (Math.random() > flickerAmount * 0.05);

          this._drawLED(ctx, px, py, radius, currentOn, color, shape, brightnessMult);
        }
      }
    },

    _drawLED(ctx, x, y, r, isOn, color, shape, brightness) {
      var glowIntensity = parseFloat(this._config.glow);

      // 1. LED Housing
      ctx.fillStyle = this._darkenColor('#' + this._config.fill, 80);
      ctx.beginPath();
      if (shape === 'square') {
        ctx.rect(x - r - 1.5, y - r - 1.5, (r + 1.5) * 2, (r + 1.5) * 2);
      } else {
        ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
      }
      ctx.fill();

      if (isOn) {
        ctx.globalAlpha = brightness;

        // 2. Multi-layered Bloom
        if (glowIntensity > 0) {
          var g1 = ctx.createRadialGradient(x, y, r, x, y, r * 8 * glowIntensity);
          g1.addColorStop(0, color + '22');
          g1.addColorStop(1, 'transparent');
          ctx.fillStyle = g1;
          ctx.beginPath();
          ctx.arc(x, y, r * 8 * glowIntensity, 0, Math.PI * 2);
          ctx.fill();

          var g2 = ctx.createRadialGradient(x, y, r, x, y, r * 3 * glowIntensity);
          g2.addColorStop(0, color + '66');
          g2.addColorStop(1, 'transparent');
          ctx.fillStyle = g2;
          ctx.beginPath();
          ctx.arc(x, y, r * 3 * glowIntensity, 0, Math.PI * 2);
          ctx.fill();
        }

        // 3. LED Surface
        var diodeGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.2, x, y, r);
        diodeGrad.addColorStop(0, '#fff');
        diodeGrad.addColorStop(0.2, color);
        diodeGrad.addColorStop(1, this._darkenColor(color, 40));

        ctx.fillStyle = diodeGrad;
        ctx.beginPath();
        if (shape === 'square') {
          ctx.rect(x - r, y - r, r * 2, r * 2);
        } else {
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();

        // 4. Lens Specular
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1.0;
      } else {
        // Off State
        var bg = '#' + this._config.fill;
        var offGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        offGrad.addColorStop(0, this._lightenColor(bg, 60));
        offGrad.addColorStop(1, bg);

        ctx.fillStyle = offGrad;
        ctx.beginPath();
        if (shape === 'square') {
          ctx.rect(x - r, y - r, r * 2, r * 2);
        } else {
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    },

    _darkenColor(hex, percent) {
      hex = hex.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);

      r = Math.floor(r * (100 - percent) / 100);
      g = Math.floor(g * (100 - percent) / 100);
      b = Math.floor(b * (100 - percent) / 100);

      return 'rgb(' + r + ',' + g + ',' + b + ')';
    },

    _lightenColor(hex, percent) {
      hex = hex.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);

      r = Math.min(255, Math.floor(r + (255 - r) * percent / 100));
      g = Math.min(255, Math.floor(g + (255 - g) * percent / 100));
      b = Math.min(255, Math.floor(b + (255 - b) * percent / 100));

      return 'rgb(' + r + ',' + g + ',' + b + ')';
    },

    togglePause() {
      this._paused = !this._paused;
      return this._paused;
    },

    isPaused() {
      return this._paused;
    },

    destroy() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      this._container.classList.remove('theme-dot-matrix');
      this._container.innerHTML = '';
      this._container = null;
      this._canvas = null;
      this._ctx = null;
      this._sampleCanvas = null;
      this._sampleCtx = null;
      this._config = null;
      this._mode = 'sign';
      this._flowText = '';
      this._signCols = 0;
      this._signRows = 0;
      this._boardEl = null;
      this._flowRows = 0;
      this._wrap = false;
    }
  };

  TextManager.register(DotMatrixTheme);

})(typeof window !== 'undefined' ? window : this);
