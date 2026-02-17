/**
 * QR Theme: Neon
 * Glowing neon QR code with bloom effect (Canvas)
 */
;(function() {
  'use strict';

  var theme = {
    id: 'neon',
    defaults: { color: '00ff41', bg: '0a0a0a', ec: 'M', size: 10, margin: 4, glow: 8, pulse: false },
    _canvas: null,
    _container: null,
    _content: '',
    _config: null,
    _resizeHandler: null,
    _raf: null,
    _qr: null,

    init: function(container, content, config) {
      this._container = container;
      this._content = content || 'HELLO';
      this._config = config;

      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.background = '#' + (config.bg || '0a0a0a');

      var canvas = document.createElement('canvas');
      container.appendChild(canvas);
      this._canvas = canvas;

      this._draw();

      // Start pulse animation if enabled
      if (config.pulse) {
        this._startPulse();
      }

      var self = this;
      this._resizeHandler = function() { self._draw(); };
      window.addEventListener('resize', this._resizeHandler);
    },

    _draw: function(glowOverride) {
      var config = this._config;
      var canvas = this._canvas;
      var ctx = canvas.getContext('2d');

      var ecLevel = this._getEcLevel(config.ec);
      var qr;
      try {
        qr = QrCode.encodeText(this._content, ecLevel);
      } catch (e) {
        qr = QrCode.encodeText('ERROR', QrCode.Ecc.LOW);
      }
      this._qr = qr;

      var margin = config.margin !== undefined ? config.margin : 4;
      var cw = this._container.clientWidth;
      var ch = this._container.clientHeight;
      var maxSize = Math.min(cw, ch);
      var moduleSize = Math.max(2, Math.floor(maxSize / (qr.size + margin * 2)));
      var totalSize = moduleSize * (qr.size + margin * 2);

      canvas.width = totalSize;
      canvas.height = totalSize;
      canvas.style.width = totalSize + 'px';
      canvas.style.height = totalSize + 'px';

      var color = config.color || '00ff41';
      var baseGlow = (config.glow !== undefined ? config.glow : 8) * 2;
      var glowAmount = glowOverride !== undefined ? glowOverride : baseGlow;

      // Background
      ctx.fillStyle = '#' + (config.bg || '0a0a0a');
      ctx.fillRect(0, 0, totalSize, totalSize);

      // Glow layer
      ctx.shadowColor = '#' + color;
      ctx.shadowBlur = glowAmount;
      ctx.fillStyle = '#' + color;

      for (var y = 0; y < qr.size; y++) {
        for (var x = 0; x < qr.size; x++) {
          if (qr.getModule(x, y)) {
            ctx.fillRect(
              (x + margin) * moduleSize,
              (y + margin) * moduleSize,
              moduleSize, moduleSize
            );
          }
        }
      }

      // Sharp layer on top (no shadow)
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#' + color;

      for (var y2 = 0; y2 < qr.size; y2++) {
        for (var x2 = 0; x2 < qr.size; x2++) {
          if (qr.getModule(x2, y2)) {
            ctx.fillRect(
              (x2 + margin) * moduleSize,
              (y2 + margin) * moduleSize,
              moduleSize, moduleSize
            );
          }
        }
      }
    },

    _startPulse: function() {
      var self = this;
      var baseGlow = (this._config.glow !== undefined ? this._config.glow : 8) * 2;
      var startTime = performance.now();

      function pulse(time) {
        self._raf = requestAnimationFrame(pulse);
        var elapsed = (time - startTime) / 1000;
        var factor = 0.5 + 0.5 * Math.sin(elapsed * 2);
        var glowAmount = baseGlow * (0.4 + factor * 0.8);
        self._draw(glowAmount);
      }

      this._raf = requestAnimationFrame(pulse);
    },

    _getEcLevel: function(ec) {
      switch ((ec || 'M').toUpperCase()) {
        case 'L': return QrCode.Ecc.LOW;
        case 'M': return QrCode.Ecc.MEDIUM;
        case 'Q': return QrCode.Ecc.QUARTILE;
        case 'H': return QrCode.Ecc.HIGH;
        default: return QrCode.Ecc.MEDIUM;
      }
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
      this._container = null;
      this._qr = null;
    }
  };

  QRManager.register(theme);
})();
