/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

var parser = require('../choreography/parser');
var manager = require('../choreography/manager');


var mod = angular.module('lovecall/provider/choreography', [
]);

mod.factory('Choreography', function($log) {
  $log = $log.getInstance('Choreography');

  var tableManager = new manager.LoveCallTableManager();
  var parsedData = null;
  var mergedEvents = [];


  var generateStepLineEvents = function(duration) {
    $log.debug('generateStepLineEvents: parsedData', parsedData);
    var tempo = getTempo();
    var startStep = tempo.timeToStep(0);
    var endStep = tempo.timeToStep(duration);

    var startMeasureIdx = startStep.m - 1;
    var endMeasureIdx = endStep.m;

    var stepLineEvents = [];
    for (var i = startMeasureIdx; i <= endMeasureIdx; i++) {
      stepLineEvents.push(parser.makeEngineEvent([{m: i, s: 0}, 'stepLine', null], tempo));
    }

    var mergedEventsList = _.flatten([parsedData.events, stepLineEvents]);
    mergedEvents = {};
    for (var i = 0; i < mergedEventsList.length; i++) {
      var e = mergedEventsList[i];
      var ts = e.ts;

      if (!mergedEvents.hasOwnProperty(ts)) {
        mergedEvents[ts] = [[], [], []];
      }

      if (e.type === 'stepLine') {
        mergedEvents[ts][0].push(e);
        continue;
      }

      if (e.type === '跟唱') {
        mergedEvents[ts][2].push(e);
        continue;
      }

      if (e.params && e.params.msg) {
        mergedEvents[ts][2].push(e);
      }

      mergedEvents[ts][1].push(e);
    }

    $log.debug('generateStepLineEvents: mergedEvents', mergedEvents);
  };


  var load = function(idx, hash) {
    var table = tableManager.lookupTable(idx, hash);

    if (!table) {
      $log.error('no table found for idx', idx, 'hash', hash);
      return;
    }

    parsedData = parser.parseCall(table, hash);
    mergedEvents = {};
  };


  var loadTable = function(table) {
    return tableManager.registerTable(table);
  };


  var getSongRemoteBasenameByIndex = function(idx) {
    // FIXME: refactor this
    return tableManager.lookupTable(idx, "fallback:").metadata.song.remoteBasename;
  };


  var getAvailableSongs = function() {
    return tableManager.getAvailableSongs();
  };


  var getLanguage = function() {
    return parsedData.songMetadata.lang;
  };


  var getTempo = function() {
    return parsedData.tempo;
  };


  var getForm = function() {
    return parsedData.form;
  };


  var getCircleMargin = function() {
    return parsedData.circleMargin;
  };


  var getEvents = function() {
    return mergedEvents;
  };


  var getColors = function() {
    return parsedData ? parsedData.colors : null;
  };


  var getSongMetadata = function() {
    return parsedData.songMetadata;
  };


  return {
    'generateStepLineEvents': generateStepLineEvents,
    'load': load,
    'loadTable': loadTable,
    'getSongRemoteBasenameByIndex': getSongRemoteBasenameByIndex,
    'getLanguage': getLanguage,
    'getCircleMargin': getCircleMargin,
    'getTempo': getTempo,
    'getForm': getForm,
    'getColors': getColors,
    'getSongMetadata': getSongMetadata,
    'getEvents': getEvents,
    'getAvailableSongs': getAvailableSongs
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
