/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var _ = require('lodash');


var LoveCallTableManager = function() {
  this.tables = {};
  this.nextTableIdx = 0;

  this.hashCache = {};
  this.songCache = {};
};


LoveCallTableManager.prototype.registerTable = function(table) {
  var idx = this.nextTableIdx;
  this.tables[idx] = table;
  this.nextTableIdx += 1;

  var hashMap = _.transform(table.metadata.song.sources, function(result, v, k) {
    result[k.toLowerCase()] = idx;
  });

  _.extend(this.hashCache, hashMap);

  this.songCache[idx] = {
    ti: table.metadata.song.title,
    ar: table.metadata.song.artist,
    al: table.metadata.song.album,
    lang: table.metadata.song.lang,
    idx: idx
  };

  return idx;
};


LoveCallTableManager.prototype.lookupTable = function(idx, hash) {
  var lookupKey = hash.toLowerCase();

  if (hash === 'fallback:') {
    return this.tables[idx];
  }

  var tableByHash = this.tables[this.hashCache[lookupKey]];
  return typeof(tableByHash) !== 'undefined' ? tableByHash : this.tables[idx];
};


LoveCallTableManager.prototype.getAvailableSongs = function() {
  // return a copy
  return _.extend({}, this.songCache);
}


module.exports = {
  LoveCallTableManager: LoveCallTableManager
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
