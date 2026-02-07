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
    { text: 'DO NOT DISTURB', icon: '🤫', desc: 'Professional studio-grade privacy sign with high-fidelity textures.', params: '?t=do-not-disturb' },
    { text: 'NEON NIGHT', icon: '🏮', desc: 'Vibrant gas-tube effect with realistic flicker and transformer hum.', params: '?t=neon&c=ff00ff' },
    { text: 'BROADCAST', icon: '🔴', desc: 'Classic "ON AIR" studio light with soft glow and clean typography.', params: '?t=broadcast' },
    { text: 'CYBERPUNK', icon: '📟', desc: 'High-tech terminal aesthetic with glitch effects and grid overlays.', params: '?t=cyber' },
    { text: 'STREET SIGN', icon: '🛣️', desc: 'Authentic city road sign with reflective coating and metal textures.', params: '?t=street-sign' },
    { text: 'MARQUEE', icon: '💡', desc: 'Vintage theater light bulbs with sequential chase animations.', params: '?t=marquee' },
    { text: 'GRAND CAFE', icon: '🪵', desc: 'Luxury handcrafted wood board with premium gold leaf lettering.', params: '?t=wood' },
    { text: 'BLUEPRINT', icon: '📐', desc: 'Technical architectural drawing style with grid lines and ink feel.', params: '?t=blueprint' }
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
      document.title = 'led.run — Minimal Digital Signage';
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
      html += '<h1 class="landing-tagline">Your browser is now a digital sign.</h1>';
      html += '<p class="landing-tagline-sub">Type a message, pick a theme, and go full screen. Simple, fast, and open source.</p>';
      html += '</header>';

      // Input Section
      html += '<section class="landing-input-section">';
      html += '<div class="url-preview">';
      html += '<div class="url-input-wrapper">';
      html += '<span class="url-prefix">led.run/</span>';
      html += '<input class="url-input" type="text" placeholder="HELLO" autocomplete="off" spellcheck="false">';
      html += '</div>';
      html += '<button class="url-go">Launch</button>';
      html += '</div>';
      html += '</section>';

      // Presets
      html += '<section class="presets-section">';
      html += '<div class="presets-title">Featured Themes</div>';
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

      // Footer
      html += '<footer class="landing-footer">';
      html += '<div class="footer-info">';
      html += '<b>led.run</b> — MIT Licensed Open Source Project.<br>';
      html += 'Copyright © 2026 led.run. Built for speed.';
      html += '</div>';
      html += '<div class="footer-links">';
      html += '<a href="https://github.com/led-run/led.run">GitHub</a>';
      html += '<a href="https://github.com/led-run/led.run/blob/main/LICENSE">License</a>';
      html += '</div>';
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
