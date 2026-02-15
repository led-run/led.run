/**
 * Word Clock — Time spelled in English words
 * DOM-based with configurable fuzzy mode, period visibility, and animation
 */
;(function(global) {
  'use strict';

  var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
              'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
              'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

  var Word = {
    id: 'word',
    defaults: {
      color: 'ffffff',
      bg: '111111',
      format: '12h',
      showSeconds: false,
      showDate: false,
      dateFormat: 'MDY',
      wordLang: 'en',
      showPeriod: true,
      animation: 'none'
    },

    _container: null,
    _timeEl: null,
    _periodEl: null,
    _dateEl: null,
    _prefixEl: null,
    _timer: null,
    _config: null,
    _lastText: '',

    init: function(container, config) {
      this._container = container;
      this._config = config;

      var bg = config.bg || this.defaults.bg;
      var color = config.color || this.defaults.color;
      var anim = config.animation || this.defaults.animation;

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
      container.style.padding = (cw * 5 / 100) + 'px';
      container.style.overflow = 'hidden';

      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'text-align:center;max-width:90%;';

      // Prefix
      this._prefixEl = document.createElement('div');
      this._prefixEl.style.cssText = 'color:#' + color + ';opacity:0.3;font-family:Inter,sans-serif;' +
        'font-size:' + s(3, 4) + ';font-weight:300;margin-bottom:' + s(2, 2.5) + ';letter-spacing:0.15em;text-transform:uppercase;';
      this._prefixEl.textContent = 'it is';
      wrapper.appendChild(this._prefixEl);

      // Time words
      this._timeEl = document.createElement('div');
      var transition = anim === 'fade' ? 'transition:opacity 0.5s;' :
                       anim === 'slide' ? 'transition:transform 0.4s, opacity 0.4s;' : '';
      this._timeEl.style.cssText = 'color:#' + color + ';font-family:Inter,sans-serif;' +
        'font-size:' + s(7, 10) + ';font-weight:600;line-height:1.3;letter-spacing:-0.01em;' + transition;
      wrapper.appendChild(this._timeEl);

      // Period (in the morning, etc.)
      if (config.showPeriod !== false) {
        this._periodEl = document.createElement('div');
        this._periodEl.style.cssText = 'color:#' + color + ';opacity:0.3;font-family:Inter,sans-serif;' +
          'font-size:' + s(3, 4) + ';font-weight:300;margin-top:' + s(2, 2.5) + ';letter-spacing:0.15em;text-transform:uppercase;';
        wrapper.appendChild(this._periodEl);
      }

      // Date
      if (config.showDate) {
        this._dateEl = document.createElement('div');
        this._dateEl.style.cssText = 'color:#' + color + ';opacity:0.2;font-family:Inter,sans-serif;' +
          'font-size:' + s(2.5, 3) + ';font-weight:300;margin-top:' + s(4) + ';letter-spacing:0.1em;';
        wrapper.appendChild(this._dateEl);
      }

      container.appendChild(wrapper);

      var self = this;
      this._timer = setInterval(function() { self._render(); }, 1000);
      this._render();
    },

    _numberToWords: function(n) {
      if (n < 20) return ONES[n];
      var ten = TENS[Math.floor(n / 10)];
      var one = ONES[n % 10];
      return one ? ten + '-' + one : ten;
    },

    _timeToWords: function(h, m) {
      if (m === 0) {
        return this._numberToWords(h) + " o'clock";
      }
      if (m === 15) return 'quarter past ' + this._numberToWords(h);
      if (m === 30) return 'half past ' + this._numberToWords(h);
      if (m === 45) {
        var nextH = (h % 12) + 1;
        return 'quarter to ' + this._numberToWords(nextH);
      }
      if (m < 30) {
        return this._numberToWords(m) + ' past ' + this._numberToWords(h);
      }
      var nextHour = (h % 12) + 1;
      return this._numberToWords(60 - m) + ' to ' + this._numberToWords(nextHour);
    },

    _fuzzyTimeToWords: function(h, m) {
      // Round to nearest 5 minutes with "about"/"nearly" prefix
      var rounded = Math.round(m / 5) * 5;
      var prefix = '';
      if (rounded !== m) {
        if (m < rounded) prefix = 'almost ';
        else prefix = 'just after ';
      }
      if (rounded >= 60) { rounded = 0; h = (h % 12) + 1; }
      return prefix + this._timeToWords(h, rounded);
    },

    _getPeriod: function(hours24) {
      if (hours24 < 6) return 'at night';
      if (hours24 < 12) return 'in the morning';
      if (hours24 < 17) return 'in the afternoon';
      if (hours24 < 21) return 'in the evening';
      return 'at night';
    },

    _render: function() {
      if (!this._timeEl) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var h24 = now.getHours();
      var h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      var m = now.getMinutes();
      var wordLang = c.wordLang || 'en';

      var text;
      if (wordLang === 'fuzzy') {
        text = this._fuzzyTimeToWords(h12, m);
      } else {
        text = this._timeToWords(h12, m);
      }

      // Apply animation on text change
      var anim = c.animation || 'none';
      if (text !== this._lastText && this._lastText !== '' && anim !== 'none') {
        var el = this._timeEl;
        if (anim === 'fade') {
          el.style.opacity = '0';
          setTimeout(function() {
            el.textContent = text;
            el.style.opacity = '1';
          }, 250);
        } else if (anim === 'slide') {
          el.style.transform = 'translateY(-10px)';
          el.style.opacity = '0';
          setTimeout(function() {
            el.textContent = text;
            el.style.transform = 'translateY(0)';
            el.style.opacity = '1';
          }, 200);
        }
      } else {
        this._timeEl.textContent = text;
      }
      this._lastText = text;

      if (this._periodEl) {
        this._periodEl.textContent = this._getPeriod(h24);
      }

      if (this._dateEl) {
        var day = TimeUtils.getDayName(now, false);
        var month = TimeUtils.getMonthName(now, false);
        this._dateEl.textContent = day + ', ' + month + ' ' + now.getDate() + ', ' + now.getFullYear();
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
      this._periodEl = null;
      this._prefixEl = null;
      this._lastText = '';
      this._container = null;
    }
  };

  global.TimeManager.register(Word);
})(typeof window !== 'undefined' ? window : this);
