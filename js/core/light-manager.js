/**
 * Light Manager
 * Light effect registration, switching, and lifecycle management
 */
;(function(global) {
  'use strict';

  const LightManager = {
    _effects: new Map(),
    _current: null,
    _currentId: null,
    _currentConfig: null,

    /**
     * Register a light effect
     * @param {Object} effect - Effect object with id, defaults, init, destroy
     */
    register(effect) {
      if (!effect || !effect.id) {
        console.error('Light effect must have an id property');
        return;
      }
      this._effects.set(effect.id, effect);
    },

    /**
     * Switch to an effect
     * @param {string} effectId - Effect ID
     * @param {HTMLElement} container - Container element
     * @param {Object} config - Merged configuration (URL params override effect defaults)
     */
    switch(effectId, container, config) {
      config = config || {};

      // Destroy current effect
      if (this._current && this._current.destroy) {
        this._current.destroy();
      }

      // Clear container
      container.innerHTML = '';
      container.className = '';

      // Get effect (fall back to solid)
      var effect = this._effects.get(effectId);
      if (!effect) {
        console.warn('Light effect "' + effectId + '" not found, using solid');
        effect = this._effects.get('solid');
      }

      if (!effect) {
        console.error('No light effects registered');
        return;
      }

      this._current = effect;
      this._currentId = effect.id;

      // Merge config: URL params > effect defaults
      var mergedConfig = Object.assign({}, effect.defaults || {}, config);
      this._currentConfig = mergedConfig;

      // Initialize effect
      if (effect.init) {
        effect.init(container, mergedConfig);
      }
    },

    /**
     * Get current effect
     * @returns {Object|null}
     */
    getCurrent() {
      return this._current;
    },

    /**
     * Get current effect ID
     * @returns {string|null}
     */
    getCurrentId() {
      return this._currentId;
    },

    /**
     * Get all registered effect IDs
     * @returns {string[]}
     */
    getEffectIds() {
      return Array.from(this._effects.keys());
    },

    /**
     * Check if effect is registered
     * @param {string} effectId - Effect ID
     * @returns {boolean}
     */
    hasEffect(effectId) {
      return this._effects.has(effectId);
    },

    /**
     * Notify the current effect that the container dimensions changed.
     */
    resize() {
      if (this._current && typeof this._current._resizeHandler === 'function') {
        this._current._resizeHandler();
      }
    },

    /**
     * Get an effect's default configuration
     * @param {string} effectId - Effect ID
     * @returns {Object|null} Copy of effect defaults, or null if not found
     */
    getDefaults(effectId) {
      var effect = this._effects.get(effectId);
      if (!effect) return null;
      return Object.assign({}, effect.defaults || {});
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
  global.LightManager = LightManager;

})(typeof window !== 'undefined' ? window : this);
