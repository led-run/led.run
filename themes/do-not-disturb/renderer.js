/**
 * Do Not Disturb Theme
 * A high-end skeuomorphic "ON AIR" style light box.
 */
;(function(global) {
  'use strict';

  var DoNotDisturbTheme = {
    id: 'do-not-disturb',

    defaults: {
      color: 'ff0000', // Primary glow color
      bg: '1a1a1a',    // Page background
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
      wrapper.style.height = '100%';
      if (scale < 1) {
        wrapper.style.transform = 'scale(' + scale + ')';
        wrapper.style.transformOrigin = 'center center';
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
      if (config.color) {
        var color = '#' + config.color;
        container.style.setProperty('--dnd-color', color);
        
        // Use the color with opacity for the glass background spill effect
        // or a darkened version. Here we just use the same variable and
        // let CSS handle the 'glass' look.
        container.style.setProperty('--dnd-color-bg', color);
      }
      
      if (config.bg) {
        container.style.setProperty('--dnd-bg', '#' + config.bg);
      }
    },

    _fitText(el, text, config) {
      var w = this._container.clientWidth * 0.8;
      var h = this._container.clientHeight * 0.6;

      var tempContainer = {
        clientWidth: w,
        clientHeight: h
      };

      var fontSize = TextEngine.autoFit(text, tempContainer, {
        fontFamily: config.font || "'Inter', sans-serif",
        fontWeight: '900',
        padding: 40
      });

      fontSize = Math.min(fontSize, this._container.clientHeight * 0.4);
      el.style.fontSize = fontSize + 'px';
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

  ThemeManager.register(DoNotDisturbTheme);

})(typeof window !== 'undefined' ? window : this);
