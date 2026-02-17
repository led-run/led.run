/**
 * Railway Theme - Redesigned
 * High-fidelity Solari split-flap display with mechanical vibration,
 * realistic flap shadows, metallic wear, and detailed industrial housing.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;
  var FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:!?-/\'&';

  var RailwayTheme = {
    id: 'railway',

    defaults: {
      color: 'ffcc00',
      bg: '1a1a1a',
      fill: '2a2a2a',
      font: "'Roboto Condensed', sans-serif",
      speed: 60,
      direction: 'left',
      scale: 1,
      flipSpeed: 0.4,
      housing: 'silver',
      wear: 4,
      vibration: 5
    },

    _container: null,
    _config: null,
    _mode: null,
    _paused: false,
    _flapUnits: [],
    _flipTimeouts: [],
    _resizeHandler: null,

    init: function(container, text, config) {
      this._container = container;
      this._text = text.toUpperCase();
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;
      this._flapUnits = [];
      this._flipTimeouts = [];

      container.classList.add('theme-railway');
      container.style.backgroundColor = '#' + this._config.bg;

      this._mode = this._resolveMode(text, this._config.mode);
      this._buildLayout();
      
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
      
      var housing = document.createElement('div');
      housing.className = 'railway-housing railway-housing-' + (this._config.housing || 'silver');
      c.appendChild(housing);

      var board = document.createElement('div');
      board.className = 'railway-board';
      c.appendChild(board);
      this._board = board;

      if (this._mode === 'sign') {
        this._initSign();
      } else {
        this._initFlow();
      }
    },

    _initSign: function() {
      var board = this._board;
      var chars = [...this._text];
      var row = document.createElement('div');
      row.className = 'railway-flaps-row';
      board.appendChild(row);

      var w = this._container.clientWidth, h = this._container.clientHeight;
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
      var unitW = Math.min((w * 0.8) / chars.length, h * 0.5) * scale;
      var unitH = unitW * 1.4;
      var fontSize = unitH * 0.7;

      var self = this;
      chars.forEach(function(ch, i) {
        var unit = self._createFlapUnit(unitW, unitH, fontSize);
        row.appendChild(unit.el);
        self._flapUnits.push(unit);
        self._animateFlip(unit, ch, i);
      });
    },

    _createFlapUnit: function(w, h, fSize) {
      var el = document.createElement('div');
      el.className = 'railway-flap-unit';
      el.style.width = w + 'px'; el.style.height = h + 'px';
      el.style.perspective = (h * 3) + 'px';

      var top = document.createElement('div'); top.className = 'railway-flap-top';
      var topT = document.createElement('div'); topT.className = 'railway-flap-char';
      topT.style.fontSize = fSize + 'px'; topT.style.color = '#' + this._config.color;
      topT.textContent = ' '; top.appendChild(topT); el.appendChild(top);

      var bot = document.createElement('div'); bot.className = 'railway-flap-bottom';
      var botT = document.createElement('div'); botT.className = 'railway-flap-char railway-flap-char-bottom';
      botT.style.fontSize = fSize + 'px'; botT.style.color = '#' + this._config.color;
      botT.textContent = ' '; bot.appendChild(botT); el.appendChild(bot);

      var hinge = document.createElement('div'); hinge.className = 'railway-hinge';
      el.appendChild(hinge);

      return { el: el, topT: topT, botT: botT, w: w, h: h, fSize: fSize };
    },

    _animateFlip: function(unit, target, idx) {
      var self = this;
      var steps = 3 + Math.floor(Math.random() * 4);
      var seq = [];
      for (var i = 0; i < steps; i++) seq.push(FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]);
      seq.push(target);

      var delay = idx * 60;
      var speed = (parseFloat(this._config.flipSpeed) || 0.4) * 1000;

      function next(s) {
        if (s >= seq.length) return;
        var timeout = setTimeout(function() {
          self._performFlip(unit, seq[s], speed / 2);
          if (Number(self._config.vibration) > 0) {
            unit.el.style.animation = 'railway-vibrate 0.1s linear';
            setTimeout(function(){ unit.el.style.animation = ''; }, 100);
          }
          next(s + 1);
        }, s === 0 ? delay : speed + 20);
        self._flipTimeouts.push(timeout);
      }
      next(0);
    },

    _performFlip: function(unit, char, halfDur) {
      var old = unit.topT.textContent;
      unit.topT.textContent = char;
      
      var flip = document.createElement('div');
      flip.className = 'railway-flap-overlay railway-flap-top';
      flip.style.animation = 'railway-flip-out ' + halfDur + 'ms ease-in forwards';
      var ft = document.createElement('div'); ft.className = 'railway-flap-char';
      ft.style.fontSize = unit.fSize + 'px'; ft.style.color = '#' + this._config.color;
      ft.textContent = old; flip.appendChild(ft); unit.el.appendChild(flip);

      var flipIn = document.createElement('div');
      flipIn.className = 'railway-flap-overlay railway-flap-bottom';
      flipIn.style.animation = 'railway-flip-in ' + halfDur + 'ms ease-out ' + halfDur + 'ms forwards';
      flipIn.style.transform = 'rotateX(90deg)';
      var fit = document.createElement('div'); fit.className = 'railway-flap-char railway-flap-char-bottom';
      fit.style.fontSize = unit.fSize + 'px'; fit.style.color = '#' + this._config.color;
      fit.textContent = char; flipIn.appendChild(fit); unit.el.appendChild(flipIn);

      this._flipTimeouts.push(setTimeout(function() {
        unit.botT.textContent = char;
        if (flip.parentNode) flip.remove();
        if (flipIn.parentNode) flipIn.remove();
      }, halfDur * 2 + 50));
    },

    _initFlow: function() {
      var board = this._board;
      board.classList.add('railway-board-flow');
      var track = document.createElement('div');
      track.className = 'railway-flow-track';
      var speed = (Number(this._config.speed) || 60) / 10;
      var dir = this._config.direction === 'right' ? 'reverse' : 'normal';
      track.style.animation = 'railway-scroll ' + (15/speed) + 's linear infinite ' + dir;

      for (var i = 0; i < 2; i++) {
        var t = document.createElement('span');
        t.className = 'railway-flow-text';
        t.textContent = this._text + ' ';
        t.style.color = '#' + this._config.color;
        track.appendChild(t);
      }
      board.appendChild(track);
      var flowScale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
      track.style.fontSize = (this._container.clientHeight * 0.35 * flowScale) + 'px';
    },

    _onResize: function() {
      this._buildLayout();
    },

    togglePause: function() {
      this._paused = !this._paused;
      var track = this._container.querySelector('.railway-flow-track');
      if (track) track.style.animationPlayState = this._paused ? 'paused' : 'running';
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      this._flipTimeouts.forEach(clearTimeout);
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this._container.classList.remove('theme-railway');
      this._container.innerHTML = '';
    }
  };

  TextManager.register(RailwayTheme);

})(typeof window !== 'undefined' ? window : this);
