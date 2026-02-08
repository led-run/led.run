/**
 * Toolbar Module
 * Floating toolbar with fullscreen, rotate, and share actions
 * Syncs visibility with cursor auto-hide via CSS
 */
;(function(global) {
  'use strict';

  // SVG icons (stroke style, 20x20 viewBox)
  var ICON_FULLSCREEN_ENTER = '<svg viewBox="0 0 20 20"><path d="M3 7V4a1 1 0 0 1 1-1h3M13 3h3a1 1 0 0 1 1 1v3M17 13v3a1 1 0 0 1-1 1h-3M7 17H4a1 1 0 0 1-1-1v-3"/></svg>';
  var ICON_FULLSCREEN_EXIT = '<svg viewBox="0 0 20 20"><path d="M7 3v3a1 1 0 0 1-1 1H3M13 3v3a1 1 0 0 0 1 1h3M3 13h3a1 1 0 0 1 1 1v3M17 13h-3a1 1 0 0 0-1 1v3"/></svg>';
  var ICON_ROTATE = '<svg viewBox="0 0 20 20"><path d="M17 3v4h-4"/><path d="M17 7c-1.6-2.5-4.5-4-7.5-3.5-3.4.5-6 3.4-6 6.8s2.6 6.3 6 6.8c3 .5 5.9-1 7.5-3.5"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 20 20"><circle cx="14" cy="4" r="2"/><circle cx="14" cy="16" r="2"/><circle cx="6" cy="10" r="2"/><path d="M7.8 11.1l4.4 3.8M12.2 5.1l-4.4 3.8"/></svg>';
  var ICON_CAST = '<svg viewBox="0 0 20 20"><path d="M3 13a4 4 0 0 1 4 4"/><path d="M3 9a8 8 0 0 1 8 8"/><circle cx="3.5" cy="16.5" r="1"/><path d="M15 3H5a2 2 0 0 0-2 2v2M17 7v8a2 2 0 0 1-2 2h-2"/></svg>';

  var ROTATION_CLASSES = ['', 'rotated-90', 'rotated-180', 'rotated-270'];

  var Toolbar = {
    _el: null,
    _toast: null,
    _container: null,
    _rotationIndex: 0,
    _unsubFullscreen: null,
    _unsubCast: null,
    _toastTimer: null,

    /**
     * Initialize toolbar
     * @param {Object} options
     * @param {HTMLElement} options.container - The #sign-container element
     */
    init: function(options) {
      options = options || {};
      this._container = options.container || document.getElementById('sign-container');

      this._render();
      this._bind();
    },

    /**
     * Render toolbar DOM into #app
     * @private
     */
    _render: function() {
      var app = document.getElementById('app');

      // Toolbar
      var toolbar = document.createElement('div');
      toolbar.className = 'sign-toolbar';

      var castBtn = (typeof Cast !== 'undefined' && Cast.isSupported())
        ? '<button class="sign-toolbar-btn" data-action="cast" aria-label="' + I18n.t('toolbar.cast') + '">' + ICON_CAST + '</button>'
        : '';

      toolbar.innerHTML =
        '<button class="sign-toolbar-btn" data-action="fullscreen" aria-label="' + I18n.t('toolbar.fullscreen') + '">' + ICON_FULLSCREEN_ENTER + '</button>' +
        '<button class="sign-toolbar-btn" data-action="rotate" aria-label="' + I18n.t('toolbar.rotate') + '">' + ICON_ROTATE + '</button>' +
        castBtn +
        '<button class="sign-toolbar-btn" data-action="share" aria-label="' + I18n.t('toolbar.share') + '">' + ICON_SHARE + '</button>';

      // Toast
      var toast = document.createElement('div');
      toast.className = 'sign-toolbar-toast';

      app.appendChild(toolbar);
      app.appendChild(toast);

      this._el = toolbar;
      this._toast = toast;
    },

    /**
     * Bind event listeners
     * @private
     */
    _bind: function() {
      var self = this;

      // Button click delegation
      this._el.addEventListener('click', function(e) {
        var btn = e.target.closest('.sign-toolbar-btn');
        if (!btn) return;

        var action = btn.dataset.action;
        if (action === 'fullscreen') self._onFullscreen();
        else if (action === 'rotate') self._onRotate();
        else if (action === 'cast') self._onCast();
        else if (action === 'share') self._onShare();
      });

      // Fullscreen state change — update icon
      this._unsubFullscreen = Fullscreen.onChange(function(isFullscreen) {
        var btn = self._el.querySelector('[data-action="fullscreen"]');
        if (btn) {
          btn.innerHTML = isFullscreen ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN_ENTER;
        }
      });

      // Cast state change — toggle active style
      if (typeof Cast !== 'undefined' && Cast.isSupported()) {
        this._unsubCast = Cast.onStateChange(function(isCasting) {
          var btn = self._el.querySelector('[data-action="cast"]');
          if (btn) {
            btn.classList.toggle('casting-active', isCasting);
          }
        });
      }
    },

    /**
     * Toggle fullscreen
     * @private
     */
    _onFullscreen: function() {
      Fullscreen.toggle();
    },

    /**
     * Cycle rotation 0 → 90 → 180 → 270 → 0
     * @private
     */
    _onRotate: function() {
      var container = this._container;

      // Remove current rotation class
      var currentClass = ROTATION_CLASSES[this._rotationIndex % ROTATION_CLASSES.length];
      if (currentClass) container.classList.remove(currentClass);

      // Advance to next
      this._rotationIndex++;

      // Apply new rotation class
      var nextIndex = this._rotationIndex % ROTATION_CLASSES.length;
      var newClass = ROTATION_CLASSES[nextIndex];
      if (newClass) container.classList.add(newClass);

      // Animate the icon clockwise
      var btn = this._el.querySelector('[data-action="rotate"]');
      if (btn) {
        var svg = btn.querySelector('svg');
        if (svg) {
          svg.style.transform = 'rotate(' + (this._rotationIndex * 90) + 'deg)';
        }
      }

      // Wait one frame for CSS to settle, force reflow, then notify theme
      requestAnimationFrame(function() {
        container.offsetHeight; // force synchronous reflow
        ThemeManager.resize();
      });

      // Try to lock orientation (silently fails outside fullscreen)
      try {
        var orientations = ['natural', 'landscape-primary', 'portrait-primary', 'landscape-secondary'];
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock(orientations[nextIndex]).catch(function() {});
        }
      } catch (e) {
        // Ignore — most browsers require fullscreen for orientation lock
      }
    },

    /**
     * Toggle casting
     * @private
     */
    _onCast: function() {
      var self = this;

      if (Cast.isCasting()) {
        Cast.stop();
        self._showToast(I18n.t('toolbar.toast.castStopped'));
        return;
      }

      Cast.start().then(function() {
        self._showToast(I18n.t('toolbar.toast.casting'));
      }).catch(function(err) {
        // User cancelled device chooser — not an error
        if (err && err.name !== 'NotAllowedError') {
          self._showToast(I18n.t('toolbar.toast.castFailed'));
        }
      });
    },

    /**
     * Share current URL
     * @private
     */
    _onShare: function() {
      var self = this;
      var url = window.location.href;
      var title = document.title;

      // Try Web Share API (mobile)
      if (navigator.share) {
        navigator.share({ url: url, title: title }).catch(function() {});
        return;
      }

      // Fallback: clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          self._showToast(I18n.t('toolbar.toast.linkCopied'));
        }).catch(function() {
          self._fallbackCopy(url);
        });
        return;
      }

      // Last resort
      this._fallbackCopy(url);
    },

    /**
     * Fallback copy using execCommand
     * @private
     */
    _fallbackCopy: function(text) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
        this._showToast(I18n.t('toolbar.toast.linkCopied'));
      } catch (e) {
        this._showToast(I18n.t('toolbar.toast.copyFailed'));
      }

      document.body.removeChild(textarea);
    },

    /**
     * Show temporary toast message
     * @param {string} message
     * @private
     */
    _showToast: function(message) {
      var toast = this._toast;
      if (!toast) return;

      if (this._toastTimer) {
        clearTimeout(this._toastTimer);
      }

      toast.textContent = message;
      toast.classList.add('visible');

      this._toastTimer = setTimeout(function() {
        toast.classList.remove('visible');
      }, 2000);
    },

    /**
     * Destroy toolbar and clean up
     */
    destroy: function() {
      if (this._unsubFullscreen) {
        this._unsubFullscreen();
        this._unsubFullscreen = null;
      }

      if (this._unsubCast) {
        this._unsubCast();
        this._unsubCast = null;
      }

      if (this._toastTimer) {
        clearTimeout(this._toastTimer);
        this._toastTimer = null;
      }

      if (this._el) {
        this._el.remove();
        this._el = null;
      }

      if (this._toast) {
        this._toast.remove();
        this._toast = null;
      }

      this._container = null;
      this._rotationIndex = 0;
    }
  };

  // Export
  global.Toolbar = Toolbar;

})(typeof window !== 'undefined' ? window : this);
