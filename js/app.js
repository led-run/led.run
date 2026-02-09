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

      // Update meta description
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = I18n.t('meta.description');

      var container = this._container;
      container.className = '';
      container.style.height = 'auto';
      container.style.overflow = 'auto';

      var html = '';
      html += '<div class="landing">';

      // Hero
      html += '<div class="landing-hero">';
      html += '<div class="hero-brand"><span class="hero-brand-icon"></span>' + I18n.t('landing.hero.brand') + '</div>';
      html += '<h1 class="hero-title">' + I18n.t('landing.hero.title') + '</h1>';
      html += '<p class="hero-subtitle">' + I18n.t('landing.hero.subtitle') + '</p>';

      // Input
      html += '<div class="input-group">';
      html += '<div class="input-prefix">led.run/</div>';
      html += '<input class="url-input" type="text" placeholder="HELLO" autocomplete="off" spellcheck="false" autofocus>';
      html += '<button class="btn-launch">' + I18n.t('landing.input.go') + '</button>';
      html += '</div>'; // end input-group

      // Builder toggle link
      var builderOpen = localStorage.getItem('led-builder-mode') === 'advanced';
      html += '<a class="builder-toggle-link' + (builderOpen ? ' open' : '') + '" id="builder-toggle">';
      html += '<span class="builder-toggle-text">' + I18n.t(builderOpen ? 'landing.builder.hideAdvanced' : 'landing.builder.showAdvanced') + '</span>';
      html += '<span class="builder-toggle-arrow">\u25be</span>';
      html += '</a>';

      // Visual URL builder
      html += '<div class="landing-builder' + (builderOpen ? ' builder-open' : '') + '">';

      // Row 1: Theme + Mode
      html += '<div class="builder-row">';
      html += '<span class="builder-label">' + I18n.t('settings.theme') + '</span>';
      html += '<select class="builder-select" id="builder-theme">';
      var bThemeIds = ThemeManager.getThemeIds();
      html += '<option value="default">' + I18n.t('settings.theme.default') + '</option>';
      bThemeIds.forEach(function(id) {
        if (id === 'default') return;
        html += '<option value="' + id + '">' + I18n.t('settings.theme.' + id) + '</option>';
      });
      html += '</select>';
      html += '<span class="builder-label">' + I18n.t('settings.param.mode') + '</span>';
      html += '<select class="builder-select builder-select-narrow" id="builder-mode">';
      html += '<option value="">' + I18n.t('settings.mode.none') + '</option>';
      html += '<option value="sign">' + I18n.t('settings.mode.sign') + '</option>';
      html += '<option value="flow">' + I18n.t('settings.mode.flow') + '</option>';
      html += '</select>';
      html += '</div>';

      // Row 2: Color + BG + Fill (fill only for card themes)
      html += '<div class="builder-row">';
      html += '<span class="builder-label">' + I18n.t('settings.param.color') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-color" value="#00ff41">';
      html += '<span class="builder-label">' + I18n.t('settings.param.bg') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-bg" value="#000000">';
      html += '<span id="builder-fill-group" style="display:none">';
      html += '<span class="builder-label">' + I18n.t('settings.param.fill') + '</span>';
      html += '<input type="color" class="builder-color-input" id="builder-fill" value="#000000">';
      html += '</span>';
      html += '</div>';

      // Row 3: Speed + Direction + Scale
      html += '<div class="builder-row">';
      html += '<span class="builder-label">' + I18n.t('settings.param.speed') + '</span>';
      html += '<input type="range" class="builder-range" id="builder-speed" min="10" max="300" step="10" value="60">';
      html += '<span class="builder-range-value" id="builder-speed-val">60</span>';
      html += '<span class="builder-label">' + I18n.t('settings.param.direction') + '</span>';
      html += '<select class="builder-select builder-select-narrow" id="builder-direction">';
      html += '<option value="left">' + I18n.t('settings.direction.left') + '</option>';
      html += '<option value="right">' + I18n.t('settings.direction.right') + '</option>';
      html += '</select>';
      html += '<span class="builder-label">' + I18n.t('settings.param.scale') + '</span>';
      html += '<input type="range" class="builder-range builder-range-short" id="builder-scale" min="0.1" max="1" step="0.1" value="1">';
      html += '<span class="builder-range-value" id="builder-scale-val">1</span>';
      html += '</div>';

      // Row 4: Font
      html += '<div class="builder-row">';
      html += '<span class="builder-label">' + I18n.t('settings.param.font') + '</span>';
      html += '<input type="text" class="builder-string-input" id="builder-font" value="" placeholder="e.g. Arial, serif">';
      html += '</div>';

      // Theme-specific params (dynamically populated)
      html += '<div id="builder-theme-params"></div>';

      // URL preview with copy button
      html += '<div class="builder-url-row">';
      html += '<div class="builder-url-preview" id="builder-preview">led.run/HELLO</div>';
      html += '<button class="builder-copy-btn" id="builder-copy" type="button">';
      html += '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      html += '</button>';
      html += '</div>';

      html += '</div>'; // end landing-builder

      html += '</div>'; // end landing-hero

      // Helper to render a preset grid
      function renderPresets(presets) {
        var out = '';
        presets.forEach(function(p) {
          var href = '/' + encodeURIComponent(p.text) + (p.params || '');
          out += '<a class="preset-card" href="' + href + '">';

          out += '<div class="preset-header">';
          out += '<span class="preset-icon">' + p.icon + '</span>';
          if (p.badgeKey) {
            out += '<span class="preset-badge">' + I18n.t(p.badgeKey) + '</span>';
          }
          out += '</div>';

          out += '<div class="preset-title">' + p.text + '</div>';
          out += '<div class="preset-desc">' + I18n.t(p.descKey) + '</div>';
          out += '</a>';
        });
        return out;
      }

      // Flow mode presets
      html += '<div class="section-title">' + I18n.t('landing.section.flow') + '</div>';
      html += '<div class="presets-grid">';
      html += renderPresets(FLOW_PRESETS);
      html += '</div>';

      // Sign mode presets
      html += '<div class="section-title">' + I18n.t('landing.section.sign') + '</div>';
      html += '<div class="presets-grid">';
      html += renderPresets(SIGN_PRESETS);
      html += '</div>';

      // Footer
      html += '<footer class="landing-footer">';
      html += '<div>' + I18n.t('landing.footer.copyright') + '</div>';
      html += '<div class="footer-links">';
      var docsHref = I18n.locale() === 'en' ? '/docs' : '/docs/' + I18n.locale() + '/';
      html += '<a href="' + docsHref + '">' + I18n.t('landing.footer.docs') + '</a>';
      html += '<a href="https://github.com/led-run/led.run" target="_blank">' + I18n.t('landing.footer.github') + '</a>';
      html += '<a href="https://github.com/led-run/led.run/blob/main/LICENSE" target="_blank">' + I18n.t('landing.footer.license') + '</a>';
      html += '</div>';

      // Language switcher
      html += '<div class="footer-lang">';
      html += '<span class="footer-lang-label">' + I18n.t('landing.footer.language') + ':</span>';
      var supported = I18n.supported();
      var currentLang = I18n.locale();
      supported.forEach(function(lang, i) {
        if (i > 0) html += '<span class="footer-lang-sep">|</span>';
        if (lang === currentLang) {
          html += '<span class="footer-lang-current">' + LANG_LABELS[lang] + '</span>';
        } else {
          html += '<a class="footer-lang-link" href="#" data-lang="' + lang + '">' + LANG_LABELS[lang] + '</a>';
        }
      });
      html += '</div>';

      html += '</footer>';

      html += '</div>'; // end landing

      container.innerHTML = html;

      // Bind input events
      var input = container.querySelector('.url-input');
      var goBtn = container.querySelector('.btn-launch');
      var builderTheme = container.querySelector('#builder-theme');
      var builderColor = container.querySelector('#builder-color');
      var builderBg = container.querySelector('#builder-bg');
      var builderFill = container.querySelector('#builder-fill');
      var builderFillGroup = container.querySelector('#builder-fill-group');
      var builderMode = container.querySelector('#builder-mode');
      var builderSpeed = container.querySelector('#builder-speed');
      var builderSpeedVal = container.querySelector('#builder-speed-val');
      var builderDirection = container.querySelector('#builder-direction');
      var builderScale = container.querySelector('#builder-scale');
      var builderScaleVal = container.querySelector('#builder-scale-val');
      var builderFont = container.querySelector('#builder-font');
      var builderPreview = container.querySelector('#builder-preview');
      var builderThemeParams = container.querySelector('#builder-theme-params');
      var builderToggle = container.querySelector('#builder-toggle');
      var builderPanel = container.querySelector('.landing-builder');
      var builderCopy = container.querySelector('#builder-copy');
      var self = this;

      // Track whether user has explicitly changed each common param
      var userChanged = { color: false, bg: false, fill: false, speed: false, direction: false, scale: false, font: false };
      // Theme-specific param values (only stores user-changed values)
      var themeParamValues = {};

      function getDefaults() {
        return ThemeManager.getDefaults(builderTheme.value) || { color: '00ff41', bg: '000000', speed: 60, direction: 'left', scale: 1 };
      }

      function collectParams() {
        var defaults = getDefaults();
        var params = [];
        if (builderTheme.value !== 'default') params.push('t=' + builderTheme.value);
        if (userChanged.color) {
          var color = builderColor.value.replace('#', '');
          if (color !== (defaults.color || '').slice(0, 6)) params.push('c=' + color);
        }
        if (userChanged.bg) {
          var bg = builderBg.value.replace('#', '');
          if (bg !== (defaults.bg || '').slice(0, 6)) params.push('bg=' + bg);
        }
        if (userChanged.fill) {
          var fill = builderFill.value.replace('#', '');
          if (fill !== (defaults.fill || '').slice(0, 6)) params.push('fill=' + fill);
        }
        if (builderMode.value) params.push('mode=' + builderMode.value);
        if (userChanged.speed) {
          var speed = parseInt(builderSpeed.value, 10);
          if (speed !== (defaults.speed || 60)) params.push('speed=' + speed);
        }
        if (userChanged.direction) {
          if (builderDirection.value !== (defaults.direction || 'left')) params.push('dir=' + builderDirection.value);
        }
        if (userChanged.scale) {
          var scale = parseFloat(builderScale.value);
          if (scale !== (defaults.scale || 1)) params.push('scale=' + scale);
        }
        if (userChanged.font) {
          var font = builderFont.value.trim();
          if (font && font !== (defaults.font || '')) params.push('font=' + encodeURIComponent(font));
        }
        // Theme-specific params
        for (var key in themeParamValues) {
          var val = themeParamValues[key];
          if (val !== undefined && val !== defaults[key]) {
            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
          }
        }
        return params;
      }

      function buildUrl() {
        var val = input.value.trim() || 'HELLO';
        var url = 'led.run/' + val;
        var params = collectParams();
        if (params.length) url += '?' + params.join('&');
        builderPreview.textContent = url;
      }

      function isBuilderOpen() {
        return builderPanel.classList.contains('builder-open');
      }

      function navigate() {
        var val = input.value.trim();
        if (val) {
          var search = '';
          if (isBuilderOpen()) {
            var params = collectParams();
            search = params.length ? '?' + params.join('&') : '';
          }
          window.location.href = '/' + encodeURIComponent(val) + search;
        }
      }

      function syncToThemeDefaults() {
        var defaults = getDefaults();
        builderColor.value = '#' + (defaults.color || '00ff41').slice(0, 6);
        builderBg.value = '#' + (defaults.bg || '000000').slice(0, 6);
        // Show fill only for themes that have it in defaults
        var hasFill = defaults.fill !== undefined;
        builderFillGroup.style.display = hasFill ? 'contents' : 'none';
        builderFill.value = '#' + (defaults.fill || defaults.bg || '000000').slice(0, 6);
        builderSpeed.value = defaults.speed || 60;
        builderSpeedVal.textContent = defaults.speed || 60;
        builderDirection.value = defaults.direction || 'left';
        builderScale.value = defaults.scale || 1;
        builderScaleVal.textContent = defaults.scale || 1;
        builderFont.value = defaults.font || '';
        userChanged = { color: false, bg: false, fill: false, speed: false, direction: false, scale: false, font: false };
        themeParamValues = {};
      }

      // Build theme-specific param controls dynamically
      function rebuildThemeParams() {
        builderThemeParams.innerHTML = '';
        if (typeof Settings === 'undefined') return;

        var themeId = builderTheme.value;
        var keys = Settings.getThemeParamKeys(themeId);
        if (keys.length === 0) return;

        var defaults = getDefaults();
        var KNOWN = Settings.KNOWN_PARAMS;

        keys.forEach(function(key) {
          var meta = KNOWN[key];
          var defVal = defaults[key];
          var type;
          if (meta && meta.type !== 'auto') {
            type = meta.type;
          } else {
            type = Settings.inferType(defVal);
          }
          var labelKey = meta ? meta.label : 'settings.param.' + key;

          var row = document.createElement('div');
          row.className = 'builder-row';

          var label = document.createElement('span');
          label.className = 'builder-label';
          label.textContent = I18n.t(labelKey);
          row.appendChild(label);

          if (type === 'color') {
            var hexVal = (typeof defVal === 'string' ? defVal : '000000').slice(0, 6);
            var ci = document.createElement('input');
            ci.type = 'color';
            ci.className = 'builder-color-input';
            ci.value = '#' + hexVal;
            ci.addEventListener('input', function() {
              themeParamValues[key] = this.value.replace('#', '');
              buildUrl();
            });
            row.appendChild(ci);
          } else if (type === 'range') {
            var min = (meta && meta.min !== undefined) ? meta.min : 0;
            var max = (meta && meta.max !== undefined) ? meta.max : 100;
            var step = (meta && meta.step !== undefined) ? meta.step : 1;
            var numVal = (typeof defVal === 'number') ? defVal : parseFloat(defVal) || min;
            var ri = document.createElement('input');
            ri.type = 'range';
            ri.className = 'builder-range';
            ri.min = min;
            ri.max = max;
            ri.step = step;
            ri.value = numVal;
            var rv = document.createElement('span');
            rv.className = 'builder-range-value';
            rv.textContent = numVal;
            ri.addEventListener('input', function() {
              rv.textContent = this.value;
              themeParamValues[key] = parseFloat(this.value);
              buildUrl();
            });
            row.appendChild(ri);
            row.appendChild(rv);
          } else if (type === 'boolean') {
            var toggle = document.createElement('label');
            toggle.className = 'builder-toggle';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = !!defVal;
            var track = document.createElement('span');
            track.className = 'builder-toggle-track';
            toggle.appendChild(cb);
            toggle.appendChild(track);
            cb.addEventListener('change', function() {
              themeParamValues[key] = this.checked;
              buildUrl();
            });
            row.appendChild(toggle);
          } else if (type === 'select') {
            var sel = document.createElement('select');
            sel.className = 'builder-select';
            var opts = (meta && meta.options) ? meta.options : [];
            opts.forEach(function(opt) {
              var o = document.createElement('option');
              o.value = opt;
              var tk = 'settings.' + key + '.' + (opt || 'none');
              var translated = I18n.t(tk);
              o.textContent = (translated !== tk) ? translated : (opt || '\u2014');
              if (opt === defVal || (opt === '' && !defVal)) o.selected = true;
              sel.appendChild(o);
            });
            sel.addEventListener('change', function() {
              themeParamValues[key] = this.value;
              buildUrl();
            });
            row.appendChild(sel);
          } else {
            var ti = document.createElement('input');
            ti.type = 'text';
            ti.className = 'builder-string-input';
            ti.value = defVal || '';
            ti.placeholder = key;
            ti.addEventListener('change', function() {
              themeParamValues[key] = this.value;
              buildUrl();
            });
            row.appendChild(ti);
          }

          builderThemeParams.appendChild(row);
        });
      }

      builderTheme.addEventListener('change', function() {
        syncToThemeDefaults();
        rebuildThemeParams();
        buildUrl();
      });
      builderColor.addEventListener('input', function() { userChanged.color = true; buildUrl(); });
      builderBg.addEventListener('input', function() { userChanged.bg = true; buildUrl(); });
      builderFill.addEventListener('input', function() { userChanged.fill = true; buildUrl(); });
      builderMode.addEventListener('change', buildUrl);
      builderSpeed.addEventListener('input', function() {
        builderSpeedVal.textContent = this.value;
        userChanged.speed = true;
        buildUrl();
      });
      builderDirection.addEventListener('change', function() { userChanged.direction = true; buildUrl(); });
      builderScale.addEventListener('input', function() {
        builderScaleVal.textContent = this.value;
        userChanged.scale = true;
        buildUrl();
      });
      builderFont.addEventListener('change', function() { userChanged.font = true; buildUrl(); });
      input.addEventListener('input', buildUrl);

      // Builder toggle
      builderToggle.addEventListener('click', function(e) {
        e.preventDefault();
        var opening = !builderPanel.classList.contains('builder-open');
        builderPanel.classList.toggle('builder-open');
        builderToggle.classList.toggle('open');
        var textEl = builderToggle.querySelector('.builder-toggle-text');
        textEl.textContent = I18n.t(opening ? 'landing.builder.hideAdvanced' : 'landing.builder.showAdvanced');
        localStorage.setItem('led-builder-mode', opening ? 'advanced' : 'simple');
      });

      // Copy URL button
      builderCopy.addEventListener('click', function() {
        var url = 'https://' + builderPreview.textContent;
        navigator.clipboard.writeText(url).then(function() {
          builderCopy.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          builderCopy.classList.add('copied');
          setTimeout(function() {
            builderCopy.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            builderCopy.classList.remove('copied');
          }, 1500);
        });
      });

      goBtn.addEventListener('click', navigate);
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') navigate();
      });

      // Bind language switcher
      var langLinks = container.querySelectorAll('.footer-lang-link');
      langLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          I18n.setLocale(this.dataset.lang);
          self._showLanding();
        });
      });

      // Initialize theme params and URL preview
      rebuildThemeParams();
      buildUrl();

      // Focus input
      // setTimeout to ensure layout is settled
      setTimeout(function() { input.focus(); }, 50);
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
