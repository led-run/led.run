/**
 * Camera Engine
 * getUserMedia({ video }) pipeline for camera input
 * Hidden <video> + offscreen <canvas> architecture
 */
;(function(global) {
  'use strict';

  var CameraEngine = {
    _video: null,
    _canvas: null,
    _ctx: null,
    _stream: null,
    _running: false,
    _facingMode: 'user',
    _gestureHandler: null,

    /**
     * Check if getUserMedia video is supported
     * @returns {boolean}
     */
    isSupported: function() {
      return !!(
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      );
    },

    /**
     * Initialize camera pipeline — requests camera permission
     * @param {Object} options
     * @param {string} options.facing - 'user' or 'environment' (default 'user')
     * @param {number} options.width - Preferred width (default 640)
     * @param {number} options.height - Preferred height (default 480)
     * @returns {Promise} Resolves when camera pipeline is connected
     */
    init: function(options) {
      var self = this;
      options = options || {};
      this._facingMode = options.facing || 'user';
      var width = options.width || 640;
      var height = options.height || 480;

      var constraints = {
        video: {
          facingMode: this._facingMode,
          width: { ideal: width },
          height: { ideal: height }
        }
      };

      return navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
          self._stream = stream;

          // Create hidden video element
          self._video = document.createElement('video');
          self._video.setAttribute('playsinline', '');
          self._video.setAttribute('autoplay', '');
          self._video.muted = true;
          self._video.style.display = 'none';
          self._video.srcObject = stream;
          document.body.appendChild(self._video);

          return self._video.play().then(function() {
            // Create offscreen canvas for frame capture
            self._canvas = document.createElement('canvas');
            self._canvas.width = self._video.videoWidth || width;
            self._canvas.height = self._video.videoHeight || height;
            self._ctx = self._canvas.getContext('2d');
            self._running = true;
          });
        });
    },

    /**
     * Get the current video frame as canvas ImageData
     * @returns {ImageData|null}
     */
    getFrame: function() {
      if (!this._running || !this._video || !this._ctx) return null;
      // Update canvas size if video dimensions changed
      if (this._canvas.width !== this._video.videoWidth ||
          this._canvas.height !== this._video.videoHeight) {
        this._canvas.width = this._video.videoWidth;
        this._canvas.height = this._video.videoHeight;
      }
      this._ctx.drawImage(this._video, 0, 0);
      return this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    },

    /**
     * Get the video element (for direct drawing)
     * @returns {HTMLVideoElement|null}
     */
    getVideo: function() {
      return this._video;
    },

    /**
     * Get the offscreen canvas
     * @returns {HTMLCanvasElement|null}
     */
    getCanvas: function() {
      return this._canvas;
    },

    /**
     * Get video width
     * @returns {number}
     */
    getVideoWidth: function() {
      return this._video ? this._video.videoWidth : 0;
    },

    /**
     * Get video height
     * @returns {number}
     */
    getVideoHeight: function() {
      return this._video ? this._video.videoHeight : 0;
    },

    /**
     * Switch between front and rear camera
     * @returns {Promise}
     */
    switchCamera: function() {
      var self = this;
      var newFacing = this._facingMode === 'user' ? 'environment' : 'user';

      // Stop current stream
      if (this._stream) {
        this._stream.getTracks().forEach(function(track) { track.stop(); });
      }

      this._facingMode = newFacing;

      var constraints = {
        video: {
          facingMode: newFacing,
          width: { ideal: this._canvas ? this._canvas.width : 640 },
          height: { ideal: this._canvas ? this._canvas.height : 480 }
        }
      };

      return navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
          self._stream = stream;
          self._video.srcObject = stream;
          return self._video.play();
        });
    },

    /**
     * Get current facing mode
     * @returns {string} 'user' or 'environment'
     */
    getFacingMode: function() {
      return this._facingMode;
    },

    /**
     * Check if camera pipeline is running
     * @returns {boolean}
     */
    isRunning: function() {
      return this._running && this._video && !this._video.paused;
    },

    /**
     * Pause camera
     * @returns {Promise}
     */
    pause: function() {
      if (this._video) {
        this._video.pause();
        this._running = false;
      }
      return Promise.resolve();
    },

    /**
     * Resume camera
     * @returns {Promise}
     */
    resume: function() {
      var self = this;
      if (this._video) {
        return this._video.play().then(function() {
          self._running = true;
        });
      }
      return Promise.resolve();
    },

    /**
     * Destroy camera pipeline and release camera
     */
    destroy: function() {
      this._running = false;

      if (this._video) {
        this._video.pause();
        this._video.srcObject = null;
        if (this._video.parentNode) {
          this._video.parentNode.removeChild(this._video);
        }
        this._video = null;
      }

      if (this._stream) {
        this._stream.getTracks().forEach(function(track) {
          track.stop();
        });
        this._stream = null;
      }

      this._canvas = null;
      this._ctx = null;
    }
  };

  // Export
  global.CameraEngine = CameraEngine;

})(typeof window !== 'undefined' ? window : this);
