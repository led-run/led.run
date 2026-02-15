/**
 * Retro Clock — CRT terminal style
 * DOM-based with configurable scanlines, vignette, flicker, and prompt
 */
;(function(global) {
  'use strict';

  var Retro = {
    id: 'retro',
    defaults: {
      color: '33ff33',
      bg: '000000',
      format: '24h',
      showSeconds: true,
      showDate: true,
      dateFormat: 'YMD',
      scanlines: true,
      vignette: 6,
      flicker: 2,
      prompt: 'default'
    },

    _container: null,
    _timeEl: null,
    _dateEl: null,
    _promptEl: null,
    _scanlines: null,
    _vignetteEl: null,
    _timer: null,
    _config: null,
    _raf: null,

    init: function(container, config) {
      this._container = container;
      this._config = config;

      var bg = config.bg || this.defaults.bg;
      var color = config.color || this.defaults.color;
      var showScanlines = config.scanlines !== false;
      var vignetteLevel = config.vignette !== undefined ? config.vignette : this.defaults.vignette;
      var promptStyle = config.prompt || this.defaults.prompt;

      // Container-relative sizing
      var cw = container.clientWidth;
      var ch = container.clientHeight;
      function s(xPct, yPct) {
        return Math.min(cw * xPct / 100, ch * (yPct !== undefined ? yPct : xPct) / 100) + 'px';
      }

      container.style.background = '#' + bg;
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.fontFamily = '"JetBrains Mono", "Courier New", monospace';
      container.style.overflow = 'hidden';
      container.style.position = 'relative';

      // Scanlines overlay
      if (showScanlines) {
        this._scanlines = document.createElement('div');
        this._scanlines.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;' +
          'background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px);';
        container.appendChild(this._scanlines);
      }

      // Vignette
      if (vignetteLevel > 0) {
        var vigAlpha = vignetteLevel * 0.08; // 0-10 -> 0-0.8
        this._vignetteEl = document.createElement('div');
        this._vignetteEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;' +
          'background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,' + vigAlpha + ') 100%);';
        container.appendChild(this._vignetteEl);
      }

      // Content wrapper
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;z-index:3;text-align:center;';

      // Prompt line
      if (promptStyle !== 'none') {
        this._promptEl = document.createElement('div');
        this._promptEl.style.color = '#' + color;
        this._promptEl.style.opacity = '0.5';
        this._promptEl.style.fontSize = s(2.5, 3);
        this._promptEl.style.marginBottom = (ch * 2 / 100) + 'px';
        wrapper.appendChild(this._promptEl);
      }

      // Time
      this._timeEl = document.createElement('div');
      this._timeEl.style.color = '#' + color;
      this._timeEl.style.fontSize = s(16, 24);
      this._timeEl.style.fontWeight = '700';
      this._timeEl.style.lineHeight = '1.1';
      this._timeEl.style.textShadow = '0 0 20px #' + color + ', 0 0 40px #' + color + '60';
      wrapper.appendChild(this._timeEl);

      // Date
      if (config.showDate !== false) {
        this._dateEl = document.createElement('div');
        this._dateEl.style.color = '#' + color;
        this._dateEl.style.opacity = '0.5';
        this._dateEl.style.fontSize = s(3, 3.5);
        this._dateEl.style.marginTop = (ch * 2 / 100) + 'px';
        this._dateEl.style.fontWeight = '400';
        wrapper.appendChild(this._dateEl);
      }

      container.appendChild(wrapper);
      this._wrapper = wrapper;

      // CRT flicker via RAF
      var flickerLevel = config.flicker !== undefined ? config.flicker : this.defaults.flicker;
      if (flickerLevel > 0) {
        var self = this;
        function flickerLoop() {
          if (!self._wrapper) return;
          var range = flickerLevel * 0.01; // 0-10 -> 0-0.1
          var opacity = 1 - range + Math.random() * range;
          self._wrapper.style.opacity = opacity;
          self._raf = requestAnimationFrame(flickerLoop);
        }
        flickerLoop();
      }

      var self2 = this;
      this._timer = setInterval(function() { self2._render(); }, 500);
      this._render();
    },

    _render: function() {
      if (!this._timeEl) return;
      var c = this._config;
      var now = TimeUtils.getTime(c.tz);
      var h = TimeUtils.formatHours(now, c.format);
      var m = TimeUtils.padZero(now.getMinutes());
      var s = TimeUtils.padZero(now.getSeconds());

      var timeStr = TimeUtils.padZero(h) + ':' + m;
      if (c.showSeconds !== false) timeStr += ':' + s;
      this._timeEl.textContent = timeStr;

      if (this._dateEl) {
        this._dateEl.textContent = '[ ' + TimeUtils.formatDate(now, c.dateFormat) + ' ]';
      }

      // Prompt with cursor blink
      if (this._promptEl) {
        var promptStyle = c.prompt || this.defaults.prompt;
        var ms = now.getMilliseconds();
        var cursor = ms < 500 ? '\u2588' : ' ';
        if (promptStyle === 'minimal') {
          this._promptEl.textContent = '$ ' + cursor;
        } else {
          this._promptEl.textContent = '> system.clock --display ' + cursor;
        }
      }
    },

    _resizeHandler: function() {
      var container = this._container;
      var config = this._config;
      this.destroy();
      container.innerHTML = '';
      this.init(container, config);
    },

    destroy: function() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
      this._timeEl = null;
      this._dateEl = null;
      this._promptEl = null;
      this._scanlines = null;
      this._vignetteEl = null;
      this._wrapper = null;
      this._container = null;
    }
  };

  global.TimeManager.register(Retro);
})(typeof window !== 'undefined' ? window : this);
