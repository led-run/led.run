/**
 * VFD Theme - Redesigned
 * Vacuum Fluorescent Display with 3D phosphors, wire mesh, glass tube reflections,
 * and high-fidelity glow/halation.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  var SEG14 = {
    ' ': [],
    'A': [0,1,2,3,6,7,8,9],
    'B': [0,1,2,3,4,5,9,11,14],
    'C': [0,1,4,5,6,7],
    'D': [0,1,2,3,4,5,11,14],
    'E': [0,1,4,5,6,7,8],
    'F': [0,1,6,7,8],
    'G': [0,1,3,4,5,6,7,9],
    'H': [2,3,6,7,8,9],
    'I': [0,1,4,5,11,14],
    'J': [2,3,4,5,6],
    'K': [6,7,8,12,13],
    'L': [4,5,6,7],
    'M': [2,3,6,7,10,12],
    'N': [2,3,6,7,10,13],
    'O': [0,1,2,3,4,5,6,7],
    'P': [0,1,2,6,7,8,9],
    'Q': [0,1,2,3,4,5,6,7,13],
    'R': [0,1,2,6,7,8,9,13],
    'S': [0,1,3,4,5,7,8,9],
    'T': [0,1,11,14],
    'U': [2,3,4,5,6,7],
    'V': [6,7,12,15],
    'W': [2,3,6,7,13,15],
    'X': [10,12,13,15],
    'Y': [10,12,14],
    'Z': [0,1,4,5,12,15],
    '0': [0,1,2,3,4,5,6,7,12,15],
    '1': [2,3],
    '2': [0,1,2,4,5,6,8,9],
    '3': [0,1,2,3,4,5,8,9],
    '4': [2,3,7,8,9],
    '5': [0,1,3,4,5,7,8,9],
    '6': [0,1,3,4,5,6,7,8,9],
    '7': [0,1,2,3],
    '8': [0,1,2,3,4,5,6,7,8,9],
    '9': [0,1,2,3,4,5,7,8,9],
    '-': [8,9],
    '.': [],
    ':': []
  };

  function getSegmentPaths(w, h, gap) {
    var sw = w * 0.09;
    var g = gap;
    var hw = w / 2;
    var hh = h / 2;
    return [
      [[g, 0], [hw - g/2, 0], [hw - g/2 - sw/2, sw], [g + sw/2, sw]],
      [[hw + g/2, 0], [w - g, 0], [w - g - sw/2, sw], [hw + g/2 + sw/2, sw]],
      [[w, g], [w, hh - g/2], [w - sw, hh - g/2 - sw/2], [w - sw, g + sw/2]],
      [[w, hh + g/2], [w, h - g], [w - sw, h - g - sw/2], [w - sw, hh + g/2 + sw/2]],
      [[g, h], [hw - g/2, h], [hw - g/2 - sw/2, h - sw], [g + sw/2, h - sw]],
      [[hw + g/2, h], [w - g, h], [w - g - sw/2, h - sw], [hw + g/2 + sw/2, h - sw]],
      [[0, hh + g/2], [0, h - g], [sw, h - g - sw/2], [sw, hh + g/2 + sw/2]],
      [[0, g], [0, hh - g/2], [sw, hh - g/2 - sw/2], [sw, g + sw/2]],
      [[g, hh - sw/2], [hw - g/2, hh - sw/2], [hw - g/2, hh + sw/2], [g, hh + sw/2]],
      [[hw + g/2, hh - sw/2], [w - g, hh - sw/2], [w - g, hh + sw/2], [hw + g/2, hh + sw/2]],
      [[sw + g, sw + g], [sw + g + sw, sw + g], [hw - g/2, hh - g/2 - sw/2], [hw - g/2 - sw, hh - g/2 - sw/2]],
      [[hw - sw/2, sw + g], [hw + sw/2, sw + g], [hw + sw/2, hh - g/2], [hw - sw/2, hh - g/2]],
      [[w - sw - g - sw, sw + g], [w - sw - g, sw + g], [hw + g/2 + sw, hh - g/2 - sw/2], [hw + g/2, hh - g/2 - sw/2]],
      [[hw - g/2 - sw, hh + g/2 + sw/2], [hw - g/2, hh + g/2 + sw/2], [sw + g + sw, h - sw - g], [sw + g, h - sw - g]],
      [[hw - sw/2, hh + g/2], [hw + sw/2, hh + g/2], [hw + sw/2, h - sw - g], [hw - sw/2, h - sw - g]],
      [[hw + g/2, hh + g/2 + sw/2], [hw + g/2 + sw, hh + g/2 + sw/2], [w - sw - g, h - sw - g], [w - sw - g - sw, h - sw - g]]
    ];
  }

  var VFDTheme = {
    id: 'vfd',

    defaults: {
      color: '00ffcc',
      bg: '0a0a0a',
      fill: '0c1a18',
      speed: 60,
      direction: 'left',
      scale: 1,
      glow: 8,
      flicker: 3,
      mesh: 4,
      tube: true
    },

    _container: null,
    _config: null,
    _canvas: null,
    _ctx: null,
    _rafId: null,
    _paused: false,
    _text: '',
    _mode: null,
    _scrollPos: 0,
    _lastTime: 0,
    _resizeHandler: null,
    _meshPattern: null,

    init: function(container, text, config) {
      this._container = container;
      this._text = text.toUpperCase();
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._scrollPos = 0;
      this._lastTime = performance.now();

      container.classList.add('theme-vfd');
      container.style.backgroundColor = '#' + this._config.bg;

      this._canvas = document.createElement('canvas');
      this._canvas.className = 'vfd-canvas';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._mode = this._resolveMode(text, this._config.mode);
      this._resizeCanvas();
      this._startAnimation();

      this._resizeHandler = this._resizeCanvas.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _resolveMode: function(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _resizeCanvas: function() {
      var w = this._container.clientWidth;
      var h = this._container.clientHeight;
      if (w === 0 || h === 0) return;
      this._canvas.width = w;
      this._canvas.height = h;
      this._meshPattern = this._createMeshPattern();
    },

    _createMeshPattern: function() {
      var size = 4;
      var canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      var ctx = canvas.getContext('2d');
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(0, 0, size, size);
      return this._ctx.createPattern(canvas, 'repeat');
    },

    _startAnimation: function() {
      var self = this;
      function loop(now) {
        if (!self._container) return;
        var delta = Math.min((now - self._lastTime) / 1000, 0.1);
        self._lastTime = now;
        if (!self._paused) {
          if (self._mode === 'flow') {
            var speed = parseFloat(self._config.speed) || self.defaults.speed;
            var direction = self._config.direction === 'right' ? -1 : 1;
            self._scrollPos += speed * delta * 0.05 * direction;
          }
          self._draw();
        }
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _draw: function() {
      var ctx = this._ctx;
      var w = this._canvas.width;
      var h = this._canvas.height;
      var config = this._config;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#' + config.fill;
      ctx.fillRect(0, 0, w, h);

      // 1. Wire Mesh Background
      var meshLevel = Number(config.mesh) || 0;
      if (meshLevel > 0) {
        ctx.save();
        ctx.globalAlpha = meshLevel * 0.1;
        ctx.fillStyle = this._meshPattern;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // 2. Render Characters
      var text = this._mode === 'flow' ? ' ' + this._text + ' ' : this._text;
      var chars = [...text];
      var scale = Math.max(0.1, Math.min(1.5, Number(config.scale) || 1));
      var padding = Math.min(w, h) * 0.1;
      var cellH = (h - padding * 2) * 0.75 * scale;
      var cellW = cellH * 0.55;
      var gap = cellW * 0.2;
      var totalW = chars.length * (cellW + gap) - gap;
      
      var startX, startY = (h - cellH) / 2;
      if (this._mode === 'sign') {
        if (totalW > w - padding * 2) {
          var ratio = (w - padding * 2) / totalW;
          cellW *= ratio; cellH *= ratio; gap *= ratio;
          totalW = w - padding * 2;
        }
        startX = (w - totalW) / 2;
      } else {
        startX = -this._scrollPos * (cellW + gap);
        var unitW = cellW + gap;
        var fullW = chars.length * unitW;
        startX %= fullW;
        if (startX > 0) startX -= fullW;
      }

      for (var i = 0; i < chars.length; i++) {
        var x = startX + i * (cellW + gap);
        if (this._mode === 'flow') {
          // Extra tiling for seamless flow
          while (x < -cellW) x += totalW + gap;
          if (x > w) continue;
        }
        this._drawChar(ctx, chars[i], x, startY, cellW, cellH);
      }

      // 3. Glass Reflections
      if (config.tube !== false && config.tube !== 'false') {
        this._drawGlass(ctx, w, h);
      }
    },

    _drawChar: function(ctx, ch, x, y, w, h) {
      var segments = SEG14[ch] || SEG14[ch.toUpperCase()] || [];
      var paths = getSegmentPaths(w, h, w * 0.07);
      var color = this._config.color;
      var glow = Number(this._config.glow) || 8;
      var flicker = Number(this._config.flicker) || 3;
      var isFlicker = Math.random() < flicker * 0.005;

      for (var i = 0; i < 16; i++) {
        var isOn = segments.indexOf(i) !== -1;
        var path = paths[i];
        if (!path) continue;

        ctx.save();
        ctx.translate(x, y);

        if (isOn) {
          if (isFlicker) ctx.globalAlpha = 0.3;
          
          // Halation Glow
          ctx.shadowColor = '#' + color;
          ctx.shadowBlur = glow * 2;
          ctx.fillStyle = '#' + color;
          ctx.beginPath();
          ctx.moveTo(path[0][0], path[0][1]);
          for (var p = 1; p < path.length; p++) ctx.lineTo(path[p][0], path[p][1]);
          ctx.closePath();
          ctx.fill();

          // Phosphor Core
          ctx.shadowBlur = 0;
          var r = parseInt(color.substring(0,2),16), g = parseInt(color.substring(2,4),16), b = parseInt(color.substring(4,6),16);
          ctx.fillStyle = 'rgba(' + Math.min(255,r+150) + ',' + Math.min(255,g+150) + ',' + Math.min(255,b+150) + ', 0.9)';
          ctx.fill();
        } else {
          // Dim segments
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.beginPath();
          ctx.moveTo(path[0][0], path[0][1]);
          for (var p2 = 1; p2 < path.length; p2++) ctx.lineTo(path[p2][0], path[p2][1]);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    },

    _drawGlass: function(ctx, w, h) {
      // Curved highlights
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(0.1, 'rgba(255, 255, 255, 0.03)');
      grad.addColorStop(0.5, 'transparent');
      grad.addColorStop(0.9, 'rgba(0, 0, 0, 0.1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Scratches and dust
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = 'white';
      for (var i = 0; i < 3; i++) {
        var sx = Math.random() * w, sy = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.random()*20, sy + Math.random()*5);
        ctx.stroke();
      }
    },

    togglePause: function() {
      this._paused = !this._paused;
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this._container.classList.remove('theme-vfd');
      this._container.innerHTML = '';
      this._container = null;
      this._canvas = null;
      this._ctx = null;
    }
  };

  TextManager.register(VFDTheme);

})(typeof window !== 'undefined' ? window : this);
