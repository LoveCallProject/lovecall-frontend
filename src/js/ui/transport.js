/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('./frame');


var mod = angular.module('lovecall/ui/transport', [
    'lovecall/engine/audio',
    'lovecall/ui/frame'
]);

mod.controller('TransportController', function($scope, $log, AudioEngine, FrameManager) {
  $log = $log.getInstance('TransportController');

  // scope states
  $scope.playbackPos = 0;
  $scope.isPlaying = false;
  $scope.playButtonIcon = 'play_arrow';

  // internal states
  var isPlaying = false;
  var playbackPos = 0;
  var prevIsPlaying = true;
  var prevPlaybackPos = -1;
  var duration = AudioEngine.getDuration();


  // actions
  var play = function() {
    if (duration === 0) {
      duration = AudioEngine.getDuration();
    }
    $scope.playButtonIcon = 'pause';
    AudioEngine.resume();
  };


  var pause = function() {
    $scope.playButtonIcon = 'play_arrow';
    AudioEngine.pause();
  };


  $scope.togglePlay = function() {
    (isPlaying ? pause : play)();
  };


  // frame callback
  var transportFrameCallback = function(ts) {
    isPlaying = AudioEngine.getIsPlaying();
    playbackPos = AudioEngine.getPlaybackPosition();

    if (prevIsPlaying != isPlaying) {
      $scope.isPlaying = isPlaying;
      $scope.$digest();
    }

    // limit update frequency
    if (prevPlaybackPos != playbackPos && Math.abs($scope.playbackPos - playbackPos) >= 500) {
      $scope.playbackPos = playbackPos;
      updateTransport(playbackPos / duration);
      $scope.$digest();
    }

    prevIsPlaying = isPlaying;
    prevPlaybackPos = playbackPos;
  };


  /* canvas */

  var transportCanvas = document.getElementById('transport__canvas');
  var transportCtx = transportCanvas.getContext('2d');
  var prevTransportPos = 0;

  var updateTransport = function(pos) {
    var canvasRect = transportCanvas.getBoundingClientRect();
    var w = canvasRect.width;
    var h = canvasRect.height;
    transportCanvas.width = w;
    transportCanvas.height = h;

    var halfH = h / 2;

    transportCtx.fillStyle = "grey";
    transportCtx.fillRect(0, 0, w, h);

    transportCtx.fillStyle = "red";
    transportCtx.beginPath();
    transportCtx.arc(pos * w, halfH, halfH, 0, 2 * Math.PI);
    transportCtx.fill();
  };

  FrameManager.addFrameCallback(transportFrameCallback);
  updateTransport(0.0);

  $log.debug('$scope=', $scope);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
