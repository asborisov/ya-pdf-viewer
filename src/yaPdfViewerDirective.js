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
