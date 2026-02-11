;(function(global) {
  'use strict';

  var Solid = {
    id: 'solid',
    defaults: { color: 'ffffff', brightness: 100 },

    _container: null,

    init: function(container, config) {
      this._container = container;
      var color = config.color || this.defaults.color;
      var brightness = config.brightness != null ? config.brightness : this.defaults.brightness;

      // Clamp brightness to 0-100
      brightness = Math.max(0, Math.min(100, Number(brightness)));

      var opacity = brightness / 100;
      var r = parseInt(color.substring(0, 2), 16);
      var g = parseInt(color.substring(2, 4), 16);
      var b = parseInt(color.substring(4, 6), 16);

      container.style.background = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
    },

    destroy: function() {
      if (this._container) {
        this._container.style.background = '';
        this._container = null;
      }
    }
  };

  global.LightManager.register(Solid);
})(typeof window !== 'undefined' ? window : this);
