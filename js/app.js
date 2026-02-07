/**
 * led.run App
 * Application entry point and orchestrator
 */
;(function(global) {
  'use strict';

  // App-level parameters (not passed to themes)
  var APP_PARAMS = ['wakelock', 'cursor'];

  // Preset cards for landing page
  var PRESETS = [
    { text: 'OPEN', icon: '💡', desc: 'Marquee lights', params: '?t=marquee' },
    { text: 'ON AIR', icon: '🔴', desc: 'Studio broadcast', params: '?t=broadcast' },
    { text: 'HELLO', icon: '👋', desc: 'Friendly greeting' },
    { text: 'Welcome!', icon: '🎉', desc: 'Welcome visitors' },
    { text: 'SALE', icon: '🏷️', desc: 'Sale announcement', params: '?c=ff0000' },
    { text: 'DO NOT DISTURB', icon: '🔕', desc: 'Privacy sign', params: '?c=ff4444&bg=1a1a1a' },
    { text: 'MOOD', icon: '💜', desc: 'Mood ambient', params: '?t=pulse' },
    { text: 'OPEN', icon: '🪵', desc: 'Cafe wood sign', params: '?t=wood' }
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

      // No text → show landing page
      if (!text) {
        this._showLanding();
        return;
      }

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

      // Determine theme
      var themeId = themeConfig.theme || 'default';
      delete themeConfig.theme;

      // Set page title
      document.title = text + ' — led.run';

      // Switch theme
      ThemeManager.switch(themeId, this._container, text, themeConfig);

      // Initialize App-level UI
      WakeLock.init({ wakelock: appConfig.wakelock });
      Cursor.init({ cursor: appConfig.cursor });

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
    },

    /**
     * Show landing page
     * @private
     */
    _showLanding() {
      document.title = 'led.run — Digital Signage';
      document.body.style.overflow = 'auto';

      var container = this._container;
      container.className = '';
      container.style.height = 'auto';
      container.style.overflow = 'auto';

      var html = '';
      html += '<div class="landing">';

      // Header
      html += '<header class="landing-header">';
      html += '<div class="landing-logo">led.run</div>';
      html += '<div class="landing-tagline">Digital Signage</div>';
      html += '<div class="landing-tagline-sub">URL is your sign. No app needed.</div>';
      html += '</header>';

      // Input section
      html += '<section class="landing-input-section">';
      html += '<div class="url-preview">';
      html += '<span class="url-prefix">led.run/</span>';
      html += '<input class="url-input" type="text" placeholder="YOUR TEXT HERE" autocomplete="off" spellcheck="false">';
      html += '<button class="url-go">GO</button>';
      html += '</div>';
      html += '</section>';

      // Preset cards
      html += '<section class="presets-section">';
      html += '<div class="presets-title">Quick Start</div>';
      html += '<div class="presets-grid">';
      PRESETS.forEach(function(p) {
        var href = '/' + encodeURIComponent(p.text) + (p.params || '');
        html += '<a class="preset-card" href="' + href + '">';
        html += '<span class="preset-icon">' + p.icon + '</span>';
        html += '<span class="preset-name">' + p.text + '</span>';
        html += '<span class="preset-desc">' + p.desc + '</span>';
        html += '</a>';
      });
      html += '</div>';
      html += '</section>';

      // Usage examples
      html += '<section class="usage-section">';
      html += '<div class="usage-title">Examples</div>';
      html += '<div class="usage-examples">';
      html += '<span class="usage-example">led.run/OPEN</span>';
      html += '<span class="usage-example">led.run/Hello?t=neon</span>';
      html += '<span class="usage-example">led.run/SALE?c=ff0000</span>';
      html += '<span class="usage-example">led.run/Welcome!?mode=flow</span>';
      html += '<span class="usage-example">led.run/你好?t=retro</span>';
      html += '<span class="usage-example">led.run/ERROR?t=glitch</span>';
      html += '<span class="usage-example">led.run/Hello?t=typewriter</span>';
      html += '<span class="usage-example">led.run/RAINBOW?t=gradient</span>';
      html += '<span class="usage-example">led.run/FUTURE?t=hologram</span>';
      html += '<span class="usage-example">led.run/ON AIR?t=broadcast</span>';
      html += '<span class="usage-example">led.run/OPEN?t=marquee</span>';
      html += '<span class="usage-example">led.run/MOOD?t=pulse</span>';
      html += '<span class="usage-example">led.run/✨?t=aurora</span>';
      html += '<span class="usage-example">led.run/PARTY?t=firework</span>';
      html += '<span class="usage-example">led.run/OPEN?t=wood</span>';
      html += '</div>';
      html += '</section>';

      // Footer
      html += '<footer class="landing-footer">';
      html += '<a href="https://github.com/nicely-gg/led.run">GitHub</a>';
      html += '</footer>';

      html += '</div>';

      container.innerHTML = html;

      // Bind input events
      var input = container.querySelector('.url-input');
      var goBtn = container.querySelector('.url-go');

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

      // Focus input
      input.focus();
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
