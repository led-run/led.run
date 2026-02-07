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

      // Parse query parameters
      const params = this._parseQueryString(search);

      // Normalize parameter names (handle aliases)
      const config = this._normalizeParams(params);

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
        params[key] = this._parseValue(value);
      }

      return params;
    },

    /**
     * Parse parameter value (boolean, number, etc.)
     * @private
     * @param {string} value - Parameter value
     * @returns {*}
     */
    _parseValue(value) {
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (/^\d+(\.\d+)?$/.test(value)) return parseFloat(value);
      return value;
    },

    /**
     * Normalize parameter names (alias conversion)
     * @private
     * @param {Object} params - Original parameters
     * @returns {Object}
     */
    _normalizeParams(params) {
      const result = {};

      for (const [key, value] of Object.entries(params)) {
        const normalizedKey = PARAM_ALIASES[key] || key;
        result[normalizedKey] = value;
      }

      return result;
    }
  };

  // Export
  global.URLParser = URLParser;

})(typeof window !== 'undefined' ? window : this);
