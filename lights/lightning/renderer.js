;(function(global) {
  'use strict';

  var Lightning = {
    id: 'lightning',
    defaults: { color: 'aaddff', bg: '0a0a2e', frequency: 5, branches: 5 },

    _container: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _boundResize: null,
    _color: null,
    _bgColor: null,
    _frequency: 5,
    _branches: 5,
    _bolts: null,
    _flashAlpha: 0,
    _lastStrike: 0,
    _nextStrikeDelay: 0,
    _startTime: 0,

    init: function(container, config) {
      this._container = container;
      this._bolts = [];
      this._startTime = performance.now();

      var colorStr = config.color || this.defaults.color;
      this._color = [
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

      this._frequency = config.frequency != null ? Number(config.frequency) : this.defaults.frequency;
      this._frequency = Math.max(1, Math.min(10, this._frequency));

      this._branches = config.branches != null ? Number(config.branches) : this.defaults.branches;
      this._branches = Math.max(1, Math.min(10, this._branches));

      this._flashAlpha = 0;
      this._lastStrike = 0;
      this._nextStrikeDelay = this._calcNextDelay();

      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.width = '100%';
      this._canvas.style.height = '100%';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

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
    },

    _calcNextDelay: function() {
      // frequency 1-10 maps to strikes per second, capped at 3Hz
      var strikesPerSec = Math.min(3, this._frequency * 0.3);
      var baseDelay = 1000 / strikesPerSec;
      // Add randomness: 50% to 150% of base delay
      return baseDelay * (0.5 + Math.random());
    },

    _generateBolt: function(x1, y1, x2, y2, depth) {
      var segments = [];
      this._buildBoltSegments(segments, x1, y1, x2, y2, depth, 1.0);
      return segments;
    },

    _buildBoltSegments: function(segments, x1, y1, x2, y2, depth, alpha) {
      if (depth <= 0) {
        segments.push({ x1: x1, y1: y1, x2: x2, y2: y2, alpha: alpha });
        return;
      }

      var midX = (x1 + x2) / 2;
      var midY = (y1 + y2) / 2;
      var dx = x2 - x1;
      var dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy);

      // Offset perpendicular to the segment direction
      var offset = (Math.random() - 0.5) * len * 0.3;
      var nx = -dy / len;
      midX += nx * offset;
      midY += (dx / len) * offset;

      this._buildBoltSegments(segments, x1, y1, midX, midY, depth - 1, alpha);
      this._buildBoltSegments(segments, midX, midY, x2, y2, depth - 1, alpha);

      // Chance to branch based on branches param
      var branchChance = this._branches / 30;
      if (depth > 1 && Math.random() < branchChance) {
        var branchAngle = (Math.random() - 0.5) * Math.PI * 0.5;
        var branchLen = len * (0.3 + Math.random() * 0.3);
        var bx = midX + Math.cos(Math.atan2(dy, dx) + branchAngle) * branchLen;
        var by = midY + Math.sin(Math.atan2(dy, dx) + branchAngle) * branchLen;
        this._buildBoltSegments(segments, midX, midY, bx, by, depth - 2, alpha * 0.6);
      }
    },

    _animate: function() {
      var self = this;
      if (!self._ctx || !self._canvas) return;

      var w = self._container.clientWidth;
      var h = self._container.clientHeight;
      var ctx = self._ctx;
      var now = performance.now();
      var c = self._color;
      var bg = self._bgColor;

      // Background
      ctx.fillStyle = 'rgb(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ')';
      ctx.fillRect(0, 0, w, h);

      // Check if time for a new strike
      if (now - self._lastStrike > self._nextStrikeDelay) {
        self._lastStrike = now;
        self._nextStrikeDelay = self._calcNextDelay();
        self._flashAlpha = 0.3;

        // Generate 1-2 main bolts
        var boltCount = 1 + (Math.random() < 0.3 ? 1 : 0);
        self._bolts = [];
        for (var b = 0; b < boltCount; b++) {
          var startX = w * (0.2 + Math.random() * 0.6);
          var endX = startX + (Math.random() - 0.5) * w * 0.4;
          var recursionDepth = 3 + Math.floor(self._branches / 3);
          var bolt = self._generateBolt(startX, 0, endX, h, recursionDepth);
          self._bolts.push({ segments: bolt, birth: now, lifetime: 150 + Math.random() * 100 });
        }
      }

      // Flash overlay (fades quickly)
      if (self._flashAlpha > 0.005) {
        ctx.fillStyle = 'rgba(255,255,255,' + self._flashAlpha.toFixed(3) + ')';
        ctx.fillRect(0, 0, w, h);
        self._flashAlpha *= 0.88; // Fast fade
      } else {
        self._flashAlpha = 0;
      }

      // Subtle ambient glow
      var ambGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.3, Math.max(w, h) * 0.6);
      ambGrad.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.02)');
      ambGrad.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
      ctx.fillStyle = ambGrad;
      ctx.fillRect(0, 0, w, h);

      // Draw active bolts
      if (self._bolts) {
        for (var i = self._bolts.length - 1; i >= 0; i--) {
          var bolt = self._bolts[i];
          var age = now - bolt.birth;
          if (age > bolt.lifetime) {
            self._bolts.splice(i, 1);
            continue;
          }

          var fadeRatio = 1 - age / bolt.lifetime;
          var segments = bolt.segments;

          for (var j = 0; j < segments.length; j++) {
            var seg = segments[j];
            var segAlpha = seg.alpha * fadeRatio;

            // Glow layer (wider, more transparent)
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (segAlpha * 0.3).toFixed(3) + ')';
            ctx.lineWidth = 6;
            ctx.stroke();

            // Core layer (bright, thin)
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
            ctx.strokeStyle = 'rgba(255,255,255,' + (segAlpha * 0.9).toFixed(3) + ')';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

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
      this._bolts = null;
      this._color = null;
      this._bgColor = null;
    }
  };

  global.LightManager.register(Lightning);
})(typeof window !== 'undefined' ? window : this);
