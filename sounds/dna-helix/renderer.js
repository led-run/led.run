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

  var DNAHelixVisualizer = {
    id: 'dna-helix',

    defaults: {
      color: '00ff41',
      bg: '000000',
      sensitivity: 5,
      rotationSpeed: 5
    },

    _canvas: null,
    _ctx: null,
    _container: null,
    _audioEngine: null,
    _animFrameId: null,
    _config: null,
    _phase: 0,
    _lastTime: 0,

    init: function(container, config, audioEngine) {
      this._container = container;
      this._config = config;
      this._audioEngine = audioEngine;
      this._phase = 0;
      this._lastTime = performance.now();

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
      var ctx = self._ctx;
      var cfg = self._config;
      var bgColor = hexToRgb(cfg.bg || self.defaults.bg);
      var baseColor = hexToRgb(cfg.color || self.defaults.color);
      var sensitivity = parseFloat(cfg.sensitivity) || self.defaults.sensitivity;
      var rotationSpeed = parseFloat(cfg.rotationSpeed) || self.defaults.rotationSpeed;

      var baseHsl = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
      var hue1 = baseHsl[0];
      var hue2 = (hue1 + 120) % 360;
      var sat = Math.round(baseHsl[1] * 100);
      var lit = Math.round(baseHsl[2] * 100);

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
      var baseRotSpeed = rotationSpeed / 5; // normalized (1 = normal)
      var audioSpeedBoost = isRunning ? scaledAmplitude * 2 : 0;
      var currentRotSpeed = baseRotSpeed * (0.5 + audioSpeedBoost);
      if (!isRunning) currentRotSpeed = baseRotSpeed * 0.3;

      self._phase += currentRotSpeed * dt * Math.PI * 2;

      // Helix amplitude modulated by audio
      var baseAmplitude = Math.min(w, h) * 0.12;
      var audioAmplitude = isRunning ? scaledAmplitude * Math.min(w, h) * 0.15 : 0;
      var helixAmplitude = baseAmplitude + audioAmplitude;

      // Clear background
      ctx.fillStyle = 'rgb(' + bgColor.r + ',' + bgColor.g + ',' + bgColor.b + ')';
      ctx.fillRect(0, 0, w, h);

      var cx = w / 2;
      var nodeCount = 40;
      var verticalSpacing = h / (nodeCount - 1);

      // Collect all drawable elements for depth sorting
      var elements = [];

      for (var i = 0; i < nodeCount; i++) {
        var y = i * verticalSpacing;
        var angle = self._phase + (i / nodeCount) * Math.PI * 4;

        // 3D helix: x offset from sine, z-depth from cosine
        var sinVal = Math.sin(angle);
        var cosVal = Math.cos(angle);

        // Strand 1
        var x1 = cx + sinVal * helixAmplitude;
        var z1 = cosVal; // -1 to 1

        // Strand 2 (opposite phase)
        var x2 = cx - sinVal * helixAmplitude;
        var z2 = -cosVal;

        // Depth factor: 0 (far back) to 1 (front)
        var depth1 = (z1 + 1) / 2;
        var depth2 = (z2 + 1) / 2;

        // Node sizes based on depth (3D perspective)
        var minSize = 2;
        var maxSize = 6;
        var size1 = minSize + depth1 * (maxSize - minSize);
        var size2 = minSize + depth2 * (maxSize - minSize);

        // Brightness based on depth
        var bright1 = 0.3 + depth1 * 0.7;
        var bright2 = 0.3 + depth2 * 0.7;

        if (!isRunning) {
          bright1 *= 0.35;
          bright2 *= 0.35;
        }

        // Store elements with depth for sorting
        // Base pair line (drawn behind both nodes if both visible)
        elements.push({
          type: 'pair',
          x1: x1, y1: y, x2: x2, y2: y,
          depth: Math.min(depth1, depth2),
          alpha: Math.min(bright1, bright2) * 0.4
        });

        elements.push({
          type: 'node',
          x: x1, y: y,
          size: size1,
          depth: depth1,
          brightness: bright1,
          hue: hue1,
          strand: 1
        });

        elements.push({
          type: 'node',
          x: x2, y: y,
          size: size2,
          depth: depth2,
          brightness: bright2,
          hue: hue2,
          strand: 2
        });
      }

      // Sort by depth: back elements first
      elements.sort(function(a, b) { return a.depth - b.depth; });

      // Draw all elements
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];

        if (el.type === 'pair') {
          if (el.alpha < 0.02) continue;
          ctx.strokeStyle = 'rgba(' + baseColor.r + ',' + baseColor.g + ',' + baseColor.b + ',' + el.alpha.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(el.x1, el.y1);
          ctx.lineTo(el.x2, el.y2);
          ctx.stroke();
        } else {
          // Node (sphere)
          var litAdjusted = Math.min(90, lit + Math.round(el.brightness * 30));
          var alpha = el.brightness;

          ctx.shadowColor = 'hsla(' + Math.round(el.hue) + ',' + sat + '%,' + litAdjusted + '%,' + (alpha * 0.6).toFixed(3) + ')';
          ctx.shadowBlur = el.size * 1.5;

          ctx.fillStyle = 'hsla(' + Math.round(el.hue) + ',' + sat + '%,' + litAdjusted + '%,' + alpha.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(el.x, el.y, el.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;

      self._animFrameId = requestAnimationFrame(function() { self._draw(); });
    }
  };

  if (global.SoundManager) {
    global.SoundManager.register(DNAHelixVisualizer);
  }
})(typeof window !== 'undefined' ? window : this);
