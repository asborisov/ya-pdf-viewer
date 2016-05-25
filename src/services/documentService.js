let PDFJS;
let $q;
/**
 * Available document states
 * @type {{UNKNOWN: number, INITED: number, LOADED: number}}
 */
const states = {
    UNKNOWN: 0,
    INITED: 1,
    LOADED: 2
};
/**
 * @type {{}}
 */
let pdfDocument = null;
/**
 * @type {String}
 */
let documentUrl = null;
/**
 * @type {Number}
 */
let pagesCount = null;
/**
 * Default state
 * @type {Number}
 */
let currentState = states.UNKNOWN;

/**
 * External functions wrapper. Check current document state
 *
 * @param {Function} func
 * @returns {Function}
 */
function wrapper(func) {
    return (...args) => {
        if (currentState != states.LOADED) {
            return $q.reject('Document is not loaded');
        }
        return func.apply(this, args);
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
        .then((pageData) => pageData.getViewport(scale));
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

 /**
  * @ngdoc service
  * @name ya.pdf.documentService
  *
  * @description Service for access to pdf document
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
class documentService {
  /**
   * Costructor
   * @param {{}} $window
   * @param {{}} $q
   */
  constructor(_$window_, _$q_) {
    if (!_$window_.PDFJS) {
        throw "PDFJS is not defined";
    }
    PDFJS = _$window_.PDFJS;
    $q = _$q_;
  }

  /**
   * Initialize service
   *
   * @param {String} url
   * @param {Function} onLoadProgress
   * @returns {Promise}
   */
  initialize(url) {
      this.cleanup();
      if (url) {
          currentState = states.INITED;
          documentUrl = url;
          return PDFJS.getDocument(documentUrl)
              .then(_pdfDocument_ => {
                  pdfDocument = _pdfDocument_;
                  currentState = states.LOADED;
                  pagesCount = pdfDocument.numPages;
                  return $q.resolve();
              }, error => $q.reject(error));
      } else {
          return $q.reject('ya.pdf.documentService: No url passed');
      }
  }

  /**
   * Cleanup main service and all sub-services
   * Set variables to default
   */
  cleanup() {
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
  getPagesCount() {
      return pagesCount || 0;
  }
  /**
   * Get URL of current document
   *
   * @returns {String}
   */
  getUrl() {
      return documentUrl;
  }

  get getPageData() {
    return wrapper(getPage);
  }

  get getPageViewport() {
    return wrapper(getPageViewport);
  }

  get getDestination() {
    return wrapper(getDestination);
  }

  get getOutline() {
    return wrapper(getOutline);
  }

  get getPageIndex() {
    return wrapper(getPageIndex);
  }
}

documentService.$inject = ['$window', '$q'];

export { documentService }
