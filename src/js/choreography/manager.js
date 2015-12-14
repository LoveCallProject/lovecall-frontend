/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var _ = require('lodash');


var LoveCallTableManager = function() {
  this.tables = {};
  this.nextTableIdx = 0;

  this.hashCache = {};
};


LoveCallTableManager.prototype.registerTable = function(table) {
  var idx = this.nextTableIdx;
  this.tables[idx] = table;
  this.nextTableIdx += 1;

  var hashMap = _.transform(table.metadata.song.sources, function(result, v, k) {
    result[k.toLowerCase()] = idx;
  });

  _.extend(this.hashCache, hashMap);

  return idx;
};


LoveCallTableManager.prototype.lookupTableByIndex = function(idx) {
  return this.tables[idx];
};


LoveCallTableManager.prototype.lookupTableByHash = function(hash) {
  var lookupKey = hash.toLowerCase();
  return this.tables[this.hashCache[lookupKey]];
};


module.exports = {
  LoveCallTableManager: LoveCallTableManager
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
