/**
 * Calendar Clock — Monthly calendar with time
 * DOM-based with configurable weekend highlight, compact mode, and weekend color
 */
;(function(global) {
  'use strict';

  var Calendar = {
    id: 'calendar',
    defaults: {
      color: 'ffffff',
      bg: '1a1a2e',
      fill: 'e63946',
      format: '24h',
      showSeconds: false,
      showDate: true,
      dateFormat: 'MDY',
      firstDay: 'sun',
      weekendHighlight: false,
      compact: false,
      weekendColor: 'ff6b6b'
    },

    _container: null,
    _wrapper: null,
    _timer: null,
    _config: null,
    _lastHTML: '',
    _s: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      var bg = config.bg || this.defaults.bg;

      // Container-relative sizing
      var cw = container.clientWidth;
      var ch = container.clientHeight;
      function s(xPct, yPct) {
        return Math.min(cw * xPct / 100, ch * (yPct !== undefined ? yPct : xPct) / 100) + 'px';
      }
      this._s = s;

      container.style.background = '#' + bg;
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.overflow = 'hidden';
      container.style.padding = s(3);
      container.style.fontFamily = 'Inter, -apple-system, sans-serif';

      this._wrapper = document.createElement('div');
      this._wrapper.style.cssText = 'text-align:center;width:' + Math.min(cw * 0.9, ch * 0.8, 600) + 'px;';

      container.appendChild(this._wrapper);

      var self = this;
      this._timer = setInterval(function() { self._render(); }, 1000);
      this._render();
    },

    _isWeekend: function(dayOfWeek) {
      return dayOfWeek === 0 || dayOfWeek === 6;
    },

    _render: function() {
      if (!this._wrapper) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var color = c.color || this.defaults.color;
      var fill = c.fill || this.defaults.fill;
      var monStart = c.firstDay === 'mon';
      var isCompact = c.compact === true || c.compact === 'true';
      var showWeekend = c.weekendHighlight === true || c.weekendHighlight === 'true';
      var weekendColor = c.weekendColor || this.defaults.weekendColor;
      var sf = this._s;

      var html = '';

      // Time header (hidden in compact mode)
      if (!isCompact) {
        var format = c.format || this.defaults.format;
        var h = TimeUtils.formatHours(now, format);
        var timeStr = TimeUtils.padZero(h) + ':' + TimeUtils.padZero(now.getMinutes());
        if (c.showSeconds) timeStr += ':' + TimeUtils.padZero(now.getSeconds());
        if (format === '12h') timeStr += ' ' + TimeUtils.getAmPm(now);

        html += '<div style="color:#' + color + ';font-size:' + sf(10, 12) + ';font-weight:700;line-height:1;margin-bottom:' + sf(2) + ';">' + timeStr + '</div>';
      }

      // Month/Year header
      var monthName = TimeUtils.getMonthName(now, false);
      var headerSize = isCompact ? sf(4.5, 5.5) : sf(3.5, 4);
      html += '<div style="color:#' + color + ';font-size:' + headerSize + ';font-weight:600;margin-bottom:' + sf(2) + ';opacity:0.8;letter-spacing:0.1em;">' +
        monthName.toUpperCase() + ' ' + now.getFullYear() + '</div>';

      // Day headers
      var dayHeaders = monStart ? ['Mo','Tu','We','Th','Fr','Sa','Su'] : ['Su','Mo','Tu','We','Th','Fr','Sa'];
      var cellSize = isCompact ? sf(2.8, 3.2) : sf(2, 2.5);
      html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:' + sf(0.5) + ';">';

      for (var i = 0; i < dayHeaders.length; i++) {
        var headerDow = monStart ? ((i + 1) % 7) : i;
        var isWeekendHeader = showWeekend && this._isWeekend(headerDow);
        var headerColor = isWeekendHeader ? weekendColor : color;
        var headerOpacity = isWeekendHeader ? '0.7' : '0.4';
        html += '<div style="color:#' + headerColor + ';opacity:' + headerOpacity + ';font-size:' + cellSize + ';padding:' + sf(0.5) + ';font-weight:600;">' + dayHeaders[i] + '</div>';
      }

      // Calendar grid
      var year = now.getFullYear();
      var month = now.getMonth();
      var today = now.getDate();
      var firstDate = new Date(year, month, 1);
      var firstDow = firstDate.getDay();
      if (monStart) firstDow = (firstDow + 6) % 7;
      var daysInMonth = new Date(year, month + 1, 0).getDate();

      var dayCellSize = isCompact ? sf(3.2, 3.8) : sf(2.5, 3);

      // Empty cells before first day
      for (var e = 0; e < firstDow; e++) {
        html += '<div></div>';
      }

      // Day cells
      for (var d = 1; d <= daysInMonth; d++) {
        var isToday = d === today;
        // Calculate actual day of week for this date
        var dow = (firstDate.getDay() + d - 1) % 7;
        var isWeekendDay = showWeekend && this._isWeekend(dow);

        var cellStyle = 'padding:' + sf(1, 1.2) + ';font-size:' + dayCellSize + ';border-radius:' + sf(0.8) + ';';
        if (isToday) {
          cellStyle += 'background:#' + fill + ';color:#fff;font-weight:700;';
        } else if (isWeekendDay) {
          cellStyle += 'color:#' + weekendColor + ';opacity:0.85;font-weight:500;';
        } else {
          cellStyle += 'color:#' + color + ';opacity:0.7;';
        }
        html += '<div style="' + cellStyle + '">' + d + '</div>';
      }

      html += '</div>';

      // Only update DOM if content changed
      if (html !== this._lastHTML) {
        this._wrapper.innerHTML = html;
        this._lastHTML = html;
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
      this._wrapper = null;
      this._lastHTML = '';
      this._s = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Calendar);
})(typeof window !== 'undefined' ? window : this);
