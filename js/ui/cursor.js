/**
 * Cursor Auto-hide Module
 * Hides cursor after inactivity
 */
;(function(global) {
  'use strict';

  const DEFAULT_DELAY = 3; // seconds

  const Cursor = {
    _timeout: null,
    _delay: DEFAULT_DELAY * 1000,
    _enabled: true,
    _hidden: false,
    _boundHandlers: null,

    /**
     * Initialize cursor auto-hide
     * @param {Object} config - Configuration
     * @param {number} config.cursor - Delay in seconds (0 to disable, default: 3)
     */
    init(config = {}) {
      const cursorConfig = config.cursor;

      // Parse configuration (integer seconds)
      if (cursorConfig === 0) {
        // Explicitly disabled
        this._enabled = false;
        return;
      }

      if (typeof cursorConfig === 'number' && cursorConfig > 0) {
        // Custom delay
        this._delay = cursorConfig * 1000;
        this._enabled = true;
      } else {
        // Default: enabled with 3s delay
        this._delay = DEFAULT_DELAY * 1000;
        this._enabled = true;
      }

      this._bindEvents();
      this._startTimer();
    },

    /**
     * Bind mouse/touch events
     * @private
     */
    _bindEvents() {
      this._boundHandlers = {
        move: this._onActivity.bind(this),
        down: this._onActivity.bind(this)
      };

      document.addEventListener('mousemove', this._boundHandlers.move);
      document.addEventListener('mousedown', this._boundHandlers.down);
      document.addEventListener('touchstart', this._boundHandlers.down);
    },

    /**
     * Handle user activity
     * @private
     */
    _onActivity() {
      this._showCursor();
      this._resetTimer();
    },

    /**
     * Start hide timer
     * @private
     */
    _startTimer() {
      if (!this._enabled) return;

      this._timeout = setTimeout(() => {
        this._hideCursor();
      }, this._delay);
    },

    /**
     * Reset timer
     * @private
     */
    _resetTimer() {
      if (this._timeout) {
        clearTimeout(this._timeout);
        this._timeout = null;
      }
      this._startTimer();
    },

    /**
     * Hide cursor
     * @private
     */
    _hideCursor() {
      if (this._hidden) return;

      document.body.classList.add('cursor-hidden');
      this._hidden = true;
    },

    /**
     * Show cursor
     * @private
     */
    _showCursor() {
      if (!this._hidden) return;

      document.body.classList.remove('cursor-hidden');
      this._hidden = false;
    },

    /**
     * Enable cursor auto-hide
     * @param {number} delay - Delay in seconds (optional)
     */
    enable(delay) {
      if (delay !== undefined && delay > 0) {
        this._delay = delay * 1000;
      }
      this._enabled = true;

      if (!this._boundHandlers) {
        this._bindEvents();
      }
      this._startTimer();
    },

    /**
     * Disable cursor auto-hide
     */
    disable() {
      this._enabled = false;
      this._showCursor();

      if (this._timeout) {
        clearTimeout(this._timeout);
        this._timeout = null;
      }
    },

    /**
     * Check if enabled
     * @returns {boolean}
     */
    isEnabled() {
      return this._enabled;
    },

    /**
     * Get current delay
     * @returns {number} Delay in seconds
     */
    getDelay() {
      return this._delay / 1000;
    },

    /**
     * Destroy module
     */
    destroy() {
      this.disable();

      if (this._boundHandlers) {
        document.removeEventListener('mousemove', this._boundHandlers.move);
        document.removeEventListener('mousedown', this._boundHandlers.down);
        document.removeEventListener('touchstart', this._boundHandlers.down);
        this._boundHandlers = null;
      }
    }
  };

  // Export
  global.Cursor = Cursor;

})(typeof window !== 'undefined' ? window : this);
