;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var SpectrumCircleVisualizer = {
    id: 'spectrum-circle',

    defaults: {
      color: '4080ff',      // Blue
      bg: '000000',
      sensitivity: 5,
      innerRadius: 0.2      // 0.1-0.4
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _smoothedData: null,
    _avgVolume: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._smoothedData = null;
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
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var barColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var innerRadiusRatio = parseFloat(cfg.innerRadius) || self.defaults.innerRadius;
      if (innerRadiusRatio < 0.1) innerRadiusRatio = 0.1;
      if (innerRadiusRatio > 0.4) innerRadiusRatio = 0.4;
      var ctx = self._ctx;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      var centerX = w / 2;
      var centerY = h / 2;
      var maxRadius = Math.min(w, h) * 0.45;
      var innerRadius = maxRadius * innerRadiusRatio;
      var barCount = 180; // 360 bars for smooth circle

      if (!freqData || freqData.length === 0) {
        // Idle state: draw inner circle with pulse
        var time = Date.now() * 0.001;
        var pulse = 1 + Math.sin(time * 2) * 0.1;
        var idleRadius = innerRadius * pulse;

        ctx.strokeStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, idleRadius, 0, Math.PI * 2);
        ctx.stroke();

        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      // Initialize smoothed data
      if (!self._smoothedData || self._smoothedData.length !== barCount) {
        self._smoothedData = new Float32Array(barCount);
      }

      // Sample frequency data
      var binCount = freqData.length;
      var binsPerBar = Math.floor(binCount / barCount);
      if (binsPerBar < 1) binsPerBar = 1;

      var angleStep = (Math.PI * 2) / barCount;

      // Create gradient colors
      var lightR = Math.min(255, barColor.r + Math.round((255 - barColor.r) * 0.5));
      var lightG = Math.min(255, barColor.g + Math.round((255 - barColor.g) * 0.5));
      var lightB = Math.min(255, barColor.b + Math.round((255 - barColor.b) * 0.5));

      // Enable glow
      ctx.shadowColor = 'rgb(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ')';
      ctx.shadowBlur = 12;

      // Calculate average volume for center pulse
      var sum = 0;
      for (var i = 0; i < freqData.length; i++) {
        sum += freqData[i];
      }
      var volume = sum / freqData.length / 255;
      self._avgVolume = self._avgVolume * 0.85 + volume * 0.15;

      for (var i = 0; i < barCount; i++) {
        // Average frequency bins
        var barSum = 0;
        var start = i * binsPerBar;
        var end = Math.min(start + binsPerBar, binCount);
        for (var j = start; j < end; j++) {
          barSum += freqData[j];
        }
        var avg = barSum / (end - start);

        // Apply smoothing
        self._smoothedData[i] = self._smoothedData[i] * 0.85 + avg * 0.15;

        // Normalize and apply sensitivity
        var normalized = (self._smoothedData[i] / 255) * (sensitivity / 5);
        if (normalized > 1) normalized = 1;

        var barLength = normalized * (maxRadius - innerRadius);
        if (barLength < 2) barLength = 2;

        var angle = i * angleStep - Math.PI / 2; // Start from top

        var x1 = centerX + Math.cos(angle) * innerRadius;
        var y1 = centerY + Math.sin(angle) * innerRadius;
        var x2 = centerX + Math.cos(angle) * (innerRadius + barLength);
        var y2 = centerY + Math.sin(angle) * (innerRadius + barLength);

        // Gradient from inner (base color) to outer (light color)
        var grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgb(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ')');
        grad.addColorStop(1, 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Draw center orb with volume-driven pulse
      var orbPulse = 1 + self._avgVolume * (sensitivity / 5) * 0.3;
      var orbRadius = innerRadius * 0.6 * orbPulse;

      var orbGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius);
      orbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      orbGrad.addColorStop(0.4, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0.8)');
      orbGrad.addColorStop(1, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0.2)');

      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(SpectrumCircleVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
