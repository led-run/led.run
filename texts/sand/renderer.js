/**
 * Sand Theme - Redesigned
 * Exquisite beach sand writing with deep displacement, dynamic wetness, 
 * animated waves with foam/bubbles, and coastal details (shells/mica).
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

  function generateSandTexture(w, h, baseColor, detailLevel) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');

    // Base sand color
    ctx.fillStyle = 'rgb(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ')';
    ctx.fillRect(0, 0, w, h);

    var imgData = ctx.getImageData(0, 0, w, h);
    var data = imgData.data;

    // High-frequency grain noise
    var dRatio = Math.max(0, detailLevel) / 5;
    var noiseAmp = 45 * dRatio;
    for (var i = 0; i < data.length; i += 4) {
      var noise = (Math.random() - 0.5) * noiseAmp;
      data[i]     = Math.max(0, Math.min(255, data[i] + noise + Math.random() * 8 * dRatio));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise + Math.random() * 4 * dRatio));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise - Math.random() * 6 * dRatio));
    }
    ctx.putImageData(imgData, 0, 0);

    // Organic clumps / ripples (low frequency noise)
    ctx.globalAlpha = 0.08;
    for (var r = 0; r < 30; r++) {
      var rx = Math.random() * w;
      var ry = Math.random() * h;
      var rs = Math.random() * 150 + 50;
      var rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rs);
      rg.addColorStop(0, 'rgba(0,0,0,0.4)');
      rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }

    // Mica sparkles
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255, 250, 210, 0.25)';
    var micaCount = Math.floor(w * h * 0.0008 * dRatio);
    for (var m = 0; m < micaCount; m++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
    }

    // Random shells / pebbles
    ctx.globalAlpha = 0.4;
    var detailCount = Math.floor(((w * h) / 150000 + 2) * dRatio);
    for (var d = 0; d < detailCount; d++) {
      var dx = Math.random() * w;
      var dy = Math.random() * h;
      var ds = Math.random() * 6 + 4;
      var dr = Math.random() * Math.PI * 2;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(dr);
      // Simple shell shape
      ctx.fillStyle = 'rgba(240, 220, 200, 0.8)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(ds, -ds, ds*2, 0, 0, ds);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    return canvas;
  }

  var SandTheme = {
    id: 'sand',

    defaults: {
      color: '8b7355',
      bg: 'd4b896',
      fill: 'd4b896',
      font: "cursive",
      speed: 60,
      direction: 'left',
      scale: 1,
      depth: 10,
      wetness: 6,
      foam: 5,
      showWaves: true,
      detail: 5
    },

    _container: null,
    _config: null,
    _canvas: null,
    _ctx: null,
    _sampleCanvas: null,
    _sampleCtx: null,
    _sandTexture: null,
    _rafId: null,
    _paused: false,
    _text: '',
    _mode: null,
    _flowText: '',
    _scrollPos: 0,
    _lastTime: 0,
    _resizeHandler: null,
    _carvingCanvas: null,
    _carvingDirty: true,
    _waveTime: 0,

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
      this._waveTime = 0;
      this._lastTime = performance.now();
      this._carvingDirty = true;

      container.classList.add('theme-sand');
      container.style.backgroundColor = '#' + this._config.bg;

      this._canvas = document.createElement('canvas');
      this._canvas.className = 'sand-canvas';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._sampleCanvas = document.createElement('canvas');
      this._sampleCtx = this._sampleCanvas.getContext('2d', { willReadFrequently: true });

      this._mode = this._resolveMode(text, this._config.mode);
      if (this._mode === 'flow') {
        this._flowText = ' ' + this._text + ' ';
      }

      this._resizeCanvas();
      this._startAnimation();

      this._resizeHandler = this._resizeCanvas.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _resizeCanvas: function() {
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      if (w === 0 || h === 0) return;
      this._canvas.width = w;
      this._canvas.height = h;

      var bgRgb = hexToRgb(this._config.bg || this.defaults.bg);
      var detailLevel = Math.max(0, Math.min(10, Number(this._config.detail)));
      if (isNaN(detailLevel)) detailLevel = this.defaults.detail;
      this._sandTexture = generateSandTexture(w, h, bgRgb, detailLevel);

      this._prepareTextSample();
      this._carvingDirty = true;
    },

    _prepareTextSample: function() {
      var w = this._canvas.width;
      var h = this._canvas.height;
      var font = this._config.font || this.defaults.font;
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));

      if (this._mode === 'sign') {
        var padding = Math.min(w, h) * 0.15;
        var fontSize = TextEngine.autoFit(this._text, this._container, {
          fontFamily: font,
          fontWeight: '400',
          padding: padding
        });
        fontSize = Math.floor(fontSize * scale);

        this._sampleCanvas.width = w;
        this._sampleCanvas.height = h;
        this._sampleCtx.clearRect(0, 0, w, h);
        this._sampleCtx.font = '400 ' + fontSize + 'px ' + font;
        this._sampleCtx.fillStyle = 'white';
        this._sampleCtx.textAlign = 'center';
        this._sampleCtx.textBaseline = 'middle';
        this._sampleCtx.fillText(this._text, w / 2, h / 2);
      } else {
        var flowFontSize = Math.floor(h * 0.5 * scale);
        this._sampleCtx.font = '400 ' + flowFontSize + 'px ' + font;
        var tw = this._sampleCtx.measureText(this._flowText).width;
        this._sampleCanvas.width = Math.ceil(tw) + 10;
        this._sampleCanvas.height = h;
        this._sampleCtx.clearRect(0, 0, this._sampleCanvas.width, h);
        this._sampleCtx.font = '400 ' + flowFontSize + 'px ' + font;
        this._sampleCtx.fillStyle = 'white';
        this._sampleCtx.textAlign = 'left';
        this._sampleCtx.textBaseline = 'middle';
        this._sampleCtx.fillText(this._flowText, 0, h / 2);
      }
    },

    _startAnimation: function() {
      var self = this;
      function loop(now) {
        if (!self._container) return;
        var delta = Math.min((now - self._lastTime) / 1000, 0.1);
        self._lastTime = now;
        
        if (!self._paused) {
          if (self._mode === 'flow') {
            var speed = parseFloat(self._config.speed) || self.defaults.speed;
            var direction = self._config.direction === 'right' ? -1 : 1;
            self._scrollPos += speed * delta * 0.5 * direction;
            self._carvingDirty = true;
          }
          self._waveTime += delta;
        }
        
        self._draw();
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _draw: function() {
      var ctx = this._ctx;
      var w = this._canvas.width;
      var h = this._canvas.height;
      if (w === 0 || h === 0) return;

      var config = this._config;
      var depth = Math.max(1, Math.min(15, Number(config.depth) || this.defaults.depth));
      var wetness = Math.max(0, Math.min(10, Number(config.wetness) || this.defaults.wetness));
      var showWaves = config.showWaves !== false && config.showWaves !== 'false';
      var time = this._waveTime;

      // 1. Base Sand Texture
      if (this._sandTexture) {
        ctx.drawImage(this._sandTexture, 0, 0, w, h);
      }

      // 2. Sunlight & Shadows
      var sunGrad = ctx.createRadialGradient(w * 0.8, h * 0.1, 0, w * 0.8, h * 0.1, w * 1.2);
      sunGrad.addColorStop(0, 'rgba(255, 240, 180, 0.12)');
      sunGrad.addColorStop(0.5, 'rgba(255, 210, 150, 0.05)');
      sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);

      // 3. Wet Sand Darkening
      if (showWaves && wetness > 0) {
        var waveY = h * 0.88 + Math.sin(time * 0.8) * 15;
        var wetHeight = h * (wetness / 10) * 0.5;
        var wetGrad = ctx.createLinearGradient(0, waveY - wetHeight, 0, waveY + 20);
        wetGrad.addColorStop(0, 'rgba(60, 40, 20, 0)');
        wetGrad.addColorStop(0.6, 'rgba(60, 40, 20, ' + (wetness * 0.03) + ')');
        wetGrad.addColorStop(1, 'rgba(50, 30, 10, ' + (wetness * 0.05) + ')');
        ctx.fillStyle = wetGrad;
        ctx.fillRect(0, waveY - wetHeight, w, wetHeight + 50);
      }

      // 4. Carved Text
      if (this._mode === 'sign') {
        this._drawCarvingSign(ctx, w, h, depth);
      } else {
        this._drawCarvingFlow(ctx, w, h, depth);
      }

      // 5. Animated Waves
      if (showWaves) {
        this._drawWaves(ctx, w, h, time);
      }
    },

    _drawCarvingSign: function(ctx, w, h, depth) {
      if (this._carvingDirty || !this._carvingCanvas || this._carvingCanvas.width !== w || this._carvingCanvas.height !== h) {
        this._buildCarvingCache(w, h, depth);
        this._carvingDirty = false;
      }
      ctx.drawImage(this._carvingCanvas, 0, 0);
    },

    _drawCarvingFlow: function(ctx, w, h, depth) {
      if (!this._flowMaskCanvas) this._flowMaskCanvas = document.createElement('canvas');
      var maskCanvas = this._flowMaskCanvas;
      if (maskCanvas.width !== w || maskCanvas.height !== h) {
        maskCanvas.width = w; maskCanvas.height = h;
      }
      
      var sw = this._sampleCanvas.width;
      var scrollPx = this._scrollPos;
      if (scrollPx > sw) this._scrollPos -= sw;
      else if (scrollPx < -sw) this._scrollPos += sw;

      var maskCtx = maskCanvas.getContext('2d');
      maskCtx.clearRect(0, 0, w, h);
      var startX = -(scrollPx % sw);
      if (startX > 0) startX -= sw;
      for (var x = startX; x < w; x += sw) {
        maskCtx.drawImage(this._sampleCanvas, x, 0);
      }
      this._applyCarving(ctx, maskCanvas, w, h, depth);
    },

    _buildCarvingCache: function(w, h, depth) {
      if (!this._carvingCanvas) this._carvingCanvas = document.createElement('canvas');
      this._carvingCanvas.width = w;
      this._carvingCanvas.height = h;
      this._applyCarving(this._carvingCanvas.getContext('2d'), this._sampleCanvas, w, h, depth);
    },

    _applyCarving: function(ctx, maskCanvas, w, h, depth) {
      var d = Math.min(depth / 6, 2.5);
      var offset = Math.max(2, d * 2.5);
      ctx.clearRect(0, 0, w, h);

      // 1. Base carved pit — darken the text interior
      ctx.save();
      ctx.globalAlpha = Math.min(0.55 * d, 0.9);
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = 'rgb(90, 65, 35)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // 2. Inner shadow (bottom-right inside the carving)
      ctx.save();
      ctx.globalAlpha = Math.min(0.6 * d, 0.85);
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(maskCanvas, -offset, -offset);
      ctx.globalCompositeOperation = 'source-out';
      ctx.fillStyle = 'rgb(50, 30, 10)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // 3. Rim highlight (sun-facing top-left edge, pushed sand)
      ctx.save();
      ctx.globalAlpha = Math.min(0.75 * d, 0.95);
      ctx.drawImage(maskCanvas, -offset * 0.8, -offset * 0.8);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = 'rgb(255, 248, 220)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // 4. Outer drop shadow (bottom-right, displaced sand pile)
      ctx.save();
      ctx.globalAlpha = Math.min(0.35 * d, 0.6);
      ctx.drawImage(maskCanvas, offset * 0.7, offset * 0.7);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = 'rgb(100, 75, 45)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    },

    _drawWaves: function(ctx, w, h, time) {
      var foamLevel = Math.max(0, Math.min(10, Number(this._config.foam) || this.defaults.foam));
      var waveBaseY = h * 0.9;
      var waveRange = 25;

      for (var i = 0; i < 2; i++) {
        var t = time * 0.7 + i * 1.5;
        var yOff = Math.sin(t) * waveRange;
        var alpha = 0.25 - i * 0.1;
        
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var x = 0; x <= w; x += 10) {
          var xWave = Math.sin(x * 0.01 + t) * 8;
          ctx.lineTo(x, waveBaseY + yOff + xWave);
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        var grad = ctx.createLinearGradient(0, waveBaseY + yOff - 20, 0, h);
        grad.addColorStop(0, 'rgba(180, 230, 255, ' + alpha + ')');
        grad.addColorStop(0.5, 'rgba(80, 160, 220, ' + (alpha * 0.8) + ')');
        grad.addColorStop(1, 'rgba(40, 100, 180, ' + (alpha * 0.5) + ')');
        ctx.fillStyle = grad;
        ctx.fill();

        // Foam edge
        if (i === 0 && foamLevel > 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.4 * (foamLevel/10)) + ')';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Bubble particles
          ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.2 * (foamLevel/10)) + ')';
          for (var b = 0; b < w; b += 25) {
            var bx = b + Math.sin(t + b) * 15;
            var by = waveBaseY + yOff + Math.sin(bx * 0.01 + t) * 8 + Math.random() * 5;
            ctx.beginPath();
            ctx.arc(bx, by, Math.random() * 3 + 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
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
      this._container.classList.remove('theme-sand');
      this._container.innerHTML = '';
      this._container = null;
      this._canvas = null;
      this._ctx = null;
      this._sampleCanvas = null;
      this._sampleCtx = null;
      this._sandTexture = null;
      this._carvingCanvas = null;
      this._flowMaskCanvas = null;
    }
  };

  TextManager.register(SandTheme);

})(typeof window !== 'undefined' ? window : this);
