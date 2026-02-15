/**
 * Digital Clock — 7-segment LED display
 * Default clock theme using Canvas rendering
 * Configurable glow and dim segment brightness
 */
;(function(global) {
  'use strict';

  // 7-segment patterns: [top, top-right, bottom-right, bottom, bottom-left, top-left, middle]
  var SEGMENTS = {
    '0': [1,1,1,1,1,1,0],
    '1': [0,1,1,0,0,0,0],
    '2': [1,1,0,1,1,0,1],
    '3': [1,1,1,1,0,0,1],
    '4': [0,1,1,0,0,1,1],
    '5': [1,0,1,1,0,1,1],
    '6': [1,0,1,1,1,1,1],
    '7': [1,1,1,0,0,0,0],
    '8': [1,1,1,1,1,1,1],
    '9': [1,1,1,1,0,1,1]
  };

  var Digital = {
    id: 'digital',
    defaults: {
      color: 'ff0000',
      bg: '0a0a0a',
      format: '24h',
      showSeconds: true,
      showDate: false,
      dateFormat: 'MDY',
      dotStyle: 'blink',
      segmentStyle: 'sharp',
      glow: 5,
      dimBrightness: 1
    },

    _container: null,
    _canvas: null,
    _ctx: null,
    _timer: null,
    _boundResize: null,
    _config: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      var self = this;
      this._timer = setInterval(function() { self._render(); }, 200);
      this._render();
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._render();
    },

    _render: function() {
      if (!this._ctx || !this._container) return;
      var c = this._config;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var ctx = this._ctx;

      // Background
      ctx.fillStyle = '#' + (c.bg || '0a0a0a');
      ctx.fillRect(0, 0, w, h);

      var now = TimeUtils.getTime(c.tz);
      var hours = TimeUtils.formatHours(now, c.format);
      var mins = now.getMinutes();
      var secs = now.getSeconds();
      var showSec = c.showSeconds !== false;

      var timeStr = TimeUtils.padZero(hours) + ':' + TimeUtils.padZero(mins);
      if (showSec) timeStr += ':' + TimeUtils.padZero(secs);

      // Calculate segment sizing
      var digitCount = showSec ? 6 : 4;
      var colonCount = showSec ? 2 : 1;
      var totalUnits = digitCount * 4 + colonCount * 1.5;
      var maxW = w * 0.9;
      var maxH = h * (c.showDate ? 0.5 : 0.65);
      var unitW = maxW / totalUnits;
      var segH = unitW * 7;
      if (segH > maxH) { segH = maxH; unitW = segH / 7; }
      var digitW = unitW * 4;
      var colonW = unitW * 1.5;
      var totalW = digitCount * digitW + colonCount * colonW;

      var startX = (w - totalW) / 2;
      var startY = (h - segH) / 2 - (c.showDate ? segH * 0.15 : 0);

      var color = c.color || 'ff0000';
      var r = parseInt(color.substring(0, 2), 16);
      var g = parseInt(color.substring(2, 4), 16);
      var b = parseInt(color.substring(4, 6), 16);

      var glow = c.glow !== undefined ? c.glow : this.defaults.glow;
      var dimBri = c.dimBrightness !== undefined ? c.dimBrightness : this.defaults.dimBrightness;
      var dimAlpha = dimBri * 0.04; // 0-5 → 0-0.2

      var x = startX;

      for (var i = 0; i < timeStr.length; i++) {
        var ch = timeStr[i];
        if (ch === ':') {
          this._drawColon(ctx, x, startY, colonW, segH, r, g, b, c.dotStyle, now, glow);
          x += colonW;
        } else {
          this._drawDigit(ctx, ch, x, startY, digitW, segH, r, g, b, dimAlpha, c.segmentStyle, glow);
          x += digitW;
        }
      }

      // AM/PM indicator for 12h format
      if (c.format === '12h') {
        var ampm = TimeUtils.getAmPm(now);
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.9)';
        ctx.font = (segH * 0.15) + 'px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(ampm, x + unitW * 0.5, startY + segH * 0.05);
      }

      // Date
      if (c.showDate) {
        var dateStr = TimeUtils.formatDate(now, c.dateFormat);
        var dayStr = TimeUtils.getDayName(now, true);
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.6)';
        ctx.font = (segH * 0.16) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(dayStr + '  ' + dateStr, w / 2, startY + segH + segH * 0.12);
      }
    },

    _drawDigit: function(ctx, digit, x, y, dw, dh, r, g, b, dimAlpha, style, glow) {
      var segs = SEGMENTS[digit];
      if (!segs) return;
      var sw = dw * 0.8;
      var sh = dh * 0.06;
      var pad = dw * 0.1;
      var cx = x + dw / 2;
      var halfH = (dh - sh * 3) / 2;
      var round = style === 'round';
      var glowMul = glow / 5; // normalize: 5 = default glow

      // Segment positions: [x, y, width, height, horizontal?]
      var positions = [
        [cx - sw/2, y + pad, sw, sh, true],                          // top
        [cx + sw/2 - sh, y + pad + sh, sh, halfH, false],            // top-right
        [cx + sw/2 - sh, y + pad + sh + halfH + sh, sh, halfH, false],// bottom-right
        [cx - sw/2, y + pad + sh + halfH + sh + halfH, sw, sh, true],// bottom
        [cx - sw/2, y + pad + sh + halfH + sh, sh, halfH, false],    // bottom-left
        [cx - sw/2, y + pad + sh, sh, halfH, false],                 // top-left
        [cx - sw/2, y + pad + halfH + sh, sw, sh, true]              // middle
      ];

      for (var i = 0; i < 7; i++) {
        var p = positions[i];
        var on = segs[i];
        ctx.fillStyle = on
          ? 'rgba(' + r + ',' + g + ',' + b + ',1)'
          : 'rgba(' + r + ',' + g + ',' + b + ',' + dimAlpha + ')';
        if (on && glow > 0) {
          // Multi-pass glow: inner + outer
          ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.4 * glowMul) + ')';
          ctx.shadowBlur = sh * 2 * glowMul;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        if (round) {
          var rad = Math.min(p[2], p[3]) / 2;
          this._roundRect(ctx, p[0], p[1], p[2], p[3], rad);
        } else {
          ctx.fillRect(p[0], p[1], p[2], p[3]);
        }
      }

      // Second glow pass for high glow values
      if (glow >= 7) {
        for (var j = 0; j < 7; j++) {
          if (!segs[j]) continue;
          var p2 = positions[j];
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.15)';
          ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.3 * glowMul) + ')';
          ctx.shadowBlur = sh * 4 * glowMul;
          if (round) {
            this._roundRect(ctx, p2[0], p2[1], p2[2], p2[3], Math.min(p2[2], p2[3]) / 2);
          } else {
            ctx.fillRect(p2[0], p2[1], p2[2], p2[3]);
          }
        }
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    },

    _roundRect: function(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();
    },

    _drawColon: function(ctx, x, y, cw, dh, r, g, b, dotStyle, now, glow) {
      var dotR = cw * 0.2;
      var cx = x + cw / 2;
      var glowMul = glow / 5;
      var alpha = 1;
      if (dotStyle === 'blink') {
        alpha = (now.getMilliseconds() < 500) ? 1 : 0.15;
      } else if (dotStyle === 'fade') {
        var ms = now.getMilliseconds();
        alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(ms / 1000 * Math.PI * 2));
      }
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      if (alpha > 0.5 && glow > 0) {
        ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.4 * glowMul) + ')';
        ctx.shadowBlur = dotR * 2 * glowMul;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(cx, y + dh * 0.33, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, y + dh * 0.67, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    },

    destroy: function() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      if (this._boundResize) {
        window.removeEventListener('resize', this._boundResize);
        this._boundResize = null;
      }
      this._canvas = null;
      this._ctx = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Digital);
})(typeof window !== 'undefined' ? window : this);
