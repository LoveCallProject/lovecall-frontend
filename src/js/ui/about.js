/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('angular-material');

require('../conf');


var mod = angular.module('lovecall/ui/about', [
    'ngMaterial',
    'lovecall/conf',
]);

mod.controller('AboutDialogController', function($scope, $mdDialog, LCConfig) {
  $scope.version = LCConfig.VERSION + ' (' + LCConfig.HASH + ')';

  $scope.contributors = [
    {
      name: 'xen0n'
    },
    {
      name: 'disoul'
    }
  ]

  $scope.close = function() {
    $mdDialog.cancel();
  }
});
