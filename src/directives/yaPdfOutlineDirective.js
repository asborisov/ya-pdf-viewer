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
export default function yaPdfOutline(communicationService, viewerService, config) {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: (element, attr) => (attr.templateUrl || 'yaPdfOutlineTemplate.html'),
        link: (scope, element) => {
            /**
             * @type {viewerService.navigateTo}
             */
            scope.navigateTo = viewerService.navigateTo;
            /**
             * @type {boolean}
             */
            scope.disabled = true;
            /**
             * Register document load event listener
             */
            communicationService.register({
                onDocumentLoaded: getOutline
            });

            /**
             * Get outline from viewerService
             */
            function getOutline() {
                viewerService.getOutline()
                    .then(outline => {
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

yaPdfOutline.$inject = ['ya.pdf.communicationService', 'ya.pdf.viewerService', 'ya.pdf.config'];

export const templates = {
  'yaPdfOutlineItem':
      '<div ng-click="navigateTo(line.dest)" >{{line.title}}</div>' +
      '<ul ng-if="line.items && line.items.length">' +
      '<li ng-repeat="line in line.items" ng-include="\'yaPdfOutlineItem\'">' +
      '</ul>',

  'yaPdfOutlineTemplate.html':
      '<div>' +
      '<ul>' +
      '<li ng-repeat="line in outline" ng-include="\'yaPdfOutlineItem\'"></li>' +
      '</ul>' +
      '</div>'
}
