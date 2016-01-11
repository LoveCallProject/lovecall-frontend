/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';


// only support MP3's for the moment
module.exports = function CompatAudioEngineImpl(commonEngineInterface, FrameManager, logProvider) {
  logProvider || (logProvider = console);

  // don't bother checking if even <audio> is not supported, it's 2016 now
  logProvider.warn('Compatible audio engine backed by rAF');

  var sourceElem = document.createElement('audio');

  var playbackPosMs = 0;

  // formats
  // TODO: more formats? multi supported formats for the browser to decide?
  var preferredFormat = 'mp3';

  var currentMetronome = null;


  // NOTE: this is a *frame* callback, instead of an audio one
  // and that's the whole point of being *compatible*
  var compatAudioCallback = function(ts) {
    var posMs = (sourceElem.currentTime * 1000)|0;
    playbackPosMs = posMs;

    currentMetronome && currentMetronome.tick(posMs);
  };


  // interface
  this.getPreferredFormat = function() {
    return preferredFormat;
  };


  this.setBufferSize = function(bufferSize) {
    logProvider.debug('setBufferSize: no-op on compat impl');
  };


  this.getVolume = function() {
    return sourceElem.volume;
  };


  this.setVolume = function(volume) {
    sourceElem.volume = volume;
  };


  this.getMuted = function() {
    return sourceElem.muted;
  };


  this.setMuted = function(mute) {
    sourceElem.muted = mute;
  };


  this.getIsPlaying = function() {
    return !sourceElem.paused;
  };


  this.setIsPlaying = function(v) {
    // no-op
  };


  this.getDuration = function() {
    return (sourceElem.duration * 1000)|0;
  };


  this.getPlaybackPosition = function() {
    return playbackPosMs;
  };


  this.setPlaybackPosition = function(posMs) {
    playbackPosMs = posMs;
    sourceElem.currentTime = posMs / 1000;
    currentMetronome && currentMetronome.tick(posMs);
  };


  this.setMetronome = function(metronome) {
    currentMetronome = metronome;
  };


  this.doResume = function() {
    logProvider.info('resume');
    FrameManager.addFrameCallback(compatAudioCallback);
    sourceElem.play();
  };


  this.doPause = function() {
    sourceElem.pause();
    FrameManager.removeFrameCallback(compatAudioCallback);
  };


  this.setSourceData = function(data, callback, errCallback) {
    playbackPosMs = 0;

    sourceElem.onloadeddata = function(e) {
      logProvider.debug('finishSetSourceData: compat event', e);

      // clear error callback in case an error occurs later
      sourceElem.onerror = null;

      sourceElem.currentTime = 0;
      callback && callback();
    };

    sourceElem.onerror = errCallback;

    var url = window.URL || window.webkitURL;
    // NOTE: remember to modify blob mimetype if we're to support more formats
    // one day
    sourceElem.src = url.createObjectURL(new Blob([data], { type: 'audio/mp3' }));
  };
};
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
