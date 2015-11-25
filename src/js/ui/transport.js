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

  // internal states
  var isPlaying = false;
  var playbackPos = 0;
  var prevIsPlaying = true;
  var prevPlaybackPos = -1;


  // actions
  $scope.play = function() {
    AudioEngine.resume();
  };


  $scope.pause = function() {
    AudioEngine.pause();
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
      $scope.$digest();
    }

    prevIsPlaying = isPlaying;
    prevPlaybackPos = playbackPos;
  };


  FrameManager.addFrameCallback(transportFrameCallback);

  $log.debug('$scope=', $scope);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
