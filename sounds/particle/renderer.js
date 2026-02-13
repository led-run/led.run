;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s, l: l };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    h /= 360;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var hue2rgb = function(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      var q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p2 = 2 * l - q2;
      r = hue2rgb(p2, q2, h + 1/3);
      g = hue2rgb(p2, q2, h);
      b = hue2rgb(p2, q2, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * Compute height-based color: cool at low Z, warm at high Z.
   * @param {number} normalizedZ - 0 (quiet) to 1 (loud)
   * @param {object} baseHsl - { h, s, l } of the base color
   * @returns {object} { r, g, b }
   */
  function heightColor(normalizedZ, baseHsl) {
    var hue = baseHsl.h + 30 - normalizedZ * 50; // cool→warm shift
    var sat = Math.min(1, baseHsl.s + normalizedZ * 0.3);
    var lit = Math.min(0.85, baseHsl.l * 0.7 + normalizedZ * 0.45);
    return hslToRgb(hue, sat, lit);
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
    _baseHsl: null,         // HSL of base color for height color derivation
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
      this._lineAlpha = 0.15;

      var baseRgb = hexToRgb(config.color || this.defaults.color);
      this._baseHsl = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);

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
      this._baseHsl = null;
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

      // Recompute base HSL if color changed
      var baseHsl = self._baseHsl;
      if (!baseHsl) {
        baseHsl = rgbToHsl(dotRgb.r, dotRgb.g, dotRgb.b);
        self._baseHsl = baseHsl;
      }

      var cols = self._gridCols;
      var rows = self._gridRows;
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

      // smooth grid-line alpha: 0.15 quiet → 0.37 loud
      var targetLineAlpha = 0.15 + self._bassEnergy * 0.22;
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

            var freqT = c / (cols - 1);
            var binIndex = Math.floor(freqT * (binCount - 1));
            var rawVal = freqData[binIndex] / 255;

            var dx = c - halfCol;
            var dy = r - halfRow;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var normalizedDist = dist / maxDist;

            var ripple = Math.sin(self._ripplePhase * 2.0 - normalizedDist * 8.0);
            ripple = ripple * 0.5 + 0.5;

            var combined = rawVal * (0.6 + 0.4 * ripple) * sensFactor;
            if (combined > 1) combined = 1;

            var targetZ = combined * 200;
            self._smoothedZ[idx] += (targetZ - self._smoothedZ[idx]) * 0.18;
          }
        }
      } else {
        var idleTime = now * 0.001;

        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var idx = r * cols + c;
            var dx = c - halfCol;
            var dy = r - halfRow;
            var dist = Math.sqrt(dx * dx + dy * dy);
            var normalizedDist = dist / maxDist;

            var wave = Math.sin(idleTime * 0.8 - normalizedDist * 5.0);
            var targetZ = wave * 12 + 12;

            self._smoothedZ[idx] += (targetZ - self._smoothedZ[idx]) * 0.08;
          }
        }
      }

      // ----- draw grid: back-to-front (row 0 = farthest) -----
      var bloomThreshold = 25;
      var cr = dotRgb.r;
      var cg = dotRgb.g;
      var cb = dotRgb.b;
      var lineAlpha = self._lineAlpha;

      // ----- pass 1: grid lines (connections) with variable width & color -----
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var z = self._smoothedZ[idx];
          var p = self._project(c, r, z, w, h, cols, rows, focalLength);

          // horizontal connection
          if (c < cols - 1) {
            var idxR = idx + 1;
            var zR = self._smoothedZ[idxR];
            var pR = self._project(c + 1, r, zR, w, h, cols, rows, focalLength);

            var avgZ = (z + zR) * 0.5;
            var normalizedAvgZ = Math.min(avgZ / 200, 1);
            var connAlpha = lineAlpha * (0.4 + 0.6 * normalizedAvgZ);

            // Variable line width based on energy
            ctx.lineWidth = 0.5 + normalizedAvgZ * 1.5;

            // Tint high-energy lines toward height color
            var lineRgb = normalizedAvgZ > 0.3 ? heightColor(normalizedAvgZ, baseHsl) : dotRgb;
            ctx.strokeStyle = 'rgba(' + lineRgb.r + ',' + lineRgb.g + ',' + lineRgb.b + ',' + connAlpha.toFixed(4) + ')';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pR.x, pR.y);
            ctx.stroke();
          }

          // vertical connection
          if (r < rows - 1) {
            var idxD = idx + cols;
            var zD = self._smoothedZ[idxD];
            var pD = self._project(c, r + 1, zD, w, h, cols, rows, focalLength);

            var avgZ2 = (z + zD) * 0.5;
            var normalizedAvgZ2 = Math.min(avgZ2 / 200, 1);
            var connAlpha2 = lineAlpha * (0.4 + 0.6 * normalizedAvgZ2);

            ctx.lineWidth = 0.5 + normalizedAvgZ2 * 1.5;

            var lineRgb2 = normalizedAvgZ2 > 0.3 ? heightColor(normalizedAvgZ2, baseHsl) : dotRgb;
            ctx.strokeStyle = 'rgba(' + lineRgb2.r + ',' + lineRgb2.g + ',' + lineRgb2.b + ',' + connAlpha2.toFixed(4) + ')';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pD.x, pD.y);
            ctx.stroke();
          }
        }
      }

      // ----- pass 2: scan wave ring (visible ripple wavefront) -----
      if (isRunning && self._bassEnergy > 0.05) {
        // Render the expanding ripple wavefront as a visible ring
        var rippleRadius = ((self._ripplePhase * 2.0) % (Math.PI * 2)) / (Math.PI * 2); // 0-1 cycle
        // Map ripple radius to screen space (center of grid)
        var vanishX = w * 0.5;
        var vanishY = h * 0.3;
        var gridCenterY = (vanishY + h) * 0.5;
        var ringMaxRadius = Math.min(w, h) * 0.45;
        var ringR = rippleRadius * ringMaxRadius;

        var ringAlpha = (0.08 + self._bassEnergy * 0.12) * (1 - rippleRadius * 0.6);
        if (ringAlpha > 0.01) {
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + ringAlpha.toFixed(4) + ')';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(vanishX, gridCenterY, ringR, ringR * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // ----- pass 3: multi-layer bloom (behind active dots) -----
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var z = self._smoothedZ[idx];
          if (z <= bloomThreshold) continue;

          var p = self._project(c, r, z, w, h, cols, rows, focalLength);
          var normalizedZ = Math.min(z / 200, 1);
          var hc = heightColor(normalizedZ, baseHsl);

          // Layer 1: large, very faint outer bloom
          var bloomSize1 = (3 + normalizedZ * 6) * 2.5;
          var bloomAlpha1 = normalizedZ * 0.06;
          var grad1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, bloomSize1);
          grad1.addColorStop(0, 'rgba(' + hc.r + ',' + hc.g + ',' + hc.b + ',' + bloomAlpha1.toFixed(4) + ')');
          grad1.addColorStop(1, 'rgba(' + hc.r + ',' + hc.g + ',' + hc.b + ',0)');
          ctx.fillStyle = grad1;
          ctx.fillRect(p.x - bloomSize1, p.y - bloomSize1, bloomSize1 * 2, bloomSize1 * 2);

          // Layer 2: medium bloom with gradient
          var bloomSize2 = (3 + normalizedZ * 6) * 1.5;
          var bloomAlpha2 = normalizedZ * 0.12;
          var grad2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, bloomSize2);
          grad2.addColorStop(0, 'rgba(' + hc.r + ',' + hc.g + ',' + hc.b + ',' + bloomAlpha2.toFixed(4) + ')');
          grad2.addColorStop(1, 'rgba(' + hc.r + ',' + hc.g + ',' + hc.b + ',0)');
          ctx.fillStyle = grad2;
          ctx.fillRect(p.x - bloomSize2, p.y - bloomSize2, bloomSize2 * 2, bloomSize2 * 2);

          // Shadow glow for brightest dots
          if (z > 120) {
            ctx.shadowColor = 'rgba(' + hc.r + ',' + hc.g + ',' + hc.b + ',0.4)';
            ctx.shadowBlur = 8 + normalizedZ * 8;
          }
        }
      }
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // ----- pass 4: dots with height color + gradient glow -----
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var z = self._smoothedZ[idx];
          var p = self._project(c, r, z, w, h, cols, rows, focalLength);

          var normalizedZ = Math.min(z / 200, 1);
          if (normalizedZ < 0) normalizedZ = 0;

          var brightness = 0.3 + 0.7 * normalizedZ;
          var dotSize = 1.5 + normalizedZ * 4.5;

          // Height-based color
          var dc = heightColor(normalizedZ, baseHsl);

          if (dotSize > 3) {
            // Gradient glow dot: white-hot center → color → transparent
            var dotGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotSize);
            dotGrad.addColorStop(0, 'rgba(255,255,255,' + (brightness * 0.9).toFixed(3) + ')');
            dotGrad.addColorStop(0.35, 'rgba(' + dc.r + ',' + dc.g + ',' + dc.b + ',' + brightness.toFixed(3) + ')');
            dotGrad.addColorStop(1, 'rgba(' + dc.r + ',' + dc.g + ',' + dc.b + ',0)');
            ctx.fillStyle = dotGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, dotSize, 0, 6.2832);
            ctx.fill();
          } else {
            // Small dots: flat fill for performance
            ctx.fillStyle = 'rgba(' + dc.r + ',' + dc.g + ',' + dc.b + ',' + brightness.toFixed(4) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, dotSize, 0, 6.2832);
            ctx.fill();
          }
        }
      }

      // ----- pass 5: ground plane reflection (front rows mirrored below) -----
      var reflectRows = Math.min(3, rows);
      for (var r = rows - reflectRows; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = r * cols + c;
          var z = self._smoothedZ[idx];

          // Project original dot position
          var pOrig = self._project(c, r, z, w, h, cols, rows, focalLength);
          // Mirror Y position: reflect around the last row's Y baseline
          var lastRowP = self._project(c, rows - 1, 0, w, h, cols, rows, focalLength);
          var reflY = lastRowP.y + (lastRowP.y - pOrig.y) * 0.3;

          // Skip if reflection is off-screen
          if (reflY > h || reflY < 0) continue;

          var normalizedZ = Math.min(z / 200, 1);
          var reflAlpha = normalizedZ * 0.12 * (1 - (r - (rows - reflectRows)) / reflectRows);
          var dotSize = 1 + normalizedZ * 2;

          var dc = heightColor(normalizedZ, baseHsl);
          ctx.fillStyle = 'rgba(' + dc.r + ',' + dc.g + ',' + dc.b + ',' + reflAlpha.toFixed(4) + ')';
          ctx.beginPath();
          ctx.arc(pOrig.x, reflY, dotSize, 0, 6.2832);
          ctx.fill();
        }
      }

      // Ground plane horizon line
      var lastRowBase = self._project(0, rows - 1, 0, w, h, cols, rows, focalLength);
      var lastRowBaseR = self._project(cols - 1, rows - 1, 0, w, h, cols, rows, focalLength);
      var horizGrad = ctx.createLinearGradient(lastRowBase.x, lastRowBase.y, lastRowBaseR.x, lastRowBase.y);
      var horizAlpha = 0.06 + self._bassEnergy * 0.08;
      horizGrad.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
      horizGrad.addColorStop(0.3, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + horizAlpha.toFixed(3) + ')');
      horizGrad.addColorStop(0.7, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + horizAlpha.toFixed(3) + ')');
      horizGrad.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0)');
      ctx.strokeStyle = horizGrad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lastRowBase.x, lastRowBase.y);
      ctx.lineTo(lastRowBaseR.x, lastRowBase.y);
      ctx.stroke();

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(ParticleVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
