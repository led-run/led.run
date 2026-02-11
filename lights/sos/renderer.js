;(function(global) {
  'use strict';

  // SOS Morse code pattern:
  // S = ...  (3 short)
  // O = ---  (3 long)
  // S = ...  (3 short)
  // Timing: short=200ms, long=600ms, gap=200ms, letter gap=600ms, word gap=1400ms

  var SOS = {
    id: 'sos',
    defaults: { color: 'ffffff', bg: '000000' },

    _container: null,
    _timeoutId: null,
    _running: false,
    _color: '',
    _bg: '',

    init: function(container, config) {
      this._container = container;
      this._running = true;

      this._color = '#' + (config.color || this.defaults.color);
      this._bg = '#' + (config.bg || this.defaults.bg);

      container.style.background = this._bg;

      this._playSequence();
    },

    _playSequence: function() {
      if (!this._running) return;

      var self = this;
      var container = this._container;
      var color = this._color;
      var bg = this._bg;

      var SHORT = 200;
      var LONG = 600;
      var GAP = 200;
      var LETTER_GAP = 600;
      var WORD_GAP = 1400;

      // Build a timeline of [on/off, duration] pairs
      var timeline = [];

      // S: dit dit dit
      timeline.push([true, SHORT], [false, GAP]);
      timeline.push([true, SHORT], [false, GAP]);
      timeline.push([true, SHORT], [false, LETTER_GAP]);

      // O: dah dah dah
      timeline.push([true, LONG], [false, GAP]);
      timeline.push([true, LONG], [false, GAP]);
      timeline.push([true, LONG], [false, LETTER_GAP]);

      // S: dit dit dit
      timeline.push([true, SHORT], [false, GAP]);
      timeline.push([true, SHORT], [false, GAP]);
      timeline.push([true, SHORT], [false, WORD_GAP]);

      var index = 0;

      function step() {
        if (!self._running || index >= timeline.length) {
          // Restart the sequence after completing
          if (self._running) {
            self._playSequence();
          }
          return;
        }

        var entry = timeline[index];
        var isOn = entry[0];
        var duration = entry[1];

        container.style.background = isOn ? color : bg;
        index++;

        self._timeoutId = setTimeout(step, duration);
      }

      step();
    },

    destroy: function() {
      this._running = false;
      if (this._timeoutId != null) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
      if (this._container) {
        this._container.style.background = '';
        this._container = null;
      }
    }
  };

  global.LightManager.register(SOS);
})(typeof window !== 'undefined' ? window : this);
