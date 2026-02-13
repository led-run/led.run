;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var ParticleVisualizer = {
    id: 'particle',

    defaults: {
      color: 'ffffff',      // White dots
      bg: '000000',
      sensitivity: 5,
      gridSize: 20
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _grid: null,
    _smoothedData: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._grid = null;
      this._smoothedData = null;

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._initGrid();
      this._draw();
    },

    destroy: function() {
      if (this._animFrameId) {
        cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
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
      this._audioEngine = null;
      this._grid = null;
      this._smoothedData = null;
      this._config = null;
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this._initGrid();
    },

    _initGrid: function() {
      var cfg = this._config;
      var gridSize = parseInt(cfg.gridSize, 10) || this.defaults.gridSize;
      if (gridSize < 10) gridSize = 10;
      if (gridSize > 40) gridSize = 40;

      var total = gridSize * gridSize;
      this._grid = [];
      for (var i = 0; i < total; i++) {
        var row = Math.floor(i / gridSize);
        var col = i % gridSize;
        this._grid.push({
          row: row,
          col: col,
          baseZ: 0,
          z: 0
        });
      }

      if (!this._smoothedData || this._smoothedData.length !== total) {
        this._smoothedData = new Float32Array(total);
      }
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var dotColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var gridSize = parseInt(cfg.gridSize, 10) || self.defaults.gridSize;
      if (gridSize < 10) gridSize = 10;
      if (gridSize > 40) gridSize = 40;
      var ctx = self._ctx;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      var total = gridSize * gridSize;

      // Map frequency data to grid points
      if (freqData && freqData.length > 0) {
        var binCount = freqData.length;
        var binStep = Math.max(1, Math.floor(binCount / total));

        for (var i = 0; i < total; i++) {
          var binIndex = Math.min(i * binStep, binCount - 1);
          var value = freqData[binIndex];

          // Apply smoothing
          self._smoothedData[i] = self._smoothedData[i] * 0.85 + value * 0.15;

          // Normalize and apply sensitivity
          var normalized = (self._smoothedData[i] / 255) * (sensitivity / 5);
          if (normalized > 1) normalized = 1;

          // Z displacement (positive = towards viewer)
          self._grid[i].z = normalized * 200;
        }
      } else {
        // Idle state: gentle wave motion
        var time = Date.now() * 0.001;
        for (var i = 0; i < total; i++) {
          var row = self._grid[i].row;
          var col = self._grid[i].col;
          var wave = Math.sin(time + row * 0.3) * Math.cos(time * 1.2 + col * 0.3);
          self._grid[i].z = wave * 10;
        }
      }

      // 3D projection parameters
      var focalLength = 300;
      var vanishX = w / 2;
      var vanishY = h * 0.3; // Vanishing point at top-center for downward perspective
      var gridSpacingX = w / (gridSize + 1);
      var gridSpacingY = h / (gridSize + 1);

      // Sort dots by z-depth (back to front)
      var sortedGrid = self._grid.slice().sort(function(a, b) {
        return a.z - b.z;
      });

      // Enable glow
      ctx.shadowColor = 'rgb(' + dotColor.r + ',' + dotColor.g + ',' + dotColor.b + ')';
      ctx.shadowBlur = 8;

      // Draw dots
      for (var i = 0; i < sortedGrid.length; i++) {
        var dot = sortedGrid[i];
        var row = dot.row;
        var col = dot.col;
        var z = dot.z;

        // 2D grid position
        var x2d = (col + 1) * gridSpacingX;
        var y2d = (row + 1) * gridSpacingY;

        // 3D perspective projection
        var scale = focalLength / (focalLength + z);
        var x3d = vanishX + (x2d - vanishX) * scale;
        var y3d = vanishY + (y2d - vanishY) * scale;

        // Size and brightness based on depth
        var dotSize = 2 + (z / 200) * 3; // Larger when closer
        var brightness = 0.3 + (z / 200) * 0.7; // Brighter when closer

        ctx.fillStyle = 'rgba(' + dotColor.r + ',' + dotColor.g + ',' + dotColor.b + ',' + brightness + ')';
        ctx.beginPath();
        ctx.arc(x3d, y3d, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(ParticleVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
