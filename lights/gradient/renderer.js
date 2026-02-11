;(function(global) {
  'use strict';

  var Gradient = {
    id: 'gradient',
    defaults: { colors: 'ff0000,ff8800,ffff00,00ff00,0088ff,8800ff', speed: 3 },

    _container: null,
    _rafId: null,
    _startTime: 0,

    init: function(container, config) {
      this._container = container;

      var colorsStr = config.colors || this.defaults.colors;
      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;

      // Parse comma-separated hex colors
      var colorList = colorsStr.split(',').map(function(c) {
        return '#' + c.trim();
      });

      if (colorList.length < 2) {
        colorList.push('#000000');
      }

      // Build gradient string — duplicate colors for seamless looping
      var gradientColors = colorList.concat(colorList).join(', ');

      container.style.background = 'linear-gradient(270deg, ' + gradientColors + ')';
      container.style.backgroundSize = '400% 400%';

      this._startTime = performance.now();
      var self = this;

      // Cycle duration in ms (higher speed = faster cycle)
      var cycleDuration = Math.max(500, (11 - Math.min(10, Math.max(1, speed))) * 2000);

      function animate(now) {
        var elapsed = now - self._startTime;
        var progress = (elapsed % cycleDuration) / cycleDuration;
        var posX = Math.round(progress * 100);

        container.style.backgroundPosition = posX + '% 50%';
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
        this._container.style.backgroundSize = '';
        this._container.style.backgroundPosition = '';
        this._container = null;
      }
    }
  };

  global.LightManager.register(Gradient);
})(typeof window !== 'undefined' ? window : this);
