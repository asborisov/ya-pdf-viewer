let $q;
let communicationService;
let config;

/**
 * List of displaying pages
 * @type {Array}
 */
let renderedPages = [];
/**
 * List of rendered pages
 * @type {Array}
 */
let createdPages = [];
/**
 * Count of pages in document
 * @type {Number}
 */
let pagesCount = 0;

/**
 * Get queue of pages to render
 *
 * @param {Number} targetPageNumber
 * @return {Array}
 * @private
 */
function _getQueueBasedOnTargetPage(targetPageNumber) {
    const t = [];
    for (let i = targetPageNumber - 4; i <= targetPageNumber + 4; i++) {
        if (i > 0 && i <= pagesCount) {
            t.push(i);
        }
    }
    return t;
}

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
class renderQueueService {
  constructor(_$q_, _communicationService_, _config_) {
    $q = _$q_;
    communicationService = _communicationService_;
    config = _config_;
  }

  /**
   * Cleanup service
   */
  cleanup() {
      renderedPages = [];
  }

  /**
   * Initialize service
   *
   * @param {Number} _pagesCount_
   */
  initialize(_pagesCount_) {
      this.cleanup();
      pagesCount = _pagesCount_;
  }

  /**
   * Set current page
   *
   * @param {Number} pageNumber
   */
  setPage(pageNumber) {
      const pagesToRender = _getQueueBasedOnTargetPage(pageNumber);
      pagesToRender.forEach(page => {
          if (createdPages.indexOf(page) < 0) {
              createdPages.push(page);
          }
          if (renderedPages.indexOf(page) < 0) {
              renderedPages.push(page);
          }
      });
      communicationService.execute('onPageNeedRender', pagesToRender);
      const pagesToDelete = [];
      let i = 0;
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
      });
  }

  /**
   * Return rendered pages and clear list
   *
   * @returns {Promise.<Array>}
   */
  pagesToClean() {
      const t = createdPages;
      createdPages = [];
      return $q.resolve(t);
  }

  /**
   * Get displaying pages list
   *
   * @returns {Array}
   */
  getRenderedPages() {
      return renderedPages;
  }
}

renderQueueService.$inject = ['$q', 'ya.pdf.communicationService', 'ya.pdf.config'];

export { renderQueueService }
