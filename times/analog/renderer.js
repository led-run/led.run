/**
 * Analog Clock — High-quality round clock with metal bezel, glass reflection,
 * tapered hands, shadows, glowing markers, and dial texture.
 * Canvas-based with 4 styles: classic, modern, dress, sport
 */
;(function(global) {
  'use strict';

  var Analog = {
    id: 'analog',
    defaults: {
      color: 'ffffff',
      bg: '1a1a2e',
      format: '12h',
      showSeconds: true,
      showDate: false,
      dateFormat: 'MDY',
      style: 'classic',
      handColor: 'ff5050',
      markers: true
    },

    _container: null,
    _canvas: null,
    _ctx: null,
    _raf: null,
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
      function loop() {
        self._render();
        self._raf = requestAnimationFrame(loop);
      }
      loop();
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

    _parseColor: function(hex) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    },

    _render: function() {
      if (!this._ctx || !this._container) return;
      var c = this._config;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var ctx = this._ctx;
      var style = c.style || 'classic';

      ctx.fillStyle = '#' + (c.bg || '1a1a2e');
      ctx.fillRect(0, 0, w, h);

      var now = TimeUtils.getTime(c.tz);
      var cx = w / 2;
      var cy = h / 2;
      // Ensure perfect circle using min dimension
      var side = Math.min(w, h);
      var radius = side * 0.4;

      var col = this._parseColor(c.color || 'ffffff');
      var handCol = this._parseColor(c.handColor || 'ff5050');
      var showMarkers = c.markers !== false;

      if (style === 'modern') {
        this._renderModern(ctx, cx, cy, radius, col, handCol, now, c, showMarkers);
      } else if (style === 'dress') {
        this._renderDress(ctx, cx, cy, radius, col, handCol, now, c, showMarkers);
      } else if (style === 'sport') {
        this._renderSport(ctx, cx, cy, radius, col, handCol, now, c, showMarkers);
      } else {
        this._renderClassic(ctx, cx, cy, radius, col, handCol, now, c, showMarkers);
      }
    },

    // ── Shared drawing helpers ──

    _drawDialTexture: function(ctx, cx, cy, radius, col) {
      // Radial gradient for subtle depth
      var grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
      grad.addColorStop(0, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.04)');
      grad.addColorStop(0.7, 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',0.01)');
      grad.addColorStop(1, 'rgba(0,0,0,0.05)');
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    },

    _drawMetalBezel: function(ctx, cx, cy, radius, col, thickness) {
      var r = col.r, g = col.g, b = col.b;
      // Outer ring with linear gradient simulating brushed metal
      var grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.35)');
      grad.addColorStop(0.3, 'rgba(' + r + ',' + g + ',' + b + ',0.12)');
      grad.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',0.3)');
      grad.addColorStop(0.7, 'rgba(' + r + ',' + g + ',' + b + ',0.1)');
      grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0.25)');

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = thickness;
      ctx.stroke();

      // Inner shadow ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius - thickness * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    },

    _drawGlassReflection: function(ctx, cx, cy, radius) {
      // Semi-transparent arc highlight at upper-left
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
      ctx.clip();

      var gx = cx - radius * 0.25;
      var gy = cy - radius * 0.35;
      var grad = ctx.createRadialGradient(gx, gy, radius * 0.05, gx, gy, radius * 0.7);
      grad.addColorStop(0, 'rgba(255,255,255,0.08)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.03)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
    },

    _drawTaperedHand: function(ctx, cx, cy, angle, length, baseWidth, color, shadowOffset) {
      // Shadow
      if (shadowOffset) {
        ctx.save();
        this._drawHandShape(ctx, cx + shadowOffset, cy + shadowOffset, angle, length, baseWidth, 'rgba(0,0,0,0.2)');
        ctx.restore();
      }
      // Hand
      this._drawHandShape(ctx, cx, cy, angle, length, baseWidth, color);
    },

    _drawHandShape: function(ctx, cx, cy, angle, length, baseWidth, color) {
      var tipX = cx + Math.cos(angle) * length;
      var tipY = cy + Math.sin(angle) * length;
      var perpAngle = angle + Math.PI / 2;
      var bx1 = cx + Math.cos(perpAngle) * baseWidth;
      var by1 = cy + Math.sin(perpAngle) * baseWidth;
      var bx2 = cx - Math.cos(perpAngle) * baseWidth;
      var by2 = cy - Math.sin(perpAngle) * baseWidth;

      // Counterweight (small extension behind center)
      var tailLen = length * 0.15;
      var tailX = cx - Math.cos(angle) * tailLen;
      var tailY = cy - Math.sin(angle) * tailLen;
      var tailW = baseWidth * 0.7;
      var tx1 = tailX + Math.cos(perpAngle) * tailW;
      var ty1 = tailY + Math.sin(perpAngle) * tailW;
      var tx2 = tailX - Math.cos(perpAngle) * tailW;
      var ty2 = tailY - Math.sin(perpAngle) * tailW;

      ctx.beginPath();
      ctx.moveTo(tx1, ty1);
      ctx.lineTo(bx1, by1);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(bx2, by2);
      ctx.lineTo(tx2, ty2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    },

    _drawCenterPin: function(ctx, cx, cy, radius, col, handCol) {
      var r = col.r, g = col.g, b = col.b;
      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.9)';
      ctx.fill();
      // Inner point
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.02, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',1)';
      ctx.fill();
      // Highlight dot
      ctx.beginPath();
      ctx.arc(cx - radius * 0.008, cy - radius * 0.008, radius * 0.008, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    },

    _drawGlowingMarkerDot: function(ctx, x, y, dotRadius, col, glowSize) {
      var r = col.r, g = col.g, b = col.b;
      // Glow
      ctx.beginPath();
      ctx.arc(x, y, dotRadius + glowSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.1)';
      ctx.fill();
      // Dot
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.8)';
      ctx.fill();
    },

    // ── Classic style ──

    _renderClassic: function(ctx, cx, cy, radius, col, handCol, now, c, showMarkers) {
      var r = col.r, g = col.g, b = col.b;

      // Dial texture
      this._drawDialTexture(ctx, cx, cy, radius, col);

      // Metal bezel
      this._drawMetalBezel(ctx, cx, cy, radius, col, radius * 0.04);

      if (showMarkers) {
        // Hour markers with glow
        for (var i = 0; i < 12; i++) {
          var angle = (i * 30 - 90) * Math.PI / 180;
          var isMain = (i % 3 === 0);
          if (isMain) {
            // Bold tick at 12/3/6/9
            var innerR = radius * 0.78;
            var outerR = radius * 0.9;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
            ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
            ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.9)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
          } else {
            // Standard tick
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * radius * 0.84, cy + Math.sin(angle) * radius * 0.84);
            ctx.lineTo(cx + Math.cos(angle) * radius * 0.9, cy + Math.sin(angle) * radius * 0.9);
            ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.5)';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          // Glowing dot at each hour
          var dx = cx + Math.cos(angle) * radius * 0.92;
          var dy = cy + Math.sin(angle) * radius * 0.92;
          this._drawGlowingMarkerDot(ctx, dx, dy, radius * 0.008, col, radius * 0.015);
        }

        // Minute ticks
        for (var j = 0; j < 60; j++) {
          if (j % 5 === 0) continue;
          var a = (j * 6 - 90) * Math.PI / 180;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * radius * 0.88, cy + Math.sin(a) * radius * 0.88);
          ctx.lineTo(cx + Math.cos(a) * radius * 0.9, cy + Math.sin(a) * radius * 0.9);
          ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Hour numbers
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.65)';
        ctx.font = 'bold ' + (radius * 0.13) + 'px "Inter", "Helvetica Neue", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (var n = 1; n <= 12; n++) {
          var na = (n * 30 - 90) * Math.PI / 180;
          ctx.fillText(n, cx + Math.cos(na) * radius * 0.7, cy + Math.sin(na) * radius * 0.7);
        }
      }

      // Date window
      if (c.showDate) {
        this._drawDateWindow(ctx, cx, cy, radius, col, now);
      }

      // Hands
      this._drawEnhancedHands(ctx, cx, cy, radius, col, handCol, now, c);

      // Glass reflection
      this._drawGlassReflection(ctx, cx, cy, radius);
    },

    // ── Modern style ──

    _renderModern: function(ctx, cx, cy, radius, col, handCol, now, c, showMarkers) {
      var r = col.r, g = col.g, b = col.b;

      // Dial texture
      this._drawDialTexture(ctx, cx, cy, radius, col);

      // Ultra-thin silver bezel
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.12)';
      ctx.lineWidth = radius * 0.015;
      ctx.stroke();

      if (showMarkers) {
        // Only 4 minimal tick marks at 12, 3, 6, 9
        for (var i = 0; i < 4; i++) {
          var angle = (i * 90 - 90) * Math.PI / 180;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * radius * 0.84, cy + Math.sin(angle) * radius * 0.84);
          ctx.lineTo(cx + Math.cos(angle) * radius * 0.92, cy + Math.sin(angle) * radius * 0.92);
          ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.6)';
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Subtle dots at remaining hours
        for (var h = 0; h < 12; h++) {
          if (h % 3 === 0) continue;
          var ha = (h * 30 - 90) * Math.PI / 180;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ha) * radius * 0.88, cy + Math.sin(ha) * radius * 0.88, 1, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.2)';
          ctx.fill();
        }
      }

      // Ultra-thin hands
      var hours = now.getHours() + now.getMinutes() / 60;
      var minutes = now.getMinutes() + now.getSeconds() / 60;
      var seconds = now.getSeconds() + now.getMilliseconds() / 1000;
      var shadow = radius * 0.01;

      // Hour hand — thin tapered
      var hourA = (hours * 30 - 90) * Math.PI / 180;
      this._drawTaperedHand(ctx, cx, cy, hourA, radius * 0.48, radius * 0.025, 'rgba(' + r + ',' + g + ',' + b + ',0.85)', shadow);

      // Minute hand — thinner tapered
      var minA = (minutes * 6 - 90) * Math.PI / 180;
      this._drawTaperedHand(ctx, cx, cy, minA, radius * 0.7, radius * 0.018, 'rgba(' + r + ',' + g + ',' + b + ',0.8)', shadow);

      // Second hand
      if (c.showSeconds !== false) {
        var secA = (seconds * 6 - 90) * Math.PI / 180;
        var hr = handCol.r, hg = handCol.g, hb = handCol.b;
        // Shadow
        ctx.beginPath();
        ctx.moveTo(cx + shadow - Math.cos(secA) * radius * 0.15, cy + shadow - Math.sin(secA) * radius * 0.15);
        ctx.lineTo(cx + shadow + Math.cos(secA) * radius * 0.75, cy + shadow + Math.sin(secA) * radius * 0.75);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Hand
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(secA) * radius * 0.15, cy - Math.sin(secA) * radius * 0.15);
        ctx.lineTo(cx + Math.cos(secA) * radius * 0.75, cy + Math.sin(secA) * radius * 0.75);
        ctx.strokeStyle = 'rgba(' + hr + ',' + hg + ',' + hb + ',0.7)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Center pin
      this._drawCenterPin(ctx, cx, cy, radius, col, handCol);

      // Subtle glass reflection
      this._drawGlassReflection(ctx, cx, cy, radius);
    },

    // ── Dress style ──

    _renderDress: function(ctx, cx, cy, radius, col, handCol, now, c, showMarkers) {
      var r = col.r, g = col.g, b = col.b;

      // Dial texture
      this._drawDialTexture(ctx, cx, cy, radius, col);

      // Double-circle metal bezel
      this._drawMetalBezel(ctx, cx, cy, radius, col, radius * 0.035);
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.96, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (showMarkers) {
        // Roman numerals
        var romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.7)';
        ctx.font = (radius * 0.11) + 'px "Georgia", "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (var n = 0; n < 12; n++) {
          var na = (n * 30 - 90) * Math.PI / 180;
          ctx.fillText(romans[n], cx + Math.cos(na) * radius * 0.76, cy + Math.sin(na) * radius * 0.76);
        }

        // Fine minute dots
        for (var j = 0; j < 60; j++) {
          if (j % 5 === 0) continue;
          var a = (j * 6 - 90) * Math.PI / 180;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * radius * 0.88, cy + Math.sin(a) * radius * 0.88, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.15)';
          ctx.fill();
        }

        // Glowing dots at hour positions
        for (var k = 0; k < 12; k++) {
          var ka = (k * 30 - 90) * Math.PI / 180;
          this._drawGlowingMarkerDot(ctx, cx + Math.cos(ka) * radius * 0.88, cy + Math.sin(ka) * radius * 0.88, radius * 0.006, col, radius * 0.01);
        }
      }

      // Date window
      if (c.showDate) {
        this._drawDateWindow(ctx, cx, cy, radius, col, now);
      }

      var shadow = radius * 0.012;
      var hours = now.getHours() + now.getMinutes() / 60;
      var minutes = now.getMinutes() + now.getSeconds() / 60;
      var seconds = now.getSeconds() + now.getMilliseconds() / 1000;

      // Hour hand — elegant tapered
      var ha = (hours * 30 - 90) * Math.PI / 180;
      this._drawTaperedHand(ctx, cx, cy, ha, radius * 0.5, radius * 0.04, 'rgba(' + r + ',' + g + ',' + b + ',0.95)', shadow);

      // Minute hand — elegant tapered
      var ma = (minutes * 6 - 90) * Math.PI / 180;
      this._drawTaperedHand(ctx, cx, cy, ma, radius * 0.72, radius * 0.028, 'rgba(' + r + ',' + g + ',' + b + ',0.9)', shadow);

      // Second hand — blued steel
      if (c.showSeconds !== false) {
        var sa = (seconds * 6 - 90) * Math.PI / 180;
        // Shadow
        ctx.beginPath();
        ctx.moveTo(cx + shadow - Math.cos(sa) * radius * 0.18, cy + shadow - Math.sin(sa) * radius * 0.18);
        ctx.lineTo(cx + shadow + Math.cos(sa) * radius * 0.78, cy + shadow + Math.sin(sa) * radius * 0.78);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Blued steel hand
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(sa) * radius * 0.18, cy - Math.sin(sa) * radius * 0.18);
        ctx.lineTo(cx + Math.cos(sa) * radius * 0.78, cy + Math.sin(sa) * radius * 0.78);
        ctx.strokeStyle = 'rgba(70,130,200,0.85)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Tail counterweight circle
        var tailX = cx - Math.cos(sa) * radius * 0.14;
        var tailY = cy - Math.sin(sa) * radius * 0.14;
        ctx.beginPath();
        ctx.arc(tailX, tailY, radius * 0.02, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(70,130,200,0.8)';
        ctx.fill();
      }

      // Center pin
      this._drawCenterPin(ctx, cx, cy, radius, col, handCol);

      // Glass reflection
      this._drawGlassReflection(ctx, cx, cy, radius);
    },

    // ── Sport style ──

    _renderSport: function(ctx, cx, cy, radius, col, handCol, now, c, showMarkers) {
      var r = col.r, g = col.g, b = col.b;

      // Dial texture
      this._drawDialTexture(ctx, cx, cy, radius, col);

      // Thick rugged bezel
      this._drawMetalBezel(ctx, cx, cy, radius, col, radius * 0.06);

      if (showMarkers) {
        for (var i = 0; i < 12; i++) {
          var angle = (i * 30 - 90) * Math.PI / 180;
          var isMain = (i % 3 === 0);
          if (isMain) {
            // Bold rectangle marker with lume
            ctx.save();
            ctx.translate(cx + Math.cos(angle) * radius * 0.82, cy + Math.sin(angle) * radius * 0.82);
            ctx.rotate(angle + Math.PI / 2);
            // Lume glow
            ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.3)';
            ctx.shadowBlur = 6;
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.95)';
            ctx.fillRect(-radius * 0.025, -radius * 0.06, radius * 0.05, radius * 0.12);
            ctx.shadowBlur = 0;
            ctx.restore();
          } else {
            // Smaller rectangle with lume
            ctx.save();
            ctx.translate(cx + Math.cos(angle) * radius * 0.85, cy + Math.sin(angle) * radius * 0.85);
            ctx.rotate(angle + Math.PI / 2);
            ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.15)';
            ctx.shadowBlur = 3;
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.6)';
            ctx.fillRect(-radius * 0.015, -radius * 0.03, radius * 0.03, radius * 0.06);
            ctx.shadowBlur = 0;
            ctx.restore();
          }
        }

        // Minute ticks
        for (var j = 0; j < 60; j++) {
          if (j % 5 === 0) continue;
          var a2 = (j * 6 - 90) * Math.PI / 180;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a2) * radius * 0.88, cy + Math.sin(a2) * radius * 0.88);
          ctx.lineTo(cx + Math.cos(a2) * radius * 0.9, cy + Math.sin(a2) * radius * 0.9);
          ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Date window
      if (c.showDate) {
        this._drawDateWindow(ctx, cx, cy, radius, col, now);
      }

      var shadow = radius * 0.015;
      var hours = now.getHours() + now.getMinutes() / 60;
      var minutes = now.getMinutes() + now.getSeconds() / 60;
      var seconds = now.getSeconds() + now.getMilliseconds() / 1000;

      // Hour hand — thick with white outline
      var hourA = (hours * 30 - 90) * Math.PI / 180;
      // Shadow
      this._drawHandShape(ctx, cx + shadow, cy + shadow, hourA, radius * 0.48, radius * 0.05, 'rgba(0,0,0,0.2)');
      // White outline
      this._drawHandShape(ctx, cx, cy, hourA, radius * 0.5, radius * 0.055, 'rgba(255,255,255,0.15)');
      // Fill
      this._drawHandShape(ctx, cx, cy, hourA, radius * 0.48, radius * 0.05, 'rgba(' + r + ',' + g + ',' + b + ',0.95)');

      // Minute hand — sturdy with white outline
      var minA = (minutes * 6 - 90) * Math.PI / 180;
      // Shadow
      this._drawHandShape(ctx, cx + shadow, cy + shadow, minA, radius * 0.7, radius * 0.035, 'rgba(0,0,0,0.2)');
      // White outline
      this._drawHandShape(ctx, cx, cy, minA, radius * 0.72, radius * 0.04, 'rgba(255,255,255,0.15)');
      // Fill
      this._drawHandShape(ctx, cx, cy, minA, radius * 0.7, radius * 0.035, 'rgba(' + r + ',' + g + ',' + b + ',0.9)');

      // Second hand with counterweight
      if (c.showSeconds !== false) {
        var secA = (seconds * 6 - 90) * Math.PI / 180;
        var hr = handCol.r, hg = handCol.g, hb = handCol.b;
        // Shadow
        ctx.beginPath();
        ctx.moveTo(cx + shadow - Math.cos(secA) * radius * 0.2, cy + shadow - Math.sin(secA) * radius * 0.2);
        ctx.lineTo(cx + shadow + Math.cos(secA) * radius * 0.78, cy + shadow + Math.sin(secA) * radius * 0.78);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Hand
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(secA) * radius * 0.2, cy - Math.sin(secA) * radius * 0.2);
        ctx.lineTo(cx + Math.cos(secA) * radius * 0.78, cy + Math.sin(secA) * radius * 0.78);
        ctx.strokeStyle = 'rgba(' + hr + ',' + hg + ',' + hb + ',0.9)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
        // Counterweight circle
        var tailX = cx - Math.cos(secA) * radius * 0.16;
        var tailY = cy - Math.sin(secA) * radius * 0.16;
        ctx.beginPath();
        ctx.arc(tailX, tailY, radius * 0.03, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + hr + ',' + hg + ',' + hb + ',0.85)';
        ctx.fill();
      }

      // Center pin
      this._drawCenterPin(ctx, cx, cy, radius, col, handCol);

      // Glass reflection
      this._drawGlassReflection(ctx, cx, cy, radius);
    },

    // ── Enhanced hands (used by Classic) ──

    _drawEnhancedHands: function(ctx, cx, cy, radius, col, handCol, now, c) {
      var r = col.r, g = col.g, b = col.b;
      var hr = handCol.r, hg = handCol.g, hb = handCol.b;
      var shadow = radius * 0.012;

      var hours = now.getHours() + now.getMinutes() / 60;
      var minutes = now.getMinutes() + now.getSeconds() / 60;
      var seconds = now.getSeconds() + now.getMilliseconds() / 1000;

      // Hour hand — tapered with shadow
      var ha = (hours * 30 - 90) * Math.PI / 180;
      this._drawTaperedHand(ctx, cx, cy, ha, radius * 0.5, radius * 0.045, 'rgba(' + r + ',' + g + ',' + b + ',0.95)', shadow);

      // Minute hand — tapered with shadow
      var ma = (minutes * 6 - 90) * Math.PI / 180;
      this._drawTaperedHand(ctx, cx, cy, ma, radius * 0.72, radius * 0.03, 'rgba(' + r + ',' + g + ',' + b + ',0.9)', shadow);

      // Second hand with counterweight
      if (c.showSeconds !== false) {
        var sa = (seconds * 6 - 90) * Math.PI / 180;
        // Shadow
        ctx.beginPath();
        ctx.moveTo(cx + shadow - Math.cos(sa) * radius * 0.18, cy + shadow - Math.sin(sa) * radius * 0.18);
        ctx.lineTo(cx + shadow + Math.cos(sa) * radius * 0.78, cy + shadow + Math.sin(sa) * radius * 0.78);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Hand
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(sa) * radius * 0.18, cy - Math.sin(sa) * radius * 0.18);
        ctx.lineTo(cx + Math.cos(sa) * radius * 0.78, cy + Math.sin(sa) * radius * 0.78);
        ctx.strokeStyle = 'rgba(' + hr + ',' + hg + ',' + hb + ',0.85)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Counterweight circle
        var tailX = cx - Math.cos(sa) * radius * 0.14;
        var tailY = cy - Math.sin(sa) * radius * 0.14;
        ctx.beginPath();
        ctx.arc(tailX, tailY, radius * 0.025, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + hr + ',' + hg + ',' + hb + ',0.8)';
        ctx.fill();

        // Tip dot
        ctx.beginPath();
        ctx.arc(cx + Math.cos(sa) * radius * 0.78, cy + Math.sin(sa) * radius * 0.78, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + hr + ',' + hg + ',' + hb + ',0.85)';
        ctx.fill();
      }

      // Center pin
      this._drawCenterPin(ctx, cx, cy, radius, col, handCol);
    },

    _drawDateWindow: function(ctx, cx, cy, radius, col, now) {
      var r = col.r, g = col.g, b = col.b;
      var dateStr = now.getDate();
      var ww = radius * 0.18;
      var wh = radius * 0.14;
      var wx = cx + radius * 0.32;
      var wy = cy - wh / 2;
      // Window background
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.08)';
      ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(wx, wy, ww, wh, 2);
      ctx.fill();
      ctx.stroke();
      // Date text
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.8)';
      ctx.font = 'bold ' + (radius * 0.09) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dateStr, wx + ww / 2, cy + 1);
    },

    destroy: function() {
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._boundResize) {
        window.removeEventListener('resize', this._boundResize);
        this._boundResize = null;
      }
      this._canvas = null;
      this._ctx = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Analog);
})(typeof window !== 'undefined' ? window : this);
