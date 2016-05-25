/**
 * @ngdoc directive
 * @name yaPdfPageNumber
 *
 * @author asborisov
 * @version 1.0
 *
 * @description
 * We need it to force update value when viewerService inform us about it
 *
 * @restrict A
 *
 */
export default function yaPdfPageNumber($parse, communicationService) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: (scope, element, attrs, ngModel) => {
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

yaPdfPageNumber.$inject = ['$parse', 'ya.pdf.communicationService'];
