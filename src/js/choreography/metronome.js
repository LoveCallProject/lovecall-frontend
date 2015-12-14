/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';


var metronomeFactory = function(tempo, tickCallback, logProvider, verboseLog) {
  logProvider || (logProvider = console);

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

  logProvider.info('initializing with tempo', tempo);

  return {
    tick: function(posMs) {
      var deltaMs = posMs - lastPosMs;
      lastPosMs = posMs;

      // prevent beat drifting over time by falling back to slowpath every ~1 s
      callCounter += 1;

      var fastpath = true;
      var slowReasonLogged = false;

      if (deltaMs <= 0 || deltaMs > currentStepMs) {
        fastpath = false;
      } else if (callCounter >= resyncCount) {
        fastpath = false;
        if (verboseLog) {
          logProvider.debug('periodic re-sync; currentSectionIdx=', currentSectionIdx);
          slowReasonLogged = true;
        }
      } else if (posMs >= nextSectionMs) {
        fastpath = false;
        if (verboseLog) {
          logProvider.debug('crossing timing section; currentSectionIdx=', currentSectionIdx);
          slowReasonLogged = true;
        }
      }

      if (fastpath) {
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
      if (verboseLog && !slowReasonLogged) {
        logProvider.warn(
            'slowpath: position=', posMs,
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


module.exports = {
  'metronomeFactory': metronomeFactory
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
