;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var RippleVisualizer = {
    id: 'ripple',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      threshold: 5
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _ripples: null,
    _lastTrigger: 0,
    _cooldown: 6, // minimum frames between ripple spawns

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._ripples = [];
      this._lastTrigger = 0;

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

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
      this._ripples = null;
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

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var ctx = self._ctx;

      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var rippleColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var threshold = parseFloat(cfg.threshold) || self.defaults.threshold;
      var sensitivityScale = sensitivity / 5;

      // Threshold mapped to 0-1 range (1=lowest threshold, 10=highest threshold)
      var thresholdValue = 1 - (threshold / 10) * 0.8; // range 0.2-1.0 inverted

      // Clear background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var cx = w / 2;
      var cy = h / 2;
      var maxRadius = Math.sqrt(cx * cx + cy * cy);

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // Compute average amplitude
      var avgAmplitude = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        avgAmplitude = (sum / freqData.length / 255) * sensitivityScale;
        if (avgAmplitude > 1) avgAmplitude = 1;
      }

      // Trigger new ripple if amplitude exceeds threshold
      self._lastTrigger++;
      if (isRunning && avgAmplitude > thresholdValue && self._lastTrigger >= self._cooldown) {
        self._ripples.push({
          radius: 0,
          maxRadius: maxRadius,
          speed: 2 + avgAmplitude * 4,
          opacity: 0.5 + avgAmplitude * 0.5,
          lineWidth: 2 + avgAmplitude * 4,
          intensity: avgAmplitude
        });
        self._lastTrigger = 0;
      }

      // Draw idle center circle when not running or no ripples
      if (!isRunning || self._ripples.length === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(w, h) * 0.05, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + rippleColor.r + ',' + rippleColor.g + ',' + rippleColor.b + ',0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Update and draw ripples
      var aliveRipples = [];

      for (var i = 0; i < self._ripples.length; i++) {
        var ripple = self._ripples[i];

        // Expand
        ripple.radius += ripple.speed;

        // Fade based on expansion
        var progress = ripple.radius / ripple.maxRadius;
        var alpha = ripple.opacity * (1 - progress);
        var lw = ripple.lineWidth * (1 - progress * 0.7);

        if (alpha <= 0.005 || ripple.radius > ripple.maxRadius) {
          continue; // ripple is dead
        }

        // Draw ripple ring
        ctx.beginPath();
        ctx.arc(cx, cy, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + rippleColor.r + ',' + rippleColor.g + ',' + rippleColor.b + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = lw;

        // Glow for fresh ripples
        if (progress < 0.3) {
          ctx.shadowColor = 'rgb(' + rippleColor.r + ',' + rippleColor.g + ',' + rippleColor.b + ')';
          ctx.shadowBlur = 10 * (1 - progress / 0.3);
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.stroke();

        aliveRipples.push(ripple);
      }

      ctx.shadowBlur = 0;
      self._ripples = aliveRipples;

      // Draw center dot (always visible, pulses with amplitude)
      var dotRadius = Math.min(w, h) * 0.01 + (isRunning ? avgAmplitude * Math.min(w, h) * 0.02 : 0);
      var dotAlpha = isRunning ? 0.3 + avgAmplitude * 0.7 : 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + rippleColor.r + ',' + rippleColor.g + ',' + rippleColor.b + ',' + dotAlpha.toFixed(3) + ')';
      ctx.shadowColor = 'rgb(' + rippleColor.r + ',' + rippleColor.g + ',' + rippleColor.b + ')';
      ctx.shadowBlur = isRunning ? 8 + avgAmplitude * 12 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(RippleVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
