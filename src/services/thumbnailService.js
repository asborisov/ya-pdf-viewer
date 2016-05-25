let $q;
let documentService;
let config;
/**
 * Cache of images
 * @type {Object}
 */
let images;

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
            const canvas = angular.element('<canvas></canvas>')[0];
            const ctx = canvas.getContext('2d');
            const viewport = pageData.getViewport(config.thumbnailScale);

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            var renderContext = {
                canvasContext: ctx,
                viewport
            };

            return pageData.render(renderContext).promise
                .then(function() {
                    images[pageIndex] = canvas.toDataURL();
                    return images[pageIndex];
                });
        });
}

/**
 * @ngdoc service
 * @name ya.pdf.thumbnailService
 *
 * @description
 * Service to work with thumbnails
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
class thumbnailService {
  constructor(_$q_, _documentService_, _config_) {
    $q = _$q_;
    documentService = _documentService_;
    config = _config_;
  }

  initialize() {
    images = {};
  }

  cleanup() {
    images = {};
  }

  /**
   * Get thumbnail of selected page
   *
   * @param {Number} pageNumber
   * @returns {Promise}
   */
  getThumbnail(pageNumber) {
      const pageIndex = pageNumber - 1;
      if (images[pageIndex]) {
          return $q.resolve(images[pageIndex]);
      } else {
          return _getPageThumbnail(pageIndex);
      }
  }
}

thumbnailService.$inject = ['$q', 'ya.pdf.documentService', 'ya.pdf.config'];

export { thumbnailService }
