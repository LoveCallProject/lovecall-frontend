/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('angular-material');

require('../conf');


var mod = angular.module('lovecall/ui/config', [
    'ngMaterial',
    'lovecall/conf',
]);

mod.controller('ConfigDialogController', function($scope, $mdDialog, LCConfig) {
  $scope.bufferSizeOrder = LCConfig.getAudioBufferSizeOrder();
  $scope.useRomaji = LCConfig.isRomajiEnabled();


  $scope.$watch('bufferSizeOrder', function(to, from) {
    if (to === from) {
      return;
    }

    LCConfig.setAudioBufferSizeOrder(to);
  });


  $scope.$watch('useRomaji', function(to, from) {
    if (to === from) {
      return;
    }

    LCConfig.setRomajiEnabled(to);
  });


  $scope.close = function() {
    $mdDialog.cancel();
  }
});
