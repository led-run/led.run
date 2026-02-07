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
      font: ''
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
      
      var box = document.createElement('div');
      box.className = 'dnd-box';
      
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
      container.appendChild(box);

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
      // The box should feel like a physical object, so we don't want it to hit the screen edges.
      // We'll fit the text to a virtual container that is 70% of the screen size.
      var vWidth = window.innerWidth * 0.7;
      var vHeight = window.innerHeight * 0.5;
      
      // We simulate this by creating a temporary measurement container
      var tempContainer = {
        clientWidth: vWidth,
        clientHeight: vHeight
      };
      
      var fontSize = TextEngine.autoFit(text, tempContainer, {
        fontFamily: config.font || "'Inter', sans-serif",
        fontWeight: '900',
        padding: 40
      });
      
      // Clamp font size to reasonable limits for this theme
      fontSize = Math.min(fontSize, window.innerHeight * 0.3);
      
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
