import { forEach } from 'lodash';
import * as services from './services/index';
import * as directives from './directives/index';

function registerTemplates($templateCache) {
  forEach(directives.templates, (template, name) => {
    $templateCache.put(name, template);
  });
}

/**
 * @author asborisov
 * @version 1.0
 *
 * @name ya.pdf
 *
 * @description
 *
 */
angular.module('ya.pdf', [])

    .service('ya.pdf.communicationService', services.communicationService)
    .service('ya.pdf.documentService', services.documentService)
    .service('ya.pdf.outlineService', services.outlineService)
    .service('ya.pdf.renderQueueService', services.renderQueueService)
    .service('ya.pdf.textLayerService', services.textLayerService)
    .service('ya.pdf.thumbnailService', services.thumbnailService)
    .service('ya.pdf.viewerService', services.viewerService)

    .directive('yaPdfOutline', directives.yaPdfOutline)
    .directive('yaPdfPageNumber', directives.yaPdfPageNumber)
    .directive('yaPdfToolbar', directives.yaPdfToolbar)
    .directive('yaPdfViewer', directives.yaPdfViewer)

    .run(['$templateCache', registerTemplates])

    .constant('ya.pdf.config', {
        classes: {
            thumbnails: '__thumbnails',
            fullScreen: '__full',
            hidden: '__hidden',

            container: 'ya-pdf-container',
            thumbnailsContainer: 'ya-pdf-thumbnailsContainer',
            thumbPageNumber: 'ya-pdf-thumbnail-pageNumber',
            pagesContainer: 'ya-pdf-pagesContainer',
            pageContainer: 'ya-pdf-pageContainer',
            textContainer: 'ya-pdf-textContainer',
            outlineContainer: 'ya-pdf-outlineContainer',
            pageNumber: 'ya-pdf-pageNumber',
            toolbar: 'ya-pdf-toolbar'
        },
        zoomStep: 0.2,
        maxAutoZoom: 1.25,
        thumbnailScale: 0.5,
        maxDisplayedPage: 9
    });
