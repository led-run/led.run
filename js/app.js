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
      html += '<a href="/docs">' + I18n.t('landing.footer.docs') + '</a>';
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
      var self = this;

      function navigate() {
        var val = input.value.trim();
        if (val) {
          window.location.href = '/' + encodeURIComponent(val);
        }
      }

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
