;(function(global) {
  'use strict';

  var MatrixRain = {
    id: 'matrix-rain',
    defaults: { color: '00ff41', bg: '000000', speed: 8, density: 5 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _r: 0,
    _g: 255,
    _b: 65,
    _bgR: 0,
    _bgG: 0,
    _bgB: 0,
    _speed: 8,
    _density: 5,
    _columns: null,
    _colCount: 0,
    _fontSize: 16,
    _lastTime: 0,

    init: function(container, config) {
      this._container = container;

      var color = config.color || this.defaults.color;
      var bg = config.bg || this.defaults.bg;
      this._speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      this._density = config.density != null ? Number(config.density) : this.defaults.density;

      this._speed = Math.max(1, Math.min(20, this._speed));
      this._density = Math.max(1, Math.min(10, this._density));

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

      this._initColumns();
      this._lastTime = performance.now();
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

      // Recalculate columns on resize
      var oldColCount = this._colCount;
      this._fontSize = Math.max(12, Math.min(18, Math.floor(w / 60)));
      this._colCount = Math.max(1, Math.floor(w / this._fontSize));

      if (this._columns && oldColCount !== this._colCount) {
        this._initColumns();
      }
    },

    _initColumns: function() {
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var colCount = this._colCount;
      var fontSize = this._fontSize;
      var maxRows = Math.ceil(h / fontSize) + 2;
      var densityFrac = this._density / 10; // 0.1 to 1.0

      this._columns = [];
      for (var i = 0; i < colCount; i++) {
        // Only activate a fraction of columns based on density
        var active = Math.random() < densityFrac;
        this._columns.push({
          x: i * fontSize,
          y: active ? -(Math.random() * maxRows * fontSize) : -(maxRows * fontSize * 2),
          speed: 0.5 + Math.random() * 1.0,    // relative speed multiplier
          chars: this._generateChars(maxRows),
          active: active,
          trailLen: 8 + Math.floor(Math.random() * 15) // trail length in characters
        });
      }
    },

    _generateChars: function(count) {
      var chars = [];
      for (var i = 0; i < count; i++) {
        chars.push(this._randomChar());
      }
      return chars;
    },

    _randomChar: function() {
      // Mix of katakana and digits
      if (Math.random() < 0.3) {
        return String(Math.floor(Math.random() * 10));
      }
      return String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
    },

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var now = performance.now();
      var dt = (now - self._lastTime) / 1000;
      self._lastTime = now;

      var fontSize = self._fontSize;
      var columns = self._columns;
      var r = self._r;
      var g = self._g;
      var b = self._b;
      var fallSpeed = self._speed * 40; // pixels per second base rate

      // Trail fade: draw semi-transparent bg overlay
      ctx.fillStyle = 'rgba(' + self._bgR + ',' + self._bgG + ',' + self._bgB + ',0.08)';
      ctx.fillRect(0, 0, w, h);

      ctx.font = fontSize + 'px monospace';
      ctx.textAlign = 'center';

      var densityFrac = self._density / 10;

      for (var i = 0; i < columns.length; i++) {
        var col = columns[i];

        // Advance column position
        col.y += fallSpeed * col.speed * dt;

        // Head position (bottom of the stream) in character rows
        var headRow = Math.floor(col.y / fontSize);
        var trailLen = col.trailLen;

        // Draw characters in the visible trail
        for (var j = 0; j < trailLen; j++) {
          var charRow = headRow - j;
          var py = charRow * fontSize;

          // Skip if off-screen
          if (py < -fontSize || py > h + fontSize) continue;

          var charIdx = ((charRow % col.chars.length) + col.chars.length) % col.chars.length;

          // Randomly mutate characters occasionally
          if (Math.random() < 0.02) {
            col.chars[charIdx] = self._randomChar();
          }

          var ch = col.chars[charIdx];
          var px = col.x + fontSize / 2;

          if (j === 0) {
            // Head character: bright white-ish tint
            var headR = Math.min(255, r + 150);
            var headG = Math.min(255, g + 150);
            var headB = Math.min(255, b + 150);
            ctx.fillStyle = 'rgb(' + headR + ',' + headG + ',' + headB + ')';
            ctx.fillText(ch, px, py);
          } else {
            // Trail characters: fade from bright to dim
            var brightness = 1 - (j / trailLen);
            // Apply slight brightness variation for shimmer
            var shimmer = 0.85 + Math.random() * 0.15;
            var alpha = brightness * shimmer;
            alpha = Math.max(0.05, alpha);

            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
            ctx.fillText(ch, px, py);
          }
        }

        // Reset column when it goes off screen
        if ((headRow - trailLen) * fontSize > h) {
          col.y = -(Math.random() * h * 0.5 + fontSize * trailLen);
          col.speed = 0.5 + Math.random() * 1.0;
          col.trailLen = 8 + Math.floor(Math.random() * 15);
          col.active = Math.random() < densityFrac;
          col.chars = self._generateChars(col.chars.length);

          // If not active, push far off screen
          if (!col.active) {
            col.y = -(h * 3);
          }
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
      this._columns = null;
    }
  };

  global.LightManager.register(MatrixRain);
})(typeof window !== 'undefined' ? window : this);
