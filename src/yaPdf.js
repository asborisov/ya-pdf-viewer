(function () {
	'use strict';
	angular.module('ya.pdf', [])
		// Methods which yaPdfViewer delegate to external services
		.service('yaPdfDelegate', delegateService([
			'goToPage',
			'goPrevious',
			'goNext',
			'zoomIn',
			'zoomOut',
			'updateScale',
			'getPageCount',
			'getCurrentPage',
			'getCurrentScale'
		]));
}());
