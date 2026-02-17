/**
 * QR Theme: Pixel
 * Pixel art style QR code with retro color palette (Canvas)
 */
;(function() {
  'use strict';

  var theme = {
    id: 'pixel',
    defaults: { color: '222222', bg: 'f0e6d3', ec: 'M', size: 10, margin: 4, border: 3, shadow: true },
    _canvas: null,
    _container: null,
    _content: '',
    _config: null,
    _resizeHandler: null,

    init: function(container, content, config) {
      this._container = container;
      this._content = content || 'HELLO';
      this._config = config;

      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.background = '#' + (config.bg || 'f0e6d3');

      var canvas = document.createElement('canvas');
      canvas.style.imageRendering = 'pixelated';
      container.appendChild(canvas);
      this._canvas = canvas;

      this._draw();

      var self = this;
      this._resizeHandler = function() { self._draw(); };
      window.addEventListener('resize', this._resizeHandler);
    },

    _draw: function() {
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

      var margin = config.margin !== undefined ? config.margin : 4;
      var border = config.border !== undefined ? config.border : 3;
      var showShadow = config.shadow !== undefined ? !!config.shadow : true;
      var cw = this._container.clientWidth;
      var ch = this._container.clientHeight;
      var maxSize = Math.min(cw, ch);
      var moduleSize = Math.max(2, Math.floor(maxSize / (qr.size + margin * 2)));
      var totalSize = moduleSize * (qr.size + margin * 2);

      canvas.width = totalSize;
      canvas.height = totalSize;
      canvas.style.width = totalSize + 'px';
      canvas.style.height = totalSize + 'px';

      var bgColor = config.bg || 'f0e6d3';
      var fgColor = config.color || '222222';

      // Background
      ctx.fillStyle = '#' + bgColor;
      ctx.fillRect(0, 0, totalSize, totalSize);

      // Draw pixel-art style modules
      for (var y = 0; y < qr.size; y++) {
        for (var x = 0; x < qr.size; x++) {
          if (qr.getModule(x, y)) {
            var px = (x + margin) * moduleSize;
            var py = (y + margin) * moduleSize;

            if (showShadow) {
              // Shadow (bottom-right)
              ctx.fillStyle = 'rgba(0,0,0,0.2)';
              ctx.fillRect(px + 1, py + 1, moduleSize, moduleSize);

              // Main pixel
              ctx.fillStyle = '#' + fgColor;
              ctx.fillRect(px, py, moduleSize - 1, moduleSize - 1);

              // Highlight (top-left)
              ctx.fillStyle = 'rgba(255,255,255,0.15)';
              ctx.fillRect(px, py, moduleSize - 1, 1);
              ctx.fillRect(px, py, 1, moduleSize - 1);
            } else {
              // Flat pixel (no 3D effect)
              ctx.fillStyle = '#' + fgColor;
              ctx.fillRect(px, py, moduleSize, moduleSize);
            }
          }
        }
      }

      // Pixel border frame
      if (border > 0) {
        var bw = border;
        var qrStart = margin * moduleSize;
        var qrSize = qr.size * moduleSize;
        ctx.strokeStyle = '#' + fgColor;
        ctx.lineWidth = bw;
        ctx.strokeRect(qrStart - bw, qrStart - bw, qrSize + bw * 2, qrSize + bw * 2);
      }
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
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      this._canvas = null;
      this._container = null;
    }
  };

  QRManager.register(theme);
})();
