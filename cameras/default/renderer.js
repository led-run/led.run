/**
 * Camera Effect: Default
 * Mirror view — direct camera feed display (Canvas)
 */
;(function() {
  'use strict';

  var effect = {
    id: 'default',
    defaults: { facing: 'user', mirror: true, fps: 30, color: 'ffffff', bg: '000000', vignette: 0 },
    _canvas: null,
    _ctx: null,
    _container: null,
    _config: null,
    _engine: null,
    _raf: null,
    _resizeHandler: null,

    init: function(container, config, cameraEngine) {
      this._container = container;
      this._config = config;
      this._engine = cameraEngine;

      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.background = '#' + (config.bg || '000');
      container.style.overflow = 'hidden';

      var canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.objectFit = 'cover';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

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
      var interval = 1000 / (this._config.fps || 30);

      function loop(time) {
        self._raf = requestAnimationFrame(loop);
        if (time - lastTime < interval) return;
        lastTime = time;

        if (!self._engine || !self._engine.isRunning()) return;

        var video = self._engine.getVideo();
        if (!video) return;

        var ctx = self._ctx;
        var cw = self._canvas.width;
        var ch = self._canvas.height;
        var vw = video.videoWidth;
        var vh = video.videoHeight;
        if (!vw || !vh) return;

        // Cover-fit calculation
        var scale = Math.max(cw / vw, ch / vh);
        var sw = cw / scale;
        var sh = ch / scale;
        var sx = (vw - sw) / 2;
        var sy = (vh - sh) / 2;

        ctx.save();

        // Mirror for front camera
        var mirror = self._config.mirror;
        if (mirror === undefined) mirror = (self._config.facing !== 'environment');
        if (mirror) {
          ctx.translate(cw, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
        ctx.restore();

        // Vignette
        var vig = parseFloat(self._config.vignette) || 0;
        if (vig > 0) {
          var strength = vig / 10;
          var diag = Math.sqrt(cw * cw + ch * ch) / 2;
          var gradient = ctx.createRadialGradient(cw / 2, ch / 2, diag * (1 - strength * 0.6), cw / 2, ch / 2, diag);
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,' + (strength * 0.8) + ')');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, cw, ch);
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
      this._container = null;
      this._engine = null;
    }
  };

  CameraManager.register(effect);
})();
