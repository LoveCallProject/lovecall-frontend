/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

var mod = angular.module('lovecall/ui/steptime', [
]);

mod.controller('StepTimeController', function($scope, $log) {
  $log = $log.getInstance('StepTimeController');

  // states
  $scope.measure = 0;
  $scope.step = 0;

  $scope.$on('frame:playbackPosMeasure', function(evt, v) {
    $scope.measure = v;
  });

  $scope.$on('frame:playbackPosStep', function(evt, v) {
    $scope.step = v;
  });

  $log.info('$scope=', $scope);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
