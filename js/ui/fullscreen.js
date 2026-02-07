/**
 * Fullscreen Control Module
 * Provides cross-browser fullscreen API wrapper
 */
;(function(global) {
  'use strict';

  const Fullscreen = {
    /**
     * Check if fullscreen is supported
     * @returns {boolean}
     */
    isSupported() {
      return !!(
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled
      );
    },

    /**
     * Check if currently in fullscreen
     * @returns {boolean}
     */
    isActive() {
      return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
    },

    /**
     * Enter fullscreen
     * @param {Element} element - Element to make fullscreen, defaults to documentElement
     * @returns {Promise}
     */
    enter(element) {
      const el = element || document.documentElement;

      if (el.requestFullscreen) {
        return el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        return el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        return el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        return el.msRequestFullscreen();
      }

      return Promise.reject(new Error('Fullscreen API not available'));
    },

    /**
     * Exit fullscreen
     * @returns {Promise}
     */
    exit() {
      if (document.exitFullscreen) {
        return document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        return document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        return document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        return document.msExitFullscreen();
      }

      return Promise.reject(new Error('Fullscreen API not available'));
    },

    /**
     * Toggle fullscreen state
     * @param {Element} element - Element to make fullscreen
     * @returns {Promise}
     */
    toggle(element) {
      if (this.isActive()) {
        return this.exit();
      } else {
        return this.enter(element);
      }
    },

    /**
     * Listen to fullscreen state changes
     * @param {Function} callback - Callback function (isFullscreen) => void
     * @returns {Function} Unsubscribe function
     */
    onChange(callback) {
      const handler = () => {
        callback(this.isActive());
      };

      const events = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
      ];

      events.forEach(event => {
        document.addEventListener(event, handler);
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handler);
        });
      };
    }
  };

  // Export
  global.Fullscreen = Fullscreen;

})(typeof window !== 'undefined' ? window : this);
