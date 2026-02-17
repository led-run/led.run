/**
 * Camera Manager
 * Camera effect registration, switching, and lifecycle management
 * Follows SoundManager pattern — switch(effectId, container, config, cameraEngine)
 * Scale/position wrapper follows TimeManager pattern (simplified, no padding/fill)
 * CSS filter (brightness/contrast/saturate) applied at Manager layer
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

  const CameraManager = {
    _effects: new Map(),
    _current: null,
    _currentId: null,
    _currentConfig: null,

    /**
     * Register a camera effect
     * @param {Object} effect - Effect object with id, defaults, init, destroy
     */
    register(effect) {
      if (!effect || !effect.id) {
        console.error('Camera effect must have an id property');
        return;
      }
      this._effects.set(effect.id, effect);
    },

    /**
     * Switch to a camera effect
     * @param {string} effectId - Effect ID
     * @param {HTMLElement} container - Container element
     * @param {Object} config - Merged configuration (URL params override effect defaults)
     * @param {Object} cameraEngine - CameraEngine instance for video frames
     */
    switch(effectId, container, config, cameraEngine) {
      config = config || {};

      // Destroy current effect
      if (this._current && this._current.destroy) {
        this._current.destroy();
      }

      // Clear container
      container.innerHTML = '';
      container.className = '';

      // Get effect (fall back to default)
      var effect = this._effects.get(effectId);
      if (!effect) {
        console.warn('Camera effect "' + effectId + '" not found, using default');
        effect = this._effects.get('default');
      }

      if (!effect) {
        console.error('No camera effects registered');
        return;
      }

      this._current = effect;
      this._currentId = effect.id;

      // Merge config: URL params > effect defaults
      var mergedConfig = Object.assign({}, effect.defaults || {}, config);
      this._currentConfig = mergedConfig;

      // Scale/position wrapper
      var scale = Math.max(0.1, Math.min(3, parseFloat(mergedConfig.scale) || 1));
      var position = mergedConfig.position || 'center';
      var needsWrapper = scale !== 1;
      var target = container;

      if (needsWrapper) {
        var bg = mergedConfig.bg || (effect.defaults && effect.defaults.bg) || '000000';
        var pos = POSITIONS[position] || POSITIONS['center'];
        container.style.background = '#' + bg;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = pos.ai;
        container.style.justifyContent = pos.jc;
        container.style.overflow = 'hidden';

        var wrapper = document.createElement('div');
        wrapper.style.width = (scale * 100) + '%';
        wrapper.style.height = (scale * 100) + '%';
        wrapper.style.flexShrink = '0';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        container.appendChild(wrapper);
        target = wrapper;
      }

      // Initialize effect with camera engine
      if (effect.init) {
        effect.init(target, mergedConfig, cameraEngine);
      }

      // Apply CSS filter (brightness/contrast/saturate) on the target container
      var b = parseFloat(mergedConfig.brightness) || 100;
      var c = parseFloat(mergedConfig.contrast) || 100;
      var s = parseFloat(mergedConfig.saturate) || 100;
      if (b !== 100 || c !== 100 || s !== 100) {
        target.style.filter = 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%)';
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
  global.CameraManager = CameraManager;

})(typeof window !== 'undefined' ? window : this);
