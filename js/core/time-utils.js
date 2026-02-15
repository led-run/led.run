/**
 * Time Utilities
 * Shared time helpers for clock themes
 */
;(function(global) {
  'use strict';

  var TimeUtils = {
    /**
     * Get current time with optional timezone offset
     * @param {number|string} [tz] - Timezone offset in hours (e.g., 8, -5, '+5.5')
     * @returns {Date} Date object adjusted for timezone
     */
    getTime: function(tz) {
      var now = new Date();
      if (tz !== undefined && tz !== null && tz !== '') {
        var offset = parseFloat(tz);
        if (!isNaN(offset)) {
          var utc = now.getTime() + now.getTimezoneOffset() * 60000;
          now = new Date(utc + offset * 3600000);
        }
      }
      return now;
    },

    /**
     * Format hours based on 12h/24h preference
     * @param {Date} date
     * @param {string} [format] - '12h' or '24h' (default '24h')
     * @returns {number} Formatted hour
     */
    formatHours: function(date, format) {
      var h = date.getHours();
      if (format === '12h') {
        h = h % 12;
        if (h === 0) h = 12;
      }
      return h;
    },

    /**
     * Format date string
     * @param {Date} date
     * @param {string} [dateFormat] - 'MDY', 'DMY', 'YMD' (default 'MDY')
     * @returns {string} Formatted date string
     */
    formatDate: function(date, dateFormat) {
      var m = date.getMonth() + 1;
      var d = date.getDate();
      var y = date.getFullYear();
      var sep = '/';
      switch ((dateFormat || 'MDY').toUpperCase()) {
        case 'DMY': return this.padZero(d) + sep + this.padZero(m) + sep + y;
        case 'YMD': return y + sep + this.padZero(m) + sep + this.padZero(d);
        default:    return this.padZero(m) + sep + this.padZero(d) + sep + y;
      }
    },

    /**
     * Pad number with leading zero
     * @param {number} n
     * @returns {string}
     */
    padZero: function(n) {
      return n < 10 ? '0' + n : '' + n;
    },

    /**
     * Get AM/PM string
     * @param {Date} date
     * @returns {string} 'AM' or 'PM'
     */
    getAmPm: function(date) {
      return date.getHours() < 12 ? 'AM' : 'PM';
    },

    /**
     * Get day of week name
     * @param {Date} date
     * @param {boolean} [short] - Short form (3 letters)
     * @returns {string}
     */
    getDayName: function(date, short) {
      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var name = days[date.getDay()];
      return short ? name.slice(0, 3) : name;
    },

    /**
     * Get month name
     * @param {Date} date
     * @param {boolean} [short] - Short form (3 letters)
     * @returns {string}
     */
    getMonthName: function(date, short) {
      var months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
      var name = months[date.getMonth()];
      return short ? name.slice(0, 3) : name;
    }
  };

  // Export
  global.TimeUtils = TimeUtils;

})(typeof window !== 'undefined' ? window : this);
