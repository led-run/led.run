/**
 * I18n Module
 * Language detection, translation lookup, and locale management
 */
;(function(global) {
  'use strict';

  var STORAGE_KEY = 'led-lang';
  var SUPPORTED = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de'];

  var I18n = {
    _locale: 'en',
    _strings: {},

    /**
     * Register translations for a locale
     * @param {string} locale - Language code
     * @param {Object} strings - Key-value translation pairs
     */
    register: function(locale, strings) {
      this._strings[locale] = strings;
    },

    /**
     * Initialize locale detection
     * Priority: urlLang param > localStorage > navigator.language > 'en'
     * @param {string} [urlLang] - Language from URL ?lang= param
     */
    init: function(urlLang) {
      var locale = 'en';

      // 1. URL param
      if (urlLang && this._isSupported(urlLang)) {
        locale = urlLang;
      }
      // 2. localStorage
      else {
        var stored = null;
        try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
        if (stored && this._isSupported(stored)) {
          locale = stored;
        }
        // 3. navigator.language
        else {
          var browserLang = this._detectBrowserLang();
          if (browserLang) locale = browserLang;
        }
      }

      this._locale = locale;
      document.documentElement.lang = locale;
    },

    /**
     * Get translation for a key
     * Falls back to English, then returns the key itself
     * @param {string} key - Dot-separated translation key
     * @returns {string}
     */
    t: function(key) {
      var localeStrings = this._strings[this._locale];
      if (localeStrings && localeStrings[key] !== undefined) {
        return localeStrings[key];
      }
      // Fallback to English
      var enStrings = this._strings['en'];
      if (enStrings && enStrings[key] !== undefined) {
        return enStrings[key];
      }
      return key;
    },

    /**
     * Get current locale
     * @returns {string}
     */
    locale: function() {
      return this._locale;
    },

    /**
     * Get supported locales list
     * @returns {string[]}
     */
    supported: function() {
      return SUPPORTED.slice();
    },

    /**
     * Switch locale, persist to localStorage, update html lang
     * @param {string} locale - Language code
     */
    setLocale: function(locale) {
      if (!this._isSupported(locale)) return;
      this._locale = locale;
      document.documentElement.lang = locale;
      try { localStorage.setItem(STORAGE_KEY, locale); } catch (e) {}
    },

    /**
     * Check if locale is supported
     * @private
     */
    _isSupported: function(locale) {
      return SUPPORTED.indexOf(locale) !== -1;
    },

    /**
     * Detect browser language and match to supported locale
     * @private
     * @returns {string|null}
     */
    _detectBrowserLang: function() {
      var lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      // Exact match (e.g. 'zh' → 'zh')
      var short = lang.split('-')[0];
      if (this._isSupported(short)) return short;
      return null;
    }
  };

  global.I18n = I18n;

})(typeof window !== 'undefined' ? window : this);
