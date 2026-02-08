/**
 * Blueprint Theme
 * Technical / Engineering / Drafting aesthetic
 * Features: Measurement lines, drafting SVG paths, grid labels
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 12;

  var BlueprintTheme = {
    id: 'blueprint',

    defaults: {
      color: 'ffffff',
      bg: '1a3a6c',
      font: '',
      speed: 30,
      direction: 'left',
      scale: 1
    },

    _container: null,
    _config: null,
    _mode: null,
    _resizeHandler: null,
    _paused: false,
    _animationStyle: null,
    _textEl: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;
      this._paused = false;

      container.classList.add('theme-blueprint');

      // Add SVG background layer for drafting lines
      this._addSvgLayer();
      
      // Add Measurements
      this._addMeasurements();

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(container, text, config);
      } else {
        this._initSign(container, text, config);
      }
    },

    _addSvgLayer() {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'blueprint-svg-layer');
        
        // Random drafting lines/circles
        for(var i=0; i<5; i++) {
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            path.setAttribute('class', 'blueprint-path');
            path.setAttribute('cx', Math.random() * 100 + '%');
            path.setAttribute('cy', Math.random() * 100 + '%');
            path.setAttribute('r', (Math.random() * 200 + 50));
            svg.appendChild(path);
        }
        
        this._container.appendChild(svg);
    },

    _addMeasurements() {
        var container = this._container;
        
        // Horizontal top measure
        var hMeasure = document.createElement('div');
        hMeasure.className = 'blueprint-measure blueprint-measure-h';
        hMeasure.style.top = '40px';
        hMeasure.style.left = '10%';
        hMeasure.style.right = '10%';
        
        var hLabel = document.createElement('div');
        hLabel.className = 'blueprint-label';
        hLabel.style.top = '32px';
        hLabel.style.left = '50%';
        hLabel.textContent = 'W: 1920mm';
        
        container.appendChild(hMeasure);
        container.appendChild(hLabel);

        // Vertical left measure
        var vMeasure = document.createElement('div');
        vMeasure.className = 'blueprint-measure blueprint-measure-v';
        vMeasure.style.left = '40px';
        vMeasure.style.top = '10%';
        vMeasure.style.bottom = '10%';
        
        var vLabel = document.createElement('div');
        vLabel.className = 'blueprint-label';
        vLabel.style.left = '25px';
        vLabel.style.top = '50%';
        vLabel.style.writingMode = 'vertical-rl';
        vLabel.textContent = 'H: 1080mm';
        
        container.appendChild(vMeasure);
        container.appendChild(vLabel);
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config) {
      var el = document.createElement('div');
      el.className = 'blueprint-sign-text';
      el.textContent = text;
      if (config.font) el.style.fontFamily = config.font;
      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitText(el, text, config) {
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || "'Architects Daughter', cursive",
        fontWeight: '400',
        padding: 120
      });
      el.style.fontSize = (fontSize * scale) + 'px';
    },

    _initFlow(container, text, config) {
      var track = document.createElement('div');
      track.className = 'blueprint-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'blueprint-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      var flowSize = Math.floor(container.clientHeight * 0.4 * scale);
      track.querySelectorAll('.blueprint-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'blueprint-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 20));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(container.clientHeight * 0.4 * scale);
        track.querySelectorAll('.blueprint-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    togglePause() {
      this._paused = !this._paused;
      if (this._textEl) {
        if (this._mode === 'flow') {
          this._textEl.style.animationPlayState = this._paused ? 'paused' : 'running';
        }
      }
      return this._paused;
    },

    isPaused() {
      return this._paused;
    },

    destroy() {
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      if (this._animationStyle) {
        this._animationStyle.remove();
        this._animationStyle = null;
      }
      this._container = null;
      this._textEl = null;
      this._config = null;
      this._mode = null;
      this._paused = false;
    }
  };

  ThemeManager.register(BlueprintTheme);

})(typeof window !== 'undefined' ? window : this);
