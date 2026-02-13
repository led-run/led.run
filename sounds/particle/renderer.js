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
      color: 'ffffff',
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
    _gridCols: 0,
    _gridRows: 0,
    _smoothedZ: null,       // Float32Array[rows * cols] — smoothed Z displacement per point
    _prevTime: 0,           // performance.now() of last frame
    _ripplePhase: 0,        // accumulated ripple phase (driven by bass energy)
    _bassEnergy: 0,         // smoothed bass energy 0-1
    _lineAlpha: 0.08,       // smoothed grid line alpha

    // ---- lifecycle --------------------------------------------------------

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._prevTime = performance.now();
      this._ripplePhase = 0;
      this._bassEnergy = 0;
      this._lineAlpha = 0.08;

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._buildGrid();
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
      this._smoothedZ = null;
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
      this._buildGrid();
    },

    // ---- grid setup (pre-sorted by row) -----------------------------------

    _buildGrid: function() {
      var cfg = this._config;
      var gridSize = parseInt(cfg.gridSize, 10) || this.defaults.gridSize;
      if (gridSize < 10) gridSize = 10;
      if (gridSize > 40) gridSize = 40;

      this._gridCols = gridSize;
      this._gridRows = gridSize;

      var total = this._gridRows * this._gridCols;
      if (!this._smoothedZ || this._smoothedZ.length !== total) {
        this._smoothedZ = new Float32Array(total);
      }
    },

    // ---- projection helpers -----------------------------------------------

    /**
     * Project a 3D grid point (col, row, z) into 2D screen coordinates.
     * Returns { x, y, scale }.
     *
     * The grid lives in a virtual 3D space:
     *   - x: evenly spaced across width
     *   - y: evenly spaced across height
     *   - z: audio displacement (positive = towards viewer)
     *
     * Vanishing point is at 30% from top (steep downward perspective).
     */
    _project: function(col, row, z, w, h, cols, rows, focalLength) {
      var gridX = (col + 1) / (cols + 1) * w;
      var gridY = (row + 1) / (rows + 1) * h;

      var vanishX = w * 0.5;
      var vanishY = h * 0.3;

      var s = focalLength / (focalLength + z);
      return {
        x: vanishX + (gridX - vanishX) * s,
        y: vanishY + (gridY - vanishY) * s,
        scale: s
      };
    },

    // ---- main draw loop ---------------------------------------------------

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var now = performance.now();
      var dt = Math.min((now - self._prevTime) * 0.001, 0.1); // seconds, capped
      self._prevTime = now;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgRgb = hexToRgb(cfg.bg || self.defaults.bg);
      var dotRgb = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var sensFactor = sensitivity / 5;

      var cols = self._gridCols;
      var rows = self._gridRows;
      var total = rows * cols;
      var ctx = self._ctx;
      var focalLength = 300;

      // ----- clear -----
      ctx.fillStyle = 'rgb(' + bgRgb.r + ',' + bgRgb.g + ',' + bgRgb.b + ')';
      ctx.fillRect(0, 0, w, h);

      // ----- audio data -----
      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      // ----- compute bass energy (average of first 1/8 bins) -----
      var rawBass = 0;
      if (freqData && freqData.length > 0) {
        var bassEnd = Math.max(1, Math.floor(freqData.length / 8));
        var bassSum = 0;
        for (var b = 0; b < bassEnd; b++) {
          bassSum += freqData[b];
        }
        rawBass = (bassSum / bassEnd) / 255; // 0-1
      }
      // smooth bass
      self._bassEnergy += (rawBass - self._bassEnergy) * 0.15;

      // advance ripple phase (faster when bass is louder)
      self._ripplePhase += dt * (1.0 + self._bassEnergy * 6.0);

      // smooth grid-line alpha: 0.08 quiet → 0.3 loud
      var targetLineAlpha = 0.08 + self._bassEnergy * 0.22;
      self._lineAlpha += (targetLineAlpha - self._lineAlpha) * 0.1;

      // ----- map frequency data to grid Z displacement -----
      var halfCol = (cols - 1) * 0.5;
      var halfRow = (rows - 1) * 0.5;
      var maxDist = Math.sqrt(halfCol * halfCol + halfRow * halfRow);

      if (freqData && freqData.length > 0) {
        var binCount = freqData.length;

        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var idx = r * cols + c;

            // columns map to frequency bands (log-ish distribution)
            var freqT = c / (cols - 1);  // 0-1 across columns
            var binIndex = Math.floor(freqT * (binCount - 1));
            var rawVal = freqData[binIndex] / 255;  // 0-1

            // wave propagation: ripple from center
            var dx = c - halfCol;
            var dy = r - halfRow;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var normalizedDist = dist / maxDist; // 0-1

            // ripple modulation: phase offset by distance
            var ripple = Math.sin(self._ripplePhase * 2.0 - normalizedDist * 8.0);
            ripple = ripple * 0.5 + 0.5; // 0-1

            // combine audio value with ripple
            var combined = rawVal * (0.6 + 0.4 * ripple) * sensFactor;
            if (combined > 1) combined = 1;

            // target Z: 0 to 200 pixels displacement
            var targetZ = combined * 200;

            // smooth transition (per-point smoothing for fluid motion)
            self._smoothedZ[idx] += (targetZ - self._smoothedZ[idx]) * 0.18;
          }
        }
      } else {
        // ----- idle state: gentle sine wave traveling across grid -----
        var idleTime = now * 0.001;

        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var idx = r * cols + c;
            var dx = c - halfCol;
            var dy = r - halfRow;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var normalizedDist = dist / maxDist;

            var wave = Math.sin(idleTime * 0.8 - normalizedDist * 5.0);
            var targetZ = wave * 12 + 12; // oscillate 0-24

            self._smoothedZ[idx] += (targetZ - self._smoothedZ[idx]) * 0.08;
          }
        }
      }

      // ----- draw grid: back-to-front (row 0 = farthest) -----
      // Pre-sort is unnecessary: row order IS depth order for this
      // perspective (vanishing point at 30% top, rows go top-to-bottom).
      // We draw row 0 first (farthest) → row N last (nearest).

      var bloomThreshold = 40; // Z > this gets bloom duplicate
      var cr = dotRgb.r;
      var cg = dotRgb.g;
      var cb = dotRgb.b;
      var lineAlpha = self._lineAlpha;

      // ----- pass 1: grid lines (connections) -----
      ctx.lineWidth = 1;

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var z = self._smoothedZ[idx];
          var p = self._project(c, r, z, w, h, cols, rows, focalLength);

          // horizontal connection (to right neighbor)
          if (c < cols - 1) {
            var idxR = idx + 1;
            var zR = self._smoothedZ[idxR];
            var pR = self._project(c + 1, r, zR, w, h, cols, rows, focalLength);

            // line brightness: average displacement of two endpoints
            var avgZ = (z + zR) * 0.5;
            var normalizedAvgZ = Math.min(avgZ / 200, 1);
            var connAlpha = lineAlpha * (0.3 + 0.7 * normalizedAvgZ);

            ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + connAlpha.toFixed(4) + ')';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pR.x, pR.y);
            ctx.stroke();
          }

          // vertical connection (to row below)
          if (r < rows - 1) {
            var idxD = idx + cols;
            var zD = self._smoothedZ[idxD];
            var pD = self._project(c, r + 1, zD, w, h, cols, rows, focalLength);

            var avgZ2 = (z + zD) * 0.5;
            var normalizedAvgZ2 = Math.min(avgZ2 / 200, 1);
            var connAlpha2 = lineAlpha * (0.3 + 0.7 * normalizedAvgZ2);

            ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + connAlpha2.toFixed(4) + ')';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pD.x, pD.y);
            ctx.stroke();
          }
        }
      }

      // ----- pass 2: bloom duplicates (behind active dots) -----
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var z = self._smoothedZ[idx];
          if (z <= bloomThreshold) continue;

          var p = self._project(c, r, z, w, h, cols, rows, focalLength);
          var normalizedZ = Math.min(z / 200, 1);

          // bloom: larger, lower-alpha duplicate
          var bloomSize = 3 + normalizedZ * 6;
          var bloomAlpha = normalizedZ * 0.15;

          ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + bloomAlpha.toFixed(4) + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, bloomSize, 0, 6.2832);
          ctx.fill();
        }
      }

      // ----- pass 3: dots (back-to-front by row) -----
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var z = self._smoothedZ[idx];
          var p = self._project(c, r, z, w, h, cols, rows, focalLength);

          var normalizedZ = Math.min(z / 200, 1);
          if (normalizedZ < 0) normalizedZ = 0;

          // Lambert-like lighting: brighter when displaced more
          var brightness = 0.3 + 0.7 * normalizedZ;

          // Dot size: grows with displacement
          var dotSize = 1.5 + normalizedZ * 3;

          ctx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + brightness.toFixed(4) + ')';
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotSize, 0, 6.2832);
          ctx.fill();
        }
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(ParticleVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
