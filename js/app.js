/**
 * led.run App
 * Application entry point and orchestrator
 */
;(function(global) {
  'use strict';

  // App-level parameters (not passed to themes)
  var APP_PARAMS = ['wakelock', 'cursor'];

  // Sign mode presets — static full-screen display
  var SIGN_PRESETS = [
    { text: 'DO NOT DISTURB', icon: '🤫', badge: 'Useful', desc: 'Professional privacy sign with warm amber glow and indicator lights.', params: '?t=do-not-disturb&glow=ff4400' },
    { text: 'Los Angeles', icon: '🛣️', desc: 'Highway guide sign with exit tag, route subtitle, and reflective arrow.', params: '?t=street-sign&sub=I-405+South&exit=42&arrow=up&glare=0.3' },
    { text: 'OPEN', icon: '🏮', badge: 'Classic', desc: 'Classic storefront neon with warm pink glow and tube flicker.', params: '?t=neon&c=ff2d78&bg=0a0008&flicker=2' },
    { text: 'ON AIR', icon: '🔴', desc: 'Studio broadcast light with live recording indicator.', params: '?t=broadcast&dot=ff3333' },
    { text: 'Broadway', icon: '💡', desc: 'Vintage theater marquee with warm chase lights and gold lettering.', params: '?t=marquee&chase=5&bulbColor=ff6600&c=ffd700' },
    { text: 'SYSTEM OK', icon: '📟', badge: 'Tech', desc: 'Matrix-style terminal with text decode and periodic glitch.', params: '?t=cyber&c=00ff41&glitch=2' },
    { text: 'CHEERS!', icon: '🎆', desc: 'Celebration fireworks over a city skyline with rapid bursts.', params: '?t=firework&rate=8&c=ffd700' },
    { text: 'Le Petit Cafe', icon: '🪵', desc: 'Luxury handcrafted wood board with warm spotlight and gold leaf text.', params: '?t=wood&warm=8&c=d4a847&mode=sign' },
    { text: 'BREATHE', icon: '🌌', desc: 'Northern lights dancing over mountains with vivid aurora bands.', params: '?t=aurora&intensity=8' },
    { text: 'SHIBUYA', icon: '🌃', badge: 'New', desc: 'Cinematic rain-soaked neon sign with Japanese city atmosphere.', params: '?t=tokyo&c=ff0066' }
  ];

  // Flow mode presets — scrolling marquee display
  var FLOW_PRESETS = [
    { text: 'WE LOVE YOU TAYLOR', icon: '🎤', badge: 'Concert', desc: 'Fan LED board for concerts — hold up your phone and cheer.', params: '?t=gradient&mode=flow&speed=150' },
    { text: 'DRINKS HALF PRICE UNTIL 9PM', icon: '🍻', desc: 'Happy hour promo scrolling across a warm neon bar sign.', params: '?t=neon&mode=flow&c=ffaa00&flicker=1&speed=120' },
    { text: 'WELCOME TO THE GRAND OPENING', icon: '🎊', desc: 'Celebration announcement with fireworks and golden text.', params: '?t=firework&mode=flow&rate=6&c=ffd700&speed=100' },
    { text: 'NOW PLAYING: BOHEMIAN RHAPSODY', icon: '🎵', badge: 'Retro', desc: 'Music ticker with retro CRT scanlines and purple glow.', params: '?t=retro&mode=flow&c=cc66ff&speed=80' },
    { text: 'AIRPORT SHUTTLE -> GATE 4', icon: '🚌', desc: 'Classic square-cell LED display with high-contrast yellow dots.', params: '?t=dot-matrix' }
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
      document.getElementById('app').dataset.theme = themeId;

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
      Toolbar.init({ container: this._container });
    },

    /**
     * Show landing page
     * @private
     */
    _showLanding() {
      document.title = 'led.run — Instant Digital Signage';
      document.body.style.overflow = 'auto';

      var container = this._container;
      container.className = '';
      container.style.height = 'auto';
      container.style.overflow = 'auto';

      var html = '';
      html += '<div class="landing">';

      // Hero
      html += '<div class="landing-hero">';
      html += '<div class="hero-brand"><span class="hero-brand-icon"></span>led.run v1.0</div>';
      html += '<h1 class="hero-title">Digital Signage,<br>Reimagined.</h1>';
      html += '<p class="hero-subtitle">Transform any screen into a professional display in seconds. No apps, no accounts, just a URL.</p>';
      
      // Input
      html += '<div class="input-group">';
      html += '<div class="input-prefix">led.run/</div>';
      html += '<input class="url-input" type="text" placeholder="HELLO" autocomplete="off" spellcheck="false" autofocus>';
      html += '<button class="btn-launch">Go</button>';
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
          if (p.badge) {
            out += '<span class="preset-badge">' + p.badge + '</span>';
          }
          out += '</div>';
          
          out += '<div class="preset-title">' + p.text + '</div>';
          out += '<div class="preset-desc">' + p.desc + '</div>';
          out += '</a>';
        });
        return out;
      }

      // Flow mode presets
      html += '<div class="section-title">Scrolling Marquee</div>';
      html += '<div class="presets-grid">';
      html += renderPresets(FLOW_PRESETS);
      html += '</div>';

      // Sign mode presets
      html += '<div class="section-title">Static Signs</div>';
      html += '<div class="presets-grid">';
      html += renderPresets(SIGN_PRESETS);
      html += '</div>';

      // Footer
      html += '<footer class="landing-footer">';
      html += '<div>© 2026 led.run — Open Source</div>';
      html += '<div class="footer-links">';
      html += '<a href="https://github.com/led-run/led.run" target="_blank">GitHub</a>';
      html += '<a href="https://github.com/led-run/led.run/blob/main/LICENSE" target="_blank">License</a>';
      html += '</div>';
      html += '</footer>';

      html += '</div>'; // end landing

      container.innerHTML = html;

      // Bind input events
      var input = container.querySelector('.url-input');
      var goBtn = container.querySelector('.btn-launch');

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