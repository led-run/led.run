;(function(global) {
  'use strict';

  var Strobe = {
    id: 'strobe',
    defaults: { color: 'ffffff', speed: 5, bg: '000000' },

    _container: null,
    _intervalId: null,
    _isOn: false,

    init: function(container, config) {
      this._container = container;
      this._isOn = false;

      var color = '#' + (config.color || this.defaults.color);
      var bg = '#' + (config.bg || this.defaults.bg);
      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;

      // Clamp speed to 1-20 flashes per second
      speed = Math.max(1, Math.min(20, speed));

      var intervalMs = Math.round(1000 / speed / 2);
      var self = this;

      container.style.background = bg;

      self._intervalId = setInterval(function() {
        self._isOn = !self._isOn;
        container.style.background = self._isOn ? color : bg;
      }, intervalMs);
    },

    destroy: function() {
      if (this._intervalId != null) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      if (this._container) {
        this._container.style.background = '';
        this._container = null;
      }
      this._isOn = false;
    }
  };

  global.LightManager.register(Strobe);
})(typeof window !== 'undefined' ? window : this);
