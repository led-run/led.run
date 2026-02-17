/**
 * Embroidery Theme - Redesigned
 * High-fidelity cross-stitch with fiber-textured threads,
 * fabric weave texture, and a detailed wooden embroidery hoop.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  function hexToRgb(hex) {
    hex = (hex || '').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.substring(0, 2), 16) || 0;
    var g = parseInt(hex.substring(2, 4), 16) || 0;
    var b = parseInt(hex.substring(4, 6), 16) || 0;
    return { r: r, g: g, b: b };
  }

  var EmbroideryTheme = {
    id: 'embroidery',

    defaults: {
      color: 'cc3344',
      bg: 'e8dcc8',
      fill: 'f5f0e8',
      font: 'monospace',
      speed: 60,
      direction: 'left',
      scale: 1,
      stitch: 24,
      fabric: 'f0ead8',
      hoop: true,
      tension: 4
    },

    _container: null,
    _config: null,
    _canvas: null,
    _ctx: null,
    _sampleCanvas: null,
    _sampleCtx: null,
    _fabricCanvas: null,
    _paused: false,
    _text: '',
    _mode: null,
    _scrollPos: 0,
    _lastTime: 0,
    _rafId: null,
    _resizeHandler: null,
    _cols: 0,
    _rows: 0,
    _cellSize: 0,
    _flowSampleWidth: 0,

    init: function(container, text, config) {
      this._container = container;
      this._text = text;
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._scrollPos = 0;
      this._lastTime = performance.now();

      container.classList.add('theme-embroidery');
      container.style.backgroundColor = '#' + this._config.bg;

      this._canvas = document.createElement('canvas');
      this._canvas.className = 'embroidery-canvas';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._sampleCanvas = document.createElement('canvas');
      this._sampleCtx = this._sampleCanvas.getContext('2d', { willReadFrequently: true });

      this._mode = this._resolveMode(text, this._config.mode);
      this._resizeCanvas();
      this._startAnimation();

      this._resizeHandler = this._resizeCanvas.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _resolveMode: function(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _resizeCanvas: function() {
      var w = this._container.clientWidth, h = this._container.clientHeight;
      if (w === 0 || h === 0) return;
      this._canvas.width = w;
      this._canvas.height = h;

      var rows = Math.max(8, Math.min(60, Number(this._config.stitch) || 24));
      var cellSize = h / rows;
      var cols = Math.ceil(w / cellSize);
      this._rows = rows;
      this._cols = cols;
      this._cellSize = cellSize;

      this._buildFabricTexture(w, h, cellSize);
      this._prepareSample();
    },

    _buildFabricTexture: function(w, h, cellSize) {
      this._fabricCanvas = document.createElement('canvas');
      this._fabricCanvas.width = w;
      this._fabricCanvas.height = h;
      var ctx = this._fabricCanvas.getContext('2d');
      var fabric = hexToRgb(this._config.fabric || this.defaults.fabric);

      // Base fabric color
      ctx.fillStyle = 'rgb(' + fabric.r + ',' + fabric.g + ',' + fabric.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Woven texture — alternating slightly lighter/darker squares
      for (var gy = 0; gy < h; gy += cellSize) {
        for (var gx = 0; gx < w; gx += cellSize) {
          var checker = ((Math.floor(gx / cellSize) + Math.floor(gy / cellSize)) % 2 === 0);
          ctx.fillStyle = checker ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.02)';
          ctx.fillRect(gx, gy, cellSize, cellSize);
        }
      }

      // Horizontal threads
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.5;
      for (var y = 0; y <= h; y += cellSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // Vertical threads
      for (var x = 0; x <= w; x += cellSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }

      // Tiny holes at grid intersections (Aida cloth holes)
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      var holeR = Math.max(0.8, cellSize * 0.06);
      for (var hy = 0; hy <= h; hy += cellSize) {
        for (var hx = 0; hx <= w; hx += cellSize) {
          ctx.beginPath();
          ctx.arc(hx, hy, holeR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    _prepareSample: function() {
      var rows = this._rows, cols = this._cols;
      var sCtx = this._sampleCtx;

      if (this._mode === 'sign') {
        // Render text at grid resolution for pixel-accurate stitching
        this._sampleCanvas.width = cols;
        this._sampleCanvas.height = rows;
        sCtx.clearRect(0, 0, cols, rows);
        sCtx.fillStyle = 'white';
        // Use a bigger temporary canvas for better text quality, then downscale
        var textScale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
        var scale = 8;
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = cols * scale;
        tmpCanvas.height = rows * scale;
        var tmpCtx = tmpCanvas.getContext('2d');
        var font = this._config.font || 'monospace';
        var fontSize = TextEngine.autoFit(this._text,
          { clientWidth: cols * scale, clientHeight: rows * scale },
          { fontFamily: font, fontWeight: 'bold', padding: Math.floor(scale * 1.5) }
        );
        tmpCtx.font = 'bold ' + Math.floor(fontSize * textScale) + 'px ' + font;
        tmpCtx.fillStyle = 'white';
        tmpCtx.textAlign = 'center';
        tmpCtx.textBaseline = 'middle';
        tmpCtx.fillText(this._text, (cols * scale) / 2, (rows * scale) / 2);
        // Downscale to grid resolution
        sCtx.drawImage(tmpCanvas, 0, 0, cols, rows);
      } else {
        // Flow mode — render text at row-height resolution
        var flowScale = 4;
        var flowH = rows * flowScale;
        var font2 = this._config.font || 'monospace';
        var textScale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
        var flowFontSize = Math.floor(flowH * 0.7 * textScale);
        sCtx.font = 'bold ' + flowFontSize + 'px ' + font2;
        var textStr = this._text + '   ';
        var tw = sCtx.measureText(textStr).width;
        var sampleW = Math.ceil(tw);
        this._sampleCanvas.width = sampleW;
        this._sampleCanvas.height = flowH;
        sCtx.clearRect(0, 0, sampleW, flowH);
        sCtx.font = 'bold ' + flowFontSize + 'px ' + font2;
        sCtx.fillStyle = 'white';
        sCtx.textAlign = 'left';
        sCtx.textBaseline = 'middle';
        sCtx.fillText(textStr, 0, flowH / 2);
        // Store width in grid-cell units for scroll wrapping
        this._flowSampleWidth = sampleW;
      }
    },

    _startAnimation: function() {
      var self = this;
      function loop(now) {
        if (!self._container) return;
        var delta = Math.min((now - self._lastTime) / 1000, 0.1);
        self._lastTime = now;
        if (!self._paused && self._mode === 'flow') {
          var speed = parseFloat(self._config.speed) || self.defaults.speed;
          var direction = self._config.direction === 'right' ? -1 : 1;
          self._scrollPos += speed * delta * 0.3 * direction;
        }
        self._draw();
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _draw: function() {
      var ctx = this._ctx, w = this._canvas.width, h = this._canvas.height;
      var cellSize = this._cellSize;
      var rows = this._rows, cols = this._cols;
      var color = hexToRgb(this._config.color);

      // 1. Fabric background
      if (this._fabricCanvas) {
        ctx.drawImage(this._fabricCanvas, 0, 0);
      }

      // 2. Cross-stitches
      if (this._mode === 'sign') {
        this._drawSignStitches(ctx, cols, rows, cellSize, color);
      } else {
        this._drawFlowStitches(ctx, cols, rows, cellSize, color, w);
      }

      // 3. Embroidery hoop
      if (this._config.hoop !== false && this._config.hoop !== 'false') {
        this._drawHoop(ctx, w, h);
      }
    },

    _drawSignStitches: function(ctx, cols, rows, cellSize, color) {
      var sw = this._sampleCanvas.width, sh = this._sampleCanvas.height;
      var data = this._sampleCtx.getImageData(0, 0, sw, sh).data;
      for (var sy = 0; sy < sh; sy++) {
        for (var sx = 0; sx < sw; sx++) {
          if (data[(sy * sw + sx) * 4 + 3] > 80) {
            this._drawStitch(ctx, sx * cellSize, sy * cellSize, cellSize, color);
          }
        }
      }
    },

    _drawFlowStitches: function(ctx, cols, rows, cellSize, color, canvasW) {
      var sw = this._flowSampleWidth;
      var sh = this._sampleCanvas.height;
      if (sw === 0 || sh === 0) return;
      var data = this._sampleCtx.getImageData(0, 0, sw, sh).data;
      var scroll = this._scrollPos;
      var flowScale = sh / rows;

      for (var gy = 0; gy < rows; gy++) {
        var srcY = Math.floor(gy * flowScale + flowScale * 0.5);
        if (srcY >= sh) srcY = sh - 1;
        for (var gx = 0; gx < cols + 1; gx++) {
          var srcXf = (gx * flowScale + scroll) % sw;
          if (srcXf < 0) srcXf += sw;
          var srcX = Math.floor(srcXf);
          if (srcX >= sw) srcX = sw - 1;
          if (data[(srcY * sw + srcX) * 4 + 3] > 80) {
            this._drawStitch(ctx, gx * cellSize, gy * cellSize, cellSize, color);
          }
        }
      }
    },

    _drawStitch: function(ctx, x, y, size, rgb) {
      var p = size * 0.12;
      var lw = Math.max(1.5, size * 0.18);
      var tension = Math.max(0, Math.min(10, Number(this._config.tension)));
      if (isNaN(tension)) tension = this.defaults.tension;
      var jitter = (10 - tension) * size * 0.015;

      // Random offset function for stitch endpoints
      function j() { return jitter > 0 ? (Math.random() - 0.5) * 2 * jitter : 0; }

      ctx.save();
      ctx.lineCap = 'round';

      // Shadow pass
      ctx.lineWidth = lw + 0.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.moveTo(x + p + 1 + j(), y + p + 1 + j());
      ctx.lineTo(x + size - p + 1 + j(), y + size - p + 1 + j());
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + size - p + 1 + j(), y + p + 1 + j());
      ctx.lineTo(x + p + 1 + j(), y + size - p + 1 + j());
      ctx.stroke();

      // Bottom stroke (\ direction) — slightly darker
      ctx.lineWidth = lw;
      var dr = Math.max(0, rgb.r - 30), dg = Math.max(0, rgb.g - 30), db = Math.max(0, rgb.b - 30);
      ctx.strokeStyle = 'rgb(' + dr + ',' + dg + ',' + db + ')';
      ctx.beginPath();
      ctx.moveTo(x + p + j(), y + p + j());
      ctx.lineTo(x + size - p + j(), y + size - p + j());
      ctx.stroke();

      // Top stroke (/ direction) — main color, sits on top
      ctx.strokeStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
      ctx.beginPath();
      ctx.moveTo(x + size - p + j(), y + p + j());
      ctx.lineTo(x + p + j(), y + size - p + j());
      ctx.stroke();

      // Thread highlight on the top stroke
      ctx.lineWidth = Math.max(0.5, lw * 0.25);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(x + size - p + j(), y + p + j());
      ctx.lineTo(x + p + j(), y + size - p + j());
      ctx.stroke();

      ctx.restore();
    },

    _drawHoop: function(ctx, w, h) {
      var cx = w / 2, cy = h / 2;
      var r = Math.min(w, h) * 0.44;
      var ringW = Math.max(6, Math.min(w, h) * 0.025);

      ctx.save();

      // Outer shadow
      ctx.beginPath();
      ctx.arc(cx, cy, r + ringW * 0.5, 0, Math.PI * 2);
      ctx.lineWidth = ringW + 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.stroke();

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + ringW * 0.5, 0, Math.PI * 2);
      ctx.lineWidth = ringW;
      var outerGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      outerGrad.addColorStop(0, '#c8944e');
      outerGrad.addColorStop(0.3, '#e0b878');
      outerGrad.addColorStop(0.5, '#d4a460');
      outerGrad.addColorStop(0.7, '#c08840');
      outerGrad.addColorStop(1, '#b07830');
      ctx.strokeStyle = outerGrad;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, r - ringW * 0.5, 0, Math.PI * 2);
      ctx.lineWidth = ringW * 0.7;
      var innerGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      innerGrad.addColorStop(0, '#b88040');
      innerGrad.addColorStop(0.5, '#d4a060');
      innerGrad.addColorStop(1, '#a07030');
      ctx.strokeStyle = innerGrad;
      ctx.stroke();

      // Wood grain lines on outer ring
      ctx.globalAlpha = 0.08;
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#000';
      for (var g = 0; g < 12; g++) {
        var angle = (g / 12) * Math.PI * 2;
        var grainR = r + ringW * (0.2 * Math.sin(angle * 3));
        ctx.beginPath();
        ctx.arc(cx, cy, grainR, angle, angle + Math.PI * 0.3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Tightening screw at top
      var screwW = Math.max(8, ringW * 1.8);
      var screwH = Math.max(10, ringW * 2.2);
      var screwX = cx - screwW / 2;
      var screwY = cy - r - ringW - screwH * 0.4;

      // Screw body
      var screwGrad = ctx.createLinearGradient(screwX, screwY, screwX + screwW, screwY);
      screwGrad.addColorStop(0, '#999');
      screwGrad.addColorStop(0.3, '#ccc');
      screwGrad.addColorStop(0.5, '#ddd');
      screwGrad.addColorStop(0.7, '#bbb');
      screwGrad.addColorStop(1, '#888');
      ctx.fillStyle = screwGrad;
      // Rounded rect
      var sr = 3;
      ctx.beginPath();
      ctx.moveTo(screwX + sr, screwY);
      ctx.lineTo(screwX + screwW - sr, screwY);
      ctx.arcTo(screwX + screwW, screwY, screwX + screwW, screwY + sr, sr);
      ctx.lineTo(screwX + screwW, screwY + screwH - sr);
      ctx.arcTo(screwX + screwW, screwY + screwH, screwX + screwW - sr, screwY + screwH, sr);
      ctx.lineTo(screwX + sr, screwY + screwH);
      ctx.arcTo(screwX, screwY + screwH, screwX, screwY + screwH - sr, sr);
      ctx.lineTo(screwX, screwY + sr);
      ctx.arcTo(screwX, screwY, screwX + sr, screwY, sr);
      ctx.fill();

      // Screw slot
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - screwW * 0.25, screwY + screwH * 0.5);
      ctx.lineTo(cx + screwW * 0.25, screwY + screwH * 0.5);
      ctx.stroke();

      ctx.restore();
    },

    togglePause: function() {
      this._paused = !this._paused;
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this._container.classList.remove('theme-embroidery');
      this._container.innerHTML = '';
      this._container = null;
      this._canvas = null;
      this._ctx = null;
      this._sampleCanvas = null;
      this._sampleCtx = null;
      this._fabricCanvas = null;
    }
  };

  TextManager.register(EmbroideryTheme);

})(typeof window !== 'undefined' ? window : this);
