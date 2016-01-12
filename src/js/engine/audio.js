/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');
var metronomeMod = require('../choreography/metronome');
var AudioCtxAudioEngineImpl = require('./audio-audiocontext');
var CompatAudioEngineImpl = require('./audio-compat');

require('../conf');
require('../provider/choreography');
require('../ui/frame');


var mod = angular.module('lovecall/engine/audio', [
    'lovecall/conf',
    'lovecall/provider/choreography',
    'lovecall/ui/frame'
]);

mod.factory('AudioEngine', function($rootScope, $window, $log, LCConfig, Choreography, FrameManager) {
  var engineImpl = null;

  var bufferSize = 0;

  var isPlaying = false;
  var inSeeking = false;
  var isPlayingBeforeSeek = false;

  // formats
  var haveMP3 = false;
  var haveOpus = false;
  var haveUsableOpus = false;
  var preferredFormat = '';

  var $metronomeLog = $log.getInstance('Metronome');
  var $implLog = $log.getInstance('AudioEngineImpl');
  $log = $log.getInstance('AudioEngine');


  // impl bridge
  var implBridge = {
    isInSeeking: function() {
      return inSeeking;
    },
    setInSeeking: function(v) {
      inSeeking = v;
    },
    pause: function() {
      // late-binding
      return pause();
    },
  };


  var init = function() {
    initEngineImpl();
    refreshBufferSize();
  };


  var initEngineImpl = function() {
    var audioCtxEngineImpl = new AudioCtxAudioEngineImpl(implBridge, $implLog);
    if (audioCtxEngineImpl.isSupported) {
      engineImpl = audioCtxEngineImpl;
      return;
    }

    engineImpl = new CompatAudioEngineImpl(implBridge, FrameManager, $implLog);

    // compat is supposed to be infallible on every supported platform, so
    // no more error messages here.
    // $log.error('No audio engine implementation usable!');
  };


  var refreshBufferSize = function() {
    pause();

    bufferSize = LCConfig.getAudioBufferSize();
    engineImpl.setBufferSize(bufferSize);
  };


  $rootScope.$on('config:audioBufferSizeChanged', function(e) {
    refreshBufferSize();
  });


  // interface
  var resume = function() {
    if (getIsPlaying()) {
      return;
    }

    return doResume();
  };


  var doResume = function() {
    if (getPlaybackPosition() >= getDuration()) {
      // rewind
      engineImpl.setPlaybackPosition(0);
    }

    engineImpl.doResume();
    $rootScope.$broadcast('audio:resume');
  };


  var pause = function() {
    if (!getIsPlaying()) {
      return;
    }

    return doPause();
  };


  var doPause = function() {
    $log.info('pause');
    $rootScope.$broadcast('audio:pause');
    engineImpl.doPause();
  };


  var doSeek = function(newPositionMs) {
    $log.info('seeking to', newPositionMs, 'from', getPlaybackPosition());

    engineImpl.setPlaybackPosition(newPositionMs);
    $rootScope.$broadcast('audio:seek', newPositionMs);

    // reset playing status
    engineImpl.setIsPlaying(isPlayingBeforeSeek);
    isPlayingBeforeSeek && doResume();
  };


  var seek = function(newPositionMs) {
    // record playing status at all times to prevent stale true values
    // interfering with seeking while paused
    isPlayingBeforeSeek = getIsPlaying();
    if (getIsPlaying()) {
      // pause and workaround Nightly
      inSeeking = true;
      doPause();
    }

    doSeek(newPositionMs);
  };


  var getIsPlaying = function() {
    return engineImpl.getIsPlaying();
  };


  var getDuration = function() {
    return engineImpl.getDuration();
  };


  var getPlaybackPosition = function() {
    return engineImpl.getPlaybackPosition();
  };


  var getVolume = function() {
    return engineImpl.getVolume();
  };


  var setVolume = function(volume) {
    engineImpl.setVolume(volume > 1 ? 1 : volume < 0 ? 0 : volume);
  };


  var getMuted = function() {
    return engineImpl.getMuted();
  };


  var setMuted = function(mute) {
    engineImpl.setMuted(mute);
  };


  var setSourceData = function(data) {
    $log.debug('setSourceData: data=', data);

    doPause();
    engineImpl.setMetronome(null);
    $rootScope.$broadcast('audio:unloaded');
    engineImpl.setSourceData(data, finishSetSourceData, erroredSetSourceData);
    $rootScope.$broadcast('audio:decoding');
  };


  var finishSetSourceData = function() {
    $log.debug('finishSetSourceData');

    // generate step line events and merge into event stream
    Choreography.generateStepLineEvents(getDuration());

    // trigger initial state updates for queue engine and metronome
    doSeek(0);

    $rootScope.$broadcast('audio:loaded');

    // it seems the $broadcast is not enough to refresh all angular states,
    // so
    $rootScope.$digest();
  };


  var erroredSetSourceData = function(err) {
    $log.error('erroredSetSourceData:', err);

    $rootScope.$broadcast('audio:loadFailed');
    $rootScope.$digest();
  };


  var initEvents = function(tempo) {
    $log.debug('initEvents: tempo', tempo);

    engineImpl.setMetronome(metronomeMod.metronomeFactory(
        tempo,
        FrameManager.tickCallback,
        $metronomeLog,
        false
        ));
  };


  var getPreferredFormat = function() {
    return engineImpl.getPreferredFormat();
  };


  // initialize
  init();

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
