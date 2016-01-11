/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

var dataHelper = require('../util/data-helper');
var emptyOpusFileUri = require('../../misc/empty.opus');


module.exports = function AudioCtxAudioEngineImpl(commonEngineInterface, logProvider) {
  logProvider || (logProvider = console);

  var contextClass = (window.AudioContext ||
      window.webkitAudioContext ||
      window.mozAudioContext ||
      window.oAudioContext ||
      window.msAudioContext);
  var audioCtx;
  this.isSupported = false;

  if (contextClass) {
    audioCtx = new contextClass();
    this.isSupported = true;
    logProvider.info('AudioEngine impl backed by AudioContext');
  } else {
    logProvider.error("AudioContext is not available!");
    return;
  }

  var sourceBuffer = null;
  var sourceNode = null;
  var gainNode = audioCtx.createGain();
  var timingNode = null;
  var bufferSize = 0;

  var isPlaying = false;
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


  var probeFormats = function() {
    var elem = document.createElement('audio');
    haveMP3 = elem.canPlayType('audio/mp3') !== '';
    haveOpus = elem.canPlayType('audio/ogg; codecs="opus"') !== '';

    logProvider.info('formats: opus', haveOpus, 'mp3', haveMP3);
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
          logProvider.info('this Opus impl is actually usable');
          haveUsableOpus = true;
          updatePreferredFormat();
        },
        function(err) {
          logProvider.warn('this Opus impl is borked, falling back to MP3; err', err);
          haveUsableOpus = false;
          updatePreferredFormat();
        }
        );
  };


  var onEndedCallback = function(e) {
    // Firefox Nightly fires ended events for all stopping, so don't let that
    // disturb seeking.
    if (commonEngineInterface.isInSeeking()) {
      logProvider.debug('onEndedCallback: NOT executing pause due to seek in progress');

      // reset the seeking flag
      commonEngineInterface.setInSeeking(false);
      return;
    }

    logProvider.debug('onEndedCallback: pausing');
    commonEngineInterface.pause();
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


  var updateGainNode = function() {
    gainNode.gain.value = isMuted ? 0 : currentVolume;
  };


  // interface
  this.getPreferredFormat = function() {
    return preferredFormat;
  };


  this.setBufferSize = function(bufferSize) {
    logProvider.info('creating timing node with buffer size', bufferSize);
    timingNode = audioCtx.createScriptProcessor(bufferSize);
    timingNode.onaudioprocess = audioCallback;
  };


  this.getVolume = function() {
    return currentVolume;
  };


  this.setVolume = function(volume) {
    currentVolume = volume;
    updateGainNode();
  };


  this.getMuted = function() {
    return isMuted;
  };


  this.setMuted = function(mute) {
    isMuted = mute;
    updateGainNode();
  };


  this.getIsPlaying = function() {
    return isPlaying;
  };


  this.setIsPlaying = function(v) {
    isPlaying = v;
  };


  this.getDuration = function() {
    if (sourceBuffer) {
      return sourceBuffer.duration * 1000|0;
    } else {
      return 0;
    }
  };


  this.getPlaybackPosition = function() {
    return playbackPosMs;
  };


  this.setPlaybackPosition = function(posMs) {
    playbackPosMs = posMs;
    currentMetronome && currentMetronome.tick(posMs);
  };


  this.setMetronome = function(metronome) {
    currentMetronome = metronome;
  };


  this.doResume = function() {
    isPlaying = true;
    ctxLastReferenceMs = audioCtx.currentTime * 1000;
    playbackReferenceMs = playbackPosMs;

    logProvider.info(
        'resume: ctxLastReferenceMs=',
        ctxLastReferenceMs,
        'playbackPosMs=',
        playbackPosMs
        );

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = sourceBuffer;
    sourceNode.onended = onEndedCallback;

    sourceNode.connect(gainNode);
    gainNode.connect(timingNode);
    timingNode.connect(audioCtx.destination);

    sourceNode.start(0, playbackPosMs / 1000);
  };


  this.doPause = function() {
    isPlaying = false;
    if (sourceNode) {
      sourceNode.stop();

      sourceNode.disconnect(gainNode);
      gainNode.disconnect(timingNode);
      timingNode.disconnect(audioCtx.destination);

      sourceNode = null;
    }
  };


  this.setSourceData = function(data, callback, errCallback) {
    sourceBuffer = null;
    playbackPosMs = 0;
    audioCtx.decodeAudioData(data, function(buffer) {
      logProvider.debug('finishSetSourceData: buffer=', buffer);
      sourceBuffer = buffer;
      callback && callback();
    }, errCallback);
  };


  // initialize
  probeFormats();
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
