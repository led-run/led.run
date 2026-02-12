;(function(global) {
  'use strict';

  function hexToRgb(hex) {
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return { r: r, g: g, b: b };
  }

  var CircleVisualizer = {
    id: 'circle',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      radius: 0.3
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;

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
      var radiusFraction = parseFloat(cfg.radius) || self.defaults.radius;
      var ctx = self._ctx;

      if (radiusFraction < 0.1) radiusFraction = 0.1;
      if (radiusFraction > 0.5) radiusFraction = 0.5;

      var centerX = w / 2;
      var centerY = h / 2;
      var minDim = Math.min(w, h);
      var baseRadius = minDim * radiusFraction;
      var maxBarLength = (minDim / 2) - baseRadius;
      if (maxBarLength < 10) maxBarLength = 10;

      // Clear with background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      // Lighter color for bar tips
      var lightR = Math.min(255, barColor.r + Math.round((255 - barColor.r) * 0.5));
      var lightG = Math.min(255, barColor.g + Math.round((255 - barColor.g) * 0.5));
      var lightB = Math.min(255, barColor.b + Math.round((255 - barColor.b) * 0.5));
      var colorStr = 'rgb(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ')';

      if (!freqData || freqData.length === 0) {
        // Idle state: draw base circle with subtle glow
        ctx.shadowColor = colorStr;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        self._animFrameId = requestAnimationFrame(function() { self._draw(); });
        return;
      }

      var binCount = freqData.length;
      var barCount = Math.min(binCount, 360);
      var binsPerBar = Math.floor(binCount / barCount);
      if (binsPerBar < 1) binsPerBar = 1;

      var angleStep = (Math.PI * 2) / barCount;
      var sensitivityScale = sensitivity / 5;
      var barLineWidth = Math.max(1, (Math.PI * 2 * baseRadius) / barCount * 0.6);

      // Calculate average amplitude for inner pulse
      var totalSum = 0;
      for (var i = 0; i < freqData.length; i++) {
        totalSum += freqData[i];
      }
      var avgAmplitude = (totalSum / freqData.length / 255) * sensitivityScale;
      if (avgAmplitude > 1) avgAmplitude = 1;

      // Inner pulse fill: radial gradient modulated by amplitude
      var pulseAlpha = avgAmplitude * 0.3;
      if (pulseAlpha > 0.01) {
        var innerGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
        innerGrad.addColorStop(0, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + pulseAlpha.toFixed(3) + ')');
        innerGrad.addColorStop(0.7, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',' + (pulseAlpha * 0.3).toFixed(3) + ')');
        innerGrad.addColorStop(1, 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw frequency bars with glow and gradient
      ctx.shadowColor = colorStr;
      ctx.shadowBlur = 8;
      ctx.lineWidth = barLineWidth;

      for (var i = 0; i < barCount; i++) {
        var sum = 0;
        var start = i * binsPerBar;
        var end = Math.min(start + binsPerBar, binCount);
        for (var j = start; j < end; j++) {
          sum += freqData[j];
        }
        var avg = sum / (end - start);

        var normalized = (avg / 255) * sensitivityScale;
        if (normalized > 1) normalized = 1;

        var barLength = normalized * maxBarLength;
        if (barLength < 1) barLength = 1;

        var angle = i * angleStep - Math.PI / 2;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);

        var x1 = centerX + cos * baseRadius;
        var y1 = centerY + sin * baseRadius;
        var x2 = centerX + cos * (baseRadius + barLength);
        var y2 = centerY + sin * (baseRadius + barLength);

        // Gradient from base color to lighter at tip
        var grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, colorStr);
        grad.addColorStop(1, 'rgb(' + lightR + ',' + lightG + ',' + lightB + ')');

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Draw base circle outline
      ctx.strokeStyle = 'rgba(' + barColor.r + ',' + barColor.g + ',' + barColor.b + ',0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(CircleVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
