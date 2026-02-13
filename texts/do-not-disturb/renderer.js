/**
 * Do Not Disturb Theme
 * A high-end skeuomorphic "ON AIR" style light box.
 */
;(function(global) {
  'use strict';

  var DoNotDisturbTheme = {
    id: 'do-not-disturb',

    defaults: {
      color: 'ffffff',   // Text color
      bg: '1a1a1a',      // Page background
      fill: '990000',    // Glass panel background
      glow: 'ff0000',    // Text glow / outline color
      font: '',
      scale: 1
    },

    _container: null,
    _config: null,
    _resizeHandler: null,
    _textEl: null,
    _glassEl: null,

    init(container, text, config) {
      this._container = container;
      this._config = config;

      container.classList.add('theme-do-not-disturb');

      // Setup DOM structure
      // <div class="dnd-box">
      //   <div class="dnd-glass">
      //     <div class="dnd-text">TEXT</div>
      //   </div>
      //   <div class="dnd-indicators">...</div>
      // </div>
      
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));

      var wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      if (scale < 1) {
        wrapper.style.height = 'auto';
        wrapper.style.transform = 'scale(' + scale + ')';
        wrapper.style.transformOrigin = 'center center';
        container.style.background = 'transparent';
        if (config.bg && config.bg !== this.defaults.bg) {
          container.style.backgroundColor = '#' + config.bg;
        }
      } else {
        wrapper.style.height = '100%';
      }

      var box = document.createElement('div');
      box.className = 'dnd-box' + (scale < 1 ? ' dnd-scaled' : '');
      
      var glass = document.createElement('div');
      glass.className = 'dnd-glass';
      this._glassEl = glass;
      
      // Add screws
      ['tl', 'tr', 'bl', 'br'].forEach(function(pos) {
        var screw = document.createElement('div');
        screw.className = 'dnd-screw screw-' + pos;
        box.appendChild(screw);
      });
      
      var textEl = document.createElement('div');
      textEl.className = 'dnd-text';
      textEl.textContent = text;
      if (config.font) textEl.style.fontFamily = config.font;
      this._textEl = textEl;
      
      var indicators = document.createElement('div');
      indicators.className = 'dnd-indicators';
      for (var i = 0; i < 3; i++) {
        var dot = document.createElement('div');
        dot.className = 'dnd-indicator' + (i === 0 ? ' active' : '');
        indicators.appendChild(dot);
      }
      
      glass.appendChild(textEl);
      box.appendChild(glass);
      box.appendChild(indicators);
      wrapper.appendChild(box);
      container.appendChild(wrapper);

      this._fitText(textEl, text, config);

      this._resizeHandler = function() {
        this._fitText(textEl, text, config);
      }.bind(this);
      window.addEventListener('resize', this._resizeHandler);
      
      // Apply configuration
      container.style.setProperty('--dnd-text-color', '#' + (config.color || this.defaults.color));
      container.style.setProperty('--dnd-color', '#' + (config.glow || this.defaults.glow));
      container.style.setProperty('--dnd-color-bg', '#' + (config.fill || this.defaults.fill));

      if (config.bg) {
        container.style.setProperty('--dnd-bg', '#' + config.bg);
      }
    },

    _fitText(el, text, config) {
      var glass = this._glassEl;
      var scale = Math.max(0.1, Math.min(1, Number(config.scale) || 1));
      // Use glass dimensions minus padding (40px each side) and extra margin for inset shadow
      var w = glass.clientWidth - 120;  // 60px each side
      // When scaled, height is auto — only constrain by width
      var h = scale < 1 ? Infinity : glass.clientHeight - 40;  // 20px each side

      if (w <= 0) return;

      // Measure with letter-spacing and uppercase to match CSS rendering
      var displayText = text.toUpperCase();
      var fontFamily = config.font || "'Inter', sans-serif";

      var measurer = document.createElement('span');
      measurer.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:-9999px;'
        + 'font-family:' + fontFamily + ';font-weight:900;letter-spacing:0.1em;';
      measurer.textContent = displayText;
      document.body.appendChild(measurer);

      var lo = 10, hi = 2000;
      while (hi - lo > 1) {
        var mid = Math.floor((lo + hi) / 2);
        measurer.style.fontSize = mid + 'px';
        if (measurer.offsetWidth <= w && measurer.offsetHeight <= h) {
          lo = mid;
        } else {
          hi = mid;
        }
      }
      document.body.removeChild(measurer);

      el.style.fontSize = lo + 'px';
    },

    destroy() {
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
        this._resizeHandler = null;
      }
      this._container = null;
      this._textEl = null;
      this._glassEl = null;
      this._config = null;
    }
  };

  TextManager.register(DoNotDisturbTheme);

})(typeof window !== 'undefined' ? window : this);
