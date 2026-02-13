;(function(global) {
  'use strict';

  // SOS Morse code pattern:
  // S = ...  (3 short)
  // O = ---  (3 long)
  // S = ...  (3 short)
  // Timing: short=200ms, long=600ms, gap=200ms, letter gap=600ms, word gap=1400ms

  var SHORT = 200;
  var LONG = 600;
  var GAP = 200;
  var LETTER_GAP = 600;
  var WORD_GAP = 1400;

  // Build timeline: array of [isOn, duration]
  var TIMELINE = [];
  // S: dit dit dit
  TIMELINE.push([true, SHORT], [false, GAP]);
  TIMELINE.push([true, SHORT], [false, GAP]);
  TIMELINE.push([true, SHORT], [false, LETTER_GAP]);
  // O: dah dah dah
  TIMELINE.push([true, LONG], [false, GAP]);
  TIMELINE.push([true, LONG], [false, GAP]);
  TIMELINE.push([true, LONG], [false, LETTER_GAP]);
  // S: dit dit dit
  TIMELINE.push([true, SHORT], [false, GAP]);
  TIMELINE.push([true, SHORT], [false, GAP]);
  TIMELINE.push([true, SHORT], [false, WORD_GAP]);

  // Pre-compute cumulative timestamps
  var TOTAL_DURATION = 0;
  var TIMESTAMPS = [];
  for (var i = 0; i < TIMELINE.length; i++) {
    TIMESTAMPS.push(TOTAL_DURATION);
    TOTAL_DURATION += TIMELINE[i][1];
  }

  var SOS = {
    id: 'sos',
    defaults: { color: 'ffffff', bg: '000000' },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _startTime: 0,
    _r: 255,
    _g: 255,
    _b: 255,
    _bgR: 0,
    _bgG: 0,
    _bgB: 0,
    _boundResize: null,

    init: function(container, config) {
      this._container = container;

      var color = config.color || this.defaults.color;
      var bg = config.bg || this.defaults.bg;

      this._r = parseInt(color.substring(0, 2), 16);
      this._g = parseInt(color.substring(2, 4), 16);
      this._b = parseInt(color.substring(4, 6), 16);
      this._bgR = parseInt(bg.substring(0, 2), 16);
      this._bgG = parseInt(bg.substring(2, 4), 16);
      this._bgB = parseInt(bg.substring(4, 6), 16);

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._startTime = performance.now();
      this._animate();
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

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;

      var elapsed = performance.now() - self._startTime;
      var cyclePos = elapsed % TOTAL_DURATION;

      // Find current timeline entry
      var entryIdx = 0;
      for (var i = TIMELINE.length - 1; i >= 0; i--) {
        if (cyclePos >= TIMESTAMPS[i]) {
          entryIdx = i;
          break;
        }
      }

      var entry = TIMELINE[entryIdx];
      var isOn = entry[0];
      var entryProgress = (cyclePos - TIMESTAMPS[entryIdx]) / entry[1];

      // Background
      ctx.fillStyle = 'rgb(' + self._bgR + ',' + self._bgG + ',' + self._bgB + ')';
      ctx.fillRect(0, 0, w, h);

      if (isOn) {
        // Flash with radial glow
        var cx = w / 2;
        var cy = h / 2;
        var radius = Math.sqrt(cx * cx + cy * cy);

        var r = self._r;
        var g = self._g;
        var b = self._b;
        var brightR = Math.min(255, r + Math.round((255 - r) * 0.4));
        var brightG = Math.min(255, g + Math.round((255 - g) * 0.4));
        var brightB = Math.min(255, b + Math.round((255 - b) * 0.4));

        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, 'rgb(' + brightR + ',' + brightG + ',' + brightB + ')');
        grad.addColorStop(0.35, 'rgb(' + r + ',' + g + ',' + b + ')');
        grad.addColorStop(1, 'rgb(' + r + ',' + g + ',' + b + ')');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else {
        // Brief afterglow at start of gap
        if (entryProgress < 0.3) {
          var glowAlpha = (1 - entryProgress / 0.3) * 0.25;
          ctx.fillStyle = 'rgba(' + self._r + ',' + self._g + ',' + self._b + ',' + glowAlpha.toFixed(3) + ')';
          ctx.fillRect(0, 0, w, h);
        }
      }

      self._rafId = requestAnimationFrame(function() { self._animate(); });
    },

    destroy: function() {
      if (this._rafId != null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._boundResize) {
        window.removeEventListener('resize', this._boundResize);
        this._boundResize = null;
      }
      if (this._canvas && this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
      }
      this._canvas = null;
      this._ctx = null;
      this._container = null;
    }
  };

  global.LightManager.register(SOS);
})(typeof window !== 'undefined' ? window : this);
