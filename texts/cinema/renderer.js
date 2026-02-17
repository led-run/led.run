/**
 * Cinema Theme - Redesigned
 * Classic movie marquee with felt boards, plastic slot letters, 
 * warm backlight spills, and glossy reflections.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  var CinemaTheme = {
    id: 'cinema',

    defaults: {
      color: 'ffffff',
      bg: '0a0a0a',
      fill: '1a1a1a',
      font: "'Bebas Neue', 'Impact', sans-serif",
      speed: 60,
      direction: 'left',
      scale: 1,
      rows: 1,
      backlight: 6,
      felt: 'black'
    },

    _container: null,
    _config: null,
    _mode: null,
    _paused: false,
    _text: '',
    _resizeHandler: null,

    init: function(container, text, config) {
      this._container = container;
      this._text = text.toUpperCase();
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;

      container.classList.add('theme-cinema');
      container.style.backgroundColor = '#' + this._config.bg;

      this._buildLayout();
      this._mode = this._resolveMode(text, this._config.mode);
      this._renderContent();

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
      
      var casing = document.createElement('div');
      casing.className = 'cinema-casing';
      c.appendChild(casing);

      var glow = document.createElement('div');
      glow.className = 'cinema-glow';
      glow.style.opacity = (Number(this._config.backlight) || 6) * 0.1;
      casing.appendChild(glow);

      var board = document.createElement('div');
      board.className = 'cinema-board cinema-felt-' + (this._config.felt || 'black');
      c.appendChild(board);
      this._board = board;

      var rows = Math.max(1, Number(this._config.rows) || 1);
      for (var i = 0; i < rows + 1; i++) {
        var rail = document.createElement('div');
        rail.className = 'cinema-rail';
        rail.style.top = (i / (rows + 1)) * 100 + '%';
        board.appendChild(rail);
      }

      var frame = document.createElement('div');
      frame.className = 'cinema-frame';
      c.appendChild(frame);
    },

    _renderContent: function() {
      var board = this._board;
      var font = this._config.font || this.defaults.font;
      var color = '#' + (this._config.color || 'ffffff');
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));

      if (this._mode === 'sign') {
        var container = document.createElement('div');
        container.className = 'cinema-tile-container';
        var chars = [...this._text];
        chars.forEach(function(ch, i) {
          var tile = document.createElement('div');
          tile.className = 'cinema-tile';
          tile.textContent = ch === ' ' ? '\u00A0' : ch;
          tile.style.animationDelay = (i * 0.05) + 's';
          tile.style.color = color;
          tile.style.fontFamily = font;
          container.appendChild(tile);
        });
        board.appendChild(container);
        this._fitTiles(container);
      } else {
        var track = document.createElement('div');
        track.className = 'cinema-flow-track';
        var speed = (Number(this._config.speed) || 60) / 10;
        var dir = this._config.direction === 'right' ? 'reverse' : 'normal';
        track.style.animation = 'cinema-scroll ' + (15/speed) + 's linear infinite ' + dir;
        
        for (var i = 0; i < 2; i++) {
          var t = document.createElement('span');
          t.className = 'cinema-flow-text';
          t.textContent = this._text + ' ';
          t.style.fontFamily = font;
          t.style.color = color;
          track.appendChild(t);
        }
        board.appendChild(track);
        track.style.fontSize = Math.floor(this._container.clientHeight * 0.4 * scale) + 'px';
      }
    },

    _fitTiles: function(container) {
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
      var fSize = TextEngine.autoFit(this._text, this._container, {
        fontFamily: this._config.font || this.defaults.font,
        padding: this._container.clientWidth * 0.15
      });
      container.style.setProperty('--cinema-font-size', Math.floor(fSize * scale) + 'px');
      container.style.setProperty('--cinema-tile-width', Math.floor(fSize * 0.8 * scale) + 'px');
    },

    _onResize: function() {
      this._buildLayout();
      this._renderContent();
    },

    togglePause: function() {
      this._paused = !this._paused;
      var track = this._container.querySelector('.cinema-flow-track');
      if (track) track.style.animationPlayState = this._paused ? 'paused' : 'running';
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this._container.classList.remove('theme-cinema');
      this._container.innerHTML = '';
    }
  };

  TextManager.register(CinemaTheme);

})(typeof window !== 'undefined' ? window : this);

