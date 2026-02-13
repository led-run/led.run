/**
 * Audio Engine
 * Web Audio API pipeline for microphone input analysis
 * getUserMedia → AudioContext → MediaStreamSource → AnalyserNode
 */
;(function(global) {
  'use strict';

  var AudioEngine = {
    _context: null,
    _analyser: null,
    _source: null,
    _stream: null,
    _running: false,
    _gestureHandler: null,

    /**
     * Check if Web Audio API and getUserMedia are supported
     * @returns {boolean}
     */
    isSupported: function() {
      return !!(
        (window.AudioContext || window.webkitAudioContext) &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      );
    },

    /**
     * Initialize audio pipeline — requests microphone permission
     * @param {Object} options
     * @param {number} options.fftSize - FFT size (default 2048)
     * @param {number} options.smoothingTimeConstant - Smoothing (0–1, default 0.8)
     * @returns {Promise} Resolves when audio pipeline is connected (context may still be suspended)
     */
    init: function(options) {
      var self = this;
      options = options || {};
      var fftSize = options.fftSize || 2048;
      var smoothing = options.smoothingTimeConstant !== undefined ? options.smoothingTimeConstant : 0.8;

      return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
          self._stream = stream;

          var AudioCtx = window.AudioContext || window.webkitAudioContext;
          self._context = new AudioCtx();

          self._source = self._context.createMediaStreamSource(stream);

          self._analyser = self._context.createAnalyser();
          self._analyser.fftSize = fftSize;
          self._analyser.smoothingTimeConstant = smoothing;

          self._source.connect(self._analyser);
          self._running = true;

          // Chrome autoplay policy: context may start suspended when there is
          // no user gesture (e.g. mic permission was previously saved).
          // Attempt resume now; install gesture listeners as fallback.
          if (self._context.state !== 'running') {
            self._context.resume();
            self._listenForGesture();
          }
        });
    },

    /**
     * Listen for first user gesture to resume a suspended AudioContext.
     * Standard workaround for Chrome autoplay policy — context.resume()
     * must be called during a user-initiated event to reliably transition
     * from 'suspended' to 'running'.
     * @private
     */
    _listenForGesture: function() {
      var self = this;
      function onGesture() {
        if (self._context && self._context.state !== 'running') {
          self._context.resume();
        }
        document.removeEventListener('click', onGesture, true);
        document.removeEventListener('touchstart', onGesture, true);
        document.removeEventListener('keydown', onGesture, true);
        self._gestureHandler = null;
      }
      document.addEventListener('click', onGesture, true);
      document.addEventListener('touchstart', onGesture, true);
      document.addEventListener('keydown', onGesture, true);
      self._gestureHandler = onGesture;
    },

    /**
     * Get frequency domain data (spectrum)
     * @returns {Uint8Array} Frequency data array
     */
    getFrequencyData: function() {
      if (!this._analyser) return new Uint8Array(0);
      var data = new Uint8Array(this._analyser.frequencyBinCount);
      this._analyser.getByteFrequencyData(data);
      return data;
    },

    /**
     * Get time domain data (waveform)
     * @returns {Uint8Array} Time domain data array
     */
    getTimeDomainData: function() {
      if (!this._analyser) return new Uint8Array(0);
      var data = new Uint8Array(this._analyser.frequencyBinCount);
      this._analyser.getByteTimeDomainData(data);
      return data;
    },

    /**
     * Get the number of frequency bins
     * @returns {number}
     */
    getBinCount: function() {
      return this._analyser ? this._analyser.frequencyBinCount : 0;
    },

    /**
     * Get sample rate
     * @returns {number}
     */
    getSampleRate: function() {
      return this._context ? this._context.sampleRate : 0;
    },

    /**
     * Update analyser settings
     * @param {Object} options
     * @param {number} options.fftSize
     * @param {number} options.smoothingTimeConstant
     */
    updateSettings: function(options) {
      if (!this._analyser) return;
      if (options.fftSize !== undefined) {
        this._analyser.fftSize = options.fftSize;
      }
      if (options.smoothingTimeConstant !== undefined) {
        this._analyser.smoothingTimeConstant = options.smoothingTimeConstant;
      }
    },

    /**
     * Pause audio processing (suspend AudioContext)
     * @returns {Promise}
     */
    pause: function() {
      if (this._context && this._context.state === 'running') {
        this._running = false;
        return this._context.suspend();
      }
      return Promise.resolve();
    },

    /**
     * Resume audio processing
     * @returns {Promise}
     */
    resume: function() {
      if (this._context && this._context.state === 'suspended') {
        var self = this;
        return this._context.resume().then(function() {
          self._running = true;
        });
      }
      return Promise.resolve();
    },

    /**
     * Check if audio pipeline is running
     * @returns {boolean}
     */
    isRunning: function() {
      return this._running && this._context && this._context.state === 'running';
    },

    /**
     * Destroy audio pipeline and release microphone
     */
    destroy: function() {
      this._running = false;

      if (this._gestureHandler) {
        document.removeEventListener('click', this._gestureHandler, true);
        document.removeEventListener('touchstart', this._gestureHandler, true);
        document.removeEventListener('keydown', this._gestureHandler, true);
        this._gestureHandler = null;
      }

      if (this._source) {
        this._source.disconnect();
        this._source = null;
      }

      if (this._analyser) {
        this._analyser = null;
      }

      if (this._context) {
        this._context.close().catch(function() {});
        this._context = null;
      }

      if (this._stream) {
        this._stream.getTracks().forEach(function(track) {
          track.stop();
        });
        this._stream = null;
      }
    }
  };

  // Export
  global.AudioEngine = AudioEngine;

})(typeof window !== 'undefined' ? window : this);
