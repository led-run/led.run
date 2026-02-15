/**
 * Minimal Clock — Clean typography
 * DOM-based with configurable weight, separator, and case
 */
;(function(global) {
  'use strict';

  var Minimal = {
    id: 'minimal',
    defaults: {
      color: 'ffffff',
      bg: '111111',
      format: '24h',
      showSeconds: false,
      showDate: true,
      dateFormat: 'MDY',
      align: 'center',
      weight: '200',
      separator: 'colon',
      uppercase: true
    },

    _container: null,
    _timeEl: null,
    _dateEl: null,
    _timer: null,
    _config: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      var bg = config.bg || this.defaults.bg;
      var color = config.color || this.defaults.color;
      var weight = config.weight || this.defaults.weight;

      // Container-relative sizing
      var cw = container.clientWidth;
      var ch = container.clientHeight;
      function s(xPct, yPct) {
        return Math.min(cw * xPct / 100, ch * (yPct !== undefined ? yPct : xPct) / 100) + 'px';
      }

      container.style.background = '#' + bg;
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = config.align === 'left' ? 'flex-start' : config.align === 'right' ? 'flex-end' : 'center';
      container.style.justifyContent = 'center';
      container.style.padding = (cw * 5 / 100) + 'px';
      container.style.fontFamily = 'Inter, -apple-system, sans-serif';
      container.style.overflow = 'hidden';

      this._timeEl = document.createElement('div');
      this._timeEl.style.color = '#' + color;
      this._timeEl.style.fontSize = s(20, 30);
      this._timeEl.style.fontWeight = weight;
      this._timeEl.style.letterSpacing = '-0.02em';
      this._timeEl.style.lineHeight = '1';
      container.appendChild(this._timeEl);

      if (config.showDate !== false) {
        this._dateEl = document.createElement('div');
        this._dateEl.style.color = '#' + color;
        this._dateEl.style.opacity = '0.4';
        this._dateEl.style.fontSize = s(3.5, 4);
        this._dateEl.style.fontWeight = '300';
        this._dateEl.style.marginTop = (ch * 2 / 100) + 'px';
        this._dateEl.style.letterSpacing = '0.1em';
        if (config.uppercase !== false) {
          this._dateEl.style.textTransform = 'uppercase';
        }
        container.appendChild(this._dateEl);
      }

      var self = this;
      this._timer = setInterval(function() { self._render(); }, 1000);
      this._render();
    },

    _render: function() {
      if (!this._timeEl) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var h = TimeUtils.formatHours(now, c.format);
      var m = TimeUtils.padZero(now.getMinutes());
      var sep = this._getSeparator(c.separator);

      var timeStr = TimeUtils.padZero(h) + sep + m;
      if (c.showSeconds) timeStr += sep + TimeUtils.padZero(now.getSeconds());
      if (c.format === '12h') timeStr += ' ' + TimeUtils.getAmPm(now);
      this._timeEl.textContent = timeStr;

      if (this._dateEl) {
        var dayName = TimeUtils.getDayName(now, false);
        var monthName = TimeUtils.getMonthName(now, true);
        this._dateEl.textContent = dayName + ', ' + monthName + ' ' + now.getDate() + ', ' + now.getFullYear();
      }
    },

    _getSeparator: function(sep) {
      if (sep === 'dot') return '\u00b7';
      if (sep === 'space') return ' ';
      if (sep === 'none') return '';
      return ':';
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
      this._container = null;
    }
  };

  global.TimeManager.register(Minimal);
})(typeof window !== 'undefined' ? window : this);
