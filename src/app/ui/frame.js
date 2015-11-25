/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');


var mod = angular.module('lovecall/ui/frame', []);

mod.factory('FrameManager', function($rootScope, $window, $log) {
  // states
  var playbackPosMeasure = 0;
  var playbackPosStep = 0;
  var prevFrameMeasure = -1;
  var prevFrameStep = -1;

  $log = $log.getInstance('FrameManager');


  var requestAnimFrame = (function(window) {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function(/* function */ callback, /* DOMElement */ element) {
        window.setTimeout(callback, 1000 / 60);
      };
  })($window);


  var frameCallback = function(ts) {
    requestAnimFrame(frameCallback);

    if (prevFrameMeasure != playbackPosMeasure) {
      $rootScope.$broadcast('frame:playbackPosMeasure', playbackPosMeasure);
      $rootScope.$digest();
      prevFrameMeasure = playbackPosMeasure;
    }

    if (prevFrameStep != playbackPosStep) {
      $rootScope.$broadcast('frame:playbackPosStep', playbackPosStep);
      $rootScope.$digest();
      prevFrameStep = playbackPosStep;
    }
  };


  var startFrameLoop = function() {
    $log.info('Starting frame loop with rAF impl', requestAnimFrame);
    requestAnimFrame(frameCallback);
  };


  var tickCallback = function(beat) {
    playbackPosMeasure = beat.m;
    playbackPosStep = beat.s;
  }

  return {
    'startFrameLoop': startFrameLoop,
    'tickCallback': tickCallback
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
