(function () {
    'use strict';

    angular.module('ya.pdf')
        .factory('ya.pdf.renderQueueService', serviceFunction);

    serviceFunction.$inject = ['$q', 'ya.pdf.communicationService', 'ya.pdf.config'];

    /**
     * @ngdoc service
     * @name ya.pdf.renderQueueService
     *
     * @description
     *
     * @author asborisov
     * @version 1.0
     *
     * @requires $q, communicationService, config
     *
     * @param $q
     * @param communicationService
     * @param config
     * @returns {{
     *  initialize: initialize,
     *  cleanup: cleanup,
     *  setPage: setPage,
     *  getRenderedPages: getRenderedPages,
     *  pagesToClean: pagesToClean}}
     */
    function serviceFunction($q, communicationService, config) {
        /**
         * List of displaying pages
         * @type {Array}
         */
        var renderedPages = [];
        /**
         * List of rendered pages
         * @type {Array}
         */
        var createdPages = [];
        /**
         * Count of pages in document
         * @type {Number}
         */
        var pagesCount = 0;

        return {
            initialize: initialize,
            cleanup: cleanup,
            setPage: setPage,
            getRenderedPages: getRenderedPages,
            pagesToClean: pagesToClean
        };

        /**
         * Cleanup service
         */
        function cleanup() {
            renderedPages = [];
        }

        /**
         * Initialize service
         * @param {Number} _pagesCount_
         */
        function initialize(_pagesCount_) {
            cleanup();
            pagesCount = _pagesCount_;
        }

        /**
         * Set current page
         *
         * @param {Number} pageNumber
         */
        function setPage(pageNumber) {
            var pagesToRender = _getQueueBasedOnTargetPage(pageNumber);
            pagesToRender.forEach(function(page) {
                if (createdPages.indexOf(page) < 0) {
                    createdPages.push(page);
                }
                if (renderedPages.indexOf(page) < 0) {
                    renderedPages.push(page);
                }
            });
            communicationService.execute('onPageNeedRender', pagesToRender);
            var pagesToDelete = [];
            var i = 0;
            while (renderedPages.length > config.maxDisplayedPage) {
                if (pagesToRender.indexOf(renderedPages[i]) < 0) {
                    pagesToDelete.push(renderedPages.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
            communicationService.execute('onPageNeedDelete', pagesToDelete);
            return $q.resolve({
                toRender: pagesToRender,
                toDelete: pagesToDelete
            })
        }

        /**
         * Return rendered pages and clear list
         *
         * @returns {Promise.<Array>}
         */
        function pagesToClean() {
            var t = createdPages;
            createdPages = [];
            return $q.resolve(t);
        }

        /**
         * Get queue of pages to render
         *
         * @param {Number} targetPageNumber
         * @return {Array}
         * @private
         */
        function _getQueueBasedOnTargetPage(targetPageNumber) {
            var t = [];
            for (var i = targetPageNumber - 4; i <= targetPageNumber + 4; i++) {
                if (i > 0 && i <= pagesCount) {
                    t.push(i);
                }
            }
            return t;
        }

        /**
         * Get displaying pages list
         *
         * @returns {Array}
         */
        function getRenderedPages() {
            return renderedPages;
        }
    }
}());
