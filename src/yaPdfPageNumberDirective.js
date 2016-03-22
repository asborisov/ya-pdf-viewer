(function () {
    'use strict';
    angular.module('ya.pdf')
    /**
     * @ngdoc directive
     * @name yaPdfPageNumber
     *
     * @author asborisov
     * @version 1.0
     *
     * @description
     * Директива для слежением за текущей страницей
     *
     * @restrict A
     *
     */
        .directive('yaPdfPageNumber', yaPdfPageNumber);

    yaPdfPageNumber.$inject = ['$parse', 'ya.pdf.communicationService'];

    /**
     * We need it to force update value when viewerService inform us about it
     * @param $parse
     * @param communicationService
     * @returns {{restrict: string, require: string, link: Function}}
     */
    function yaPdfPageNumber($parse, communicationService) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                communicationService.register({
                    onPageChanged: onPageChanged
                });

                function onPageChanged(page) {
                    ngModel.$setViewValue(page);
                    $parse(attrs.ngModel).assign(scope, page);
                    ngModel.$render();
                }
            }
        }
    }
})();