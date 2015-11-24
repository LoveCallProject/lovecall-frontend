/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';


var tempoFactory = function(beatMs, offsetMs) {
  // TODO: 4/4 time signature assumed
  var measureMs = beatMs * 4;
  var fourthBeatMs = beatMs / 4;

  return {
    "fourthBeatMs": fourthBeatMs,
    timeToBeat: function(posMs) {
      var posAfterOffset = posMs - offsetMs;
      var tmp = posAfterOffset / measureMs;
      var measure = Math.floor(tmp);
      var fourthBeat = Math.floor((posAfterOffset - measure * measureMs) / fourthBeatMs);
      return [measure, fourthBeat];
    },
    beatToTime: function(measure, fourthBeat) {
      return offsetMs + measure * measureMs + fourthBeat * fourthBeatMs;
    }
  };
};


var metronomeFactory = function(tempo, tickCallback) {
  // TODO: multiple timing sections
  var currentFourthBeatMs = tempo.fourthBeatMs;
  var nextFourthBeatMs = tempo.fourthBeatMs;

  // state
  var lastPosMs = -Infinity;
  var remainingBeatMs = nextFourthBeatMs;
  var currentBeat = [0, 0];
  var callCounter = 0;
  var resyncCount = 48;

  return {
    tick: function(posMs) {
      var deltaMs = posMs - lastPosMs;
      lastPosMs = posMs;

      // prevent beat drifting over time by falling back to slowpath every ~1 s
      callCounter += 1;

      if (deltaMs > 0 && deltaMs <= currentFourthBeatMs && callCounter < resyncCount) {
        remainingBeatMs -= deltaMs;

        if (remainingBeatMs <= 0) {
          remainingBeatMs += nextFourthBeatMs;

          if (currentBeat[1] < 15) {
            currentBeat[1] += 1;
          } else {
            currentBeat[0] += 1;
            currentBeat[1] = 0;
          }

          if (tickCallback) {
            tickCallback(currentBeat);
          }
        }

        return currentBeat;
      }

      currentBeat = tempo.timeToBeat(posMs);
      remainingBeatMs = tempo.beatToTime(currentBeat[0], currentBeat[1] + 1) - posMs;
      if (callCounter == resyncCount) {
        // console.debug('metronome: periodic re-sync');
      } else {
        console.warn('metronome: slowpath: position=', posMs, 'delta=', deltaMs, 'currentBeat=', currentBeat, 'remainingBeatMs=', remainingBeatMs, 'callCounter=', callCounter);
      }

      // reset call counter
      callCounter = 0;

      if (tickCallback) {
        tickCallback(currentBeat);
      }

      return currentBeat;
    }
  };
};


var beatAdd = function(one, other) {
  var newMeasure = one[0] + other[0];
  var newBeat = one[1] + other[1];
  newMeasure += Math.floor(newBeat / 16);
  return [newMeasure, newBeat % 16];
};


var beatCompare = function(one, other) {
  return (one[0] * 16 + one[1]) - (other[0] * 16 + other[1]);
};


module.exports = {
  'tempoFactory': tempoFactory,
  'metronomeFactory': metronomeFactory,
  'beatAdd': beatAdd,
  'beatCompare': beatCompare
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
