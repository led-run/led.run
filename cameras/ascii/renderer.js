/**
 * Camera Effect: ASCII
 * Real-time ASCII art from camera feed (Canvas)
 */
;(function() {
  'use strict';

  // ASCII character ramp from dark to light
  var CHARS_DENSE = '@%#*+=-:. ';
  var CHARS_STANDARD = '@#S%?*+;:,. ';

  var effect = {
    id: 'ascii',
    defaults: { facing: 'user', mirror: true, fps: 20, color: '00ff41', bg: '0a0a0a', density: 6, invert: false },
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
      container.style.background = '#' + (config.bg || '0a0a0a');
      container.style.overflow = 'hidden';

      var canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      // Temp canvas for downsampling
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
    },

    _render: function() {
      var self = this;
      var lastTime = 0;
      var interval = 1000 / (this._config.fps || 20);

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
        var inverted = !!self._config.invert;

        // Character cell size based on density
        var density = self._config.density || 6;
        var cellW = Math.max(4, 14 - density);
        var cellH = cellW * 1.8; // Character aspect ratio

        var cols = Math.floor(cw / cellW);
        var rows = Math.floor(ch / cellH);
        if (cols < 1 || rows < 1) return;

        // Downsample video to grid size
        self._tmpCanvas.width = cols;
        self._tmpCanvas.height = rows;

        var vw = video.videoWidth;
        var vh = video.videoHeight;

        self._tmpCtx.save();
        var mirror = self._config.mirror;
        if (mirror === undefined) mirror = (self._config.facing !== 'environment');
        if (mirror) {
          self._tmpCtx.translate(cols, 0);
          self._tmpCtx.scale(-1, 1);
        }
        self._tmpCtx.drawImage(video, 0, 0, cols, rows);
        self._tmpCtx.restore();

        var imgData = self._tmpCtx.getImageData(0, 0, cols, rows);
        var pixels = imgData.data;

        // Determine colors based on invert
        var fgColor = inverted ? (self._config.bg || '0a0a0a') : (self._config.color || '00ff41');
        var bgColor = inverted ? (self._config.color || '00ff41') : (self._config.bg || '0a0a0a');

        // Clear with background
        ctx.fillStyle = '#' + bgColor;
        ctx.fillRect(0, 0, cw, ch);

        // Draw ASCII
        var chars = CHARS_STANDARD;
        ctx.fillStyle = '#' + fgColor;
        ctx.font = cellH + 'px monospace';
        ctx.textBaseline = 'top';

        for (var row = 0; row < rows; row++) {
          var line = '';
          for (var col = 0; col < cols; col++) {
            var i = (row * cols + col) * 4;
            var brightness = (pixels[i] * 0.299 + pixels[i+1] * 0.587 + pixels[i+2] * 0.114) / 255;
            // When inverted, reverse the brightness mapping
            if (inverted) brightness = 1 - brightness;
            var charIdx = Math.floor((1 - brightness) * (chars.length - 1));
            line += chars[charIdx];
          }
          ctx.fillText(line, 0, row * cellH);
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
