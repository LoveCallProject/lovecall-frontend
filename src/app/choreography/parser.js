/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var tempoMod = require('./tempo');
var beatAdd = tempoMod.beatAdd;
var beatCompare = tempoMod.beatCompare;


var makeEngineEvent = function(a, tempo) {
  return {
    "ts": tempo.beatToTime(a[0][0], a[0][1]),
    "type": a[1],
    "params": a[2]
  };
};


var parseFuFuAction = function(startBeat, params) {
  return [
    [startBeat, "Fu!", null],
    [beatAdd(startBeat, [0, 2]), "Fu!", null]
  ];
};


var parsePeriodicAction = function(startBeat, endBeat, type, offset, increment) {
  var result = [];
  var currentBeat = beatAdd(startBeat, offset);

  while (beatCompare(currentBeat, endBeat) < 0) {
    result.push([currentBeat, type, null]);
    currentBeat = beatAdd(currentBeat, increment);
  }

  return result;
};


var parseSJAction = function(startBeat, endBeat, params) {
  return parsePeriodicAction(startBeat, endBeat, "上举", [0, 0], [0, params[0]]);
};


var parseLDAction = function(startBeat, endBeat, params) {
  return parsePeriodicAction(startBeat, endBeat, "里打", [0, 4], [0, 8]);
};


var parseLTAction = function(startBeat, endBeat, params) {
  return parsePeriodicAction(startBeat, endBeat, "里跳", [0, 4], [0, 8]);
};


var parseKHAction = function(startBeat, endBeat, params) {
  return parsePeriodicAction(startBeat, endBeat, "快挥", [0, 0], [0, 4]);
}


var parseAlarmAction = function(startBeat, endBeat, params) {
  return [
    [startBeat, "Hi!", null],
    [beatAdd(startBeat, [0, 8]), "Hi!", null],
    [beatAdd(startBeat, [1, 0]), "Hi!", null],
    [beatAdd(startBeat, [1, 4]), "Hi!", null],
    [beatAdd(startBeat, [1, 8]), "Hi!", null],
    [beatAdd(startBeat, [1, 12]), "Hi!", null]
  ];
};


var parsePPPHAction = function(startBeat, endBeat, params) {
  var ppphVariant = params[0];
  var currentBeat = startBeat;
  var result = [];

  switch(ppphVariant) {
    case 'OOOH': {
      while (beatCompare(currentBeat, endBeat) < 0) {
        result.push([currentBeat, "Oh~", null]);
        result.push([beatAdd(currentBeat, [0, 12]), "Hi!", null]);
        currentBeat = beatAdd(currentBeat, [1, 0]);
      }

      break;
    }

    default:
      console.error('unrecognized PPPH parameter', params);
  }

  return result;
};


var parseFollowAction = function(startBeat, endBeat, params) {
  var content = params[0];

  return [
    [startBeat, "跟唱", content]
  ];
};


// action type lookup maps
var POINT_ACTION_PARSERS = {
  'fufu': parseFuFuAction
};

var LONG_ACTION_PARSERS = {
  '上举': parseSJAction,
  '里打': parseLDAction,
  '警报': parseAlarmAction,
  'PPPH': parsePPPHAction,
  '里跳': parseLTAction,
  '快挥': parseKHAction,
  '跟唱': parseFollowAction
};


var parsePointAction = function(actionData) {
  var actionStartBeat = actionData.slice(0, 2);
  var actionType = actionData[2];
  var actionParams = actionData.slice(3);

  var parseFn = POINT_ACTION_PARSERS[actionType];
  if (parseFn) {
    return parseFn(actionStartBeat, actionParams);
  }

  console.error('unrecognized point action', actionData);
  return [];
};


var parseLongAction = function(actionData) {
  var actionStartBeat = actionData.slice(0, 2);
  var actionEndBeat = actionData.slice(2, 4);
  var actionType = actionData[4];
  var actionParams = actionData.slice(5);

  var parseFn = LONG_ACTION_PARSERS[actionType];
  if (parseFn) {
    return parseFn(actionStartBeat, actionEndBeat, actionParams);
  }

  console.error('unrecognized long action', actionData);
  return [];
};


var parseTimelineAction = function(action) {
  var actionFlag = action[0];
  var actionData = action.slice(1);
  switch (actionFlag) {
    case 0:
      return parsePointAction(actionData);
    case 1:
      return parseLongAction(actionData);
  }

  console.error('unrecognized action', action);
  return [];
};


var parseTimeline = function(timeline, tempo) {
  var events = timeline.map(function(v) {
    return parseTimelineAction(v, tempo);
  });

  var result = events.reduce(function(acc, elem) {
    var i = 0;
    for (; i < elem.length; i++) {
      acc.push(makeEngineEvent(elem[i], tempo));
    }

    return acc;
  }, []);

  result.sort(function(a, b) {
    return a.ts - b.ts;
  });
  return result;
};


var parseCall = function(data) {
  var metadata = data.metadata;
  var songMetadata = metadata.song;
  var sources = songMetadata.sources;
  var offsetMs = sources[Object.keys(sources)[0]].offset +
               songMetadata.timing[0][0];
  var beatMs = 60000 / songMetadata.timing[0][1];
  var tempo = tempoMod.tempoFactory(beatMs, offsetMs);

  var events = parseTimeline(data.timeline, tempo);

  // TODO
  return {
    'tempo': tempo,
    'events': events
  };
};


module.exports = {
  'parseCall': parseCall
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
