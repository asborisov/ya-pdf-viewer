(function () {
    'use strict';
    angular.module('ya.pdf')
        .run(['$templateCache', onDirectiveRun])
    /**
     * @ngdoc directive
     * @name yaPdfOutline
     *
     * @author asborisov
     * @version 1.0
     *
     * @param [templateUrl] {string} Ссылка на шаблон панели
     *
     * @description
     * Директива для содержания документа
     *
     * @restrict E
     */
        .directive('yaPdfOutline', yaPdfOutline);

    /**
     * Добавляем дефолтный шаблон нанельки навигации по документу к templateCache
     */
    function onDirectiveRun($templateCache) {
        $templateCache.put('yaPdfOutlineItem',
            '<div ng-click="navigateTo(line.dest)" >{{line.title}}</div>' +
            '<ul ng-if="line.items && line.items.length">' +
            '<li ng-repeat="line in line.items" ng-include="\'yaPdfOutlineItem\'">' +
            '</ul>');

        $templateCache.put('yaPdfOutlineTemplate.html',
            '<div>' +
            '<ul>' +
            '<li ng-repeat="line in outline" ng-include="\'yaPdfOutlineItem\'"></li>' +
            '</ul>' +
            '</div>');
    }

    yaPdfOutline.$inject = ['ya.pdf.communicationService', 'ya.pdf.viewerService', 'ya.pdf.config'];

    /**
     * Функция для получения директивы yaPdfOutline
     * @returns {{restrict: string, templateUrl: Function, link: Function}}
     */
    function yaPdfOutline(communicationService, viewerService, config) {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: function (element, attr) {
                return attr.templateUrl || 'yaPdfOutlineTemplate.html';
            },
            link: function (scope, element) {
                /**
                 * @type {viewerService.navigateTo}
                 */
                scope.navigateTo = viewerService.navigateTo;
                /**
                 * @type {boolean}
                 */
                scope.disabled;

                init();
                /**
                 * Initialize directive
                 */
                function init() {
                    scope.disabled = true;
                    communicationService.register({
                        onDocumentLoaded: getOutline
                    });
                }

                /**
                 * Get outline from viewerService
                 */
                function getOutline() {
                    viewerService.getOutline()
                        .then(function(outline) {
                            if (!outline || !outline.length) {
                                angular.element(element).addClass(config.classes.hidden);
                                scope.outline = [];
                            } else {
                                scope.outline = outline;
                            }
                        });
                }
            }
        }
    }
})();