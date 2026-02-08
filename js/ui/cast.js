/**
 * Cast Module
 * Presentation API wrapper for casting LED signs to external displays
 * Controller sends current URL config; Receiver loads it as a clean display
 */
;(function(global) {
  'use strict';

  var STORAGE_KEY = 'led-cast-id';

  var Cast = {
    _request: null,
    _connection: null,
    _listeners: [],
    _isReceiverMode: false,

    /**
     * Check if Presentation API is available (controller side)
     * @returns {boolean}
     */
    isSupported: function() {
      return !!(global.PresentationRequest);
    },

    /**
     * Check if running as a Presentation API receiver
     * @returns {boolean}
     */
    _isReceiver: function() {
      return !!(navigator.presentation && navigator.presentation.receiver);
    },

    /**
     * Initialize cast module
     * On receiver: listen for incoming connections
     * On controller: create request and attempt reconnect if session exists
     */
    init: function() {
      if (this._isReceiver()) {
        this._isReceiverMode = true;
        this._initReceiver();
        return;
      }

      if (!this.isSupported()) return;

      // Create presentation request with current URL
      this._request = new PresentationRequest(this._getReceiverUrl());

      // Attempt reconnect from previous session
      var savedId = sessionStorage.getItem(STORAGE_KEY);
      if (savedId) {
        this._reconnect(savedId);
      }
    },

    /**
     * Start casting — opens device chooser
     * @returns {Promise}
     */
    start: function() {
      if (!this._request) return Promise.reject(new Error('Cast not initialized'));

      var self = this;

      // Update request URL to current page
      this._request = new PresentationRequest(this._getReceiverUrl());

      return this._request.start().then(function(connection) {
        self._setConnection(connection);
      });
    },

    /**
     * Stop casting
     */
    stop: function() {
      if (this._connection) {
        try {
          this._connection.terminate();
        } catch (e) {
          // Connection may already be closed
        }
        this._clearConnection();
      }
    },

    /**
     * Send current URL config to receiver
     */
    sendCurrentConfig: function() {
      if (!this._connection || this._connection.state !== 'connected') return;

      this._connection.send(JSON.stringify({
        type: 'config',
        url: global.location.href
      }));
    },

    /**
     * Check if currently casting
     * @returns {boolean}
     */
    isCasting: function() {
      return !!(this._connection && this._connection.state === 'connected');
    },

    /**
     * Subscribe to cast state changes
     * @param {Function} callback - (isCasting: boolean) => void
     * @returns {Function} Unsubscribe function
     */
    onStateChange: function(callback) {
      this._listeners.push(callback);
      var self = this;
      return function() {
        var idx = self._listeners.indexOf(callback);
        if (idx !== -1) self._listeners.splice(idx, 1);
      };
    },

    /**
     * Clean up
     */
    destroy: function() {
      this.stop();
      this._listeners = [];
      this._request = null;
    },

    // --- Private ---

    /**
     * Get receiver URL (current page URL)
     * @returns {string}
     * @private
     */
    _getReceiverUrl: function() {
      return global.location.href;
    },

    /**
     * Attempt to reconnect to a previous session
     * @param {string} id - Saved presentation connection ID
     * @private
     */
    _reconnect: function(id) {
      if (!this._request) return;

      var self = this;
      this._request.reconnect(id).then(function(connection) {
        self._setConnection(connection);
        // Push current config after reconnect
        self.sendCurrentConfig();
      }).catch(function() {
        // Session expired or device unavailable
        sessionStorage.removeItem(STORAGE_KEY);
      });
    },

    /**
     * Wire up a connection and persist its ID
     * @param {PresentationConnection} connection
     * @private
     */
    _setConnection: function(connection) {
      var self = this;
      this._connection = connection;

      // Persist for reconnect across navigations
      sessionStorage.setItem(STORAGE_KEY, connection.id);

      connection.onclose = function() {
        self._clearConnection();
      };

      connection.onterminate = function() {
        self._clearConnection();
      };

      this._notify(true);
    },

    /**
     * Clear connection state
     * @private
     */
    _clearConnection: function() {
      this._connection = null;
      sessionStorage.removeItem(STORAGE_KEY);
      this._notify(false);
    },

    /**
     * Notify all state change listeners
     * @param {boolean} casting
     * @private
     */
    _notify: function(casting) {
      for (var i = 0; i < this._listeners.length; i++) {
        this._listeners[i](casting);
      }
    },

    /**
     * Initialize receiver side — listen for connections and config messages
     * @private
     */
    _initReceiver: function() {
      navigator.presentation.receiver.connectionList.then(function(list) {
        function handleConnection(conn) {
          conn.onmessage = function(event) {
            try {
              var data = JSON.parse(event.data);
              if (data.type === 'config' && data.url) {
                global.location.replace(data.url);
              }
            } catch (e) {
              // Ignore malformed messages
            }
          };
        }

        // Handle existing connections
        list.connections.forEach(handleConnection);

        // Handle future connections
        list.onconnectionavailable = function(event) {
          handleConnection(event.connection);
        };
      });
    }
  };

  // Export
  global.Cast = Cast;

})(typeof window !== 'undefined' ? window : this);
