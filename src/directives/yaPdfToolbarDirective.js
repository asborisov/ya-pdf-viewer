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
export default function yaPdfToolbar(communicationService, viewerService, config) {
    return {
        restrict: 'E',
        templateUrl: (element, attr) => (attr.templateUrl || 'yaPdfToolbarTemplate.html'),
        link: function (scope, element) {
            // Основной контейнер
            let pdfContainerDiv;
            /**
             * @type {Boolean}
             */
            let fullScreen = false;
            /**
             * @type {Boolean}
             */
            let outline = false;
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

            scope.getCurrentPage = getCurrentPage;

            communicationService.register({
                onDocumentLoaded: documentLoaded,
                onOutlineDisabled: onOutlineDisabled,
                onThumbnailsToggled: toggleThumbnails
            });

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
                    const pageNumber = parseInt(page);
                    viewerService.setPage(pageNumber)
                        .then(pageNumber => {
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
                    .then(newScale => {
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

yaPdfToolbar.$inject = ['ya.pdf.communicationService', 'ya.pdf.viewerService', 'ya.pdf.config'];

export const templates = {
  'yaPdfToolbarTemplate.html':
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
      '</div>'
}
