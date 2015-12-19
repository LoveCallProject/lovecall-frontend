/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

var siteConf = require('../../lovecall.config');


var mod = angular.module('lovecall/conf', [
]);

mod.factory('LCConfig', function() {
  var VERSION = '20151220-dev';
  var HASH = __webpack_hash__;


  var getAudioBufferSize = function() {
    // TODO: make this configurable
    return 2048;
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
    getAudioBufferSize: getAudioBufferSize,
    getGlobalOffsetMs: getGlobalOffsetMs,
    getKnownLocalSongs: getKnownLocalSongs,
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
