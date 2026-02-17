/**
 * Gothic Theme - Redesigned
 * Exquisite medieval manuscript with ink bleed, gold-leaf illumination, 
 * embossed wax seals, and flickering candlelight ambiance.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  var GothicTheme = {
    id: 'gothic',

    defaults: {
      color: '2a1a0a',
      bg: 'f5e6c8',
      fill: 'f5e6c8',
      font: "'UnifrakturMaguntia', 'MedievalSharp', serif",
      speed: 60,
      direction: 'left',
      scale: 1,
      ornate: 7,
      aged: 5,
      illuminated: true,
      seal: true,
      candle: 4
    },

    _container: null,
    _config: null,
    _mode: null,
    _rafId: null,
    _paused: false,
    _text: '',
    _lastTime: 0,
    _candleTime: 0,
    _resizeHandler: null,

    init: function(container, text, config) {
      this._container = container;
      this._text = text;
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._candleTime = 0;
      this._lastTime = performance.now();

      container.classList.add('theme-gothic');
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
      
      // 1. Parchment Base
      var p = document.createElement('div');
      p.className = 'gothic-parchment';
      c.appendChild(p);

      // 2. Ornate Border
      if (Number(this._config.ornate) > 2) {
        var b = document.createElement('div');
        b.className = 'gothic-border';
        c.appendChild(b);
      }

      // 3. Main Text Area
      var area = document.createElement('div');
      area.className = 'gothic-area';
      c.appendChild(area);
      this._area = area;

      // 4. Wax Seal
      if (this._config.seal !== false && this._config.seal !== 'false') {
        var seal = document.createElement('div');
        seal.className = 'gothic-seal';
        var sealIn = document.createElement('div');
        sealIn.className = 'gothic-seal-inner';
        seal.appendChild(sealIn);
        c.appendChild(seal);
      }

      // 5. Candle Glow Overlay
      var glow = document.createElement('div');
      glow.className = 'gothic-candle-glow';
      c.appendChild(glow);
      this._glow = glow;
    },

    _renderContent: function() {
      var area = this._area;
      area.innerHTML = '';
      var font = this._config.font || this.defaults.font;
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));

      if (this._mode === 'sign') {
        var el = document.createElement('div');
        el.className = 'gothic-sign-text';
        el.style.fontFamily = font;
        el.style.color = '#' + this._config.color;
        
        if (this._config.illuminated !== false && this._config.illuminated !== 'false' && this._text.length > 0) {
          var initial = document.createElement('span');
          initial.className = 'gothic-initial';
          initial.textContent = this._text[0];
          el.appendChild(initial);
          el.appendChild(document.createTextNode(this._text.substring(1)));
        } else {
          el.textContent = this._text;
        }
        area.appendChild(el);
        this._fitSignText(el);
      } else {
        var track = document.createElement('div');
        track.className = 'gothic-flow-track';
        var speed = (Number(this._config.speed) || 60) / 10;
        var dir = this._config.direction === 'right' ? 'reverse' : 'normal';
        track.style.animation = 'gothic-scroll ' + (20/speed) + 's linear infinite ' + dir;
        
        for (var i = 0; i < 2; i++) {
          var t = document.createElement('span');
          t.className = 'gothic-flow-text';
          t.textContent = this._text + ' ';
          t.style.fontFamily = font;
          t.style.color = '#' + this._config.color;
          track.appendChild(t);
        }
        area.appendChild(track);
        var fSize = Math.floor(this._container.clientHeight * 0.4 * scale);
        track.style.fontSize = fSize + 'px';
      }
    },

    _fitSignText: function(el) {
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
      var fSize = TextEngine.autoFit(this._text, this._container, {
        fontFamily: this._config.font || this.defaults.font,
        fontWeight: '400',
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
          self._candleTime += delta;
          var candle = Number(self._config.candle) || 0;
          if (candle > 0) {
            var flicker = Math.sin(self._candleTime * 10) * 0.05 + Math.sin(self._candleTime * 3) * 0.1;
            self._glow.style.opacity = (candle / 10) * (0.6 + flicker);
          }
        }
        self._rafId = requestAnimationFrame(loop);
      }
      this._rafId = requestAnimationFrame(loop);
    },

    _onResize: function() {
      if (this._mode === 'sign') {
        var el = this._area.querySelector('.gothic-sign-text');
        if (el) this._fitSignText(el);
      } else {
        var track = this._area.querySelector('.gothic-flow-track');
        if (track) {
          var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
          track.style.fontSize = Math.floor(this._container.clientHeight * 0.4 * scale) + 'px';
        }
      }
    },

    togglePause: function() {
      this._paused = !this._paused;
      var track = this._area.querySelector('.gothic-flow-track');
      if (track) track.style.animationPlayState = this._paused ? 'paused' : 'running';
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this._container.classList.remove('theme-gothic');
      this._container.innerHTML = '';
      this._container = null;
    }
  };

  TextManager.register(GothicTheme);

})(typeof window !== 'undefined' ? window : this);
