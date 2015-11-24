/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
var tempoMod = require('../choreography/tempo');

require('../ui/frame');


var mod = angular.module('lovecall/engine/audio', []);

mod.factory('AudioEngine', function($window, $log, FrameManager) {
  var inited = false;
  var audioCtx = new ($window.AudioContext || $window.webkitAudioContext)();

  var sourceElement = null;
  var sourceNode = null;
  var timingNode = audioCtx.createScriptProcessor(1024);

  var isPlaying = false;
  var ctxLastReferenceMs = 0;
  var playbackReferenceMs = 0;
  var playbackPosMs = 0;
  
  $log = $log.getInstance('AudioEngine');


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


  // interface
  var setSourceElement = function(element) {
    if (inited) {
      $log.error('already inited!');
    }

    $log.debug('setSourceElement: element=', element);

    inited = true;
    sourceElement = element;
    sourceNode = audioCtx.createMediaElementSource(element);
    element.addEventListener('play', playEventHandlerFactory(true));
    element.addEventListener('playing', playEventHandlerFactory(true));
    element.addEventListener('pause', playEventHandlerFactory(false));
  };


  var audioCallbackFactory = function(tempo) {
    if (!inited) {
      $log.error('not inited!');
      return;
    }

    var metronome = tempoMod.metronomeFactory(tempo, FrameManager.tickCallback);

    var audioCallback = function(e) {
      var ctxMs = e.playbackTime * 1000;
      var posMs = playbackReferenceMs + ctxMs - ctxLastReferenceMs;
      playbackPosMs = posMs;

      metronome.tick(posMs);

      // just pass through
      var inBuf = e.inputBuffer;
      var outBuf = e.outputBuffer;
      var ch;
      for (ch = 0; ch < inBuf.numberOfChannels; ch++) {
        var data = inBuf.getChannelData(ch);
        outBuf.copyToChannel(data, ch);
      }
    };

    return audioCallback;
  };


  var setTempo = function(tempo) {
    $log.debug('setTempo: tempo=', tempo);

    var audioCallback = audioCallbackFactory(tempo);
    timingNode.onaudioprocess = audioCallback;
  };


  return {
    'setSourceElement': setSourceElement,
    'setTempo': setTempo
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
