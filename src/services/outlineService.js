(function () {
    'use strict';

    /**
     * @description
     * Service for work with outline
     *
     * @author asborisov
     * @version 1.0
     */
    angular.module('ya.pdf')
        .factory('ya.pdf.outlineService', serviceFunction);

    serviceFunction.$inject = ['$q', 'ya.pdf.communicationService', 'ya.pdf.documentService'];

    /**
     * @ngdoc service
     * @name ya.pdf.outlineService
     *
     * @description
     *
     * @author asborisov
     * @version 1.0
     *
     * @requires $q, communicationService, documentService
     *
     * @param $q
     * @param communicationService
     * @param documentService
     * @returns {{
     *  initialize: init,
     *  cleanup: cleanup,
     *  getOutline: getOutline,
     *  navigateTo: navigateTo
     * }}
     */
    function serviceFunction($q, communicationService, documentService) {
        /**
         * @type Object
         */
        var pagesRefCache;
        /**
         * @type Array
         */
        var outline;

        return {
            initialize: init,
            cleanup: cleanup,
            getOutline: getOutline,
            navigateTo: navigateTo
        };

        /**
         * Initialize service
         */
        function init() {
            cleanup();
            return getOutline();
        }

        /**
         * Cleanup service
         */
        function cleanup() {
            pagesRefCache = [];
            outline = null;
        }

        /**
         * Get outline of document
         *
         * @returns {Promise.<Array>}
         */
        function getOutline() {
            return outline ? $q.resolve(outline) : _getOutline();
        }

        /**
         * Go to selected destination
         *
         * @param {String|Object} dest
         */
        function navigateTo(dest) {
            /**
             * @type Promise
             */
            var destPromise;

            if (angular.isString(dest)) {
                destPromise = documentService.getDestination(dest);
            } else {
                destPromise = $q.resolve(dest);
            }

            destPromise.then(function (destination) {
                if (!angular.isArray(destination)) {
                    return;
                }
                _goToDestination(destination, destination[0]);
            })
        }

        /**
         * Get outline private impl
         *
         * @returns {Promise}
         * @private
         */
        function _getOutline() {
            /**
             * @param item
             * @returns {{}}
             */
            function transformItem(item) {
                // TODO More params! MORE!
                return {
                    dest: item.dest || '',
                    title: item.title || '',
                    items: item.items.map(transformItem)
                };
            }

            return documentService.getOutline()
                .then(function(_outline_) {
                    if (!_outline_) {
                        return $q.resolve([]);
                    }
                    outline = _outline_.map(transformItem) || [];
                    return $q.resolve(outline);
                });
        }

        /**
         * Go to selected destination private impl
         *
         * @param {Array} dest
         * @param {Object} destRef
         * @private
         */
        function _goToDestination(dest, destRef) {
            // dest array looks like that: <page-ref> </XYZ|FitXXX> <args..>
            var pageNumber = angular.isObject(destRef) ?
                pagesRefCache[destRef.num + ' ' + destRef.gen + ' R'] :
                (destRef + 1);
            if (pageNumber) {
                if (pageNumber > documentService.getPagesCount()) {
                    pageNumber = documentService.getPagesCount();
                }
                communicationService.execute('onScrollToPage', pageNumber, dest);
            } else {
                documentService.getPageIndex(destRef)
                    .then(function (pageIndex) {
                        var cacheKey = destRef.num + ' ' + destRef.gen + ' R';
                        pagesRefCache[cacheKey] =  pageIndex + 1;
                        _goToDestination(dest, destRef);
                    });
            }
        }
    }
}());