/**
 * QR Theme: Dot
 * Dot-shaped modules QR code (Canvas)
 * Supports round, diamond, and star shapes
 */
;(function() {
  'use strict';

  var theme = {
    id: 'dot',
    defaults: { color: '000000', bg: 'ffffff', ec: 'M', size: 10, margin: 4, gap: 0.15, shape: 'round' },
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
      var gap = config.gap !== undefined ? config.gap : 0.15;
      var shape = config.shape || 'round';
      var cw = this._container.clientWidth;
      var ch = this._container.clientHeight;
      var maxSize = Math.min(cw, ch);
      var moduleSize = Math.max(2, Math.floor(maxSize / (qr.size + margin * 2)));
      var totalSize = moduleSize * (qr.size + margin * 2);

      canvas.width = totalSize;
      canvas.height = totalSize;
      canvas.style.width = totalSize + 'px';
      canvas.style.height = totalSize + 'px';

      // Background
      ctx.fillStyle = '#' + (config.bg || 'ffffff');
      ctx.fillRect(0, 0, totalSize, totalSize);

      // Dot modules
      var radius = moduleSize * (1 - gap) / 2;
      ctx.fillStyle = '#' + (config.color || '000000');

      for (var y = 0; y < qr.size; y++) {
        for (var x = 0; x < qr.size; x++) {
          if (qr.getModule(x, y)) {
            var cx = (x + margin) * moduleSize + moduleSize / 2;
            var cy = (y + margin) * moduleSize + moduleSize / 2;

            if (shape === 'diamond') {
              this._drawDiamond(ctx, cx, cy, radius);
            } else if (shape === 'star') {
              this._drawStar(ctx, cx, cy, radius);
            } else {
              // round (default)
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    },

    _drawDiamond: function(ctx, cx, cy, r) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
    },

    _drawStar: function(ctx, cx, cy, r) {
      var spikes = 5;
      var outerR = r;
      var innerR = r * 0.4;
      ctx.beginPath();
      for (var i = 0; i < spikes * 2; i++) {
        var rad = (i * Math.PI / spikes) - Math.PI / 2;
        var rr = (i % 2 === 0) ? outerR : innerR;
        var px = cx + Math.cos(rad) * rr;
        var py = cy + Math.sin(rad) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
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
