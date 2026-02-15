/**
 * LCD Clock — Casio-style LCD watch face
 * DOM-based with configurable backlight, bezel, brand, scale, position, and fullscreen mode
 */
;(function(global) {
  'use strict';

  // Position -> CSS align-items / justify-content mapping
  var POSITIONS = {
    'center':       { ai: 'center',     jc: 'center' },
    'top':          { ai: 'center',     jc: 'flex-start' },
    'bottom':       { ai: 'center',     jc: 'flex-end' },
    'top-left':     { ai: 'flex-start', jc: 'flex-start' },
    'top-right':    { ai: 'flex-end',   jc: 'flex-start' },
    'bottom-left':  { ai: 'flex-start', jc: 'flex-end' },
    'bottom-right': { ai: 'flex-end',   jc: 'flex-end' }
  };

  var LCD = {
    id: 'lcd',
    defaults: {
      color: '2a3a2a',
      bg: '8a9f78',
      fill: '1a1a1a',
      format: '12h',
      showSeconds: true,
      showDate: true,
      dateFormat: 'MDY',
      backlight: 0,
      bezel: true,
      brand: 'led.run',
      lcdScale: 1.0,
      lcdPosition: 'center',
      lcdFull: false
    },

    _container: null,
    _timeEl: null,
    _dateEl: null,
    _ampmEl: null,
    _secEl: null,
    _timer: null,
    _config: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      var bg = config.bg || this.defaults.bg;
      var fill = config.fill || this.defaults.fill;
      var color = config.color || this.defaults.color;
      var showBezel = config.bezel !== false;
      var backlight = config.backlight !== undefined ? config.backlight : this.defaults.backlight;
      var brand = config.brand !== undefined ? config.brand : this.defaults.brand;
      var lcdScale = config.lcdScale !== undefined ? config.lcdScale : this.defaults.lcdScale;
      var lcdPosition = config.lcdPosition || this.defaults.lcdPosition;
      var lcdFull = !!config.lcdFull;

      // Container-relative sizing
      var cw = container.clientWidth;
      var ch = container.clientHeight;
      function s(xPct, yPct) {
        return Math.min(cw * xPct / 100, ch * (yPct !== undefined ? yPct : xPct) / 100) + 'px';
      }

      // Position mapping
      var pos = POSITIONS[lcdPosition] || POSITIONS.center;

      container.style.background = '#' + fill;
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = pos.ai;
      container.style.justifyContent = pos.jc;
      container.style.overflow = 'hidden';
      container.style.padding = lcdFull ? '0' : s(2);

      if (lcdFull) {
        // Fullscreen mode — LCD fills entire container, no bezel
        var lcd = document.createElement('div');
        lcd.style.cssText = 'width:100%;height:100%;background:#' + bg +
          ';display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;';

        // Backlight overlay
        if (backlight > 0) {
          var blAlpha = backlight * 0.03;
          var blOverlay = document.createElement('div');
          blOverlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;' +
            'background:radial-gradient(ellipse at center, rgba(100,200,150,' + blAlpha + ') 0%, transparent 70%);' +
            'box-shadow:inset 0 0 ' + (backlight * 3) + 'px rgba(100,200,150,' + (blAlpha * 0.5) + ');';
          lcd.appendChild(blOverlay);
        }

        var inner = document.createElement('div');
        inner.style.cssText = 'text-align:center;position:relative;';

        // Date row
        if (config.showDate !== false) {
          this._dateEl = document.createElement('div');
          this._dateEl.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
            'font-size:' + s(4, 5) + ';opacity:0.7;margin-bottom:' + s(1.5, 2) + ';letter-spacing:0.1em;';
          inner.appendChild(this._dateEl);
        }

        // Time row
        var timeRow = document.createElement('div');
        timeRow.style.cssText = 'display:flex;align-items:flex-end;justify-content:center;gap:' + s(1.5) + ';';

        if (config.format === '12h' || (!config.format && this.defaults.format === '12h')) {
          this._ampmEl = document.createElement('div');
          this._ampmEl.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
            'font-size:' + s(4, 5) + ';opacity:0.7;padding-bottom:' + s(0.5) + ';margin-right:' + s(0.5) + ';';
          timeRow.appendChild(this._ampmEl);
        }

        this._timeEl = document.createElement('div');
        this._timeEl.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
          'font-size:' + s(22, 30) + ';font-weight:700;line-height:1;letter-spacing:0.05em;';
        timeRow.appendChild(this._timeEl);

        if (config.showSeconds !== false) {
          this._secEl = document.createElement('div');
          this._secEl.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
            'font-size:' + s(8, 10) + ';font-weight:700;padding-bottom:' + s(0.5) + ';opacity:0.8;';
          timeRow.appendChild(this._secEl);
        }

        inner.appendChild(timeRow);
        lcd.appendChild(inner);
        container.appendChild(lcd);
      } else {
        // Normal mode — bezel with optional scale wrapper
        var scaleWrapper = document.createElement('div');
        scaleWrapper.style.cssText = 'transform:scale(' + lcdScale + ');transform-origin:' +
          this._scaleOrigin(lcdPosition) + ';';

        var bezel = document.createElement('div');
        if (showBezel) {
          bezel.style.cssText = 'background:#' + bg + ';border-radius:' + s(3) + ';' +
            'padding:' + s(4, 5) + ' ' + s(5, 6) + ';position:relative;' +
            'box-shadow:inset 0 2px 8px rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.5);' +
            'border:2px solid rgba(0,0,0,0.1);';
        } else {
          bezel.style.cssText = 'background:#' + bg + ';' +
            'padding:' + s(4, 5) + ' ' + s(5, 6) + ';position:relative;';
        }

        // Backlight overlay
        if (backlight > 0) {
          var blAlpha2 = backlight * 0.03;
          var blOverlay2 = document.createElement('div');
          blOverlay2.style.cssText = 'position:absolute;inset:0;pointer-events:none;border-radius:inherit;' +
            'background:radial-gradient(ellipse at center, rgba(100,200,150,' + blAlpha2 + ') 0%, transparent 70%);' +
            'box-shadow:inset 0 0 ' + (backlight * 3) + 'px rgba(100,200,150,' + (blAlpha2 * 0.5) + ');';
          bezel.appendChild(blOverlay2);
        }

        // Inner LCD area
        var lcd2 = document.createElement('div');
        lcd2.style.cssText = 'text-align:center;position:relative;';

        // Day/Date row
        if (config.showDate !== false) {
          this._dateEl = document.createElement('div');
          this._dateEl.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
            'font-size:' + s(3, 4) + ';opacity:0.7;margin-bottom:' + s(1, 1.5) + ';letter-spacing:0.1em;';
          lcd2.appendChild(this._dateEl);
        }

        // Time row
        var timeRow2 = document.createElement('div');
        timeRow2.style.cssText = 'display:flex;align-items:flex-end;justify-content:center;gap:' + s(1) + ';';

        // AM/PM
        if (config.format === '12h' || (!config.format && this.defaults.format === '12h')) {
          this._ampmEl = document.createElement('div');
          this._ampmEl.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
            'font-size:' + s(3, 4) + ';opacity:0.7;padding-bottom:' + s(0.5) + ';margin-right:' + s(0.5) + ';';
          timeRow2.appendChild(this._ampmEl);
        }

        this._timeEl = document.createElement('div');
        this._timeEl.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
          'font-size:' + s(16, 22) + ';font-weight:700;line-height:1;letter-spacing:0.05em;';
        timeRow2.appendChild(this._timeEl);

        // Seconds
        if (config.showSeconds !== false) {
          this._secEl = document.createElement('div');
          this._secEl.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
            'font-size:' + s(6, 8) + ';font-weight:700;padding-bottom:' + s(0.5) + ';opacity:0.8;';
          timeRow2.appendChild(this._secEl);
        }

        lcd2.appendChild(timeRow2);

        // Bottom label
        if (brand) {
          var label = document.createElement('div');
          label.style.cssText = 'color:#' + color + ';font-family:"JetBrains Mono",monospace;' +
            'font-size:' + s(1.8, 2) + ';opacity:0.35;margin-top:' + s(2, 2.5) + ';letter-spacing:0.3em;text-transform:uppercase;';
          label.textContent = brand;
          lcd2.appendChild(label);
        }

        bezel.appendChild(lcd2);
        scaleWrapper.appendChild(bezel);
        container.appendChild(scaleWrapper);
      }

      var self = this;
      this._timer = setInterval(function() { self._render(); }, 1000);
      this._render();
    },

    _scaleOrigin: function(pos) {
      switch (pos) {
        case 'top':          return 'center top';
        case 'bottom':       return 'center bottom';
        case 'top-left':     return 'left top';
        case 'top-right':    return 'right top';
        case 'bottom-left':  return 'left bottom';
        case 'bottom-right': return 'right bottom';
        default:             return 'center center';
      }
    },

    _render: function() {
      if (!this._timeEl) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var format = c.format || this.defaults.format;
      var h = TimeUtils.formatHours(now, format);
      var m = TimeUtils.padZero(now.getMinutes());

      this._timeEl.textContent = TimeUtils.padZero(h) + ':' + m;

      if (this._secEl) {
        this._secEl.textContent = TimeUtils.padZero(now.getSeconds());
      }

      if (this._ampmEl) {
        this._ampmEl.textContent = TimeUtils.getAmPm(now);
      }

      if (this._dateEl) {
        var day = TimeUtils.getDayName(now, true).toUpperCase();
        this._dateEl.textContent = day + '  ' + TimeUtils.formatDate(now, c.dateFormat);
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
      this._secEl = null;
      this._container = null;
    }
  };

  global.TimeManager.register(LCD);
})(typeof window !== 'undefined' ? window : this);
