/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('angular-material');

require('../provider/song');

require('../../templates/song-selector.tmpl.html');
require('../../templates/about.tmpl.html');


var mod = angular.module('lovecall/ui/navigation', [
    'ngMaterial',
    'lovecall/provider/song',
    'lovecall/provider/choreography'
]);

mod.controller('NavigationController', function($scope, $mdSidenav, $mdMedia, $mdDialog, $log, Choreography, Song) {
  $log = $log.getInstance('NavigationController');

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
      templateUrl: 'song-selector.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    }).then(function(answer) {
      $log.debug('selected song index', answer);

      var songUrl = Choreography.getSongUrlByIndex(answer);

      // load song via Ajax
      Song.load(answer, songUrl);
    }, function() {
      $log.debug('cancelled song select');
    });
  };

  $scope.showAboutDialog = function(ev) {
    $mdDialog.show({
      controller: 'AboutDialogController',
      templateUrl: 'about.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose: true
    }).then(function(){}, function(){});
  }


  // close navigation drawer when song loading ends
  $scope.$on('song:hideLoadingDialog', function(e, errored) {
    $scope.closeSide();
  });
});
