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
    { text: 'Los Angeles', icon: '🛣️', desc: 'Highway guide sign with exit tag, route subtitle, and reflective arrow.', params: '?t=street-sign&sub=I-405+South&exit=42&arrow=up&glare=0.3' },
    { text: 'OPEN', icon: '🏮', desc: 'Classic storefront neon with warm pink glow and tube flicker.', params: '?t=neon&c=ff2d78&bg=0a0008&flicker=2' },
    { text: 'ON AIR', icon: '🔴', desc: 'Studio broadcast light with live recording indicator.', params: '?t=broadcast&dot=ff3333' },
    { text: 'Broadway', icon: '💡', desc: 'Vintage theater marquee with warm chase lights and gold lettering.', params: '?t=marquee&chase=5&bulbColor=ff6600&c=ffd700' },
    { text: 'SYSTEM OK', icon: '📟', desc: 'Matrix-style terminal with text decode and periodic glitch.', params: '?t=cyber&c=00ff41&glitch=2' },
    { text: 'CHEERS!', icon: '🎆', desc: 'Celebration fireworks over a city skyline with rapid bursts.', params: '?t=firework&rate=8&c=ffd700' },
    { text: 'DO NOT DISTURB', icon: '🤫', desc: 'Professional privacy sign with warm amber glow and indicator lights.', params: '?t=do-not-disturb&c=ff4400' },
    { text: 'Le Petit Cafe', icon: '🪵', desc: 'Luxury handcrafted wood board with warm spotlight and gold leaf text.', params: '?t=wood&warm=8&c=d4a847&mode=sign' },
    { text: 'BREATHE', icon: '🌌', desc: 'Northern lights dancing over mountains with vivid aurora bands.', params: '?t=aurora&intensity=8' },
    { text: 'SHIBUYA', icon: '🌃', desc: 'Cinematic rain-soaked neon sign with Japanese city atmosphere.', params: '?t=tokyo&c=ff0066' },
    { text: 'WE LOVE YOU TAYLOR', icon: '🎤', desc: 'Concert fan LED board with scrolling message in flow mode.', params: '?t=gradient&mode=flow&speed=80' }
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
