/**
 * Draw Theme: Sparkle Trail
 * Dark background with glittering particle trails and twinkling stars
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
    _time: 0,

    init: function(container, config, drawEngine) {
      this._container = container;
      this._config = config;
      this._engine = drawEngine;
      this._particles = [];
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
      this._generateParticles();
    },

    _resize: function() {
      if (!this._canvas || !this._container) return;
      this._canvas.width = this._container.clientWidth;
      this._canvas.height = this._container.clientHeight;
    },

    _generateParticles: function() {
      this._particles = [];
      if (!this._engine) return;

      var strokes = this._engine.getStrokes();
      var currentStroke = this._engine.getCurrentStroke();
      var allStrokes = currentStroke ? strokes.concat([currentStroke]) : strokes;
      var starsPerPoint = Math.max(1, Math.floor((parseFloat(this._config.stars) || 8) / 3));

      for (var i = 0; i < allStrokes.length; i++) {
        var s = allStrokes[i];
        if (s.eraser) continue;
        for (var j = 0; j < s.points.length; j += 2) {
          var p = s.points[j];
          for (var k = 0; k < starsPerPoint; k++) {
            this._particles.push({
              x: p.x + (Math.random() - 0.5) * 0.02,
              y: p.y + (Math.random() - 0.5) * 0.02,
              size: Math.random() * 3 + 1,
              speed: Math.random() * 0.5 + 0.5,
              phase: Math.random() * Math.PI * 2,
              color: s.color,
              opacity: s.opacity || 1
            });
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
      ctx.clearRect(0, 0, cw, ch);

      // Draw base strokes
      if (this._engine) {
        var strokes = this._engine.getStrokes();
        var currentStroke = this._engine.getCurrentStroke();
        var allStrokes = currentStroke ? strokes.concat([currentStroke]) : strokes;
        for (var i = 0; i < allStrokes.length; i++) {
          this._drawStroke(ctx, allStrokes[i], cw, ch);
        }
      }

      // Draw sparkle particles
      var twinkle = (parseFloat(this._config.twinkle) || 5) / 5;
      for (var j = 0; j < this._particles.length; j++) {
        var p = this._particles[j];
        var flicker = 0.3 + 0.7 * Math.abs(Math.sin(this._time * p.speed * twinkle + p.phase));
        ctx.save();
        ctx.globalAlpha = p.opacity * flicker;
        ctx.fillStyle = '#' + p.color;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = '#' + p.color;

        // Star shape
        var x = p.x * cw;
        var y = p.y * ch;
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

      ctx.save();
      ctx.globalAlpha = (stroke.opacity || 1) * 0.6;
      ctx.strokeStyle = '#' + stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#' + stroke.color;

      ctx.beginPath();
      var p0 = stroke.points[0];
      ctx.moveTo(p0.x * cw, p0.y * ch);
      for (var i = 1; i < stroke.points.length; i++) {
        var p = stroke.points[i];
        ctx.lineTo(p.x * cw, p.y * ch);
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
    }
  };

  DrawManager.register(theme);
})();
