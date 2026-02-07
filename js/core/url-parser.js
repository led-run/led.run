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
    cur: 'cursor'
  };

  // Parameters that should always remain strings (never convert to number)
  const STRING_PARAMS = ['color', 'bg', 'theme', 'mode', 'direction', 'font'];

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
      if (STRING_PARAMS.indexOf(key) !== -1) return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (/^\d+(\.\d+)?$/.test(value)) return parseFloat(value);
      return value;
    }
  };

  // Export
  global.URLParser = URLParser;

})(typeof window !== 'undefined' ? window : this);
