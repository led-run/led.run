;(function(global) {
  'use strict';

  var Rainbow = {
    id: 'rainbow',
    defaults: { speed: 3 },

    _container: null,
    _rafId: null,
    _startTime: 0,

    init: function(container, config) {
      this._container = container;

      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      // Clamp speed to 1-10
      speed = Math.max(1, Math.min(10, speed));

      // Full cycle duration in ms: speed 1 = 10s, speed 10 = 1s
      var cycleDuration = (11 - speed) * 1000;

      this._startTime = performance.now();
      var self = this;

      function animate(now) {
        var elapsed = now - self._startTime;
        var hue = Math.round((elapsed % cycleDuration) / cycleDuration * 360);

        container.style.background = 'hsl(' + hue + ', 100%, 50%)';
        self._rafId = requestAnimationFrame(animate);
      }

      this._rafId = requestAnimationFrame(animate);
    },

    destroy: function() {
      if (this._rafId != null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      if (this._container) {
        this._container.style.background = '';
        this._container = null;
      }
    }
  };

  global.LightManager.register(Rainbow);
})(typeof window !== 'undefined' ? window : this);
