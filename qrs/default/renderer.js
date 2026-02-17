/**
 * QR Theme: Default
 * Standard black-on-white QR code (Canvas)
 */
;(function() {
  'use strict';

  var theme = {
    id: 'default',
    defaults: { color: '000000', bg: 'ffffff', ec: 'M', size: 10, margin: 4, rounded: false },
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
      container.style.background = '#' + (config.bg || 'ffffff');

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
      var cw = this._container.clientWidth;
      var ch = this._container.clientHeight;
      var maxSize = Math.min(cw, ch);
      var moduleSize = Math.max(1, Math.floor(maxSize / (qr.size + margin * 2)));
      var totalSize = moduleSize * (qr.size + margin * 2);

      canvas.width = totalSize;
      canvas.height = totalSize;
      canvas.style.width = totalSize + 'px';
      canvas.style.height = totalSize + 'px';

      // Background
      ctx.fillStyle = '#' + (config.bg || 'ffffff');
      ctx.fillRect(0, 0, totalSize, totalSize);

      // Modules
      ctx.fillStyle = '#' + (config.color || '000000');
      var rounded = !!config.rounded;
      var radius = rounded ? Math.max(1, moduleSize * 0.3) : 0;

      for (var y = 0; y < qr.size; y++) {
        for (var x = 0; x < qr.size; x++) {
          if (qr.getModule(x, y)) {
            var px = (x + margin) * moduleSize;
            var py = (y + margin) * moduleSize;
            if (rounded) {
              ctx.beginPath();
              ctx.roundRect(px, py, moduleSize, moduleSize, radius);
              ctx.fill();
            } else {
              ctx.fillRect(px, py, moduleSize, moduleSize);
            }
          }
        }
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
