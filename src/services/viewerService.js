import { isUndefined } from 'lodash';

let $window;
let $q;
let $timeout;
let communicationService;
let documentService;
let renderQueueService;
let textLayerService;
let thumbnailService;
let outlineService;

/**
 * @type Number
 */
let documentScale;
/**
 * @type Number
 */
let currentPage;
/**
 * @type Boolean
 */
let thumbnails;
/**
 * @type {{width: Number, height: Number}}
 */
let lastPageSize = {};

/**
 * @param viewerParams {Object}
 * @param [viewerParams.scale] {Number}
 * @param [viewerParams.page] {Number}
 * @private
 */
function _setParams(viewerParams) {
    if (!isUndefined(viewerParams.scale)) {
        documentScale = viewerParams.scale;
    }
    if (!isUndefined(viewerParams.page)) {
        currentPage = viewerParams.page;
    }
}

/**
 * Notify about document load progress
 * @private
 */
function _onLoadProgress() {
    communicationService.execute('onLoadProgress', arguments);
}

/**
 * @ngdoc service
 * @name ya.pdf.viewerService
 *
 * @description Main viewer service
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
 *  preparePageSize: preparePageSize,
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
class viewerService {
  constructor(_$window_, _$q_, _$timeout_, _communicationService_, _documentService_,
    _renderQueueService_, _textLayerService_, _thumbnailService_, _outlineService_) {
      $window = _$window_;
      $q = _$q_;
      $timeout = _$timeout_;
      communicationService = _communicationService_;
      documentService = _documentService_;
      renderQueueService = _renderQueueService_;
      textLayerService = _textLayerService_;
      thumbnailService = _thumbnailService_;
      outlineService = _outlineService_;
  }

  getPage() {
    return documentService.getPageData.apply(this, arguments);
  }
  getPagesCount() {
    return documentService.getPagesCount.apply(this, arguments);
  }

  getMatchData() {
    return textLayerService.getMatchData.apply(this, arguments);
  }
  findText() {
    return textLayerService.find.apply(this, arguments);
  }
  findPrev() {
    return textLayerService.findPrev.apply(this, arguments);
  }
  currentSelected() {
    return textLayerService.currentNumber.apply(this, arguments);
  }
  foundCount() {
    return textLayerService.foundCount.apply(this, arguments);
  }

  getPageThumbnail() {
    return thumbnailService.getThumbnail.apply(this, arguments);
  }

  getOutline() {
    return outlineService.getOutline.apply(this, arguments);
  }
  navigateTo() {
    return outlineService.navigateTo.apply(this, arguments);
  }

  /**
   * Initialize service
   *
   * @param viewerParams {{}}
   * @param [viewerParams.scale] {Number}
   * @param [viewerParams.page] {Number}
   * @returns {Promise}
   */
  initialize(viewerParams) {
      this.cleanup();
      if (viewerParams) {
          _setParams(viewerParams);
      }
      communicationService.register('onSetPage', this.setPage);
      return $q.resolve();
  }

  /**
   * Cleanup main service and all sub-services
   * Set variables to default
   */
  cleanup() {
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
  getPageNumber() {
      return currentPage;
  }

  set documentScale(value) {
      setScale(value);
  }
  get documentScale() {
      return documentScale;
  }

  /**
   * Open document
   *
   * @param url {String}
   * @return {Promise}
   */
  open(url) {
      if (!url) {
          return $q.reject('ya.pdf.viewerService_open: No url passed');
      }
      return documentService.initialize(url, _onLoadProgress)
          .then(() => {
              renderQueueService.initialize(documentService.getPagesCount());
              textLayerService.initialize();
              thumbnailService.initialize();
              outlineService.initialize()
                  .then(outline => {
                      communicationService.execute('onOutlineDisabled', !outline.length);
                  });
              communicationService.execute('onDocumentLoaded');
              return $q.resolve();
          }, error => {
              communicationService.execute('onDocumentError', error);
              return $q.reject(error);
          });
  }

  /**
   * Get size of all pages
   */
  preparePageSize(scale) {
      scale = scale || 1.0;
      const promises = [];
      for (let i = 1; i <= documentService.getPagesCount(); i++) {
          promises.push(documentService.getPageData(i)
              .then(pageData => {
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
  setPage(pageNumber) {
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
  getPageViewport(pageNumber, scale) {
      return documentService.getPageViewport(pageNumber, scale || documentScale);
  }

  /**
   * Set page size of last rendered page
   * @param {{width: Number, height: Number}} size
   */
  setLastPageSize(size) {
      lastPageSize = size;
  }

  /**
   * Set scale of document
   *
   * @param {Number} scale
   * @param {{width: Number, height: Number}} [containerSizes]
   * @returns {Promise}
   */
  setScale(scale, containerSizes) {
      if (scale == documentScale) {
          return $q.resolve(documentScale);
      }
      if (containerSizes) {
          const pageWidthScale = (containerSizes.width - 5) / lastPageSize.width * documentScale;
          const pageHeightScale = (containerSizes.height - 5) / lastPageSize.height * documentScale;
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
          .then(pagesToClean => {
              // and clean it's content
              communicationService.execute('onPageNeedDelete', pagesToClean, true);
              // set page current page
              return $q.all([this.setPage(currentPage), this.preparePageSize(documentScale)])
                  .then(() => documentScale);
          });
  }

  /**
   * Toggle thumbnails mode and notify
   */
  setThumbnails() {
      thumbnails = !thumbnails;
      communicationService.execute('onThumbnailsToggled', thumbnails);
  }

  /**
   * Black magic to generate download link and click it via service
   *
   * @param {String} addToUrl additional url string params
   */
  downloadDocument(addToUrl) {
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

      $timeout(() => {
          try {
              anchor[0].click();
          } catch (err) {
          }
      }, 0, false);
  }
}

viewerService.$inject = ['$window', '$q', '$timeout', 'ya.pdf.communicationService', 'ya.pdf.documentService',
    'ya.pdf.renderQueueService', 'ya.pdf.textLayerService', 'ya.pdf.thumbnailService', 'ya.pdf.outlineService'];

export { viewerService }
