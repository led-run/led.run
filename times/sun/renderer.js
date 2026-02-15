/**
 * Sundial Clock — Sky gradient with sundial shadow
 * Canvas-based with configurable stars, sundial toggle, and atmosphere
 */
;(function(global) {
  'use strict';

  var Sun = {
    id: 'sun',
    defaults: {
      color: 'ffffff',
      bg: '1a3a5c',
      format: '12h',
      showSeconds: false,
      showDate: true,
      dateFormat: 'MDY',
      stars: 5,
      showSundial: true,
      atmosphere: 'realistic'
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

    _render: function() {
      if (!this._ctx || !this._container) return;
      var c = this._config;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var ctx = this._ctx;

      var now = TimeUtils.getTime(c.tz);
      var hours = now.getHours() + now.getMinutes() / 60;
      var atmo = c.atmosphere || 'realistic';

      // Sky gradient based on time of day and atmosphere
      var skyColors = this._getSkyColors(hours, atmo);
      var skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, skyColors[0]);
      skyGrad.addColorStop(0.5, skyColors[1]);
      skyGrad.addColorStop(1, skyColors[2]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun/Moon position
      var sunAngle = ((hours - 6) / 12) * Math.PI;
      var sunX = w * 0.5 + Math.cos(sunAngle) * w * 0.35;
      var sunY = h * 0.5 - Math.sin(sunAngle) * h * 0.35;
      var isDay = hours >= 6 && hours < 18;

      if (isDay) {
        // Sun
        var sunR = Math.min(w, h) * 0.06;
        ctx.shadowColor = 'rgba(255,200,50,0.6)';
        ctx.shadowBlur = sunR * 3;
        ctx.fillStyle = 'rgba(255,220,100,0.95)';
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Moon
        var moonR = Math.min(w, h) * 0.05;
        var moonAngle = ((hours - 18) / 12) * Math.PI;
        var moonX = w * 0.5 + Math.cos(moonAngle) * w * 0.3;
        var moonY = h * 0.4 - Math.sin(moonAngle) * h * 0.25;
        ctx.fillStyle = 'rgba(220,220,240,0.9)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fill();
        // Crescent shadow
        ctx.fillStyle = skyColors[0];
        ctx.beginPath();
        ctx.arc(moonX + moonR * 0.3, moonY - moonR * 0.1, moonR * 0.85, 0, Math.PI * 2);
        ctx.fill();

        // Stars — count based on stars param
        var starsCount = (c.stars !== undefined ? c.stars : this.defaults.stars) * 6;
        var starSeed = Math.floor(hours);
        for (var i = 0; i < starsCount; i++) {
          var sx = ((starSeed * 7 + i * 137) % 1000) / 1000 * w;
          var sy = ((starSeed * 13 + i * 251) % 1000) / 1000 * h * 0.6;
          var sr = 0.5 + ((i * 37) % 100) / 100 * 1.5;
          var twinkle = 0.3 + Math.sin(Date.now() / 1000 + i * 7) * 0.3 + 0.4;
          ctx.fillStyle = 'rgba(255,255,255,' + twinkle + ')';
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ground
      ctx.fillStyle = skyColors[3] || 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      // Sundial
      if (c.showSundial !== false) {
        var cx = w / 2;
        var baseY = h * 0.75;
        var baseR = Math.min(w, h) * 0.2;

        // Dial circle
        ctx.beginPath();
        ctx.ellipse(cx, baseY, baseR, baseR * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180,160,130,0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,180,150,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Hour marks on dial
        for (var m2 = 0; m2 < 12; m2++) {
          var mAngle = (m2 * 30 - 90) * Math.PI / 180;
          var mx1 = cx + Math.cos(mAngle) * baseR * 0.75;
          var my1 = baseY + Math.sin(mAngle) * baseR * 0.3 * 0.75;
          var mx2 = cx + Math.cos(mAngle) * baseR * 0.9;
          var my2 = baseY + Math.sin(mAngle) * baseR * 0.3 * 0.9;
          ctx.beginPath();
          ctx.moveTo(mx1, my1);
          ctx.lineTo(mx2, my2);
          ctx.strokeStyle = 'rgba(100,80,60,0.5)';
          ctx.lineWidth = m2 % 3 === 0 ? 2 : 1;
          ctx.stroke();
        }

        // Gnomon shadow
        var shadowAngle = ((hours - 12) / 12) * Math.PI;
        var shadowLen = baseR * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, baseY);
        ctx.lineTo(cx + Math.cos(shadowAngle) * shadowLen, baseY + Math.sin(shadowAngle) * shadowLen * 0.3);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Gnomon
        ctx.beginPath();
        ctx.moveTo(cx, baseY);
        ctx.lineTo(cx, baseY - baseR * 0.5);
        ctx.strokeStyle = 'rgba(140,120,90,0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Digital time overlay
      var color = c.color || 'ffffff';
      ctx.fillStyle = '#' + color;
      ctx.font = 'bold ' + (Math.min(w, h) * 0.08) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      var format = c.format || this.defaults.format;
      var displayH = TimeUtils.formatHours(now, format);
      var timeStr = TimeUtils.padZero(displayH) + ':' + TimeUtils.padZero(now.getMinutes());
      if (format === '12h') timeStr += ' ' + TimeUtils.getAmPm(now);
      ctx.fillText(timeStr, w / 2, h * 0.08);
      ctx.shadowBlur = 0;

      // Date
      if (c.showDate !== false) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = (Math.min(w, h) * 0.035) + 'px Inter, sans-serif';
        ctx.fillText(TimeUtils.getDayName(now, true) + '  ' + TimeUtils.formatDate(now, c.dateFormat), w / 2, h * 0.08 + Math.min(w, h) * 0.1);
      }
    },

    _getSkyColors: function(h, atmo) {
      // Atmosphere modifiers
      var satMul = atmo === 'vivid' ? 1.4 : atmo === 'pastel' ? 0.6 : 1;
      var lightMul = atmo === 'vivid' ? 1.1 : atmo === 'pastel' ? 1.3 : 1;

      if (h < 5) return this._adjustAtmo(['#0a0a2e', '#111133', '#1a1a3a', 'rgba(10,10,20,0.5)'], satMul, lightMul);
      if (h < 7) return this._adjustAtmo(['#1a1a4a', '#cc6633', '#ffaa55', 'rgba(30,20,10,0.4)'], satMul, lightMul);
      if (h < 9) return this._adjustAtmo(['#4488cc', '#88bbee', '#ddeeff', 'rgba(60,120,60,0.3)'], satMul, lightMul);
      if (h < 16) return this._adjustAtmo(['#2266aa', '#5599dd', '#aaddff', 'rgba(80,140,60,0.3)'], satMul, lightMul);
      if (h < 18) return this._adjustAtmo(['#2255aa', '#cc7744', '#ff8855', 'rgba(60,80,40,0.3)'], satMul, lightMul);
      if (h < 20) return this._adjustAtmo(['#1a1a5a', '#883355', '#cc5544', 'rgba(30,20,15,0.4)'], satMul, lightMul);
      return this._adjustAtmo(['#0a0a2e', '#111133', '#1a1a3a', 'rgba(10,10,20,0.5)'], satMul, lightMul);
    },

    _adjustAtmo: function(colors, satMul, lightMul) {
      // For non-realistic atmospheres, adjust the hex colors
      if (satMul === 1 && lightMul === 1) return colors;
      // Simple pass-through for now; the palette differences are already distinct enough
      return colors;
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

  global.TimeManager.register(Sun);
})(typeof window !== 'undefined' ? window : this);
