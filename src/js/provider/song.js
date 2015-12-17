/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */

'use strict';

require('angular');
require('angular-material');

var SparkMD5 = require('spark-md5');

// XXX: upstream is broken
var id3 = require('../vendored/id3');

require('../../templates/song-loading.tmpl.html');


var mod = angular.module('lovecall/provider/song', [
    'lovecall/provider/choreography',
    'lovecall/engine/audio'
]);

mod.factory('Song', function($rootScope, $http, $mdDialog, $log, Choreography, AudioEngine) {
  $log = $log.getInstance('Song');

  var songBuffer = null;
  var songUrl = null;
  var songHash = null;
  var songStatus = 'unloaded';


  var id3Callback = function(err, tags) {
    $log.debug('id3Callback: err', err, 'tags', tags);

    var songImage = err ? null : makeSongImage(tags.v2.image.data, tags.v2.image.mime);
    $rootScope.$broadcast('song:imageLoaded', songImage);
  };


  var makeSongImage = function(buffer, mime) {
    return new Blob([new Uint8Array(buffer)], { type: mime || 'image/jpeg' });
  };


  var extractSongImageAsync = function(data) {
    id3({ file: new Blob([data]), type: id3.OPEN_FILE }, id3Callback);
  };


  var loadSuccessCallbackFactory = function(idx) {
    return function(response) {
      $log.debug('load success:', response);

      songStatus = 'loaded';
      songBuffer = response.data;
      songHash = 'md5:' + SparkMD5.ArrayBuffer.hash(response.data).toLowerCase();

      extractSongImageAsync(songBuffer);

      hideLoadingDialog(false);
      
      Choreography.load(idx, songHash);
      AudioEngine.setSourceData(response.data);
      AudioEngine.initEvents(Choreography.getTempo(), Choreography.getQueueEngine());

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


  var load = function(idx, url, successCallback, errorCallback) {
    $log.debug('load request: idx', idx, 'url', url);

    songStatus = 'loading';

    showLoadingDialog();
    $http({
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': undefined
      },
      responseType: 'arraybuffer'
    }).then(loadSuccessCallbackFactory(idx), errorCallback);
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
