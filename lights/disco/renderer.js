;(function(global) {
  'use strict';

  var CELL_TARGET = 90;
  var GAP = 2;

  function parseHexColors(str) {
    return str.split(',').map(function(c) {
      c = c.trim();
      return [
        parseInt(c.substring(0, 2), 16),
        parseInt(c.substring(2, 4), 16),
        parseInt(c.substring(4, 6), 16)
      ];
    });
  }

  var Disco = {
    id: 'disco',
    defaults: { colors: 'ff0000,00ff00,0000ff,ffff00,ff00ff,00ffff', speed: 2 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _cells: null,
    _colorList: null,
    _cols: 0,
    _rows: 0,
    _cellW: 0,
    _cellH: 0,
    _speed: 2,
    _glowTexture: null,
    _boundResize: null,

    init: function(container, config) {
      this._container = container;

      var colorsStr = config.colors || this.defaults.colors;
      this._speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      this._speed = Math.max(1, Math.min(10, this._speed));

      this._colorList = parseHexColors(colorsStr);
      if (this._colorList.length === 0) {
        this._colorList = [[255, 0, 0]];
      }

      // Pre-render glow texture (white radial fade for cell highlight)
      var glow = document.createElement('canvas');
      glow.width = 64;
      glow.height = 64;
      var gc = glow.getContext('2d');
      var gr = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,0.18)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.05)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      gc.fillStyle = gr;
      gc.fillRect(0, 0, 64, 64);
      this._glowTexture = glow;

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._initCells();
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

      this._cols = Math.max(1, Math.round(w / CELL_TARGET));
      this._rows = Math.max(1, Math.round(h / CELL_TARGET));
      this._cellW = w / this._cols;
      this._cellH = h / this._rows;

      // Re-init cells if grid dimensions changed
      if (this._cells && this._cells.length !== this._cols * this._rows) {
        this._initCells();
      }
    },

    _initCells: function() {
      var total = this._cols * this._rows;
      var colors = this._colorList;
      this._cells = [];

      for (var i = 0; i < total; i++) {
        var c = colors[Math.floor(Math.random() * colors.length)];
        var t = colors[Math.floor(Math.random() * colors.length)];
        this._cells.push({
          cr: c[0], cg: c[1], cb: c[2],     // current color
          tr: t[0], tg: t[1], tb: t[2],     // target color
          progress: Math.random(),            // start at random progress
          speed: 0.3 + Math.random() * 0.7    // individual speed factor
        });
      }
    },

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var cells = self._cells;
      var cols = self._cols;
      var rows = self._rows;
      var cellW = self._cellW;
      var cellH = self._cellH;
      var colors = self._colorList;
      var speed = self._speed;
      var glowTex = self._glowTexture;

      // Transition speed per frame: higher speed = faster transitions
      var frameSpeed = 0.005 + speed * 0.004;

      // Dark gap background
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, w, h);

      if (!cells) {
        self._rafId = requestAnimationFrame(function() { self._animate(); });
        return;
      }

      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var idx = row * cols + col;
          var cell = cells[idx];

          // Advance transition
          cell.progress += frameSpeed * cell.speed;

          if (cell.progress >= 1) {
            // Arrived at target — pick new target
            cell.cr = cell.tr;
            cell.cg = cell.tg;
            cell.cb = cell.tb;
            cell.progress = 0;
            cell.speed = 0.3 + Math.random() * 0.7;

            var nc = colors[Math.floor(Math.random() * colors.length)];
            cell.tr = nc[0];
            cell.tg = nc[1];
            cell.tb = nc[2];
          }

          // Interpolate color
          var p = cell.progress;
          var r = Math.round(cell.cr + (cell.tr - cell.cr) * p);
          var g = Math.round(cell.cg + (cell.tg - cell.cg) * p);
          var b = Math.round(cell.cb + (cell.tb - cell.cb) * p);

          var x = col * cellW;
          var y = row * cellH;

          // Draw cell with gap
          ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
          ctx.fillRect(x + GAP, y + GAP, cellW - GAP * 2, cellH - GAP * 2);

          // Draw glow overlay for "light bulb" feel
          ctx.drawImage(glowTex, x + GAP, y + GAP, cellW - GAP * 2, cellH - GAP * 2);
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
      this._cells = null;
      this._colorList = null;
      this._glowTexture = null;
    }
  };

  global.LightManager.register(Disco);
})(typeof window !== 'undefined' ? window : this);
