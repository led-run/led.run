/**
 * Camera Effect: Surveillance
 * Security camera overlay style (Canvas)
 */
;(function() {
  'use strict';

  var effect = {
    id: 'surveillance',
    defaults: { facing: 'user', mirror: false, fps: 24, overlay: true, scanlines: true, color: 'ffffff', bg: '000000', noise: 3 },
    _canvas: null,
    _ctx: null,
    _container: null,
    _config: null,
    _engine: null,
    _raf: null,
    _resizeHandler: null,
    _startTime: 0,

    init: function(container, config, cameraEngine) {
      this._container = container;
      this._config = config;
      this._engine = cameraEngine;
      this._startTime = Date.now();

      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.background = '#000';
      container.style.overflow = 'hidden';

      var canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
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
      var interval = 1000 / (this._config.fps || 24);

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
        var vw = video.videoWidth;
        var vh = video.videoHeight;

        // Cover-fit
        var scale = Math.max(cw / vw, ch / vh);
        var sw = cw / scale;
        var sh = ch / scale;
        var sx = (vw - sw) / 2;
        var sy = (vh - sh) / 2;

        ctx.save();
        var mirror = self._config.mirror;
        if (mirror) {
          ctx.translate(cw, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
        ctx.restore();

        // Slight desaturation for surveillance look
        ctx.fillStyle = 'rgba(0, 20, 0, 0.1)';
        ctx.fillRect(0, 0, cw, ch);

        // Static noise
        var noiseLevel = parseFloat(self._config.noise) || 0;
        if (noiseLevel > 0) {
          var noiseCount = Math.floor(cw * ch * noiseLevel / 500);
          for (var n = 0; n < noiseCount; n++) {
            var nx = Math.random() * cw;
            var ny = Math.random() * ch;
            var alpha = Math.random() * noiseLevel * 0.03;
            ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
            ctx.fillRect(nx, ny, 1, 1);
          }
        }

        // Scanlines
        if (self._config.scanlines) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          for (var sy2 = 0; sy2 < ch; sy2 += 3) {
            ctx.fillRect(0, sy2, cw, 1);
          }
        }

        // Overlay HUD
        if (self._config.overlay) {
          var now = new Date();
          var timeStr = self._padZero(now.getHours()) + ':' +
                        self._padZero(now.getMinutes()) + ':' +
                        self._padZero(now.getSeconds());
          var dateStr = now.getFullYear() + '/' +
                        self._padZero(now.getMonth() + 1) + '/' +
                        self._padZero(now.getDate());

          var fontSize = Math.max(12, Math.min(cw, ch) * 0.025);
          ctx.font = 'bold ' + fontSize + 'px monospace';
          ctx.textBaseline = 'top';

          // REC indicator (blinking)
          var elapsed = Date.now() - self._startTime;
          if (Math.floor(elapsed / 800) % 2 === 0) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(fontSize * 1.2, fontSize * 1.2, fontSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText('REC', fontSize * 2, fontSize * 0.7);
          }

          // Timestamp bottom-left
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'bottom';
          ctx.fillText(dateStr + '  ' + timeStr, fontSize * 0.5, ch - fontSize * 0.5);

          // Camera ID top-right
          ctx.textBaseline = 'top';
          ctx.textAlign = 'right';
          ctx.fillText('CAM-01', cw - fontSize * 0.5, fontSize * 0.7);
          ctx.textAlign = 'left';

          // Corner brackets
          var bLen = Math.min(cw, ch) * 0.06;
          var bPad = fontSize * 0.8;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(bPad, bPad + bLen);
          ctx.lineTo(bPad, bPad);
          ctx.lineTo(bPad + bLen, bPad);
          ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(cw - bPad - bLen, bPad);
          ctx.lineTo(cw - bPad, bPad);
          ctx.lineTo(cw - bPad, bPad + bLen);
          ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(bPad, ch - bPad - bLen);
          ctx.lineTo(bPad, ch - bPad);
          ctx.lineTo(bPad + bLen, ch - bPad);
          ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(cw - bPad - bLen, ch - bPad);
          ctx.lineTo(cw - bPad, ch - bPad);
          ctx.lineTo(cw - bPad, ch - bPad - bLen);
          ctx.stroke();
        }

        // Vignette
        var gradient = ctx.createRadialGradient(cw / 2, ch / 2, cw * 0.2, cw / 2, ch / 2, cw * 0.7);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cw, ch);
      }

      this._raf = requestAnimationFrame(loop);
    },

    _padZero: function(n) {
      return n < 10 ? '0' + n : '' + n;
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
