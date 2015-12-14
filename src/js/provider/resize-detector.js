/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
var elementResizeDetector = require('element-resize-detector');


var mod = angular.module('lovecall/provider/resize-detector', [
]);

mod.factory('ResizeDetector', function() {
  return elementResizeDetector();
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
