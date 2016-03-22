(function () {
    'use strict';

    /**
     * @description
     * Service to work with thumbnails
     *
     * @author asborisov
     * @version 1.0
     */
    angular.module('ya.pdf')
        .factory('ya.pdf.thumbnailService', serviceFunction);

    serviceFunction.$inject = ['$q', 'ya.pdf.documentService', 'ya.pdf.config'];

    /**
     * @ngdoc service
     * @name ya.pdf.thumbnailService
     *
     * @description
     * Service function for ya.pdf.thumbnailService
     *
     * @author asborisov
     * @version 1.0
     *
     * @requires $q, ya.pdf.documentService, ya.pdf.config
     *
     * @param $q
     * @param documentService
     * @param config
     * @returns {{initialize: init, cleanup: init, getThumbnail: getPageThumbnail}}
     */
    function serviceFunction($q, documentService, config) {
        /**
         * Cache of images
         * @type {Object}
         */
        var images;

        return {
            initialize: init,
            cleanup: init,
            getThumbnail: getPageThumbnail
        };

        /**
         * Initialize/cleanup service
         */
        function init() {
            images = {};
        }

        /**
         * Get thumbnail of selected page
         *
         * @param {Number} pageNumber
         * @returns {Promise}
         */
        function getPageThumbnail(pageNumber) {
            var pageIndex = pageNumber - 1;
            if (images[pageIndex]) {
                return $q.resolve(images[pageIndex]);
            } else {
                return _getPageThumbnail(pageIndex);
            }
        }

        /**
         * Generate thumbnail for selected page and put it to cache
         *
         * @param {Number} pageIndex
         * @returns {Promise}
         * @private
         */
        function _getPageThumbnail(pageIndex) {
            return documentService.getPageData(pageIndex + 1)
                .then(function (pageData) {
                    /**
                     * @type HTMLCanvasElement
                     */
                    var canvas = angular.element('<canvas></canvas>')[0];
                    var ctx = canvas.getContext('2d');
                    var viewport = pageData.getViewport(config.thumbnailScale);

                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    var renderContext = {
                        canvasContext: ctx,
                        viewport: viewport
                    };

                    return pageData.render(renderContext).promise
                        .then(function() {
                            images[pageIndex] = canvas.toDataURL();
                            return images[pageIndex];
                        })
                });
        }
    }
}());
