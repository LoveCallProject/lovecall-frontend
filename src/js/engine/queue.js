/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var _ = require('lodash');


var preprocessEvents = function(engineEventList) {
  var i = 0;
  var result = {};

  for (; i < engineEventList.length; i++) {
    var e = engineEventList[i];
    var ts = e.ts;
    if (result.hasOwnProperty(ts)) {
      result[ts].push(e);
    } else {
      result[ts] = [e];
    }
  }

  return result;
};


var queueEngineFactory = function(engineEventList, eventCallback, logProvider, verboseLog) {
  logProvider || (logProvider = console);

  var lookaheadWindowMs = 5000;

  var events = preprocessEvents(engineEventList);
  var eventTimeline = Object.keys(events);

  // plz just treat the elements as real numbers! (pun intended)
  eventTimeline.sort(function(a, b) {
    return a - b;
  });

  // seems unnecessary
  // var lastPosMs = 0;
  var nextEventIdx = 0;
  var nextEventMs = eventTimeline[0];

  logProvider.info('init: events=', events, 'eventCallback=', eventCallback);

  var eventIdxByTime = function(posMs) {
    // do binary search as we know eventTimeline is sorted
    // normally `_.indexOf(list, value, true)` would suffice, but in this
    // particular use case we actually need _the first element that's not
    // earlier than the given position_, hence the complete implementation.
    var left = 0;
    var right = eventTimeline.length - 1;
    var mid;
    var val;

    while (left <= right) {
      mid = (left + right) >> 1;
      val = eventTimeline[mid];
      if (Math.abs(val - posMs) < 1e2) {
        return mid;
      } else if (val < posMs) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return mid + 1;
  };


  var gatherLookaheadEvents = function(posMs) {
    // aggregate future events in the lookahead window
    var lookaheadWindowEndIdx = eventIdxByTime(posMs + lookaheadWindowMs);
    var keys = _.slice(eventTimeline, nextEventIdx + 1, lookaheadWindowEndIdx);

    // it seems _.pick() only supports list of strings as "indexes"...
    // return _(events).pick(keys).flatten().value();
    return _(keys)
      .map(function(elem) {
        return events[elem];
      })
      .flatten()
      .value();
  };


  var updateNextEvent = function(idx) {
    nextEventIdx = idx;
    nextEventMs = eventTimeline[idx] || Infinity;
  };


  var recalculateNextEvent = function(posMs) {
    updateNextEvent(eventIdxByTime(posMs));
  };


  var doUpdateSlowpath = function(posMs) {
    recalculateNextEvent(posMs);

    if (verboseLog) {
      logProvider.warn(
          'queue engine slowpath: posMs=',
          posMs,
          'nextEventIdx=',
          nextEventIdx,
          'nextEventMs=',
          nextEventMs
          );
    }

    // NOTE: list[-1] returns undefined in JS, unlike Python, so we can
    // safely ignore the edge case where slowpath is triggered before the
    // first event.
    return events[nextEventIdx - 1];
  };


  var update = function(posMs, fast) {
    // this would have the side-effect of updating next event states if
    // slowpath is requested
    var prevEvent = fast ? null : doUpdateSlowpath(posMs);


    // this would for sure kill the audio performance, don't print even in
    // case of verbose logging.
    /*
    if (verboseLog) {
      logProvider.debug(
          'update: posMs',
          posMs,
          'fast',
          fast,
          'nextEventMs',
          nextEventMs,
          'nextEventIdx',
          nextEventIdx
          );
    }
    */

    do {
      // fire the callback if one is ready, but always fire in case of slowpath
      if (posMs >= nextEventMs || !fast) {
        var lookaheadEvents = gatherLookaheadEvents(posMs);
        if (verboseLog) {
          logProvider.debug('update: lookaheadEvents=', lookaheadEvents);
        }

        eventCallback(events[eventTimeline[nextEventIdx]], lookaheadEvents, prevEvent);

        if (prevEvent) {
          // only fire prevEvent once
          prevEvent = null;
        }
      }

      // but only progress if one set of event is actually fired
      if (posMs >= nextEventMs) {
        updateNextEvent(nextEventIdx + 1);
      }
    } while (posMs >= nextEventMs);

    // lastPositionMs = posMs;
  };


  return {
    update: update
  };
};


module.exports = {
  'queueEngineFactory': queueEngineFactory
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
