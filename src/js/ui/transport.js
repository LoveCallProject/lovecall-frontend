/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('./frame');


var mod = angular.module('lovecall/ui/transport', [
    'lovecall/engine/audio',
    'lovecall/ui/frame'
]);

mod.directive('dragAble', function() {
  return {
    restrict: 'A',
    link: function(scope, el, attrs, controller) {
      angular.element(el).attr("draggable", "true");

      el.bind("dragstart", function(e) {
        e.target.style.opacity = .8;
        console.log('dragstart');
        //TODO
      });

      el.bind("dragend", function(e) {
        console.log('dragend');
        //TODO
      });

      el.bind("drag", function(e) {
        console.log('drag');
        //TODO
      });
    }
  };
});

mod.controller('TransportController', function($scope, $log, AudioEngine, FrameManager) {
  $log = $log.getInstance('TransportController');

  // scope states
  $scope.playbackPos = 0;
  $scope.isPlaying = false;

  // internal states
  var isPlaying = false;
  var playbackPos = 0;
  var prevIsPlaying = true;
  var prevPlaybackPos = -1;
  var duration = AudioEngine.getDuration();


  // actions
  $scope.play = function() {
    if (duration === 0) {
      duration = AudioEngine.getDuration();
    }
    AudioEngine.resume();
  };


  $scope.pause = function() {
    AudioEngine.pause();
  };


  $scope.dropped = function(dragEle, dropEle) {
    var drag = angular.element(dragEle);
    var drop = angular.element(dropEle);

    console.log(drag, drop);
    //TODO
  };


  // frame callback
  var transportFrameCallback = function(ts) {
    isPlaying = AudioEngine.getIsPlaying();
    playbackPos = AudioEngine.getPlaybackPosition();

    if (prevIsPlaying != isPlaying) {
      $scope.isPlaying = isPlaying;
      $scope.$digest();
    }

    if (prevPlaybackPos != playbackPos) {
      $scope.playbackPos = playbackPos;
      updateTransport(playbackPos / duration);
      $scope.$digest();
    }

    prevIsPlaying = isPlaying;
    prevPlaybackPos = playbackPos;
  };


  /* canvas */

  var transportCanvas = document.getElementById('transport');
  var transportCtx = transportCanvas.getContext('2d');

  console.log(transportCanvas.height);
  var updateTransport = function(pos) {
    transportCtx.fillStyle = "grey";
    transportCtx.fillRect(
        0,
        0,
        transportCanvas.width,
        transportCanvas.height
        );

    transportCtx.fillStyle = "red";
    transportCtx.beginPath();
    transportCtx.arc(
        pos * transportCanvas.width,
        transportCanvas.height / 2,
        transportCanvas.height / 2,
        0,
        Math.PI*2
        );
    transportCtx.fill();
  };

  FrameManager.addFrameCallback(transportFrameCallback);

  $log.debug('$scope=', $scope);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
