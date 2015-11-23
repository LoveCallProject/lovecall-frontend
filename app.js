/*!
  This file is part of LoveCall.

  LoveCall is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  LoveCall is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with LoveCall.  If not, see <http://www.gnu.org/licenses/>.

  @preserve
  */
(function(document, window, undefined) {
  'use strict';

  // rhythm
  var offsetMs = 2199;
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
  var beatIndicatorElements = document.querySelectorAll('.beat-indicator');

  // audio
  var audioCtx = new AudioContext();
  var sourceNode = audioCtx.createMediaElementSource(sourceElement);
  var timingNode = audioCtx.createScriptProcessor();

  var isPlaying = false;
  var ctxLastReferenceMs = 0;
  var playbackReferenceMs = 0;
  var playbackPosMs = 0;
  var playbackPosMeasure = 0;
  var playbackPosBeat = 0;
  var prevFrameMeasure = 0;
  var prevFrameBeat = 0;

  var playEventHandlerFactory = function(newState) {
    return function(e) {
      isPlaying = newState;

      if (newState) {
        ctxLastReferenceMs = audioCtx.currentTime * 1000;
        playbackReferenceMs = sourceElement.currentTime * 1000;
        sourceNode.connect(timingNode);
        timingNode.connect(audioCtx.destination);
      } else {
        sourceNode.disconnect(timingNode);
        timingNode.disconnect(audioCtx.destination);
      }
    };
  };

  sourceElement.addEventListener('play', playEventHandlerFactory(true));
  sourceElement.addEventListener('playing', playEventHandlerFactory(true));
  sourceElement.addEventListener('pause', playEventHandlerFactory(false));

  var audioCallback = function(e) {
    var ctxMs = e.playbackTime * 1000;
    var posMs = playbackReferenceMs + ctxMs - ctxLastReferenceMs;
    var currentBeat = snowhareTempo(posMs);
    var newMeasure = currentBeat[0];
    var newBeat = currentBeat[1];

    playbackPosMs = posMs;
    playbackPosMeasure = newMeasure;
    playbackPosBeat = newBeat;

    // just pass through
    var inBuf = e.inputBuffer;
    var outBuf = e.outputBuffer;
    var ch;
    for (ch = 0; ch < inBuf.numberOfChannels; ch++) {
      var data = inBuf.getChannelData(ch);
      outBuf.copyToChannel(data, ch);
    }
  };

  timingNode.addEventListener('audioprocess', audioCallback);

  var prevBeatIndicatorIdx = 0;

  var frameCallback = function(ts) {
    window.requestAnimationFrame(frameCallback);

    // offsetElement.innerHTML = '' + Math.floor(playbackPosMs)
    // + ' ' + Math.floor(playbackReferenceMs)
    // + ' ' + Math.floor(ctxLastReferenceMs);

    if (prevFrameMeasure != playbackPosMeasure) {
      measureElement.innerHTML = '' + playbackPosMeasure;
      prevFrameMeasure = playbackPosMeasure;
    }

    if (prevFrameBeat != playbackPosBeat) {
      beatElement.innerHTML = '' + playbackPosBeat;

      // beat indicator
      var idx = Math.floor(playbackPosBeat / 4);
      beatIndicatorElements[prevBeatIndicatorIdx].classList.remove('active');
      beatIndicatorElements[idx].classList.add('active');
      prevBeatIndicatorIdx = idx;

      prevFrameBeat = playbackPosBeat;
    }
  };

  window.requestAnimationFrame(frameCallback);
})(document, window);


// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
