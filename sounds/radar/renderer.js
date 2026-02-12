;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var RadarVisualizer = {
    id: 'radar',

    defaults: {
      color: '00ff41',
      bg: '001a00',
      sensitivity: 5,
      scanSpeed: 5
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _sweepAngle: 0,
    _blips: null,
    _trailCanvas: null,
    _trailCtx: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._sweepAngle = 0;
      this._blips = [];

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      // Off-screen canvas for fade trail effect
      this._trailCanvas = document.createElement('canvas');
      this._trailCtx = this._trailCanvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

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
      this._config = null;
      this._blips = null;
      this._trailCanvas = null;
      this._trailCtx = null;
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Resize trail canvas to match
      this._trailCanvas.width = w * dpr;
      this._trailCanvas.height = h * dpr;
      this._trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var ctx = self._ctx;

      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var radarColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var scanSpeed = parseFloat(cfg.scanSpeed) || self.defaults.scanSpeed;
      var sensitivityScale = sensitivity / 5;

      var cx = w / 2;
      var cy = h / 2;
      var radius = Math.min(cx, cy) * 0.85;

      // Sweep rotation speed (radians per frame)
      var sweepSpeed = (scanSpeed / 5) * 0.03;
      self._sweepAngle = (self._sweepAngle + sweepSpeed) % (Math.PI * 2);

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // --- Fade trail on off-screen canvas ---
      var tCtx = self._trailCtx;
      // Darken previous frame for trail fade
      tCtx.fillStyle = 'rgba(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ',0.06)';
      tCtx.fillRect(0, 0, w, h);

      // Draw blips onto trail canvas
      if (freqData && freqData.length > 0) {
        var binCount = freqData.length;
        // Map frequency bins to angles around the sweep position
        var angleSpread = Math.PI * 0.3; // blips appear in a 30-degree arc behind sweep
        for (var i = 0; i < binCount; i += 4) { // sample every 4th bin for performance
          var amplitude = (freqData[i] / 255) * sensitivityScale;
          if (amplitude < 0.15) continue; // skip quiet bins

          var binAngle = self._sweepAngle - (i / binCount) * angleSpread;
          var dist = 0.2 + (i / binCount) * 0.75; // map bin index to distance
          dist *= radius;

          var bx = cx + Math.cos(binAngle) * dist;
          var by = cy + Math.sin(binAngle) * dist;
          var blipSize = 1.5 + amplitude * 3;
          var blipAlpha = 0.3 + amplitude * 0.7;

          tCtx.beginPath();
          tCtx.arc(bx, by, blipSize, 0, Math.PI * 2);
          tCtx.fillStyle = 'rgba(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ',' + blipAlpha.toFixed(3) + ')';
          tCtx.shadowColor = 'rgb(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ')';
          tCtx.shadowBlur = 6;
          tCtx.fill();
        }
        tCtx.shadowBlur = 0;
      }

      // --- Main canvas: background + trail + grid + sweep ---
      // Clear main canvas
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // Composite trail canvas
      ctx.drawImage(self._trailCanvas, 0, 0, w, h);

      // Draw radar grid
      var gridAlpha = 0.12;
      var gridColor = 'rgba(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ',' + gridAlpha + ')';
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;

      // Concentric circles
      var rings = 4;
      for (var r = 1; r <= rings; r++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (radius / rings) * r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Radial lines (cross pattern + diagonals)
      var radialLines = 8;
      for (var i = 0; i < radialLines; i++) {
        var angle = (i / radialLines) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();
      }

      // Draw sweep trail: multiple arc slices with increasing opacity
      var trailAngle = Math.PI * 0.35; // sweep trail arc
      var trailSteps = 12;
      for (var t = 0; t < trailSteps; t++) {
        var t0 = t / trailSteps;
        var t1 = (t + 1) / trailSteps;
        var a0 = self._sweepAngle - trailAngle * (1 - t0);
        var a1 = self._sweepAngle - trailAngle * (1 - t1);
        var alpha = 0.15 * t1 * t1; // quadratic fade-in toward sweep line

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, a0, a1);
        ctx.closePath();
        ctx.fillStyle = 'rgba(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ',' + alpha.toFixed(4) + ')';
        ctx.fill();
      }

      // Bright sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(self._sweepAngle) * radius,
        cy + Math.sin(self._sweepAngle) * radius
      );
      ctx.strokeStyle = 'rgba(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ',0.8)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgb(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ')';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ')';
      ctx.shadowColor = 'rgb(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ')';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Outer ring (brighter)
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + radarColor.r + ',' + radarColor.g + ',' + radarColor.b + ',0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(RadarVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
