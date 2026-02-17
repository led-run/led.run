/**
 * Sticker Theme - Redesigned
 * Exquisite vinyl stickers with dynamic holographic color shifts, 
 * glitter textures, and realistic 3D peeling effects.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  var StickerTheme = {
    id: 'sticker',

    defaults: {
      color: 'ffffff',
      bg: '333333',
      fill: '333333',
      font: "'Fredoka', sans-serif",
      speed: 60,
      direction: 'left',
      scale: 1,
      finish: 'holographic',
      peel: 4,
      outline: 6,
      glitter: 0
    },

    _container: null,
    _config: null,
    _mode: null,
    _paused: false,
    _rafId: null,
    _text: '',
    _time: 0,
    _lastTime: 0,
    _resizeHandler: null,

    init: function(container, text, config) {
      this._container = container;
      this._text = text;
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._time = 0;
      this._lastTime = performance.now();

      container.classList.add('theme-sticker');
      container.style.backgroundColor = '#' + this._config.bg;

      this._buildLayout();
      this._mode = this._resolveMode(text, this._config.mode);
      this._renderContent();
      this._startAnimation();

      this._resizeHandler = this._onResize.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _resolveMode: function(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _buildLayout: function() {
      var c = this._container;
      c.innerHTML = '';
      
      var surface = document.createElement('div');
      surface.className = 'sticker-surface';
      c.appendChild(surface);

      var body = document.createElement('div');
      body.className = 'sticker-body sticker-finish-' + (this._config.finish || 'glossy');
      c.appendChild(body);
      this._body = body;

      var content = document.createElement('div');
      content.className = 'sticker-content';
      body.appendChild(content);
      this._content = content;

      if (Number(this._config.peel) > 0) {
        var peel = document.createElement('div');
        peel.className = 'sticker-peel';
        body.appendChild(peel);
        var back = document.createElement('div');
        back.className = 'sticker-peel-back';
        body.appendChild(back);
      }

      // Glitter overlay canvas
      var glitterLevel = Number(this._config.glitter) || 0;
      if (glitterLevel > 0) {
        var gc = document.createElement('canvas');
        gc.className = 'sticker-glitter';
        gc.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:6;border-radius:20px;';
        body.appendChild(gc);
        this._glitterCanvas = gc;
      } else {
        this._glitterCanvas = null;
      }

      var shadow = document.createElement('div');
      shadow.className = 'sticker-shadow';
      c.appendChild(shadow);
    },

    _renderContent: function() {
      var area = this._content;
      area.innerHTML = '';
      var font = this._config.font || this.defaults.font;
      var color = '#' + this._config.color;
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));

      if (this._mode === 'sign') {
        var el = document.createElement('div');
        el.className = 'sticker-sign-text';
        el.style.fontFamily = font;
        el.style.color = color;
        el.textContent = this._text;
        area.appendChild(el);
        this._fitSignText(el);
      } else {
        var track = document.createElement('div');
        track.className = 'sticker-flow-track';
        var speed = (Number(this._config.speed) || 60) / 10;
        var dir = this._config.direction === 'right' ? 'reverse' : 'normal';
        track.style.animation = 'sticker-scroll ' + (15/speed) + 's linear infinite ' + dir;
        
        for (var i = 0; i < 2; i++) {
          var t = document.createElement('span');
          t.className = 'sticker-flow-text';
          t.textContent = this._text + ' ';
          t.style.fontFamily = font;
          t.style.color = color;
          track.appendChild(t);
        }
        area.appendChild(track);
        track.style.fontSize = Math.floor(this._container.clientHeight * 0.4 * scale) + 'px';
      }
    },

    _fitSignText: function(el) {
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
      var fSize = TextEngine.autoFit(this._text, this._container, {
        fontFamily: this._config.font || this.defaults.font,
        fontWeight: '700',
        padding: this._container.clientWidth * 0.2
      });
      el.style.fontSize = Math.floor(fSize * scale) + 'px';
    },

    _startAnimation: function() {
      var self = this;
      function loop(now) {
        if (!self._container) return;
        var delta = Math.min((now - self._lastTime) / 1000, 0.1);
        self._lastTime = now;
        if (!self._paused) {
          self._time += delta;
          if (self._config.finish === 'holographic') {
            self._body.style.setProperty('--holo-pos', (self._time * 20) % 100 + '%');
          }
          self._drawGlitter();
        }
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _drawGlitter: function() {
      var gc = this._glitterCanvas;
      if (!gc) return;
      var level = Number(this._config.glitter) || 0;
      if (level <= 0) return;
      var w = gc.offsetWidth, h = gc.offsetHeight;
      if (w === 0 || h === 0) return;
      if (gc.width !== w || gc.height !== h) { gc.width = w; gc.height = h; }
      var ctx = gc.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      var count = Math.floor(level * 8);
      for (var i = 0; i < count; i++) {
        var x = Math.random() * w;
        var y = Math.random() * h;
        var size = Math.random() * 2.5 + 0.5;
        var alpha = Math.random() * 0.6 + 0.2;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    },

    _onResize: function() {
      this._buildLayout();
      this._renderContent();
    },

    togglePause: function() {
      this._paused = !this._paused;
      var track = this._container.querySelector('.sticker-flow-track');
      if (track) track.style.animationPlayState = this._paused ? 'paused' : 'running';
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this._container.classList.remove('theme-sticker');
      this._container.innerHTML = '';
    }
  };

  TextManager.register(StickerTheme);

})(typeof window !== 'undefined' ? window : this);
