/**
 * Wake Lock Module
 * Prevents screen from sleeping using Screen Wake Lock API
 */
;(function(global) {
  'use strict';

  const WakeLock = {
    _wakeLock: null,
    _enabled: true,

    /**
     * Initialize wake lock
     * @param {Object} config - Configuration
     * @param {boolean} config.wakelock - Enable/disable (default: true)
     */
    init(config = {}) {
      // Default enabled, explicitly set to false to disable
      this._enabled = config.wakelock !== false;

      if (!this._enabled) return;

      this._acquire();
      this._bindVisibilityChange();
    },

    /**
     * Check if Wake Lock API is supported
     * @returns {boolean}
     */
    isSupported() {
      return 'wakeLock' in navigator;
    },

    /**
     * Acquire wake lock
     * @private
     */
    async _acquire() {
      if (!this.isSupported() || !this._enabled) return;

      try {
        this._wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        // Wake lock request failed (e.g., low battery, not visible)
        // Silently ignore
      }
    },

    /**
     * Release wake lock
     * @private
     */
    async _release() {
      if (this._wakeLock) {
        try {
          await this._wakeLock.release();
        } catch (err) {
          // Already released
        }
        this._wakeLock = null;
      }
    },

    /**
     * Handle visibility change (re-acquire on page focus)
     * @private
     */
    _bindVisibilityChange() {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this._enabled) {
          this._acquire();
        }
      });
    },

    /**
     * Enable wake lock
     */
    enable() {
      this._enabled = true;
      this._acquire();
    },

    /**
     * Disable wake lock
     */
    disable() {
      this._enabled = false;
      this._release();
    },

    /**
     * Check if enabled
     * @returns {boolean}
     */
    isEnabled() {
      return this._enabled;
    },

    /**
     * Check if wake lock is currently active
     * @returns {boolean}
     */
    isActive() {
      return this._wakeLock !== null;
    },

    /**
     * Destroy module
     */
    destroy() {
      this._release();
    }
  };

  // Export
  global.WakeLock = WakeLock;

})(typeof window !== 'undefined' ? window : this);
