/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
var metronomeMod = require('../choreography/metronome');

require('../conf');
require('../provider/choreography');
require('../ui/frame');

var dataHelper = require('../util/data-helper');

var emptyOpusFileUri = require('../../misc/empty.opus');


var mod = angular.module('lovecall/engine/audio', [
    'lovecall/conf',
    'lovecall/provider/choreography',
    'lovecall/ui/frame'
]);

mod.factory('AudioEngine', function($rootScope, $window, $log, LCConfig, Choreography, FrameManager) {
  var audioCtx = new ($window.AudioContext || $window.webkitAudioContext)();

  var sourceBuffer = null;
  var sourceNode = null;
  var gainNode = audioCtx.createGain();
  var timingNode = null;
  var bufferSize = 0;

  var isPlaying = false;
  var inSeeking = false;
  var isPlayingBeforeSeek = false;
  var ctxLastReferenceMs = 0;
  var playbackReferenceMs = 0;
  var playbackPosMs = 0;
  var currentVolume = 1;
  var isMuted = false;

  // formats
  var haveMP3 = false;
  var haveOpus = false;
  var haveUsableOpus = false;
  var preferredFormat = '';

  var currentMetronome = null;

  var $metronomeLog = $log.getInstance('Metronome');
  $log = $log.getInstance('AudioEngine');


  var probeFormats = function() {
    var elem = document.createElement('audio');
    haveMP3 = elem.canPlayType('audio/mp3') !== '';
    haveOpus = elem.canPlayType('audio/ogg; codecs="opus"') !== '';

    $log.info('formats: opus', haveOpus, 'mp3', haveMP3);
    updatePreferredFormat();
    checkOpusUsability();
  };


  var updatePreferredFormat = function() {
    preferredFormat = haveOpus && haveUsableOpus ? 'opus' : 'mp3';
  };


  var checkOpusUsability = function() {
    var emptyOpusArray = dataHelper.dataUriToArray(emptyOpusFileUri);

    audioCtx.decodeAudioData(
        emptyOpusArray.buffer,
        function(buf) {
          $log.info('this Opus impl is actually usable');
          haveUsableOpus = true;
          updatePreferredFormat();
        },
        function(err) {
          $log.warn('this Opus impl is borked, falling back to MP3; err', err);
          haveUsableOpus = false;
          updatePreferredFormat();
        }
        );
  };


  var initTimingNode = function() {
    pause();

    bufferSize = LCConfig.getAudioBufferSize();
    $log.info('creating timing node with buffer size', bufferSize);
    timingNode = audioCtx.createScriptProcessor(bufferSize);
    timingNode.onaudioprocess = audioCallback;
  };


  $rootScope.$on('config:audioBufferSizeChanged', function(e) {
    initTimingNode();
  });


  var onEndedCallback = function(e) {
    // Firefox Nightly fires ended events for all stopping, so don't let that
    // disturb seeking.
    if (inSeeking) {
      $log.debug('onEndedCallback: NOT executing pause due to seek in progress');

      // reset the seeking flag
      inSeeking = false;
      return;
    }

    $log.debug('onEndedCallback: pausing');
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
    currentMetronome.tick(newPositionMs);
    $rootScope.$broadcast('audio:seek', newPositionMs);

    // reset playing status
    isPlaying = isPlayingBeforeSeek;
    isPlaying && doResume();
  };


  var seek = function(newPositionMs) {
    if (isPlaying) {
      // record status, pause and workaround Nightly
      inSeeking = true;
      isPlayingBeforeSeek = isPlaying;
      doPause();
    }

    doSeek(newPositionMs);
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
    $rootScope.$broadcast('audio:unloaded');
    audioCtx.decodeAudioData(data, finishSetSourceData);
    $rootScope.$broadcast('audio:decoding');
  };


  var finishSetSourceData = function(buffer) {
    $log.debug('finishSetSourceData: buffer=', buffer);

    sourceBuffer = buffer;

    // generate step line events and merge into event stream
    Choreography.generateStepLineEvents(getDuration());

    // trigger initial state updates for queue engine and metronome
    doSeek(0);

    $rootScope.$broadcast('audio:loaded');

    // it seems the $broadcast is not enough to refresh all angular states,
    // so
    $rootScope.$digest();
  };


  var audioCallback = function(e) {
    var ctxMs = e.playbackTime * 1000;
    var posMs = (playbackReferenceMs + ctxMs - ctxLastReferenceMs)|0;
    playbackPosMs = posMs;

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


  var initEvents = function(tempo) {
    $log.debug('initEvents: tempo', tempo);

    currentMetronome = metronomeMod.metronomeFactory(
        tempo,
        FrameManager.tickCallback,
        $metronomeLog,
        false
        );
  };


  var getPreferredFormat = function() {
    return preferredFormat;
  };


  // initialize
  probeFormats();
  initTimingNode();


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
    'getPreferredFormat': getPreferredFormat,
    'resume': resume,
    'pause': pause,
    'seek': seek
  };
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
