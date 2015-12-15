/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('angular-material');

var mod = angular.module('lovecall/ui/song-loading', [
    'ngMaterial',
]);

mod.controller('SongLoadingController', function($scope, $mdDialog) {
  $scope.$on('song:hideLoadingDialog', function(e) {
    $mdDialog.hide(null);
  });
});
