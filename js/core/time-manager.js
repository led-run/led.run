/**
 * Time Manager
 * Clock theme registration, switching, and lifecycle management
 */
;(function(global) {
  'use strict';

  var TimeManager = {
    _clocks: new Map(),
    _current: null,
    _currentId: null,
    _currentConfig: null,

    /**
     * Register a clock theme
     * @param {Object} clock - Clock object with id, defaults, init, destroy
     */
    register: function(clock) {
      if (!clock || !clock.id) {
        console.error('Clock theme must have an id property');
        return;
      }
      this._clocks.set(clock.id, clock);
    },

    /**
     * Switch to a clock theme
     * @param {string} clockId - Clock ID
     * @param {HTMLElement} container - Container element
     * @param {Object} config - Merged configuration (URL params override clock defaults)
     */
    switch: function(clockId, container, config) {
      config = config || {};

      // Destroy current clock
      if (this._current && this._current.destroy) {
        this._current.destroy();
      }

      // Clear container
      container.innerHTML = '';
      container.className = '';

      // Get clock (fall back to digital)
      var clock = this._clocks.get(clockId);
      if (!clock) {
        console.warn('Clock theme "' + clockId + '" not found, using digital');
        clock = this._clocks.get('digital');
      }

      if (!clock) {
        console.error('No clock themes registered');
        return;
      }

      this._current = clock;
      this._currentId = clock.id;

      // Merge config: URL params > clock defaults
      var mergedConfig = Object.assign({}, clock.defaults || {}, config);
      this._currentConfig = mergedConfig;

      // Initialize clock
      if (clock.init) {
        clock.init(container, mergedConfig);
      }
    },

    /**
     * Get current clock
     * @returns {Object|null}
     */
    getCurrent: function() {
      return this._current;
    },

    /**
     * Get current clock ID
     * @returns {string|null}
     */
    getCurrentId: function() {
      return this._currentId;
    },

    /**
     * Get all registered clock IDs
     * @returns {string[]}
     */
    getClockIds: function() {
      return Array.from(this._clocks.keys());
    },

    /**
     * Check if clock is registered
     * @param {string} clockId - Clock ID
     * @returns {boolean}
     */
    hasClock: function(clockId) {
      return this._clocks.has(clockId);
    },

    /**
     * Notify the current clock that the container dimensions changed
     */
    resize: function() {
      if (this._current && typeof this._current._resizeHandler === 'function') {
        this._current._resizeHandler();
      }
    },

    /**
     * Get a clock's default configuration
     * @param {string} clockId - Clock ID
     * @returns {Object|null} Copy of clock defaults, or null if not found
     */
    getDefaults: function(clockId) {
      var clock = this._clocks.get(clockId);
      if (!clock) return null;
      return Object.assign({}, clock.defaults || {});
    },

    /**
     * Get the current merged configuration
     * @returns {Object|null} Copy of current config
     */
    getCurrentConfig: function() {
      if (!this._currentConfig) return null;
      return Object.assign({}, this._currentConfig);
    }
  };

  // Export
  global.TimeManager = TimeManager;

})(typeof window !== 'undefined' ? window : this);
