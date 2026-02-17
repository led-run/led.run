/**
 * Stamp Theme - Redesigned
 * Exquisite rubber stamp impressions with advanced ink bleed, 
 * surface smudges, fingerprints, and detailed aged paper textures.
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  var StampTheme = {
    id: 'stamp',

    defaults: {
      color: 'cc2233',
      bg: 'f5f0e0',
      fill: 'f5f0e0',
      font: "'Special Elite', cursive",
      speed: 60,
      direction: 'left',
      scale: 1,
      ink: 7,
      aged: 6,
      smudge: 4,
      paper: 'cream'
    },

    _container: null,
    _config: null,
    _mode: null,
    _paused: false,
    _text: '',
    _resizeHandler: null,

    init: function(container, text, config) {
      this._container = container;
      this._text = text;
      this._config = Object.assign({}, this.defaults, config);
      this._paused = false;

      container.classList.add('theme-stamp');
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
      
      var paper = document.createElement('div');
      paper.className = 'stamp-paper';
      c.appendChild(paper);

      var aging = document.createElement('div');
      aging.className = 'stamp-aging';
      aging.style.opacity = (Number(this._config.aged) || 6) * 0.1;
      c.appendChild(aging);

      // Random Stains
      for (var i = 0; i < 5; i++) {
        var stain = document.createElement('div');
        stain.className = 'stamp-stain';
        stain.style.left = Math.random() * 100 + '%';
        stain.style.top = Math.random() * 100 + '%';
        stain.style.transform = 'scale(' + (Math.random() * 2 + 1) + ')';
        aging.appendChild(stain);
      }

      var area = document.createElement('div');
      area.className = 'stamp-area';
      area.style.transform = 'rotate(' + (Math.random() * 4 - 2) + 'deg)';
      var ink = Math.max(0, Math.min(10, Number(this._config.ink) || 7));
      area.style.opacity = ink * 0.1;
      c.appendChild(area);
      this._area = area;
    },

    _renderContent: function() {
      var area = this._area;
      area.innerHTML = '';
      var font = this._config.font || this.defaults.font;
      var color = '#' + this._config.color;
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));

      var ring = document.createElement('div');
      ring.className = 'stamp-ring';
      ring.style.borderColor = color;
      area.appendChild(ring);

      var content = document.createElement('div');
      content.className = 'stamp-content';
      area.appendChild(content);

      if (this._mode === 'sign') {
        var el = document.createElement('div');
        el.className = 'stamp-sign-text';
        el.style.fontFamily = font;
        el.style.color = color;
        el.textContent = this._text;
        content.appendChild(el);
        this._fitSignText(el);
      } else {
        var track = document.createElement('div');
        track.className = 'stamp-flow-track';
        var speed = (Number(this._config.speed) || 60) / 10;
        var dir = this._config.direction === 'right' ? 'reverse' : 'normal';
        track.style.animation = 'stamp-scroll ' + (15/speed) + 's linear infinite ' + dir;
        
        for (var i = 0; i < 2; i++) {
          var t = document.createElement('span');
          t.className = 'stamp-flow-text';
          t.textContent = this._text + ' ';
          t.style.fontFamily = font;
          t.style.color = color;
          track.appendChild(t);
        }
        content.appendChild(track);
        track.style.fontSize = Math.floor(this._container.clientHeight * 0.35 * scale) + 'px';
      }
    },

    _fitSignText: function(el) {
      var scale = Math.max(0.1, Math.min(1.5, Number(this._config.scale) || 1));
      var fSize = TextEngine.autoFit(this._text, this._container, {
        fontFamily: this._config.font || this.defaults.font,
        fontWeight: '700',
        padding: this._container.clientWidth * 0.25
      });
      el.style.fontSize = Math.floor(fSize * scale) + 'px';
    },

    _onResize: function() {
      this._buildLayout();
      this._renderContent();
    },

    togglePause: function() {
      this._paused = !this._paused;
      var track = this._container.querySelector('.stamp-flow-track');
      if (track) track.style.animationPlayState = this._paused ? 'paused' : 'running';
      return this._paused;
    },

    isPaused: function() {
      return this._paused;
    },

    destroy: function() {
      if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
      this._container.classList.remove('theme-stamp');
      this._container.innerHTML = '';
    }
  };

  TextManager.register(StampTheme);

})(typeof window !== 'undefined' ? window : this);
