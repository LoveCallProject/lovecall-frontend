/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');


var mod = angular.module('lovecall/ui/frame', []);

mod.factory('FrameManager', function($rootScope, $window, $log) {
  // states
  var frameCallbacks = [];
  var playbackPosMeasure = 0;
  var playbackPosStep = 0;

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

    var i = 0;
    for (; i < frameCallbacks.length; i++) {
      frameCallbacks[i](ts);
    }
  };


  var addFrameCallback = function(callback) {
    frameCallbacks.push(callback);
  };


  var removeFrameCallback = function(callback) {
    var i = 0;
    var found = false;
    for (i = 0; i < frameCallbacks.length; i++) {
      if (frameCallbacks[i] == callback) {
        found = true;
        break;
      }
    }

    if (found) {
      frameCallbacks.splice(i, 1);
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


  var getMeasure = function() {
    return playbackPosMeasure;
  };


  var getStep = function() {
    return playbackPosStep;
  };


  return {
    'addFrameCallback': addFrameCallback,
    'removeFrameCallback': removeFrameCallback,
    'startFrameLoop': startFrameLoop,
    'tickCallback': tickCallback,
    'getMeasure': getMeasure,
    'getStep': getStep,
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
