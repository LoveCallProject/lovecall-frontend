/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
var metronomeMod = require('../choreography/metronome');

require('../provider/choreography');
require('../ui/frame');


var mod = angular.module('lovecall/engine/audio', [
    'lovecall/provider/choreography',
    'lovecall/ui/frame'
]);

mod.factory('AudioEngine', function($rootScope, $window, $log, Choreography, FrameManager) {
  var audioCtx = new ($window.AudioContext || $window.webkitAudioContext)();

  var sourceBuffer = null;
  var sourceNode = null;
  var gainNode = audioCtx.createGain();
  var timingNode = audioCtx.createScriptProcessor(2048);

  var isPlaying = false;
  var ctxLastReferenceMs = 0;
  var playbackReferenceMs = 0;
  var playbackPosMs = 0;
  var currentVolume = 1;
  var isMuted = false;

  var currentMetronome = null;
  var currentQueueEngine = null;

  var $metronomeLog = $log.getInstance('Metronome');
  $log = $log.getInstance('AudioEngine');


  var onEndedCallback = function(e) {
    $log.debug('onEndedCallback');

    pause();
  };


  // interface
  var resume = function() {
    if (isPlaying) {
      return;
    }

    isPlaying = true;
    return doResume();
  };


  var doResume = function() {
    if (playbackPosMs >= getDuration()) {
      // rewind
      playbackPosMs = 0;
    }

    ctxLastReferenceMs = audioCtx.currentTime * 1000;
    playbackReferenceMs = playbackPosMs;

    $log.info(
        'resume: ctxLastReferenceMs=',
        ctxLastReferenceMs,
        'playbackPosMs=',
        playbackPosMs
        );
    $rootScope.$broadcast('audio:resume');

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = sourceBuffer;
    sourceNode.onended = onEndedCallback;

    sourceNode.connect(gainNode);
    gainNode.connect(timingNode);
    timingNode.connect(audioCtx.destination);

    sourceNode.start(0, playbackPosMs / 1000);
  };


  var pause = function() {
    if (!isPlaying) {
      return;
    }

    isPlaying = false;
    return doPause();
  };


  var doPause = function() {
    $log.info('pause');
    $rootScope.$broadcast('audio:pause');

    if (sourceNode) {
      sourceNode.stop();

      sourceNode.disconnect(gainNode);
      gainNode.disconnect(timingNode);
      timingNode.disconnect(audioCtx.destination);

      sourceNode = null;
    }
  };


  var doSeek = function(newPositionMs) {
    $log.info('seeking to', newPositionMs, 'from', playbackPosMs);
    playbackPosMs = newPositionMs;
    currentQueueEngine.update(newPositionMs, false);
    currentMetronome.tick(newPositionMs);
    $rootScope.$broadcast('audio:seek', newPositionMs);
    isPlaying && doResume();
  };


  var seek = function(newPositionMs) {
    isPlaying && doPause();
    return doSeek(newPositionMs);
  };


  var getIsPlaying = function() {
    return isPlaying;
  };


  var getDuration = function() {
    if (sourceBuffer) {
      return sourceBuffer.duration * 1000|0;
    } else {
      return 0;
    }
  };


  var getPlaybackPosition = function() {
    return playbackPosMs;
  };


  var updateGainNode = function() {
    gainNode.gain.value = isMuted ? 0 : currentVolume;
  };


  var getVolume = function() {
    return currentVolume;
  };


  var setVolume = function(volume) {
    currentVolume = volume > 1 ? 1 : volume < 0 ? 0 : volume;
    updateGainNode();
  };


  var getMuted = function() {
    return isMuted;
  };


  var setMuted = function(mute) {
    isMuted = mute;
    updateGainNode();
  };


  var setSourceData = function(data) {
    $log.debug('setSourceData: data=', data);

    // audioCtx.decodeAudioData(data).then(finishSetSourceData);
    sourceBuffer = null;
    doPause();
    playbackPosMs = 0;
    currentMetronome = null;
    currentQueueEngine = null;
    $rootScope.$broadcast('audio:unloaded');
    audioCtx.decodeAudioData(data, finishSetSourceData);
  };


  var finishSetSourceData = function(buffer) {
    $log.debug('finishSetSourceData: buffer=', buffer);

    sourceBuffer = buffer;

    // generate step line events and merge into event stream
    Choreography.generateStepLineEvents(getDuration());

    // trigger initial state updates for queue engine and metronome
    doSeek(0);

    $rootScope.$broadcast('audio:loaded');
  };


  var audioCallback = function(e) {
    var ctxMs = e.playbackTime * 1000;
    var posMs = (playbackReferenceMs + ctxMs - ctxLastReferenceMs)|0;
    playbackPosMs = posMs;

    currentQueueEngine && currentQueueEngine.update(posMs, true);
    currentMetronome && currentMetronome.tick(posMs);

    // just pass through
    var inBuf = e.inputBuffer;
    var outBuf = e.outputBuffer;
    var ch;
    for (ch = 0; ch < inBuf.numberOfChannels; ch++) {
      var data = inBuf.getChannelData(ch);
      if (outBuf.copyToChannel) {
        outBuf.copyToChannel(data, ch);
      } else {
        outBuf.getChannelData(ch).set(data);
      }
    }
  };


  var initEvents = function(tempo, queueEngine) {
    $log.debug('initEvents: tempo=', tempo, 'queueEngine=', queueEngine);

    currentMetronome = metronomeMod.metronomeFactory(
        tempo,
        FrameManager.tickCallback,
        $metronomeLog,
        false
        );
    currentQueueEngine = queueEngine;

    timingNode.onaudioprocess = audioCallback;
  };


  return {
    'getIsPlaying': getIsPlaying,
    'getDuration': getDuration,
    'getPlaybackPosition': getPlaybackPosition,
    'getVolume': getVolume,
    'setVolume': setVolume,
    'getMuted': getMuted,
    'setMuted': setMuted,
    'setSourceData': setSourceData,
    'initEvents': initEvents,
    'resume': resume,
    'pause': pause,
    'seek': seek
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
