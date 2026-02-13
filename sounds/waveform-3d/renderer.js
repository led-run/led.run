;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  /**
   * Convert RGB (0-255) to HSL (h: 0-360, s: 0-1, l: 0-1)
   */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max === min) {
      h = 0; s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        h = ((b - r) / d + 2) / 6;
      } else {
        h = ((r - g) / d + 4) / 6;
      }
      h *= 360;
    }
    return { h: h, s: s, l: l };
  }

  /**
   * Convert HSL (h: 0-360, s: 0-1, l: 0-1) to RGB (0-255)
   */
  function hslToRgb(h, s, l) {
    h /= 360;
    var r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      var hue2rgb = function(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  var MAX_HISTORY = 16;

  var Waveform3DVisualizer = {
    id: 'waveform-3d',

    defaults: {
      color: '00ff80',
      bg: '000000',
      sensitivity: 5,
      depth: 12              // History depth 4-16
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _history: null,
    _maxHistory: 12,
    _lastTime: 0,
    _idlePhase: 0,
    _idleDrift: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._history = [];
      this._lastTime = 0;
      this._idlePhase = 0;
      this._idleDrift = 0;

      var cfg = this._config;
      var depth = parseInt(cfg.depth, 10) || this.defaults.depth;
      if (depth < 4) depth = 4;
      if (depth > MAX_HISTORY) depth = MAX_HISTORY;
      this._maxHistory = depth;

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._lastTime = performance.now();
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
      this._history = null;
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
    },

    /**
     * Compute perspective parameters for a given layer.
     * progress: 0 = back (oldest), 1 = front (newest).
     * Returns { baseY, scaleX, leftX, rightX }.
     */
    _perspective: function(progress, w, h) {
      var vanishY = h * 0.25;
      var frontY  = h * 0.80;

      // Y position: interpolate from vanish to front
      var baseY = vanishY + (frontY - vanishY) * progress;

      // X narrows toward vanishing point
      var scaleX = 0.2 + progress * 0.8;
      var centerX = w / 2;
      var halfW = (w / 2) * scaleX;
      var leftX  = centerX - halfW;
      var rightX = centerX + halfW;

      return {
        baseY: baseY,
        scaleX: scaleX,
        leftX: leftX,
        rightX: rightX
      };
    },

    /**
     * Get depth-graded color for a layer.
     * Front (progress=1) = original HSL; back layers darken lightness by 5% per step.
     */
    _layerColor: function(baseHsl, progress, layerIndex, totalLayers) {
      var stepsFromFront = totalLayers - 1 - layerIndex;
      var l = baseHsl.l - stepsFromFront * 0.05;
      if (l < 0.05) l = 0.05;

      // Desaturate back layers progressively
      var s = baseHsl.s * (0.55 + progress * 0.45);

      var rgb = hslToRgb(baseHsl.h, s, l);
      return rgb;
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var now = performance.now();
      var dt = (now - self._lastTime) / 1000; // seconds
      if (dt > 0.1) dt = 0.1; // Clamp to avoid large jumps
      self._lastTime = now;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var waveColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var depth = parseInt(cfg.depth, 10) || self.defaults.depth;
      if (depth < 4) depth = 4;
      if (depth > MAX_HISTORY) depth = MAX_HISTORY;
      if (self._maxHistory !== depth) {
        self._maxHistory = depth;
        // Trim history if needed
        while (self._history.length > depth) {
          self._history.shift();
        }
      }
      var ctx = self._ctx;

      var baseHsl = rgbToHsl(waveColor.r, waveColor.g, waveColor.b);
      var vanishY = h * 0.25;
      var frontY  = h * 0.80;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var timeData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        timeData = self._audioEngine.getTimeDomainData();
      }

      // ---------- Idle state ----------
      if (!timeData || timeData.length === 0) {
        self._idlePhase += dt * 0.8;
        self._idleDrift += dt * 0.3;

        // Slowly drift history layers backward and fade them out
        // by not adding new data; layers age out naturally

        // Draw grid even in idle
        self._drawGrid(ctx, w, h, bgColor, waveColor, baseHsl, vanishY, frontY);

        // Draw existing history layers fading out
        if (self._history.length > 0) {
          self._drawLayers(ctx, w, h, baseHsl, sensitivity, vanishY, frontY);
          // Remove oldest layer gradually during idle
          if (self._history.length > 0 && Math.random() < dt * 0.5) {
            self._history.shift();
          }
        }

        // Draw front gentle sine wave
        var frontPersp = self._perspective(1, w, h);
        var frontRgb = self._layerColor(baseHsl, 1, 0, 1);
        var sineAlpha = 0.4 + Math.sin(self._idlePhase * 1.5) * 0.15;

        ctx.strokeStyle = 'rgba(' + frontRgb.r + ',' + frontRgb.g + ',' + frontRgb.b + ',' + sineAlpha.toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        var steps = 200;
        for (var i = 0; i <= steps; i++) {
          var t = i / steps;
          var px = frontPersp.leftX + t * (frontPersp.rightX - frontPersp.leftX);
          var wave = Math.sin(t * Math.PI * 4 + self._idlePhase * 2) * 8 *
                     (0.6 + Math.sin(self._idlePhase * 0.7) * 0.3);
          var py = frontPersp.baseY + wave;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();

        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      // ---------- Active state ----------

      // Add current waveform to history
      var waveformCopy = new Uint8Array(timeData);
      self._history.push(waveformCopy);
      while (self._history.length > self._maxHistory) {
        self._history.shift();
      }

      // Draw grid
      self._drawGrid(ctx, w, h, bgColor, waveColor, baseHsl, vanishY, frontY);

      // Draw all waveform layers
      self._drawLayers(ctx, w, h, baseHsl, sensitivity, vanishY, frontY);

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    },

    /**
     * Draw perspective grid: horizontal lines per layer + vertical time markers.
     */
    _drawGrid: function(ctx, w, h, bgColor, waveColor, baseHsl, vanishY, frontY) {
      var self = this;
      var totalLayers = self._maxHistory;

      // Vertical time markers (every 25% width) across all layers
      var markerPositions = [0.25, 0.5, 0.75];

      for (var m = 0; m < markerPositions.length; m++) {
        var frac = markerPositions[m];

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(' + waveColor.r + ',' + waveColor.g + ',' + waveColor.b + ',0.12)';
        ctx.lineWidth = 1;

        // Draw line from back layer to front layer
        for (var layer = 0; layer <= totalLayers; layer++) {
          var progress = layer / (totalLayers - 1);
          if (progress > 1) progress = 1;
          var persp = self._perspective(progress, w, h);
          var px = persp.leftX + frac * (persp.rightX - persp.leftX);
          var py = persp.baseY;

          if (layer === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }

      // Horizontal grid lines per layer (5 per layer spread vertically)
      var hLineCount = 5;
      var ampRange = h * 0.15; // Approximate max amplitude range

      for (var layer = 0; layer < totalLayers; layer++) {
        var progress = layer / (totalLayers - 1);
        var persp = self._perspective(progress, w, h);
        var layerAlpha = 0.08 + progress * 0.06;

        ctx.strokeStyle = 'rgba(' + waveColor.r + ',' + waveColor.g + ',' + waveColor.b + ',' + layerAlpha.toFixed(3) + ')';
        ctx.lineWidth = 1;

        for (var gl = 0; gl < hLineCount; gl++) {
          // Spread lines around the layer's baseY
          var offset = ((gl / (hLineCount - 1)) - 0.5) * ampRange * persp.scaleX * 0.6;
          var gy = persp.baseY + offset;

          ctx.beginPath();
          ctx.moveTo(persp.leftX, gy);
          ctx.lineTo(persp.rightX, gy);
          ctx.stroke();
        }
      }
    },

    /**
     * Draw all waveform history layers from back to front.
     */
    _drawLayers: function(ctx, w, h, baseHsl, sensitivity, vanishY, frontY) {
      var self = this;
      var histLen = self._history.length;
      var maxH = self._maxHistory;

      for (var i = 0; i < histLen; i++) {
        var waveform = self._history[i];

        // progress: 0 (back/oldest) to 1 (front/newest)
        var progress;
        if (histLen === 1) {
          progress = 1;
        } else {
          progress = i / (histLen - 1);
        }

        var isFront = (i === histLen - 1) && histLen > 1;
        var persp = self._perspective(progress, w, h);
        var layerRgb = self._layerColor(baseHsl, progress, i, histLen);

        // Amplitude scaling: front layers get more amplitude
        var ampScale = 0.3 + progress * 0.7;
        var amp = (h * 0.15) * ampScale * (sensitivity / 5);

        // Line width: back = 1px, front = 3px
        var lineWidth;
        if (isFront) {
          lineWidth = 3;
        } else {
          lineWidth = 1 + progress * 0.5;
        }

        // Opacity: back fades, front full
        var opacity = 0.25 + progress * 0.75;

        var bufferLength = waveform.length;
        var layerW = persp.rightX - persp.leftX;
        var sliceWidth = layerW / bufferLength;

        // --- Glow for front layer ---
        if (isFront) {
          ctx.shadowColor = 'rgba(' + layerRgb.r + ',' + layerRgb.g + ',' + layerRgb.b + ',0.7)';
          ctx.shadowBlur = 8;
        }

        // --- Draw waveform stroke ---
        ctx.strokeStyle = 'rgba(' + layerRgb.r + ',' + layerRgb.g + ',' + layerRgb.b + ',' + opacity.toFixed(3) + ')';
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (var j = 0; j < bufferLength; j++) {
          var v = waveform[j] / 128.0 - 1; // Normalize to -1..1
          var px = persp.leftX + j * sliceWidth;
          var py = persp.baseY + v * amp;

          if (j === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();

        // Reset shadow immediately after stroke
        if (isFront) {
          ctx.shadowBlur = 0;
        }

        // --- Filled area below waveform for front layer (15% opacity gradient) ---
        if (isFront) {
          ctx.save();

          // Create gradient from waveform baseline downward
          var fillGrad = ctx.createLinearGradient(0, persp.baseY - amp, 0, persp.baseY + amp * 0.5);
          fillGrad.addColorStop(0, 'rgba(' + layerRgb.r + ',' + layerRgb.g + ',' + layerRgb.b + ',0.25)');
          fillGrad.addColorStop(1, 'rgba(' + layerRgb.r + ',' + layerRgb.g + ',' + layerRgb.b + ',0)');

          ctx.fillStyle = fillGrad;
          ctx.beginPath();
          ctx.moveTo(persp.leftX, persp.baseY);

          for (var j = 0; j < bufferLength; j++) {
            var v = waveform[j] / 128.0 - 1;
            var px = persp.leftX + j * sliceWidth;
            var py = persp.baseY + v * amp;
            ctx.lineTo(px, py);
          }

          ctx.lineTo(persp.rightX, persp.baseY);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(Waveform3DVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
