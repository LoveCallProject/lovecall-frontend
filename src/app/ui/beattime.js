/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

var mod = angular.module('lovecall/ui/beattime', [
]);

mod.controller('BeatTimeController', function($scope, $log) {
  $log = $log.getInstance('BeatTimeController');

  // states
  $scope.measure = 0;
  $scope.beat = 0;

  $scope.$on('frame:playbackPosMeasure', function(evt, v) {
    $scope.measure = v;
  });

  $scope.$on('frame:playbackPosBeat', function(evt, v) {
    $scope.beat = v;
  });

  $log.info('$scope=', $scope);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
