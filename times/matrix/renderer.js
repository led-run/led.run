/**
 * Matrix Clock — Falling green digits reveal the time
 * Canvas-based with configurable speed, charset, and glow
 */
;(function(global) {
  'use strict';

  var CHARSETS = {
    katakana: function() { return String.fromCharCode(0x30A0 + Math.random() * 96); },
    latin: function() { return String.fromCharCode(65 + Math.floor(Math.random() * 26)); },
    digits: function() { return String(Math.floor(Math.random() * 10)); },
    binary: function() { return Math.random() < 0.5 ? '0' : '1'; }
  };

  var Matrix = {
    id: 'matrix',
    defaults: {
      color: '00ff41',
      bg: '000000',
      format: '24h',
      showSeconds: true,
      showDate: false,
      dateFormat: 'MDY',
      density: 5,
      speed: 5,
      charset: 'katakana',
      glowIntensity: 5
    },

    _container: null,
    _canvas: null,
    _ctx: null,
    _raf: null,
    _boundResize: null,
    _config: null,
    _columns: null,
    _colSize: 14,

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

      // Initialize rain columns
      var cols = Math.ceil(w / this._colSize);
      this._columns = [];
      for (var i = 0; i < cols; i++) {
        this._columns.push(Math.random() * -100);
      }
    },

    _render: function() {
      if (!this._ctx || !this._container || !this._columns) return;
      var c = this._config;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var ctx = this._ctx;

      // Fade effect
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, w, h);

      var color = c.color || '00ff41';
      var r = parseInt(color.substring(0, 2), 16);
      var g = parseInt(color.substring(2, 4), 16);
      var b = parseInt(color.substring(4, 6), 16);

      // Matrix rain with configurable charset and speed
      ctx.font = this._colSize + 'px monospace';
      var density = c.density || 5;
      var speed = c.speed !== undefined ? c.speed : 5;
      var speedMul = speed / 5; // normalize: 5 = default speed
      var charsetId = c.charset || 'katakana';
      var getChar = CHARSETS[charsetId] || CHARSETS.katakana;

      for (var i = 0; i < this._columns.length; i++) {
        var y = this._columns[i];
        if (y > 0) {
          var alpha = 0.5 + Math.random() * 0.5;
          ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
          var ch = getChar();
          ctx.fillText(ch, i * this._colSize, y);
        }
        this._columns[i] += this._colSize * speedMul;
        if (this._columns[i] > h && Math.random() > (1 - density * 0.01)) {
          this._columns[i] = 0;
        }
      }

      // Time overlay with configurable glow
      var now = TimeUtils.getTime(c.tz);
      var hours = TimeUtils.formatHours(now, c.format);
      var timeStr = TimeUtils.padZero(hours) + ':' + TimeUtils.padZero(now.getMinutes());
      if (c.showSeconds !== false) timeStr += ':' + TimeUtils.padZero(now.getSeconds());

      var fontSize = Math.min(w * 0.15, h * 0.2);
      var glowIntensity = c.glowIntensity !== undefined ? c.glowIntensity : 5;
      var glowMul = glowIntensity / 5;

      ctx.font = 'bold ' + fontSize + 'px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Multi-pass glow
      if (glowIntensity > 0) {
        ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.6 * glowMul) + ')';
        ctx.shadowBlur = fontSize * 0.15 * glowMul;
      }
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.95)';
      ctx.fillText(timeStr, w / 2, h / 2);

      // Second pass bloom for high glow
      if (glowIntensity >= 7) {
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.2)';
        ctx.shadowBlur = fontSize * 0.3 * glowMul;
        ctx.fillText(timeStr, w / 2, h / 2);
      }

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Date below
      if (c.showDate) {
        ctx.font = (fontSize * 0.2) + 'px monospace';
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.5)';
        ctx.fillText(TimeUtils.formatDate(now, c.dateFormat), w / 2, h / 2 + fontSize * 0.7);
      }
    },

    destroy: function() {
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      if (this._boundResize) {
        window.removeEventListener('resize', this._boundResize);
        this._boundResize = null;
      }
      this._columns = null;
      this._canvas = null;
      this._ctx = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Matrix);
})(typeof window !== 'undefined' ? window : this);
