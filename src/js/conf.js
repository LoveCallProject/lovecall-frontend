/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
require('angular-local-storage');

var siteConf = require('../../lovecall.config');


var mod = angular.module('lovecall/conf', [
    'LocalStorageModule',
]);

mod.factory('LCConfig', function($rootScope, localStorageService) {
  var VERSION = '20151203.9999';
  var HASH = __webpack_hash__;


  var getAudioBufferSizeOrder = function() {
    var storedSizeOrder = parseInt(localStorageService.get('audioBufferSizeOrder'));
    if (isNaN(storedSizeOrder) || storedSizeOrder < 8 || storedSizeOrder > 14) {
      storedSizeOrder = 11;
      doSetAudioBufferSizeOrder(storedSizeOrder, false);
    }

    return storedSizeOrder;
  };


  var getAudioBufferSize = function() {
    return 1 << getAudioBufferSizeOrder();
  };


  var setAudioBufferSizeOrder = function(order) {
    return doSetAudioBufferSizeOrder(order, true);
  };


  var doSetAudioBufferSizeOrder = function(order, fireEvent) {
    var newSizeOrder = order < 8 ? 8 : order > 14 ? 14 : order;
    localStorageService.set('audioBufferSizeOrder', '' + newSizeOrder);

    if (fireEvent) {
      $rootScope.$broadcast('config:audioBufferSizeChanged', 1 << order);
    }
  };


  var isRomajiEnabled = function() {
    var storedRomajiEnabled = parseInt(localStorageService.get('romajiEnabled'));
    if (isNaN(storedRomajiEnabled)) {
      storedRomajiEnabled = 0;
      doSetRomajiEnabled(false, false);
    }

    return !!storedRomajiEnabled;
  };


  var setRomajiEnabled = function(enabled) {
    return doSetRomajiEnabled(enabled, true);
  };


  var doSetRomajiEnabled = function(enabled, fireEvent) {
    localStorageService.set('romajiEnabled', enabled ? '1' : '0');
    fireEvent && $rootScope.$broadcast('config:romajiEnabledChanged', enabled);
  };


  var getGlobalOffsetMs = function() {
    // TODO
    return 0;
  };


  var getKnownLocalSongs = function() {
    // TODO
    return [];
  };


  return {
    VERSION: VERSION,
    HASH: HASH,
    REMOTE_MUSIC_PREFIX: siteConf.remoteMusicPrefix,
    REMOTE_COVER_ART_PREFIX: siteConf.remoteCoverArtPrefix,
    REMOTE_APK_PREFIX: siteConf.remoteApkPrefix,
    getAudioBufferSize: getAudioBufferSize,
    getAudioBufferSizeOrder: getAudioBufferSizeOrder,
    setAudioBufferSizeOrder: setAudioBufferSizeOrder,
    isRomajiEnabled: isRomajiEnabled,
    setRomajiEnabled: setRomajiEnabled,
    getGlobalOffsetMs: getGlobalOffsetMs,
    getKnownLocalSongs: getKnownLocalSongs,
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
