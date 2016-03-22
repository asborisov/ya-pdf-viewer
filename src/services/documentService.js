(function() {
    'use strict';

    /**
     * @description
     * Service for access to pdf document
     *
     * @author asborisov
     * @version 1.0
     */
    angular.module('ya.pdf')
        .factory('ya.pdf.documentService', serviceFunction);

    serviceFunction.$inject = ['$window', '$q'];

    /**
     * @ngdoc service
     * @name ya.pdf.documentService
     *
     * @description
     *
     * @author asborisov
     * @version 1.0
     *
     * @requires $window, $q
     *
     * @param $window
     * @param $q
     * @returns {{
     *  initialize: initialize,
     *  cleanup: cleanup,
     *  getPageViewport: getPageViewport,
     *  getPagesCount: getPagesCount,
     *  getPageData: getPage
     * }}
     */
    function serviceFunction($window, $q) {
        /**
         * Check if PDFJS loaded
         */
        if (!$window.PDFJS) {
            throw "PDFJS is not defined";
        }
        var PDFJS = $window.PDFJS;
        /**
         * Available document states
         * @type {{UNKNOWN: number, INITED: number, LOADED: number}}
         */
        var states = {
            UNKNOWN: 0,
            INITED: 1,
            LOADED: 2
        };
        /**
         * @type Object
         */
        var pdfDocument;
        /**
         * @type String
         */
        var documentUrl;
        /**
         * @type Number
         */
        var pagesCount;
        /**
         * Default state
         * @type {number}
         */
        var currentState;

        return {
            initialize: initialize,
            cleanup: cleanup,
            getPagesCount: getPagesCount,
            getUrl: getUrl,
            getPageData: wrapper(getPage),
            getPageViewport: wrapper(getPageViewport),
            getDestination: wrapper(getDestination),
            getOutline: wrapper(getOutline),
            getPageIndex: wrapper(getPageIndex)
        };

        /**
         * Initialize service
         *
         * @param {String} url
         * @param {Function} onLoadProgress
         * @returns {Promise}
         */
        function initialize(url, onLoadProgress) {
            cleanup();
            currentState = states.INITED;
            if (url) {
                documentUrl = url;
                return PDFJS.getDocument(documentUrl)
                    .then(function(_pdfDocument_) {
                        pdfDocument = _pdfDocument_;
                        currentState = states.LOADED;
                        pagesCount = pdfDocument.numPages;
                        return $q.resolve();
                    }, function(error) {
                        return $q.reject(error);
                    });
            } else {
                return $q.reject('ya.pdf.documentService: No url passed');
            }
        }

        /**
         * Cleanup main service and all sub-services
         * Set variables to default
         */
        function cleanup() {
            if (pdfDocument) {
                pdfDocument.cleanup();
            }
            pdfDocument = null;
            documentUrl = null;
            pagesCount = null;
            currentState = states.UNKNOWN;
        }

        /**
         * Get pages count
         *
         * @returns {Number}
         */
        function getPagesCount() {
            return pagesCount || 0;
        }

        /**
         * Get URL of current document
         *
         * @returns {String}
         */
        function getUrl() {
            return documentUrl;
        }

        /**
         * External functions wrapper. Check current document state
         *
         * @param {Function} func
         * @returns {Function}
         */
        function wrapper(func) {
            return function() {
                if (currentState != states.LOADED) {
                    return $q.reject('Document is not loaded');
                }
                return func.apply(this, arguments);
            }
        }

        /**
         * Get viewport of selected page
         *
         * @param {Number} pageNumber
         * @param {Number} scale
         * @returns {Promise}
         */
        function getPageViewport(pageNumber, scale) {
            return getPage(pageNumber)
                .then(function(pageData) {
                    return pageData.getViewport(scale);
                });
        }

        /**
         * Get page data
         *
         * @param {Number} pageNumber
         * @returns {Promise}
         */
        function getPage(pageNumber) {
            return pdfDocument.getPage(pageNumber);
        }

        /**
         * Get destination
         *
         * @param {Object} dest
         * @returns {Promise}
         */
        function getDestination(dest) {
            return pdfDocument.getDestination(dest);
        }

        /**
         * Get outline
         *
         * @returns {Promise}
         */
        function getOutline() {
            return pdfDocument.getOutline();
        }

        /**
         * Get page index
         *
         * @param {String} destRef
         * @returns {Promise}
         */
        function getPageIndex(destRef) {
            return pdfDocument.getPageIndex(destRef);
        }
    }
}());