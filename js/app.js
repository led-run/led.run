/**
 * led.run App
 * Application entry point and orchestrator
 */
;(function(global) {
  'use strict';

  // App-level parameters (not passed to themes)
  var APP_PARAMS = ['wakelock', 'cursor', 'lang'];

  // Language display names (native script)
  var LANG_LABELS = {
    en: 'EN', zh: '中文', ja: '日本語', ko: '한국어',
    es: 'ES', fr: 'FR', de: 'DE'
  };

  // Sign mode presets — static full-screen display
  var SIGN_PRESETS = [
    { text: 'DO NOT DISTURB', icon: '🤫', badgeKey: 'preset.sign.do-not-disturb.badge', descKey: 'preset.sign.do-not-disturb.desc', params: '?t=do-not-disturb&glow=ff4400' },
    { text: 'Los Angeles', icon: '🛣️', descKey: 'preset.sign.street-sign.desc', params: '?t=street-sign&sub=I-405+South&exit=42&arrow=up&glare=0.3' },
    { text: 'OPEN', icon: '🏮', badgeKey: 'preset.sign.neon.badge', descKey: 'preset.sign.neon.desc', params: '?t=neon&c=ff2d78&bg=0a0008&flicker=2' },
    { text: 'ON AIR', icon: '🔴', descKey: 'preset.sign.broadcast.desc', params: '?t=broadcast&dot=ff3333' },
    { text: 'Broadway', icon: '💡', descKey: 'preset.sign.marquee.desc', params: '?t=marquee&chase=5&bulbColor=ff6600&c=ffd700' },
    { text: 'SYSTEM OK', icon: '📟', badgeKey: 'preset.sign.cyber.badge', descKey: 'preset.sign.cyber.desc', params: '?t=cyber&c=00ff41&glitch=2' },
    { text: 'CHEERS!', icon: '🎆', descKey: 'preset.sign.firework.desc', params: '?t=firework&rate=8&c=ffd700' },
    { text: 'Le Petit Cafe', icon: '🪵', descKey: 'preset.sign.wood.desc', params: '?t=wood&warm=8&c=d4a847&mode=sign' },
    { text: 'BREATHE', icon: '🌌', descKey: 'preset.sign.aurora.desc', params: '?t=aurora&intensity=8' },
    { text: 'SHIBUYA', icon: '🌃', badgeKey: 'preset.sign.tokyo.badge', descKey: 'preset.sign.tokyo.desc', params: '?t=tokyo&c=ff0066' }
  ];

  // Flow mode presets — scrolling marquee display
  var FLOW_PRESETS = [
    { text: 'WE LOVE YOU TAYLOR', icon: '🎤', badgeKey: 'preset.flow.gradient.badge', descKey: 'preset.flow.gradient.desc', params: '?t=gradient&mode=flow&speed=150' },
    { text: 'DRINKS HALF PRICE UNTIL 9PM', icon: '🍻', descKey: 'preset.flow.neon.desc', params: '?t=neon&mode=flow&c=ffaa00&flicker=1&speed=120' },
    { text: 'WELCOME TO THE GRAND OPENING', icon: '🎊', descKey: 'preset.flow.firework.desc', params: '?t=firework&mode=flow&rate=6&c=ffd700&speed=100' },
    { text: 'NOW PLAYING: BOHEMIAN RHAPSODY', icon: '🎵', badgeKey: 'preset.flow.retro.badge', descKey: 'preset.flow.retro.desc', params: '?t=retro&mode=flow&c=cc66ff&speed=80' },
    { text: 'AIRPORT SHUTTLE -> GATE 4', icon: '🚌', descKey: 'preset.flow.dot-matrix.desc', params: '?t=dot-matrix' }
  ];

  // Light effect presets — for landing page
  var LIGHT_PRESETS = [
    { id: 'solid', icon: '\uD83D\uDD26', descKey: 'preset.light.solid.desc', params: '?t=solid' },
    { id: 'strobe', icon: '\u26A1', descKey: 'preset.light.strobe.desc', params: '?t=strobe&speed=5' },
    { id: 'disco', icon: '\uD83C\uDF7E', descKey: 'preset.light.disco.desc', params: '?t=disco&colors=ff0000,00ff00,0000ff' },
    { id: 'emergency', icon: '\uD83D\uDEA8', descKey: 'preset.light.emergency.desc', params: '?t=emergency&speed=3' },
    { id: 'candle', icon: '\uD83D\uDD6F\uFE0F', descKey: 'preset.light.candle.desc', params: '?t=candle' },
    { id: 'rainbow', icon: '\uD83C\uDF08', descKey: 'preset.light.rainbow.desc', params: '?t=rainbow' },
    { id: 'sos', icon: '\uD83C\uDD98', descKey: 'preset.light.sos.desc', params: '?t=sos' },
    { id: 'gradient', icon: '\uD83C\uDF05', descKey: 'preset.light.gradient.desc', params: '?t=gradient' }
  ];

  // Sound visualizer presets — for landing page
  var SOUND_PRESETS = [
    { id: 'bars', icon: '\uD83C\uDFB5', descKey: 'preset.sound.bars.desc', params: '?t=bars' },
    { id: 'waveform', icon: '\uD83C\uDF0A', descKey: 'preset.sound.waveform.desc', params: '?t=waveform' },
    { id: 'circle', icon: '\u2B55', descKey: 'preset.sound.circle.desc', params: '?t=circle' },
    { id: 'particles', icon: '\u2728', descKey: 'preset.sound.particles.desc', params: '?t=particles' }
  ];

  var App = {
    _container: null,
    _product: 'text',

    /**
     * Boot the application
     */
    init() {
      this._container = document.getElementById('display');

      // Parse URL (includes product detection)
      var parsed = URLParser.parse();
      this._product = parsed.product || 'text';
      var text = parsed.text;

      // Separate app-level and product-level params
      var appConfig = {};
      var productConfig = {};

      for (var key in parsed) {
        if (key === 'text' || key === 'product') continue;
        if (APP_PARAMS.indexOf(key) !== -1) {
          appConfig[key] = parsed[key];
        } else {
          productConfig[key] = parsed[key];
        }
      }

      // Initialize i18n (before any rendering)
      I18n.init(appConfig.lang);

      // Landing page: no content to display
      var isLanding = (this._product === 'text' && !text) ||
                      (this._product === 'light' && !productConfig.theme) ||
                      (this._product === 'sound' && !productConfig.theme);
      if (isLanding) {
        this._showLanding(this._product);
        return;
      }

      // Route to product-specific initialization
      switch (this._product) {
        case 'light':
          this._initLight(productConfig, appConfig);
          break;
        case 'sound':
          this._initSound(productConfig, appConfig);
          break;
        default:
          this._initText(text, productConfig, appConfig);
          break;
      }
    },

    /**
     * Initialize Text product
     * @private
     */
    _initText: function(text, productConfig, appConfig) {
      var themeId = productConfig.theme || 'default';
      delete productConfig.theme;

      document.title = text + ' \u2014 led.run';

      TextManager.switch(themeId, this._container, text, productConfig);
      document.getElementById('app').dataset.theme = themeId;

      this._initCommonUI(appConfig);

      // Text-specific controls
      Controls.init({
        onTogglePause: function() {
          var theme = TextManager.getCurrent();
          if (theme && theme.togglePause) {
            theme.togglePause();
          }
        },
        onFullscreen: function() {
          Fullscreen.toggle();
        }
      });
      Toolbar.init({ container: this._container });

      // Initialize settings panel
      if (typeof Settings !== 'undefined') {
        Settings.init({
          container: this._container,
          product: 'text',
          text: text,
          themeId: themeId,
          themeConfig: productConfig
        });
      }

      this._initCast();
    },

    /**
     * Initialize Light product
     * @private
     */
    _initLight: function(productConfig, appConfig) {
      var effectId = productConfig.theme || 'solid';
      delete productConfig.theme;

      document.title = I18n.t('light.title') + ' \u2014 led.run';

      LightManager.switch(effectId, this._container, productConfig);
      document.getElementById('app').dataset.theme = effectId;

      this._initCommonUI(appConfig);

      Controls.init({
        onFullscreen: function() {
          Fullscreen.toggle();
        },
        onNext: function() {
          var ids = LightManager.getEffectIds();
          var idx = ids.indexOf(LightManager.getCurrentId());
          var nextId = ids[(idx + 1) % ids.length];
          LightManager.switch(nextId, App._container, productConfig);
          document.getElementById('app').dataset.theme = nextId;
        },
        onPrev: function() {
          var ids = LightManager.getEffectIds();
          var idx = ids.indexOf(LightManager.getCurrentId());
          var prevId = ids[(idx - 1 + ids.length) % ids.length];
          LightManager.switch(prevId, App._container, productConfig);
          document.getElementById('app').dataset.theme = prevId;
        }
      });
      Toolbar.init({ container: this._container });

      if (typeof Settings !== 'undefined') {
        Settings.init({
          container: this._container,
          product: 'light',
          themeId: effectId,
          themeConfig: productConfig
        });
      }

      this._initCast();
    },

    /**
     * Initialize Sound product
     * @private
     */
    _initSound: function(productConfig, appConfig) {
      var vizId = productConfig.theme || 'bars';
      delete productConfig.theme;
      var self = this;

      document.title = I18n.t('sound.title') + ' \u2014 led.run';

      this._initCommonUI(appConfig);

      // Check audio support first
      if (!AudioEngine.isSupported()) {
        this._showAudioError('notSupported');
        return;
      }

      // Request microphone access
      AudioEngine.init({
        fftSize: 2048,
        smoothingTimeConstant: productConfig.smoothing || 0.8
      }).then(function() {
        SoundManager.switch(vizId, self._container, productConfig, AudioEngine);
        document.getElementById('app').dataset.theme = vizId;

        Controls.init({
          onFullscreen: function() {
            Fullscreen.toggle();
          },
          onNext: function() {
            var ids = SoundManager.getVisualizerIds();
            var idx = ids.indexOf(SoundManager.getCurrentId());
            var nextId = ids[(idx + 1) % ids.length];
            SoundManager.switch(nextId, self._container, productConfig, AudioEngine);
            document.getElementById('app').dataset.theme = nextId;
          },
          onPrev: function() {
            var ids = SoundManager.getVisualizerIds();
            var idx = ids.indexOf(SoundManager.getCurrentId());
            var prevId = ids[(idx - 1 + ids.length) % ids.length];
            SoundManager.switch(prevId, self._container, productConfig, AudioEngine);
            document.getElementById('app').dataset.theme = prevId;
          }
        });
        Toolbar.init({ container: self._container });

        if (typeof Settings !== 'undefined') {
          Settings.init({
            container: self._container,
            product: 'sound',
            themeId: vizId,
            themeConfig: productConfig
          });
        }

        self._initCast();
      }).catch(function(err) {
        console.error('Microphone access failed:', err);
        self._showAudioError(err.name === 'NotAllowedError' ? 'denied' : 'error');
      });
    },

    /**
     * Initialize common UI modules (WakeLock, Cursor, Cast receiver)
     * @private
     */
    _initCommonUI: function(appConfig) {
      WakeLock.init({ wakelock: appConfig.wakelock });
      Cursor.init({ cursor: appConfig.cursor });

      // Receiver mode: clean display only (no controls, no toolbar)
      if (typeof Cast !== 'undefined' && Cast._isReceiver()) {
        Cast.init();
        return;
      }
    },

    /**
     * Initialize casting
     * @private
     */
    _initCast: function() {
      if (typeof Cast !== 'undefined') {
        Cast.init();
      }
    },

    /**
     * Show audio error message
     * @private
     * @param {string} reason - 'notSupported' | 'denied' | 'error'
     */
    _showAudioError: function(reason) {
      var container = this._container;
      container.innerHTML = '';
      container.className = '';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';

      var msg = document.createElement('div');
      msg.style.textAlign = 'center';
      msg.style.padding = '40px';
      msg.style.color = '#fff';
      msg.style.fontFamily = '-apple-system, sans-serif';

      var icon = document.createElement('div');
      icon.style.fontSize = '48px';
      icon.style.marginBottom = '16px';

      var title = document.createElement('div');
      title.style.fontSize = '20px';
      title.style.fontWeight = '600';
      title.style.marginBottom = '8px';

      var desc = document.createElement('div');
      desc.style.fontSize = '14px';
      desc.style.opacity = '0.7';

      if (reason === 'notSupported') {
        icon.textContent = '\uD83C\uDFA4';
        title.textContent = I18n.t('sound.error.notSupported.title');
        desc.textContent = I18n.t('sound.error.notSupported.desc');
      } else if (reason === 'denied') {
        icon.textContent = '\uD83D\uDD07';
        title.textContent = I18n.t('sound.error.denied.title');
        desc.textContent = I18n.t('sound.error.denied.desc');
      } else {
        icon.textContent = '\u26A0\uFE0F';
        title.textContent = I18n.t('sound.error.generic.title');
        desc.textContent = I18n.t('sound.error.generic.desc');
      }

      msg.appendChild(icon);
      msg.appendChild(title);
      msg.appendChild(desc);
      container.appendChild(msg);
    },

    /**
     * Show landing page
     * @private
     * @param {string} activeProduct - 'text' | 'light' | 'sound'
     */
    _showLanding(activeProduct) {
      activeProduct = activeProduct || 'text';
      document.title = I18n.t('meta.title');
      document.body.style.overflow = 'auto';

      var container = this._container;
      container.className = '';
      container.style.height = 'auto';
      container.style.overflow = 'auto';

      // Current mode state
      var activeMode = localStorage.getItem('led-active-mode') || 'simple';

      var html = '';
      html += '<div class="landing">';

      // Hero
      html += '<div class="landing-hero">';
      html += '<div class="hero-brand"><span class="hero-brand-icon"></span>' + I18n.t('landing.hero.brand') + '</div>';
      html += '<h1 class="hero-title">' + I18n.t('landing.hero.title') + '</h1>';
      html += '<p class="hero-subtitle">' + I18n.t('landing.hero.subtitle') + '</p>';

      // Product Tab Switcher
      html += '<div class="product-switcher">';
      ['text', 'light', 'sound'].forEach(function(p) {
        html += '<button class="product-tab' + (p === activeProduct ? ' active' : '') + '" data-product="' + p + '">' + I18n.t('landing.tab.' + p) + '</button>';
      });
      html += '</div>';

      // Mode Switcher
      html += '<div class="mode-switcher">';
      html += '<button class="mode-tab' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">' + I18n.t('landing.mode.simple') + '</button>';
      html += '<button class="mode-tab' + (activeMode === 'builder' ? ' active' : '') + '" data-mode="builder">' + I18n.t('landing.mode.builder') + '</button>';
      html += '</div>';

      html += '<div class="landing-content">';

      // ====== TEXT PRODUCT PANELS ======
      html += '<div class="product-panel' + (activeProduct === 'text' ? ' active' : '') + '" id="product-text">';

      // Text Simple
      html += '<div class="mode-panel' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">';
      html += '<div class="simple-mode-container">';
      html += '<div class="input-group">';
      html += '<div class="input-prefix">led.run/</div>';
      html += '<input class="url-input" id="simple-input" type="text" placeholder="HELLO" autocomplete="off" spellcheck="false">';
      html += '<div class="input-actions">';
      html += '<button class="btn-random" id="simple-random" title="' + I18n.t('landing.input.random') + '">';
      html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
      html += '<rect x="1" y="1" width="22" height="22" rx="4"></rect><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"></circle></svg>';
      html += '</button>';
      html += '<button class="btn-launch" id="simple-go">' + I18n.t('landing.input.go') + '</button>';
      html += '</div></div></div></div>';

      // Text Builder
      html += '<div class="mode-panel' + (activeMode === 'builder' ? ' active' : '') + '" data-mode="builder">';
      html += '<div class="builder-canvas"><div class="preview-card"><div class="preview-label">Live Preview</div><div id="builder-live-preview"></div></div></div>';
      html += '<div class="builder-grid">';

      // Card 1: Content
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('settings.text') + '</div>';
      html += '<div class="prop-group"><input type="text" class="builder-text-input" id="builder-text" placeholder="HELLO" autocomplete="off"></div></div>';

      // Card 2: Theme & Mode
      html += '<div class="prop-card"><div class="prop-card-title">Theme & Mode</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.theme') + '</span>';
      html += '<select class="builder-select" id="builder-theme">';
      var bThemeIds = TextManager.getThemeIds();
      html += '<option value="default">' + I18n.t('settings.theme.default') + '</option>';
      bThemeIds.forEach(function(id) {
        if (id === 'default') return;
        html += '<option value="' + id + '">' + I18n.t('settings.theme.' + id) + '</option>';
      });
      html += '</select></div>';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.mode') + '</span>';
      html += '<select class="builder-select" id="builder-mode">';
      html += '<option value="">' + I18n.t('settings.mode.none') + '</option>';
      html += '<option value="sign">' + I18n.t('settings.mode.sign') + '</option>';
      html += '<option value="flow">' + I18n.t('settings.mode.flow') + '</option>';
      html += '</select></div></div></div>';

      // Card 3: Visual Style
      html += '<div class="prop-card"><div class="prop-card-title">Visual Style</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.color') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-color" value="#00ff41">';
      html += '<span class="prop-label">' + I18n.t('settings.param.bg') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-bg" value="#000000"></div>';
      html += '<div class="prop-row" id="builder-fill-row" style="display:none"><span class="prop-label">' + I18n.t('settings.param.fill') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-fill" value="#000000"></div>';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.font') + '</span>';
      html += '<select class="builder-select" id="builder-font">';
      if (typeof Settings !== 'undefined' && Settings.FONT_PRESETS) {
        Settings.FONT_PRESETS.forEach(function(preset) {
          html += '<option value="' + preset.value + '">' + I18n.t(preset.labelKey) + '</option>';
        });
        html += '<option value="' + Settings.FONT_CUSTOM_VALUE + '">' + I18n.t('settings.font.custom') + '</option>';
      }
      html += '</select></div>';
      html += '<input type="text" class="builder-text-input" id="builder-font-custom" placeholder="e.g. Helvetica" style="display:none; margin-top:8px">';
      html += '</div></div>';

      // Card 4: Dynamics
      html += '<div class="prop-card"><div class="prop-card-title">Dynamics</div><div class="prop-group">';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.speed') + '</span><span class="val" id="builder-speed-val">60</span></div>';
      html += '<input type="range" class="builder-range" id="builder-speed" min="10" max="300" step="10" value="60"></div>';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.scale') + '</span><span class="val" id="builder-scale-val">1.0</span></div>';
      html += '<input type="range" class="builder-range" id="builder-scale" min="0.1" max="1" step="0.1" value="1"></div>';
      html += '</div></div>';

      // Card 5: Advanced (Dynamic)
      html += '<div class="prop-card" id="builder-custom-section" style="display:none"><div class="prop-card-title">Advanced Params</div>';
      html += '<div class="prop-group" id="builder-theme-params"></div></div>';

      // Action Card
      html += '<div class="prop-card prop-card-highlight"><div class="builder-url-box">';
      html += '<div class="builder-url-preview" id="builder-url-preview">led.run/HELLO</div></div>';
      html += '<div class="builder-actions"><button class="btn-primary" id="builder-launch">' + I18n.t('landing.input.go') + '</button>';
      html += '<button class="btn-secondary" id="builder-copy" title="Copy URL">';
      html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      html += '</button></div></div>';

      html += '</div>'; // builder-grid
      html += '</div>'; // text builder mode-panel
      html += '</div>'; // product-text

      // ====== LIGHT PRODUCT PANELS ======
      html += '<div class="product-panel' + (activeProduct === 'light' ? ' active' : '') + '" id="product-light">';

      // Light Simple — preset card grid
      html += '<div class="mode-panel' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">';
      html += '<div class="presets-grid presets-grid-compact">';
      LIGHT_PRESETS.forEach(function(p) {
        var href = '/light' + (p.params ? p.params : '');
        html += '<a class="preset-card" href="' + href + '">';
        html += '<div class="preset-header"><span class="preset-icon">' + p.icon + '</span></div>';
        html += '<div class="preset-title">' + I18n.t('settings.effect.' + p.id) + '</div>';
        html += '<div class="preset-desc">' + I18n.t(p.descKey) + '</div>';
        html += '</a>';
      });
      html += '</div></div>';

      // Light Builder
      html += '<div class="mode-panel' + (activeMode === 'builder' ? ' active' : '') + '" data-mode="builder">';
      html += '<div class="builder-grid">';

      // Effect selection
      html += '<div class="prop-card"><div class="prop-card-title">Effect</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.theme') + '</span>';
      html += '<select class="builder-select" id="light-builder-effect">';
      var effectIds = LightManager.getEffectIds();
      effectIds.forEach(function(id) {
        html += '<option value="' + id + '">' + I18n.t('settings.effect.' + id) + '</option>';
      });
      html += '</select></div></div></div>';

      // Color
      html += '<div class="prop-card"><div class="prop-card-title">Visual Style</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.color') + '</span>';
      html += '<input type="color" class="builder-color-input" id="light-builder-color" value="#ffffff">';
      html += '<span class="prop-label">' + I18n.t('settings.param.bg') + '</span>';
      html += '<input type="color" class="builder-color-input" id="light-builder-bg" value="#000000"></div>';
      html += '</div></div>';

      // Speed & Brightness
      html += '<div class="prop-card"><div class="prop-card-title">Dynamics</div><div class="prop-group">';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.speed') + '</span><span class="val" id="light-builder-speed-val">5</span></div>';
      html += '<input type="range" class="builder-range" id="light-builder-speed" min="1" max="20" step="1" value="5"></div>';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.brightness') + '</span><span class="val" id="light-builder-brightness-val">100</span></div>';
      html += '<input type="range" class="builder-range" id="light-builder-brightness" min="10" max="100" step="5" value="100"></div>';
      html += '</div></div>';

      // Light Action Card
      html += '<div class="prop-card prop-card-highlight"><div class="builder-url-box">';
      html += '<div class="builder-url-preview" id="light-builder-url">led.run/light</div></div>';
      html += '<div class="builder-actions"><button class="btn-primary" id="light-builder-launch">' + I18n.t('landing.input.go') + '</button></div></div>';

      html += '</div>'; // builder-grid
      html += '</div>'; // light builder mode-panel
      html += '</div>'; // product-light

      // ====== SOUND PRODUCT PANELS ======
      html += '<div class="product-panel' + (activeProduct === 'sound' ? ' active' : '') + '" id="product-sound">';

      // Sound Simple — preset card grid
      html += '<div class="mode-panel' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">';
      html += '<div class="presets-grid presets-grid-compact">';
      SOUND_PRESETS.forEach(function(p) {
        var href = '/sound' + (p.params ? p.params : '');
        html += '<a class="preset-card" href="' + href + '">';
        html += '<div class="preset-header"><span class="preset-icon">' + p.icon + '</span></div>';
        html += '<div class="preset-title">' + I18n.t('settings.visualizer.' + p.id) + '</div>';
        html += '<div class="preset-desc">' + I18n.t(p.descKey) + '</div>';
        html += '</a>';
      });
      html += '</div></div>';

      // Sound Builder
      html += '<div class="mode-panel' + (activeMode === 'builder' ? ' active' : '') + '" data-mode="builder">';
      html += '<div class="builder-grid">';

      // Visualizer selection
      html += '<div class="prop-card"><div class="prop-card-title">Visualizer</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.theme') + '</span>';
      html += '<select class="builder-select" id="sound-builder-viz">';
      var vizIds = SoundManager.getVisualizerIds();
      vizIds.forEach(function(id) {
        html += '<option value="' + id + '">' + I18n.t('settings.visualizer.' + id) + '</option>';
      });
      html += '</select></div></div></div>';

      // Color
      html += '<div class="prop-card"><div class="prop-card-title">Visual Style</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.color') + '</span>';
      html += '<input type="color" class="builder-color-input" id="sound-builder-color" value="#00ff41">';
      html += '<span class="prop-label">' + I18n.t('settings.param.bg') + '</span>';
      html += '<input type="color" class="builder-color-input" id="sound-builder-bg" value="#000000"></div>';
      html += '</div></div>';

      // Sensitivity & Smoothing
      html += '<div class="prop-card"><div class="prop-card-title">Audio</div><div class="prop-group">';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.sensitivity') + '</span><span class="val" id="sound-builder-sens-val">5</span></div>';
      html += '<input type="range" class="builder-range" id="sound-builder-sensitivity" min="1" max="10" step="1" value="5"></div>';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.smoothing') + '</span><span class="val" id="sound-builder-smooth-val">0.8</span></div>';
      html += '<input type="range" class="builder-range" id="sound-builder-smoothing" min="0" max="1" step="0.1" value="0.8"></div>';
      html += '</div></div>';

      // Sound Action Card
      html += '<div class="prop-card prop-card-highlight"><div class="builder-url-box">';
      html += '<div class="builder-url-preview" id="sound-builder-url">led.run/sound</div></div>';
      html += '<div class="builder-actions"><button class="btn-primary" id="sound-builder-launch">' + I18n.t('landing.input.go') + '</button></div></div>';

      html += '</div>'; // builder-grid
      html += '</div>'; // sound builder mode-panel
      html += '</div>'; // product-sound

      html += '</div>'; // landing-content
      html += '</div>'; // landing-hero

      // Text preset sections (only for text product)
      html += '<div class="text-presets-section' + (activeProduct === 'text' ? ' active' : '') + '" id="text-presets">';

      // Helper to render preset grids
      function renderPresets(presets) {
        var out = '';
        presets.forEach(function(p) {
          var href = '/' + encodeURIComponent(p.text) + (p.params || '');
          out += '<a class="preset-card" href="' + href + '">';
          out += '<div class="preset-header"><span class="preset-icon">' + p.icon + '</span>';
          if (p.badgeKey) out += '<span class="preset-badge">' + I18n.t(p.badgeKey) + '</span>';
          out += '</div>';
          out += '<div class="preset-title">' + p.text + '</div>';
          out += '<div class="preset-desc">' + I18n.t(p.descKey) + '</div></a>';
        });
        return out;
      }

      html += '<div class="section-title">' + I18n.t('landing.section.flow') + '</div>';
      html += '<div class="presets-grid">' + renderPresets(FLOW_PRESETS) + '</div>';
      html += '<div class="section-title">' + I18n.t('landing.section.sign') + '</div>';
      html += '<div class="presets-grid">' + renderPresets(SIGN_PRESETS) + '</div>';
      html += '</div>'; // text-presets-section

      // Footer
      html += '<footer class="landing-footer">';
      html += '<div>' + I18n.t('landing.footer.copyright') + '</div>';
      html += '<div class="footer-links">';
      var docsHref = I18n.locale() === 'en' ? '/docs' : '/docs/' + I18n.locale() + '/';
      html += '<a href="' + docsHref + '">' + I18n.t('landing.footer.docs') + '</a>';
      html += '<a href="https://github.com/led-run/led.run" target="_blank">GitHub</a>';
      html += '</div>';

      // Language Switcher
      html += '<div class="footer-lang">';
      I18n.supported().forEach(function(lang, i) {
        if (i > 0) html += '<span class="footer-lang-sep">|</span>';
        if (lang === I18n.locale()) {
          html += '<span class="footer-lang-current">' + LANG_LABELS[lang] + '</span>';
        } else {
          html += '<a class="footer-lang-link" href="#" data-lang="' + lang + '">' + LANG_LABELS[lang] + '</a>';
        }
      });
      html += '</div>';
      html += '</footer>';
      html += '</div>'; // landing

      container.innerHTML = html;

      // --- Interaction Logic ---
      var self = this;

      // Product Tab Switcher
      document.querySelectorAll('.product-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          var product = this.dataset.product;
          document.querySelectorAll('.product-tab').forEach(function(t) { t.classList.toggle('active', t === tab); });
          document.querySelectorAll('.product-panel').forEach(function(p) { p.classList.toggle('active', p.id === 'product-' + product); });
          // Show text presets only for text product
          var textPresets = document.getElementById('text-presets');
          if (textPresets) textPresets.classList.toggle('active', product === 'text');
        });
      });

      // Mode Switcher — applies to all product panels
      document.querySelectorAll('.mode-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          var mode = this.dataset.mode;
          localStorage.setItem('led-active-mode', mode);
          document.querySelectorAll('.mode-tab').forEach(function(t) { t.classList.toggle('active', t === tab); });
          document.querySelectorAll('.mode-panel').forEach(function(p) {
            p.classList.toggle('active', p.dataset.mode === mode);
          });
          if (mode === 'builder') {
            updateTextPreview();
            setTimeout(function() { if (TextManager.resize) TextManager.resize(); }, 50);
          }
        });
      });

      // ====== TEXT PANEL LOGIC ======
      var simpleInput = document.getElementById('simple-input');
      var builderText = document.getElementById('builder-text');
      var builderTheme = document.getElementById('builder-theme');
      var builderMode = document.getElementById('builder-mode');
      var builderColor = document.getElementById('builder-color');
      var builderBg = document.getElementById('builder-bg');
      var builderFill = document.getElementById('builder-fill');
      var builderSpeed = document.getElementById('builder-speed');
      var builderScale = document.getElementById('builder-scale');
      var builderFont = document.getElementById('builder-font');
      var builderFontCustom = document.getElementById('builder-font-custom');
      var builderUrlPreview = document.getElementById('builder-url-preview');
      var livePreview = document.getElementById('builder-live-preview');

      var userChanged = { color: false, bg: false, fill: false, speed: false, scale: false, font: false };
      var themeParamValues = {};

      function getDefaults() {
        return TextManager.getDefaults(builderTheme.value) || {};
      }

      function updateTextPreview() {
        var text = builderText.value.trim() || 'HELLO';
        var themeId = builderTheme.value;

        var config = { mode: builderMode.value || undefined };
        if (userChanged.color) config.color = builderColor.value.replace('#', '');
        if (userChanged.bg) config.bg = builderBg.value.replace('#', '');
        if (userChanged.fill) config.fill = builderFill.value.replace('#', '');
        if (userChanged.speed) config.speed = parseInt(builderSpeed.value, 10);
        if (userChanged.scale) config.scale = parseFloat(builderScale.value);
        if (userChanged.font) {
          var fontVal = builderFont.value;
          config.font = (fontVal === Settings.FONT_CUSTOM_VALUE) ? builderFontCustom.value.trim() : fontVal;
        }
        for (var k in themeParamValues) config[k] = themeParamValues[k];

        var params = [];
        if (themeId !== 'default') params.push('t=' + themeId);
        for (var key in config) {
          if (config[key] !== undefined) params.push(key + '=' + encodeURIComponent(config[key]));
        }
        builderUrlPreview.textContent = 'led.run/' + encodeURIComponent(text) + (params.length ? '?' + params.join('&') : '');
        TextManager.switch(themeId, livePreview, text, config);
        if (TextManager.resize) setTimeout(function() { TextManager.resize(); }, 0);
      }

      // Simple mode
      function goSimple() {
        var val = simpleInput.value.trim();
        if (val) window.location.href = '/' + encodeURIComponent(val);
      }
      document.getElementById('simple-go').addEventListener('click', goSimple);
      simpleInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') goSimple(); });
      document.getElementById('simple-random').addEventListener('click', function() {
        var val = simpleInput.value.trim() || 'HELLO';
        var themes = TextManager.getThemeIds();
        var theme = themes[Math.floor(Math.random() * themes.length)];
        window.location.href = '/' + encodeURIComponent(val) + '?t=' + theme;
      });

      // Builder mode events
      [builderText, builderTheme, builderMode, builderColor, builderBg, builderFill, builderSpeed, builderScale, builderFont, builderFontCustom].forEach(function(el) {
        el.addEventListener('input', function() {
          if (this.id !== 'builder-text' && this.id !== 'builder-theme' && this.id !== 'builder-mode') {
            userChanged[this.id.replace('builder-', '')] = true;
          }
          if (this.id === 'builder-speed') document.getElementById('builder-speed-val').textContent = this.value;
          if (this.id === 'builder-scale') document.getElementById('builder-scale-val').textContent = this.value;
          if (this.id === 'builder-font') builderFontCustom.style.display = (this.value === Settings.FONT_CUSTOM_VALUE) ? 'block' : 'none';
          if (this.id === 'builder-theme') {
            userChanged = { color: false, bg: false, fill: false, speed: false, scale: false, font: false };
            themeParamValues = {};
            syncBuilderToThemeDefaults();
            rebuildThemeParams();
          }
          updateTextPreview();
        });
      });

      function syncBuilderToThemeDefaults() {
        var d = getDefaults();
        builderColor.value = '#' + (d.color || '00ff41').slice(0, 6);
        builderBg.value = '#' + (d.bg || '000000').slice(0, 6);
        document.getElementById('builder-fill-row').style.display = d.fill !== undefined ? 'flex' : 'none';
        builderFill.value = '#' + (d.fill || '000000').slice(0, 6);
        builderSpeed.value = d.speed || 60;
        document.getElementById('builder-speed-val').textContent = builderSpeed.value;
        builderScale.value = d.scale || 1;
        document.getElementById('builder-scale-val').textContent = builderScale.value;
        builderFont.value = d.font || '';
        builderFontCustom.value = '';
        builderFontCustom.style.display = 'none';
      }

      function rebuildThemeParams() {
        var themeParamsContainer = document.getElementById('builder-theme-params');
        var customSection = document.getElementById('builder-custom-section');
        themeParamsContainer.innerHTML = '';
        if (typeof Settings === 'undefined') return;
        var keys = Settings.getThemeParamKeys(builderTheme.value);
        customSection.style.display = keys.length ? 'flex' : 'none';
        keys.forEach(function(key) {
          var meta = Settings.KNOWN_PARAMS[key];
          var defVal = getDefaults()[key];
          var type = (meta && meta.type !== 'auto') ? meta.type : Settings.inferType(defVal);
          var row = document.createElement('div');
          row.className = 'prop-row-stack';
          var labelRow = document.createElement('div');
          labelRow.className = 'prop-label-row';
          var labelText = document.createElement('span');
          labelText.textContent = I18n.t(meta ? meta.label : 'settings.param.' + key);
          labelRow.appendChild(labelText);
          row.appendChild(labelRow);
          var inputWrap = document.createElement('div');
          inputWrap.className = 'prop-input-wrap';
          if (type === 'range') {
            var ri = document.createElement('input');
            ri.type = 'range'; ri.className = 'builder-range';
            ri.min = meta.min || 0; ri.max = meta.max || 100; ri.step = meta.step || 1;
            ri.value = defVal;
            var rv = document.createElement('span');
            rv.className = 'val'; rv.textContent = defVal;
            labelRow.appendChild(rv);
            ri.addEventListener('input', function() {
              rv.textContent = this.value;
              themeParamValues[key] = parseFloat(this.value);
              updateTextPreview();
            });
            inputWrap.appendChild(ri);
          } else if (type === 'color') {
            row.className = 'prop-row';
            var ci = document.createElement('input');
            ci.type = 'color'; ci.className = 'builder-color-input';
            ci.value = '#' + (defVal || '000000').slice(0, 6);
            ci.addEventListener('input', function() {
              themeParamValues[key] = this.value.replace('#', '');
              updateTextPreview();
            });
            inputWrap.appendChild(ci);
          } else if (type === 'boolean') {
            row.className = 'prop-row';
            var toggle = document.createElement('label');
            toggle.className = 'builder-toggle';
            var cb = document.createElement('input');
            cb.type = 'checkbox'; cb.checked = !!defVal;
            var track = document.createElement('span');
            track.className = 'builder-toggle-track';
            toggle.appendChild(cb); toggle.appendChild(track);
            cb.addEventListener('change', function() {
              themeParamValues[key] = this.checked;
              updateTextPreview();
            });
            inputWrap.appendChild(toggle);
          }
          row.appendChild(inputWrap);
          themeParamsContainer.appendChild(row);
        });
      }

      document.getElementById('builder-launch').addEventListener('click', function() {
        var text = builderText.value.trim() || 'HELLO';
        var params = [];
        if (builderTheme.value !== 'default') params.push('t=' + builderTheme.value);
        if (builderMode.value) params.push('mode=' + builderMode.value);
        if (userChanged.color) params.push('c=' + builderColor.value.replace('#', ''));
        if (userChanged.bg) params.push('bg=' + builderBg.value.replace('#', ''));
        if (userChanged.fill) params.push('fill=' + builderFill.value.replace('#', ''));
        if (userChanged.speed) params.push('speed=' + builderSpeed.value);
        if (userChanged.scale) params.push('scale=' + builderScale.value);
        if (userChanged.font) {
          var fv = builderFont.value;
          params.push('font=' + encodeURIComponent(fv === Settings.FONT_CUSTOM_VALUE ? builderFontCustom.value.trim() : fv));
        }
        for (var k in themeParamValues) params.push(k + '=' + encodeURIComponent(themeParamValues[k]));
        window.location.href = '/' + encodeURIComponent(text) + (params.length ? '?' + params.join('&') : '');
      });

      document.getElementById('builder-copy').addEventListener('click', function() {
        var url = 'https://' + builderUrlPreview.textContent;
        navigator.clipboard.writeText(url).then(function() {
          var originalIcon = this.innerHTML;
          this.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(function() { this.innerHTML = originalIcon; }.bind(this), 2000);
        }.bind(this));
      });

      // ====== LIGHT PANEL LOGIC ======
      var lightEffect = document.getElementById('light-builder-effect');
      var lightColor = document.getElementById('light-builder-color');
      var lightBg = document.getElementById('light-builder-bg');
      var lightSpeed = document.getElementById('light-builder-speed');
      var lightBrightness = document.getElementById('light-builder-brightness');
      var lightUrl = document.getElementById('light-builder-url');

      function updateLightUrl() {
        var params = [];
        var effectId = lightEffect.value;
        if (effectId !== 'solid') params.push('t=' + effectId);
        params.push('color=' + lightColor.value.replace('#', ''));
        params.push('bg=' + lightBg.value.replace('#', ''));
        params.push('speed=' + lightSpeed.value);
        if (lightBrightness.value !== '100') params.push('brightness=' + lightBrightness.value);
        lightUrl.textContent = 'led.run/light' + (params.length ? '?' + params.join('&') : '');
      }

      [lightEffect, lightColor, lightBg, lightSpeed, lightBrightness].forEach(function(el) {
        el.addEventListener('input', function() {
          if (this.id === 'light-builder-speed') document.getElementById('light-builder-speed-val').textContent = this.value;
          if (this.id === 'light-builder-brightness') document.getElementById('light-builder-brightness-val').textContent = this.value;
          updateLightUrl();
        });
      });

      document.getElementById('light-builder-launch').addEventListener('click', function() {
        var url = lightUrl.textContent.replace('led.run', '');
        window.location.href = url;
      });

      // ====== SOUND PANEL LOGIC ======
      var soundViz = document.getElementById('sound-builder-viz');
      var soundColor = document.getElementById('sound-builder-color');
      var soundBg = document.getElementById('sound-builder-bg');
      var soundSens = document.getElementById('sound-builder-sensitivity');
      var soundSmooth = document.getElementById('sound-builder-smoothing');
      var soundUrl = document.getElementById('sound-builder-url');

      function updateSoundUrl() {
        var params = [];
        var vizId = soundViz.value;
        if (vizId !== 'bars') params.push('t=' + vizId);
        params.push('color=' + soundColor.value.replace('#', ''));
        params.push('bg=' + soundBg.value.replace('#', ''));
        if (soundSens.value !== '5') params.push('sensitivity=' + soundSens.value);
        if (soundSmooth.value !== '0.8') params.push('smoothing=' + soundSmooth.value);
        soundUrl.textContent = 'led.run/sound' + (params.length ? '?' + params.join('&') : '');
      }

      [soundViz, soundColor, soundBg, soundSens, soundSmooth].forEach(function(el) {
        el.addEventListener('input', function() {
          if (this.id === 'sound-builder-sensitivity') document.getElementById('sound-builder-sens-val').textContent = this.value;
          if (this.id === 'sound-builder-smoothing') document.getElementById('sound-builder-smooth-val').textContent = this.value;
          updateSoundUrl();
        });
      });

      document.getElementById('sound-builder-launch').addEventListener('click', function() {
        var url = soundUrl.textContent.replace('led.run', '');
        window.location.href = url;
      });

      // ====== LANG SWITCHER ======
      document.querySelectorAll('.footer-lang-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          I18n.setLocale(this.dataset.lang);
          self._showLanding(activeProduct);
        });
      });

      // Initialize builder if active
      if (activeMode === 'builder' && activeProduct === 'text') {
        syncBuilderToThemeDefaults();
        rebuildThemeParams();
        updateTextPreview();
      }
      if (activeMode === 'builder' && activeProduct === 'light') updateLightUrl();
      if (activeMode === 'builder' && activeProduct === 'sound') updateSoundUrl();

      // Focus
      setTimeout(function() {
        if (activeProduct === 'text') {
          (activeMode === 'simple' ? simpleInput : builderText).focus();
        }
      }, 100);
    }
  };

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { App.init(); });
  } else {
    App.init();
  }

  global.App = App;

})(typeof window !== 'undefined' ? window : this);
