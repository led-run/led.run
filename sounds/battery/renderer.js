;(function(global) {
  'use strict';

  // --- Color helpers ---

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
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
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

  // --- Sonar Pulse System ---

  var BatteryVisualizer = {
    id: 'battery',

    defaults: {
      color: '00ff41',
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
    _avgVolume: 0,
    _bassVolume: 0,
    _scanAngle: 0,
    _startTime: 0,
    _lastFrameTime: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._pulses = [];
      this._lastPulseTime = 0;
      this._avgVolume = 0;
      this._bassVolume = 0;
      this._scanAngle = 0;
      this._startTime = performance.now();
      this._lastFrameTime = this._startTime;

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

      var now = performance.now();
      var dt = (now - self._lastFrameTime) / 1000;
      self._lastFrameTime = now;
      // Clamp dt to avoid jumps from tab switches
      if (dt > 0.1) dt = 0.016;
      var elapsed = (now - self._startTime) / 1000;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var baseColor = hexToRgb(cfg.color || self.defaults.color);
      var baseHsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var pulseSpeed = parseFloat(cfg.pulseSpeed) || self.defaults.pulseSpeed;
      var ctx = self._ctx;

      var centerX = w / 2;
      var centerY = h / 2;
      var maxRadius = Math.min(w, h) * 0.45;

      // --- Audio analysis ---
      var freqData = null;
      var isRunning = self._audioEngine && self._audioEngine.isRunning();

      if (isRunning) {
        freqData = self._audioEngine.getFrequencyData();
      }

      var volume = 0;
      var bassVol = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        volume = sum / freqData.length / 255;

        // Bass: first ~15% of bins
        var bassEnd = Math.floor(freqData.length * 0.15);
        var bassSum = 0;
        for (var i = 0; i < bassEnd; i++) {
          bassSum += freqData[i];
        }
        bassVol = bassSum / bassEnd / 255;
      } else {
        volume = 0.03;
        bassVol = 0.03;
      }

      // Smooth volumes
      self._avgVolume = self._avgVolume * 0.82 + volume * 0.18;
      self._bassVolume = self._bassVolume * 0.80 + bassVol * 0.20;

      var normalizedVol = self._avgVolume * (sensitivity / 5);
      if (normalizedVol > 1) normalizedVol = 1;

      var normalizedBass = self._bassVolume * (sensitivity / 5);
      if (normalizedBass > 1) normalizedBass = 1;

      // --- Clear ---
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      // --- Use screen blending for interference glow ---
      ctx.globalCompositeOperation = 'screen';

      // --- Concentric reference rings ---
      var refRingCount = 4;
      for (var ri = 1; ri <= refRingCount; ri++) {
        var refRadius = (ri / refRingCount) * maxRadius;
        ctx.strokeStyle = 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, refRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- Trigger new pulse ---
      var pulseInterval = 1200 / pulseSpeed;
      var threshold = 0.12;

      if (normalizedVol > threshold && (now - self._lastPulseTime) > pulseInterval) {
        self._pulses.push({
          birthTime: now,
          maxLife: 2.5,
          hue: baseHsl.h,
          saturation: baseHsl.s,
          lightness: baseHsl.l,
          intensity: normalizedVol
        });
        self._lastPulseTime = now;
      }

      // --- Update and draw pulse rings ---
      for (var i = self._pulses.length - 1; i >= 0; i--) {
        var pulse = self._pulses[i];
        var age = (now - pulse.birthTime) / 1000;

        if (age >= pulse.maxLife) {
          self._pulses.splice(i, 1);
          continue;
        }

        var progress = age / pulse.maxLife;
        var radius = progress * maxRadius;

        // Hue shift over lifetime (90 degrees)
        var currentHue = (pulse.hue + progress * 90) % 360;
        var rgb = hslToRgb(currentHue, pulse.saturation, Math.min(pulse.lightness + 0.1, 0.6));

        // Opacity: fade in quickly, then fade out
        var fadeIn = Math.min(progress * 10, 1);
        var fadeOut = 1 - progress;
        var opacity = fadeIn * fadeOut * pulse.intensity * 0.7;

        // Ring lineWidth: thick at birth (6px), thin at maxRadius (1px)
        var ringWidth = 6 - progress * 5;
        if (ringWidth < 1) ringWidth = 1;

        // Radial gradient fill: inner bright -> outer transparent
        var gradInner = Math.max(0, radius - ringWidth * 4);
        var gradOuter = radius + ringWidth * 4;
        if (gradOuter > 0) {
          var grad = ctx.createRadialGradient(centerX, centerY, gradInner, centerX, centerY, gradOuter);
          grad.addColorStop(0, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');
          // Peak brightness at the ring radius
          var peakStop = (radius - gradInner) / (gradOuter - gradInner);
          if (peakStop < 0) peakStop = 0;
          if (peakStop > 1) peakStop = 1;
          grad.addColorStop(peakStop, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (opacity * 0.4) + ')');
          grad.addColorStop(1, 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, gradOuter, 0, Math.PI * 2);
          ctx.fill();
        }

        // Stroke ring on top
        ctx.strokeStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + opacity + ')';
        ctx.lineWidth = ringWidth;

        // Subtle glow for the ring
        ctx.shadowColor = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + (opacity * 0.8) + ')';
        ctx.shadowBlur = 10 * fadeOut;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
      }

      // --- Radar scan line ---
      var scanSpeed = 0.6; // radians per second
      self._scanAngle += scanSpeed * dt;
      if (self._scanAngle > Math.PI * 2) self._scanAngle -= Math.PI * 2;

      var sweepAngle = Math.PI / 6; // ~30 degrees
      var scanGrad = ctx.createConicGradient(self._scanAngle - sweepAngle, centerX, centerY);

      // Normalize angle position in the conic gradient (0 to 1 range maps to 0 to 2*PI)
      // The sweep is a small bright arc that fades
      var sweepFraction = sweepAngle / (Math.PI * 2);
      var scanOpacity = 0.08 + normalizedVol * 0.07;

      scanGrad.addColorStop(0, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0)');
      scanGrad.addColorStop(1 - sweepFraction, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0)');
      scanGrad.addColorStop(1 - sweepFraction * 0.5, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',' + scanOpacity + ')');
      scanGrad.addColorStop(1, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0)');

      ctx.fillStyle = scanGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.fill();

      // Scan leading edge line
      var edgeX = centerX + Math.cos(self._scanAngle) * maxRadius;
      var edgeY = centerY + Math.sin(self._scanAngle) * maxRadius;
      ctx.strokeStyle = 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',' + (scanOpacity * 1.5) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(edgeX, edgeY);
      ctx.stroke();

      // --- Center core orb ---
      // Multi-layer radial gradient, pulsing with bass
      var coreBaseRadius = maxRadius * 0.06;
      var corePulse = coreBaseRadius + normalizedBass * maxRadius * 0.06;
      // Breathing in idle
      var breathe = Math.sin(elapsed * 1.5) * 0.3 + 0.7;
      if (!isRunning || normalizedVol < 0.05) {
        corePulse = coreBaseRadius * (0.8 + breathe * 0.4);
      }

      // Outer glow layer
      var outerGlowRadius = corePulse * 4;
      var outerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, outerGlowRadius);
      outerGlow.addColorStop(0, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',' + (0.15 + normalizedBass * 0.15) + ')');
      outerGlow.addColorStop(0.4, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',' + (0.05 + normalizedBass * 0.05) + ')');
      outerGlow.addColorStop(1, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0)');

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Mid layer: colored core
      var midGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, corePulse * 2);
      var brightRgb = hslToRgb(baseHsl.h, baseHsl.s, Math.min(baseHsl.l + 0.2, 0.7));
      midGlow.addColorStop(0, 'rgba(255,255,255,' + (0.6 + normalizedBass * 0.3) + ')');
      midGlow.addColorStop(0.3, 'rgba(' + brightRgb.r + ',' + brightRgb.g + ',' + brightRgb.b + ',' + (0.5 + normalizedBass * 0.3) + ')');
      midGlow.addColorStop(0.7, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',' + (0.2 + normalizedBass * 0.1) + ')');
      midGlow.addColorStop(1, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0)');

      ctx.fillStyle = midGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, corePulse * 2, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core with shadow glow
      ctx.shadowColor = 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0.9)';
      ctx.shadowBlur = 20 + normalizedBass * 15;

      var innerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, corePulse);
      innerGlow.addColorStop(0, 'rgba(255,255,255,' + (0.9 + normalizedBass * 0.1) + ')');
      innerGlow.addColorStop(0.5, 'rgba(' + brightRgb.r + ',' + brightRgb.g + ',' + brightRgb.b + ',0.7)');
      innerGlow.addColorStop(1, 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',0.3)');

      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, corePulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // --- Reset composite operation ---
      ctx.globalCompositeOperation = 'source-over';

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(BatteryVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
