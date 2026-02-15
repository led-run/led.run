/**
 * Binary Clock — Binary column display
 * DOM-based with configurable glow, bit shape, and labels
 */
;(function(global) {
  'use strict';

  var Binary = {
    id: 'binary',
    defaults: {
      color: '00ccff',
      bg: '0a0a1a',
      format: '24h',
      showSeconds: true,
      showDate: false,
      dotStyle: 'solid',
      glow: 5,
      bitShape: 'square',
      showLabels: true
    },

    _container: null,
    _grid: null,
    _labels: null,
    _headerLabels: null,
    _timer: null,
    _config: null,
    _dots: null,
    _prevBits: null,
    _s: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      var bg = config.bg || this.defaults.bg;
      var color = config.color || this.defaults.color;

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
      container.style.fontFamily = '"JetBrains Mono", monospace';
      container.style.overflow = 'hidden';

      var wrapper = document.createElement('div');
      wrapper.style.textAlign = 'center';

      var showLabels = config.showLabels !== false;
      var cols = config.showSeconds !== false ? 6 : 4;
      var glow = config.glow !== undefined ? config.glow : this.defaults.glow;
      var bitShape = config.bitShape || this.defaults.bitShape;
      var borderRadius = bitShape === 'round' ? '50%' : bitShape === 'diamond' ? '2px' : '15%';

      // Column labels
      if (showLabels) {
        var labelRow = document.createElement('div');
        labelRow.style.display = 'flex';
        labelRow.style.gap = s(3);
        labelRow.style.justifyContent = 'center';
        labelRow.style.marginBottom = s(2);
        var labelTexts = config.showSeconds !== false ? ['H','H','M','M','S','S'] : ['H','H','M','M'];
        labelTexts.forEach(function(t) {
          var l = document.createElement('div');
          l.style.cssText = 'width:' + s(8, 10) + ';color:#' + color + ';opacity:0.4;font-size:' + s(2, 2.5) + ';';
          l.textContent = t;
          labelRow.appendChild(l);
        });
        wrapper.appendChild(labelRow);
        this._headerLabels = labelRow;
      }

      // Grid: 4 rows x cols
      this._grid = document.createElement('div');
      this._grid.style.display = 'flex';
      this._grid.style.gap = s(3);
      this._grid.style.justifyContent = 'center';

      this._dots = [];
      this._prevBits = [];
      var dotSize = s(8, 10);
      for (var c2 = 0; c2 < cols; c2++) {
        var col = document.createElement('div');
        col.style.display = 'flex';
        col.style.flexDirection = 'column';
        col.style.gap = s(1.5);
        var colDots = [];
        var colPrev = [];
        var maxBits = (c2 % 2 === 0) ? 3 : 4;
        for (var r = 0; r < 4; r++) {
          var dot = document.createElement('div');
          var transform = bitShape === 'diamond' ? 'transform:rotate(45deg);' : '';
          dot.style.cssText = 'width:' + dotSize + ';height:' + dotSize + ';border-radius:' + borderRadius + ';' +
            'background:rgba(' + this._hexToRgb(color) + ',0.08);transition:all 0.3s;' +
            'box-shadow:none;' + transform;
          if (r === 0 && maxBits < 4) {
            dot.style.visibility = 'hidden';
          }
          col.appendChild(dot);
          colDots.push(dot);
          colPrev.push(false);
        }
        this._dots.push(colDots);
        this._prevBits.push(colPrev);
        this._grid.appendChild(col);
      }
      wrapper.appendChild(this._grid);

      // Binary value labels under columns
      if (showLabels) {
        this._labels = document.createElement('div');
        this._labels.style.display = 'flex';
        this._labels.style.gap = s(3);
        this._labels.style.justifyContent = 'center';
        this._labels.style.marginTop = s(2);
        for (var i = 0; i < cols; i++) {
          var v = document.createElement('div');
          v.style.cssText = 'width:' + s(8, 10) + ';color:#' + color + ';font-size:' + s(3, 4) + ';font-weight:700;';
          this._labels.appendChild(v);
        }
        wrapper.appendChild(this._labels);
      }

      container.appendChild(wrapper);

      var self = this;
      this._timer = setInterval(function() { self._render(); }, 1000);
      this._render();
    },

    _hexToRgb: function(hex) {
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);
      return r + ',' + g + ',' + b;
    },

    _render: function() {
      if (!this._dots) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var h = TimeUtils.formatHours(now, c.format);
      var m = now.getMinutes();
      var sec = now.getSeconds();
      var color = c.color || this.defaults.color;
      var rgb = this._hexToRgb(color);
      var glow = c.glow !== undefined ? c.glow : this.defaults.glow;
      var glowSize = glow * 0.4; // 0-10 -> 0-4
      var sf = this._s;

      var digits = [Math.floor(h / 10), h % 10, Math.floor(m / 10), m % 10];
      if (c.showSeconds !== false) {
        digits.push(Math.floor(sec / 10), sec % 10);
      }

      for (var col = 0; col < digits.length; col++) {
        var val = digits[col];
        var maxBits = (col % 2 === 0) ? 3 : 4;
        for (var row = 0; row < 4; row++) {
          var dot = this._dots[col][row];
          if (row === 0 && maxBits < 4) continue;
          var bitPos = 3 - row;
          var on = (val >> bitPos) & 1;
          var wasOn = this._prevBits[col][row];

          dot.style.background = on
            ? 'rgba(' + rgb + ',0.95)'
            : 'rgba(' + rgb + ',0.08)';

          if (on && glow > 0) {
            dot.style.boxShadow = '0 0 ' + sf(glowSize) + ' rgba(' + rgb + ',0.5)' +
              (glow >= 7 ? ', 0 0 ' + sf(glowSize * 2) + ' rgba(' + rgb + ',0.2)' : '') +
              ', inset 0 0 ' + sf(1) + ' rgba(255,255,255,0.1)';
          } else {
            dot.style.boxShadow = 'none';
          }

          // Pulse animation on newly-lit bits
          if (on && !wasOn) {
            dot.style.transform = (c.bitShape === 'diamond' ? 'rotate(45deg) ' : '') + 'scale(1.15)';
            (function(d, shape) {
              setTimeout(function() {
                d.style.transform = shape === 'diamond' ? 'rotate(45deg)' : '';
              }, 200);
            })(dot, c.bitShape);
          }

          this._prevBits[col][row] = !!on;
        }
        // Update decimal label
        if (this._labels) {
          this._labels.children[col].textContent = val;
        }
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
      this._dots = null;
      this._grid = null;
      this._labels = null;
      this._headerLabels = null;
      this._prevBits = null;
      this._s = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Binary);
})(typeof window !== 'undefined' ? window : this);
