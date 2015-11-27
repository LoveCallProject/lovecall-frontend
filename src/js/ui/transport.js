/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('./frame');


var mod = angular.module('lovecall/ui/transport', [
    'lovecall/engine/audio',
    'lovecall/ui/frame'
]);

mod.controller('TransportController', function($scope, $log, AudioEngine, FrameManager) {
  $log = $log.getInstance('TransportController');

  // scope states
  $scope.playbackPos = 0;
  $scope.isPlaying = false;
  $scope.playButtonIcon = 'play_arrow';

  // internal states
  var isPlaying = false;
  var playbackPos = 0;
  var prevIsPlaying = true;
  var prevPlaybackPos = -1;
  var duration = AudioEngine.getDuration();


  // actions
  var play = function() {
    if (duration === 0) {
      duration = AudioEngine.getDuration();
    }
    $scope.playButtonIcon = 'pause';
    AudioEngine.resume();
  };


  var pause = function() {
    $scope.playButtonIcon = 'play_arrow';
    AudioEngine.pause();
  };


  $scope.togglePlay = function() {
    (isPlaying ? pause : play)();
  };


  // frame callback
  var transportFrameCallback = function(ts) {
    isPlaying = AudioEngine.getIsPlaying();
    playbackPos = AudioEngine.getPlaybackPosition();

    if (prevIsPlaying != isPlaying) {
      $scope.isPlaying = isPlaying;
      $scope.$digest();
    }

    // limit update frequency
    if (prevPlaybackPos != playbackPos && Math.abs($scope.playbackPos - playbackPos) >= 500) {
      $scope.playbackPos = playbackPos;
      updateTransport(playbackPos, duration);
      $scope.$digest();
    }

    prevIsPlaying = isPlaying;
    prevPlaybackPos = playbackPos;
  };


  /* canvas */

  var prevTransportPos = 0;

  var transportCanvasStateFactory = function(elem) {
    // ui states
    var position = 0;
    var durationMs = 0;

    // draw states
    var ctx = elem.getContext('2d');
    var prevW = 0;
    var prevH = 0;
    var halfH = 0;

    var pointerX = 0;
    var pointerY = 0;

    var indicatorX = 0;
    var indicatorY = 0;
    var indicatorR = 0;
    var indicatorHovered = true;
    var indicatorActive = false;

    // parameters
    var marginL = 16;
    var marginR = 16;
    var sliderLineWidth = 4;
    var indicatorRadius = 6;
    var indicatorRadiusHovered = 8;
    var indicatorRadiusActive = 6;
    var indicatorHoverCircleRadius = 16;


    var update = function(pos, duration) {
      durationMs = duration;
      position = duration > 0 ? pos / duration : 0.0;
      draw();
    };


    var draw = function() {
      var canvasRect = elem.getBoundingClientRect();
      var w = canvasRect.width|0;
      var h = canvasRect.height|0;
      if (prevW != w || prevH != h) {
        elem.width = w;
        elem.height = h;
        prevW = w;
        prevH = h;
        halfH = (h / 2)|0;
      }

      updatePointer(true);

      // ctx.fillStyle = "grey";
      // ctx.fillRect(0, 0, w, h);
      ctx.clearRect(0, 0, w, h);

      // slider body
      {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = sliderLineWidth;
        ctx.strokeStyle = '#eeeeee';
        ctx.beginPath();
        ctx.moveTo(marginL, halfH);
        ctx.lineTo((w - marginR)|0, halfH);
        ctx.stroke();
        ctx.restore();
      }

      // slider indicator
      var sliderLength = (w - marginL - marginR)|0;
      indicatorX = (marginL + position * sliderLength)|0;
      indicatorY = halfH;
      indicatorR = (
          indicatorHovered ?
          indicatorRadiusHovered :
          indicatorRadius
          )|0;

      {
        ctx.save();

        if (indicatorHovered) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.125)";
          ctx.beginPath();
          ctx.arc(indicatorX, indicatorY, indicatorHoverCircleRadius, 0, 2 * Math.PI);
          ctx.fill();
        }

        ctx.fillStyle = "#666666";
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, indicatorR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    };


    var circleDistanceSquared = function(x, y, cx, cy, r) {
      if (x < (cx - r) || x > (cx + r) || y < (cy - r) || y > (cy + r)) {
        return Infinity;
      }

      return Math.pow(x - cx, 2) + Math.pow(y - cy, 2);
    };


    var indicatorHitTest = function(x, y) {
      var d = circleDistanceSquared(
          x,
          y,
          indicatorX,
          indicatorY,
          indicatorHoverCircleRadius
          );
      var r = (
          indicatorActive ?
          indicatorRadiusHovered :  // because the active circle is smaller than hovered one
          indicatorHovered ?
          indicatorRadiusHovered :
          indicatorRadius
          );

      return d <= r * r;
    };


    var updatePointer = function(fromDraw) {
      var prev;

      // hit test
      // slider indicator
      var prev = indicatorHovered;
      indicatorHovered = indicatorHitTest(pointerX, pointerY);
      if (prev != indicatorHovered && !fromDraw) {
        draw();
      }
    };


    var onmousemove = function(e) {
      pointerX = e.offsetX;
      pointerY = e.offsetY;
      updatePointer(false);
    };


    // bind events
    elem.addEventListener('mousemove', onmousemove);

    return {
      update: update
    };
  };

  var transportState = transportCanvasStateFactory(document.getElementById('transport__canvas'));
  var updateTransport = transportState.update;

  FrameManager.addFrameCallback(transportFrameCallback);
  updateTransport(0.0, 0.0);

  $log.debug('$scope=', $scope);
});
/* @license-end */

// vim:set ai et ts=2 sw=2 sts=2 fenc=utf-8:
