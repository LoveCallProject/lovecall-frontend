(function(document, window, undefined) {
  'use strict';

  // rhythm
  var offsetMs = 812;
  var beatMs = 346.820809248555;
  var tempoFactory = function(beatMs, offsetMs) {
    // TODO: 4/4 time signature assumed
    var measureMs = beatMs * 4;
    var fourthBeatMs = beatMs / 4;

    return function(posMs) {
      var posAfterOffset = posMs - offsetMs;
      var tmp = posAfterOffset / measureMs;
      var measure = Math.floor(tmp);
      var fourthBeat = Math.floor((posAfterOffset - measure * measureMs) / fourthBeatMs);
      return [measure, fourthBeat];
    };
  };

  var snowhareTempo = tempoFactory(beatMs, offsetMs);

  // DOM
  var sourceElement = document.getElementById('music-source');
  var offsetElement = document.getElementById('offset');
  var measureElement = document.getElementById('measure');
  var beatElement = document.getElementById('beat');

  var isPlaying = false;
  var playbackPosMs = 0;
  var playbackPosMeasure = 0;
  var playbackPosBeat = 0;

  var playEventHandlerFactory = function(newState) {
    return function(e) {
      isPlaying = newState;
    };
  };

  sourceElement.addEventListener('play', playEventHandlerFactory(true));
  sourceElement.addEventListener('playing', playEventHandlerFactory(true));
  sourceElement.addEventListener('pause', playEventHandlerFactory(false));

  var audioCallback = function(posMs) {
    var currentBeat = snowhareTempo(posMs);
    var newMeasure = currentBeat[0];
    var newBeat = currentBeat[1];

    if (newMeasure != playbackPosMeasure || newBeat != playbackPosBeat) {
      measureElement.innerHTML = '' + newMeasure;
      beatElement.innerHTML = '' + newBeat;
    }

    playbackPosMs = posMs;
    playbackPosMeasure = newMeasure;
    playbackPosBeat = newBeat;
  };

  var frameCallback = function(ts) {
    window.requestAnimationFrame(frameCallback);

    if (isPlaying) {
      audioCallback(sourceElement.currentTime * 1000);
    }
  };

  window.requestAnimationFrame(frameCallback);
})(document, window);


// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
