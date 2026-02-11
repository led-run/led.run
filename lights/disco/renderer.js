;(function(global) {
  'use strict';

  var Disco = {
    id: 'disco',
    defaults: { colors: 'ff0000,00ff00,0000ff,ffff00,ff00ff,00ffff', speed: 2 },

    _container: null,
    _intervalId: null,
    _colorList: null,
    _index: 0,

    init: function(container, config) {
      this._container = container;
      this._index = 0;

      var colorsStr = config.colors || this.defaults.colors;
      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;

      // Parse comma-separated hex colors
      this._colorList = colorsStr.split(',').map(function(c) {
        return '#' + c.trim();
      });

      if (this._colorList.length === 0) {
        this._colorList = ['#ff0000'];
      }

      // Set up smooth CSS transition
      var transitionDuration = Math.max(0.1, speed * 0.4);
      container.style.transition = 'background-color ' + transitionDuration + 's ease-in-out';
      container.style.backgroundColor = this._colorList[0];

      var intervalMs = Math.max(100, speed * 1000);
      var self = this;

      self._intervalId = setInterval(function() {
        self._index = (self._index + 1) % self._colorList.length;
        container.style.backgroundColor = self._colorList[self._index];
      }, intervalMs);
    },

    destroy: function() {
      if (this._intervalId != null) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      if (this._container) {
        this._container.style.transition = '';
        this._container.style.backgroundColor = '';
        this._container = null;
      }
      this._colorList = null;
      this._index = 0;
    }
  };

  global.LightManager.register(Disco);
})(typeof window !== 'undefined' ? window : this);
