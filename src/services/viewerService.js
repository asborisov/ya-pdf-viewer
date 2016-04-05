(function() {
    'use strict';

    /**
     * @description
     * Main viewer service
     *
     * @author asborisov
     * @version 1.0
     */
    angular.module('ya.pdf')
        .factory('ya.pdf.viewerService', serviceFunction);

    serviceFunction.$inject = ['$window', '$q', '$timeout', 'ya.pdf.communicationService', 'ya.pdf.documentService',
        'ya.pdf.renderQueueService', 'ya.pdf.textLayerService', 'ya.pdf.thumbnailService', 'ya.pdf.outlineService'];

    /**
     * @ngdoc service
     * @name ya.pdf.viewerService
     *
     * @description
     *
     * @author asborisov
     * @version 1.0
     *
     * @requires $window, $q, $timeout, communicationService, documentService, renderQueueService, textLayerService, thumbnailService, outlineService
     *
     * @param $window
     * @param $q
     * @param $timeout
     * @param communicationService
     * @param documentService
     * @param renderQueueService
     * @param textLayerService
     * @param thumbnailService
     * @param outlineService
     *
     *
     * @returns {{
     *  initialize: initialize,
     *  cleanup: cleanup,
     *  open: open,
     *  getPagesCount: getPagesCount,
     *  setPage: setPage,
     *  getPageNumber: getPageNumber,
     *  setScale: setScale,
     *  setLastPageSize: setLastPageSize,
     *  toggleThumbnails: setThumbnails,
     *  downloadDocument: downloadDocument,
     *  preparePageSize: getPagesData,
     *  getPageViewport: getPageViewport,
     *  getPage: *,
     *  getMatchData: (*|getMatchData),
     *  findText: *,
     *  findPrev: (*|findPrevWrapper),
     *  currentSelected: currentNumber,
     *  foundCount: *,
     *  getPageThumbnail: (getPageThumbnail|PDFThumbnailViewer.getThumbnail|Function),
     *  getOutline: (*|getOutline|PDFDocumentProxy.getOutline|Function|WorkerTransport.getOutline),
     *  navigateTo: (*|navigateTo|PDFLinkService.navigateTo|Function|IPDFLinkService.navigateTo|SimpleLinkService.navigateTo),
     *  documentScale
     * }}
     */
    function serviceFunction($window, $q, $timeout, communicationService, documentService, renderQueueService,
                             textLayerService, thumbnailService, outlineService) {
        /**
         * Check if PDFJS loaded
         */
        if (!$window.PDFJS) {
            throw "PDFJS is not defined";
        }
        var PDFJS = $window.PDFJS;
        /**
         * @type Number
         */
        var documentScale;
        /**
         * @type Number
         */
        var currentPage;
        /**
         * @type Boolean
         */
        var thumbnails;
        /**
         * @type {{width, height}}
         */
        var lastPageSize = {};

        return {
            initialize: initialize,
            cleanup: cleanup,
            open: open,
            setPage: setPage,
            getPageNumber: getPageNumber,
            setScale: setScale,
            setLastPageSize: setLastPageSize,
            toggleThumbnails: setThumbnails,
            downloadDocument: downloadDocument,
            preparePageSize: getPagesData,
            getPageViewport: getPageViewport,

            getPage: documentService.getPageData,
            getPagesCount: documentService.getPagesCount,

            getMatchData: textLayerService.getMatchData,
            findText: textLayerService.find,
            findPrev: textLayerService.findPrev,
            currentSelected: textLayerService.currentNumber,
            foundCount: textLayerService.foundCount,

            getPageThumbnail: thumbnailService.getThumbnail,

            getOutline: outlineService.getOutline,
            navigateTo: outlineService.navigateTo,

            set documentScale(value) {
                setScale(value);
            },
            get documentScale() {
                return documentScale;
            }
        };

        /**
         * @param viewerParams {{}}
         * @param [viewerParams.scale] {Number}
         * @param [viewerParams.page] {Number}
         * @private
         */
        function _setParams(viewerParams) {
            if (!angular.isUndefined(viewerParams.scale)) {
                documentScale = viewerParams.scale;
            }
            if (!angular.isUndefined(viewerParams.page)) {
                currentPage = viewerParams.page;
            }
        }

        /**
         * Initialize service
         *
         * @param viewerParams {{}}
         * @param [viewerParams.scale] {Number}
         * @param [viewerParams.page] {Number}
         * @returns {Promise}
         */
        function initialize(viewerParams) {
            cleanup();
            if (viewerParams) {
                _setParams(viewerParams);
            }
            communicationService.register('onSetPage', setPage);
            return $q.resolve();
        }

        /**
         * Cleanup main service and all sub-services
         * Set variables to default
         */
        function cleanup() {
            documentService.cleanup();
            renderQueueService.cleanup();
            outlineService.cleanup();
            thumbnailService.cleanup();
            textLayerService.cleanup();

            documentScale = 1.0;
            currentPage = 0;
            thumbnails = false;
        }

        /**
         * Get current page number
         *
         * @returns {Number}
         */
        function getPageNumber() {
            return currentPage;
        }

        /**
         * Notify about document load progress
         * @private
         */
        function _onLoadProgress() {
            communicationService.execute('onLoadProgress', arguments);
        }

        /**
         * Open document
         *
         * @param url {String}
         * @return {Promise}
         */
        function open(url) {
            if (url) {
                return documentService.initialize(url, _onLoadProgress)
                    .then(function() {
                        renderQueueService.initialize(documentService.getPagesCount());
                        textLayerService.initialize();
                        thumbnailService.initialize();
                        outlineService.initialize()
                            .then(function(outline) {
                                communicationService.execute('onOutlineDisabled', !outline.length);
                            });
                        communicationService.execute('onDocumentLoaded');
                        return $q.resolve();
                    }, function(error) {
                        communicationService.execute('onDocumentError', error);
                        return $q.reject(error);
                    });
            } else {
                return $q.reject('ya.pdf.viewerService_open: No url passed');
            }
        }

        /**
         * Get size of all pages
         */
        function getPagesData(scale) {
            scale = scale || 1.0;
            var promises = [];
            for (var i = 1; i <= documentService.getPagesCount(); i++) {
                promises.push(documentService.getPageData(i)
                    .then(function(pageData) {
                        communicationService.execute('onSetPageSize', pageData.pageNumber, pageData.getViewport(scale));
                    }));
            }
            return $q.all(promises);
        }

        /**
         * Set current page number
         * @param {Number} pageNumber
         * @returns {Promise}
         */
        function setPage(pageNumber) {
            renderQueueService.setPage(pageNumber);
            if (pageNumber != currentPage) {
                currentPage = pageNumber;
                communicationService.execute('onPageChanged', pageNumber);
            }
            return $q.resolve(currentPage);
        }

        /**
         * Get viewport of selected page with current scale
         *
         * @param {Number} pageNumber
         * @param {Number} [scale=documentScale]
         * @returns {Promise}
         */
        function getPageViewport(pageNumber, scale) {
            return documentService.getPageViewport(pageNumber, scale || documentScale);
        }

        /**
         * Set page size of last rendered page
         * @param {{width: Number, height: Number}} size
         */
        function setLastPageSize(size) {
            lastPageSize = size;
        }

        /**
         * Set scale of document
         *
         * @param {Number} scale
         * @param {{width: Number, height: Number}} [containerSizes]
         * @returns {Promise}
         */
        function setScale(scale, containerSizes) {
            if (scale == documentScale) {
                return $q.resolve(documentScale);
            }
            if (containerSizes) {
                var pageWidthScale = (containerSizes.width - 5) / lastPageSize.width * documentScale;
                var pageHeightScale = (containerSizes.height - 5) / lastPageSize.height * documentScale;
                switch (scale) {
                    case 'actual':
                        scale = 1;
                        break;
                    case 'width':
                        scale = pageWidthScale;
                        break;
                    case 'height':
                        scale = pageHeightScale;
                        break;
                    case 'fit':
                        scale = Math.min(pageWidthScale, pageHeightScale);
                        break;
                    case 'auto':
                        var isLandscape = (lastPageSize.width > lastPageSize.height);
                        var horizontalScale = isLandscape ?
                            Math.min(pageHeightScale, pageWidthScale) : pageWidthScale;
                        scale = Math.min(config.maxAutoZoom, horizontalScale);
                        break;
                    default:
                        // Got number. Nothing to parse
                        break;
                }
            }
            documentScale = scale;
            // Get all rendered pages
            return renderQueueService.pagesToClean()
                .then(function(pagesToClean) {
                    // and clean it's content
                    communicationService.execute('onPageNeedDelete', pagesToClean, true);
                    // set page current page
                    return $q.all([setPage(currentPage), getPagesData(documentScale)])
                        .then(function() {
                            return documentScale;
                        })
                });
        }

        /**
         * Toggle thumbnails mode and notify
         */
        function setThumbnails() {
            thumbnails = !thumbnails;
            communicationService.execute('onThumbnailsToggled', thumbnails);
        }

        /**
         * Black magic to generate download link and click it via service
         *
         * @param {String} addToUrl additional url string params
         */
        function downloadDocument(addToUrl) {
            var href = documentService.getUrl();
            if (addToUrl) {
                href += addToUrl;
            }
            var linkDownload = angular.element('#yaPdfDownloadLink');
            var anchor = angular.element(linkDownload);
            anchor.attr({
                target: '_self',
                href: href
            });

            $timeout(function() {
                try {
                    anchor[0].click();
                } catch (err) {
                }
            }, 0, false);
        }
    }
}());
