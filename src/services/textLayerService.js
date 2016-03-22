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
