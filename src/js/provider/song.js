/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

var SparkMD5 = require('spark-md5');

// XXX: upstream is broken
var id3 = require('../vendored/id3');


var mod = angular.module('lovecall/provider/song', [
]);

mod.factory('Song', function($rootScope, $http, $log) {
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


  var loadSuccessCallbackFactory = function(successCallback) {
    return function(response) {
      $log.debug('load success:', response);

      songStatus = 'loaded';
      songBuffer = response.data;
      songHash = SparkMD5.ArrayBuffer.hash(response.data);

      extractSongImageAsync(songBuffer);

      successCallback && successCallback(songHash, response.data);
    };
  };


  var loadErrorCallbackFactory = function(errorCallback) {
    songStatus = 'errored';

    return function(response) {
      errorCallback && errorCallback(response);
    };
  };


  var load = function(url, successCallback, errorCallback) {
    $log.debug('load request: url', url);

    songStatus = 'loading';
    $http({
      method: 'GET',
      url: url,
      headers: {
        'Content-Type': undefined
      },
      responseType: 'arraybuffer'
    }).then(loadSuccessCallbackFactory(successCallback), errorCallback);
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
