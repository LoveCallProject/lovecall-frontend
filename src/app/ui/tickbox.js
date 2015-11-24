/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

var mod = angular.module('lovecall/ui/tickbox', [
]);

mod.controller('TickBoxController', function($scope) {
  var prevLedIdx = 0;

  $scope.beatActivities = [true, false, false, false];

  $scope.$on('frame:playbackPosBeat', function(evt, v) {
    var newLedIdx = v >> 2;
    $scope.beatActivities[prevLedIdx] = 0;
    $scope.beatActivities[newLedIdx] = 1;
    prevLedIdx = newLedIdx;
  });
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
