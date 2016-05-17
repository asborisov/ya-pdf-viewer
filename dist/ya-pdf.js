(function () {
    'use strict';

    /**
     * @author asborisov
     * @version 1.0
     *
     * @name ya.pdf
     *
     * @description
     *
     */
    angular.module('ya.pdf', [])
        .constant('ya.pdf.config', {
            classes: {
                thumbnails: '__thumbnails',
                fullScreen: '__full',
                hidden: '__hidden',
                container: 'ya-pdf-container',
                thumbnailsContainer: 'ya-pdf-thumbnailsContainer',
                thumbPageNumber: 'ya-pdf-thumbnail-pageNumber',
                pagesContainer: 'ya-pdf-pagesContainer',
                pageContainer: 'ya-pdf-pageContainer',
                textContainer: 'ya-pdf-textContainer',
                outlineContainer: 'ya-pdf-outlineContainer',
                pageNumber: 'ya-pdf-pageNumber',
                toolbar: 'ya-pdf-toolbar',
                printingContainer: 'ya-pdf-printingContainer'
            },
            zoomStep: 0.2,
            maxAutoZoom: 1.25,
            thumbnailScale: 0.5,
            maxDisplayedPage: 9
        });
})();

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

(function () {
    'use strict';

    /**
     * @description
     * Service for work with text layer of document
     *
     * @author asborisov
     * @version 1.0
     */
    angular.module('ya.pdf')
        .factory('ya.pdf.textLayerService', serviceFunction);

    serviceFunction.$inject = ['$q', 'ya.pdf.communicationService', 'ya.pdf.documentService', 'ya.pdf.renderQueueService'];

    /**
     * @ngdoc service
     * @name ya.pdf.textLayerService
     *
     * @description
     * Text layer service for extracting text from document and search in it
     *
     * @author asborisov
     * @version 1.0
     *
     * @requires $q, communicationService, documentService, renderQueueService
     *
     * @param $q
     * @param communicationService
     * @param documentService
     * @param renderQueueService
     * @returns {{
     *  initialize: init,
     *  cleanup: cleanup,
     *  find: search,
     *  findPrev: findPrevWrapper,
     *  currentNumber: currentNumber,
     *  foundCount: getFoundCount
     * }}
     */
    function serviceFunction($q, communicationService, documentService, renderQueueService) {
        /**
         * Content of page (strings)
         * @type Array
         */
        var pageContents;
        /**
         * Search query
         * @type String
         */
        var searchText;
        /**
         * @type Array
         */
        var pagesMatches;
        /**
         * @type Object {page: Number, itemId: Number, idx: Number, number: Number}
         */
        var selected;
        /**
         * @type Object {page: Number, itemId: Number, idx: Number, number: Number}
         */
        var selectedTmp;
        /**
         * @type Number
         */
        var foundCount;

        return {
            initialize: init,
            cleanup: cleanup,
            getMatchData: getMatchData,
            find: search,
            findPrev: findPrevWrapper,
            currentNumber: currentNumber,
            foundCount: getFoundCount
        };

        /**
         * Initialize service
         */
        function init() {
            cleanup();
            extractPageText(0);
        }

        /**
         * Cleanup service and set variables to default
         */
        function cleanup() {
            pageContents = [];
            pagesMatches = [];
            selected = {
                page: 0,
                itemId: 0,
                idx: -1,
                number: 0
            };
        }

        /**
         * Get matches for selected page and index
         *
         * @param {Number} pageIndex
         * @param {Number} index
         * @returns {{searchText: String, matches: Array, selected: Object}|null}
         */
        function getMatchData(pageIndex, index) {
            if (searchText && pagesMatches[pageIndex] && pagesMatches[pageIndex][index]){
                return {
                    searchText: searchText,
                    matches: pagesMatches[pageIndex][index],
                    selected: selected
                };
            }
            return null;
        }

        /**
         * Render lext layer of selected page
         *
         * @param {number} pageNumber
         * @returns {Promise}
         */
        function renderPageTextLayer(pageNumber) {
            return documentService.getPageData(pageNumber)
                .then(function (pageData) {
                    communicationService.execute('onRenderTextLayer', pageData);
                });
        }

        /**
         * Rerender text layer of rendered pages
         */
        function rerenderTextLayer() {
            communicationService.execute('onClearTextLayer');
            return renderQueueService.getRenderedPages()
                .forEach(function(pageNumber) {
                    return renderPageTextLayer(pageNumber);
                });
        }

        /**
         * Extract items for every page and store it
         * Then extracted text placed to array
         * Now we have whole document text
         *
         * @param {Number} pageIndex
         */
        function extractPageText(pageIndex) {
            return documentService.getPageData(pageIndex + 1)
                .then(function(pageData) {
                    return pageData.getTextContent(pageIndex)
                        .then(function(textContent) {
                            var textItems = textContent.items;
                            var str = [];

                            for (var i = 0, len = textItems.length; i < len; i++) {
                                str.push(textItems[i].str);
                            }
                            pageContents[pageIndex] = str;

                            if ((pageIndex + 1) < documentService.getPagesCount()) {
                                return extractPageText(pageIndex + 1);
                            }
                        });
                });
        }

        /**
         * Find all matches on all pages
         * Save indexes to array
         */
        function findMatches() {
            selected = {
                page: 0,
                itemId: 0,
                idx: -1,
                number: 0
            };
            selectedTmp = selected;
            pagesMatches = [];
            foundCount = 0;
            // For each page
            angular.forEach(pageContents, function(pageItems) {
                // Array of page matches
                var pageMatches = [];
                angular.forEach(pageItems, function(item) {
                    var itemMatches = [];
                    // Index of last match
                    var matchIdx = 0;
                    // Array of page itemMatches
                    while (true) {
                        // Find next match on page
                        matchIdx = item.toLowerCase().indexOf(searchText, matchIdx + 1);
                        // If nothing found - break
                        if (matchIdx == -1) {
                            break;
                        }
                        // Add index of text to itemMatches array
                        itemMatches.push(matchIdx);
                        foundCount++;
                    }
                    pageMatches.push(itemMatches);
                });
                // Save matches of page
                pagesMatches.push(pageMatches);
            });
            rerenderTextLayer();
            findNext();
        }

        /**
         * Check if result is empty
         *
         * @param {Array} resultToCheck
         * @returns {Boolean}
         */
        function isEmptyResult(resultToCheck) {
            if (!resultToCheck) {
                return true;
            }
            var isEmpty = true;
            var index = 0;
            while (isEmpty && !angular.isUndefined(resultToCheck[index])) {
                isEmpty = !resultToCheck[index++].length;
            }
            return isEmpty;
        }

        /**
         * Find next match and select it
         *
         * @params {Boolean} [scrollToSelected=true] Scroll to selected block
         * @returns {Promise}
         */
        function findNext() {
            if (!searchText) {
                return $q.resolve();
            }
            if (foundCount == 1 && selected.number == 1) {
                return $q.resolve();
            }
            selectedTmp.idx++;
            // Check next value on current page
            // If no matches left - go next page
            if (pagesMatches[selectedTmp.page]
                && pagesMatches[selectedTmp.page][selectedTmp.itemId] != undefined
                && pagesMatches[selectedTmp.page][selectedTmp.itemId][selectedTmp.idx] != undefined) {
                // Store tmp values
                selected = selectedTmp;
                // Clear selection
                var currentSelection = document.querySelectorAll('span.highlight.selected');
                if (currentSelection.length) {
                    currentSelection[0].className = 'highlight';
                }
                // If target page is not rendered
                if (renderQueueService.getRenderedPages().indexOf(selected.page + 1) == -1) {
                    communicationService.execute('onSetPage', selected.page + 1);
                    renderPageTextLayer(selected.page + 1);
                    currentNumber(1);
                    return $q.resolve();
                }
                return renderPageTextLayer(selected.page + 1)
                    .then(function() {
                        currentNumber(1);
                    });
            }
            selectedTmp.itemId++;
            selectedTmp.idx = -1;
            if (pagesMatches[selectedTmp.page]
                && pagesMatches[selectedTmp.page][selectedTmp.itemId] != undefined) {
                return findNext();
            }
            selectedTmp.page++;
            while (isEmptyResult(pagesMatches[selectedTmp.page])) {
                if (selectedTmp.page >= documentService.getPagesCount()) {
                    return $q.resolve();
                }
                selectedTmp.page++;
            }
            selectedTmp.itemId = 0;
            // Select next match
            return findNext();
        }

        /**
         * Wrapper for findPrev function
         *
         * @returns {Promise}
         */
        function findPrevWrapper() {
            selectedTmp = angular.copy(selected);
            return findPrev();
        }

        /**
         * Find previous match and select it
         *
         * @returns {Promise}
         */
        function findPrev() {
            if (!searchText) {
                return $q.resolve();
            }
            if (foundCount == 1 && selected.number == 1) {
                return $q.resolve();
            }
            selectedTmp.idx--;
            if (selectedTmp.idx >= 0) {
                selected = selectedTmp;
                var currentSelection = document.querySelectorAll('span.highlight.selected')[0];
                if (currentSelection) {
                    currentSelection.className = 'highlight';
                }
                // If target page is not rendered
                if (renderQueueService.getRenderedPages().indexOf(selected.page + 1) == -1) {
                    communicationService.execute('onSetPage', selected.page + 1);
                    renderPageTextLayer(selected.page + 1);
                    currentNumber(-1);
                    return $q.resolve();
                }
                return renderPageTextLayer(selected.page + 1)
                    .then(function() {
                        currentNumber(-1);
                    });
            }
            selectedTmp.itemId--;
            if (pagesMatches[selectedTmp.page]
                && pagesMatches[selectedTmp.page][selectedTmp.itemId] !== undefined) {
                selectedTmp.idx = pagesMatches[selectedTmp.page][selectedTmp.itemId].length;
                return findPrev();
            }
            selectedTmp.page--;
            while (isEmptyResult(pagesMatches[selectedTmp.page])) {
                if (selectedTmp.page < 0) {
                    return $q.resolve();
                }
                selectedTmp.page--;
            }
            selectedTmp.itemId = pagesMatches[selectedTmp.page].length;
            return findPrev();
        }

        /**
         * Get or change current selection number
         *
         * @param {Number} diff
         * @returns {Number}
         */
        function currentNumber(diff) {
            if (!selected) {
                selected = {
                    number: 0
                };
            }
            if (!selected.number) {
                selected.number = 0;
            }
            if (diff && selected.number + diff <= foundCount && selected.number + diff >= 0) {
                selected.number += diff;
            }
            return selected.number;
        }

        /**
         * Clear all found matches
         */
        function clearMatches() {
            searchText = '';
            pagesMatches = [];
            rerenderTextLayer();
        }

        /**
         * Find matches
         *
         * @param {String} searchString
         */
        function search(searchString) {
            if (!searchString) {
                clearMatches();
                return;
            }
            if (searchString != searchText) {
                searchText = searchString.toLowerCase();
                findMatches();
            } else {
                selectedTmp = angular.copy(selected);
                findNext();
            }
        }

        /**
         * Get found count
         *
         * @returns {Number}
         */
        function getFoundCount() {
            return foundCount || 0;
        }
    }
})();

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

            print: print,

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
         * @returns {Promise}
         */
        function getPageViewport(pageNumber) {
            return documentService.getPageViewport(pageNumber, documentScale);
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

        function print() {
            var body = angular.element('body');
            body.addClass('ya-pdf-hide-page');
            var printingContainer = angular.element('<div></div>');
            printingContainer.addClass('ya-pdf-printingContainer');
            body.append(printingContainer);

            var pageStyleSheet = angular.element('<style type=\'text/css\'></style>')[0];
            documentService.getPageViewport(1, 1)
                .then(function(pageSize) {
                    pageStyleSheet.textContent = 
                    // "size:<width> <height>" is what we need. But also add "A4" because
                    // Firefox incorrectly reports support for the other value.
                    '@supports ((size:A4) and (size:1pt 1pt)) {' +
                    '@page { size: ' + pageSize.width + 'pt ' + pageSize.height + 'pt;}}';
                body.append(pageStyleSheet);

                for (var i = 1; i <= documentService.getPagesCount(); i++) {
                    communicationService.execute('onPrintingPageRender', i);
                }
                
                $timeout(function() {$window.print();}, 2000);
                

                // body.removeClass('ya-pdf-hide-page');
                // printingContainer.remove();
                });
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

(function () {
    'use strict';
    angular.module('ya.pdf')
        .run(['$templateCache', onDirectiveRun])
    /**
     * @ngdoc directive
     * @name yaPdfOutline
     *
     * @author asborisov
     * @version 1.0
     *
     * @param [templateUrl] {string} Ссылка на шаблон панели
     *
     * @description
     * Директива для содержания документа
     *
     * @restrict E
     */
        .directive('yaPdfOutline', yaPdfOutline);

    /**
     * Добавляем дефолтный шаблон нанельки навигации по документу к templateCache
     */
    function onDirectiveRun($templateCache) {
        $templateCache.put('yaPdfOutlineItem',
            '<div ng-click="navigateTo(line.dest)" >{{line.title}}</div>' +
            '<ul ng-if="line.items && line.items.length">' +
            '<li ng-repeat="line in line.items" ng-include="\'yaPdfOutlineItem\'">' +
            '</ul>');

        $templateCache.put('yaPdfOutlineTemplate.html',
            '<div>' +
            '<ul>' +
            '<li ng-repeat="line in outline" ng-include="\'yaPdfOutlineItem\'"></li>' +
            '</ul>' +
            '</div>');
    }

    yaPdfOutline.$inject = ['ya.pdf.communicationService', 'ya.pdf.viewerService', 'ya.pdf.config'];

    /**
     * Функция для получения директивы yaPdfOutline
     * @returns {{restrict: string, templateUrl: Function, link: Function}}
     */
    function yaPdfOutline(communicationService, viewerService, config) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: function (element, attr) {
                return attr.templateUrl || 'yaPdfOutlineTemplate.html';
            },
            link: function (scope, element) {
                /**
                 * @type {viewerService.navigateTo}
                 */
                scope.navigateTo = viewerService.navigateTo;
                /**
                 * @type {boolean}
                 */
                scope.disabled;

                init();
                /**
                 * Initialize directive
                 */
                function init() {
                    scope.disabled = true;
                    communicationService.register({
                        onDocumentLoaded: getOutline
                    });
                }

                /**
                 * Get outline from viewerService
                 */
                function getOutline() {
                    viewerService.getOutline()
                        .then(function(outline) {
                            if (!outline || !outline.length) {
                                angular.element(element).addClass(config.classes.hidden);
                                scope.outline = [];
                            } else {
                                scope.outline = outline;
                            }
                        });
                }
            }
        }
    }
})();

(function () {
    'use strict';
    angular.module('ya.pdf')
    /**
     * @ngdoc directive
     * @name yaPdfPageNumber
     *
     * @author asborisov
     * @version 1.0
     *
     * @description
     * Директива для слежением за текущей страницей
     *
     * @restrict A
     *
     */
        .directive('yaPdfPageNumber', yaPdfPageNumber);

    yaPdfPageNumber.$inject = ['$parse', 'ya.pdf.communicationService'];

    /**
     * We need it to force update value when viewerService inform us about it
     * @param $parse
     * @param communicationService
     * @returns {{restrict: string, require: string, link: Function}}
     */
    function yaPdfPageNumber($parse, communicationService) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                communicationService.register({
                    onPageChanged: onPageChanged
                });

                function onPageChanged(page) {
                    ngModel.$setViewValue(page);
                    $parse(attrs.ngModel).assign(scope, page);
                    ngModel.$render();
                }
            }
        }
    }
})();

(function () {
    'use strict';
    angular.module('ya.pdf')
        .run(['$templateCache', onDirectiveRun])
    /**
     * @ngdoc directive
     * @name yaPdfToolbar
     *
     * @author asborisov
     * @version 1.0
     *
     * @param [templateUrl] {string} Ссылка на шаблон панели
     *
     * @description
     * Директива для туллбара управления директивой yaPdfViewer
     *
     * @restrict E
     */
        .directive('yaPdfToolbar', yaPdfToolbar);

    /**
     * Добавляем дефолтный шаблон панельки навигации по документу в $templateCache
     */
    function onDirectiveRun($templateCache) {
        $templateCache.put('yaPdfToolbarTemplate.html',
            '<div class="{{::classes.toolbar}}">' +
            '   <div class="btn-group">' +
            '       <i class="fa fa-arrow-left fa-lg" ng-click="prev()"></i>' +
            '       <i class="fa fa-arrow-right fa-lg" ng-click="next()"></i>' +
            '       <i class="fa fa-search-minus fa-lg" ng-click="zoomOut()"></i>' +
            '       <i class="fa fa-search-plus fa-lg" ng-click="zoomIn()"></i>' +
            '   </div>' +
            '   <div class="btn-group">' +
            '       <input type="text" class="form-control pdf-current-page" min=1 ng-model="currentPage" ' +
            '       ng-change="goToPage()" ya-pdf-page-number=""  ng-model-options="{updateOn: \'keypress\'}"> / {{pagesCountValue}}' +
            '   </div>' +
            '   <div class="btn-group">' +
            '       <div ng-click="toggleOutline()">' +
            '           <i class="fa fa-list fa-lg"></i>' +
            '       </div>' +
            '   </div>' +
            '   <div class="btn-group search-group" ng-init="focused = false">' +
            '       <div class="search-field" ng-class="{\'search-field-focused\': focused, \'search-field-found\': searchText.length}">' +
            '         <form ng-submit="find(searchText)">' +
            '           <div class="search-counter">{{ currentSelected() }} / {{ foundCount() }}</div>' +
            '           <input type="text" required="required" ng-model="searchText" placeholder=""' +
            '                  ng-focus="focused = true"' +
            '                  ng-blur="focused = false"' +
            '                  ng-change="find(searchText)"' +
            '                  ng-model-options="{ debounce: 500 }">' +
            '           <div class="search-prev" ng-click="findPrev()">' +
            '               <i class="fa fa-chevron-up"></i>' +
            '           </div>' +
            '           <div class="search-next" ng-click="find(searchText)">' +
            '               <i class="fa fa-chevron-down"></i>' +
            '           </div>' +
            '       </form>' +
            '      </div>' +
            '   </div>' +
            '   <div class="btn-group">' +
            '       <div ng-click="print()">' +
            '           <i class="fa fa-print fa-lg"></i>' +
            '       </div>' +
            '   </div>' +
            '</div>')
    }

    yaPdfToolbar.$inject = ['ya.pdf.communicationService', 'ya.pdf.viewerService', 'ya.pdf.config'];

    /**
     * Функция для получения директивы yaPdfToolbar
     * @returns {{restrict: string, templateUrl: Function, link: Function}}
     */
    function yaPdfToolbar(communicationService, viewerService, config) {
        return {
            restrict: 'E',
            templateUrl: function (element, attr) {
                return attr.templateUrl || 'yaPdfToolbarTemplate.html';
            },
            link: function (scope, element) {
                // Основной контейнер
                var pdfContainerDiv;
                /**
                 * @type {Boolean}
                 */
                var fullScreen = false;
                /**
                 * @type {Boolean}
                 */
                var outline = false;
                scope.classes = config.classes;
                /**
                 * Текущая страницу
                 * @type {Number}
                 */
                scope.currentPage = 1;
                /**
                 * Текущий масштаб
                 * @type {Object}
                 */
                scope.scale = {
                    name: '100%',
                    value: 1
                };
                /**
                 * Кол-во страниц
                 * @type {Number}
                 */
                scope.pagesCountValue = 0;
                /**
                 * Текст для поиска
                 * @type {String}
                 */
                scope.searchText = '';

                scope.prev = goPrevious;
                scope.next = goNext;
                scope.zoomIn = zoomIn;
                scope.zoomOut = zoomOut;
                scope.setScale = setScale;
                scope.goToPage = goToSelectedPage;
                scope.toggleFullScreen = toggleFullScreen;
                scope.toggleThumbnails = viewerService.toggleThumbnails;
                scope.toggleOutline = toggleOutline;
                scope.isOutlineDisabled = false;
                scope.downloadDocument = viewerService.downloadDocument;
                scope.find = viewerService.findText;
                scope.findPrev = viewerService.findPrev;
                scope.currentSelected = viewerService.currentSelected;
                scope.foundCount = viewerService.foundCount;
                scope.print = function() {return viewerService.print();}

                scope.getCurrentPage = getCurrentPage;

                init();

                /**
                 * Инициализация
                 */
                function init() {
                    fullScreen = false;
                    scope.isOutlineDisabled = false;
                    communicationService.register({
                        onDocumentLoaded: documentLoaded,
                        onOutlineDisabled: onOutlineDisabled,
                        onThumbnailsToggled: toggleThumbnails
                    });
                }

                function documentLoaded() {
                    pdfContainerDiv = angular.element('.' + config.classes.container);
                    scope.pagesCountValue = viewerService.getPagesCount();
                }

                function toggleFullScreen() {
                    fullScreen = !fullScreen;
                    if (fullScreen) {
                        element.addClass(config.classes.fullScreen);
                    } else {
                        element.removeClass(config.classes.fullScreen);
                    }
                    communicationService.execute('onFullScreenToggled', fullScreen);
                }

                function onOutlineDisabled(value) {
                    scope.isOutlineDisabled = value;
                }

                function toggleOutline() {
                    if (scope.isOutlineDisabled) {
                        return;
                    }
                    outline = !outline;
                    communicationService.execute('onOutlineToggled', outline);
                }

                /**
                 * Переход на предыдущую страницу
                 */
                function goPrevious() {
                    if (scope.currentPage > 1) {
                        scope.currentPage--;
                        goToPage(scope.currentPage);
                    }
                }

                /**
                 * Переход на следующую страницу
                 */
                function goNext() {
                    if (scope.currentPage && scope.currentPage < scope.pagesCountValue) {
                        scope.currentPage++;
                        goToPage(scope.currentPage);
                    }
                }

                /**
                 * Переход на определенную страницу
                 */
                function goToSelectedPage() {
                    goToPage(scope.currentPage);
                }

                /**
                 * Переход на выбранную страницу
                 * @param page Номер страницы
                 */
                function goToPage(page) {
                    // Проверяем что такая страница есть
                    if (page && parseInt(page) && page <= scope.pagesCountValue && page > 0) {
                        var pageNumber = parseInt(page);
                        viewerService.setPage(pageNumber)
                            .then(function (pageNumber) {
                                communicationService.execute('onScrollToPage', pageNumber);
                            });
                    }
                }

                function getCurrentPage() {
                    return scope.currentPage;
                }

                /**
                 * Приближение
                 */
                function zoomIn() {
                    var targetSize = parseFloat(scope.scale.value) + config.zoomStep;
                    setScale(targetSize);
                }

                /**
                 * Отдаление
                 */
                function zoomOut() {
                    var targetSize = parseFloat(scope.scale.value) - config.zoomStep;
                    setScale(targetSize);
                }

                /**
                 * Toggle thumbnails display mode
                 *
                 * @param {Boolean} isThumbnails
                 */
                function toggleThumbnails(isThumbnails) {
                    if (isThumbnails) {
                        element.addClass(config.classes.thumbnails);
                    } else {
                        element.removeClass(config.classes.thumbnails);
                    }
                }

                /**
                 * Обновление масштаба
                 * @param scale {number|string|Object} Возможные варианты:
                 * @param scale.name {string}
                 * @param scale.value {number|string}
                 *  1. Числовое значение масштаба
                 *  2. actual - по размеру документа
                 *  3. width - по ширине страницы
                 *  4. height - по высоте страницы
                 *  5. auto - автоматически подбор масштаба
                 */
                function setScale(scale) {
                    var currentPage = scope.currentPage;
                    // Проверяем что передано значение
                    if (!scale) {
                        // Если не передано - берём текущее
                        scale = scope.scale.value;
                    } else if (scale.name && scale.value) {
                        // Если значение - объект с полями name и value
                        // Берём значение
                        scale = scale.value;
                    }
                    // Парсим масштаб, который хотим установить
                    var targetSize = parseFloat(scale);
                    // Проверяем что пытаемся установить значение от 0% до 500%
                    // Если не запарсилось - считаем что пришёл один из пресетов
                    if (!isNaN(targetSize)) {
                        if (targetSize <= 0 || targetSize > 5) {
                            return;
                        }
                    } else {
                        targetSize = scale;
                    }
                    // Берём контейнер со страницами. Он необходим чтобы взять его размеры
                    viewerService.setScale(targetSize, {
                        width: pdfContainerDiv[0].clientWidth,
                        height: pdfContainerDiv[0].clientHeight
                    })
                        .then(function(newScale) {
                            // В значение контроллера устаналивается
                            scope.scale = {
                                name: (newScale * 100).toFixed() + '%',
                                value: newScale
                            };
                            // Скролим к нужной странице
                            goToPage(currentPage);
                        });
                }
            }
        }
    }
})();

(function () {
    'use strict';

    angular.module('ya.pdf')
        .run(['$templateCache', onDirectiveRun])
    /**
     * @ngdoc directive
     * @name yaPdfViewer
     *
     * @author asborisov
     * @version 1.0
     *
     * @param pdfUrl {string} Ссылка на pdf-документ
     * @param [templateUrl] {string} Ссылка шаблон viewer-а
     *
     * @description
     * Директива для просмотрщика pdf документов
     *
     * @restrict E
     */
        .directive('yaPdfViewer', yaPdfViewer);

    function onDirectiveRun($templateCache) {
        $templateCache.put('yaPdfPage',
            '<div class="{{::classes.pageContainer}}" id="ya-pdf-page-{{::page}}" page-number="{{::page}}" >' +
            '   <canvas></canvas>' +
            '   <div class="{{::classes.textContainer}}"></div>' +
            '</div>' +
            '<div class="{{::classes.pageNumber}}">Страница {{::page}}</div>');

        $templateCache.put('yaPdfThumbnailItem',
            '<img id="ya-pdf-thumbnail-{{::page}}" page-number="{{::page}}" ng-click="thumbnailClick(page)">' +
            '<div class="{{::classes.thumbPageNumber}}">{{::page}}</div>');

        $templateCache.put('yaPdfViewer.html',
            '<div class="{{::classes.container}}">' +
            '   <ya-pdf-outline class="{{::classes.outlineContainer}} __hidden"></ya-pdf-outline>' +
            '   <div class="{{::classes.pagesContainer}}">' +
            '       <div ng-repeat="page in pages" ng-include="\'yaPdfPage\'"></div>' +
            '   </div>' +
            '   <div class="{{::classes.thumbnailsContainer}}">' +
            '       <div ng-repeat="page in pages" ng-include="\'yaPdfThumbnailItem\'"></div>' +
            '   </div>' +
            '</div>' +
            '<a ng-hide="true" id="yaPdfDownloadLink"></a>');
    }

    /**
     * Функция для получения директивы yaPdfViewer
     * @param viewerService
     * @returns {{restrict: string, template: string, scope: {delegateHandle: string, pdfUrl: string, startPage: string, startScale: string, onLoaded: string, onError: string, onProgress: string, onRenderStart: string, onRenderEnd: string}, controller: *[], link: Function}}
     */
    yaPdfViewer.$inject = ['$window', '$timeout', 'ya.pdf.communicationService', 'ya.pdf.viewerService', 'ya.pdf.config'];

    function yaPdfViewer($window, $timeout, communicationService, viewerService, config) {
        return {
            restrict: 'E',
            templateUrl: function (element, attr) {
                return attr.templateUrl || 'yaPdfViewer.html';
            },
            scope: {
                yaPdfUrl: '@'
            },
            link: function (scope, element, attrs) {
                /**
                 * Main viewer container
                 */
                var pdfContainerDiv;
                /**
                 * Scroll function execute timeout
                 * @type Promise|null
                 */
                var scrollTimeout = null;
                /**
                 * Pages count
                 * @type Number
                 */
                scope.pagesCount;

                /**
                 * @type Array
                 */
                scope.pages;

                scope.classes = config.classes;
                scope.thumbnailClick = thumbnailClick;

                /**
                 * Detecting document URL changing
                 */
                attrs.$observe('yaPdfUrl', function (url) {
                    if (url) {
                        init();
                    }
                });

                /**
                 * Clear scroll watcher
                 */
                scope.$on('$destroy', cleanup);

                function cleanup() {
                    if (pdfContainerDiv) {
                        pdfContainerDiv.unbind('scroll', containerScrollBind);
                    }
                    communicationService.cleanup();
                    viewerService.cleanup();
                    scrollTimeout = null;
                    scope.pagesCount = 0;
                    scope.pages = [];
                }

                /**
                 * Initialize directive
                 */
                function init() {
                    scope.pagesCount = 0;
                    scope.pages = [];
                    // Register events
                    communicationService.register({
                        onPageNeedRender: renderPages,
                        onPageNeedDelete: clearPages,
                        onRenderTextLayer: renderTextLayer,
                        onClearTextLayer: clearTextLayer,
                        onFullScreenToggled: toggleFullScreen,
                        onThumbnailsToggled: toggleThumbnail,
                        onOutlineToggled: toggleOutline,
                        onSetPageSize: setPageSize,
                        onScrollToPage: scrollToPage,
                        onScrollToDiv: scrollToDiv,
                        onPrintingPageRender: _renderPrintingPage
                    });
                    // Initialize viewer service
                    viewerService.initialize()
                        .then(function () {
                            viewerService.open(scope.yaPdfUrl)
                                .then(function() {
                                    scope.pagesCount = viewerService.getPagesCount();
                                    for(var i = 1; i <= scope.pagesCount; i++) {
                                        scope.pages.push(i);
                                    }
                                    scope.outline = viewerService.outline;
                                    $timeout(function() {
                                        pdfContainerDiv = angular.element('.' + config.classes.container);
                                        // Watching container scroll
                                        pdfContainerDiv.bind('scroll', containerScrollBind);
                                        viewerService.setPage(1)
                                            .then(viewerService.preparePageSize)
                                            .then(function() {
                                                communicationService.execute('onViewerLoaded')
                                            });
                                    });
                                    
                                });
                    });
                }

                /**
                 * Thumbnail click callback
                 * @param {Number} pageNumber
                 */
                function thumbnailClick(pageNumber) {
                    viewerService.toggleThumbnails();
                    viewerService.setPage(pageNumber)
                        .then(scrollToPage);
                }

                /**
                 * Watching scroll and set current page or render thumbnails
                 */
                function containerScrollBind() {
                    if (scrollTimeout) {
                        return;
                    }
                    scrollTimeout = $timeout(function () {
                        if (pdfContainerDiv.hasClass(config.classes.thumbnails)) {
                            renderVisibleThumbnails();
                        } else {
                            findCurrentPage();
                        }
                        scrollTimeout = null;
                    }, 500);
                }

                /**
                 * Render thumbnails witch are on screen
                 */
                function renderVisibleThumbnails() {
                    var thumbnailDivs = angular.element('.' + config.classes.thumbnailsContainer + ' > div > img:not([thumbnail-rendered="true"])');
                    var currentOffset = pdfContainerDiv[0].scrollTop + pdfContainerDiv[0].clientHeight;
                    for (var i = 0; i < thumbnailDivs.length && thumbnailDivs[i].offsetTop < currentOffset; i++) {
                        var pageNumber = thumbnailDivs[i].attributes['page-number'].value;
                        renderPageThumbnail(parseInt(pageNumber));
                    }
                }

                /**
                 * Find number of current page
                 */
                function findCurrentPage() {
                    var pdfPageDiv = angular.element('.' + config.classes.pageContainer);
                    var currentOffset = pdfContainerDiv[0].scrollTop + pdfContainerDiv[0].clientHeight;
                    var containerCenter = pdfContainerDiv[0].scrollTop + (pdfContainerDiv[0].clientHeight / 2);
                    for (var i = 0; i < scope.pagesCount && pdfPageDiv[i].offsetTop < currentOffset; i++) {
                        if (pdfPageDiv[i].offsetTop < containerCenter && (pdfPageDiv[i].offsetTop + pdfPageDiv[i].offsetHeight) > containerCenter) {
                            var pageNumber = pdfPageDiv[i].attributes['page-number'].value;
                            viewerService.setPage(parseInt(pageNumber));
                            return;
                        }
                    }
                }

                /**
                 * Scroll to selected div
                 * @param {HTMLDivElement} pageDiv
                 * @param {Object} [spot]
                 * @param {Number} [spot.top]
                 * @param {Number} [spot.left]
                 */
                function scrollTo(pageDiv, spot) {
                    if (!pageDiv) {
                        return;
                    }
                    var parent = pdfContainerDiv[0];
                    var offset = pageDiv.offsetTop;
                    if (spot) {
                        offset += angular.isUndefined(spot.top) ? 0 : (spot.top / 2);
                    } else {
                        offset -= ((parent.clientHeight - pageDiv.clientHeight) / 2);
                    }
                    parent.scrollTop = offset;
                }

                /**
                 * Scroll viewer to selected page
                 * @param {Number} pageNumber
                 * @param {Array} [destination] - (optional) original PDF destination array:
                 *   <page-ref> </XYZ|FitXXX> <args..>
                 */
                function scrollToPage(pageNumber, destination) {
                    var CSS_UNITS = 96.0 / 72.0;
                    var pageDiv = angular.element('#ya-pdf-page-' + pageNumber)[0];
                    if (!destination) {
                        scrollTo(pageDiv);
                        return;
                    }
                    // Get destination spot
                    viewerService.getPageViewport(pageNumber)
                        .then(function (page) {
                            var x = 0, y = 0;
                            var width = 0, height = 0, widthScale, heightScale;
                            var changeOrientation = (pageDiv.rotation % 180 !== 0);
                            var pageWidth = (changeOrientation ? page.height : page.width) /
                                page.scale / CSS_UNITS;
                            var pageHeight = (changeOrientation ? page.width : page.height) /
                                page.scale / CSS_UNITS;
                            var scale = 0;
                            switch (destination[1].name) {
                                case 'XYZ':
                                    x = destination[2];
                                    y = destination[3];
                                    scale = destination[4];
                                    // If x and/or y coordinates are not supplied, default to
                                    // _top_ left of the page (not the obvious bottom left,
                                    // since aligning the bottom of the intended page with the
                                    // top of the window is rarely helpful).
                                    x = x !== null ? x : 0;
                                    y = y !== null ? y : pageHeight;
                                    break;
                                case 'Fit':
                                case 'FitB':
                                    scale = 'fit';
                                    break;
                                case 'FitH':
                                case 'FitBH':
                                    y = destination[2];
                                    scale = 'width';
                                    break;
                                case 'FitV':
                                case 'FitBV':
                                    x = destination[2];
                                    width = pageWidth;
                                    height = pageHeight;
                                    scale = 'height';
                                    break;
                                case 'FitR':
                                    x = destination[2];
                                    y = destination[3];
                                    width = destination[4] - x;
                                    height = destination[5] - y;

                                    widthScale = pdfContainerDiv[0].clientWidth / width / CSS_UNITS;
                                    heightScale = pdfContainerDiv[0].clientHeight / height / CSS_UNITS;
                                    scale = Math.min(Math.abs(widthScale), Math.abs(heightScale));
                                    break;
                                default:
                                    return;
                            }

                            if (scale && scale !== viewerService.documentScale) {
                                viewerService.documentScale = scale;
                            } else if (viewerService.documentScale === 0) {
                                viewerService.documentScale = 'actual';
                            }

                            if (scale === 'fit' && !destination[4]) {
                                scrollTo(pageDiv);
                                return;
                            }

                            var boundingRect = [
                                page.convertToViewportPoint(x, y),
                                page.convertToViewportPoint(x + width, y + height)
                            ];
                            var left = Math.min(boundingRect[0][0], boundingRect[1][0]);
                            var top = Math.min(boundingRect[0][1], boundingRect[1][1]);

                            scrollTo(pageDiv, {left: left, top: top});
                        });
                }

                /**
                 * Scroll into view of selected div
                 * @param {Object} div
                 */
                function scrollToDiv(div) {
                    // Scroll to element (it will be on top of window)
                    div.scrollIntoView();
                    // Move scroll up on half of visible height
                    pdfContainerDiv[0].scrollTop -= (pdfContainerDiv[0].clientHeight / 2);
                }

                /**
                 * Set size of selected page div
                 * @param {Number} pageNumber
                 * @param {{width: number, height: number}} viewport
                 */
                function setPageSize(pageNumber, viewport) {
                    var pageContainer = angular.element('#ya-pdf-page-' + pageNumber);
                    pageContainer.css('width', viewport.width);
                    pageContainer.css('height', viewport.height);
                }

                /**
                 * Clear selected page. Remove all child nodes
                 * @param {Number|Array} pageNumber Page to clean
                 * @param {Boolean} purge If we really want to delete all child
                 */
                function clearPages(pageNumber, purge) {
                    if (angular.isArray(pageNumber)) {
                        angular.forEach(pageNumber, function(page) {
                            _clearPage(page, purge);
                        });
                    } else {
                        return _clearPage(pageNumber, purge);
                    }
                }

                /**
                 * Clear selected page. Remove all child nodes
                 * @param {Number} pageNumber Page to clean
                 * @param {Boolean} purge If we really want to delete all child
                 * @private
                 */
                function _clearPage(pageNumber, purge) {
                    var pageDiv = angular.element('#ya-pdf-page-' + pageNumber);
                    pageDiv.addClass(config.classes.hidden);
                    if (purge) {
                        pageDiv.attr('page-rendered', false);
                        var textLayer = angular.element('#ya-pdf-page-' + pageNumber + ' .' + config.classes.textContainer);
                        textLayer.attr('rendered', false);
                    }
                }

                function renderPages(pageNumber) {
                    if (angular.isArray(pageNumber)) {
                        angular.forEach(pageNumber, function(page) {
                            _renderPage(page);
                        });
                    } else {
                        return _renderPage(pageNumber);
                    }
                }

                /**
                 * Render selected page
                 * @param {Number} pageNumber
                 * @private
                 */
                function _renderPage(pageNumber) {
                    viewerService.getPage(pageNumber)
                        .then(function(pageData) {
                            // Get div for page
                            var pageDiv = angular.element('#ya-pdf-page-' + pageNumber);
                            /**
                             * Get page canvas
                             * @type HTMLCanvasElement
                             */
                            var canvas = angular.element('#ya-pdf-page-' + pageNumber +' canvas')[0];
                            // If page already rendered - show it and return
                            if (pageDiv.attr('page-rendered') == 'true') {
                                pageDiv.removeClass(config.classes.hidden);
                            } else {
                                pageDiv.attr('page-rendered', true);
                                // Render page and set it size as last to viewerService
                                var ctx = canvas.getContext('2d');
                                // Clear canvas
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                // Get viewport of page
                                var viewport = pageData.getViewport(viewerService.documentScale);
                                // Set size of canvas
                                canvas.height = viewport.height;
                                canvas.width = viewport.width;
                                // Set lastPageSize in viewerService
                                viewerService.setLastPageSize({
                                    width: viewport.width,
                                    height: viewport.height
                                });
                                var renderContext = {
                                    canvasContext: ctx,
                                    viewport: viewport
                                };
                                // Render page
                                pageData.render(renderContext);
                            }
                            var textLayer = angular.element('#ya-pdf-page-' + pageNumber + ' .' + config.classes.textContainer);
                            if (textLayer.attr('rendered') != 'true') {
                                // Render textLayer
                                renderTextLayer(pageData);
                                textLayer.attr('rendered', true);
                            }
                        });
                }

                /**
                 * Render selected page for printing
                 * @param {Numebr} pageNumber
                 * @private
                 */
                function _renderPrintingPage(pageNumber) {
                    viewerService.getPage(pageNumber)
                        .then(function(pageData) {
                            var printingContainer = angular.element('.' + config.classes.printingContainer)[0];
                            var pageDiv = angular.element('<div></div>')[0];

                            var canvas = angular.element('<canvas></canvas>')[0];
                            pageDiv.appendChild(canvas);
                            printingContainer.appendChild(pageDiv);

                            var viewport = pageData.getViewport(1);
                            canvas.width = Math.floor(viewport.width) * 2;
                            canvas.height = Math.floor(viewport.height) * 2;
                            console.log(pageNumber, canvas.height);

                            canvas.style.width = '200%';
                            canvas.style.height = '200%';

                            pageDiv.style.width = viewport.width + 'pt';
                            pageDiv.style.height = viewport.height + 'pt';

                            canvas.style.transform = 'scale(0.5,0.5)';
                            canvas.style.transformOrigin = '0% 0%';

                            var ctx = canvas.getContext('2d');
                            ctx.save();
                            ctx.fillStyle = 'rgb(255, 255, 255)';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.restore();
                            ctx.scale(2, 2);

                            var renderContext = {
                                canvasContext: ctx,
                                viewport: viewport,
                                intent: 'print'
                            };
                            // Render page
                            pageData.render(renderContext);
                        });
                }

                /**
                 * Render text layer based on pageData
                 *
                 * @param {Object} pageData
                 */
                function renderTextLayer(pageData) {
                    var textLayerDiv = angular.element('#ya-pdf-page-' + (pageData.pageIndex + 1) + ' .' + config.classes.textContainer);
                    var canvas = angular.element('#ya-pdf-page-' + (pageData.pageIndex + 1) +' canvas')[0];
                    pageData.getTextContent()
                        .then(function(text) {
                            // Clear text layer of page
                            while (textLayerDiv[0].firstChild) {
                                textLayerDiv[0].removeChild(textLayerDiv[0].firstChild);
                            }
                            var ctx = canvas.getContext('2d');
                            var viewport = pageData.getViewport(viewerService.documentScale);
                            var lastFontSize;
                            var lastFontFamily;
                            text.items.forEach(function(item, index) {
                                // Check if no text
                                if (!/\S/.test(item.str)) {
                                    return;
                                }
                                // Get style for text
                                var style = text.styles[item.fontName];
                                // Create div for text layer
                                var textDiv = angular.element('<div></div>')[0];
                                // Get transform for item
                                var tx = $window.PDFJS.Util.transform(viewport.transform, item.transform);
                                // Calc angle
                                var angle = Math.atan2(tx[1], tx[0]);
                                // If vertical style - rotate page text
                                if (style.vertical) {
                                    angle += Math.PI / 2;
                                }
                                // Get font size and ascent
                                var fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
                                var fontAscent = fontHeight;
                                if (style.ascent) {
                                    fontAscent = style.ascent * fontAscent;
                                } else if (style.descent) {
                                    fontAscent = (1 + style.descent) * fontAscent;
                                }
                                // Top and left indent
                                var left;
                                var top;
                                if (angle === 0) {
                                    left = tx[4];
                                    top = tx[5] - fontAscent;
                                } else {
                                    left = tx[4] + (fontAscent * Math.sin(angle));
                                    top = tx[5] - (fontAscent * Math.cos(angle));
                                }
                                var fontSize = fontHeight + 'px';
                                var fontFamily = style.fontFamily;
                                // Set style
                                textDiv.style.left = left + 'px';
                                textDiv.style.top = top + 'px';
                                textDiv.style.fontSize = fontSize;
                                textDiv.style.fontFamily = fontFamily;

                                textDiv.textContent = item.str;
                                // Storing into dataset will convert number into string.
                                if (angle !== 0) {
                                    textDiv.dataset.angle = angle * (180 / Math.PI);
                                }
                                // We don't bother scaling single-char text divs, because it has very
                                // little effect on text highlighting. This makes scrolling on docs with
                                // lots of such divs a lot faster.
                                if (item.str.length > 1) {
                                    if (style.vertical) {
                                        textDiv.dataset.canvasWidth = item.height * viewerService.documentScale;
                                    } else {
                                        textDiv.dataset.canvasWidth = item.width * viewerService.documentScale;
                                    }
                                }
                                // Only build font string and set to context if different from last.
                                if (fontSize !== lastFontSize || fontFamily !== lastFontFamily) {
                                    ctx.font = fontSize + ' ' + fontFamily;
                                    lastFontSize = fontSize;
                                    lastFontFamily = fontFamily;
                                }
                                var width = ctx.measureText(textDiv.textContent).width;
                                if (width > 0) {
                                    textLayerDiv[0].appendChild(textDiv);
                                    var transform;
                                    if (textDiv.dataset.canvasWidth !== undefined) {
                                        // Dataset values come of type string.
                                        var textScale = textDiv.dataset.canvasWidth / width;
                                        transform = 'scaleX(' + textScale + ')';
                                    } else {
                                        transform = '';
                                    }
                                    var rotation = textDiv.dataset.angle;
                                    if (rotation) {
                                        transform = 'rotate(' + rotation + 'deg) ' + transform;
                                    }
                                    if (transform) {
                                        textDiv.style['transform'] = transform;
                                    }
                                }

                                // All matches of page item
                                var matchData = viewerService.getMatchData(pageData.pageIndex, index);

                                // If there is searchText and any matches for current page
                                if (matchData) {
                                    var matches = matchData.matches;
                                    var selected = matchData.selected;
                                    // Clear text content
                                    textDiv.textContent = '';
                                    // Current position
                                    var workingPosition = 0;
                                    var matchesIndex = 0;
                                    while (true) {
                                        // Part of the content
                                        var content = item.str.substring(workingPosition, matches[matchesIndex]);
                                        // Text node with text
                                        var node = document.createTextNode(content);
                                        // Append it to div
                                        textDiv.appendChild(node);
                                        // If there is any matches
                                        if (matches[matchesIndex] === undefined) {
                                            break;
                                        }
                                        // Detect if current block selected
                                        var isSelected = selected.page == pageData.pageIndex && selected.itemId == index && selected.idx == matchesIndex;
                                        // Text to highlight
                                        var highlightText = item.str.substring(matches[matchesIndex], matches[matchesIndex] + matchData.searchText.length);
                                        // Node for highlight
                                        var highlightNode = document.createTextNode(highlightText);
                                        // Span for text
                                        var span = document.createElement('span');
                                        // Add class to span
                                        span.className = 'highlight' + (isSelected ? ' selected' : '');
                                        // Add text to span
                                        span.appendChild(highlightNode);
                                        // Add span to div
                                        textDiv.appendChild(span);
                                        // Scroll to selected div if needed
                                        if (isSelected) {
                                            communicationService.execute('onScrollToDiv', textDiv);
                                        }
                                        // Update working position
                                        workingPosition = matches[matchesIndex] + matchData.searchText.length;
                                        // Go to next match
                                        matchesIndex++;
                                    }
                                }
                            });
                            textLayerDiv.attr('rendered', true);
                        });
                }

                /**
                 * Clear text layer of all pages
                 */
                function clearTextLayer() {
                    var textLayer = angular.element(config.classes.textContainer);
                    textLayer.attr('text-rendered', false);
                }

                /**
                 * Toggle full screen view
                 * @param {Boolean} isFull
                 */
                function toggleFullScreen(isFull) {
                    if (isFull) {
                        pdfContainerDiv.addClass(config.classes.fullScreen);
                    } else {
                        pdfContainerDiv.removeClass(config.classes.fullScreen);
                    }
                }

                /**
                 * @param {Boolean} isThumbnail
                 */
                function toggleThumbnail(isThumbnail) {
                    if (isThumbnail) {
                        pdfContainerDiv.addClass(config.classes.thumbnails);
                        renderVisibleThumbnails();
                    } else {
                        pdfContainerDiv.removeClass(config.classes.thumbnails);
                        findCurrentPage();
                    }
                }

                /**
                 * @param {Boolean} isOutline
                 */
                function toggleOutline(isOutline) {
                    var outlineContainer = angular.element('.' + config.classes.outlineContainer);
                    if (isOutline) {
                        outlineContainer.removeClass(config.classes.hidden);
                    } else {
                        outlineContainer.addClass(config.classes.hidden);
                    }
                }

                /**
                 * Render thumbnail of selected page
                 * @param {Number} pageNumber
                 * @returns {Promise}
                 */
                function renderPageThumbnail(pageNumber) {
                    return viewerService.getPageThumbnail(pageNumber)
                        .then(function (data) {
                            var thumbnailImg = angular.element('#ya-pdf-thumbnail-' + pageNumber);
                            if (thumbnailImg.length) {
                                thumbnailImg[0].src = data;
                                thumbnailImg.attr('thumbnail-rendered', true);
                            }
                        });
                }
            }
        };
    }
})();
