/**
 * Theme Manager
 * Theme registration, switching, and lifecycle management
 */
;(function(global) {
  'use strict';

  const ThemeManager = {
    _themes: new Map(),
    _current: null,
    _currentId: null,

    /**
     * Register a theme
     * @param {Object} theme - Theme object with id, defaults, init, destroy
     */
    register(theme) {
      if (!theme || !theme.id) {
        console.error('Theme must have an id property');
        return;
      }
      this._themes.set(theme.id, theme);
    },

    /**
     * Switch to a theme
     * @param {string} themeId - Theme ID
     * @param {HTMLElement} container - Container element
     * @param {string} text - Display text
     * @param {Object} config - Merged configuration (URL params override theme defaults)
     */
    switch(themeId, container, text, config = {}) {
      // Destroy current theme
      if (this._current && this._current.destroy) {
        this._current.destroy();
      }

      // Clear container
      container.innerHTML = '';
      container.className = '';

      // Get theme (fall back to default)
      let theme = this._themes.get(themeId);
      if (!theme) {
        console.warn('Theme "' + themeId + '" not found, using default');
        theme = this._themes.get('default');
      }

      if (!theme) {
        console.error('No themes registered');
        return;
      }

      this._current = theme;
      this._currentId = theme.id;

      // Merge config: URL params > theme defaults
      const mergedConfig = Object.assign({}, theme.defaults || {}, config);

      // Initialize theme
      if (theme.init) {
        theme.init(container, text, mergedConfig);
      }
    },

    /**
     * Get current theme
     * @returns {Object|null}
     */
    getCurrent() {
      return this._current;
    },

    /**
     * Get current theme ID
     * @returns {string|null}
     */
    getCurrentId() {
      return this._currentId;
    },

    /**
     * Get all registered theme IDs
     * @returns {string[]}
     */
    getThemeIds() {
      return Array.from(this._themes.keys());
    },

    /**
     * Check if theme is registered
     * @param {string} themeId - Theme ID
     * @returns {boolean}
     */
    hasTheme(themeId) {
      return this._themes.has(themeId);
    }
  };

  // Export
  global.ThemeManager = ThemeManager;

})(typeof window !== 'undefined' ? window : this);
