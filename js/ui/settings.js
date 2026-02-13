/**
 * Settings Panel Module
 * Visual configuration UI for theme parameters
 * Supports Text, Light, and Sound products via PRODUCT_ADAPTERS
 */
;(function(global) {
  'use strict';

  // Text-product common params (shown in "General" section)
  var TEXT_COMMON_PARAMS = ['color', 'bg', 'mode', 'speed', 'direction', 'font', 'scale', 'fill'];
  // Light-product common params
  var LIGHT_COMMON_PARAMS = ['color', 'bg', 'speed', 'brightness'];
  // Sound-product common params
  var SOUND_COMMON_PARAMS = ['color', 'bg', 'sensitivity', 'smoothing'];

  // Union of all product common params (kept for landing page builder reuse)
  var COMMON_PARAMS = ['color', 'bg', 'mode', 'speed', 'direction', 'font', 'scale', 'fill', 'brightness', 'sensitivity', 'smoothing'];

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
    // Light/Sound common
    brightness:  { type: 'range', label: 'settings.param.brightness', min: 10, max: 100, step: 5 },
    sensitivity: { type: 'range', label: 'settings.param.sensitivity', min: 1, max: 10, step: 1 },
    smoothing:   { type: 'range', label: 'settings.param.smoothing', min: 0, max: 1, step: 0.1 },
    colors:      { type: 'string', label: 'settings.param.colors' },
    // Light-specific
    warmth:      { type: 'range', label: 'settings.param.warmth', min: 1, max: 10, step: 1 },
    // Sound-specific
    barCount:    { type: 'range', label: 'settings.param.barCount', min: 8, max: 256, step: 8 },
    lineWidth:   { type: 'range', label: 'settings.param.lineWidth', min: 1, max: 10, step: 0.5 },
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
    wrap:      { type: 'boolean', label: 'settings.param.wrap' },
    // Light custom params
    cycle:        { type: 'range', label: 'settings.param.cycle', min: 4, max: 20, step: 2 },
    depth:        { type: 'range', label: 'settings.param.depth', min: 1, max: 10, step: 1 },
    sunSize:      { type: 'range', label: 'settings.param.sunSize', min: 1, max: 10, step: 1 },
    cloudDensity: { type: 'range', label: 'settings.param.cloudDensity', min: 1, max: 10, step: 1 },
    bpm:          { type: 'range', label: 'settings.param.bpm', min: 60, max: 180, step: 6 },
    pulse:        { type: 'range', label: 'settings.param.pulse', min: 1, max: 10, step: 1 },
    density:      { type: 'range', label: 'settings.param.density', min: 1, max: 10, step: 1 },
    waves:        { type: 'range', label: 'settings.param.waves', min: 3, max: 12, step: 1 },
    amplitude:    { type: 'range', label: 'settings.param.amplitude', min: 1, max: 10, step: 1 },
    sparks:       { type: 'range', label: 'settings.param.sparks', min: 0, max: 10, step: 1 },
    wind:         { type: 'range', label: 'settings.param.wind', min: 0, max: 10, step: 1 },
    frequency:    { type: 'range', label: 'settings.param.frequency', min: 1, max: 10, step: 1 },
    branches:     { type: 'range', label: 'settings.param.branches', min: 1, max: 10, step: 1 },
    symmetry:     { type: 'range', label: 'settings.param.symmetry', min: 4, max: 16, step: 2 },
    complexity:   { type: 'range', label: 'settings.param.complexity', min: 1, max: 10, step: 1 },
    waveScale:    { type: 'range', label: 'settings.param.waveScale', min: 1, max: 10, step: 1 },
    blobCount:    { type: 'range', label: 'settings.param.blobCount', min: 5, max: 20, step: 1 },
    viscosity:    { type: 'range', label: 'settings.param.viscosity', min: 1, max: 10, step: 1 },
    // Sound custom params (WMP visualizers)
    gridLines:     { type: 'boolean', label: 'settings.param.gridLines' },
    waveCount:     { type: 'range', label: 'settings.param.waveCount', min: 3, max: 10, step: 1 },
    pulseSpeed:    { type: 'range', label: 'settings.param.pulseSpeed', min: 1, max: 10, step: 1 },
    glowRadius:    { type: 'range', label: 'settings.param.glowRadius', min: 0.3, max: 1, step: 0.1 },
    gridSize:      { type: 'range', label: 'settings.param.gridSize', min: 10, max: 40, step: 2 },
    colorShift:    { type: 'range', label: 'settings.param.colorShift', min: 1, max: 10, step: 1 },
    spikeCount:    { type: 'range', label: 'settings.param.spikeCount', min: 32, max: 128, step: 8 },
    innerRadius:   { type: 'range', label: 'settings.param.innerRadius', min: 0.1, max: 0.4, step: 0.05 },
    // WMP visualizer presets
    mcPreset:      { type: 'select', label: 'settings.param.mcPreset',
                     options: ['aurora', 'water', 'silky', 'electric', 'neon', 'flame', 'star'] },
    ambPreset:     { type: 'select', label: 'settings.param.ambPreset',
                     options: ['glow', 'water', 'swirl'] },
  };

  // Product adapters — map each product to its manager, params, i18n prefix, URL builder
  var PRODUCT_ADAPTERS = {
    text: {
      getIds: function() { return TextManager.getThemeIds(); },
      getDefaults: function(id) { return TextManager.getDefaults(id); },
      getCurrentId: function() { return TextManager.getCurrentId(); },
      getCurrentText: function() { return TextManager.getCurrentText(); },
      doSwitch: function(id, container, config, ctx) {
        TextManager.switch(id, container, ctx.text, config);
      },
      i18nPrefix: 'settings.theme.',
      commonParams: TEXT_COMMON_PARAMS,
      defaultId: 'default',
      hasText: true,
      sectionLabel: 'settings.theme',
      sectionParamsLabel: 'settings.section.themeParams',
      buildPath: function(ctx) { return '/' + encodeURIComponent(ctx.text); },
      resize: function() { TextManager.resize(); }
    },
    light: {
      getIds: function() { return LightManager.getEffectIds(); },
      getDefaults: function(id) { return LightManager.getDefaults(id); },
      getCurrentId: function() { return LightManager.getCurrentId(); },
      doSwitch: function(id, container, config) {
        LightManager.switch(id, container, config);
      },
      i18nPrefix: 'settings.effect.',
      commonParams: LIGHT_COMMON_PARAMS,
      defaultId: 'solid',
      hasText: false,
      sectionLabel: 'settings.effectLabel',
      sectionParamsLabel: 'settings.section.effectParams',
      buildPath: function() { return '/light'; },
      resize: function() { LightManager.resize(); },
      knownParamOverrides: {
        speed: { type: 'range', label: 'settings.param.speed', min: 1, max: 20, step: 1 }
      }
    },
    sound: {
      getIds: function() { return SoundManager.getVisualizerIds(); },
      getDefaults: function(id) { return SoundManager.getDefaults(id); },
      getCurrentId: function() { return SoundManager.getCurrentId(); },
      doSwitch: function(id, container, config, ctx) {
        SoundManager.switch(id, container, config, ctx.audioEngine);
      },
      i18nPrefix: 'settings.visualizer.',
      commonParams: SOUND_COMMON_PARAMS,
      defaultId: 'bars',
      hasText: false,
      sectionLabel: 'settings.visualizerLabel',
      sectionParamsLabel: 'settings.section.vizParams',
      buildPath: function() { return '/sound'; },
      resize: function() { SoundManager.resize(); },
      knownParamOverrides: {
        shape: { type: 'select', label: 'settings.param.shape', options: ['circle', 'square'] },
        depth: { type: 'range', label: 'settings.param.depth', min: 3, max: 15, step: 1 }
      }
    }
  };

  var Settings = {
    _overlay: null,
    _panel: null,
    _isOpen: false,
    _container: null,
    _product: 'text',
    _text: '',
    _themeId: '',
    _themeConfig: null,
    _audioEngine: null,
    _debounceTimer: null,
    _onBeforeApply: null,

    /**
     * Initialize settings panel
     * @param {Object} options
     * @param {HTMLElement} options.container - The #display element
     * @param {string} options.product - 'text' | 'light' | 'sound'
     * @param {string} [options.text] - Current display text (text product only)
     * @param {string} options.themeId - Current theme/effect/visualizer ID
     * @param {Object} options.themeConfig - Current config (URL params only, no defaults)
     * @param {Object} [options.audioEngine] - AudioEngine reference (sound product only)
     * @param {Function} [options.onBeforeApply] - Called before applying changes
     */
    init: function(options) {
      options = options || {};
      this._container = options.container;
      this._product = options.product || 'text';
      this._text = options.text || '';
      this._themeId = options.themeId || PRODUCT_ADAPTERS[this._product].defaultId;
      this._themeConfig = options.themeConfig || {};
      this._audioEngine = options.audioEngine || null;
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
      // Sync current state from product manager
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
     * Sync theme ID from external source (e.g., arrow key navigation)
     * @param {string} id - New theme/effect/visualizer ID
     */
    syncThemeId: function(id) {
      this._themeId = id;
      if (this._isOpen) this._rebuildBody();
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
     * Sync internal state from product manager
     * @private
     */
    _syncFromCurrent: function() {
      var adapter = PRODUCT_ADAPTERS[this._product];
      var currentId = adapter.getCurrentId();
      if (currentId) this._themeId = currentId;
      if (adapter.hasText && adapter.getCurrentText) {
        var currentText = adapter.getCurrentText();
        if (currentText) this._text = currentText;
      }
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
      var adapter = PRODUCT_ADAPTERS[this._product];

      // Get current merged config
      var defaults = adapter.getDefaults(this._themeId) || {};
      var merged = Object.assign({}, defaults, this._themeConfig);

      // 1. Text input (text product only)
      if (adapter.hasText) {
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
      }

      // 2. Theme/Effect/Visualizer selector
      var themeSection = this._createSection(adapter.sectionLabel);
      var grid = document.createElement('div');
      grid.className = 'settings-theme-grid';
      var themeIds = adapter.getIds();
      themeIds.forEach(function(id) {
        var chip = document.createElement('span');
        chip.className = 'settings-theme-chip' + (id === self._themeId ? ' active' : '');
        chip.textContent = I18n.t(adapter.i18nPrefix + id);
        chip.dataset.theme = id;
        chip.addEventListener('click', function() {
          self._onThemeSelect(id);
        });
        grid.appendChild(chip);
      });
      themeSection.appendChild(grid);
      body.appendChild(themeSection);

      // 3. General params (product-specific common params)
      var generalSection = this._createSection('settings.section.general');
      var generalParams = adapter.commonParams;
      generalParams.forEach(function(key) {
        if (merged[key] === undefined && key !== 'mode') return;
        var field = self._buildField(key, merged[key], defaults[key]);
        if (field) generalSection.appendChild(field);
      });
      body.appendChild(generalSection);

      // 4. Theme-specific params
      var themeSpecific = [];
      for (var key in defaults) {
        if (adapter.commonParams.indexOf(key) === -1 && APP_PARAMS.indexOf(key) === -1) {
          themeSpecific.push(key);
        }
      }

      if (themeSpecific.length > 0) {
        var themeSection2 = this._createSection(adapter.sectionParamsLabel);
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
      var adapter = PRODUCT_ADAPTERS[this._product];
      var meta = (adapter.knownParamOverrides && adapter.knownParamOverrides[key]) || KNOWN_PARAMS[key];
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
      // Keep only common params for this product
      var adapter = PRODUCT_ADAPTERS[this._product];
      var newConfig = {};
      var oldConfig = this._themeConfig;
      adapter.commonParams.forEach(function(key) {
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
      var adapter = PRODUCT_ADAPTERS[this._product];
      var defaults = adapter.getDefaults(this._themeId) || {};
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
      var adapter = PRODUCT_ADAPTERS[this._product];

      // Notify before apply (e.g., reset rotation)
      if (this._onBeforeApply) this._onBeforeApply();

      // Switch theme/effect/visualizer with current params
      adapter.doSwitch(this._themeId, this._container, this._themeConfig, {
        text: this._text,
        audioEngine: this._audioEngine
      });
      document.getElementById('app').dataset.theme = this._themeId;

      // Update page title
      if (adapter.hasText && this._text) {
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
      var adapter = PRODUCT_ADAPTERS[this._product];
      var path = adapter.buildPath({ text: this._text });
      var params = new URLSearchParams();

      // Always include theme if not default (text) or always (light/sound)
      if (this._themeId) {
        if (!adapter.hasText || this._themeId !== adapter.defaultId) {
          params.set('t', this._themeId);
        }
      }

      // Include params that differ from defaults
      var defaults = adapter.getDefaults(this._themeId) || {};
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
  Settings.PRODUCT_ADAPTERS = PRODUCT_ADAPTERS;

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
   * @param {string} [product] - Product type (defaults to 'text')
   * @returns {string[]}
   */
  Settings.getThemeParamKeys = function(themeId, product) {
    var adapter = PRODUCT_ADAPTERS[product || 'text'];
    var defaults = adapter.getDefaults(themeId) || {};
    var keys = [];
    for (var key in defaults) {
      if (adapter.commonParams.indexOf(key) === -1 && APP_PARAMS.indexOf(key) === -1) {
        keys.push(key);
      }
    }
    return keys;
  };

  // Export
  global.Settings = Settings;

})(typeof window !== 'undefined' ? window : this);
