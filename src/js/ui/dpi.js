/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');


var mod = angular.module('lovecall/ui/dpi', []);

mod.factory('DPIManager', function($window, $log) {
  $log = $log.getInstance('DPIManager');

  var devicePixelRatio = $window.devicePixelRatio || 1;
  var canvasBackingStoreRatio = (function() {
    var testCanvas = document.createElement('canvas');
    var ctx = testCanvas.getContext('2d');
    var result = (
        ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio ||
        1
        );
    testCanvas = null;
    return result;
  })();

  var ratio = devicePixelRatio / canvasBackingStoreRatio;


  var scaleCanvas = function(canvas, ctx, w, h) {
    canvas.width = w * ratio;
    canvas.height = h * ratio;

    if (devicePixelRatio !== canvasBackingStoreRatio) {
      ctx.resetTransform();
      ctx.scale(ratio, ratio);
    }
  };


  $log.info(
      'devicePixelRatio',
      devicePixelRatio,
      'canvasBackingStoreRatio',
      canvasBackingStoreRatio
      );

  return {
    devicePixelRatio: devicePixelRatio,
    canvasBackingStoreRatio: canvasBackingStoreRatio,
    ratio: ratio,
    scaleCanvas: scaleCanvas,
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
