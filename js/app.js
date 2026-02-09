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

  var App = {
    _container: null,

    /**
     * Boot the application
     */
    init() {
      this._container = document.getElementById('sign-container');

      // Parse URL
      var parsed = URLParser.parse();
      var text = parsed.text;

      // Separate app-level and theme-level params
      var appConfig = {};
      var themeConfig = {};

      for (var key in parsed) {
        if (key === 'text') continue;
        if (APP_PARAMS.indexOf(key) !== -1) {
          appConfig[key] = parsed[key];
        } else {
          themeConfig[key] = parsed[key];
        }
      }

      // Initialize i18n (before any rendering)
      I18n.init(appConfig.lang);

      // No text → show landing page
      if (!text) {
        this._showLanding();
        return;
      }

      // Determine theme
      var themeId = themeConfig.theme || 'default';
      delete themeConfig.theme;

      // Set page title
      document.title = text + ' \u2014 led.run';

      // Switch theme
      ThemeManager.switch(themeId, this._container, text, themeConfig);
      document.getElementById('app').dataset.theme = themeId;

      // Initialize App-level UI
      WakeLock.init({ wakelock: appConfig.wakelock });
      Cursor.init({ cursor: appConfig.cursor });

      // Receiver mode: clean display only (no controls, no toolbar)
      if (typeof Cast !== 'undefined' && Cast._isReceiver()) {
        Cast.init();
        return;
      }

      // Initialize controls with callbacks bridging to current theme
      Controls.init({
        onTogglePause: function() {
          var theme = ThemeManager.getCurrent();
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
          text: text,
          themeId: themeId,
          themeConfig: themeConfig
        });
      }

      // Initialize cast (auto-reconnects if session exists)
      if (typeof Cast !== 'undefined') {
        Cast.init();
      }
    },

    /**
     * Show landing page
     * @private
     */
    _showLanding() {
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

      // Mode Switcher
      html += '<div class="mode-switcher">';
      html += '<button class="mode-tab' + (activeMode === 'simple' ? ' active' : '') + '" data-mode="simple">' + I18n.t('landing.mode.simple') + '</button>';
      html += '<button class="mode-tab' + (activeMode === 'builder' ? ' active' : '') + '" data-mode="builder">' + I18n.t('landing.mode.builder') + '</button>';
      html += '</div>';

      html += '<div class="landing-content">';

      // --- Simple Mode Panel ---
      html += '<div class="mode-panel' + (activeMode === 'simple' ? ' active' : '') + '" id="panel-simple">';
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
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // --- Builder Mode Panel ---
      html += '<div class="mode-panel' + (activeMode === 'builder' ? ' active' : '') + '" id="panel-builder">';
      
      // Top Level: The Preview "Canvas"
      html += '<div class="builder-canvas">';
      html += '<div class="preview-card">';
      html += '<div class="preview-label">Live Preview</div>';
      html += '<div id="builder-live-preview"></div>';
      html += '</div>';
      html += '</div>';

      // Bottom Level: Modular Property Cards
      html += '<div class="builder-grid">';
      
      // Card 1: Content & Identity
      html += '<div class="prop-card">';
      html += '<div class="prop-card-title">' + I18n.t('settings.text') + '</div>';
      html += '<div class="prop-group">';
      html += '<input type="text" class="builder-text-input" id="builder-text" placeholder="HELLO" autocomplete="off">';
      html += '</div>';
      html += '</div>';

      // Card 2: Theme & Layout
      html += '<div class="prop-card">';
      html += '<div class="prop-card-title">Theme & Mode</div>';
      html += '<div class="prop-group">';
      html += '<div class="prop-row">';
      html += '<span class="prop-label">' + I18n.t('settings.theme') + '</span>';
      html += '<select class="builder-select" id="builder-theme">';
      var bThemeIds = ThemeManager.getThemeIds();
      html += '<option value="default">' + I18n.t('settings.theme.default') + '</option>';
      bThemeIds.forEach(function(id) {
        if (id === 'default') return;
        html += '<option value="' + id + '">' + I18n.t('settings.theme.' + id) + '</option>';
      });
      html += '</select>';
      html += '</div>';
      html += '<div class="prop-row">';
      html += '<span class="prop-label">' + I18n.t('settings.param.mode') + '</span>';
      html += '<select class="builder-select" id="builder-mode">';
      html += '<option value="">' + I18n.t('settings.mode.none') + '</option>';
      html += '<option value="sign">' + I18n.t('settings.mode.sign') + '</option>';
      html += '<option value="flow">' + I18n.t('settings.mode.flow') + '</option>';
      html += '</select>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Card 3: Visual Style
      html += '<div class="prop-card">';
      html += '<div class="prop-card-title">Visual Style</div>';
      html += '<div class="prop-group">';
      html += '<div class="prop-row">';
      html += '<span class="prop-label">' + I18n.t('settings.param.color') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-color" value="#00ff41">';
      html += '<span class="prop-label">' + I18n.t('settings.param.bg') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-bg" value="#000000">';
      html += '</div>';
      html += '<div class="prop-row" id="builder-fill-row" style="display:none">';
      html += '<span class="prop-label">' + I18n.t('settings.param.fill') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-fill" value="#000000">';
      html += '</div>';
      html += '<div class="prop-row">';
      html += '<span class="prop-label">' + I18n.t('settings.param.font') + '</span>';
      html += '<select class="builder-select" id="builder-font">';
      if (typeof Settings !== 'undefined' && Settings.FONT_PRESETS) {
        Settings.FONT_PRESETS.forEach(function(preset) {
          html += '<option value="' + preset.value + '">' + I18n.t(preset.labelKey) + '</option>';
        });
        html += '<option value="' + Settings.FONT_CUSTOM_VALUE + '">' + I18n.t('settings.font.custom') + '</option>';
      }
      html += '</select>';
      html += '</div>';
      html += '<input type="text" class="builder-text-input" id="builder-font-custom" placeholder="e.g. Helvetica" style="display:none; margin-top:8px">';
      html += '</div>';
      html += '</div>';

      // Card 4: Dynamics
      html += '<div class="prop-card">';
      html += '<div class="prop-card-title">Dynamics</div>';
      html += '<div class="prop-group">';
      html += '<div class="prop-row-stack">';
      html += '<div class="prop-label-row"><span>' + I18n.t('settings.param.speed') + '</span><span class="val" id="builder-speed-val">60</span></div>';
      html += '<input type="range" class="builder-range" id="builder-speed" min="10" max="300" step="10" value="60">';
      html += '</div>';
      html += '<div class="prop-row-stack">';
      html += '<div class="prop-label-row"><span>' + I18n.t('settings.param.scale') + '</span><span class="val" id="builder-scale-val">1.0</span></div>';
      html += '<input type="range" class="builder-range" id="builder-scale" min="0.1" max="1" step="0.1" value="1">';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Card 5: Advanced (Dynamic)
      html += '<div class="prop-card" id="builder-custom-section" style="display:none">';
      html += '<div class="prop-card-title">Advanced Params</div>';
      html += '<div class="prop-group" id="builder-theme-params"></div>';
      html += '</div>';

      // Final Action Card (URL & Go)
      html += '<div class="prop-card prop-card-highlight">';
      html += '<div class="builder-url-box">';
      html += '<div class="builder-url-preview" id="builder-url-preview">led.run/HELLO</div>';
      html += '</div>';
      html += '<div class="builder-actions">';
      html += '<button class="btn-primary" id="builder-launch">' + I18n.t('landing.input.go') + '</button>';
      html += '<button class="btn-secondary" id="builder-copy" title="Copy URL">';
      html += '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      html += '</button>';
      html += '</div>';
      html += '</div>';

      html += '</div>'; // end builder-grid
      html += '</div>'; // end panel-builder

      html += '</div>'; // end landing-content
      html += '</div>'; // end landing-hero

      // Helper to render a preset grid
      function renderPresets(presets) {
        var out = '';
        presets.forEach(function(p) {
          var href = '/' + encodeURIComponent(p.text) + (p.params || '');
          out += '<a class="preset-card" href="' + href + '">';
          out += '<div class="preset-header">';
          out += '<span class="preset-icon">' + p.icon + '</span>';
          if (p.badgeKey) out += '<span class="preset-badge">' + I18n.t(p.badgeKey) + '</span>';
          out += '</div>';
          out += '<div class="preset-title">' + p.text + '</div>';
          out += '<div class="preset-desc">' + I18n.t(p.descKey) + '</div>';
          out += '</a>';
        });
        return out;
      }

      // Sections
      html += '<div class="section-title">' + I18n.t('landing.section.flow') + '</div>';
      html += '<div class="presets-grid">' + renderPresets(FLOW_PRESETS) + '</div>';
      html += '<div class="section-title">' + I18n.t('landing.section.sign') + '</div>';
      html += '<div class="presets-grid">' + renderPresets(SIGN_PRESETS) + '</div>';

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

      html += '</div>'; // end landing

      container.innerHTML = html;

      // --- Interaction Logic ---
      var self = this;
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
        return ThemeManager.getDefaults(builderTheme.value) || {};
      }

      function updatePreview() {
        var text = builderText.value.trim() || 'HELLO';
        var themeId = builderTheme.value;
        var defaults = getDefaults();
        
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
        
        // Merge theme-specific params
        for (var k in themeParamValues) config[k] = themeParamValues[k];

        // Update URL text
        var params = [];
        if (themeId !== 'default') params.push('t=' + themeId);
        for (var key in config) {
          if (config[key] !== undefined) params.push(key + '=' + encodeURIComponent(config[key]));
        }
        var url = 'led.run/' + encodeURIComponent(text) + (params.length ? '?' + params.join('&') : '');
        builderUrlPreview.textContent = url;

        // Update Live Preview
        ThemeManager.switch(themeId, livePreview, text, config);
        
        // Ensure the theme correctly calculates sizes for the preview container
        if (ThemeManager.resize) {
          setTimeout(function() { ThemeManager.resize(); }, 0);
        }
      }

      // Bind Mode Switcher
      document.querySelectorAll('.mode-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          var mode = this.dataset.mode;
          localStorage.setItem('led-active-mode', mode);
          document.querySelectorAll('.mode-tab').forEach(function(t) { t.classList.toggle('active', t === tab); });
          document.querySelectorAll('.mode-panel').forEach(function(p) { p.classList.toggle('active', p.id === 'panel-' + mode); });
          if (mode === 'builder') {
            updatePreview();
            // Trigger an extra resize after panel becomes visible
            setTimeout(function() { if (ThemeManager.resize) ThemeManager.resize(); }, 50);
          }
        });
      });

      // Simple Mode Events
      function goSimple() {
        var val = simpleInput.value.trim();
        if (val) window.location.href = '/' + encodeURIComponent(val);
      }
      document.getElementById('simple-go').addEventListener('click', goSimple);
      simpleInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') goSimple(); });
      document.getElementById('simple-random').addEventListener('click', function() {
        var val = simpleInput.value.trim() || 'HELLO';
        var themes = ThemeManager.getThemeIds();
        var theme = themes[Math.floor(Math.random() * themes.length)];
        window.location.href = '/' + encodeURIComponent(val) + '?t=' + theme;
      });

      // Builder Mode Events
      [builderText, builderTheme, builderMode, builderColor, builderBg, builderFill, builderSpeed, builderScale, builderFont, builderFontCustom].forEach(function(el) {
        el.addEventListener('input', function() {
          if (this.id !== 'builder-text' && this.id !== 'builder-theme' && this.id !== 'builder-mode') {
            userChanged[this.id.replace('builder-', '')] = true;
          }
          if (this.id === 'builder-speed') document.getElementById('builder-speed-val').textContent = this.value;
          if (this.id === 'builder-scale') document.getElementById('builder-scale-val').textContent = this.value;
          
          if (this.id === 'builder-font') {
            builderFontCustom.style.display = (this.value === Settings.FONT_CUSTOM_VALUE) ? 'block' : 'none';
          }

          if (this.id === 'builder-theme') {
            userChanged = { color: false, bg: false, fill: false, speed: false, scale: false, font: false };
            themeParamValues = {};
            syncBuilderToThemeDefaults();
            rebuildThemeParams();
          }
          updatePreview();
        });
      });

      function syncBuilderToThemeDefaults() {
        var d = getDefaults();
        builderColor.value = '#' + (d.color || '00ff41').slice(0, 6);
        builderBg.value = '#' + (d.bg || '000000').slice(0, 6);
        var hasFill = d.fill !== undefined;
        document.getElementById('builder-fill-row').style.display = hasFill ? 'flex' : 'none';
        builderFill.value = '#' + (d.fill || '000000').slice(0, 6);
        builderSpeed.value = d.speed || 60;
        document.getElementById('builder-speed-val').textContent = builderSpeed.value;
        builderScale.value = d.scale || 1;
        document.getElementById('builder-scale-val').textContent = builderScale.value;
        
        // Reset font
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
              updatePreview();
            });
            inputWrap.appendChild(ri);
          } else if (type === 'color') {
            row.className = 'prop-row';
            var ci = document.createElement('input');
            ci.type = 'color'; ci.className = 'builder-color-input';
            ci.value = '#' + (defVal || '000000').slice(0, 6);
            ci.addEventListener('input', function() {
              themeParamValues[key] = this.value.replace('#', '');
              updatePreview();
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
              updatePreview();
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

      // Lang switcher
      document.querySelectorAll('.footer-lang-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          I18n.setLocale(this.dataset.lang);
          self._showLanding();
        });
      });

      // Initialize
      if (activeMode === 'builder') {
        syncBuilderToThemeDefaults();
        rebuildThemeParams();
        updatePreview();
      }
      setTimeout(function() { (activeMode === 'simple' ? simpleInput : builderText).focus(); }, 100);
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
