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
    { id: 'gradient', icon: '\uD83C\uDF05', descKey: 'preset.light.gradient.desc', params: '?t=gradient' },
    { id: 'breathing', icon: '\uD83E\uDEC1', descKey: 'preset.light.breathing.desc', params: '?t=breathing' },
    { id: 'sunset', icon: '\uD83C\uDF05', descKey: 'preset.light.sunset.desc', params: '?t=sunset' },
    { id: 'heartbeat', icon: '\uD83D\uDC93', descKey: 'preset.light.heartbeat.desc', params: '?t=heartbeat' },
    { id: 'matrix-rain', icon: '\uD83D\uDFE9', descKey: 'preset.light.matrix-rain.desc', params: '?t=matrix-rain' },
    { id: 'aurora-waves', icon: '\uD83C\uDF0C', descKey: 'preset.light.aurora-waves.desc', params: '?t=aurora-waves' },
    { id: 'campfire', icon: '\uD83C\uDF5E', descKey: 'preset.light.campfire.desc', params: '?t=campfire' },
    { id: 'lightning', icon: '\u26C8\uFE0F', descKey: 'preset.light.lightning.desc', params: '?t=lightning' },
    { id: 'kaleidoscope', icon: '\uD83D\uDD2E', descKey: 'preset.light.kaleidoscope.desc', params: '?t=kaleidoscope' },
    { id: 'plasma', icon: '\uD83C\uDF0A', descKey: 'preset.light.plasma.desc', params: '?t=plasma' },
    { id: 'lava-lamp', icon: '\uD83E\uDEAB', descKey: 'preset.light.lava-lamp.desc', params: '?t=lava-lamp' }
  ];

  // Time clock presets — for landing page
  var TIME_PRESETS = [
    { id: 'digital', icon: '\uD83D\uDD22', descKey: 'landing.time.preset.digital', params: '?t=digital' },
    { id: 'minimal', icon: '\u23F0', descKey: 'landing.time.preset.minimal', params: '?t=minimal' },
    { id: 'retro', icon: '\uD83D\uDDA5\uFE0F', descKey: 'landing.time.preset.retro', params: '?t=retro' },
    { id: 'binary', icon: '\uD83E\uDD16', descKey: 'landing.time.preset.binary', params: '?t=binary' },
    { id: 'lcd', icon: '\u231A', descKey: 'landing.time.preset.lcd', params: '?t=lcd' },
    { id: 'analog', icon: '\uD83D\uDD70\uFE0F', descKey: 'landing.time.preset.analog', params: '?t=analog' },
    { id: 'flip', icon: '\uD83D\uDCC5', descKey: 'landing.time.preset.flip', params: '?t=flip' },
    { id: 'nixie', icon: '\uD83D\uDD25', descKey: 'landing.time.preset.nixie', params: '?t=nixie' },
    { id: 'neon', icon: '\uD83C\uDF1F', descKey: 'landing.time.preset.neon', params: '?t=neon' },
    { id: 'word', icon: '\uD83D\uDCD6', descKey: 'landing.time.preset.word', params: '?t=word' },
    { id: 'sun', icon: '\u2600\uFE0F', descKey: 'landing.time.preset.sun', params: '?t=sun' },
    { id: 'calendar', icon: '\uD83D\uDCC6', descKey: 'landing.time.preset.calendar', params: '?t=calendar' },
    { id: 'matrix', icon: '\uD83D\uDFE9', descKey: 'landing.time.preset.matrix', params: '?t=matrix' },
    { id: 'gradient', icon: '\uD83C\uDF08', descKey: 'landing.time.preset.gradient', params: '?t=gradient' }
  ];

  // Sound visualizer presets — for landing page
  var SOUND_PRESETS = [
    { id: 'bars', icon: '\uD83C\uDFB5', descKey: 'landing.sound.preset.bars', params: '?t=bars' },
    { id: 'scope', icon: '\uD83D\uDCCA', descKey: 'landing.sound.preset.scope', params: '?t=scope' },
    { id: 'ocean', icon: '\uD83C\uDF0A', descKey: 'landing.sound.preset.ocean', params: '?t=ocean' },
    { id: 'alchemy', icon: '\u2697\uFE0F', descKey: 'landing.sound.preset.alchemy', params: '?t=alchemy' },
    { id: 'battery', icon: '\uD83D\uDD0B', descKey: 'landing.sound.preset.battery', params: '?t=battery' },
    { id: 'ambience', icon: '\uD83D\uDCAB', descKey: 'landing.sound.preset.ambience', params: '?t=ambience' },
    { id: 'particle', icon: '\u2728', descKey: 'landing.sound.preset.particle', params: '?t=particle' },
    { id: 'musical-colors', icon: '\uD83C\uDF08', descKey: 'landing.sound.preset.musical-colors', params: '?t=musical-colors' },
    { id: 'spikes', icon: '\u2B50', descKey: 'landing.sound.preset.spikes', params: '?t=spikes' },
    { id: 'plenoptic', icon: '\uD83D\uDD2E', descKey: 'landing.sound.preset.plenoptic', params: '?t=plenoptic' },
    { id: 'waveform-3d', icon: '\uD83D\uDCC8', descKey: 'landing.sound.preset.waveform-3d', params: '?t=waveform-3d' },
    { id: 'spectrum-circle', icon: '\u2B55', descKey: 'landing.sound.preset.spectrum-circle', params: '?t=spectrum-circle' }
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
                      (this._product === 'sound' && !productConfig.theme) ||
                      (this._product === 'time' && !productConfig.theme);
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
        case 'time':
          this._initTime(productConfig, appConfig);
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
      Toolbar.init({ container: this._container, product: 'text' });

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
          if (typeof Settings !== 'undefined') Settings.syncThemeId(nextId);
        },
        onPrev: function() {
          var ids = LightManager.getEffectIds();
          var idx = ids.indexOf(LightManager.getCurrentId());
          var prevId = ids[(idx - 1 + ids.length) % ids.length];
          LightManager.switch(prevId, App._container, productConfig);
          document.getElementById('app').dataset.theme = prevId;
          if (typeof Settings !== 'undefined') Settings.syncThemeId(prevId);
        },
        onAdjust: function(delta) {
          var config = LightManager.getCurrentConfig() || {};
          var brightness = Math.max(10, Math.min(100, (config.brightness || 100) + delta * 5));
          productConfig.brightness = brightness;
          LightManager.switch(LightManager.getCurrentId(), App._container, productConfig);
        }
      });
      Toolbar.init({ container: this._container, product: 'light' });

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
            if (typeof Settings !== 'undefined') Settings.syncThemeId(nextId);
          },
          onPrev: function() {
            var ids = SoundManager.getVisualizerIds();
            var idx = ids.indexOf(SoundManager.getCurrentId());
            var prevId = ids[(idx - 1 + ids.length) % ids.length];
            SoundManager.switch(prevId, self._container, productConfig, AudioEngine);
            document.getElementById('app').dataset.theme = prevId;
            if (typeof Settings !== 'undefined') Settings.syncThemeId(prevId);
          },
          onAdjust: function(delta) {
            var config = SoundManager.getCurrentConfig() || {};
            var sensitivity = Math.max(1, Math.min(10, (config.sensitivity || 5) + delta));
            productConfig.sensitivity = sensitivity;
            SoundManager.switch(SoundManager.getCurrentId(), self._container, productConfig, AudioEngine);
          }
        });
        Toolbar.init({ container: self._container, product: 'sound' });

        if (typeof Settings !== 'undefined') {
          Settings.init({
            container: self._container,
            product: 'sound',
            themeId: vizId,
            themeConfig: productConfig,
            audioEngine: AudioEngine
          });
        }

        self._initCast();
      }).catch(function(err) {
        console.error('Microphone access failed:', err);
        self._showAudioError(err.name === 'NotAllowedError' ? 'denied' : 'error');
      });
    },

    /**
     * Initialize Time product
     * @private
     */
    _initTime: function(productConfig, appConfig) {
      var clockId = productConfig.theme || 'digital';
      delete productConfig.theme;

      document.title = I18n.t('time.title') + ' \u2014 led.run';

      TimeManager.switch(clockId, this._container, productConfig);
      document.getElementById('app').dataset.theme = clockId;
      document.getElementById('app').dataset.product = 'time';

      this._initCommonUI(appConfig);

      Controls.init({
        onFullscreen: function() {
          Fullscreen.toggle();
        },
        onNext: function() {
          var ids = TimeManager.getClockIds();
          var idx = ids.indexOf(TimeManager.getCurrentId());
          var nextId = ids[(idx + 1) % ids.length];
          TimeManager.switch(nextId, App._container, productConfig);
          document.getElementById('app').dataset.theme = nextId;
          if (typeof Settings !== 'undefined') Settings.syncThemeId(nextId);
        },
        onPrev: function() {
          var ids = TimeManager.getClockIds();
          var idx = ids.indexOf(TimeManager.getCurrentId());
          var prevId = ids[(idx - 1 + ids.length) % ids.length];
          TimeManager.switch(prevId, App._container, productConfig);
          document.getElementById('app').dataset.theme = prevId;
          if (typeof Settings !== 'undefined') Settings.syncThemeId(prevId);
        }
      });
      Toolbar.init({ container: this._container, product: 'time' });

      if (typeof Settings !== 'undefined') {
        Settings.init({
          container: this._container,
          product: 'time',
          themeId: clockId,
          themeConfig: productConfig
        });
      }

      this._initCast();
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
     * @param {string} activeProduct - 'text' | 'light' | 'sound' | 'time'
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
      html += '</div>'; // landing-hero

      // Unified Navigation
      html += '<nav class="landing-nav">';
      html += '<div class="product-switcher">';
      ['text', 'light', 'sound', 'time'].forEach(function(p) {
        html += '<button class="product-tab' + (p === activeProduct ? ' active' : '') + '" data-product="' + p + '">' + I18n.t('landing.tab.' + p) + '</button>';
      });
      html += '</div>';

      html += '<div class="mode-switcher">';
      html += '<button class="mode-tab' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">' + I18n.t('landing.mode.simple') + '</button>';
      html += '<button class="mode-tab' + (activeMode === 'builder' ? ' active' : '') + '" data-mode="builder">' + I18n.t('landing.mode.builder') + '</button>';
      html += '</div>';
      html += '</nav>';

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
      html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">';
      html += '<rect x="1" y="1" width="22" height="22" rx="4"></rect><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"></circle></svg>';
      html += '</button>';
      html += '<button class="btn-launch" id="simple-go">' + I18n.t('landing.input.go') + '</button>';
      html += '</div></div></div></div>';

      // Text Builder
      html += '<div class="mode-panel' + (activeMode === 'builder' ? ' active' : '') + '" data-mode="builder">';
      html += '<div class="builder-canvas"><div class="preview-card"><div class="preview-label">' + I18n.t('landing.builder.card.livePreview') + '</div><div id="builder-live-preview"></div></div></div>';
      html += '<div class="builder-grid">';

      // Card 1: Content
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('settings.text') + '</div>';
      html += '<div class="prop-group"><input type="text" class="builder-text-input" id="builder-text" placeholder="HELLO" autocomplete="off"></div></div>';

      // Card 2: Theme & Mode
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.themeAndMode') + '</div><div class="prop-group">';
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
      html += '</select></div>';
      html += '<div class="prop-row" id="builder-direction-row" style="display:none"><span class="prop-label">' + I18n.t('settings.param.direction') + '</span>';
      html += '<select class="builder-select" id="builder-direction">';
      html += '<option value="left">' + I18n.t('settings.direction.left') + '</option>';
      html += '<option value="right">' + I18n.t('settings.direction.right') + '</option>';
      html += '</select></div>';
      html += '</div></div>';

      // Card 3: Visual Style
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.visualStyle') + '</div><div class="prop-group">';
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
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.dynamics') + '</div><div class="prop-group">';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.speed') + '</span><span class="val" id="builder-speed-val">60</span></div>';
      html += '<input type="range" class="builder-range" id="builder-speed" min="10" max="300" step="10" value="60"></div>';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.scale') + '</span><span class="val" id="builder-scale-val">1.0</span></div>';
      html += '<input type="range" class="builder-range" id="builder-scale" min="0.1" max="1" step="0.1" value="1"></div>';
      html += '</div></div>';

      // Card 5: Advanced (Dynamic)
      html += '<div class="prop-card" id="builder-custom-section" style="display:none"><div class="prop-card-title">' + I18n.t('landing.builder.card.advanced') + '</div>';
      html += '<div class="prop-group" id="builder-theme-params"></div></div>';

      // Action Card
      html += '<div class="prop-card prop-card-highlight"><div class="builder-url-box">';
      html += '<div class="builder-url-preview" id="builder-url-preview">led.run/HELLO</div></div>';
      html += '<div class="builder-actions"><button class="btn-primary" id="builder-launch">' + I18n.t('landing.input.go') + '</button>';
      html += '<button class="btn-secondary" id="builder-copy" title="Copy URL">';
      html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      html += '</button></div></div>';

      html += '</div>'; // builder-grid
      html += '</div>'; // text builder mode-panel
      html += '</div>'; // product-text

      // ====== LIGHT PRODUCT PANELS ======
      html += '<div class="product-panel' + (activeProduct === 'light' ? ' active' : '') + '" id="product-light">';

      // Light Simple — preset card grid
      html += '<div class="mode-panel' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">';
      html += '<div class="presets-grid">';
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
      html += '<div class="builder-canvas"><div class="preview-card"><div class="preview-label">' + I18n.t('landing.builder.card.livePreview') + '</div><div id="light-builder-preview"></div></div></div>';
      html += '<div class="builder-grid">';

      // Effect selection
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.effect') + '</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.effectLabel') + '</span>';
      html += '<select class="builder-select" id="light-builder-effect">';
      var effectIds = LightManager.getEffectIds();
      effectIds.forEach(function(id) {
        html += '<option value="' + id + '">' + I18n.t('settings.effect.' + id) + '</option>';
      });
      html += '</select></div></div></div>';

      // Color
      html += '<div class="prop-card" id="light-builder-style-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.visualStyle') + '</div><div class="prop-group">';
      html += '<div class="prop-row" id="light-builder-color-row"><span class="prop-label">' + I18n.t('settings.param.color') + '</span>';
      html += '<input type="color" class="builder-color-input" id="light-builder-color" value="#ffffff"></div>';
      html += '<div class="prop-row" id="light-builder-bg-row"><span class="prop-label">' + I18n.t('settings.param.bg') + '</span>';
      html += '<input type="color" class="builder-color-input" id="light-builder-bg" value="#000000"></div>';
      html += '</div></div>';

      // Speed & Brightness
      html += '<div class="prop-card" id="light-builder-dynamics-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.dynamics') + '</div><div class="prop-group">';
      html += '<div class="prop-row-stack" id="light-builder-speed-row"><div class="prop-label-row"><span>' + I18n.t('settings.param.speed') + '</span><span class="val" id="light-builder-speed-val">5</span></div>';
      html += '<input type="range" class="builder-range" id="light-builder-speed" min="1" max="20" step="1" value="5"></div>';
      html += '<div class="prop-row-stack" id="light-builder-brightness-row"><div class="prop-label-row"><span>' + I18n.t('settings.param.brightness') + '</span><span class="val" id="light-builder-brightness-val">100</span></div>';
      html += '<input type="range" class="builder-range" id="light-builder-brightness" min="10" max="100" step="5" value="100"></div>';
      html += '</div></div>';

      // Light Advanced (Dynamic)
      html += '<div class="prop-card" id="light-builder-custom-section" style="display:none"><div class="prop-card-title">' + I18n.t('landing.builder.card.advanced') + '</div>';
      html += '<div class="prop-group" id="light-builder-effect-params"></div></div>';

      // Light Action Card
      html += '<div class="prop-card prop-card-highlight"><div class="builder-url-box">';
      html += '<div class="builder-url-preview" id="light-builder-url">led.run/light?t=solid</div></div>';
      html += '<div class="builder-actions"><button class="btn-primary" id="light-builder-launch">' + I18n.t('landing.input.go') + '</button>';
      html += '<button class="btn-secondary" id="light-builder-copy" title="Copy URL">';
      html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      html += '</button></div></div>';

      html += '</div>'; // builder-grid
      html += '</div>'; // light builder mode-panel
      html += '</div>'; // product-light

      // ====== SOUND PRODUCT PANELS ======
      html += '<div class="product-panel' + (activeProduct === 'sound' ? ' active' : '') + '" id="product-sound">';

      // Sound Simple — preset card grid
      html += '<div class="mode-panel' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">';
      html += '<div class="presets-grid">';
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
      html += '<div class="builder-canvas"><div class="preview-card"><div class="preview-label">' + I18n.t('landing.builder.card.livePreview') + '</div><div id="sound-builder-preview"></div></div></div>';
      html += '<div class="builder-grid">';

      // Visualizer selection
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.visualizer') + '</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.visualizerLabel') + '</span>';
      html += '<select class="builder-select" id="sound-builder-viz">';
      var vizIds = SoundManager.getVisualizerIds();
      vizIds.forEach(function(id) {
        html += '<option value="' + id + '">' + I18n.t('settings.visualizer.' + id) + '</option>';
      });
      html += '</select></div></div></div>';

      // Color
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.visualStyle') + '</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.color') + '</span>';
      html += '<input type="color" class="builder-color-input" id="sound-builder-color" value="#00ff41">';
      html += '<span class="prop-label">' + I18n.t('settings.param.bg') + '</span>';
      html += '<input type="color" class="builder-color-input" id="sound-builder-bg" value="#000000"></div>';
      html += '</div></div>';

      // Sensitivity & Smoothing
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.audio') + '</div><div class="prop-group">';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.sensitivity') + '</span><span class="val" id="sound-builder-sens-val">5</span></div>';
      html += '<input type="range" class="builder-range" id="sound-builder-sensitivity" min="1" max="10" step="1" value="5"></div>';
      html += '<div class="prop-row-stack" id="sound-builder-smoothing-row"><div class="prop-label-row"><span>' + I18n.t('settings.param.smoothing') + '</span><span class="val" id="sound-builder-smooth-val">0.8</span></div>';
      html += '<input type="range" class="builder-range" id="sound-builder-smoothing" min="0" max="1" step="0.1" value="0.8"></div>';
      html += '</div></div>';

      // Sound Advanced (Dynamic)
      html += '<div class="prop-card" id="sound-builder-custom-section" style="display:none"><div class="prop-card-title">' + I18n.t('landing.builder.card.advanced') + '</div>';
      html += '<div class="prop-group" id="sound-builder-viz-params"></div></div>';

      // Sound Action Card
      html += '<div class="prop-card prop-card-highlight"><div class="builder-url-box">';
      html += '<div class="builder-url-preview" id="sound-builder-url">led.run/sound?t=bars</div></div>';
      html += '<div class="builder-actions"><button class="btn-primary" id="sound-builder-launch">' + I18n.t('landing.input.go') + '</button>';
      html += '<button class="btn-secondary" id="sound-builder-copy" title="Copy URL">';
      html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      html += '</button></div></div>';

      html += '</div>'; // builder-grid
      html += '</div>'; // sound builder mode-panel
      html += '</div>'; // product-sound

      // ====== TIME PRODUCT PANELS ======
      html += '<div class="product-panel' + (activeProduct === 'time' ? ' active' : '') + '" id="product-time">';

      // Time Simple — preset card grid
      html += '<div class="mode-panel' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">';
      html += '<div class="presets-grid">';
      TIME_PRESETS.forEach(function(p) {
        var href = '/time' + (p.params ? p.params : '');
        html += '<a class="preset-card" href="' + href + '">';
        html += '<div class="preset-header"><span class="preset-icon">' + p.icon + '</span></div>';
        html += '<div class="preset-title">' + I18n.t('settings.clock.' + p.id) + '</div>';
        html += '<div class="preset-desc">' + I18n.t(p.descKey) + '</div>';
        html += '</a>';
      });
      html += '</div></div>';

      // Time Builder
      html += '<div class="mode-panel' + (activeMode === 'builder' ? ' active' : '') + '" data-mode="builder">';
      html += '<div class="builder-canvas"><div class="preview-card"><div class="preview-label">' + I18n.t('landing.builder.card.livePreview') + '</div><div id="time-builder-preview"></div></div></div>';
      html += '<div class="builder-grid">';

      // Clock selection
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.clock') + '</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.clockLabel') + '</span>';
      html += '<select class="builder-select" id="time-builder-clock">';
      var clockIds = TimeManager.getClockIds();
      clockIds.forEach(function(id) {
        html += '<option value="' + id + '">' + I18n.t('settings.clock.' + id) + '</option>';
      });
      html += '</select></div></div></div>';

      // Visual Style
      html += '<div class="prop-card" id="time-builder-style-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.visualStyle') + '</div><div class="prop-group">';
      html += '<div class="prop-row" id="time-builder-color-row"><span class="prop-label">' + I18n.t('settings.param.color') + '</span>';
      html += '<input type="color" class="builder-color-input" id="time-builder-color" value="#ff0000"></div>';
      html += '<div class="prop-row" id="time-builder-bg-row"><span class="prop-label">' + I18n.t('settings.param.bg') + '</span>';
      html += '<input type="color" class="builder-color-input" id="time-builder-bg" value="#000000"></div>';
      html += '<div class="prop-row" id="time-builder-fill-row" style="display:none"><span class="prop-label">' + I18n.t('settings.param.fill') + '</span>';
      html += '<input type="color" class="builder-color-input" id="time-builder-fill" value="#000000"></div>';
      html += '</div></div>';

      // Time Settings
      html += '<div class="prop-card"><div class="prop-card-title">' + I18n.t('landing.builder.card.timeSettings') + '</div><div class="prop-group">';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.format') + '</span>';
      html += '<select class="builder-select" id="time-builder-format">';
      html += '<option value="24h">' + I18n.t('settings.format.24h') + '</option>';
      html += '<option value="12h">' + I18n.t('settings.format.12h') + '</option>';
      html += '</select></div>';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.showSeconds') + '</span>';
      html += '<label class="builder-toggle"><input type="checkbox" id="time-builder-seconds" checked><span class="builder-toggle-track"></span></label></div>';
      html += '<div class="prop-row"><span class="prop-label">' + I18n.t('settings.param.showDate') + '</span>';
      html += '<label class="builder-toggle"><input type="checkbox" id="time-builder-date"><span class="builder-toggle-track"></span></label></div>';
      html += '<div class="prop-row" id="time-builder-dateformat-row" style="display:none"><span class="prop-label">' + I18n.t('settings.param.dateFormat') + '</span>';
      html += '<select class="builder-select" id="time-builder-dateformat">';
      html += '<option value="MDY">' + I18n.t('settings.dateFormat.MDY') + '</option>';
      html += '<option value="DMY">' + I18n.t('settings.dateFormat.DMY') + '</option>';
      html += '<option value="YMD">' + I18n.t('settings.dateFormat.YMD') + '</option>';
      html += '</select></div>';
      html += '<div class="prop-row-stack"><div class="prop-label-row"><span>' + I18n.t('settings.param.tz') + '</span><span class="val" id="time-builder-tz-val">0</span></div>';
      html += '<input type="range" class="builder-range" id="time-builder-tz" min="-12" max="14" step="1" value="0"></div>';
      html += '</div></div>';

      // Time Advanced (Dynamic)
      html += '<div class="prop-card" id="time-builder-custom-section" style="display:none"><div class="prop-card-title">' + I18n.t('landing.builder.card.advanced') + '</div>';
      html += '<div class="prop-group" id="time-builder-clock-params"></div></div>';

      // Time Action Card
      html += '<div class="prop-card prop-card-highlight"><div class="builder-url-box">';
      html += '<div class="builder-url-preview" id="time-builder-url">led.run/time?t=digital</div></div>';
      html += '<div class="builder-actions"><button class="btn-primary" id="time-builder-launch">' + I18n.t('landing.input.go') + '</button>';
      html += '<button class="btn-secondary" id="time-builder-copy" title="Copy URL">';
      html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      html += '</button></div></div>';

      html += '</div>'; // builder-grid
      html += '</div>'; // time builder mode-panel
      html += '</div>'; // product-time

      html += '</div>'; // landing-content

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
      html += '<div class="footer-top">';
      html += '<div>' + I18n.t('landing.footer.copyright') + '</div>';
      html += '<div class="footer-links">';
      var docsHref = I18n.locale() === 'en' ? '/docs' : '/docs/' + I18n.locale() + '/';
      html += '<a href="' + docsHref + '">' + I18n.t('landing.footer.docs') + '</a>';
      html += '<a href="https://github.com/led-run/led.run" target="_blank">GitHub</a>';
      html += '</div></div>';

      // Language Switcher
      html += '<div class="footer-lang">';
      I18n.supported().forEach(function(lang, i) {
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
          
          // Re-render preview if in builder mode
          if (localStorage.getItem('led-active-mode') === 'builder') {
            setTimeout(function() {
              if (product === 'text') updateTextPreview();
              else if (product === 'light') updateLightPreview();
              else if (product === 'sound') updateSoundPreview();
              else if (product === 'time') updateTimePreview();
            }, 50);
          }
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
            var activeTab = document.querySelector('.product-tab.active');
            var activeP = activeTab ? activeTab.dataset.product : 'text';
            // Wait for DOM to be visible
            setTimeout(function() {
              if (activeP === 'text') { updateTextPreview(); if (TextManager.resize) TextManager.resize(); }
              else if (activeP === 'light') updateLightPreview();
              else if (activeP === 'sound') updateSoundPreview();
              else if (activeP === 'time') updateTimePreview();
            }, 50);
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

      var builderDirection = document.getElementById('builder-direction');

      var userChanged = { color: false, bg: false, fill: false, speed: false, scale: false, font: false, direction: false };
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
        if (userChanged.direction) config.direction = builderDirection.value;
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
      [builderText, builderTheme, builderMode, builderDirection, builderColor, builderBg, builderFill, builderSpeed, builderScale, builderFont, builderFontCustom].forEach(function(el) {
        el.addEventListener('input', function() {
          if (this.id !== 'builder-text' && this.id !== 'builder-theme' && this.id !== 'builder-mode') {
            var changedKey = this.id.replace('builder-', '');
            if (changedKey === 'font-custom') changedKey = 'font';
            userChanged[changedKey] = true;
          }
          if (this.id === 'builder-speed') document.getElementById('builder-speed-val').textContent = this.value;
          if (this.id === 'builder-scale') document.getElementById('builder-scale-val').textContent = this.value;
          if (this.id === 'builder-font') builderFontCustom.style.display = (this.value === Settings.FONT_CUSTOM_VALUE) ? 'block' : 'none';
          if (this.id === 'builder-theme') {
            userChanged = { color: false, bg: false, fill: false, speed: false, scale: false, font: false, direction: false };
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
        document.getElementById('builder-direction-row').style.display = d.direction !== undefined ? 'flex' : 'none';
        builderDirection.value = d.direction || 'left';
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
        if (userChanged.direction) params.push('dir=' + builderDirection.value);
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
      var lightPreviewEl = document.getElementById('light-builder-preview');

      var lightUserChanged = { color: false, bg: false, speed: false, brightness: false };
      var lightEffectParamValues = {};

      function getLightDefaults() {
        return LightManager.getDefaults(lightEffect.value) || {};
      }

      function syncLightBuilderToEffectDefaults() {
        var d = getLightDefaults();
        lightColor.value = '#' + (d.color || 'ffffff').slice(0, 6);
        lightBg.value = '#' + (d.bg || '000000').slice(0, 6);
        lightSpeed.value = d.speed || 5;
        document.getElementById('light-builder-speed-val').textContent = lightSpeed.value;
        lightBrightness.value = d.brightness || 100;
        document.getElementById('light-builder-brightness-val').textContent = lightBrightness.value;
      }

      function syncLightBuilderVisibility() {
        var d = getLightDefaults();
        var showColor = d.color !== undefined;
        var showBg = d.bg !== undefined;
        var showSpeed = d.speed !== undefined;
        var showBrightness = d.brightness !== undefined;
        document.getElementById('light-builder-color-row').style.display = showColor ? '' : 'none';
        document.getElementById('light-builder-bg-row').style.display = showBg ? '' : 'none';
        document.getElementById('light-builder-speed-row').style.display = showSpeed ? '' : 'none';
        document.getElementById('light-builder-brightness-row').style.display = showBrightness ? '' : 'none';
        document.getElementById('light-builder-style-card').style.display = (showColor || showBg) ? '' : 'none';
        document.getElementById('light-builder-dynamics-card').style.display = (showSpeed || showBrightness) ? '' : 'none';
      }

      function rebuildLightEffectParams() {
        var container = document.getElementById('light-builder-effect-params');
        var section = document.getElementById('light-builder-custom-section');
        container.innerHTML = '';
        if (typeof Settings === 'undefined') return;
        var keys = Settings.getThemeParamKeys(lightEffect.value, 'light');
        section.style.display = keys.length ? 'flex' : 'none';
        var d = getLightDefaults();
        var lightAdapter = Settings.PRODUCT_ADAPTERS.light;
        keys.forEach(function(key) {
          var meta = (lightAdapter.knownParamOverrides && lightAdapter.knownParamOverrides[key]) || Settings.KNOWN_PARAMS[key];
          var defVal = d[key];
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
            ri.min = (meta && meta.min !== undefined) ? meta.min : 0;
            ri.max = (meta && meta.max !== undefined) ? meta.max : 100;
            ri.step = (meta && meta.step !== undefined) ? meta.step : 1;
            ri.value = defVal;
            var rv = document.createElement('span');
            rv.className = 'val'; rv.textContent = defVal;
            labelRow.appendChild(rv);
            ri.addEventListener('input', function() {
              rv.textContent = this.value;
              lightEffectParamValues[key] = parseFloat(this.value);
              updateLightUrl();
              updateLightPreview();
            });
            inputWrap.appendChild(ri);
          } else if (type === 'color') {
            row.className = 'prop-row';
            var ci = document.createElement('input');
            ci.type = 'color'; ci.className = 'builder-color-input';
            ci.value = '#' + (defVal || '000000').slice(0, 6);
            ci.addEventListener('input', function() {
              lightEffectParamValues[key] = this.value.replace('#', '');
              updateLightUrl();
              updateLightPreview();
            });
            inputWrap.appendChild(ci);
          } else if (type === 'string') {
            row.className = 'prop-row';
            var si = document.createElement('input');
            si.type = 'text'; si.className = 'builder-text-input';
            si.value = defVal || '';
            si.addEventListener('change', function() {
              lightEffectParamValues[key] = this.value;
              updateLightUrl();
              updateLightPreview();
            });
            inputWrap.appendChild(si);
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
              lightEffectParamValues[key] = this.checked;
              updateLightUrl();
              updateLightPreview();
            });
            inputWrap.appendChild(toggle);
          }
          row.appendChild(inputWrap);
          container.appendChild(row);
        });
      }

      function updateLightUrl() {
        var effectId = lightEffect.value;
        var d = getLightDefaults();
        var params = ['t=' + effectId];
        if (lightUserChanged.color && d.color !== undefined) {
          var c = lightColor.value.replace('#', '');
          if (c !== (d.color || 'ffffff')) params.push('color=' + c);
        }
        if (lightUserChanged.bg && d.bg !== undefined) {
          var b = lightBg.value.replace('#', '');
          if (b !== (d.bg || '000000')) params.push('bg=' + b);
        }
        if (lightUserChanged.speed && d.speed !== undefined) {
          if (lightSpeed.value !== String(d.speed || 5)) params.push('speed=' + lightSpeed.value);
        }
        if (lightUserChanged.brightness && d.brightness !== undefined) {
          if (lightBrightness.value !== String(d.brightness || 100)) params.push('brightness=' + lightBrightness.value);
        }
        for (var k in lightEffectParamValues) {
          if (lightEffectParamValues[k] !== d[k]) params.push(k + '=' + encodeURIComponent(lightEffectParamValues[k]));
        }
        lightUrl.textContent = 'led.run/light?' + params.join('&');
      }

      function updateLightPreview() {
        var effectId = lightEffect.value;
        var config = {};
        var d = getLightDefaults();
        if (d.color !== undefined) config.color = lightColor.value.replace('#', '');
        if (d.bg !== undefined) config.bg = lightBg.value.replace('#', '');
        if (d.speed !== undefined) config.speed = parseInt(lightSpeed.value, 10);
        if (d.brightness !== undefined) config.brightness = parseInt(lightBrightness.value, 10);
        for (var k in lightEffectParamValues) config[k] = lightEffectParamValues[k];
        LightManager.switch(effectId, lightPreviewEl, config);
        setTimeout(function() { LightManager.resize(); }, 0);
      }

      [lightColor, lightBg, lightSpeed, lightBrightness].forEach(function(el) {
        el.addEventListener('input', function() {
          var paramKey = this.id.replace('light-builder-', '');
          lightUserChanged[paramKey] = true;
          if (this.id === 'light-builder-speed') document.getElementById('light-builder-speed-val').textContent = this.value;
          if (this.id === 'light-builder-brightness') document.getElementById('light-builder-brightness-val').textContent = this.value;
          updateLightUrl();
          updateLightPreview();
        });
      });

      lightEffect.addEventListener('input', function() {
        lightUserChanged = { color: false, bg: false, speed: false, brightness: false };
        lightEffectParamValues = {};
        syncLightBuilderToEffectDefaults();
        syncLightBuilderVisibility();
        rebuildLightEffectParams();
        updateLightUrl();
        updateLightPreview();
      });

      document.getElementById('light-builder-launch').addEventListener('click', function() {
        var url = lightUrl.textContent.replace('led.run', '');
        window.location.href = url;
      });

      document.getElementById('light-builder-copy').addEventListener('click', function() {
        var url = 'https://' + lightUrl.textContent;
        navigator.clipboard.writeText(url).then(function() {
          var originalIcon = this.innerHTML;
          this.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(function() { this.innerHTML = originalIcon; }.bind(this), 2000);
        }.bind(this));
      });

      // ====== SOUND PANEL LOGIC ======
      var soundViz = document.getElementById('sound-builder-viz');
      var soundColor = document.getElementById('sound-builder-color');
      var soundBg = document.getElementById('sound-builder-bg');
      var soundSens = document.getElementById('sound-builder-sensitivity');
      var soundSmooth = document.getElementById('sound-builder-smoothing');
      var soundUrl = document.getElementById('sound-builder-url');
      var soundPreviewEl = document.getElementById('sound-builder-preview');

      var soundUserChanged = { color: false, bg: false, sensitivity: false, smoothing: false };
      var soundVizParamValues = {};

      function getSoundDefaults() {
        return SoundManager.getDefaults(soundViz.value) || {};
      }

      function syncSoundBuilderToVizDefaults() {
        var d = getSoundDefaults();
        soundColor.value = '#' + (d.color || '00ff41').slice(0, 6);
        soundBg.value = '#' + (d.bg || '000000').slice(0, 6);
        soundSens.value = d.sensitivity || 5;
        document.getElementById('sound-builder-sens-val').textContent = soundSens.value;
        soundSmooth.value = d.smoothing !== undefined ? d.smoothing : 0.8;
        document.getElementById('sound-builder-smooth-val').textContent = soundSmooth.value;
      }

      function syncSoundBuilderVisibility() {
        var d = getSoundDefaults();
        document.getElementById('sound-builder-smoothing-row').style.display =
          d.smoothing !== undefined ? '' : 'none';
      }

      function rebuildSoundVizParams() {
        var container = document.getElementById('sound-builder-viz-params');
        var section = document.getElementById('sound-builder-custom-section');
        container.innerHTML = '';
        if (typeof Settings === 'undefined') return;
        var keys = Settings.getThemeParamKeys(soundViz.value, 'sound');
        section.style.display = keys.length ? 'flex' : 'none';
        var d = getSoundDefaults();
        keys.forEach(function(key) {
          var meta = Settings.KNOWN_PARAMS[key];
          var defVal = d[key];
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
            ri.min = (meta && meta.min !== undefined) ? meta.min : 0;
            ri.max = (meta && meta.max !== undefined) ? meta.max : 100;
            ri.step = (meta && meta.step !== undefined) ? meta.step : 1;
            ri.value = defVal;
            var rv = document.createElement('span');
            rv.className = 'val'; rv.textContent = defVal;
            labelRow.appendChild(rv);
            ri.addEventListener('input', function() {
              rv.textContent = this.value;
              soundVizParamValues[key] = parseFloat(this.value);
              updateSoundUrl();
              updateSoundPreview();
            });
            inputWrap.appendChild(ri);
          } else if (type === 'color') {
            row.className = 'prop-row';
            var ci = document.createElement('input');
            ci.type = 'color'; ci.className = 'builder-color-input';
            ci.value = '#' + (defVal || '000000').slice(0, 6);
            ci.addEventListener('input', function() {
              soundVizParamValues[key] = this.value.replace('#', '');
              updateSoundUrl();
              updateSoundPreview();
            });
            inputWrap.appendChild(ci);
          } else if (type === 'string') {
            row.className = 'prop-row';
            var si = document.createElement('input');
            si.type = 'text'; si.className = 'builder-text-input';
            si.value = defVal || '';
            si.addEventListener('change', function() {
              soundVizParamValues[key] = this.value;
              updateSoundUrl();
              updateSoundPreview();
            });
            inputWrap.appendChild(si);
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
              soundVizParamValues[key] = this.checked;
              updateSoundUrl();
              updateSoundPreview();
            });
            inputWrap.appendChild(toggle);
          }
          row.appendChild(inputWrap);
          container.appendChild(row);
        });
      }

      function updateSoundUrl() {
        var vizId = soundViz.value;
        var d = getSoundDefaults();
        var params = ['t=' + vizId];
        if (soundUserChanged.color) {
          var c = soundColor.value.replace('#', '');
          if (c !== (d.color || '00ff41')) params.push('color=' + c);
        }
        if (soundUserChanged.bg) {
          var b = soundBg.value.replace('#', '');
          if (b !== (d.bg || '000000')) params.push('bg=' + b);
        }
        if (soundUserChanged.sensitivity) {
          if (soundSens.value !== String(d.sensitivity || 5)) params.push('sensitivity=' + soundSens.value);
        }
        if (soundUserChanged.smoothing && d.smoothing !== undefined) {
          if (soundSmooth.value !== String(d.smoothing)) params.push('smoothing=' + soundSmooth.value);
        }
        for (var k in soundVizParamValues) {
          if (soundVizParamValues[k] !== d[k]) params.push(k + '=' + encodeURIComponent(soundVizParamValues[k]));
        }
        soundUrl.textContent = 'led.run/sound?' + params.join('&');
      }

      function updateSoundPreview() {
        var vizId = soundViz.value;
        var config = {};
        config.color = soundColor.value.replace('#', '');
        config.bg = soundBg.value.replace('#', '');
        config.sensitivity = parseInt(soundSens.value, 10);
        var d = getSoundDefaults();
        if (d.smoothing !== undefined) config.smoothing = parseFloat(soundSmooth.value);
        for (var k in soundVizParamValues) config[k] = soundVizParamValues[k];
        SoundManager.switch(vizId, soundPreviewEl, config, null);
        setTimeout(function() { SoundManager.resize(); }, 0);
      }

      [soundColor, soundBg, soundSens, soundSmooth].forEach(function(el) {
        el.addEventListener('input', function() {
          var paramKey = this.id.replace('sound-builder-', '');
          if (paramKey === 'sensitivity') soundUserChanged.sensitivity = true;
          else if (paramKey === 'smoothing') soundUserChanged.smoothing = true;
          else soundUserChanged[paramKey] = true;
          if (this.id === 'sound-builder-sensitivity') document.getElementById('sound-builder-sens-val').textContent = this.value;
          if (this.id === 'sound-builder-smoothing') document.getElementById('sound-builder-smooth-val').textContent = this.value;
          updateSoundUrl();
          updateSoundPreview();
        });
      });

      soundViz.addEventListener('input', function() {
        soundUserChanged = { color: false, bg: false, sensitivity: false, smoothing: false };
        soundVizParamValues = {};
        syncSoundBuilderToVizDefaults();
        syncSoundBuilderVisibility();
        rebuildSoundVizParams();
        updateSoundUrl();
        updateSoundPreview();
      });

      document.getElementById('sound-builder-launch').addEventListener('click', function() {
        var url = soundUrl.textContent.replace('led.run', '');
        window.location.href = url;
      });

      document.getElementById('sound-builder-copy').addEventListener('click', function() {
        var url = 'https://' + soundUrl.textContent;
        navigator.clipboard.writeText(url).then(function() {
          var originalIcon = this.innerHTML;
          this.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(function() { this.innerHTML = originalIcon; }.bind(this), 2000);
        }.bind(this));
      });

      // ====== TIME PANEL LOGIC ======
      var timeClock = document.getElementById('time-builder-clock');
      var timeColor = document.getElementById('time-builder-color');
      var timeBg = document.getElementById('time-builder-bg');
      var timeFill = document.getElementById('time-builder-fill');
      var timeFormat = document.getElementById('time-builder-format');
      var timeSeconds = document.getElementById('time-builder-seconds');
      var timeDate = document.getElementById('time-builder-date');
      var timeDateFormat = document.getElementById('time-builder-dateformat');
      var timeTz = document.getElementById('time-builder-tz');
      var timeUrl = document.getElementById('time-builder-url');
      var timePreviewEl = document.getElementById('time-builder-preview');

      var timeUserChanged = { color: false, bg: false, fill: false, format: false, showSeconds: false, showDate: false, dateFormat: false, tz: false };
      var timeClockParamValues = {};

      function getTimeDefaults() {
        return TimeManager.getDefaults(timeClock.value) || {};
      }

      function syncTimeBuilderToClockDefaults() {
        var d = getTimeDefaults();
        timeColor.value = '#' + (d.color || 'ff0000').slice(0, 6);
        timeBg.value = '#' + (d.bg || '000000').slice(0, 6);
        document.getElementById('time-builder-fill-row').style.display = d.fill !== undefined ? 'flex' : 'none';
        timeFill.value = '#' + (d.fill || '000000').slice(0, 6);
        timeFormat.value = d.format || '24h';
        timeSeconds.checked = d.showSeconds !== false;
        timeDate.checked = !!d.showDate;
        document.getElementById('time-builder-dateformat-row').style.display = d.showDate ? 'flex' : 'none';
        timeDateFormat.value = d.dateFormat || 'MDY';
        timeTz.value = 0;
        document.getElementById('time-builder-tz-val').textContent = '0';
      }

      function rebuildTimeClockParams() {
        var container = document.getElementById('time-builder-clock-params');
        var section = document.getElementById('time-builder-custom-section');
        container.innerHTML = '';
        if (typeof Settings === 'undefined') return;
        var keys = Settings.getThemeParamKeys(timeClock.value, 'time');
        section.style.display = keys.length ? 'flex' : 'none';
        var d = getTimeDefaults();
        keys.forEach(function(key) {
          var meta = Settings.KNOWN_PARAMS[key];
          var defVal = d[key];
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
            ri.min = (meta && meta.min !== undefined) ? meta.min : 0;
            ri.max = (meta && meta.max !== undefined) ? meta.max : 100;
            ri.step = (meta && meta.step !== undefined) ? meta.step : 1;
            ri.value = defVal;
            var rv = document.createElement('span');
            rv.className = 'val'; rv.textContent = defVal;
            labelRow.appendChild(rv);
            ri.addEventListener('input', function() {
              rv.textContent = this.value;
              timeClockParamValues[key] = parseFloat(this.value);
              updateTimeUrl();
              updateTimePreview();
            });
            inputWrap.appendChild(ri);
          } else if (type === 'color') {
            row.className = 'prop-row';
            var ci = document.createElement('input');
            ci.type = 'color'; ci.className = 'builder-color-input';
            ci.value = '#' + (defVal || '000000').slice(0, 6);
            ci.addEventListener('input', function() {
              timeClockParamValues[key] = this.value.replace('#', '');
              updateTimeUrl();
              updateTimePreview();
            });
            inputWrap.appendChild(ci);
          } else if (type === 'select') {
            row.className = 'prop-row';
            var sel = document.createElement('select');
            sel.className = 'builder-select';
            var opts = (meta && meta.options) ? meta.options : [];
            opts.forEach(function(opt) {
              var o = document.createElement('option');
              o.value = opt;
              var tk = 'settings.' + key + '.' + (opt || 'none');
              var tt = I18n.t(tk);
              o.textContent = (tt !== tk) ? tt : opt;
              if (opt === defVal) o.selected = true;
              sel.appendChild(o);
            });
            sel.addEventListener('change', function() {
              timeClockParamValues[key] = this.value;
              updateTimeUrl();
              updateTimePreview();
            });
            inputWrap.appendChild(sel);
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
              timeClockParamValues[key] = this.checked;
              updateTimeUrl();
              updateTimePreview();
            });
            inputWrap.appendChild(toggle);
          }
          row.appendChild(inputWrap);
          container.appendChild(row);
        });
      }

      function updateTimeUrl() {
        var clockId = timeClock.value;
        var d = getTimeDefaults();
        var params = ['t=' + clockId];
        if (timeUserChanged.color) {
          var c = timeColor.value.replace('#', '');
          if (c !== (d.color || 'ff0000')) params.push('color=' + c);
        }
        if (timeUserChanged.bg) {
          var b = timeBg.value.replace('#', '');
          if (b !== (d.bg || '000000')) params.push('bg=' + b);
        }
        if (timeUserChanged.fill && d.fill !== undefined) {
          var f = timeFill.value.replace('#', '');
          if (f !== (d.fill || '000000')) params.push('fill=' + f);
        }
        if (timeUserChanged.format) {
          if (timeFormat.value !== (d.format || '24h')) params.push('format=' + timeFormat.value);
        }
        if (timeUserChanged.showSeconds) {
          if (timeSeconds.checked !== (d.showSeconds !== false)) params.push('showSeconds=' + timeSeconds.checked);
        }
        if (timeUserChanged.showDate) {
          if (timeDate.checked !== !!d.showDate) params.push('showDate=' + timeDate.checked);
        }
        if (timeUserChanged.dateFormat) {
          if (timeDateFormat.value !== (d.dateFormat || 'MDY')) params.push('dateFormat=' + timeDateFormat.value);
        }
        if (timeUserChanged.tz) {
          if (timeTz.value !== '0') params.push('tz=' + timeTz.value);
        }
        for (var k in timeClockParamValues) {
          if (timeClockParamValues[k] !== d[k]) params.push(k + '=' + encodeURIComponent(timeClockParamValues[k]));
        }
        timeUrl.textContent = 'led.run/time?' + params.join('&');
      }

      function updateTimePreview() {
        var clockId = timeClock.value;
        var config = {};
        config.color = timeColor.value.replace('#', '');
        config.bg = timeBg.value.replace('#', '');
        var d = getTimeDefaults();
        if (d.fill !== undefined) config.fill = timeFill.value.replace('#', '');
        config.format = timeFormat.value;
        config.showSeconds = timeSeconds.checked;
        config.showDate = timeDate.checked;
        if (timeDate.checked) config.dateFormat = timeDateFormat.value;
        if (timeTz.value !== '0') config.tz = parseInt(timeTz.value, 10);
        for (var k in timeClockParamValues) config[k] = timeClockParamValues[k];
        TimeManager.switch(clockId, timePreviewEl, config);
        setTimeout(function() { TimeManager.resize(); }, 0);
      }

      [timeColor, timeBg, timeFill, timeFormat, timeDateFormat, timeTz].forEach(function(el) {
        el.addEventListener('input', function() {
          var paramKey = this.id.replace('time-builder-', '');
          timeUserChanged[paramKey] = true;
          if (this.id === 'time-builder-tz') document.getElementById('time-builder-tz-val').textContent = this.value;
          updateTimeUrl();
          updateTimePreview();
        });
      });

      timeSeconds.addEventListener('change', function() {
        timeUserChanged.showSeconds = true;
        updateTimeUrl();
        updateTimePreview();
      });

      timeDate.addEventListener('change', function() {
        timeUserChanged.showDate = true;
        document.getElementById('time-builder-dateformat-row').style.display = this.checked ? 'flex' : 'none';
        updateTimeUrl();
        updateTimePreview();
      });

      timeClock.addEventListener('input', function() {
        timeUserChanged = { color: false, bg: false, fill: false, format: false, showSeconds: false, showDate: false, dateFormat: false, tz: false };
        timeClockParamValues = {};
        syncTimeBuilderToClockDefaults();
        rebuildTimeClockParams();
        updateTimeUrl();
        updateTimePreview();
      });

      document.getElementById('time-builder-launch').addEventListener('click', function() {
        var url = timeUrl.textContent.replace('led.run', '');
        window.location.href = url;
      });

      document.getElementById('time-builder-copy').addEventListener('click', function() {
        var url = 'https://' + timeUrl.textContent;
        navigator.clipboard.writeText(url).then(function() {
          var originalIcon = this.innerHTML;
          this.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(function() { this.innerHTML = originalIcon; }.bind(this), 2000);
        }.bind(this));
      });

      // ====== LANG SWITCHER ======
      document.querySelectorAll('.footer-lang-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          I18n.setLocale(this.dataset.lang);
          self._showLanding(activeProduct);
        });
      });

      // Initialize all builders (DOM exists even when panels are hidden)
      syncBuilderToThemeDefaults();
      rebuildThemeParams();
      if (activeMode === 'builder' && activeProduct === 'text') {
        updateTextPreview();
      }

      syncLightBuilderToEffectDefaults();
      syncLightBuilderVisibility();
      rebuildLightEffectParams();
      updateLightUrl();
      if (activeMode === 'builder' && activeProduct === 'light') {
        updateLightPreview();
      }

      syncSoundBuilderToVizDefaults();
      syncSoundBuilderVisibility();
      rebuildSoundVizParams();
      updateSoundUrl();
      if (activeMode === 'builder' && activeProduct === 'sound') {
        updateSoundPreview();
      }

      syncTimeBuilderToClockDefaults();
      rebuildTimeClockParams();
      updateTimeUrl();
      if (activeMode === 'builder' && activeProduct === 'time') {
        updateTimePreview();
      }

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
