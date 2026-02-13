;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var ScopeVisualizer = {
    id: 'scope',

    defaults: {
      color: '00ff80',
      bg: '0a0a0a',
      sensitivity: 5,
      lineWidth: 2,
      gridLines: true
    },

    // Trail canvas (behind) — phosphor afterglow persistence
    _trailCanvas: null,
    _trailCtx: null,
    // Main canvas (on top) — grid, vignette, scanlines, beam dot
    _mainCanvas: null,
    _mainCtx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _beamX: 0,
    _idleScanDir: 1,
    _vignetteCache: null,
    _cachedWidth: 0,
    _cachedHeight: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._beamX = 0;
      this._idleScanDir = 1;
      this._vignetteCache = null;
      this._cachedWidth = 0;
      this._cachedHeight = 0;

      // Create trail canvas (behind)
      this._trailCanvas = document.createElement('canvas');
      this._trailCanvas.style.position = 'absolute';
      this._trailCanvas.style.top = '0';
      this._trailCanvas.style.left = '0';
      this._trailCanvas.style.width = '100%';
      this._trailCanvas.style.height = '100%';
      container.appendChild(this._trailCanvas);
      this._trailCtx = this._trailCanvas.getContext('2d');

      // Create main canvas (on top)
      this._mainCanvas = document.createElement('canvas');
      this._mainCanvas.style.position = 'absolute';
      this._mainCanvas.style.top = '0';
      this._mainCanvas.style.left = '0';
      this._mainCanvas.style.width = '100%';
      this._mainCanvas.style.height = '100%';
      container.appendChild(this._mainCanvas);
      this._mainCtx = this._mainCanvas.getContext('2d');

      // Ensure container has relative positioning for absolute children
      if (getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      container.style.overflow = 'hidden';

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      // Fill trail canvas with solid bg on first frame
      this._initTrail();

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
      if (this._trailCanvas && this._trailCanvas.parentNode) {
        this._trailCanvas.parentNode.removeChild(this._trailCanvas);
      }
      if (this._mainCanvas && this._mainCanvas.parentNode) {
        this._mainCanvas.parentNode.removeChild(this._mainCanvas);
      }
      this._trailCanvas = null;
      this._trailCtx = null;
      this._mainCanvas = null;
      this._mainCtx = null;
      this._container = null;
      this._audioEngine = null;
      this._config = null;
      this._vignetteCache = null;
    },

    _resizeHandler: function() {
      if (!this._container || !this._trailCanvas || !this._mainCanvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;

      this._trailCanvas.width = w * dpr;
      this._trailCanvas.height = h * dpr;
      this._trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this._mainCanvas.width = w * dpr;
      this._mainCanvas.height = h * dpr;
      this._mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Invalidate vignette cache
      this._vignetteCache = null;
      this._cachedWidth = 0;
      this._cachedHeight = 0;

      // Re-fill trail canvas with bg after resize
      this._initTrail();
    },

    _initTrail: function() {
      if (!this._trailCtx || !this._container) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var cfg = this._config;
      var bgColor = hexToRgb(cfg.bg || this.defaults.bg);
      this._trailCtx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      this._trailCtx.fillRect(0, 0, w, h);
    },

    _buildVignetteCache: function(ctx, w, h) {
      // Radial gradient from center (transparent) to edges (dark)
      var cx = w / 2;
      var cy = h / 2;
      var r = Math.sqrt(cx * cx + cy * cy);
      var grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.15)');
      this._vignetteCache = grad;
      this._cachedWidth = w;
      this._cachedHeight = h;
    },

    _drawDottedGrid: function(ctx, w, h, color) {
      // Dotted grid: small dots at intersections
      var vDivisions = 10;
      var hDivisions = 8;
      var vSpacing = w / vDivisions;
      var hSpacing = h / hDivisions;
      var dotRadius = 1;

      // Regular intersection dots
      ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.18)';
      for (var col = 0; col <= vDivisions; col++) {
        for (var row = 0; row <= hDivisions; row++) {
          var x = col * vSpacing;
          var y = row * hSpacing;
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Sub-grid dots (finer, between main intersections)
      var subDiv = 5;
      var subVSpacing = vSpacing / subDiv;
      var subHSpacing = hSpacing / subDiv;
      ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.06)';
      for (var col = 0; col <= vDivisions * subDiv; col++) {
        for (var row = 0; row <= hDivisions * subDiv; row++) {
          // Skip main grid points (already drawn brighter)
          if (col % subDiv === 0 && row % subDiv === 0) continue;
          var x = col * subVSpacing;
          var y = row * subHSpacing;
          ctx.beginPath();
          ctx.arc(x, y, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Center crosshair lines (dotted, brighter)
      var centerY = h / 2;
      var centerX = w / 2;
      ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.3)';

      // Horizontal center line dots
      for (var col = 0; col <= vDivisions * subDiv; col++) {
        var x = col * subVSpacing;
        ctx.beginPath();
        ctx.arc(x, centerY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vertical center line dots
      for (var row = 0; row <= hDivisions * subDiv; row++) {
        var y = row * subHSpacing;
        ctx.beginPath();
        ctx.arc(centerX, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    _drawScanlines: function(ctx, w, h) {
      // Horizontal scanlines — every other pixel row at 3% opacity
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (var y = 0; y < h; y += 2) {
        ctx.fillRect(0, y, w, 1);
      }
    },

    _drawVignette: function(ctx, w, h) {
      if (!this._vignetteCache || this._cachedWidth !== w || this._cachedHeight !== h) {
        this._buildVignetteCache(ctx, w, h);
      }
      ctx.fillStyle = this._vignetteCache;
      ctx.fillRect(0, 0, w, h);
    },

    _drawBeamDot: function(ctx, x, y, color) {
      // Bright white dot with colored glow at beam position
      ctx.shadowColor = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Secondary glow ring
      ctx.fillStyle = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    },

    _drawWaveform: function(ctx, w, h, timeData, sensitivity, lineWidth, lineColor, isTrail) {
      var bufferLength = timeData.length;
      var sliceWidth = w / bufferLength;
      var centerY = h / 2;
      var amp = (h / 2) * (sensitivity / 5) * 0.85;

      // Gradient stroke from left to right: dim -> bright -> dim (CRT beam sweep)
      var grad = ctx.createLinearGradient(0, 0, w, 0);
      var r = lineColor.r;
      var g = lineColor.g;
      var b = lineColor.b;
      if (isTrail) {
        // Trail waveform: slightly dimmer, no gradient needed
        grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.6)');
        grad.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',0.8)');
        grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0.6)');
      } else {
        // Main waveform: bright in middle, dim at edges
        grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.3)');
        grad.addColorStop(0.15, 'rgba(' + r + ',' + g + ',' + b + ',0.7)');
        grad.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',1)');
        grad.addColorStop(0.85, 'rgba(' + r + ',' + g + ',' + b + ',0.7)');
        grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0.3)');
      }

      // Glow for the waveform line
      ctx.shadowColor = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.shadowBlur = isTrail ? 4 : 8;
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      var lastX = 0;
      var lastY = centerY;
      for (var i = 0; i < bufferLength; i++) {
        var v = timeData[i] / 128.0 - 1; // Normalize to -1..1
        var y = centerY + v * amp;
        var x = i * sliceWidth;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        lastX = x;
        lastY = y;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Return the last drawn point for beam dot placement
      return { x: lastX, y: lastY };
    },

    _draw: function() {
      var self = this;
      if (!self._trailCtx || !self._mainCtx || !self._container) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var lineColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var lineWidth = parseFloat(cfg.lineWidth) || self.defaults.lineWidth;
      var showGrid = cfg.gridLines !== undefined ? cfg.gridLines : self.defaults.gridLines;
      var tCtx = self._trailCtx;
      var mCtx = self._mainCtx;
      var now = performance.now();

      // --- Trail canvas: fade old trails then draw current waveform ---
      // Overlay bg color at 4% opacity to slowly fade phosphor trails
      tCtx.fillStyle = 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',0.04)';
      tCtx.fillRect(0, 0, w, h);

      // --- Main canvas: clear fully, draw overlays ---
      mCtx.clearRect(0, 0, w, h);

      // Draw dotted grid on main canvas
      if (showGrid) {
        self._drawDottedGrid(mCtx, w, h, lineColor);
      }

      var timeData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        timeData = self._audioEngine.getTimeDomainData();
      }

      var hasSignal = false;
      if (timeData && timeData.length > 0) {
        // Check if there is actual signal (not just silence at 128)
        for (var i = 0; i < timeData.length; i += 16) {
          if (Math.abs(timeData[i] - 128) > 2) {
            hasSignal = true;
            break;
          }
        }
      }

      if (!hasSignal) {
        // --- Idle state ---
        var timeSec = now * 0.001;
        var centerY = h / 2;

        // CRT flicker: subtle brightness variation
        var flicker = 0.35 + Math.sin(timeSec * 3.7) * 0.05 + Math.sin(timeSec * 7.3) * 0.02;

        // Beam scans slowly across the screen
        var scanSpeed = 80; // pixels per second
        self._beamX += self._idleScanDir * scanSpeed / 60;
        if (self._beamX > w) {
          self._beamX = w;
          self._idleScanDir = -1;
        } else if (self._beamX < 0) {
          self._beamX = 0;
          self._idleScanDir = 1;
        }

        // Draw flat line on trail canvas (for persistence)
        tCtx.strokeStyle = 'rgba(' + lineColor.r + ',' + lineColor.g + ',' + lineColor.b + ',' + flicker.toFixed(3) + ')';
        tCtx.lineWidth = lineWidth;
        tCtx.shadowColor = 'rgb(' + lineColor.r + ',' + lineColor.g + ',' + lineColor.b + ')';
        tCtx.shadowBlur = 4;
        tCtx.beginPath();
        tCtx.moveTo(0, centerY);
        tCtx.lineTo(w, centerY);
        tCtx.stroke();
        tCtx.shadowBlur = 0;

        // Draw beam dot at scan position on main canvas
        self._drawBeamDot(mCtx, self._beamX, centerY, lineColor);
      } else {
        // --- Active state: draw waveform ---

        // Draw waveform on trail canvas (phosphor persistence)
        self._drawWaveform(tCtx, w, h, timeData, sensitivity, lineWidth, lineColor, true);

        // Draw waveform on main canvas (crisp current frame)
        var lastPoint = self._drawWaveform(mCtx, w, h, timeData, sensitivity, lineWidth, lineColor, false);

        // Draw beam dot at the rightmost drawn point
        self._drawBeamDot(mCtx, lastPoint.x, lastPoint.y, lineColor);
      }

      // Draw CRT vignette on main canvas
      self._drawVignette(mCtx, w, h);

      // Draw scanline overlay on main canvas (tied to gridLines param)
      if (showGrid) {
        self._drawScanlines(mCtx, w, h);
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(ScopeVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
