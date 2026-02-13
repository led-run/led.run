;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  function hslToRgb(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r, g, b;

    if (h < 60) {
      r = c; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = c; b = 0;
    } else if (h < 180) {
      r = c; g = x; b = 0;
    } else if (h < 240) {
      r = x; g = 0; b = c;
    } else if (h < 300) {
      r = 0; g = x; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }

    return { h: h, s: s, l: l };
  }

  var BatteryVisualizer = {
    id: 'battery',

    defaults: {
      color: '00ff00',      // Starting green
      bg: '000000',
      sensitivity: 5,
      pulseSpeed: 5
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _pulses: null,
    _lastPulseTime: 0,
    _time: 0,
    _avgVolume: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._pulses = [];
      this._lastPulseTime = 0;
      this._time = 0;
      this._avgVolume = 0;

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
      this._pulses = null;
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

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var baseColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var pulseSpeed = parseFloat(cfg.pulseSpeed) || self.defaults.pulseSpeed;
      var ctx = self._ctx;

      self._time += 0.016;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      // Calculate average volume
      var volume = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        volume = sum / freqData.length / 255;
      } else {
        volume = 0.05; // Idle state minimum
      }

      // Smooth volume
      self._avgVolume = self._avgVolume * 0.85 + volume * 0.15;

      var normalizedVol = self._avgVolume * (sensitivity / 5);
      if (normalizedVol > 1) normalizedVol = 1;

      var centerX = w / 2;
      var centerY = h / 2;
      var maxRadius = Math.sqrt(w * w + h * h) / 2;

      // Trigger new pulse based on volume threshold and pulse speed
      var pulseInterval = 1000 / pulseSpeed; // ms between pulses
      var threshold = 0.15;

      if (normalizedVol > threshold && (Date.now() - self._lastPulseTime) > pulseInterval) {
        var baseHsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
        self._pulses.push({
          radius: 0,
          maxRadius: maxRadius,
          life: 0,
          maxLife: 2.0, // seconds
          hue: baseHsl.h,
          saturation: baseHsl.s,
          lightness: baseHsl.l,
          intensity: normalizedVol
        });
        self._lastPulseTime = Date.now();
      }

      // Update and draw pulses
      for (var i = self._pulses.length - 1; i >= 0; i--) {
        var pulse = self._pulses[i];
        pulse.life += 0.016;

        if (pulse.life >= pulse.maxLife) {
          self._pulses.splice(i, 1);
          continue;
        }

        var progress = pulse.life / pulse.maxLife;
        pulse.radius = progress * pulse.maxRadius;

        // Hue shift over lifetime (120 degrees)
        var currentHue = (pulse.hue + progress * 120) % 360;
        var rgb = hslToRgb(currentHue, pulse.saturation, pulse.lightness);

        // Opacity fades out
        var opacity = (1 - progress) * pulse.intensity * 0.6;

        // Draw ring
        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + opacity + ')';
        ctx.lineWidth = 3 + pulse.intensity * 2;
        ctx.shadowColor = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.8)';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.arc(centerX, centerY, pulse.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Idle state: draw subtle center glow
      if (self._pulses.length === 0) {
        var idleGlow = 20 + Math.sin(self._time * 2) * 5;
        var idleGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, idleGlow);
        idleGrad.addColorStop(0, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0.3)');
        idleGrad.addColorStop(1, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0)');
        ctx.fillStyle = idleGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, idleGlow, 0, Math.PI * 2);
        ctx.fill();
      }

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(BatteryVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
