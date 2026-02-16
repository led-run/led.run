/**
 * Neon Clock — Glowing neon tube sign
 * DOM-based with configurable glow, flicker, and tube style
 */
;(function(global) {
  'use strict';

  var Neon = {
    id: 'neon',
    defaults: {
      color: 'ff1493',
      bg: '0a0010',
      format: '12h',
      showSeconds: false,
      showDate: false,
      dateFormat: 'MDY',
      glow: 7,
      flicker: 2,
      tube: 'single'
    },

    _container: null,
    _timeEl: null,
    _dateEl: null,
    _ampmEl: null,
    _timer: null,
    _config: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      var bg = config.bg || this.defaults.bg;
      var color = config.color || this.defaults.color;
      var glow = config.glow !== undefined ? config.glow : this.defaults.glow;
      var tube = config.tube || this.defaults.tube;

      // Container-relative sizing
      var cw = container.clientWidth;
      var ch = container.clientHeight;
      function s(xPct, yPct) {
        return Math.min(cw * xPct / 100, ch * (yPct !== undefined ? yPct : xPct) / 100) + 'px';
      }

      container.style.background = '#' + bg;
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.overflow = 'hidden';

      // Padding proportional to glow to prevent text-shadow clipping
      var glowMul = glow / 7; // normalize to default
      var pad = Math.round(Math.max(10, 40 * glowMul));

      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'text-align:center;position:relative;padding:' + pad + 'px;box-sizing:border-box;max-width:100%;max-height:100%;';

      // Build text-shadow from glow level
      var shadow = this._buildShadow(color, glowMul, tube);

      // Time — shrink font when seconds are shown to keep centered
      var showSec = !!config.showSeconds;
      var timeFontSize = showSec ? s(12, 18) : s(18, 26);

      this._timeEl = document.createElement('div');
      var tubeStyles = '';
      if (tube === 'outline') {
        tubeStyles = '-webkit-text-stroke:2px #' + color + ';color:transparent;';
      } else if (tube === 'double') {
        tubeStyles = 'color:#' + color + ';-webkit-text-stroke:1px rgba(255,255,255,0.3);';
      } else {
        tubeStyles = 'color:#' + color + ';';
      }
      this._timeEl.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:' + timeFontSize + ';' +
        'font-weight:700;line-height:1;white-space:nowrap;' + tubeStyles +
        'text-shadow:' + shadow + ';letter-spacing:0.05em;';
      wrapper.appendChild(this._timeEl);

      // AM/PM
      var format = config.format || this.defaults.format;
      if (format === '12h') {
        this._ampmEl = document.createElement('div');
        this._ampmEl.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:' + s(4, 5) + ';' +
          'color:#' + color + ';opacity:0.7;margin-top:' + s(1, 1.5) + ';letter-spacing:0.3em;' +
          'text-shadow:0 0 7px #' + color + ',0 0 15px #' + color + '60;';
        wrapper.appendChild(this._ampmEl);
      }

      // Date
      if (config.showDate) {
        this._dateEl = document.createElement('div');
        this._dateEl.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:' + s(3, 3.5) + ';' +
          'color:#' + color + ';opacity:0.35;margin-top:' + s(3) + ';letter-spacing:0.1em;' +
          'text-shadow:0 0 5px #' + color + '60;';
        wrapper.appendChild(this._dateEl);
      }

      container.appendChild(wrapper);

      var self = this;
      this._timer = setInterval(function() { self._render(); }, 500);
      this._render();
    },

    _buildShadow: function(color, glowMul, tube) {
      var layers = [];
      // Base layers
      layers.push('0 0 ' + Math.round(7 * glowMul) + 'px #' + color);
      layers.push('0 0 ' + Math.round(10 * glowMul) + 'px #' + color);
      layers.push('0 0 ' + Math.round(21 * glowMul) + 'px #' + color);

      // Extended glow
      if (glowMul > 0.5) {
        layers.push('0 0 ' + Math.round(42 * glowMul) + 'px #' + color + '80');
        layers.push('0 0 ' + Math.round(82 * glowMul) + 'px #' + color + '40');
      }

      // Extra bloom for high glow
      if (glowMul > 1) {
        layers.push('0 0 ' + Math.round(92 * glowMul) + 'px #' + color + '20');
      }

      // Outline mode: add inner glow
      if (tube === 'outline') {
        layers.push('0 0 3px #' + color);
      }

      return layers.join(',');
    },

    _render: function() {
      if (!this._timeEl) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var format = c.format || this.defaults.format;
      var h = TimeUtils.formatHours(now, format);
      var m = TimeUtils.padZero(now.getMinutes());

      var timeStr = TimeUtils.padZero(h) + ':' + m;
      if (c.showSeconds) timeStr += ':' + TimeUtils.padZero(now.getSeconds());

      // Configurable flicker
      var flickerLevel = c.flicker !== undefined ? c.flicker : this.defaults.flicker;
      if (flickerLevel > 0) {
        var range = flickerLevel * 0.01;
        var flicker = 1 - range + Math.random() * range;
        this._timeEl.style.opacity = flicker;
      } else {
        this._timeEl.style.opacity = 1;
      }

      this._timeEl.textContent = timeStr;

      if (this._ampmEl) {
        this._ampmEl.textContent = TimeUtils.getAmPm(now);
      }

      if (this._dateEl) {
        var day = TimeUtils.getDayName(now, true);
        var month = TimeUtils.getMonthName(now, true);
        this._dateEl.textContent = day + ' ' + month + ' ' + now.getDate();
      }
    },

    _resizeHandler: function() {
      var container = this._container;
      var config = this._config;
      this.destroy();
      container.innerHTML = '';
      this.init(container, config);
    },

    destroy: function() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      this._timeEl = null;
      this._dateEl = null;
      this._ampmEl = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Neon);
})(typeof window !== 'undefined' ? window : this);
