/**
 * Draw Manager
 * Draw theme registration, switching, and lifecycle management
 * Follows CameraManager pattern — switch(themeId, container, config, drawEngine)
 */
;(function(global) {
  'use strict';

  var DrawManager = {
    _themes: new Map(),
    _current: null,
    _currentId: null,
    _currentConfig: null,

    /**
     * Register a draw theme
     * @param {Object} theme - Theme object with id, defaults, init, destroy
     */
    register: function(theme) {
      if (!theme || !theme.id) {
        console.error('Draw theme must have an id property');
        return;
      }
      this._themes.set(theme.id, theme);
    },

    /**
     * Switch to a draw theme
     * @param {string} themeId - Theme ID
     * @param {HTMLElement} container - Container element
     * @param {Object} config - Merged configuration
     * @param {Object} drawEngine - DrawEngine instance
     */
    switch: function(themeId, container, config, drawEngine) {
      config = config || {};

      // Destroy current theme
      if (this._current && this._current.destroy) {
        this._current.destroy();
      }

      // Clear container
      container.innerHTML = '';
      container.className = '';

      // Get theme (fall back to default)
      var theme = this._themes.get(themeId);
      if (!theme) {
        console.warn('Draw theme "' + themeId + '" not found, using default');
        theme = this._themes.get('default');
      }

      if (!theme) {
        console.error('No draw themes registered');
        return;
      }

      this._current = theme;
      this._currentId = theme.id;

      // Merge config: URL params > theme defaults
      var mergedConfig = Object.assign({}, theme.defaults || {}, config);
      this._currentConfig = mergedConfig;

      // Update DrawEngine tool state from config
      if (drawEngine) {
        if (mergedConfig.color) drawEngine.setColor(mergedConfig.color);
        if (mergedConfig.size) drawEngine.setSize(parseFloat(mergedConfig.size) || 5);
        if (mergedConfig.opacity !== undefined) drawEngine.setOpacity(parseFloat(mergedConfig.opacity) || 1);
        if (mergedConfig.smooth !== undefined) drawEngine.setSmooth(parseFloat(mergedConfig.smooth) || 5);
        if (mergedConfig.eraser !== undefined) drawEngine.setEraser(!!mergedConfig.eraser);
      }

      // Initialize theme
      if (theme.init) {
        theme.init(container, mergedConfig, drawEngine);
      }
    },

    /**
     * Get current theme
     * @returns {Object|null}
     */
    getCurrent: function() {
      return this._current;
    },

    /**
     * Get current theme ID
     * @returns {string|null}
     */
    getCurrentId: function() {
      return this._currentId;
    },

    /**
     * Get all registered theme IDs
     * @returns {string[]}
     */
    getThemeIds: function() {
      return Array.from(this._themes.keys());
    },

    /**
     * Check if theme is registered
     * @param {string} themeId
     * @returns {boolean}
     */
    hasTheme: function(themeId) {
      return this._themes.has(themeId);
    },

    /**
     * Notify current theme of resize
     */
    resize: function() {
      if (this._current && typeof this._current._resizeHandler === 'function') {
        this._current._resizeHandler();
      }
    },

    /**
     * Get a theme's default configuration
     * @param {string} themeId
     * @returns {Object|null}
     */
    getDefaults: function(themeId) {
      var theme = this._themes.get(themeId);
      if (!theme) return null;
      return Object.assign({}, theme.defaults || {});
    },

    /**
     * Get the current merged configuration
     * @returns {Object|null}
     */
    getCurrentConfig: function() {
      if (!this._currentConfig) return null;
      return Object.assign({}, this._currentConfig);
    }
  };

  // Export
  global.DrawManager = DrawManager;

})(typeof window !== 'undefined' ? window : this);
