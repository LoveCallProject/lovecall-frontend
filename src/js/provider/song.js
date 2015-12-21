/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */

'use strict';

require('angular');
require('angular-material');

var SparkMD5 = require('spark-md5');

require('../conf');
require('../../templates/song-loading.tmpl.html');


var mod = angular.module('lovecall/provider/song', [
    'lovecall/conf',
    'lovecall/provider/choreography',
    'lovecall/engine/audio'
]);

mod.factory('Song', function($rootScope, $http, $mdDialog, $log, LCConfig, Choreography, AudioEngine) {
  $log = $log.getInstance('Song');

  var songBuffer = null;
  var songHash = null;
  var songStatus = 'unloaded';


  // not used for now, but may have its use after supporting local music files
  var makeSongImage = function(buffer, mime) {
    return new Blob([new Uint8Array(buffer)], { type: mime || 'image/jpeg' });
    // someone do $rootScope.$broadcast('song:imageLoaded', songImage); plz
  };


  var loadSuccessCallbackFactory = function(idx, basename) {
    return function(response) {
      $log.debug('load success:', response);

      songStatus = 'loaded';
      songBuffer = response.data;
      songHash = 'md5:' + SparkMD5.ArrayBuffer.hash(response.data).toLowerCase();

      hideLoadingDialog(false);

      Choreography.load(idx, songHash);
      AudioEngine.setSourceData(response.data);
      AudioEngine.initEvents(Choreography.getTempo());

      // cover art
      loadCoverArt(basename);

      //successCallback && successCallback(idx, songHash, response.data);
    };
  };


  var loadErrorCallbackFactory = function(errorCallback) {
    songStatus = 'errored';

    return function(response) {
      hideLoadingDialog(true);
      errorCallback && errorCallback(response);
    };
  };


  var showLoadingDialog = function() {
    $mdDialog.show({
      controller: 'SongLoadingController',
      templateUrl: 'song-loading.tmpl.html',
      parent: angular.element(document.body),
      clickOutsideToClose: false
    });
  };


  var hideLoadingDialog = function(errored) {
    $rootScope.$broadcast('song:hideLoadingDialog', errored);
  };


  var load = function(idx, basename, successCallback, errorCallback) {
    $log.debug('load request: idx', idx, 'basename', basename);

    songStatus = 'loading';

    showLoadingDialog();
    $http({
      method: 'GET',
      url: LCConfig.REMOTE_MUSIC_PREFIX + basename + '.' + AudioEngine.getPreferredFormat(),
      headers: {
        'Content-Type': undefined
      },
      responseType: 'arraybuffer'
    }).then(loadSuccessCallbackFactory(idx, basename), errorCallback);
  };


  var loadCoverArt = function(basename) {
    // TODO: support other formats?
    var coverArtUrl = LCConfig.REMOTE_COVER_ART_PREFIX + basename + '.jpg';
    $rootScope.$broadcast('song:remoteCoverArtRequest', coverArtUrl);
  };


  var getStatus = function() {
    return songStatus;
  };


  return {
    'load': load,
    'getStatus': getStatus
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
