/**
 * Settings Panel Module
 * Visual configuration UI for theme parameters
 */
;(function(global) {
  'use strict';

  // Common params that appear for all themes (not theme-specific)
  var COMMON_PARAMS = ['color', 'bg', 'mode', 'speed', 'direction', 'font', 'scale', 'fill'];

  // App-level params never shown in settings
  var APP_PARAMS = ['wakelock', 'cursor', 'lang', 'theme'];

  // Font presets for combo control
  var FONT_PRESETS = [
    { value: '',           labelKey: 'settings.font.default' },
    { value: 'monospace',  labelKey: 'settings.font.monospace' },
    { value: 'serif',      labelKey: 'settings.font.serif' },
    { value: 'sans-serif', labelKey: 'settings.font.sansSerif' },
    { value: 'cursive',    labelKey: 'settings.font.cursive' },
    { value: 'Arial',      labelKey: 'settings.font.arial' },
    { value: 'Georgia',    labelKey: 'settings.font.georgia' },
    { value: 'Courier New',labelKey: 'settings.font.courierNew' },
    { value: 'Impact',     labelKey: 'settings.font.impact' },
    { value: 'Comic Sans MS', labelKey: 'settings.font.comicSans' }
  ];
  var FONT_CUSTOM_VALUE = '__custom__';

  // Known param metadata for generating appropriate controls
  var KNOWN_PARAMS = {
    // Common
    color:     { type: 'color', label: 'settings.param.color' },
    bg:        { type: 'color', label: 'settings.param.bg' },
    fill:      { type: 'color', label: 'settings.param.fill' },
    mode:      { type: 'select', label: 'settings.param.mode', options: ['sign', 'flow'] },
    speed:     { type: 'range', label: 'settings.param.speed', min: 10, max: 300, step: 10 },
    direction: { type: 'select', label: 'settings.param.direction', options: ['left', 'right'] },
    font:      { type: 'font', label: 'settings.param.font' },
    scale:     { type: 'range', label: 'settings.param.scale', min: 0.1, max: 1, step: 0.1 },
    // Theme-specific
    flicker:   { type: 'range', label: 'settings.param.flicker', min: 0, max: 10, step: 0.5 },
    scanlines: { type: 'boolean', label: 'settings.param.scanlines' },
    intensity: { type: 'range', label: 'settings.param.intensity', min: 0, max: 10, step: 0.5 },
    typingSpeed: { type: 'range', label: 'settings.param.typingSpeed', min: 20, max: 500, step: 10 },
    dot:       { type: 'color', label: 'settings.param.dot' },
    chase:     { type: 'range', label: 'settings.param.chase', min: 1, max: 10, step: 1 },
    bulbColor: { type: 'color', label: 'settings.param.bulbColor' },
    rhythm:    { type: 'range', label: 'settings.param.rhythm', min: 1, max: 10, step: 0.5 },
    rate:      { type: 'range', label: 'settings.param.rate', min: 1, max: 20, step: 1 },
    grain:     { type: 'select', label: 'settings.param.grain', options: ['dark', 'light', 'natural'] },
    warm:      { type: 'range', label: 'settings.param.warm', min: 0, max: 10, step: 1 },
    glitch:    { type: 'range', label: 'settings.param.glitch', min: 0, max: 5, step: 0.5 },
    sub:       { type: 'string', label: 'settings.param.sub' },
    exit:      { type: 'string', label: 'settings.param.exit' },
    arrow:     { type: 'select', label: 'settings.param.arrow', options: ['', 'up', 'down', 'left', 'right'] },
    glare:     { type: 'range', label: 'settings.param.glare', min: 0, max: 1, step: 0.1 },
    glow:      { type: 'auto', label: 'settings.param.glow' }, // polymorphic: color or number
    res:       { type: 'range', label: 'settings.param.res', min: 5, max: 60, step: 1 },
    gap:       { type: 'range', label: 'settings.param.gap', min: 0, max: 0.8, step: 0.05 },
    shape:     { type: 'select', label: 'settings.param.shape', options: ['square', 'round'] },
    bezel:     { type: 'boolean', label: 'settings.param.bezel' },
    weight:    { type: 'select', label: 'settings.param.weight', options: ['normal', 'bold'] },
    wrap:      { type: 'boolean', label: 'settings.param.wrap' }
  };

  var Settings = {
    _overlay: null,
    _panel: null,
    _isOpen: false,
    _container: null,
    _text: '',
    _themeId: '',
    _themeConfig: null,
    _debounceTimer: null,
    _onBeforeApply: null,

    /**
     * Initialize settings panel
     * @param {Object} options
     * @param {HTMLElement} options.container - The #sign-container element
     * @param {string} options.text - Current display text
     * @param {string} options.themeId - Current theme ID
     * @param {Object} options.themeConfig - Current theme config (URL params only, no defaults)
     * @param {Function} options.onBeforeApply - Called before applying changes (for rotation cleanup)
     */
    init: function(options) {
      options = options || {};
      this._container = options.container;
      this._text = options.text || '';
      this._themeId = options.themeId || 'default';
      this._themeConfig = options.themeConfig || {};
      this._onBeforeApply = options.onBeforeApply || null;
      this._render();
      this._bind();
    },

    /**
     * Toggle panel open/close
     */
    toggle: function() {
      if (this._isOpen) {
        this.close();
      } else {
        this.open();
      }
    },

    /**
     * Open panel
     */
    open: function() {
      if (this._isOpen) return;
      this._isOpen = true;
      this._overlay.classList.add('open');
      this._panel.classList.add('open');
      // Disable cursor auto-hide while settings is open
      if (typeof Cursor !== 'undefined') Cursor.disable();
      // Sync current state from ThemeManager
      this._syncFromCurrent();
    },

    /**
     * Close panel
     */
    close: function() {
      if (!this._isOpen) return;
      this._isOpen = false;
      this._overlay.classList.remove('open');
      this._panel.classList.remove('open');
      // Re-enable cursor auto-hide
      if (typeof Cursor !== 'undefined' && Cursor.getDelay) Cursor.enable();
    },

    /**
     * Check if panel is open
     * @returns {boolean}
     */
    isOpen: function() {
      return this._isOpen;
    },

    /**
     * Destroy panel
     */
    destroy: function() {
      this.close();
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      if (this._overlay) { this._overlay.remove(); this._overlay = null; }
      if (this._panel) { this._panel.remove(); this._panel = null; }
    },

    /**
     * Sync internal state from ThemeManager
     * @private
     */
    _syncFromCurrent: function() {
      var currentId = ThemeManager.getCurrentId();
      var currentText = ThemeManager.getCurrentText();
      if (currentId) this._themeId = currentId;
      if (currentText) this._text = currentText;
      this._rebuildBody();
    },

    /**
     * Render the panel DOM structure
     * @private
     */
    _render: function() {
      var app = document.getElementById('app');

      // Overlay
      var overlay = document.createElement('div');
      overlay.className = 'settings-overlay';
      app.appendChild(overlay);
      this._overlay = overlay;

      // Panel
      var panel = document.createElement('div');
      panel.className = 'settings-panel';

      // Header
      var header = document.createElement('div');
      header.className = 'settings-header';
      header.innerHTML =
        '<span class="settings-header-title">' + I18n.t('settings.title') + '</span>' +
        '<button class="settings-close" aria-label="Close">' +
        '<svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15"/></svg>' +
        '</button>';
      panel.appendChild(header);

      // Body (will be rebuilt dynamically)
      var body = document.createElement('div');
      body.className = 'settings-body';
      panel.appendChild(body);

      app.appendChild(panel);
      this._panel = panel;
    },

    /**
     * Bind event listeners
     * @private
     */
    _bind: function() {
      var self = this;

      // Overlay click → close
      this._overlay.addEventListener('click', function() {
        self.close();
      });

      // Close button
      this._panel.querySelector('.settings-close').addEventListener('click', function() {
        self.close();
      });

      // Escape key
      this._boundEscape = function(e) {
        if (e.key === 'Escape' && self._isOpen) {
          self.close();
          e.stopPropagation();
        }
      };
      document.addEventListener('keydown', this._boundEscape, true);
    },

    /**
     * Rebuild the panel body content
     * @private
     */
    _rebuildBody: function() {
      var body = this._panel.querySelector('.settings-body');
      body.innerHTML = '';
      var self = this;

      // Get current merged config
      var defaults = ThemeManager.getDefaults(this._themeId) || {};
      var merged = Object.assign({}, defaults, this._themeConfig);

      // 1. Text input
      var textSection = this._createSection('settings.text');
      var textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'settings-text-input';
      textInput.value = this._text;
      textInput.addEventListener('change', function() {
        self._text = this.value;
        self._applyChanges();
      });
      textSection.appendChild(textInput);
      body.appendChild(textSection);

      // 2. Theme selector
      var themeSection = this._createSection('settings.theme');
      var grid = document.createElement('div');
      grid.className = 'settings-theme-grid';
      var themeIds = ThemeManager.getThemeIds();
      themeIds.forEach(function(id) {
        var chip = document.createElement('span');
        chip.className = 'settings-theme-chip' + (id === self._themeId ? ' active' : '');
        chip.textContent = I18n.t('settings.theme.' + id);
        chip.dataset.theme = id;
        chip.addEventListener('click', function() {
          self._onThemeSelect(id);
        });
        grid.appendChild(chip);
      });
      themeSection.appendChild(grid);
      body.appendChild(themeSection);

      // 3. General params
      var generalSection = this._createSection('settings.section.general');
      var generalParams = ['color', 'bg', 'fill', 'mode', 'speed', 'direction', 'scale', 'font'];
      generalParams.forEach(function(key) {
        if (merged[key] === undefined && key !== 'mode') return;
        var field = self._buildField(key, merged[key], defaults[key]);
        if (field) generalSection.appendChild(field);
      });
      body.appendChild(generalSection);

      // 4. Theme-specific params
      var themeSpecific = [];
      for (var key in defaults) {
        if (COMMON_PARAMS.indexOf(key) === -1 && APP_PARAMS.indexOf(key) === -1) {
          themeSpecific.push(key);
        }
      }

      if (themeSpecific.length > 0) {
        var themeSection2 = this._createSection('settings.section.themeParams');
        themeSpecific.forEach(function(key) {
          var field = self._buildField(key, merged[key], defaults[key]);
          if (field) themeSection2.appendChild(field);
        });
        body.appendChild(themeSection2);
      }
    },

    /**
     * Create a section with title
     * @private
     * @param {string} titleKey - i18n key
     * @returns {HTMLElement}
     */
    _createSection: function(titleKey) {
      var section = document.createElement('div');
      section.className = 'settings-section';
      var title = document.createElement('div');
      title.className = 'settings-section-title';
      title.textContent = I18n.t(titleKey);
      section.appendChild(title);
      return section;
    },

    /**
     * Build a field control based on param metadata
     * @private
     * @param {string} key - Param name
     * @param {*} value - Current value
     * @param {*} defaultValue - Theme default value
     * @returns {HTMLElement|null}
     */
    _buildField: function(key, value, defaultValue) {
      var meta = KNOWN_PARAMS[key];
      var type;

      if (meta && meta.type !== 'auto') {
        type = meta.type;
      } else {
        // Auto-detect type from default value
        type = this._inferType(defaultValue !== undefined ? defaultValue : value);
      }

      var labelKey = meta ? meta.label : 'settings.param.' + key;
      var self = this;

      var field = document.createElement('div');
      field.className = 'settings-field';

      if (type === 'color') {
        return this._buildColorField(field, key, labelKey, value);
      } else if (type === 'range') {
        return this._buildRangeField(field, key, labelKey, value, meta);
      } else if (type === 'boolean') {
        return this._buildBooleanField(field, key, labelKey, value);
      } else if (type === 'select') {
        return this._buildSelectField(field, key, labelKey, value, meta);
      } else if (type === 'font') {
        return this._buildFontField(field, key, labelKey, value);
      } else {
        return this._buildStringField(field, key, labelKey, value);
      }
    },

    /**
     * Infer control type from a value
     * @private
     */
    _inferType: function(value) {
      if (typeof value === 'boolean') return 'boolean';
      if (typeof value === 'number') return 'range';
      if (typeof value === 'string' && /^[0-9a-fA-F]{6}$/.test(value)) return 'color';
      return 'string';
    },

    /**
     * Build a color picker field
     * @private
     */
    _buildColorField: function(field, key, labelKey, value) {
      var self = this;
      var hexVal = (value || '000000').replace(/^#/, '');

      var label = document.createElement('div');
      label.className = 'settings-field-label';
      label.textContent = I18n.t(labelKey);
      field.appendChild(label);

      var row = document.createElement('div');
      row.className = 'settings-color-row';

      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'settings-color-input';
      colorInput.value = '#' + hexVal.slice(0, 6);

      var hexInput = document.createElement('input');
      hexInput.type = 'text';
      hexInput.className = 'settings-color-hex';
      hexInput.value = hexVal;
      hexInput.maxLength = 8;

      colorInput.addEventListener('input', function() {
        var hex = this.value.replace('#', '');
        hexInput.value = hex;
        self._setParam(key, hex);
      });

      hexInput.addEventListener('change', function() {
        var hex = this.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 8);
        this.value = hex;
        if (hex.length >= 6) {
          colorInput.value = '#' + hex.slice(0, 6);
        }
        self._setParam(key, hex);
      });

      row.appendChild(colorInput);
      row.appendChild(hexInput);
      field.appendChild(row);
      return field;
    },

    /**
     * Build a range slider field
     * @private
     */
    _buildRangeField: function(field, key, labelKey, value, meta) {
      var self = this;
      var min = (meta && meta.min !== undefined) ? meta.min : 0;
      var max = (meta && meta.max !== undefined) ? meta.max : 100;
      var step = (meta && meta.step !== undefined) ? meta.step : 1;
      var numVal = (typeof value === 'number') ? value : parseFloat(value) || min;

      var label = document.createElement('div');
      label.className = 'settings-field-label';
      var labelText = document.createTextNode(I18n.t(labelKey));
      var valueSpan = document.createElement('span');
      valueSpan.className = 'settings-field-value';
      valueSpan.textContent = numVal;
      label.appendChild(labelText);
      label.appendChild(valueSpan);
      field.appendChild(label);

      var range = document.createElement('input');
      range.type = 'range';
      range.className = 'settings-range';
      range.min = min;
      range.max = max;
      range.step = step;
      range.value = numVal;

      // Update display on drag, but don't re-init theme
      range.addEventListener('input', function() {
        valueSpan.textContent = this.value;
      });

      // Apply on release
      range.addEventListener('change', function() {
        self._setParam(key, parseFloat(this.value));
      });

      field.appendChild(range);
      return field;
    },

    /**
     * Build a boolean toggle field
     * @private
     */
    _buildBooleanField: function(field, key, labelKey, value) {
      var self = this;

      var label = document.createElement('div');
      label.className = 'settings-field-label';
      var labelText = document.createTextNode(I18n.t(labelKey));
      label.appendChild(labelText);

      var toggle = document.createElement('label');
      toggle.className = 'settings-toggle';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!value;
      var track = document.createElement('span');
      track.className = 'settings-toggle-track';
      toggle.appendChild(input);
      toggle.appendChild(track);

      input.addEventListener('change', function() {
        self._setParam(key, this.checked);
      });

      label.appendChild(toggle);
      field.appendChild(label);
      return field;
    },

    /**
     * Build a select dropdown field
     * @private
     */
    _buildSelectField: function(field, key, labelKey, value, meta) {
      var self = this;

      var label = document.createElement('div');
      label.className = 'settings-field-label';
      label.textContent = I18n.t(labelKey);
      field.appendChild(label);

      var select = document.createElement('select');
      select.className = 'settings-select';
      var options = (meta && meta.options) ? meta.options : [];
      options.forEach(function(opt) {
        var option = document.createElement('option');
        option.value = opt;
        // Try to translate the option value
        var translationKey = 'settings.' + key + '.' + (opt || 'none');
        var translated = I18n.t(translationKey);
        option.textContent = (translated !== translationKey) ? translated : (opt || '—');
        if (opt === value || (opt === '' && !value)) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', function() {
        self._setParam(key, this.value);
      });

      field.appendChild(select);
      return field;
    },

    /**
     * Build a text input field
     * @private
     */
    _buildStringField: function(field, key, labelKey, value) {
      var self = this;

      var label = document.createElement('div');
      label.className = 'settings-field-label';
      label.textContent = I18n.t(labelKey);
      field.appendChild(label);

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'settings-string-input';
      input.value = value || '';
      input.addEventListener('change', function() {
        self._setParam(key, this.value);
      });

      field.appendChild(input);
      return field;
    },

    /**
     * Build a font combo field (select + custom input)
     * @private
     */
    _buildFontField: function(field, key, labelKey, value) {
      var self = this;
      var currentVal = value || '';

      var label = document.createElement('div');
      label.className = 'settings-field-label';
      label.textContent = I18n.t(labelKey);
      field.appendChild(label);

      var select = document.createElement('select');
      select.className = 'settings-select';

      // Check if current value matches a preset
      var isPreset = false;
      FONT_PRESETS.forEach(function(preset) {
        var option = document.createElement('option');
        option.value = preset.value;
        option.textContent = I18n.t(preset.labelKey);
        if (preset.value === currentVal) {
          option.selected = true;
          isPreset = true;
        }
        select.appendChild(option);
      });

      // Custom option
      var customOption = document.createElement('option');
      customOption.value = FONT_CUSTOM_VALUE;
      customOption.textContent = I18n.t('settings.font.custom');
      if (!isPreset && currentVal) {
        customOption.selected = true;
      }
      select.appendChild(customOption);

      // Custom text input
      var customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.className = 'settings-string-input settings-font-custom';
      customInput.value = (!isPreset && currentVal) ? currentVal : '';
      customInput.placeholder = 'e.g. Helvetica, system-ui';
      customInput.style.display = (!isPreset && currentVal) ? '' : 'none';

      select.addEventListener('change', function() {
        if (this.value === FONT_CUSTOM_VALUE) {
          customInput.style.display = '';
          customInput.focus();
        } else {
          customInput.style.display = 'none';
          self._setParam(key, this.value);
        }
      });

      customInput.addEventListener('change', function() {
        self._setParam(key, this.value.trim());
      });

      field.appendChild(select);
      field.appendChild(customInput);
      return field;
    },

    /**
     * Handle theme selection
     * @private
     */
    _onThemeSelect: function(themeId) {
      if (themeId === this._themeId) return;
      this._themeId = themeId;
      // Reset theme-specific params when switching themes
      // Keep only common params from current config
      var newConfig = {};
      var oldConfig = this._themeConfig;
      COMMON_PARAMS.forEach(function(key) {
        if (oldConfig[key] !== undefined) {
          newConfig[key] = oldConfig[key];
        }
      });
      this._themeConfig = newConfig;
      this._applyChanges();
      this._rebuildBody();
    },

    /**
     * Set a param value and schedule apply
     * @private
     */
    _setParam: function(key, value) {
      // Compare with theme defaults to decide whether to store
      var defaults = ThemeManager.getDefaults(this._themeId) || {};
      if (value === defaults[key]) {
        delete this._themeConfig[key];
      } else {
        this._themeConfig[key] = value;
      }
      this._scheduleApply();
    },

    /**
     * Debounced apply
     * @private
     */
    _scheduleApply: function() {
      var self = this;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(function() {
        self._applyChanges();
      }, 300);
    },

    /**
     * Apply current settings to theme
     * @private
     */
    _applyChanges: function() {
      if (!this._container) return;

      // Notify before apply (e.g., reset rotation)
      if (this._onBeforeApply) this._onBeforeApply();

      // Switch theme with current params
      ThemeManager.switch(this._themeId, this._container, this._text, this._themeConfig);
      document.getElementById('app').dataset.theme = this._themeId;

      // Update page title
      if (this._text) {
        document.title = this._text + ' \u2014 led.run';
      }

      // Sync URL
      this._syncURL();
    },

    /**
     * Update URL to reflect current settings
     * @private
     */
    _syncURL: function() {
      var path = '/' + encodeURIComponent(this._text);
      var params = new URLSearchParams();

      // Always include theme if not default
      if (this._themeId && this._themeId !== 'default') {
        params.set('t', this._themeId);
      }

      // Include params that differ from defaults
      var defaults = ThemeManager.getDefaults(this._themeId) || {};
      var config = this._themeConfig;
      for (var key in config) {
        if (config[key] !== defaults[key] && APP_PARAMS.indexOf(key) === -1) {
          params.set(key, config[key]);
        }
      }

      var search = params.toString();
      var url = path + (search ? '?' + search : '');
      history.replaceState(null, '', url);
    }
  };

  // Expose metadata for reuse (e.g., landing page builder)
  Settings.KNOWN_PARAMS = KNOWN_PARAMS;
  Settings.COMMON_PARAMS = COMMON_PARAMS;
  Settings.APP_PARAMS = APP_PARAMS;
  Settings.FONT_PRESETS = FONT_PRESETS;
  Settings.FONT_CUSTOM_VALUE = FONT_CUSTOM_VALUE;

  /**
   * Infer control type from a default value
   * @param {*} value
   * @returns {string}
   */
  Settings.inferType = function(value) {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'range';
    if (typeof value === 'string' && /^[0-9a-fA-F]{6}$/.test(value)) return 'color';
    return 'string';
  };

  /**
   * Get theme-specific param keys (excluding common and app params)
   * @param {string} themeId
   * @returns {string[]}
   */
  Settings.getThemeParamKeys = function(themeId) {
    var defaults = ThemeManager.getDefaults(themeId) || {};
    var keys = [];
    for (var key in defaults) {
      if (COMMON_PARAMS.indexOf(key) === -1 && APP_PARAMS.indexOf(key) === -1) {
        keys.push(key);
      }
    }
    return keys;
  };

  // Export
  global.Settings = Settings;

})(typeof window !== 'undefined' ? window : this);
