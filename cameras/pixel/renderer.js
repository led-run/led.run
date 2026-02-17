/**
 * Camera Effect: Pixel
 * Pixelated/mosaic camera feed (Canvas)
 */
;(function() {
  'use strict';

  var effect = {
    id: 'pixel',
    defaults: { facing: 'user', mirror: true, fps: 30, blockSize: 8, color: 'ffffff', bg: '000000', gap: 0 },
    _canvas: null,
    _ctx: null,
    _container: null,
    _config: null,
    _engine: null,
    _raf: null,
    _resizeHandler: null,
    _tmpCanvas: null,
    _tmpCtx: null,

    init: function(container, config, cameraEngine) {
      this._container = container;
      this._config = config;
      this._engine = cameraEngine;

      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.background = '#' + (config.bg || '000000');
      container.style.overflow = 'hidden';

      var canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.imageRendering = 'pixelated';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');
      this._ctx.imageSmoothingEnabled = false;

      this._tmpCanvas = document.createElement('canvas');
      this._tmpCtx = this._tmpCanvas.getContext('2d');

      this._resize();
      this._render();

      var self = this;
      this._resizeHandler = function() { self._resize(); };
      window.addEventListener('resize', this._resizeHandler);
    },

    _resize: function() {
      if (!this._canvas || !this._container) return;
      this._canvas.width = this._container.clientWidth;
      this._canvas.height = this._container.clientHeight;
      this._ctx.imageSmoothingEnabled = false;
    },

    _render: function() {
      var self = this;
      var lastTime = 0;
      var interval = 1000 / (this._config.fps || 30);

      function loop(time) {
        self._raf = requestAnimationFrame(loop);
        if (time - lastTime < interval) return;
        lastTime = time;

        if (!self._engine || !self._engine.isRunning()) return;

        var video = self._engine.getVideo();
        if (!video || !video.videoWidth) return;

        var ctx = self._ctx;
        var cw = self._canvas.width;
        var ch = self._canvas.height;
        var blockSize = self._config.blockSize || 8;
        var gap = parseInt(self._config.gap, 10) || 0;

        // Downsample to tiny resolution
        var smallW = Math.max(1, Math.floor(cw / blockSize));
        var smallH = Math.max(1, Math.floor(ch / blockSize));

        self._tmpCanvas.width = smallW;
        self._tmpCanvas.height = smallH;

        self._tmpCtx.save();
        var mirror = self._config.mirror;
        if (mirror === undefined) mirror = (self._config.facing !== 'environment');
        if (mirror) {
          self._tmpCtx.translate(smallW, 0);
          self._tmpCtx.scale(-1, 1);
        }

        // Cover-fit
        var vw = video.videoWidth;
        var vh = video.videoHeight;
        var scale = Math.max(smallW / vw, smallH / vh);
        var sw = smallW / scale;
        var sh = smallH / scale;
        var sx = (vw - sw) / 2;
        var sy = (vh - sh) / 2;

        self._tmpCtx.drawImage(video, sx, sy, sw, sh, 0, 0, smallW, smallH);
        self._tmpCtx.restore();

        if (gap > 0) {
          // Draw individual blocks with gaps
          var imgData = self._tmpCtx.getImageData(0, 0, smallW, smallH);
          var pixels = imgData.data;
          ctx.fillStyle = '#' + (self._config.bg || '000000');
          ctx.fillRect(0, 0, cw, ch);

          var drawSize = blockSize - gap;
          if (drawSize < 1) drawSize = 1;

          for (var row = 0; row < smallH; row++) {
            for (var col = 0; col < smallW; col++) {
              var i = (row * smallW + col) * 4;
              ctx.fillStyle = 'rgb(' + pixels[i] + ',' + pixels[i+1] + ',' + pixels[i+2] + ')';
              ctx.fillRect(col * blockSize, row * blockSize, drawSize, drawSize);
            }
          }
        } else {
          // Scale back up with nearest-neighbor (original fast path)
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(self._tmpCanvas, 0, 0, cw, ch);
        }
      }

      this._raf = requestAnimationFrame(loop);
    },

    destroy: function() {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      this._canvas = null;
      this._ctx = null;
      this._tmpCanvas = null;
      this._tmpCtx = null;
      this._container = null;
      this._engine = null;
    }
  };

  CameraManager.register(effect);
})();
