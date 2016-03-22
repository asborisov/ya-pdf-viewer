(function () {
    'use strict';

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
})();