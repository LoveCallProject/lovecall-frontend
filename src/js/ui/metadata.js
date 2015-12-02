/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('../provider/choreography');


var mod = angular.module('lovecall/ui/metadata', [
    'lovecall/provider/choreography'
]);

mod.controller('MetadataController', function($scope, $log, Choreography) {
  $log = $log.getInstance('MetadataController');

	$scope.title = '';
  $scope.artist = '';
  $scope.album = '';


  $scope.$on('audio:unloaded', function(e) {
    $scope.title = '';
    $scope.artist = '';
    $scope.album = '';
  });


  $scope.$on('audio:loaded', function(e) {
    var songMetadata = Choreography.getSongMetadata();
    $scope.title = songMetadata.ti;
    $scope.artist = songMetadata.ar;
    $scope.album = songMetadata.al;
  });


  $log.debug('$scope', $scope);
});
/* @license-end */
