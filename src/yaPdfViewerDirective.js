(function () {
	'use strict';
	angular.module('ya.pdf')
	/**
	 * @ngdoc directive
	 * @name yaPdfViewer
	 *
	 * @author Артём
	 * @version 1.0
	 *
	 * @param delegateHandle {string} Имя делегата для связи с туллбаром
	 * @param pdfUrl {string} Ссылка на pdf-документ
	 * @param [startPage] {number} Номер страницы, которая будет отрисована первой
	 * @param [maxWidth] {number} Максимальная ширина viewer-а
	 * @param [maxHeight] {number} Максимальная высота viewer-а
	 * @param [startScale] {float} Начальный масштаб
	 * @param [onLoaded] {function} Функция которая будет вызвана после получения документа. function()
	 * @param [onError] {function} Функция которая будет вызвана при ошибке загрузки. function(error {object} Ошибка PDFJS)
	 * @param [onProgress] {function} Функция которая будет вызываться по мере загрузки файла. function(loaded {number} Загружено байт, total {number} Всего байт)
	 * @param [onPageRendered] {function} Функция, которая будет вызываться после того как отрисована очередная страница. function(page {number} Номер загруженной страницы)
	 *
	 * @description
	 * Pdf viewer window
	 *
	 * @restrict E
	 *
	 */
		.directive('yaPdfViewer', ['yaPdfDelegate', yaPdfViewer]);

	/**
	 * @param yaPdfDelegate
	 * @returns {{restrict: string, template: string, scope: {delegateHandle: string, pdfUrl: string, startPage: string, startScale: string, onLoaded: string, onProgress: string, onError: string, onPageRendered: string}, controller: *[], link: Function}}
	 */
	function yaPdfViewer(yaPdfDelegate) {
		var canvas = null;
		return {
			restrict: 'E',
			template: '<div style="overflow: auto"><canvas></canvas></div>',
			scope: {
				// Делегат для связывания с тулбаром
				delegateHandle: '@',
				// Ссылка на PDF
				pdfUrl: '@',
				// С какой страницы наичнвать отрисовку
				startPage: '@',
				// Масштаб
				startScale: '=',
				// function()
				onLoaded: '&',
				// function(error)
				onError: '&',
				// function(loaded, total)
				onProgress: '&',
				// function(page)
				onPageRendered: '&'
			},
			controller: ['$scope', function ($scope) {
				// Регистрируем делегат для обработки вызовов из тулбара
				var registeredInstance = yaPdfDelegate._registerInstance($scope, $scope.delegateHandle);
				$scope.$on('$destroy', registeredInstance);

				$scope.pdfDoc = null;
				$scope.scale = $scope.startScale > 0 ? $scope.startScale : 1.0;

				$scope.goToPage = queueRenderPage;
				$scope.goPrevious = renderPrevious;
				$scope.goNext = renderNext;
				$scope.zoomIn = renderZoomIn;
				$scope.zoomOut = renderZoomOut;
				$scope.updateScale = renderScale;
				$scope.getPageCount = getPageCount;
				$scope.getCurrentPage = getPage;
				$scope.getCurrentScale = getScale;

				$scope.init = init;

				/**
				 * Инициализация
				 */
				function init() {
					if (!$scope.pdfUrl) return;
					// Флаг того что страница рендерится
					$scope.pageRendering = false;
					// Есть ли стартовая страница
					$scope.pageNum = ($scope.startPage ? $scope.startPage : 1);

					PDFJS.disableWorker = true;
					PDFJS.getDocument($scope.pdfUrl, null, null, loadingProgress)
						.then(function (_pdfDoc) {
							if (typeof $scope.onLoaded === 'function') {
								$scope.onLoaded();
							}
							$scope.pdfDoc = _pdfDoc;
							queueRenderPage($scope.pageNum);
							$scope.$apply(function () {
								$scope.pageCount = _pdfDoc.numPages;
							});
						}, function (error) {
							if (error) {
								if (typeof $scope.onError === 'function') {
									$scope.onError({error: error});
								}
							}
						}
					);
				}

				/**
				 * Вывод процесса загрузки
				 * @param progress
				 */
				function loadingProgress(progress) {
					if ($scope.onProgress) {
						$scope.onProgress({loaded: progress.loaded, total: progress.total});
					}
				}

				/**
				 * Отрисовываем страницу
				 * @param {number} pageNumber
				 */
				function renderPage(pageNumber) {
					// Ставим флаг того что отрисовываем
					$scope.pageRendering = true;
					// Тащим страницу
					$scope.pdfDoc.getPage(pageNumber).then(function (page) {
						var ctx = canvas.getContext('2d');
						var viewport = page.getViewport($scope.scale);
						canvas.height = viewport.height;
						canvas.width = viewport.width;

						var renderContext = {
							canvasContext: ctx,
							viewport: viewport
						};

						page.render(renderContext).promise.then(function () {
							// Ставим текущую страницу
							$scope.pageNum = pageNumber;
							// Говорим что уже ничего не грузится
							$scope.pageRendering = false;
							// Отпуливаем callback что страница отрисовалась
							if ($scope.onPageRendered) {
								$scope.onPageRendered({page: $scope.pageNum});
							}
							// Если в очереди есть ещё файл
							if ($scope.pageNumPending) {
								// Отрисовываем следующую страницу
								renderPage($scope.pageNumPending);
								$scope.pageNumPending = null;
							}
						});
					});
				}

				/**
				 * Если рендеринг другой страницы уже в прогрессе, то следующей отрисовываем нашу.
				 * В противном случае отрисовываем сразу
				 * @param {number} pageNumber Номер страницы, которую хотим отобразить
				 */
				function queueRenderPage(pageNumber) {
					pageNumber = parseInt(pageNumber);
					if ($scope.pageRendering) {
						$scope.pageNumPending = pageNumber;
					} else {
						renderPage(pageNumber);
					}
				}

				/**
				 * Перейти на предыдущуб страницу
				 */
				function renderPrevious() {
					if ($scope.pageNum <= 1) {
						return;
					}
					queueRenderPage(parseInt($scope.pageNum) - 1);
				}

				/**
				 * Перейти на следующую страницу
				 */
				function renderNext() {
					if ($scope.pageNum >= pdfDoc.numPages) {
						return;
					}
					queueRenderPage(parseInt($scope.pageNum) + 1);
				}

				/**
				 * Приблизить
				 * @returns {float} Текущий масштаб
				 */
				function renderZoomIn() {
					var targetSize = parseFloat($scope.scale) + 0.2;
					if (targetSize <= 5.01) {
						$scope.scale = targetSize;
						queueRenderPage($scope.pageNum);
					}
					return $scope.scale;
				}

				/**
				 * Отдалить
				 * @returns {float} Текущий масштаб
				 */
				function renderZoomOut() {
					var targetSize = parseFloat($scope.scale) - 0.2;
					if (targetSize > 0.01) {
						$scope.scale = targetSize;
						queueRenderPage($scope.pageNum);
					}
					return $scope.scale;
				}

				/**
				 * Отрисовать с определенным масштабом
				 * @param scale
				 * @returns {float} Текущий масштаб
				 */
				function renderScale(scale) {
					$scope.scale = parseFloat(scale);
					queueRenderPage($scope.pageNum);
					return $scope.scale;
				}

				/**
				 * Кол-во страниц в файле
				 * @returns {number}
				 */
				function getPageCount() {
					return $scope.pageCount || 0;
				}

				/**
				 * Текущая страница
				 * @returns {number}
				 */
				function getPage() {
					return $scope.pageNum;
				}

				/**
				 * Текущий масштаб
				 * @returns {float}
				 */
				function getScale() {
					return $scope.scale;
				}
			}],
			link: function (scope, element, attrs) {
				attrs.$observe('pdfUrl', function (url) {
					if (url) {
						scope.init();
					}
				});
				// Канвас в который вставляем документ
				canvas = element.find('canvas')[0];

				if (attrs.maxWidth) {
					attrs.$observe('maxWidth', function (maxWidth) {
						setDivParam('width', maxWidth);
					});
				}

				scope.$watch(function () {
					return element.css('max-width');
				}, function (newValue, oldValue) {
					if (newValue != oldValue) {
						setDivParam('width', newValue);
					}
				});

				function setDivParam(param, value) {
					var div = element.find('div')[0];
					element.find(div).css(param, value);
				}
			}
		};
	}
}());