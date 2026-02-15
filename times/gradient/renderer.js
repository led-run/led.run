/**
 * Gradient Clock — Background color shifts with time of day
 * Canvas/DOM hybrid with smooth color transitions
 * Supports palettes: auto, ocean, sunset, forest, neon, mono
 */
;(function(global) {
  'use strict';

  var Gradient = {
    id: 'gradient',
    defaults: {
      color: 'ffffff',
      bg: '000000',
      format: '24h',
      showSeconds: false,
      showDate: true,
      dateFormat: 'MDY',
      palette: 'auto',
      angle: 135
    },

    _container: null,
    _bgEl: null,
    _timeEl: null,
    _dateEl: null,
    _raf: null,
    _config: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      // Container-relative sizing
      var cw = container.clientWidth;
      var ch = container.clientHeight;
      function s(xPct, yPct) {
        return Math.min(cw * xPct / 100, ch * (yPct !== undefined ? yPct : xPct) / 100) + 'px';
      }

      container.style.overflow = 'hidden';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.position = 'relative';

      // Animated background
      this._bgEl = document.createElement('div');
      this._bgEl.style.cssText = 'position:absolute;inset:0;transition:background 2s ease;';
      container.appendChild(this._bgEl);

      // Content
      var content = document.createElement('div');
      content.style.cssText = 'position:relative;z-index:1;text-align:center;';

      this._timeEl = document.createElement('div');
      this._timeEl.style.cssText = 'font-family:Inter,sans-serif;font-size:' + s(18, 25) + ';' +
        'font-weight:700;line-height:1;color:#fff;' +
        'text-shadow:0 2px 20px rgba(0,0,0,0.3);letter-spacing:-0.02em;mix-blend-mode:difference;';
      content.appendChild(this._timeEl);

      if (config.showDate !== false) {
        this._dateEl = document.createElement('div');
        this._dateEl.style.cssText = 'font-family:Inter,sans-serif;font-size:' + s(3, 4) + ';' +
          'font-weight:300;color:rgba(255,255,255,0.7);margin-top:' + s(2) + ';' +
          'text-shadow:0 1px 8px rgba(0,0,0,0.3);letter-spacing:0.1em;mix-blend-mode:difference;';
        content.appendChild(this._dateEl);
      }

      container.appendChild(content);

      var self = this;
      function loop() {
        self._render();
        self._raf = requestAnimationFrame(loop);
      }
      loop();
    },

    _render: function() {
      if (!this._timeEl) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var hours = now.getHours() + now.getMinutes() / 60;
      var angle = c.angle !== undefined ? c.angle : this.defaults.angle;

      // Update background gradient based on time and palette
      var colors = this._getGradientColors(hours, c.palette || 'auto');
      this._bgEl.style.background = 'linear-gradient(' + angle + 'deg, ' + colors[0] + ', ' + colors[1] + ', ' + colors[2] + ')';

      // Time
      var format = c.format || this.defaults.format;
      var h = TimeUtils.formatHours(now, format);
      var timeStr = TimeUtils.padZero(h) + ':' + TimeUtils.padZero(now.getMinutes());
      if (c.showSeconds) timeStr += ':' + TimeUtils.padZero(now.getSeconds());
      if (format === '12h') timeStr += ' ' + TimeUtils.getAmPm(now);
      this._timeEl.textContent = timeStr;

      // Date
      if (this._dateEl) {
        var day = TimeUtils.getDayName(now, true);
        var month = TimeUtils.getMonthName(now, true);
        this._dateEl.textContent = day + ', ' + month + ' ' + now.getDate();
      }
    },

    _getGradientColors: function(h, palette) {
      if (palette === 'ocean') return this._oceanPalette(h);
      if (palette === 'sunset') return this._sunsetPalette(h);
      if (palette === 'forest') return this._forestPalette(h);
      if (palette === 'neon') return this._neonPalette(h);
      if (palette === 'mono') return this._monoPalette(h);
      return this._autoPalette(h);
    },

    _autoPalette: function(h) {
      // Original time-of-day color transitions
      var t = h / 24;
      var hue1 = (t * 360 + 200) % 360;
      var hue2 = (hue1 + 40) % 360;
      var hue3 = (hue1 + 80) % 360;
      var sat, light;

      if (h < 5 || h >= 21) {
        sat = 50; light = 10;
      } else if (h < 7) {
        sat = 60; light = 25;
        hue1 = 10 + (h - 5) * 15;
        hue2 = hue1 + 30; hue3 = hue1 + 60;
      } else if (h < 10) {
        sat = 55; light = 40;
        hue1 = 180 + (h - 7) * 10;
        hue2 = hue1 + 30; hue3 = hue1 + 60;
      } else if (h < 16) {
        sat = 60; light = 45;
      } else if (h < 19) {
        sat = 65; light = 35;
        hue1 = 15 + (h - 16) * 5;
        hue2 = hue1 + 25; hue3 = hue1 + 50;
      } else {
        sat = 50; light = 15;
        hue1 = 250; hue2 = 280; hue3 = 310;
      }

      return [
        'hsl(' + hue1 + ',' + sat + '%,' + light + '%)',
        'hsl(' + hue2 + ',' + sat + '%,' + (light * 0.8) + '%)',
        'hsl(' + hue3 + ',' + sat + '%,' + (light * 0.6) + '%)'
      ];
    },

    _oceanPalette: function(h) {
      var t = h / 24;
      var depth = 15 + Math.sin(t * Math.PI) * 20;
      return [
        'hsl(200, 70%, ' + depth + '%)',
        'hsl(220, 60%, ' + (depth * 0.7) + '%)',
        'hsl(190, 50%, ' + (depth * 0.5) + '%)'
      ];
    },

    _sunsetPalette: function(h) {
      var t = h / 24;
      var hue = 10 + Math.sin(t * Math.PI) * 30;
      var light = 20 + Math.sin(t * Math.PI) * 30;
      return [
        'hsl(' + hue + ', 80%, ' + light + '%)',
        'hsl(' + (hue + 30) + ', 70%, ' + (light * 0.7) + '%)',
        'hsl(' + (hue + 60) + ', 60%, ' + (light * 0.5) + '%)'
      ];
    },

    _forestPalette: function(h) {
      var t = h / 24;
      var light = 10 + Math.sin(t * Math.PI) * 25;
      return [
        'hsl(120, 40%, ' + light + '%)',
        'hsl(140, 35%, ' + (light * 0.7) + '%)',
        'hsl(80, 30%, ' + (light * 0.5) + '%)'
      ];
    },

    _neonPalette: function(h) {
      var t = h / 24;
      var hue = (t * 360) % 360;
      return [
        'hsl(' + hue + ', 100%, 15%)',
        'hsl(' + ((hue + 120) % 360) + ', 90%, 10%)',
        'hsl(' + ((hue + 240) % 360) + ', 80%, 8%)'
      ];
    },

    _monoPalette: function(h) {
      var t = h / 24;
      var light = 5 + Math.sin(t * Math.PI) * 20;
      return [
        'hsl(0, 0%, ' + light + '%)',
        'hsl(0, 0%, ' + (light * 0.6) + '%)',
        'hsl(0, 0%, ' + (light * 0.3) + '%)'
      ];
    },

    _resizeHandler: function() {
      var container = this._container;
      var config = this._config;
      this.destroy();
      container.innerHTML = '';
      this.init(container, config);
    },

    destroy: function() {
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      this._bgEl = null;
      this._timeEl = null;
      this._dateEl = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Gradient);
})(typeof window !== 'undefined' ? window : this);
