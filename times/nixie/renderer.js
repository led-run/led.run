/**
 * Nixie Clock — Warm glowing nixie tube display
 * Canvas-based with configurable glow, flicker, tube color, and warmth
 */
;(function(global) {
  'use strict';

  var Nixie = {
    id: 'nixie',
    defaults: {
      color: 'ff8833',
      bg: '1a0f0a',
      format: '24h',
      showSeconds: true,
      showDate: false,
      dateFormat: 'MDY',
      glow: 6,
      flicker: 3,
      tubeColor: '332211',
      warmth: 7
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
    },

    _render: function() {
      if (!this._ctx || !this._container) return;
      var c = this._config;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var ctx = this._ctx;

      // Dark warm background
      ctx.fillStyle = '#' + (c.bg || '1a0f0a');
      ctx.fillRect(0, 0, w, h);

      var now = TimeUtils.getTime(c.tz);
      var hours = TimeUtils.formatHours(now, c.format);
      var mins = now.getMinutes();
      var secs = now.getSeconds();
      var showSec = c.showSeconds !== false;

      var digits = [
        Math.floor(hours / 10), hours % 10,
        -1, // colon
        Math.floor(mins / 10), mins % 10
      ];
      if (showSec) {
        digits.push(-1, Math.floor(secs / 10), secs % 10);
      }

      var tubeCount = showSec ? 6 : 4;
      var separatorCount = showSec ? 2 : 1;
      var tubeW = Math.min(w / (tubeCount + separatorCount * 0.5) * 0.8, h * 0.5);
      var tubeH = tubeW * 1.6;
      var totalW = tubeCount * tubeW + separatorCount * tubeW * 0.3 + (tubeCount + separatorCount - 1) * tubeW * 0.15;
      var startX = (w - totalW) / 2;
      var startY = (h - tubeH) / 2;

      var color = c.color || 'ff8833';
      var r = parseInt(color.substring(0, 2), 16);
      var g = parseInt(color.substring(2, 4), 16);
      var b = parseInt(color.substring(4, 6), 16);

      var glow = c.glow !== undefined ? c.glow : this.defaults.glow;
      var flickerAmt = c.flicker !== undefined ? c.flicker : this.defaults.flicker;
      var warmth = c.warmth !== undefined ? c.warmth : this.defaults.warmth;
      var tubeHex = c.tubeColor || this.defaults.tubeColor;
      var tr = parseInt(tubeHex.substring(0, 2), 16);
      var tg = parseInt(tubeHex.substring(2, 4), 16);
      var tb = parseInt(tubeHex.substring(4, 6), 16);

      var x = startX;
      for (var i = 0; i < digits.length; i++) {
        if (digits[i] === -1) {
          // Separator dots
          var dotR = tubeW * 0.06;
          var dotX = x + tubeW * 0.15;
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.7)';
          ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.5)';
          ctx.shadowBlur = dotR * 4;
          ctx.beginPath();
          ctx.arc(dotX, startY + tubeH * 0.35, dotR, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(dotX, startY + tubeH * 0.65, dotR, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          x += tubeW * 0.3 + tubeW * 0.15;
        } else {
          this._drawTube(ctx, digits[i], x, startY, tubeW, tubeH, r, g, b, glow, flickerAmt, warmth, tr, tg, tb);
          x += tubeW + tubeW * 0.15;
        }
      }

      // Date below
      if (c.showDate) {
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.4)';
        ctx.font = (tubeH * 0.08) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(TimeUtils.formatDate(now, c.dateFormat), w / 2, startY + tubeH + tubeH * 0.08);
      }
    },

    _drawTube: function(ctx, digit, x, y, tw, th, r, g, b, glow, flickerAmt, warmth, tr, tg, tb) {
      var glowMul = glow / 6; // normalize to default

      // Glass tube with tubeColor tint
      var grad = ctx.createLinearGradient(x, y, x + tw, y);
      grad.addColorStop(0, 'rgba(' + tr + ',' + tg + ',' + tb + ',0.03)');
      grad.addColorStop(0.3, 'rgba(' + tr + ',' + tg + ',' + tb + ',0.06)');
      grad.addColorStop(0.7, 'rgba(' + tr + ',' + tg + ',' + tb + ',0.04)');
      grad.addColorStop(1, 'rgba(' + tr + ',' + tg + ',' + tb + ',0.02)');

      // Tube outline
      var radius = tw * 0.15;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + tw - radius, y);
      ctx.quadraticCurveTo(x + tw, y, x + tw, y + radius);
      ctx.lineTo(x + tw, y + th - radius);
      ctx.quadraticCurveTo(x + tw, y + th, x + tw - radius, y + th);
      ctx.lineTo(x + radius, y + th);
      ctx.quadraticCurveTo(x, y + th, x, y + th - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Internal ambient glow (warmth-based)
      var warmAlpha = warmth * 0.012;
      var glowGrad = ctx.createRadialGradient(x + tw/2, y + th/2, 0, x + tw/2, y + th/2, th * 0.4);
      glowGrad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + warmAlpha + ')');
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(x, y, tw, th);

      // Ghost digits behind (dimmed, warmth controls opacity)
      var ghostAlpha = 0.02 + warmth * 0.003;
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + ghostAlpha + ')';
      ctx.font = 'bold ' + (th * 0.55) + 'px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var d = 0; d <= 9; d++) {
        if (d === digit) continue;
        ctx.fillText(d, x + tw / 2, y + th * 0.48);
      }

      // Active digit with configurable flicker and glow
      var flickerRange = flickerAmt * 0.015; // 0-10 → 0-0.15
      var flicker = 1 - flickerRange + Math.random() * flickerRange;

      // Multi-layer glow
      if (glow > 0) {
        ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.7 * flicker * glowMul) + ')';
        ctx.shadowBlur = th * 0.12 * glowMul;
      }
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + flicker + ')';
      ctx.fillText(digit, x + tw / 2, y + th * 0.48);

      // Second glow pass for high glow
      if (glow >= 7) {
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.2 * flicker) + ')';
        ctx.shadowBlur = th * 0.2 * glowMul;
        ctx.fillText(digit, x + tw / 2, y + th * 0.48);
      }

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Wire mesh at bottom
      ctx.strokeStyle = 'rgba(150,120,80,0.15)';
      ctx.lineWidth = 0.5;
      var meshY = y + th * 0.85;
      for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + tw * 0.2, meshY + i * 3);
        ctx.lineTo(x + tw * 0.8, meshY + i * 3);
        ctx.stroke();
      }
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

  global.TimeManager.register(Nixie);
})(typeof window !== 'undefined' ? window : this);
