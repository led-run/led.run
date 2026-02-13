;(function(global) {
  'use strict';

  var LavaLamp = {
    id: 'lava-lamp',
    defaults: { color: 'ff4500', bg: '1a0a2e', speed: 3, blobCount: 10, viscosity: 5 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _offCanvas: null,
    _offCtx: null,
    _offW: 0,
    _offH: 0,
    _blobs: null,
    _blobColor: null,
    _bgColor: null,
    _speed: 3,
    _blobCount: 10,
    _viscosity: 5,
    _lastTime: 0,

    init: function(container, config) {
      this._container = container;
      this._lastTime = performance.now();

      var colorStr = config.color || this.defaults.color;
      this._blobColor = [
        parseInt(colorStr.substring(0, 2), 16),
        parseInt(colorStr.substring(2, 4), 16),
        parseInt(colorStr.substring(4, 6), 16)
      ];

      var bgStr = config.bg || this.defaults.bg;
      this._bgColor = [
        parseInt(bgStr.substring(0, 2), 16),
        parseInt(bgStr.substring(2, 4), 16),
        parseInt(bgStr.substring(4, 6), 16)
      ];

      this._speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      this._speed = Math.max(1, Math.min(10, this._speed));

      this._blobCount = config.blobCount != null ? Number(config.blobCount) : this.defaults.blobCount;
      this._blobCount = Math.max(5, Math.min(20, Math.round(this._blobCount)));

      this._viscosity = config.viscosity != null ? Number(config.viscosity) : this.defaults.viscosity;
      this._viscosity = Math.max(1, Math.min(10, this._viscosity));

      // Initialize blobs with normalized coordinates (0-1)
      this._blobs = [];
      for (var i = 0; i < this._blobCount; i++) {
        this._blobs.push({
          x: 0.2 + Math.random() * 0.6,   // normalized x
          y: Math.random(),                 // normalized y
          vx: (Math.random() - 0.5) * 0.002,
          vy: -0.001 - Math.random() * 0.003, // upward bias
          radius: 0.03 + Math.random() * 0.05  // normalized radius
        });
      }

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      // Offscreen buffer at 1/4 resolution
      this._offCanvas = document.createElement('canvas');
      this._offCtx = this._offCanvas.getContext('2d');

      this._resizeHandler();
      this._boundResize = this._resizeHandler.bind(this);
      window.addEventListener('resize', this._boundResize);

      this._animate();
    },

    _resizeHandler: function() {
      if (!this._container || !this._canvas) return;
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      var dpr = window.devicePixelRatio || 1;
      this._canvas.width = w * dpr;
      this._canvas.height = h * dpr;
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Update offscreen buffer (1/4 resolution, no DPR scaling)
      this._offW = Math.max(1, Math.floor(w / 4));
      this._offH = Math.max(1, Math.floor(h / 4));
      this._offCanvas.width = this._offW;
      this._offCanvas.height = this._offH;
    },

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var offCtx = self._offCtx;
      var offW = self._offW;
      var offH = self._offH;
      var now = performance.now();
      var dt = Math.min((now - self._lastTime) / 16.67, 3);
      self._lastTime = now;

      var blobs = self._blobs;
      var speedFactor = self._speed / 5 * dt;
      var threshold = 0.5 + self._viscosity * 0.1; // 0.6 - 1.5

      var blobR = self._blobColor[0];
      var blobG = self._blobColor[1];
      var blobB = self._blobColor[2];
      var bgR = self._bgColor[0];
      var bgG = self._bgColor[1];
      var bgB = self._bgColor[2];

      // Update blob positions (normalized coords)
      for (var i = 0; i < blobs.length; i++) {
        var blob = blobs[i];

        // Add slight oscillation
        blob.vx += (Math.random() - 0.5) * 0.0003 * speedFactor;
        blob.vy += (Math.random() - 0.5) * 0.0002 * speedFactor;

        // Upward bias (lava lamp effect)
        blob.vy -= 0.00005 * speedFactor;

        // Damping
        blob.vx *= 0.999;
        blob.vy *= 0.999;

        // Speed limit
        var maxV = 0.005 * (self._speed / 5);
        blob.vx = Math.max(-maxV, Math.min(maxV, blob.vx));
        blob.vy = Math.max(-maxV, Math.min(maxV, blob.vy));

        blob.x += blob.vx * speedFactor;
        blob.y += blob.vy * speedFactor;

        // Bounce off horizontal edges (with padding for radius)
        if (blob.x < blob.radius) {
          blob.x = blob.radius;
          blob.vx = Math.abs(blob.vx) * 0.8;
        } else if (blob.x > 1 - blob.radius) {
          blob.x = 1 - blob.radius;
          blob.vx = -Math.abs(blob.vx) * 0.8;
        }

        // Wrap vertically (lava lamp: rise to top, reappear at bottom)
        if (blob.y < -blob.radius * 2) {
          blob.y = 1 + blob.radius;
          blob.vy = -0.001 - Math.random() * 0.002;
        } else if (blob.y > 1 + blob.radius * 2) {
          blob.y = -blob.radius;
          blob.vy = -0.001 - Math.random() * 0.002;
        }
      }

      // Render metaballs on offscreen buffer
      var imageData = offCtx.createImageData(offW, offH);
      var data = imageData.data;

      for (var py = 0; py < offH; py++) {
        for (var px = 0; px < offW; px++) {
          // Normalized coordinates
          var nx = px / offW;
          var ny = py / offH;

          // Sum metaball field
          var sum = 0;
          for (var b = 0; b < blobs.length; b++) {
            var bl = blobs[b];
            var dx = nx - bl.x;
            var dy = ny - bl.y;
            var distSq = dx * dx + dy * dy;
            if (distSq < 0.0001) distSq = 0.0001; // prevent division by zero
            sum += (bl.radius * bl.radius) / distSq;
          }

          var idx = (py * offW + px) * 4;

          if (sum > threshold) {
            // Inside metaball: blob color with intensity variation
            var intensity = Math.min(1, (sum - threshold) / (threshold * 2));
            // Brighter at higher field values (core of blob)
            var br = Math.min(255, blobR + Math.round(intensity * 80));
            var bg2 = Math.min(255, blobG + Math.round(intensity * 40));
            var bb = Math.min(255, blobB + Math.round(intensity * 20));
            data[idx] = br;
            data[idx + 1] = bg2;
            data[idx + 2] = bb;
          } else {
            // Background with subtle glow near blobs
            var glow = sum / threshold;
            var glowFactor = glow * glow * 0.3; // quadratic falloff
            data[idx] = Math.min(255, bgR + Math.round((blobR - bgR) * glowFactor));
            data[idx + 1] = Math.min(255, bgG + Math.round((blobG - bgG) * glowFactor));
            data[idx + 2] = Math.min(255, bgB + Math.round((blobB - bgB) * glowFactor));
          }
          data[idx + 3] = 255;
        }
      }

      offCtx.putImageData(imageData, 0, 0);

      // Scale up: draw small buffer onto main canvas
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(self._offCanvas, 0, 0, w, h);

      self._rafId = requestAnimationFrame(function() { self._animate(); });
    },

    destroy: function() {
      if (this._rafId != null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
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
      this._offCanvas = null;
      this._offCtx = null;
      this._blobs = null;
      this._blobColor = null;
      this._bgColor = null;
    }
  };

  global.LightManager.register(LavaLamp);
})(typeof window !== 'undefined' ? window : this);
