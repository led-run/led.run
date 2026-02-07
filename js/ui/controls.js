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
    _boundClick: null,
    _boundDblClick: null,
    _lastTap: 0,

    /**
     * Initialize controls
     * @param {Object} callbacks
     * @param {Function} callbacks.onTogglePause - Called on Space / single click
     * @param {Function} callbacks.onFullscreen - Called on F / double click
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
        e.preventDefault();
        if (this._callbacks.onFullscreen) {
          this._callbacks.onFullscreen();
        }
      }.bind(this);

      // Single-click for toggle pause (with double-click guard)
      var clickTimer = null;
      this._boundClick = function(e) {
        // Ignore clicks on landing page interactive elements
        if (e.target.closest('a, button, input')) return;

        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
          return; // Double-click will handle it
        }

        clickTimer = setTimeout(function() {
          clickTimer = null;
          if (this._callbacks.onTogglePause) {
            this._callbacks.onTogglePause();
          }
        }.bind(this), 250);
      }.bind(this);

      document.addEventListener('click', this._boundClick);
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
      if (this._boundClick) {
        document.removeEventListener('click', this._boundClick);
        this._boundClick = null;
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
