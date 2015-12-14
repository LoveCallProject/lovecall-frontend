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


  var setSongImage = function(imageBlob) {
    if (!imageBlob) {
      $scope.songImage = 'none';
      return;
    }

    var url = $window.URL || $window.webkitURL;
    $scope.songImage = 'url(' + url.createObjectURL(imageBlob) + ')';
  };


  $scope.$on('audio:unloaded', function(e) {
    $scope.title = '';
    $scope.artist = '';
    $scope.album = '';
    setSongImage(null);
  });


  $scope.$on('audio:loaded', function(e) {
    var songMetadata = Choreography.getSongMetadata();
    $scope.title = songMetadata.ti;
    $scope.artist = songMetadata.ar;
    $scope.album = songMetadata.al;
  });


  $scope.$on('song:imageLoaded', function(e, imageBlob) {
    setSongImage(imageBlob);
  });


  $log.debug('$scope', $scope);
});
/* @license-end */
