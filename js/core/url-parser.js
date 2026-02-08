/**
 * URL Parser
 * Extract display text and configuration parameters from URL
 */
;(function(global) {
  'use strict';

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
  const STRING_PARAMS = ['color', 'bg', 'fill', 'glow', 'theme', 'mode', 'direction', 'font', 'lang'];

  // Parameters that accept hex color values (AARRGGBB input → RRGGBBAA for CSS)
  const COLOR_PARAMS = ['color', 'bg', 'fill', 'glow'];

  const URLParser = {
    /**
     * Parse current URL
     * @returns {Object} Parse result { text, ...config }
     */
    parse() {
      const path = window.location.pathname;
      const search = window.location.search;

      // Extract display text from path
      const text = this._extractText(path);

      // Parse query parameters (aliases resolved inline)
      const config = this._parseQueryString(search);

      return {
        text,
        ...config
      };
    },

    /**
     * Extract display text from path
     * @private
     * @param {string} path - URL path
     * @returns {string}
     */
    _extractText(path) {
      // Remove leading slash, decode entire path as display text
      const cleanPath = path.replace(/^\/+/, '');
      return decodeURIComponent(cleanPath);
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
