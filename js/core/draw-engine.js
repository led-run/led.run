/**
 * Draw Engine
 * Mouse/touch input handling, stroke data management, and serialization
 * Follows AudioEngine/CameraEngine pattern — handles input, not rendering
 */
;(function(global) {
  'use strict';

  var MAX_URL_DATA_LENGTH = 6000;

  var DrawEngine = {
    _strokes: [],
    _undoStack: [],
    _currentStroke: null,
    _smooth: 5,
    _isEraser: false,
    _isDrawing: false,
    _isLocked: false,
    _canvas: null,
    _cachedSerializedSize: 0,

    // Callbacks
    onStroke: null,
    onStrokeUpdate: null,
    onCapacityChange: null,
    onDataChange: null,
    onLockChange: null,

    // Bound handlers (for removal)
    _boundMouseDown: null,
    _boundMouseMove: null,
    _boundMouseUp: null,
    _boundTouchStart: null,
    _boundTouchMove: null,
    _boundTouchEnd: null,

    /**
     * Initialize draw engine — bind mouse/touch events to canvas
     * @param {HTMLElement} canvas - Element to capture events on
     * @param {Object} [options] - Initial options
     */
    init: function(canvas, options) {
      this._canvas = canvas;
      options = options || {};

      if (options.smooth !== undefined) this._smooth = options.smooth;

      this._bindEvents();
    },

    /**
     * Destroy engine — unbind events only
     * Data (strokes, callbacks, tool state) preserved across theme switches
     */
    destroy: function() {
      this._unbindEvents();
      this._canvas = null;
      this._currentStroke = null;
      this._isDrawing = false;
    },

    /**
     * Full reset — clear all data, callbacks, and state
     * Only used when leaving draw product entirely
     */
    reset: function() {
      this.destroy();
      this._strokes = [];
      this._undoStack = [];
      this._smooth = 5;
      this._isEraser = false;
      this._isLocked = false;
      this._cachedSerializedSize = 0;
      this.onStroke = null;
      this.onStrokeUpdate = null;
      this.onCapacityChange = null;
      this.onDataChange = null;
      this.onLockChange = null;
    },

    // ── Data Management ──

    /**
     * Get all completed strokes
     * @returns {Array}
     */
    getStrokes: function() {
      return this._strokes;
    },

    /**
     * Get the stroke currently being drawn (null when not drawing)
     * @returns {Object|null}
     */
    getCurrentStroke: function() {
      return this._currentStroke;
    },

    /**
     * Load strokes (e.g. from URL deserialization)
     * @param {Array} strokes
     */
    loadStrokes: function(strokes) {
      this._strokes = strokes || [];
      this._undoStack = [];
      this._updateCapacity();
    },

    /**
     * Clear all strokes
     */
    clear: function() {
      this._strokes = [];
      this._undoStack = [];
      this._cachedSerializedSize = 0;
      if (this.onStroke) this.onStroke();
      if (this.onCapacityChange) this.onCapacityChange(0);
      if (this.onDataChange) this.onDataChange();
    },

    // ── Undo / Redo ──

    undo: function() {
      if (this._strokes.length === 0) return;
      this._undoStack.push(this._strokes.pop());
      this._updateCapacity();
      if (this.onStroke) this.onStroke();
      if (this.onDataChange) this.onDataChange();
    },

    redo: function() {
      if (this._undoStack.length === 0) return;
      this._strokes.push(this._undoStack.pop());
      this._updateCapacity();
      if (this.onStroke) this.onStroke();
      if (this.onDataChange) this.onDataChange();
    },

    canUndo: function() {
      return this._strokes.length > 0;
    },

    canRedo: function() {
      return this._undoStack.length > 0;
    },

    // ── Tool State ──

    setSmooth: function(n) { this._smooth = n; },
    setEraser: function(bool) { this._isEraser = bool; },
    getSmooth: function() { return this._smooth; },
    isEraser: function() { return this._isEraser; },

    // ── Lock ──

    setLocked: function(bool) {
      this._isLocked = bool;
      if (this.onLockChange) this.onLockChange(bool);
    },
    isLocked: function() { return this._isLocked; },

    // ── Serialization ──

    /**
     * Serialize strokes to LZ-String compressed URL-safe string
     * Format: x1:y1,x2:y2,...|E,x1:y1,...  (eraser strokes prefixed with E)
     * @returns {string}
     */
    serialize: function() {
      if (this._strokes.length === 0) return '';
      var parts = [];
      for (var i = 0; i < this._strokes.length; i++) {
        var s = this._strokes[i];
        var header = s.eraser ? 'E' : '';
        var pts = [];
        for (var j = 0; j < s.points.length; j++) {
          var p = s.points[j];
          pts.push(Math.round(p.x * 10000) + ':' + Math.round(p.y * 10000));
        }
        parts.push(header ? header + ',' + pts.join(',') : pts.join(','));
      }
      var raw = parts.join('|');
      return LZString.compressToEncodedURIComponent(raw);
    },

    /**
     * Deserialize compressed string back to strokes array
     * @param {string} str - LZ-String compressed string
     * @returns {Array}
     */
    deserialize: function(str) {
      if (!str) return [];
      var raw = LZString.decompressFromEncodedURIComponent(str);
      if (!raw) return [];
      var strokes = [];
      var strokeStrs = raw.split('|');
      for (var i = 0; i < strokeStrs.length; i++) {
        var tokens = strokeStrs[i].split(',');
        if (tokens.length < 1) continue;
        var eraser = tokens[0] === 'E';
        var startIdx = eraser ? 1 : 0;
        var points = [];
        for (var j = startIdx; j < tokens.length; j++) {
          var xy = tokens[j].split(':');
          if (xy.length === 2) {
            var px = parseInt(xy[0], 10);
            var py = parseInt(xy[1], 10);
            if (!isNaN(px) && !isNaN(py)) {
              points.push({ x: px / 10000, y: py / 10000 });
            }
          }
        }
        if (points.length > 0) {
          strokes.push({ eraser: eraser, points: points });
        }
      }
      return strokes;
    },

    /**
     * Get serialized size in characters
     * @returns {number}
     */
    getSerializedSize: function() {
      return this._cachedSerializedSize;
    },

    /**
     * Get capacity usage percentage
     * @returns {number} 0-100+
     */
    getCapacityPercent: function() {
      return Math.round(this._cachedSerializedSize / MAX_URL_DATA_LENGTH * 100);
    },

    // ── Internal ──

    _updateCapacity: function() {
      var serialized = this.serialize();
      this._cachedSerializedSize = serialized.length;
      if (this.onCapacityChange) {
        this.onCapacityChange(this.getCapacityPercent());
      }
    },

    _bindEvents: function() {
      var self = this;

      this._boundMouseDown = function(e) {
        if (self._isLocked) return;
        if (e.button !== 0) return;
        e.preventDefault();
        var pos = self._getPos(e);
        self._startStroke(pos);
      };

      this._boundMouseMove = function(e) {
        if (!self._isDrawing) return;
        e.preventDefault();
        var pos = self._getPos(e);
        self._addPoint(pos);
      };

      this._boundMouseUp = function(e) {
        if (!self._isDrawing) return;
        self._endStroke();
      };

      this._boundTouchStart = function(e) {
        if (self._isLocked) return;
        e.preventDefault();
        var touch = e.touches[0];
        var pos = self._getPos(touch);
        self._startStroke(pos);
      };

      this._boundTouchMove = function(e) {
        if (!self._isDrawing) return;
        e.preventDefault();
        var touch = e.touches[0];
        var pos = self._getPos(touch);
        self._addPoint(pos);
      };

      this._boundTouchEnd = function(e) {
        if (!self._isDrawing) return;
        e.preventDefault();
        self._endStroke();
      };

      this._canvas.addEventListener('mousedown', this._boundMouseDown);
      document.addEventListener('mousemove', this._boundMouseMove);
      document.addEventListener('mouseup', this._boundMouseUp);
      this._canvas.addEventListener('touchstart', this._boundTouchStart, { passive: false });
      document.addEventListener('touchmove', this._boundTouchMove, { passive: false });
      document.addEventListener('touchend', this._boundTouchEnd);
    },

    _unbindEvents: function() {
      if (this._canvas) {
        this._canvas.removeEventListener('mousedown', this._boundMouseDown);
        this._canvas.removeEventListener('touchstart', this._boundTouchStart);
      }
      document.removeEventListener('mousemove', this._boundMouseMove);
      document.removeEventListener('mouseup', this._boundMouseUp);
      document.removeEventListener('touchmove', this._boundTouchMove);
      document.removeEventListener('touchend', this._boundTouchEnd);
    },

    _getPos: function(e) {
      var rect = this._canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      };
    },

    _startStroke: function(pos) {
      this._isDrawing = true;
      this._undoStack = [];
      this._currentStroke = {
        eraser: this._isEraser,
        points: [pos]
      };
    },

    _addPoint: function(pos) {
      if (!this._currentStroke) return;
      var pts = this._currentStroke.points;
      var last = pts[pts.length - 1];

      // Skip if too close (< 0.1% of canvas)
      var dx = pos.x - last.x;
      var dy = pos.y - last.y;
      if (dx * dx + dy * dy < 0.000001) return;

      // Apply smoothing (exponential smoothing towards last point)
      var smooth = this._smooth;
      if (smooth > 0 && pts.length >= 2) {
        var weight = Math.min(smooth / 10, 0.85);
        pos = {
          x: pos.x * (1 - weight) + last.x * weight,
          y: pos.y * (1 - weight) + last.y * weight
        };
      }

      pts.push(pos);
      if (this.onStrokeUpdate) {
        this.onStrokeUpdate(this._currentStroke);
      }
    },

    _endStroke: function() {
      this._isDrawing = false;
      if (this._currentStroke && this._currentStroke.points.length > 0) {
        this._strokes.push(this._currentStroke);
        this._currentStroke = null;
        this._updateCapacity();
        if (this.onStroke) this.onStroke();
        if (this.onDataChange) this.onDataChange();
      }
    }
  };

  // Export
  global.DrawEngine = DrawEngine;

})(typeof window !== 'undefined' ? window : this);
