/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('angular-material');

var mod = angular.module('lovecall/ui/navigation', ['ngMaterial']);

mod.controller('NavigationController', function($scope, $mdSidenav) {
  $scope.showSide = function() {
    $mdSidenav('sidenav').open();
  };

  $scope.closeSide = function() {
    $mdSidenav('sidenav').close();
  };
});
