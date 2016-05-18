import { clone, forEach, isUndefined } from 'lodash';

let $q;
let communicationService;
let documentService;
let renderQueueService;
/**
 * Content of page (strings)
 * @type Array
 */
let pageContents;
/**
 * Search query
 * @type String
 */
let searchText;
/**
 * @type Array
 */
let pagesMatches;
/**
 * @type Object {page: Number, itemId: Number, idx: Number, number: Number}
 */
let selected;
/**
 * @type Object {page: Number, itemId: Number, idx: Number, number: Number}
 */
let selectedTmp;
/**
 * @type Number
 */
let foundCount;

/**
 * Render lext layer of selected page
 *
 * @param {number} pageNumber
 * @returns {Promise}
 */
function _renderPageTextLayer(pageNumber) {
    return documentService.getPageData(pageNumber)
        .then(function (pageData) {
            communicationService.execute('onRenderTextLayer', pageData);
        });
}

/**
 * Rerender text layer of rendered pages
 */
function _rerenderTextLayer() {
    communicationService.execute('onClearTextLayer');
    return renderQueueService.getRenderedPages()
        .forEach(function(pageNumber) {
            return _renderPageTextLayer(pageNumber);
        });
}

/**
 * Extract items for every page and store it
 * Then extracted text placed to array
 * Now we have whole document text
 *
 * @param {Number} pageIndex
 */
function _extractPageText(pageIndex) {
    return documentService.getPageData(pageIndex + 1)
        .then(function(pageData) {
            return pageData.getTextContent(pageIndex)
                .then(function(textContent) {
                    const textItems = textContent.items;
                    const str = [];

                    for (var i = 0, len = textItems.length; i < len; i++) {
                        str.push(textItems[i].str);
                    }
                    pageContents[pageIndex] = str;

                    if ((pageIndex + 1) < documentService.getPagesCount()) {
                        return _extractPageText(pageIndex + 1);
                    }
                });
        });
}

/**
 * Find all matches on all pages
 * Save indexes to array
 */
function _findMatches() {
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
    forEach(pageContents, function(pageItems) {
        // Array of page matches
        const pageMatches = [];
        forEach(pageItems, function(item) {
            const itemMatches = [];
            // Index of last match
            let matchIdx = 0;
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
    _rerenderTextLayer();
    _findNext();
}

/**
 * Check if result is empty
 *
 * @param {Array} resultToCheck
 * @returns {Boolean}
 */
function _isEmptyResult(resultToCheck) {
    if (!resultToCheck) {
        return true;
    }
    let isEmpty = true;
    let index = 0;
    while (isEmpty && !isUndefined(resultToCheck[index])) {
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
function _findNext() {
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
            _renderPageTextLayer(selected.page + 1);
            currentNumber(1);
            return $q.resolve();
        }
        return _renderPageTextLayer(selected.page + 1)
            .then(function() {
                _currentNumber(1);
            });
    }
    selectedTmp.itemId++;
    selectedTmp.idx = -1;
    if (pagesMatches[selectedTmp.page]
        && pagesMatches[selectedTmp.page][selectedTmp.itemId] != undefined) {
        return _findNext();
    }
    selectedTmp.page++;
    while (_isEmptyResult(pagesMatches[selectedTmp.page])) {
        if (selectedTmp.page >= documentService.getPagesCount()) {
            return $q.resolve();
        }
        selectedTmp.page++;
    }
    selectedTmp.itemId = 0;
    // Select next match
    return _findNext();
}



/**
 * Find previous match and select it
 *
 * @returns {Promise}
 */
function _findPrev() {
    if (!searchText) {
        return $q.resolve();
    }
    if (foundCount == 1 && selected.number == 1) {
        return $q.resolve();
    }
    selectedTmp.idx--;
    if (selectedTmp.idx >= 0) {
        selected = selectedTmp;
        const currentSelection = document.querySelectorAll('span.highlight.selected')[0];
        if (currentSelection) {
            currentSelection.className = 'highlight';
        }
        // If target page is not rendered
        if (renderQueueService.getRenderedPages().indexOf(selected.page + 1) == -1) {
            communicationService.execute('onSetPage', selected.page + 1);
            _renderPageTextLayer(selected.page + 1);
            _currentNumber(-1);
            return $q.resolve();
        }
        return _renderPageTextLayer(selected.page + 1)
            .then(function() {
                _currentNumber(-1);
            });
    }
    selectedTmp.itemId--;
    if (pagesMatches[selectedTmp.page]
        && pagesMatches[selectedTmp.page][selectedTmp.itemId] !== undefined) {
        selectedTmp.idx = pagesMatches[selectedTmp.page][selectedTmp.itemId].length;
        return _findPrev();
    }
    selectedTmp.page--;
    while (_isEmptyResult(pagesMatches[selectedTmp.page])) {
        if (selectedTmp.page < 0) {
            return $q.resolve();
        }
        selectedTmp.page--;
    }
    selectedTmp.itemId = pagesMatches[selectedTmp.page].length;
    return _findPrev();
}

/**
 * Get or change current selection number
 *
 * @param {Number} diff
 * @returns {Number}
 */
function _currentNumber(diff) {
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
function _clearMatches() {
    searchText = '';
    pagesMatches = [];
    _rerenderTextLayer();
}

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
class textLayerService {
  constructor(_$q_, _communicationService_, _documentService_, _renderQueueService_) {
    $q = _$q_;
    communicationService = _communicationService_;
    documentService = _documentService_;
    renderQueueService = _renderQueueService_;
  }

  /**
   * Initialize service
   */
  initialize() {
      this.cleanup();
      _extractPageText(0);
  }

  /**
   * Cleanup service and set variables to default
   */
  cleanup() {
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
  getMatchData(pageIndex, index) {
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
   * Find matches
   *
   * @param {String} searchString
   */
  find(searchString) {
      if (!searchString) {
          _clearMatches();
          return;
      }
      if (searchString != searchText) {
          searchText = searchString.toLowerCase();
          _findMatches();
      } else {
          selectedTmp = clone(selected);
          _findNext();
      }
  }
  /**
   * Wrapper for findPrev function
   *
   * @returns {Promise}
   */
  findPrev() {
      selectedTmp = clone(selected);
      return _findPrev();
  }

  /**
   * Get found count
   *
   * @returns {Number}
   */
  foundCount() {
      return foundCount || 0;
  }

  /**
   * Get or change current selection number
   *
   * @param {Number} diff
   * @returns {Number}
   */
  currentNumber(diff) {
    return _currentNumber(diff);
  }
}

textLayerService.$inject = ['$q', 'ya.pdf.communicationService', 'ya.pdf.documentService', 'ya.pdf.renderQueueService'];

export { textLayerService }
