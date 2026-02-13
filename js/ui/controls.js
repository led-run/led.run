/**
 * Controls Module
 * Keyboard, click, and touch input handling
 * Delegates actions to App layer via callbacks
 */
;(function(global) {
  'use strict';

  var Controls = {
    _callbacks: null,
    _boundKeydown: null,
    _boundDblClick: null,

    /**
     * Initialize controls
     * @param {Object} callbacks
     * @param {Function} callbacks.onTogglePause - Called on Space
     * @param {Function} callbacks.onFullscreen - Called on F / double click
     * @param {Function} callbacks.onNext - Called on Right arrow
     * @param {Function} callbacks.onPrev - Called on Left arrow
     * @param {Function} callbacks.onAdjust - Called on Up/Down arrow, receives +1 or -1
     */
    init(callbacks) {
      this._callbacks = callbacks || {};
      this._bindKeyboard();
      this._bindPointer();
    },

    /**
     * Bind keyboard events
     * @private
     */
    _bindKeyboard() {
      this._boundKeydown = function(e) {
        // S key toggles settings panel (always active)
        if (e.key === 's' || e.key === 'S') {
          if (typeof Settings !== 'undefined') {
            Settings.toggle();
          }
          return;
        }

        // Skip most keys when settings panel is open
        if (typeof Settings !== 'undefined' && Settings.isOpen()) {
          if (e.key === 'Escape') {
            Settings.close();
            e.stopPropagation();
          }
          return;
        }

        switch (e.key) {
          case ' ':
            e.preventDefault();
            if (this._callbacks.onTogglePause) {
              this._callbacks.onTogglePause();
            }
            break;
          case 'f':
          case 'F':
            if (this._callbacks.onFullscreen) {
              this._callbacks.onFullscreen();
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (this._callbacks.onNext) {
              this._callbacks.onNext();
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (this._callbacks.onPrev) {
              this._callbacks.onPrev();
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (this._callbacks.onAdjust) {
              this._callbacks.onAdjust(1);
            }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (this._callbacks.onAdjust) {
              this._callbacks.onAdjust(-1);
            }
            break;
          case 'Escape':
            if (Fullscreen.isActive()) {
              Fullscreen.exit();
            }
            break;
        }
      }.bind(this);

      document.addEventListener('keydown', this._boundKeydown);
    },

    /**
     * Bind pointer (click/touch) events
     * @private
     */
    _bindPointer() {
      // Double-click for fullscreen
      this._boundDblClick = function(e) {
        if (typeof Settings !== 'undefined' && Settings.isOpen()) return;
        if (e.target.closest('button')) return;
        e.preventDefault();
        if (this._callbacks.onFullscreen) {
          this._callbacks.onFullscreen();
        }
      }.bind(this);

      document.addEventListener('dblclick', this._boundDblClick);
    },

    /**
     * Destroy controls and clean up
     */
    destroy() {
      if (this._boundKeydown) {
        document.removeEventListener('keydown', this._boundKeydown);
        this._boundKeydown = null;
      }
      if (this._boundDblClick) {
        document.removeEventListener('dblclick', this._boundDblClick);
        this._boundDblClick = null;
      }
      this._callbacks = null;
    }
  };

  // Export
  global.Controls = Controls;

})(typeof window !== 'undefined' ? window : this);
