/**
 * Draw Theme: Sparkle Trail (Starlight Display)
 * Dark background with ambient background stars (always on),
 * glittering particle trails with vertical drift,
 * enhanced stroke glow, and end-of-stroke burst particles
 */
;(function() {
  'use strict';

  var theme = {
    id: 'sparkle',
    defaults: { color: 'ffd700', bg: '0a0014', size: 4, opacity: 1, smooth: 5, stars: 8, twinkle: 5 },
    _canvas: null,
    _ctx: null,
    _container: null,
    _config: null,
    _engine: null,
    _raf: null,
    _resizeHandler: null,
    _particles: [],
    _bgStars: [],
    _time: 0,

    init: function(container, config, drawEngine) {
      this._container = container;
      this._config = config;
      this._engine = drawEngine;
      this._particles = [];
      this._bgStars = [];
      this._time = 0;

      container.style.background = '#' + (config.bg || '0a0014');
      container.style.overflow = 'hidden';
      container.style.cursor = 'crosshair';

      var canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');

      this._resize();
      this._generateBgStars();
      this._generateParticles();
      this._startAnimation();

      var self = this;
      this._resizeHandler = function() { self._onResize(); };
      window.addEventListener('resize', this._resizeHandler);

      if (drawEngine) {
        drawEngine.onStroke = function() { self._generateParticles(); };
        drawEngine.onStrokeUpdate = function() { self._generateParticles(); };
      }
    },

    _onResize: function() {
      this._resize();
      this._generateBgStars();
      this._generateParticles();
    },

    _resize: function() {
      if (!this._canvas || !this._container) return;
      this._canvas.width = this._container.clientWidth;
      this._canvas.height = this._container.clientHeight;
    },

    _generateBgStars: function() {
      // 30 ambient background stars — visible even with empty canvas
      this._bgStars = [];
      for (var i = 0; i < 30; i++) {
        this._bgStars.push({
          x: Math.random(),
          y: Math.random(),
          size: Math.random() * 1.5 + 0.5,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.3 + 0.3
        });
      }
    },

    _generateParticles: function() {
      this._particles = [];
      if (!this._engine) return;

      var strokes = this._engine.getStrokes();
      var currentStroke = this._engine.getCurrentStroke();
      var allStrokes = currentStroke ? strokes.concat([currentStroke]) : strokes;
      var starsPerPoint = Math.max(1, Math.floor((parseFloat(this._config.stars) || 8) / 3));

      var color = this._config.color || 'ffd700';
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;

      for (var i = 0; i < allStrokes.length; i++) {
        var s = allStrokes[i];
        if (s.eraser) continue;
        var isLast = (i === allStrokes.length - 1);

        for (var j = 0; j < s.points.length; j += 2) {
          var p = s.points[j];
          for (var k = 0; k < starsPerPoint; k++) {
            this._particles.push({
              x: p.x + (Math.random() - 0.5) * 0.02,
              y: p.y + (Math.random() - 0.5) * 0.02,
              size: Math.random() * 3 + 1,
              speed: Math.random() * 0.5 + 0.5,
              phase: Math.random() * Math.PI * 2,
              drift: Math.random() * Math.PI * 2,
              color: color,
              opacity: opacity
            });
          }

          // End-of-stroke burst — larger particles at the last point
          if (isLast && j >= s.points.length - 2) {
            for (var b = 0; b < 3; b++) {
              this._particles.push({
                x: p.x + (Math.random() - 0.5) * 0.03,
                y: p.y + (Math.random() - 0.5) * 0.03,
                size: Math.random() * 3 + 3,
                speed: Math.random() * 0.8 + 1.0,
                phase: Math.random() * Math.PI * 2,
                drift: Math.random() * Math.PI * 2,
                color: color,
                opacity: opacity
              });
            }
          }
        }
      }
    },

    _startAnimation: function() {
      var self = this;
      function loop() {
        self._raf = requestAnimationFrame(loop);
        self._time += 0.02;
        self._render();
      }
      this._raf = requestAnimationFrame(loop);
    },

    _render: function() {
      var ctx = this._ctx;
      var cw = this._canvas.width;
      var ch = this._canvas.height;
      var time = this._time;
      ctx.clearRect(0, 0, cw, ch);

      // Background stars — always visible, gives "powered on" display feel
      for (var b = 0; b < this._bgStars.length; b++) {
        var bg = this._bgStars[b];
        var bgFlicker = 0.2 + 0.8 * Math.abs(Math.sin(time * bg.speed + bg.phase));
        // Gentle vertical drift
        var bgY = bg.y + Math.sin(time * 0.5 + bg.phase) * 0.005;
        ctx.save();
        ctx.globalAlpha = 0.4 * bgFlicker;
        ctx.fillStyle = 'rgba(200, 200, 255, 1)';
        ctx.shadowBlur = bg.size * 4;
        ctx.shadowColor = 'rgba(200, 200, 255, 0.6)';
        var bx = bg.x * cw;
        var by = bgY * ch;
        var bs = bg.size * bgFlicker;
        ctx.beginPath();
        ctx.arc(bx, by, bs, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw base strokes with enhanced glow
      if (this._engine) {
        var strokes = this._engine.getStrokes();
        var currentStroke = this._engine.getCurrentStroke();
        var allStrokes = currentStroke ? strokes.concat([currentStroke]) : strokes;
        for (var i = 0; i < allStrokes.length; i++) {
          this._drawStroke(ctx, allStrokes[i], cw, ch);
        }
      }

      // Draw sparkle particles with drift
      var twinkle = (parseFloat(this._config.twinkle) || 5) / 5;
      for (var j = 0; j < this._particles.length; j++) {
        var p = this._particles[j];
        var flicker = 0.3 + 0.7 * Math.abs(Math.sin(time * p.speed * twinkle + p.phase));
        // Gentle vertical sine drift — firefly-like
        var driftY = Math.sin(time * 0.5 + p.drift) * 0.005;

        ctx.save();
        ctx.globalAlpha = p.opacity * flicker;
        ctx.fillStyle = '#' + p.color;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = '#' + p.color;

        // Star shape
        var x = p.x * cw;
        var y = (p.y + driftY) * ch;
        var s = p.size * flicker;
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s * 0.3, y - s * 0.3);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x + s * 0.3, y + s * 0.3);
        ctx.lineTo(x, y + s);
        ctx.lineTo(x - s * 0.3, y + s * 0.3);
        ctx.lineTo(x - s, y);
        ctx.lineTo(x - s * 0.3, y - s * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    },

    _drawStroke: function(ctx, stroke, cw, ch) {
      if (stroke.points.length < 1 || stroke.eraser) return;

      var color = this._config.color || 'ffd700';
      var size = parseFloat(this._config.size) || 4;
      var opacity = parseFloat(this._config.opacity);
      if (isNaN(opacity)) opacity = 1;

      // Second layer: wide soft glow
      ctx.save();
      ctx.globalAlpha = opacity * 0.25;
      ctx.strokeStyle = '#' + color;
      ctx.lineWidth = size * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#' + color;

      ctx.beginPath();
      var p0 = stroke.points[0];
      ctx.moveTo(p0.x * cw, p0.y * ch);
      for (var i = 1; i < stroke.points.length; i++) {
        var p = stroke.points[i];
        ctx.lineTo(p.x * cw, p.y * ch);
      }
      ctx.stroke();
      ctx.restore();

      // Main stroke
      ctx.save();
      ctx.globalAlpha = opacity * 0.6;
      ctx.strokeStyle = '#' + color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#' + color;

      ctx.beginPath();
      ctx.moveTo(p0.x * cw, p0.y * ch);
      for (var j = 1; j < stroke.points.length; j++) {
        var pt = stroke.points[j];
        ctx.lineTo(pt.x * cw, pt.y * ch);
      }
      ctx.stroke();
      ctx.restore();
    },

    destroy: function() {
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      if (this._engine) {
        this._engine.onStroke = null;
        this._engine.onStrokeUpdate = null;
      }
      this._canvas = null;
      this._ctx = null;
      this._container = null;
      this._engine = null;
      this._particles = [];
      this._bgStars = [];
    }
  };

  DrawManager.register(theme);
})();
