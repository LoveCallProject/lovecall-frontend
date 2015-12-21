/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('../provider/choreography');


var mod = angular.module('lovecall/ui/metadata', [
    'lovecall/provider/choreography'
]);

mod.controller('MetadataController', function($scope, $window, $log, Choreography) {
  $log = $log.getInstance('MetadataController');

	$scope.title = '';
  $scope.artist = '';
  $scope.album = '';
  $scope.songImage = 'none';

  var metadataImg = document.querySelector('.metadata__image');


  var setCoverArtUrl = function(url) {
    $scope.songImage = 'url(' + url + ')';
  };


  var setSongImage = function(imageBlob) {
    if (!imageBlob) {
      $scope.songImage = 'none';
      return;
    }

    var url = $window.URL || $window.webkitURL;
    setCoverArtUrl(url.createObjectURL(imageBlob));
  };


  $scope.$on('song:remoteCoverArtRequest', function(e, url) {
    $log.debug('using remote cover art', url);
    setCoverArtUrl(url);
  });


  $scope.$on('audio:unloaded', function(e) {
    $scope.title = '';
    $scope.artist = '';
    $scope.album = '';
    setSongImage(null);
  });


  $scope.$on('audio:loaded', function(e) {
    var songMetadata = Choreography.getSongMetadata();
    var tempo = Choreography.getTempo();

    $scope.title = songMetadata.ti;
    $scope.artist = songMetadata.ar;
    $scope.album = songMetadata.al;

    //TODO: change BPM
    var rotateDuration = (tempo.stepToTime(20, 0) - tempo.stepToTime(0, 0)) / 1000;
    metadataImg.style.animationDuration = rotateDuration + 's';
  });

  $scope.$on('audio:resume', function(e) {
    metadataImg.style.animationPlayState = 'running';
  });

  $scope.$on('audio:pause', function(e) {
    metadataImg.style.animationPlayState = 'paused';
  });


  $scope.$on('song:imageLoaded', function(e, imageBlob) {
    setSongImage(imageBlob);
  });


  $log.debug('$scope', $scope);
});
/* @license-end */
