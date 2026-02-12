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
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
      h *= 360;
    }
    return [h, s, l];
  }

  var GalaxyVisualizer = {
    id: 'galaxy',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      arms: 4
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _stars: null,
    _rotation: 0,
    _lastTime: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._rotation = 0;
      this._lastTime = performance.now();

      var arms = parseInt(config.arms, 10) || this.defaults.arms;
      if (arms < 2) arms = 2;
      if (arms > 6) arms = 6;

      this._generateStars(container.clientWidth, container.clientHeight, arms, config);

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
      this._stars = null;
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

    _generateStars: function(w, h, arms, config) {
      var baseColor = hexToRgb(config.color || this.defaults.color);
      var baseHsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);

      var totalStars = 800;
      this._stars = [];

      var maxRadius = Math.min(w, h) * 0.45;
      var armOffset = (Math.PI * 2) / arms;

      // Logarithmic spiral parameters
      var a = 0.02;  // initial radius factor
      var b = 0.18;  // growth rate

      for (var i = 0; i < totalStars; i++) {
        var armIndex = Math.floor(Math.random() * arms);
        var t = Math.random(); // 0 to 1 along the spiral

        // Logarithmic spiral: r = a * e^(b * theta)
        var theta = t * Math.PI * 3; // 3 full winds
        var r = a * Math.exp(b * theta) * maxRadius * 0.6;

        // Add scatter/spread perpendicular to spiral
        var scatter = (Math.random() - 0.5) * r * 0.35;
        r += scatter;

        // Base angle for this arm
        var angle = theta + armIndex * armOffset;

        // Convert polar to Cartesian (stored relative to center)
        var x = Math.cos(angle) * r;
        var y = Math.sin(angle) * r;

        // Star properties
        var distRatio = r / maxRadius;

        // Size: most stars small, few large; center stars slightly larger
        var sizeRand = Math.random();
        var size;
        if (sizeRand > 0.98) size = 2.5 + Math.random() * 1.5; // rare large stars
        else if (sizeRand > 0.9) size = 1.5 + Math.random() * 1;
        else size = 0.5 + Math.random() * 1;

        // Slight hue variation per star
        var hueShift = (Math.random() - 0.5) * 40;
        var hue = (baseHsl[0] + hueShift + 360) % 360;

        // Stars closer to center are brighter
        var baseBrightness = 0.3 + (1 - distRatio) * 0.5;

        // Twinkle phase (random offset)
        var twinklePhase = Math.random() * Math.PI * 2;
        var twinkleSpeed = 1 + Math.random() * 3;

        this._stars.push({
          x: x,
          y: y,
          size: size,
          hue: hue,
          baseBrightness: baseBrightness,
          twinklePhase: twinklePhase,
          twinkleSpeed: twinkleSpeed,
          distRatio: distRatio
        });
      }

      // Add some core stars (dense bright center)
      for (var i = 0; i < 100; i++) {
        var angle = Math.random() * Math.PI * 2;
        var r = Math.random() * maxRadius * 0.08;
        var hueShift = (Math.random() - 0.5) * 20;

        this._stars.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
          size: 0.5 + Math.random() * 1.5,
          hue: (baseHsl[0] + hueShift + 360) % 360,
          baseBrightness: 0.6 + Math.random() * 0.4,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 2 + Math.random() * 4,
          distRatio: r / maxRadius
        });
      }
    },

    _draw: function() {
      var self = this;
      if (!self._ctx || !self._canvas || !self._stars) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var baseColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var baseHsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);

      var now = performance.now();
      var dt = (now - self._lastTime) / 1000;
      self._lastTime = now;
      if (dt > 0.1) dt = 0.1;

      var isRunning = self._audioEngine && self._audioEngine.isRunning();
      var freqData = isRunning ? self._audioEngine.getFrequencyData() : null;

      // Compute average amplitude
      var avgAmplitude = 0;
      if (freqData && freqData.length > 0) {
        var sum = 0;
        for (var i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        avgAmplitude = sum / freqData.length / 255;
      }

      var sensitivityScale = sensitivity / 5;
      var scaledAmplitude = avgAmplitude * sensitivityScale;
      if (scaledAmplitude > 1) scaledAmplitude = 1;

      // Rotation speed modulated by audio
      var baseRotSpeed = 0.05; // radians per second (idle)
      var audioRotBoost = isRunning ? scaledAmplitude * 0.4 : 0;
      var currentRotSpeed = baseRotSpeed + audioRotBoost;

      self._rotation += currentRotSpeed * dt;

      // Overall brightness modulated by audio
      var brightnessBoost = isRunning ? 0.5 + scaledAmplitude * 0.5 : 0.3;

      // Clear background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var cx = w / 2;
      var cy = h / 2;
      var time = now / 1000;

      // Draw central core glow
      var coreRadius = Math.min(w, h) * 0.04;
      var coreAlpha = 0.15 + (isRunning ? scaledAmplitude * 0.25 : 0);
      var coreSat = Math.round(baseHsl[1] * 100);
      var coreLit = Math.min(90, Math.round(baseHsl[2] * 100) + 30);

      var coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 4);
      coreGrad.addColorStop(0, 'hsla(' + Math.round(baseHsl[0]) + ',' + coreSat + '%,' + coreLit + '%,' + coreAlpha.toFixed(3) + ')');
      coreGrad.addColorStop(0.3, 'hsla(' + Math.round(baseHsl[0]) + ',' + coreSat + '%,' + coreLit + '%,' + (coreAlpha * 0.3).toFixed(3) + ')');
      coreGrad.addColorStop(1, 'hsla(' + Math.round(baseHsl[0]) + ',' + coreSat + '%,' + coreLit + '%, 0)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw stars
      var stars = self._stars;
      var cosR = Math.cos(self._rotation);
      var sinR = Math.sin(self._rotation);

      for (var i = 0; i < stars.length; i++) {
        var star = stars[i];

        // Rotate star position
        var rx = star.x * cosR - star.y * sinR;
        var ry = star.x * sinR + star.y * cosR;

        var screenX = cx + rx;
        var screenY = cy + ry;

        // Skip if off screen
        if (screenX < -10 || screenX > w + 10 || screenY < -10 || screenY > h + 10) continue;

        // Twinkle effect: modulated by audio
        var twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        var twinkleRange = isRunning ? 0.2 + scaledAmplitude * 0.4 : 0.15;
        var twinkleVal = 0.5 + twinkle * twinkleRange;

        var brightness = star.baseBrightness * brightnessBoost * twinkleVal;
        if (brightness > 1) brightness = 1;
        if (brightness < 0.02) continue;

        var sat = Math.round(baseHsl[1] * 100);
        var lit = Math.min(90, Math.round(baseHsl[2] * 100) + Math.round(brightness * 30));
        var drawSize = star.size * (0.8 + brightness * 0.4);

        // Glow for larger/brighter stars
        if (star.size > 1.5 && brightness > 0.4) {
          ctx.shadowColor = 'hsla(' + Math.round(star.hue) + ',' + sat + '%,' + lit + '%,' + (brightness * 0.6).toFixed(3) + ')';
          ctx.shadowBlur = drawSize * 4;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = 'hsla(' + Math.round(star.hue) + ',' + sat + '%,' + lit + '%,' + brightness.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(screenX, screenY, drawSize, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;

      // Draw bright core point
      var corePointAlpha = 0.6 + (isRunning ? scaledAmplitude * 0.4 : 0);
      ctx.shadowColor = 'hsla(' + Math.round(baseHsl[0]) + ',' + coreSat + '%,' + coreLit + '%,' + (corePointAlpha * 0.8).toFixed(3) + ')';
      ctx.shadowBlur = 15 + (isRunning ? scaledAmplitude * 15 : 0);
      ctx.fillStyle = 'hsla(' + Math.round(baseHsl[0]) + ',' + coreSat + '%,' + coreLit + '%,' + corePointAlpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(GalaxyVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
