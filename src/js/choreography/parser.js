/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var _ = require('lodash');

var tempoMod = require('./tempo');
var stepAdd = tempoMod.stepAdd;
var stepCompare = tempoMod.stepCompare;


var makeEngineEvent = function(a, tempo) {
  return {
    "ts": tempo.stepToTime(a[0].m, a[0].s)|0,
    "type": a[1],
    "params": a[2]
  };
};


var parseFuFuAction = function(startStep, params) {
  return [
    [startStep, "Fu!", null],
    [stepAdd(startStep, {m: 0, s: 2}), "Fu!", null]
  ];
};

var parseJumpAction = function(startStep, params) {
  return [
    [startStep, "跳", null]
  ];
}


var parsePeriodicAction = function(startStep, endStep, type, offset, increment, params) {
  params = params || null;

  var result = [];
  var currentStep = stepAdd(startStep, offset);

  while (stepCompare(currentStep, endStep) < 0) {
    result.push([currentStep, type, params]);
    currentStep = stepAdd(currentStep, increment);
  }

  return result;
};


var parseSJAction = function(startStep, endStep, params) {
  return parsePeriodicAction(startStep, endStep, "上举", {m: 0, s: 0}, {m: 0, s: params[0]});
};


var parseLDAction = function(startStep, endStep, params) {
  return parsePeriodicAction(startStep, endStep, "里打", {m: 0, s: 4}, {m: 0, s: 8});
};


var parseLTAction = function(startStep, endStep, params) {
  var withHi = typeof(params[0]) !== 'undefined' ? !!params[0] : false;
  var actionParams = withHi ? {msg: 'Hi!'} : null;
  return parsePeriodicAction(startStep, endStep, "里跳", {m: 0, s: 4}, {m: 0, s: 8}, actionParams);
};


var parseQHAction = function(startStep, endStep, params) {
  var interval = params[0] ? params[0]|0 : 8;
  return parsePeriodicAction(startStep, endStep, "前挥", {m: 0, s: 0}, {m: 0, s: interval});
};


var parseKHAction = function(startStep, endStep, params) {
  var interval = params[0] ? params[0]|0 : 4;
  return parsePeriodicAction(startStep, endStep, "快挥", {m: 0, s: 0}, {m: 0, s: interval});
};


var parseFuwaAction = function(startStep, endStep, params) {
  return parsePeriodicAction(startStep, endStep, "fuwa", {m: 0, s: 0}, {m: 0, s: 4});
};


var parseAlarmAction = function(startStep, endStep, params) {
  return [
    [startStep, "Hi!", null],
    [stepAdd(startStep, {m: 0, s: 8}), "Hi!", null],
    [stepAdd(startStep, {m: 1, s: 0}), "Hi!", null],
    [stepAdd(startStep, {m: 1, s: 4}), "Hi!", null],
    [stepAdd(startStep, {m: 1, s: 8}), "Hi!", null],
    [stepAdd(startStep, {m: 1, s: 12}), "Hi!", null]
  ];
};


var parsePPPHAction = function(startStep, endStep, params) {
  var ppphVariant = params[0];
  var currentStep = startStep;
  var result = [];

  switch(ppphVariant) {
    case 'OOOH': {
      while (stepCompare(currentStep, endStep) < 0) {
        result.push([currentStep, "Oh~", null]);
        result.push([stepAdd(currentStep, {m: 0, s: 12}), "Hi!", null]);
        currentStep = stepAdd(currentStep, {m: 1, s: 0});
      }

      break;
    }

    default:
      console.error('unrecognized PPPH parameter', params);
  }

  return result;
};


var parseFollowAction = function(startStep, endStep, params) {
  var content = params[0];

  return [
    [startStep, "跟唱", {msg: content}]
  ];
};


var parseCelebrateAction = function(startStep, endStep, params) {
  return [
    [startStep, "欢呼", null]
  ];
};


// action type lookup maps
var POINT_ACTION_PARSERS = {
  'fufu': parseFuFuAction,
  '跳': parseJumpAction,
};

var LONG_ACTION_PARSERS = {
  '上举': parseSJAction,
  '里打': parseLDAction,
  '警报': parseAlarmAction,
  'PPPH': parsePPPHAction,
  '里跳': parseLTAction,
  '前挥': parseQHAction,
  '快挥': parseKHAction,
  'fuwa': parseFuwaAction,
  '跟唱': parseFollowAction,
  '欢呼': parseCelebrateAction
};


var parsePointAction = function(actionData, refStep) {
  var actionStartStep = {m: actionData[0], s: actionData[1]};
  var realStartStep = refStep ? stepAdd(actionStartStep, refStep) : actionStartStep;
  var actionType = actionData[2];
  var actionParams = actionData.slice(3);

  var parseFn = POINT_ACTION_PARSERS[actionType];
  if (parseFn) {
    return parseFn(realStartStep, actionParams);
  }

  console.error('unrecognized point action', actionData);
  return [];
};


var parseLongAction = function(actionData, refStep) {
  var actionStartStep = {m: actionData[0], s: actionData[1]};
  var actionEndStep = {m: actionData[2], s: actionData[3]};
  var realStartStep = refStep ? stepAdd(actionStartStep, refStep) : actionStartStep;
  var realEndStep = refStep ? stepAdd(actionEndStep, refStep) : actionEndStep;
  var actionType = actionData[4];
  var actionParams = actionData.slice(5);

  var parseFn = LONG_ACTION_PARSERS[actionType];
  if (parseFn) {
    return parseFn(realStartStep, realEndStep, actionParams);
  }

  console.error('unrecognized long action', actionData);
  return [];
};


var parseSequenceAction = function(actionData, seqs, refStep) {
  var actionStartStep = {m: actionData[0], s: actionData[1]};
  var realStartStep = refStep ? stepAdd(actionStartStep, refStep) : actionStartStep;
  var name = actionData[2];

  var seq = seqs[name];

  if (typeof(seq) === 'undefined') {
    console.error('unrecognized sequence', seq);
    return [];
  }

  var result = _.flatten(seq.map(function(v) {
    return parseTimelineAction(v, seqs, realStartStep);
  }));

  return result;
};


var parseTimelineAction = function(action, seqs, refStep) {
  var actionFlag = action[0];
  var actionData = action.slice(1);
  switch (actionFlag) {
    case 0:
      return parsePointAction(actionData, refStep);
    case 1:
      return parseLongAction(actionData, refStep);
    case 2:
      return parseSequenceAction(actionData, seqs, refStep);
  }

  console.error('unrecognized action', action);
  return [];
};


var parseTimeline = function(timeline, seqs, tempo) {
  var result = _(timeline)
    .map(function(v) {
      return parseTimelineAction(v, seqs, null);
    })
    .flatten()
    .map(function(elem) {
      return makeEngineEvent(elem, tempo);
    })
    .value();

  result.sort(function(a, b) {
    return a.ts - b.ts;
  });

  return result;
};


var parseForm = function(form, tempo) {
  // TODO: respect or delete the end points?
  return _(form)
    .map(function(v) {
      return makeEngineEvent([{m: v[0], s: v[1]}, "__form", {name: v[4]}], tempo);
    })
  .value();
};


var parseSongMetadata = function(songMetadata) {
  return {
    ti: songMetadata.title,
    ar: songMetadata.artist,
    al: songMetadata.album
  };
}


var parsePalette = function(palette) {
  return palette.map(function(color) {
    var r = parseInt(color.slice(1, 3), 16);
    var g = parseInt(color.slice(3, 5), 16);
    var b = parseInt(color.slice(5, 7), 16);
    return [r, g, b];
  });
};


var parseColors = function(palette, colorTimelines, tempo) {
  return colorTimelines.map(function(colorTimeline) {
    var startTime;
    var endTime;

    if ((colorTimeline[0] == -2) && (colorTimeline[1] == -2)) {
      startTime = -Infinity;
    } else {
      startTime = tempo.stepToTime(
          colorTimeline[0],
          colorTimeline[1]
          );
    }

    if ((colorTimeline[2] == -1) && (colorTimeline[3] == -1)) {
      endTime = Infinity;
    } else {
      endTime = tempo.stepToTime(
          colorTimeline[2],
          colorTimeline[3]
          );
    }

    var colors = colorTimeline
        .slice(4, colorTimeline.length + 1)
        .map(function(colorid) {
          return palette[colorid];
        });

    return [startTime, endTime, colors];
  });
};


var parseCall = function(data, hash) {
  var metadata = data.metadata;
  var songMetadata = metadata.song;
  var sources = songMetadata.sources;

  var sourceData = sources[hash];
  if (typeof(sourceData) === 'undefined') {
    console.warn('using fallback data for hash', hash);
    sourceData = sources['fallback:'];
  }

  var globalOffsetMs = sourceData.offset;

  var parsedMetadata = parseSongMetadata(songMetadata);

  // TODO: case of unknown hash
  var tempo = tempoMod.tempoFactory(songMetadata.timing, globalOffsetMs ? globalOffsetMs : 0);

  var form = parseForm(data.form, tempo);

  var seqs = data.sequences || {};
  var events = parseTimeline(data.timeline, seqs, tempo);

  var parsedPalette = parsePalette(metadata.palette);
  var colors = parseColors(parsedPalette, data.colors, tempo);

  // TODO
  return {
    'songMetadata': parsedMetadata,
    'tempo': tempo,
    'form': form,
    'events': events,
    'colors': colors
  };
};


module.exports = {
  'makeEngineEvent': makeEngineEvent,
  'parseCall': parseCall
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
