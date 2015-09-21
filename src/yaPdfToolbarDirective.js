(function () {
	'use strict';
	angular.module('ya.pdf')
		.run(['$templateCache', onDirectiveRun])
	/**
	 * @ngdoc directive
	 * @name yaPdfToolbar
	 *
	 * @author Артём
	 * @version 1.0
	 *
	 * @param delegateHandle {string} Имя делегата для связи с просмотрщиком
	 * @param [templateUrl] {string} Ссылка на шаблон панели
	 *
	 * @description
	 * Директива для туллбара управления директивой wsPdfViewer.
	 * Связь осуществляется через именованный делегат
	 *
	 * @restrict E
	 *
	 */
		.directive('yaPdfToolbar', ['$timeout', 'wsPdfDelegate', yaPdfToolbar]);

	/**
	 * Добавляем дефолтный шаблон нанельки навигации по документу к templateCache
	 */
	function onDirectiveRun($templateCache) {
		$templateCache.put('yaPdfToolbarTemplate.html',
			'<div>' +
			'<div class="btn-group pdf-arrow">' +
			'<i class="fa fa-arrow-left fa-lg advanced-input-icon" ng-click="prev()"></i>' +
			'<i class="fa fa-arrow-right fa-lg advanced-input-icon" ng-click="next()"></i>' +
			'<i class="fa fa-search-minus fa-lg advanced-input-icon" ng-click="zoomOut()"></i>' +
			'<i class="fa fa-search-plus fa-lg advanced-input-icon" ng-click="zoomIn()"></i>' +
			'</div>' +
			'<div class="btn-group">' +
			'<input type="text" class="form-control pdf-current-page" min=1 ng-model="currentPage" ng-change="goToPage()"> / {{pageCount()}}' +
			'</div>' +
			'</div>')
	}

	/**
	 * Функция для получения директивы yaPdfToolbar
	 * @param $timeout
	 * @param wsPdfDelegate
	 * @returns {{restrict: string, scope: {delegateHandle: string}, templateUrl: Function, controller: *[]}}
	 */
	function yaPdfToolbar($timeout, wsPdfDelegate) {
		return {
			restrict: 'E',
			scope: {
				/**
				 * Имя делегата для связи с просмотрщиком
				 */
				delegateHandle: '@'
			},
			templateUrl: function (element, attr) {
				return attr.templateUrl || 'yaPdfToolbarTemplate.html';
			},
			controller: ['$scope', function ($scope) {
				/**
				 * Текущая страницу
				 * @type {number}
				 */
				$scope.currentPage = 1;
				/**
				 * Текущий масштаб
				 */
				$scope.scale = 1;
				/**
				 * Кол-во страниц
				 * @type {number}
				 */
				$scope.pagesCountValue = 0;

				$scope.prev = goPrevious;
				$scope.next = goNext;
				$scope.zoomIn = zoomIn;
				$scope.zoomOut = zoomOut;
				$scope.setScale = setScale;
				$scope.goToPage = goToSelectedPage;
				$scope.pageCount = getPageCount;

				$scope.init = init;

				/**
				 * Инициализация
				 */
				function init() {
					getScale();
				}

				/**
				 * Переход на предыдущую страницу
				 */
				function goPrevious() {
					if ($scope.currentPage > 1) {
						$scope.currentPage--;
						goToPage($scope.currentPage);
					}
				}

				/**
				 * Переход на следующую страницу
				 */
				function goNext() {
					if ($scope.currentPage && $scope.currentPage < $scope.pagesCountValue) {
						$scope.currentPage++;
						goToPage($scope.currentPage);
					}
				}

				/**
				 * Переход на определенную страницу
				 */
				function goToSelectedPage() {
					goToPage($scope.currentPage);
				}

				/**
				 * Переход на выбранную страницу
				 * @param page Номер страницы
				 */
				function goToPage(page) {
					// Проверяем что такая страница есть
					if (page && parseInt(page) && page <= $scope.pagesCountValue && page > 0) {
						wsPdfDelegate.$getByHandle($scope.delegateHandle).goToPage(page);
					}
				}

				/**
				 * Получаем кол-во страниц
				 * @returns {number}
				 */
				function getPageCount() {
					$scope.pagesCountValue = wsPdfDelegate.$getByHandle($scope.delegateHandle).getPageCount();
					return $scope.pagesCountValue;
				}

				/**
				 * Приближение
				 */
				function zoomIn() {
					$scope.scale = wsPdfDelegate.$getByHandle($scope.delegateHandle).zoomIn();
				}

				/**
				 * Отдаление
				 */
				function zoomOut() {
					$scope.scale = wsPdfDelegate.$getByHandle($scope.delegateHandle).zoomOut();
				}

				/**
				 * Синхронизировать масштаб.
				 * Таймаут чтобы убедиться в том что вьювер уже есть
				 */
				function getScale() {
					$scope.timeout = $timeout(function () {
						$scope.scale = wsPdfDelegate.$getByHandle($scope.delegateHandle).getCurrentScale();
						$timeout.cancel($scope.timeout);
					}, 500);
				}

				/**
				 * Обновление масштаба
				 */
				function setScale() {
					var scale = parseFloat($scope.scale);
					if (scale > 0 && scale <= 5) {
						$scope.scale = wsPdfDelegate.$getByHandle($scope.delegateHandle).updateScale(scale);
					}
				}
			}],
			link: function (scope) {
				if (scope.delegateHandle) {
					scope.init();
				}
			}
		}
	}
}());