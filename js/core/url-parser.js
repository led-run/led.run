/**
 * URL Parser
 * Extract product type, display text, and configuration parameters from URL
 */
;(function(global) {
  'use strict';

  // Reserved product path prefixes
  var PRODUCTS = ['text', 'light', 'sound', 'time', 'qr', 'camera', 'draw'];

  // Parameter alias mapping
  const PARAM_ALIASES = {
    t: 'theme',
    c: 'color',
    dir: 'direction',
    w: 'wakelock',
    cur: 'cursor',
    l: 'lang'
  };

  // Parameters that should always remain strings (never convert to number)
  const STRING_PARAMS = ['color', 'bg', 'fill', 'glow', 'theme', 'mode', 'direction', 'font', 'lang',
    'format', 'dateFormat', 'dotStyle', 'style', 'palette', 'align', 'firstDay', 'segmentStyle', 'weight',
    'position', 'ec', 'facing', 'charset'];

  // Parameters that accept hex color values (AARRGGBB input → RRGGBBAA for CSS)
  const COLOR_PARAMS = ['color', 'bg', 'fill', 'glow'];

  const URLParser = {
    /**
     * Parse current URL
     * @returns {Object} Parse result { product, text, ...config }
     *   product: 'text' | 'light' | 'sound'
     *   text: display text (only for text product)
     */
    parse() {
      const path = window.location.pathname;
      const search = window.location.search;

      // Detect product and extract text
      const detected = this._detectProduct(path);

      // Parse query parameters (aliases resolved inline)
      const config = this._parseQueryString(search);

      return {
        product: detected.product,
        text: detected.text,
        ...config
      };
    },

    /**
     * Detect product type and extract text from path
     * @private
     * @param {string} path - URL path
     * @returns {Object} { product: string, text: string }
     */
    _detectProduct(path) {
      // Remove leading slash
      var cleanPath = path.replace(/^\/+/, '');

      // Empty path → landing page (text product default)
      if (!cleanPath) {
        return { product: 'text', text: '' };
      }

      // Split path into segments
      var slashIndex = cleanPath.indexOf('/');
      var firstSegment = slashIndex === -1 ? cleanPath : cleanPath.slice(0, slashIndex);
      var rest = slashIndex === -1 ? '' : cleanPath.slice(slashIndex + 1);

      // Check if first segment is a reserved product prefix
      var lowerFirst = firstSegment.toLowerCase();

      if (lowerFirst === 'light') {
        // Light product — no text content
        return { product: 'light', text: '' };
      }

      if (lowerFirst === 'sound') {
        // Sound product — no text content
        return { product: 'sound', text: '' };
      }

      if (lowerFirst === 'time') {
        // Time product — no text content
        return { product: 'time', text: '' };
      }

      if (lowerFirst === 'qr') {
        // QR product — rest is QR content (URL-encoded)
        return { product: 'qr', text: rest ? decodeURIComponent(rest) : '' };
      }

      if (lowerFirst === 'camera') {
        // Camera product — no text content
        return { product: 'camera', text: '' };
      }

      if (lowerFirst === 'draw') {
        // Draw product — rest is compressed drawing data
        return { product: 'draw', text: rest || '' };
      }

      if (lowerFirst === 'text') {
        // Explicit text product prefix — rest is the display text
        return { product: 'text', text: decodeURIComponent(rest) };
      }

      // Not a reserved prefix — entire path is text content (backward compatible)
      return { product: 'text', text: decodeURIComponent(cleanPath) };
    },

    /**
     * Parse query string
     * @private
     * @param {string} search - Query string (including ?)
     * @returns {Object}
     */
    _parseQueryString(search) {
      const params = {};
      const searchParams = new URLSearchParams(search);

      for (const [key, value] of searchParams) {
        const normalizedKey = PARAM_ALIASES[key] || key;
        params[normalizedKey] = this._parseValue(value, normalizedKey);
      }

      return params;
    },

    /**
     * Parse parameter value (boolean, number, etc.)
     * @private
     * @param {string} value - Parameter value
     * @param {string} key - Normalized parameter name
     * @returns {*}
     */
    _parseValue(value, key) {
      if (COLOR_PARAMS.indexOf(key) !== -1) return this._normalizeColor(value);
      if (STRING_PARAMS.indexOf(key) !== -1) return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (/^\d+(\.\d+)?$/.test(value)) return parseFloat(value);
      return value;
    },

    /**
     * Normalize hex color value
     * 6-digit (RRGGBB) passes through; 8-digit converts AARRGGBB → RRGGBBAA for CSS
     * @private
     * @param {string} value - Hex color string (no #)
     * @returns {string}
     */
    _normalizeColor(value) {
      if (/^[0-9a-fA-F]{8}$/.test(value)) {
        return value.slice(2) + value.slice(0, 2);
      }
      return value;
    }
  };

  // Export
  global.URLParser = URLParser;

})(typeof window !== 'undefined' ? window : this);
