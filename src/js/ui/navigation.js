/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('angular-material');

require('../../templates/songselector.tmpl.html');

var mod = angular.module('lovecall/ui/navigation', ['ngMaterial']);

mod.controller('NavigationController', function($scope, $mdSidenav, $mdMedia, $mdDialog) {
  $scope.showSide = function() {
    $mdSidenav('sidenav').open();
  };

  $scope.closeSide = function() {
    $mdSidenav('sidenav').close();
  };

	$scope.$mdMedia = $mdMedia;

  $scope.showSongSelector = function(ev) {
    var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
    $mdDialog.show({
      controller: 'SongSelectorController',
      templateUrl: 'songselector.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    }).then(function(answer) {
      // TODO
    }, function() {
      // cancell dialog
      // TODO
    });
  };
});
