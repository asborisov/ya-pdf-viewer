(function () {
    'use strict';

    /**
     * @description
     * Service for communication between services/directives
     *
     * @author asborisov
     * @version 1.0
     */
    angular.module('ya.pdf')
        .factory('ya.pdf.communicationService', serviceFunction);

    /**
     * @ngdoc service
     * @name ya.pdf.communicationService
     *
     * @description
     *
     * @author asborisov
     * @version 1.0
     *
     * @returns {{
     *  register: registerListener,
     *  execute: executeListener,
     *  cleanup: clearListeners
     * }}
     */
    function serviceFunction() {
        var functions = {};

        return {
            register: registerListener,
            execute: executeListener,
            cleanup: clearListeners
        };

        /**
         * Cleanup service. Remove all listeners
         */
        function clearListeners() {
            functions = {};
        }

        /**
         * Register listener
         *
         * @param {Object|String} listener
         * @param {Function} func
         */
        function registerListener(listener, func) {
            if (angular.isString(listener)) {
                _registerListener(listener, func);
                return;
            }
            if (!angular.isObject(listener)) {
                return;
            }
            angular.forEach(listener, function(value, name) {
                if (!angular.isString(name)) {
                    return;
                }
                _registerListener(name, value);
            });
        }

        /**
         * Listener registration
         *
         * @param {String} name
         * @param {Function} func
         * @private
         */
        function _registerListener(name, func) {
            if (angular.isUndefined(functions[name])) {
                functions[name] = [];
            }
            functions[name].push(func);
        }

        /**
         * Execute listener
         *
         * @param {String} listener
         */
        function executeListener(listener) {
            if (angular.isUndefined(functions[listener])) {
                return;
            }
            var args = Array.prototype.slice.call(arguments, 1);
            angular.forEach(functions[listener], function(fn) {
                fn.apply(this, args);
            });
        }
    }
}());
