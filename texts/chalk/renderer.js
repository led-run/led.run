/**
 * Chalk Theme - Redesigned
 * Realistic chalkboard with rough chalk strokes, falling dust, 
 * slate textures, and semi-transparent smudges.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  function hexToRgb(hex) {
    hex = (hex || '').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.substring(0, 2), 16) || 0;
    var g = parseInt(hex.substring(2, 4), 16) || 0;
    var b = parseInt(hex.substring(4, 6), 16) || 0;
    return { r: r, g: g, b: b };
  }

  var ChalkTheme = {
    id: 'chalk',

    defaults: {
      color: 'ffffff',
      bg: '1a1a1a',
      fill: '223322',
      font: "'Patrick Hand', 'Segoe Print', cursive",
      speed: 60,
      direction: 'left',
      scale: 1,
      roughness: 5,
      dust: 6,
      smudge: 4,
      board: 'green'
    },

    _container: null,
    _config: null,
    _canvas: null,
    _ctx: null,
    _sampleCanvas: null,
    _sampleCtx: null,
    _rafId: null,
    _paused: false,
    _text: '',
    _mode: null,
    _scrollPos: 0,
    _lastTime: 0,
    _dust: [],
    _smudges: [],
    _resizeHandler: null,

    init: function(container, text, config) {
      this._container = container;
      this._text = text;
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._scrollPos = 0;
      this._lastTime = performance.now();

      container.classList.add('theme-chalk');
      container.style.backgroundColor = '#' + this._config.bg;

      this._canvas = document.createElement('canvas');
      this._canvas.className = 'chalk-canvas';
      container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this._sampleCanvas = document.createElement('canvas');
      this._sampleCtx = this._sampleCanvas.getContext('2d', { willReadFrequently: true });

      this._mode = this._resolveMode(text, this._config.mode);
      this._resizeCanvas();
      this._initDust();
      this._initSmudges();
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
      this._prepareSample();
    },

    _initDust: function() {
      var count = (Number(this._config.dust) || 6) * 15;
      this._dust = [];
      for (var i = 0; i < count; i++) {
        this._dust.push({
          x: Math.random(), y: Math.random(),
          s: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.001,
          vy: Math.random() * 0.002 + 0.001,
          a: Math.random() * 0.5 + 0.1
        });
      }
    },

    _initSmudges: function() {
      var count = Number(this._config.smudge) || 4;
      this._smudges = [];
      for (var i = 0; i < count; i++) {
        this._smudges.push({
          x: Math.random(), y: Math.random(),
          r: Math.random() * 100 + 50,
          a: Math.random() * 0.05 + 0.02
        });
      }
    },

    _prepareSample: function() {
      var w = this._canvas.width, h = this._canvas.height;
      var font = this._config.font || this.defaults.font;
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
      var ctx = this._sampleCtx;

      if (this._mode === 'sign') {
        var fontSize = TextEngine.autoFit(this._text, this._container, {
          fontFamily: font, fontWeight: '400', padding: w * 0.15
        });
        fontSize = Math.floor(fontSize * scale);
        this._sampleCanvas.width = w; this._sampleCanvas.height = h;
        ctx.font = '400 ' + fontSize + 'px ' + font;
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this._text, w / 2, h / 2);
      } else {
        var flowSize = Math.floor(h * 0.5 * scale);
        ctx.font = '400 ' + flowSize + 'px ' + font;
        var tw = ctx.measureText(this._text + '   ').width;
        this._sampleCanvas.width = Math.ceil(tw); this._sampleCanvas.height = h;
        ctx.font = '400 ' + flowSize + 'px ' + font;
        ctx.fillStyle = 'white'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(this._text, 0, h / 2);
      }
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
            self._scrollPos += speed * delta * 0.5 * direction;
          }
        }
        self._draw();
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _draw: function() {
      var ctx = this._ctx, w = this._canvas.width, h = this._canvas.height;
      var config = this._config;

      // 1. Board Surface
      var surface = config.board === 'black' ? '#1a1a1a' : '#223322';
      ctx.fillStyle = surface;
      ctx.fillRect(0, 0, w, h);

      // 2. Slate Texture Noise
      ctx.globalAlpha = 0.15;
      for (var n = 0; n < 5; n++) {
        var nx = Math.random() * w, ny = Math.random() * h;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(nx, ny, Math.random()*w, 1);
      }
      ctx.globalAlpha = 1;

      // 3. Smudges
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      for (var s = 0; s < this._smudges.length; s++) {
        var sm = this._smudges[s];
        ctx.globalAlpha = sm.a;
        ctx.beginPath();
        ctx.arc(sm.x * w, sm.y * h, sm.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 4. Chalk Text
      this._drawChalkText(ctx, w, h);

      // 5. Falling Dust
      ctx.fillStyle = 'white';
      for (var d = 0; d < this._dust.length; d++) {
        var dust = this._dust[d];
        if (!this._paused) {
          dust.y += dust.vy; dust.x += dust.vx;
          if (dust.y > 1) dust.y = -0.05;
        }
        ctx.globalAlpha = dust.a;
        ctx.beginPath(); ctx.arc(dust.x * w, dust.y * h, dust.s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    _drawChalkText: function(ctx, w, h) {
      var rgb = hexToRgb(this._config.color);
      var roughness = (Number(this._config.roughness) || 5) / 10;
      var sw = this._sampleCanvas.width;
      
      if (this._mode === 'sign') {
        var data = this._sampleCtx.getImageData(0, 0, w, h).data;
        var step = 2;
        for (var y = 0; y < h; y += step) {
          for (var x = 0; x < w; x += step) {
            var alpha = data[(y * w + x) * 4 + 3];
            if (alpha > 50) {
              var noise = Math.random() * roughness + (1 - roughness);
              ctx.globalAlpha = (alpha / 255) * noise;
              ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ', 0.9)';
              ctx.fillRect(x, y, step + Math.random(), step + Math.random());
            }
          }
        }
      } else {
        var data2 = this._sampleCtx.getImageData(0, 0, sw, h).data;
        var step2 = 2;
        var offset = this._scrollPos % sw;
        if (offset < 0) offset += sw;
        for (var y2 = 0; y2 < h; y2 += step2) {
          for (var x2 = 0; x2 < w; x2 += step2) {
            var sx = Math.floor(x2 + offset) % sw;
            var alpha2 = data2[(y2 * sw + sx) * 4 + 3];
            if (alpha2 > 50) {
              var noise2 = Math.random() * roughness + (1 - roughness);
              ctx.globalAlpha = (alpha2 / 255) * noise2;
              ctx.fillStyle = 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ', 0.9)';
              ctx.fillRect(x2, y2, step2 + Math.random(), step2 + Math.random());
            }
          }
        }
      }
      ctx.globalAlpha = 1;
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
      this._container.classList.remove('theme-chalk');
      this._container.innerHTML = '';
      this._container = null;
      this._canvas = null;
      this._sampleCanvas = null;
    }
  };

  TextManager.register(ChalkTheme);

})(typeof window !== 'undefined' ? window : this);
