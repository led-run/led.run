;(function(global) {
  'use strict';

  var Emergency = {
    id: 'emergency',
    defaults: { speed: 2 },

    _container: null,
    _intervalId: null,
    _leftEl: null,
    _rightEl: null,
    _phase: false,

    init: function(container, config) {
      this._container = container;
      this._phase = false;

      var speed = config.speed != null ? Number(config.speed) : this.defaults.speed;
      // Clamp speed 1-10, maps to alternation rate
      speed = Math.max(1, Math.min(10, speed));
      var intervalMs = Math.round(1000 / speed / 2);

      // Create left and right halves
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
      container.style.background = '#000000';

      var left = document.createElement('div');
      left.style.position = 'absolute';
      left.style.top = '0';
      left.style.left = '0';
      left.style.width = '50%';
      left.style.height = '100%';
      left.style.background = '#ff0000';
      this._leftEl = left;

      var right = document.createElement('div');
      right.style.position = 'absolute';
      right.style.top = '0';
      right.style.right = '0';
      right.style.width = '50%';
      right.style.height = '100%';
      right.style.background = '#000000';
      this._rightEl = right;

      container.appendChild(left);
      container.appendChild(right);

      var self = this;

      self._intervalId = setInterval(function() {
        self._phase = !self._phase;
        if (self._phase) {
          left.style.background = '#000000';
          right.style.background = '#0000ff';
        } else {
          left.style.background = '#ff0000';
          right.style.background = '#000000';
        }
      }, intervalMs);
    },

    destroy: function() {
      if (this._intervalId != null) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
      if (this._leftEl && this._leftEl.parentNode) {
        this._leftEl.parentNode.removeChild(this._leftEl);
      }
      if (this._rightEl && this._rightEl.parentNode) {
        this._rightEl.parentNode.removeChild(this._rightEl);
      }
      this._leftEl = null;
      this._rightEl = null;
      if (this._container) {
        this._container.style.position = '';
        this._container.style.overflow = '';
        this._container.style.background = '';
        this._container = null;
      }
      this._phase = false;
    }
  };

  global.LightManager.register(Emergency);
})(typeof window !== 'undefined' ? window : this);
