/**
 * Time Manager
 * Clock theme registration, switching, and lifecycle management
 */
;(function(global) {
  'use strict';

  var POSITIONS = {
    'center':       { ai: 'center',     jc: 'center' },
    'top':          { ai: 'center',     jc: 'flex-start' },
    'bottom':       { ai: 'center',     jc: 'flex-end' },
    'top-left':     { ai: 'flex-start', jc: 'flex-start' },
    'top-right':    { ai: 'flex-end',   jc: 'flex-start' },
    'bottom-left':  { ai: 'flex-start', jc: 'flex-end' },
    'bottom-right': { ai: 'flex-end',   jc: 'flex-end' }
  };

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

      // Scale/position/padding wrapper
      var scale = Math.max(0.1, Math.min(3, parseFloat(mergedConfig.scale) || 1));
      var padding = Math.max(0, Math.min(20, parseFloat(mergedConfig.padding) || 0));
      var position = mergedConfig.position || 'center';
      var needsWrapper = scale !== 1 || padding > 0;
      var target = container;

      if (needsWrapper) {
        var bg = mergedConfig.bg || (clock.defaults && clock.defaults.bg) || '000000';
        var pos = POSITIONS[position] || POSITIONS['center'];
        container.style.background = '#' + bg;
        container.style.display = 'flex';
        container.style.alignItems = pos.ai;
        container.style.justifyContent = pos.jc;
        container.style.overflow = 'hidden';
        if (padding > 0) container.style.padding = padding + '%';

        var wrapper = document.createElement('div');
        wrapper.style.width = (scale * 100) + '%';
        wrapper.style.height = (scale * 100) + '%';
        wrapper.style.flexShrink = '0';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        container.appendChild(wrapper);
        target = wrapper;
      }

      // Initialize clock
      if (clock.init) {
        clock.init(target, mergedConfig);
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
