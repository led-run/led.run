/**
 * Gothic Theme
 * Medieval illuminated manuscript page with ornate borders,
 * decorative initials, parchment texture, and optional wax seal
 * Supports SIGN (static) and FLOW (scrolling) modes
 */
;(function(global) {
  'use strict';

  var AUTO_FLOW_THRESHOLD = 10;

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
      seal: false
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

      container.classList.add('theme-gothic');

      var inkColor = '#' + (config.color || this.defaults.color);
      var parchmentColor = '#' + (config.bg || this.defaults.bg);
      var ornate = Math.max(0, Math.min(10, Number(config.ornate) || 7));
      var aged = Math.max(0, Math.min(10, Number(config.aged) || 5));
      var illuminated = config.illuminated !== false && config.illuminated !== 'false';
      var showSeal = config.seal === true || config.seal === 'true';

      container.style.setProperty('--gothic-ink', inkColor);
      container.style.setProperty('--gothic-parchment', parchmentColor);
      container.style.setProperty('--gothic-ornate', ornate / 10);
      container.style.setProperty('--gothic-aged', aged / 10);
      container.style.backgroundColor = parchmentColor;

      // Parchment background
      var parchment = document.createElement('div');
      parchment.className = 'gothic-parchment';
      container.appendChild(parchment);

      // Aged edge staining
      var edges = document.createElement('div');
      edges.className = 'gothic-edges';
      edges.style.opacity = aged / 10;
      container.appendChild(edges);

      // Vellum texture overlay
      var vellum = document.createElement('div');
      vellum.className = 'gothic-vellum';
      container.appendChild(vellum);

      // Gold-leaf ornate border frame
      if (ornate > 3) {
        var border = document.createElement('div');
        border.className = 'gothic-border';
        container.appendChild(border);

        // Corner flourishes
        ['tl', 'tr', 'bl', 'br'].forEach(function(pos) {
          var flourish = document.createElement('div');
          flourish.className = 'gothic-flourish gothic-flourish-' + pos;
          container.appendChild(flourish);
        });
      }

      // Main content container
      var content = document.createElement('div');
      content.className = 'gothic-content';
      container.appendChild(content);

      // Optional wax seal
      if (showSeal) {
        var seal = document.createElement('div');
        seal.className = 'gothic-seal';
        var sealInner = document.createElement('div');
        sealInner.className = 'gothic-seal-inner';
        seal.appendChild(sealInner);
        container.appendChild(seal);
      }

      this._mode = this._resolveMode(text, config.mode);

      if (this._mode === 'flow') {
        this._initFlow(content, text, config, illuminated);
      } else {
        this._initSign(content, text, config, illuminated);
      }

      // Card-type scale handling
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      if (scale < 1) {
        var scaleWrap = document.createElement('div');
        scaleWrap.style.position = 'relative';
        scaleWrap.style.width = '100%';
        scaleWrap.style.height = '100%';
        scaleWrap.style.transform = 'scale(' + scale + ')';
        scaleWrap.style.transformOrigin = 'center center';
        var cs = window.getComputedStyle(container);
        ['display', 'flexDirection', 'alignItems', 'justifyContent', 'overflow'].forEach(function(p) {
          scaleWrap.style[p] = cs[p];
        });
        while (container.firstChild) scaleWrap.appendChild(container.firstChild);
        container.appendChild(scaleWrap);
        scaleWrap.style.backgroundColor = '#' + (config.fill || this.defaults.fill);
        container.style.background = 'transparent';
        if (config.bg && config.bg !== this.defaults.bg) {
          container.style.backgroundColor = '#' + config.bg;
        }
      }
    },

    _resolveMode(text, modeHint) {
      if (modeHint === 'flow' || modeHint === 'scroll') return 'flow';
      if (modeHint === 'sign' || modeHint === 'static') return 'sign';
      return [...text].length > AUTO_FLOW_THRESHOLD ? 'flow' : 'sign';
    },

    _initSign(container, text, config, illuminated) {
      var el = document.createElement('div');
      el.className = 'gothic-sign-text';
      if (config.font) el.style.fontFamily = config.font;

      // Decorative initial capital (when illuminated=true and text has >1 char)
      if (illuminated && text.length > 1) {
        var initial = document.createElement('span');
        initial.className = 'gothic-initial';
        initial.textContent = text.charAt(0);

        var rest = document.createElement('span');
        rest.className = 'gothic-rest';
        rest.textContent = text.slice(1);

        el.appendChild(initial);
        el.appendChild(rest);
      } else {
        el.textContent = text;
      }

      container.appendChild(el);
      this._textEl = el;

      this._fitText(el, text, config);

      this._resizeHandler = function() {
        this._fitText(el, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    _fitText(el, text, config) {
      var fontSize = TextEngine.autoFit(text, this._container, {
        fontFamily: config.font || this.defaults.font,
        fontWeight: '400',
        padding: Math.max(80, this._container.clientWidth * 0.12)
      });
      el.style.fontSize = fontSize + 'px';

      // Scale initial capital relative to body text
      var initial = el.querySelector('.gothic-initial');
      if (initial) {
        initial.style.fontSize = '1.6em';
        initial.style.lineHeight = '0.85';
      }
    },

    _initFlow(container, text, config, illuminated) {
      var track = document.createElement('div');
      track.className = 'gothic-flow-track';

      for (var i = 0; i < 2; i++) {
        var span = document.createElement('span');
        span.className = 'gothic-flow-text';
        span.textContent = text;
        if (config.font) span.style.fontFamily = config.font;
        track.appendChild(span);
      }

      container.appendChild(track);
      this._textEl = track;

      var speed = config.speed || this.defaults.speed;
      var direction = config.direction || this.defaults.direction;

      var flowSize = Math.floor(this._container.clientHeight * 0.4);
      track.querySelectorAll('.gothic-flow-text').forEach(function(t) {
        t.style.fontSize = flowSize + 'px';
      });

      var animName = 'gothic-flow-scroll';
      var style = document.createElement('style');
      style.textContent =
        '@keyframes ' + animName + ' { from { transform: translateX(0); } to { transform: translateX(' +
        (direction === 'right' ? '50%' : '-50%') + '); } }';
      document.head.appendChild(style);
      this._animationStyle = style;

      var duration = Math.max(5, 200 / (speed / 30));
      track.style.animation = animName + ' ' + duration + 's linear infinite';

      this._resizeHandler = function() {
        var newSize = Math.floor(this._container.clientHeight * 0.4);
        track.querySelectorAll('.gothic-flow-text').forEach(function(t) {
          t.style.fontSize = newSize + 'px';
        });
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
    },

    togglePause() {
      this._paused = !this._paused;
      var state = this._paused ? 'paused' : 'running';

      if (this._textEl) {
        if (this._mode === 'flow') {
          this._textEl.style.animationPlayState = state;
        } else {
          this._textEl.style.opacity = this._paused ? '0.5' : '1';
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

  TextManager.register(GothicTheme);

})(typeof window !== 'undefined' ? window : this);
