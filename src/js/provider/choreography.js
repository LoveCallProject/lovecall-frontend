/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

var parser = require('../choreography/parser');


var mod = angular.module('lovecall/provider/choreography', [
]);

mod.factory('Choreography', function() {
  var parsedData = null;


  var load = function(data, hash) {
    parsedData = parser.parseCall(data, hash);
  };


  var getTempo = function() {
    return parsedData.tempo;
  };


  var getEvents = function() {
    return parsedData.events;
  }


  return {
    'load': load,
    'getTempo': getTempo,
    'getEvents': getEvents
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
