/* @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later */
'use strict';

require('angular');

require('../engine/audio');
require('./frame');


var mod = angular.module('lovecall/ui/transport', [
    'lovecall/engine/audio',
    'lovecall/ui/frame'
]);

mod.controller('TransportController', function($scope, $window, $log, AudioEngine, FrameManager) {
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
  var duration = 0;


  // actions
  var play = function() {
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


  $scope.$on('audio:loaded', function(e) {
    duration = AudioEngine.getDuration();

    pause();
    playbackPos = 0;
  });


  $scope.$on('transport:seek', function(e, position, duration) {
    if (duration <= 0) {
      $log.warn('discarding bogus seek with duration == 0');
      return;
    }

    var newPlaybackPos = (position * duration)|0;
    $log.info('seek: newPlaybackPos=', newPlaybackPos);

    AudioEngine.seek(newPlaybackPos);
  });


  // frame callback
  var transportFrameCallback = function(ts) {
    isPlaying = AudioEngine.getIsPlaying();
    playbackPos = AudioEngine.getPlaybackPosition();

    if (prevIsPlaying != isPlaying) {
      $scope.isPlaying = isPlaying;
      $scope.$digest();
    }

    // chromium thinks i'm causing jank by delibrately limiting the refresh
    // rate... so here's the full 60fps someone wanted
    updateTransport(playbackPos, duration);

    // limit update frequency
    if (prevPlaybackPos != playbackPos && Math.abs($scope.playbackPos - playbackPos) >= 500) {
      $scope.playbackPos = playbackPos;
      $scope.$digest();
    }

    prevIsPlaying = isPlaying;
    prevPlaybackPos = playbackPos;
  };


  /* canvas */

  var prevTransportPos = 0;

  var transportCanvasStateFactory = function(elem) {
    // parameters
    var marginL = 16;
    var marginR = 16;
    var sliderLineWidth = 4;
    var sliderHitTestDistance = 8;
    var indicatorRadius = 6;
    var indicatorRadiusHovered = 8;
    var indicatorRadiusActive = 6;
    var indicatorHoverCircleRadius = 16;

    // ui states
    var position = 0;
    var durationMs = 0;
    var indicatorHovered = true;
    var indicatorActive = false;
    var positionBeforeIndicatorActive = 0;

    // draw states
    var ctx = elem.getContext('2d');
    var inResizeFallout = true;
    var w = 0;
    var h = 0;
    var prevW = 0;
    var prevH = 0;
    var halfH = 0;

    var pointerX = 0;
    var pointerY = 0;
    var pointerDownX = 0;
    var pointerDownY = 0;

    var sliderX1 = marginL;
    var sliderX2 = 0;
    var sliderY = 0;
    var sliderLength = 0;
    var indicatorX = 0;
    var indicatorY = 0;
    var indicatorR = 0;


    var update = function(pos, duration, skipDraw) {
      duration != null && (durationMs = duration);
      updateRawPosition(+(duration > 0 ? pos / duration : 0.0), skipDraw);
    };


    var updateRawPosition = function(pos, skipDraw) {
      position = +(duration > 0 ? pos : 0.0);
      skipDraw || draw();
    };


    var draw = function() {
      if (inResizeFallout) {
        inResizeFallout = false;

        var canvasRect = elem.getBoundingClientRect();
        w = canvasRect.width|0;
        h = canvasRect.height|0;
        if (prevW != w || prevH != h) {
          elem.width = w;
          elem.height = h;
          prevW = w;
          prevH = h;
          halfH = (h / 2)|0;
        }
      }

      updatePointer(true);

      // ctx.fillStyle = "grey";
      // ctx.fillRect(0, 0, w, h);
      ctx.clearRect(0, 0, w, h);

      // slider body
      // sliderX1 = marginL;
      sliderX2 = (w - marginR)|0;
      sliderY = halfH;
      sliderLength = (sliderX2 - sliderX1)|0;
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
      indicatorX = (marginL + position * sliderLength)|0;
      indicatorY = halfH;
      indicatorR = (
          indicatorHovered ?
          indicatorRadiusHovered :
          indicatorRadius
          )|0;

      {
        ctx.save();

        if (indicatorHovered || indicatorActive) {
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


    var sliderHitTest = function(x, y) {
      if (
          x < sliderX1 - indicatorRadiusHovered ||
          x > sliderX2 + indicatorRadiusHovered ||
          y < sliderY - sliderHitTestDistance ||
          y > sliderY + sliderHitTestDistance
          ) {
        return -1;
      }

      if (x < sliderX1) {
        // left side of slider indicator positioned at extreme left
        return 0.0;
      }

      if (x > sliderX2) {
        // right side of slider indicator positioned at extreme right
        return 1.0;
      }

      var pos = +((x - sliderX1) / sliderLength);
      return (pos < 0 || pos > 1) ? -1 : pos;
    };


    var updatePointer = function(fromDraw) {
      var prev;

      if (indicatorActive) {
        var sliderHitResult = sliderHitTest(pointerX, pointerY);
        var newPos = sliderHitResult < 0 ? positionBeforeIndicatorActive : sliderHitResult;
        updateRawPosition(newPos, fromDraw);
        return;
      }

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


    var onmousedown = function(e) {
      pointerX = e.offsetX;
      pointerY = e.offsetY;

      if (!(e.buttons & 0x01)) {
        // only process left click for now
        return;
      }

      var sliderHitResult = sliderHitTest(pointerX, pointerY);

      if (sliderHitResult < 0) {
        return;
      }

      indicatorActive = true;
      positionBeforeIndicatorActive = position;
      updateRawPosition(sliderHitResult, false);
    };


    var onmouseup = function(e) {
      if (e.buttons & 0x01) {
        // left button still down, don't release yet
        return;
      }

      if (indicatorActive) {
        // send seek event
        $scope.$broadcast('transport:seek', position, duration);
        indicatorActive = false;
        draw();
      }
    };


    var onWindowResize = function(e) {
      $log.debug('window resized, scheduling canvas re-size on next draw');
      inResizeFallout = true;
    };


    // bind events
    elem.addEventListener('mousemove', onmousemove);
    elem.addEventListener('mousedown', onmousedown);
    elem.addEventListener('mouseup', onmouseup);

    $window.addEventListener('resize', onWindowResize);

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
