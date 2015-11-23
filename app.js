(function(document, window, undefined) {
  'use strict';

  // rhythm
  var offsetMs = 812;
  var beatMs = 346.820809248555;
  var tempoFactory = function(beatMs, offsetMs) {
    // TODO: 4/4 time signature assumed
    var measureMs = beatMs * 4;

    return function(posMs) {
      var posAfterOffset = posMs - offsetMs;
      var tmp = posAfterOffset / measureMs;
      var measure = Math.floor(tmp);
      var beat = Math.floor((posAfterOffset - measure * measureMs) / beatMs);
      return {
        'measure': measure,
        'beat': beat
      };
    };
  };

  var snowhareTempo = tempoFactory(beatMs, offsetMs);

  // DOM
  var sourceElement = document.getElementById('music-source');
  var offsetElement = document.getElementById('offset');
  var measureElement = document.getElementById('measure');
  var beatElement = document.getElementById('beat');
  //sourceElement.addEventListener('timeupdate', function(e) {
    // offsetElement.innerHTML = '' + e.target.currentTime;
    //console.log(e.target.currentTime);
  //});

  var isPlaying = false;
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

    offsetElement.innerHTML = '' + posMs;
    measureElement.innerHTML = '' + currentBeat['measure'];
    beatElement.innerHTML = '' + currentBeat['beat'];
  };

  var frameCallback = function(ts) {
    var posMs = sourceElement.currentTime * 1000;

    if (isPlaying) {
      audioCallback(posMs);
    }

    window.requestAnimationFrame(frameCallback);
  };

  window.requestAnimationFrame(frameCallback);
})(document, window);
