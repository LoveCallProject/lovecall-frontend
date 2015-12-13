/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

var parser = require('../choreography/parser');
var queue = require('../engine/queue');


var mod = angular.module('lovecall/provider/choreography', [
]);

mod.factory('Choreography', function($log) {
  var $queueEngineLog = $log.getInstance('QueueEngine');
  $log = $log.getInstance('Choreography');

  var parsedData = null;
  var queueEngine = null;

  var queueCallbacks = [];


  var queueEventCallback = function(nextEvents, lookaheadEvents, prevEvents) {
    // actually log inside audio callback is bad
    // TODO: implement global setting provider
    if (0) {
      $log.debug(
          'queue event: nextEvents=',
          nextEvents,
          'lookaheadEvents=',
          lookaheadEvents,
          'prevEvents=',
          prevEvents
          );
      nextEvents.map(function(v) {
        $log.debug('queue event:', v);
      });
    }

    queueCallbacks.forEach(function(callback) {
      callback(nextEvents, lookaheadEvents, prevEvents);
    });
  }


  var addQueueCallback = function(callback) {
    queueCallbacks.push(callback);
  };


  var removeQueueCallback = function(callback) {
    var i = 0;
    var found = false;
    for (i = 0; i < queueCallbacks.length; i++) {
      if (queueCallbacks[i] == callback) {
        found = true;
        break;
      }
    }

    if (found) {
      queueCallbacks.splice(i, 1);
    }
  };


  var load = function(data, hash) {
    parsedData = parser.parseCall(data, hash);
    queueEngine = queue.queueEngineFactory(
        parsedData.events,
        queueEventCallback,
        $queueEngineLog,
        false
        );
  };


  var getTempo = function() {
    return parsedData.tempo;
  };


  var getForm = function() {
    return parsedData.form;
  };


  var getEvents = function() {
    return parsedData.events;
  };


  var getQueueEngine = function() {
    return queueEngine;
  };


  var getColors = function() {
    return parsedData ? parsedData.colors : null;
  };


  var getSongMetadata = function() {
    return parsedData.songMetadata;
  };


  return {
    'addQueueCallback': addQueueCallback,
    'removeQueueCallback': removeQueueCallback,
    'load': load,
    'getTempo': getTempo,
    'getForm': getForm,
    'getColors': getColors,
    'getSongMetadata': getSongMetadata,
    'getEvents': getEvents,
    'getQueueEngine': getQueueEngine
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
