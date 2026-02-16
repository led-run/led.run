/**
 * Flip Clock — Mechanical split-flap display
 * CSS 3D animation with DOM
 * Uses 1000ms interval, animationend cleanup, robust color darken
 */
;(function(global) {
  'use strict';

  var Flip = {
    id: 'flip',
    defaults: {
      color: 'f0f0f0',
      bg: '1a1a1a',
      fill: '2a2a2a',
      format: '24h',
      showSeconds: true,
      showDate: true,
      dateFormat: 'MDY',
      flipSpeed: 0.5,
      gap: 1.5
    },

    _container: null,
    _cards: null,
    _dateEl: null,
    _timer: null,
    _config: null,
    _prevValues: null,
    _styleEl: null,
    _sz: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      var bg = config.bg || this.defaults.bg;
      var color = config.color || this.defaults.color;
      var fill = config.fill || this.defaults.fill;

      // Container-relative sizing
      var cw = container.clientWidth;
      var ch = container.clientHeight;
      function px(xPct, yPct) {
        return Math.min(cw * xPct / 100, ch * (yPct !== undefined ? yPct : xPct) / 100);
      }

      var cardW = px(10, 14);
      this._sz = {
        cardW: cardW,
        cardH: cardW * 1.3,
        font: px(8, 11),
        radius: px(0.8)
      };

      // Inject keyframe styles
      this._styleEl = document.createElement('style');
      this._styleEl.textContent =
        '@keyframes flip-top-out{' +
          '0%{transform:rotateX(0deg)}' +
          '100%{transform:rotateX(-90deg)}' +
        '}' +
        '@keyframes flip-bottom-in{' +
          '0%{transform:rotateX(90deg)}' +
          '100%{transform:rotateX(0deg)}' +
        '}';
      document.head.appendChild(this._styleEl);

      container.style.background = '#' + bg;
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.overflow = 'hidden';
      container.style.fontFamily = '"JetBrains Mono", monospace';

      var showSec = config.showSeconds !== false;
      var gap = config.gap !== undefined ? config.gap : this.defaults.gap;

      // Date
      if (config.showDate !== false) {
        this._dateEl = document.createElement('div');
        this._dateEl.style.cssText = 'color:#' + color + ';opacity:0.4;font-size:' + px(2.5, 3) + 'px;' +
          'margin-bottom:' + px(3) + 'px;letter-spacing:0.15em;text-transform:uppercase;';
        container.appendChild(this._dateEl);
      }

      // Cards row
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:' + px(gap) + 'px;';

      this._cards = [];
      this._prevValues = [];
      var cardCount = showSec ? 6 : 4;
      for (var i = 0; i < cardCount; i++) {
        // Insert colon separators between pairs
        if (i === 2 || (showSec && i === 4)) {
          var sep = document.createElement('div');
          sep.style.cssText = 'font-size:' + px(8, 12) + 'px;color:#' + color + ';opacity:0.4;font-weight:700;' +
            'margin:0 ' + px(0.5) + 'px;line-height:1;';
          sep.textContent = ':';
          row.appendChild(sep);
        }
        var card = this._createCard(fill, color);
        this._cards.push(card);
        this._prevValues.push('');
        row.appendChild(card.el);
      }
      container.appendChild(row);

      var self = this;
      // Use 1000ms interval — digits change at most once per second
      this._timer = setInterval(function() { self._render(); }, 1000);
      this._render();
    },

    _createCard: function(fill, color) {
      var sz = this._sz;
      var darkerFill = this._darken(fill, 15);

      var el = document.createElement('div');
      el.style.cssText = 'position:relative;width:' + sz.cardW + 'px;height:' + sz.cardH + 'px;perspective:300px;';

      // Static top half (shows current value)
      var top = document.createElement('div');
      top.style.cssText = 'position:absolute;top:0;left:0;right:0;height:50%;overflow:hidden;' +
        'background:#' + fill + ';border-radius:' + sz.radius + 'px ' + sz.radius + 'px 0 0;' +
        'border-bottom:1px solid rgba(0,0,0,0.4);';
      var topText = document.createElement('div');
      topText.style.cssText = 'color:#' + color + ';font-size:' + sz.font + 'px;font-weight:700;' +
        'height:200%;display:flex;align-items:center;justify-content:center;';
      top.appendChild(topText);
      el.appendChild(top);

      // Static bottom half (shows current value)
      var bottom = document.createElement('div');
      bottom.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:50%;overflow:hidden;' +
        'background:linear-gradient(to bottom, #' + fill + ', ' + darkerFill + ');' +
        'border-radius:0 0 ' + sz.radius + 'px ' + sz.radius + 'px;';
      var bottomText = document.createElement('div');
      bottomText.style.cssText = 'color:#' + color + ';font-size:' + sz.font + 'px;font-weight:700;' +
        'height:200%;display:flex;align-items:center;justify-content:center;transform:translateY(-50%);';
      bottom.appendChild(bottomText);
      el.appendChild(bottom);

      // Hinge line
      var hinge = document.createElement('div');
      hinge.style.cssText = 'position:absolute;top:50%;left:0;right:0;height:2px;' +
        'background:rgba(0,0,0,0.5);z-index:5;transform:translateY(-1px);';
      el.appendChild(hinge);

      return { el: el, top: top, topText: topText, bottom: bottom, bottomText: bottomText };
    },

    _darken: function(hex, amount) {
      var num = parseInt(hex, 16);
      var r = Math.max(0, ((num >> 16) & 0xFF) - amount);
      var g = Math.max(0, ((num >> 8) & 0xFF) - amount);
      var b = Math.max(0, (num & 0xFF) - amount);
      return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    },

    _animateFlip: function(card, oldVal, newVal, fill, color) {
      var flipSpeed = this._config.flipSpeed !== undefined ? this._config.flipSpeed : this.defaults.flipSpeed;
      var duration = flipSpeed * 1000;
      var halfDuration = duration / 2;
      var sz = this._sz;
      var darkerFill = this._darken(fill, 15);

      // Clean up any lingering flip overlays first
      var existing = card.el.querySelectorAll('.flip-overlay');
      for (var i = 0; i < existing.length; i++) {
        existing[i].remove();
      }

      // Update static top to new value immediately (it's hidden behind flip-out panel)
      card.topText.textContent = newVal;

      // Flip-out panel: top half showing OLD value, rotates downward
      var flipOut = document.createElement('div');
      flipOut.className = 'flip-overlay';
      flipOut.style.cssText = 'position:absolute;top:0;left:0;right:0;height:50%;overflow:hidden;' +
        'background:#' + fill + ';border-radius:' + sz.radius + 'px ' + sz.radius + 'px 0 0;' +
        'transform-origin:bottom center;z-index:10;backface-visibility:hidden;' +
        'animation:flip-top-out ' + halfDuration + 'ms ease-in forwards;';
      var flipOutText = document.createElement('div');
      flipOutText.style.cssText = 'color:#' + color + ';font-size:' + sz.font + 'px;font-weight:700;' +
        'height:200%;display:flex;align-items:center;justify-content:center;';
      flipOutText.textContent = oldVal;
      flipOut.appendChild(flipOutText);
      card.el.appendChild(flipOut);

      // Flip-in panel: bottom half showing NEW value, rotates in from top
      var flipIn = document.createElement('div');
      flipIn.className = 'flip-overlay';
      flipIn.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:50%;overflow:hidden;' +
        'background:linear-gradient(to bottom, #' + fill + ', ' + darkerFill + ');' +
        'border-radius:0 0 ' + sz.radius + 'px ' + sz.radius + 'px;' +
        'transform-origin:top center;z-index:10;backface-visibility:hidden;' +
        'animation:flip-bottom-in ' + halfDuration + 'ms ease-out ' + halfDuration + 'ms forwards;' +
        'transform:rotateX(90deg);';
      var flipInText = document.createElement('div');
      flipInText.style.cssText = 'color:#' + color + ';font-size:' + sz.font + 'px;font-weight:700;' +
        'height:200%;display:flex;align-items:center;justify-content:center;transform:translateY(-50%);';
      flipInText.textContent = newVal;
      flipIn.appendChild(flipInText);
      card.el.appendChild(flipIn);

      // Use animationend to clean up — listen on the later animation (flipIn)
      flipIn.addEventListener('animationend', function handler() {
        flipIn.removeEventListener('animationend', handler);
        card.bottomText.textContent = newVal;
        if (flipOut.parentNode) flipOut.remove();
        if (flipIn.parentNode) flipIn.remove();
      });

      // Safety fallback: clean up after total duration + buffer
      setTimeout(function() {
        card.bottomText.textContent = newVal;
        if (flipOut.parentNode) flipOut.remove();
        if (flipIn.parentNode) flipIn.remove();
      }, duration + 200);
    },

    _render: function() {
      if (!this._cards) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var h = TimeUtils.formatHours(now, c.format);
      var m = now.getMinutes();
      var s = now.getSeconds();

      var digits = [
        Math.floor(h / 10), h % 10,
        Math.floor(m / 10), m % 10
      ];
      if (c.showSeconds !== false) {
        digits.push(Math.floor(s / 10), s % 10);
      }

      var fill = c.fill || this.defaults.fill;
      var color = c.color || this.defaults.color;

      for (var i = 0; i < digits.length; i++) {
        var val = String(digits[i]);
        if (this._prevValues[i] !== '' && this._prevValues[i] !== val) {
          this._animateFlip(this._cards[i], this._prevValues[i], val, fill, color);
        } else if (this._prevValues[i] === '') {
          // Initial render — just set values
          this._cards[i].topText.textContent = val;
          this._cards[i].bottomText.textContent = val;
        }
        this._prevValues[i] = val;
      }

      if (this._dateEl) {
        var day = TimeUtils.getDayName(now, true);
        this._dateEl.textContent = day + ' \u2022 ' + TimeUtils.formatDate(now, c.dateFormat);
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
      if (this._styleEl && this._styleEl.parentNode) this._styleEl.parentNode.removeChild(this._styleEl);
      this._cards = null;
      this._dateEl = null;
      this._prevValues = null;
      this._sz = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Flip);
})(typeof window !== 'undefined' ? window : this);
