/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';


var tempoFactory = function(timingSpec, globalOffsetMs) {
  var timingSections = timingSpec.map(function(v) {
    // [offset, bpm, timeSignNumer, timeSignDenom, startingMeasure]
    // to
    // [offsetMs, stepMs, startingMeasure, stepsPerMeasure, stepsPerStep]
    // where a "step" is an 1/16 note
    var timeSignNumer = v[2];
    var timeSignDenom = v[3];

    var beatMs = 60000 / v[1];
    var stepsPerStep = 16 / timeSignDenom;
    var stepsPerMeasure = timeSignNumer * stepsPerStep;
    var stepMs = beatMs / stepsPerStep;

    return [v[0] + globalOffsetMs, stepMs, v[4], stepsPerMeasure, stepsPerStep];
  });

  console.log('tempo: timingSections=', timingSections);

  return {
    timingSections: timingSections,
    timeToStep: function(posMs) {
      // find out the timing section to use
      var sectionIdx;
      var section;
      if (posMs < timingSections[0][0]) {
        // just use the first timing section for leading
        sectionIdx = 0;
        section = timingSections[0];
      } else {
        for (sectionIdx = timingSections.length - 1; sectionIdx >= 0; sectionIdx--) {
          section = timingSections[sectionIdx];
          if (section[0] <= posMs) {
            break;
          }
        }
      }

      var posAfterOffset = posMs - section[0];
      var stepMs = section[1];
      var startingMeasure = section[2];
      var stepsPerMeasure = section[3];

      var totalSteps = (posAfterOffset / stepMs)|0;
      var measure = (startingMeasure + totalSteps / stepsPerMeasure)|0;
      var step = (totalSteps % stepsPerMeasure)|0;
      return {
        m: (totalSteps < 0 ? measure - 1 : measure)|0,
        s: (step < 0 ? step + stepsPerMeasure : step)|0,
        i: sectionIdx
      };
    },
    stepToTime: function(measure, step) {
      var sectionIdx = 0;
      var section = timingSections[timingSections.length - 1];

      for (; sectionIdx < timingSections.length; sectionIdx++) {
        if (measure < timingSections[sectionIdx][2]) {
          var prevIdx = sectionIdx - 1;
          section = timingSections[prevIdx < 0 ? 0 : prevIdx];
          break;
        }
      }

      var measureInSection = measure - section[2];
      var stepsPerMeasure = section[3];
      var stepMs = section[1];
      return section[0] + stepMs * (stepsPerMeasure * measureInSection + step);
    }
  };
};


var metronomeFactory = function(tempo, tickCallback) {
  var timingSections = tempo.timingSections;
  var currentSectionIdx = 0;
  var currentStepMs = timingSections[0][1];
  var currentStepsPerMeasureMinusOne = timingSections[0][3] - 1;
  var nextSectionMs = timingSections.length < 2 ? Infinity : timingSections[1][0];

  // state
  var lastPosMs = -Infinity;
  var remainingStepMs = currentStepMs;
  var currentStep = {m: 0, s: 0, i: 0};
  var callCounter = 0;
  var resyncCount = 48;

  console.log('metronome: initializing with tempo', tempo);

  return {
    tick: function(posMs) {
      var deltaMs = posMs - lastPosMs;
      lastPosMs = posMs;

      // prevent beat drifting over time by falling back to slowpath every ~1 s
      callCounter += 1;

      if (
          deltaMs > 0 &&
          deltaMs <= currentStepMs &&
          posMs < nextSectionMs &&  // re-sync on every timing section change
          callCounter < resyncCount
          ) {
        remainingStepMs -= deltaMs;

        if (remainingStepMs <= 0) {
          // we won't be crossing timing sections in fastpath so this is safe
          remainingStepMs += currentStepMs;

          if (currentStep.s < currentStepsPerMeasureMinusOne) {
            currentStep.s += 1;
          } else {
            currentStep.m += 1;
            currentStep.s = 0;
          }

          if (tickCallback) {
            tickCallback(currentStep);
          }
        }

        return currentStep;
      }

      currentStep = tempo.timeToStep(posMs);
      currentSectionIdx = currentStep.i;
      currentStepMs = timingSections[currentSectionIdx][1];
      currentStepsPerMeasureMinusOne = timingSections[currentSectionIdx][3] - 1;
      remainingStepMs = tempo.stepToTime(currentStep.m, currentStep.s + 1) - posMs;
      nextSectionMs = (
          (currentSectionIdx == timingSections.length - 1) ?
          Infinity :
          timingSections[currentSectionIdx + 1][0]
          );
      if (callCounter == resyncCount || posMs >= nextSectionMs) {
        console.log('metronome: periodic re-sync: nextSectionMs=', nextSectionMs);
      } else {
        console.log(
            'metronome: slowpath: position=', posMs,
            'delta=', deltaMs,
            'currentSectionIdx=', currentSectionIdx,
            'currentStep=', currentStep,
            'remainingStepMs=', remainingStepMs,
            'nextSectionMs=', nextSectionMs,
            'callCounter=', callCounter
            );
      }

      // reset call counter
      callCounter = 0;

      if (tickCallback) {
        tickCallback(currentStep);
      }

      return currentStep;
    }
  };
};


var stepAdd = function(one, other, stepsPerMeasure) {
  stepsPerMeasure || (stepsPerMeasure = 16);

  var newMeasure = one.m + other.m;
  var newStep = one.s + other.s;
  newMeasure += Math.floor(newStep / stepsPerMeasure);
  return {
    m: newMeasure,
    s: newStep % stepsPerMeasure
  };
};


var stepCompare = function(one, other, stepsPerMeasure) {
  stepsPerMeasure || (stepsPerMeasure = 16);

  return (one.m * stepsPerMeasure + one.s) - (other.m * stepsPerMeasure + other.s);
};


module.exports = {
  'tempoFactory': tempoFactory,
  'metronomeFactory': metronomeFactory,
  'stepAdd': stepAdd,
  'stepCompare': stepCompare
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
