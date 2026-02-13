/**
 * Sound Manager
 * Sound visualizer registration, switching, and lifecycle management
 */
;(function(global) {
  'use strict';

  const SoundManager = {
    _visualizers: new Map(),
    _current: null,
    _currentId: null,
    _currentConfig: null,

    /**
     * Register a sound visualizer
     * @param {Object} viz - Visualizer object with id, defaults, init, destroy
     */
    register(viz) {
      if (!viz || !viz.id) {
        console.error('Sound visualizer must have an id property');
        return;
      }
      this._visualizers.set(viz.id, viz);
    },

    /**
     * Switch to a visualizer
     * @param {string} vizId - Visualizer ID
     * @param {HTMLElement} container - Container element
     * @param {Object} config - Merged configuration (URL params override viz defaults)
     * @param {Object} audioEngine - AudioEngine instance for frequency/time data
     */
    switch(vizId, container, config, audioEngine) {
      config = config || {};

      // Destroy current visualizer
      if (this._current && this._current.destroy) {
        this._current.destroy();
      }

      // Clear container
      container.innerHTML = '';
      container.className = '';

      // Get visualizer (fall back to bars)
      var viz = this._visualizers.get(vizId);
      if (!viz) {
        console.warn('Sound visualizer "' + vizId + '" not found, using bars');
        viz = this._visualizers.get('bars');
      }

      if (!viz) {
        console.error('No sound visualizers registered');
        return;
      }

      this._current = viz;
      this._currentId = viz.id;

      // Merge config: URL params > viz defaults
      var mergedConfig = Object.assign({}, viz.defaults || {}, config);
      this._currentConfig = mergedConfig;

      // Initialize visualizer with audio engine
      if (viz.init) {
        viz.init(container, mergedConfig, audioEngine);
      }
    },

    /**
     * Get current visualizer
     * @returns {Object|null}
     */
    getCurrent() {
      return this._current;
    },

    /**
     * Get current visualizer ID
     * @returns {string|null}
     */
    getCurrentId() {
      return this._currentId;
    },

    /**
     * Get all registered visualizer IDs
     * @returns {string[]}
     */
    getVisualizerIds() {
      return Array.from(this._visualizers.keys());
    },

    /**
     * Check if visualizer is registered
     * @param {string} vizId - Visualizer ID
     * @returns {boolean}
     */
    hasVisualizer(vizId) {
      return this._visualizers.has(vizId);
    },

    /**
     * Notify the current visualizer that the container dimensions changed.
     */
    resize() {
      if (this._current && typeof this._current._resizeHandler === 'function') {
        this._current._resizeHandler();
      }
    },

    /**
     * Get a visualizer's default configuration
     * @param {string} vizId - Visualizer ID
     * @returns {Object|null} Copy of viz defaults, or null if not found
     */
    getDefaults(vizId) {
      var viz = this._visualizers.get(vizId);
      if (!viz) return null;
      return Object.assign({}, viz.defaults || {});
    },

    /**
     * Get the current merged configuration
     * @returns {Object|null} Copy of current config
     */
    getCurrentConfig() {
      if (!this._currentConfig) return null;
      return Object.assign({}, this._currentConfig);
    }
  };

  // Export
  global.SoundManager = SoundManager;

})(typeof window !== 'undefined' ? window : this);
