import { isObject, isArray, isString } from 'lodash';

let $q;
let communicationService;
let documentService;

/**
 * @type Object
 */
let pagesRefCache;
/**
 * @type Array
 */
let outline;

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
    var pageNumber = isObject(destRef) ?
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

/**
 * @ngdoc service
 * @name ya.pdf.outlineService
 *
 * @description Service for work with outline
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
class outlineService {
  constructor(_$q_, _communicationService_, _documentService_) {
    $q = _$q_;
    communicationService = _communicationService_;
    documentService = _documentService_;
  }

  /**
   * Initialize service
   */
  initialize() {
      this.cleanup();
      return this.getOutline();
  }

  /**
   * Cleanup service
   */
  cleanup() {
      pagesRefCache = [];
      outline = null;
  }

  /**
   * Get outline of document
   *
   * @returns {Promise.<Array>}
   */
  getOutline() {
      return outline ? $q.resolve(outline) : _getOutline();
  }

  /**
   * Go to selected destination
   *
   * @param {String|Object} dest
   */
  navigateTo(dest) {
      /**
       * @type Promise
       */
      var destPromise;

      if (isString(dest)) {
          destPromise = documentService.getDestination(dest);
      } else {
          destPromise = $q.resolve(dest);
      }

      destPromise.then(function (destination) {
          if (!isArray(destination)) {
              return;
          }
          _goToDestination(destination, destination[0]);
      })
  }
}

outlineService.$inject = ['$q', 'ya.pdf.communicationService', 'ya.pdf.documentService'];

export { outlineService }
