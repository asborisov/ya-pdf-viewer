import { assign } from 'lodash'
import * as yaPdfOutlineDirective from './yaPdfOutlineDirective';
import * as yaPdfPageNumberDirective from './yaPdfPageNumberDirective';
import * as yaPdfToolbarDirective from './yaPdfToolbarDirective';
import * as yaPdfViewerDirective from './yaPdfViewerDirective';
// Collect all templates to separated object
const templates = assign({},
  yaPdfOutlineDirective.templates || {},
  yaPdfPageNumberDirective.templates || {},
  yaPdfToolbarDirective.templates || {},
  yaPdfViewerDirective.templates || {});
// From directives we need only defaults - directives functions
const yaPdfOutline = yaPdfOutlineDirective.default;
const yaPdfPageNumber = yaPdfPageNumberDirective.default;
const yaPdfToolbar = yaPdfToolbarDirective.default;
const yaPdfViewer = yaPdfViewerDirective.default;

export {
  yaPdfOutline,
  yaPdfPageNumber,
  yaPdfToolbar,
  yaPdfViewer,
  templates
}
