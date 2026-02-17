/**
 * QR Manager
 * QR theme registration, switching, and lifecycle management
 * Follows TextManager pattern — switch(themeId, container, content, config)
 * Scale/position/padding/fill wrapper follows TimeManager pattern
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

  const QRManager = {
    _themes: new Map(),
    _current: null,
    _currentId: null,
    _currentContent: '',
    _currentConfig: null,

    /**
     * Register a QR theme
     * @param {Object} theme - Theme object with id, defaults, init, destroy
     */
    register(theme) {
      if (!theme || !theme.id) {
        console.error('QR theme must have an id property');
        return;
      }
      this._themes.set(theme.id, theme);
    },

    /**
     * Switch to a QR theme
     * @param {string} themeId - Theme ID
     * @param {HTMLElement} container - Container element
     * @param {string} content - QR content to encode
     * @param {Object} config - Merged configuration (URL params override theme defaults)
     */
    switch(themeId, container, content, config) {
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
        console.warn('QR theme "' + themeId + '" not found, using default');
        theme = this._themes.get('default');
      }

      if (!theme) {
        console.error('No QR themes registered');
        return;
      }

      this._current = theme;
      this._currentId = theme.id;
      this._currentContent = content;

      // Merge config: URL params > theme defaults
      var mergedConfig = Object.assign({}, theme.defaults || {}, config);
      this._currentConfig = mergedConfig;

      // Scale/position/padding/fill wrapper
      var scale = Math.max(0.1, Math.min(3, parseFloat(mergedConfig.scale) || 1));
      var padding = Math.max(0, Math.min(20, parseFloat(mergedConfig.padding) || 0));
      var position = mergedConfig.position || 'center';
      var needsWrapper = scale !== 1 || padding > 0;
      var target = container;

      if (needsWrapper) {
        var fill = mergedConfig.fill || mergedConfig.bg || (theme.defaults && theme.defaults.bg) || 'ffffff';
        var pos = POSITIONS[position] || POSITIONS['center'];
        container.style.background = '#' + fill;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
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

      // Initialize theme
      if (theme.init) {
        theme.init(target, content, mergedConfig);
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
     * Get current QR content
     * @returns {string}
     */
    getCurrentContent() {
      return this._currentContent;
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
    },

    /**
     * Notify the current theme that the container dimensions changed.
     */
    resize() {
      if (this._current && typeof this._current._resizeHandler === 'function') {
        this._current._resizeHandler();
      }
    },

    /**
     * Get a theme's default configuration
     * @param {string} themeId - Theme ID
     * @returns {Object|null} Copy of theme defaults, or null if not found
     */
    getDefaults(themeId) {
      var theme = this._themes.get(themeId);
      if (!theme) return null;
      return Object.assign({}, theme.defaults || {});
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
  global.QRManager = QRManager;

})(typeof window !== 'undefined' ? window : this);
