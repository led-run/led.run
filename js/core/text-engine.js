/**
 * Text Engine
 * Auto-fit text sizing utility for themes
 */
;(function(global) {
  'use strict';

  const TextEngine = {
    /**
     * Calculate optimal font size to fit text within container
     * @param {string} text - Text to measure
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Options
     * @param {number} options.minSize - Minimum font size in px (default: 10)
     * @param {number} options.maxSize - Maximum font size in px (default: 2000)
     * @param {number} options.padding - Padding in px (default: 20)
     * @param {string} options.fontFamily - Font family for measurement
     * @param {string} options.fontWeight - Font weight for measurement
     * @returns {number} Optimal font size in pixels
     */
    autoFit(text, container, options = {}) {
      const minSize = options.minSize || 10;
      const maxSize = options.maxSize || 2000;
      const padding = options.padding || 20;
      const fontFamily = options.fontFamily || 'inherit';
      const fontWeight = options.fontWeight || 'bold';

      const containerWidth = container.clientWidth - padding * 2;
      const containerHeight = container.clientHeight - padding * 2;

      if (containerWidth <= 0 || containerHeight <= 0) return minSize;

      // Create offscreen measurement element
      const measurer = document.createElement('span');
      measurer.style.cssText = [
        'position: absolute',
        'visibility: hidden',
        'white-space: nowrap',
        'left: -9999px',
        'top: -9999px',
        'font-family: ' + fontFamily,
        'font-weight: ' + fontWeight
      ].join(';');
      measurer.textContent = text;
      document.body.appendChild(measurer);

      // Binary search for optimal font size
      let lo = minSize;
      let hi = maxSize;

      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        measurer.style.fontSize = mid + 'px';

        if (measurer.offsetWidth <= containerWidth && measurer.offsetHeight <= containerHeight) {
          lo = mid;
        } else {
          hi = mid;
        }
      }

      document.body.removeChild(measurer);
      return lo;
    }
  };

  // Export
  global.TextEngine = TextEngine;

})(typeof window !== 'undefined' ? window : this);
