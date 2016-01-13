/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var _ = require('lodash');

require('angular');
require('angular-material');

require('../provider/font-selector');


var mod = angular.module('lovecall/ui/song-selector', [
    'ngMaterial',
    'lovecall/provider/choreography',
    'lovecall/provider/font-selector',
]);

mod.controller('SongSelectorController', function($scope, $mdDialog, Choreography, FontSelector) {

  var init = function() {
    var songs = Choreography.getAvailableSongs();
    var fontFamilies = _(songs)
      .map('lang')
      .uniq()
      .transform(function(result, v) {
        result[v] = FontSelector.fontFamilyForLanguage(v);
      }, {})
      .value();

    $scope.songs = songs;
    $scope.fontFamilies = fontFamilies;
  };

  $scope.close = function() {
    $mdDialog.cancel();
  }

  $scope.answer = function(answer) {
    $mdDialog.hide(answer);
  }

  init();
});
